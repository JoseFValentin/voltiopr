// ==============================================================
// BACKEND: RESTABLECER CONTRASEÑA (RESET PASSWORD)
// ==============================================================

export async function onRequestPost({ request, env }) {
  try {
    const { email, token, newPassword } = await request.json();

    if (!email || !token || !newPassword) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Buscar el usuario con ese token y que no haya expirado
    const userStmt = env.DB.prepare(`
      SELECT id FROM usuarios 
      WHERE email = ? AND reset_token = ? AND reset_token_expiry > ?
      LIMIT 1
    `);
    
    const now = new Date().toISOString();
    const { results } = await userStmt.bind(email, token, now).all();

    if (results.length === 0) {
      return new Response(JSON.stringify({ error: "Código inválido o expirado" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = results[0].id;

    // 2. Actualizar contraseña y limpiar el token
    await env.DB.prepare(`
      UPDATE usuarios 
      SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL 
      WHERE id = ?
    `).bind(newPassword, userId).run();

    return new Response(JSON.stringify({ 
      success: true, 
      mensaje: "Contraseña actualizada. Ya puedes iniciar sesión." 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("Error en ResetPassword:", err);
    return new Response(JSON.stringify({ error: "Error al actualizar la contraseña." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
