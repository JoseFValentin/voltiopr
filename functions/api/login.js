// ==============================================================
// BACKEND: API DE INICIO DE SESIÓN (LOGIN)
// ==============================================================
// Nota para no programadores:
// Este código "vive" en las nubes (Cloudflare Serverless)
// Su trabajo es escuchar cuando el usuario en la PC o celular hace
// clic en "Iniciar Sesión", revisar si sus datos existen en nuestra
// base de datos (DB), y decirle a la pantalla si lo deja pasar o no.

// Cuando llega una petición POST a '/api/login', se ejecuta esta función
export async function onRequestPost({ request, env }) {
  try {
    // 1. Agarramos lo que el usuario escribió en el formulario del navegador
    const body = await request.json();
    const userEmail = body.email;
    const userPassword = body.password;

    // 2. Revisar si envió los datos que necesitamos
    if (!userEmail || !userPassword) {
      // 400 = "Petición Incorrecta" en lenguaje de internet
      return new Response(JSON.stringify({ error: "Falta correo o contraseña" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Vamos a nuestra Base de Datos D1 (se llama env.DB) y buscamos el usuario
    const stmt = env.DB.prepare('SELECT * FROM usuarios WHERE email = ? LIMIT 1');
    // Le pasamos el correo que escribió la persona
    const { results } = await stmt.bind(userEmail).all();

    // 4. Si la base de datos devuelve vacío, quiere decir que ese correo no existe
    if (results.length === 0) {
      // 401 = "No Autorizado" (Credenciales malas)
      return new Response(JSON.stringify({ error: "El correo no está registrado" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const usuarioEncontrado = results[0];

    // 5. Verificamos la contraseña
    // *NOTA de Seguridad*: Aquí comparamos texto directo solo por motivos educativos y simplificación.
    // En un proyecto real de grado militar, JAMÁS se guarda la clave igual a como el usuario la escribe
    if (usuarioEncontrado.password_hash !== userPassword) {
      return new Response(JSON.stringify({ error: "La contraseña es incorrecta" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. ¡Todo correcto! Creamos un pase de acceso temporal (Token) para dejarlo entrar
    // En modo básico devolvemos que fue exitoso y los datos del usuario.
    const access_token = "token_temporal_voltiopr_" + Date.now();

    return new Response(JSON.stringify({ 
      success: true, 
      mensaje: "¡Bienvenido a VoltioPR!",
      token: access_token,
      usuario: usuarioEncontrado.username
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    // 7. Si nuestro servidor falla por alguna razón (se quema internamente)
    console.error("Error crítico en Login:", err);
    return new Response(JSON.stringify({ error: "Error del servidor al intentar entrar" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
