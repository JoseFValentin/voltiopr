// ==============================================================
// BACKEND: API DE REGISTRO DE USUARIOS NUEVOS
// ==============================================================
// Nota para no programadores:
// Esta función vive en la nube. Escucha cuando alguien dice:
// "Quiero abrir una cuenta nueva". Toma los datos del papel y
// los guarda en las gavetas de nuestra Base de Datos (DB) D1.

import { hashPassword } from './utils.js';

export async function onRequestPost({ request, env }) {
  try {
    // 1. Agarramos lo que el usuario rellenó
    const body = await request.json();
    const username = body.username;
    const email = body.email;
    const password = body.password;

    if (!username || !email || !password) {
      return new Response(JSON.stringify({ error: "Todos los campos son obligatorios" }), { status: 400 });
    }

    // 2. Verificamos que no exista ya otra persona con el mismo correo
    const chequeoPrevio = env.DB.prepare('SELECT id FROM usuarios WHERE email = ?');
    const { results } = await chequeoPrevio.bind(email).all();

    if (results.length > 0) {
      return new Response(JSON.stringify({ error: "Ese correo ya está registrado. Intenta iniciar sesión." }), { 
        status: 409, // 409 = "Conflicto"
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Todo en orden, hasheamos la contraseña y guardamos
    const hashed = await hashPassword(password);
    const stmt = env.DB.prepare('INSERT INTO usuarios (username, email, password_hash) VALUES (?, ?, ?)');
    await stmt.bind(username, email, hashed).run();

    // 4. Respondemos con alegría que todo fue un éxito
    return new Response(JSON.stringify({ 
      success: true, 
      mensaje: "¡Cuenta creada exitosamente!"
    }), {
      status: 201, // 201 = "Creado exitosamente"
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("Error al registrar:", err);
    return new Response(JSON.stringify({ error: "Hubo un error al crear la cuenta en la nube." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
