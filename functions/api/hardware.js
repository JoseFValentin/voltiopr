// ==============================================================
// BACKEND: API DE CONTROL DE HARDWARE (IoT) Nodemcu
// ==============================================================
// Nota para no programadores:
// Esta función es el "puente" entre la pantalla de tu computadora
// (Dashboard) y la placa electrónica (NodeMCU).
//
// Tiene dos modos:
// 1. GET: Sirve para preguntar "¿Cómo están las cosas ahora mismo?"
// 2. POST: Sirve para dar una orden "¡Enciende el reactor al 50%!"

export async function onRequestGet({ env }) {
  try {
    // Alguien preguntó por el estado de las cosas. Leemos la base de datos (DB):
    const { results } = await env.DB.prepare('SELECT * FROM dispositivos').all();
    
    // Y le enviamos una caja con las respuestas de todos los sensores e interruptores
    return new Response(JSON.stringify({ 
      success: true, 
      datos_iot: results 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch(err) {
    return new Response(JSON.stringify({ error: "Error leyendo sensores" }), { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    // Alguien (la web o el NodeMCU) mandó una nueva configuración.
    const orden = await request.json();
    const idDispositivo = orden.id_dispositivo;     // ej. 'reactor-toggle'
    const encender = orden.estado_encendido;        // true o false
    const potencia = orden.poder_porcentaje || 0;   // Numero del 0 al 100

    if (!idDispositivo) {
      return new Response(JSON.stringify({ error: "Falta ID de dispositivo" }), { status: 400 });
    }

    // Le pasamos la orden a la base de datos (D1)
    const stmt = env.DB.prepare(`
      UPDATE dispositivos 
      SET estado_encendido = ?, poder_porcentaje = ?, ultima_actualizacion = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    await stmt.bind(encender, potencia, idDispositivo).run();

    // Confirmamos a la pantalla que la orden fue acatada
    return new Response(JSON.stringify({ 
      success: true, 
      mensaje: `Dispositivo ${idDispositivo} actualizado.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Error enviando orden al Hardware" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
