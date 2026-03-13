// ==============================================================
// BACKEND: RECUPERACIÓN DE CONTRASEÑA (FORGOT PASSWORD)
// ==============================================================

export async function onRequestPost({ request, env }) {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "El correo es obligatorio" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Verificar si el usuario existe
    const userStmt = env.DB.prepare('SELECT id, username FROM usuarios WHERE email = ? LIMIT 1');
    const { results } = await userStmt.bind(email).all();

    if (results.length === 0) {
      // Por seguridad, no decimos si el correo existe o no para evitar "user enumeration"
      // Pero para este proyecto educativo, seremos claros
      return new Response(JSON.stringify({ error: "Este correo no está registrado" }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = results[0];

    // 2. Generar un Token Seguro (8 caracteres aleatorios)
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiry = new Date(Date.now() + 3600000).toISOString(); // Expira en 1 hora

    // 3. Guardar token en la DB
    await env.DB.prepare('UPDATE usuarios SET reset_token = ?, reset_token_expiry = ? WHERE id = ?')
      .bind(token, expiry, user.id)
      .run();

    // 4. Enviar Email vía MailChannels
    const mailPayload = {
      personalizations: [
        {
          to: [{ email: email, name: user.username }],
        },
      ],
      from: {
        email: "no-reply@voltiopr.com", // Cambiado a no-reply para mayor compatibilidad
        name: "VoltioPR Seguridad",
      },
      subject: "Recupera tu contraseña - VoltioPR",
      content: [
        {
          type: "text/plain",
          value: `Hola ${user.username},\n\nTu código de recuperación es: ${token}\n\nIngresa este código en la web para restablecer tu contraseña.\n\nEste código expira en 1 hora.\n\nSi no solicitaste esto, ignora este correo.`,
        },
      ],
    };

    const resMail = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mailPayload),
    });

    const respText = await resMail.text();

    if (resMail.ok) {
      return new Response(JSON.stringify({ 
        success: true, 
        mensaje: "¡Código enviado! Revisa tu email." 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error("Error detallado de MailChannels:", respText);
      // Si falla, mostramos el código pero avisamos del fallo técnico
      return new Response(JSON.stringify({ 
        success: false, 
        error: "El servicio de email falló (DNS posiblemente propagándose).",
        debug: respText,
        token_debug: token // Enviamos el código para que el usuario pueda seguir
      }), {
        status: 200, // Lo enviamos como 200 para que el JS pueda leer el token_debug
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (err) {
    console.error("Error en ForgotPassword:", err);
    return new Response(JSON.stringify({ error: "Error procesando la solicitud." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
