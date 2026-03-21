// ==============================================================
// BACKEND: API DE INICIO DE SESIÓN (LOGIN)
// ==============================================================
// Nota para no programadores:
// Este código "vive" en las nubes (Cloudflare Serverless)
// Su trabajo es escuchar cuando el usuario en la PC o celular hace
// clic en "Iniciar Sesión", revisar si sus datos existen en nuestra
// base de datos (DB), y decirle a la pantalla si lo deja pasar o no.

import { hashPassword, verifyPassword } from './utils.js';

// Cuando llega una petición POST a '/api/login', se ejecuta esta función
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { email, password, metadata } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Falta correo o contraseña" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Buscar el usuario
    const userStmt = env.DB.prepare('SELECT * FROM usuarios WHERE email = ? LIMIT 1');
    const { results } = await userStmt.bind(email).all();

    // 2. Si no existe, sugerir registro
    if (results.length === 0) {
      return new Response(JSON.stringify({ 
        error: "Usuario no encontrado", 
        redirect: "register.html",
        message: "Parece que eres nuevo. ¡Regístrate para comenzar!" 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const usuario = results[0];

    // 3. Validar Contraseña (PBKDF2 con fallback para texto plano y Auto-Upgrade)
    let isCorrect = await verifyPassword(password, usuario.password_hash);
    
    if (!isCorrect && usuario.password_hash === password) {
      // Es un usuario antiguo con texto plano -> Actualizar a Hash automáticamente
      isCorrect = true;
      const newHash = await hashPassword(password);
      await env.DB.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?')
        .bind(newHash, usuario.id)
        .run();
      console.log(`🛡️ Seguridad aumentada para usuario ${usuario.username} (migración a hash exitosa)`);
    }

    if (!isCorrect) {
      return new Response(JSON.stringify({ error: "La contraseña es incorrecta" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Registrar Metadata y Consentimiento de Cookies
    try {
      if (metadata) {
         await env.DB.prepare(`
           INSERT INTO user_metadata (user_id, user_agent, ip_address, consent_cookies)
           VALUES (?, ?, ?, ?)
         `).bind(
           usuario.id, 
           metadata.userAgent || "Unknown", 
           request.headers.get("cf-connecting-ip") || "0.0.0.0",
           metadata.consentCookies ? 1 : 0
         ).run();
      }
    } catch (e) {
      console.error("Error guardando metadata, pero dejando pasar al usuario:", e);
    }

    // 5. Generar Sesión Segura (UUID : ID Usuario)
    const access_token = "SESSION_" + crypto.randomUUID() + ":" + usuario.id;

    return new Response(JSON.stringify({ 
      success: true, 
      mensaje: "¡Bienvenido de vuelta!",
      token: access_token,
      usuario: usuario.username,
      es_admin: usuario.es_admin === 1,
      permisos: usuario.permisos || 'ALL'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("Error crítico en Login:", err);
    return new Response(JSON.stringify({ error: "Error del servidor. Inténtalo más tarde." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
