// ==============================================================
// BACKEND: API DE CONTROL DE HARDWARE IoT (Unificada)
// ==============================================================

export async function onRequestGet({ env }) {
  try {
    // Obtenemos los dispositivos dinámicos configurados
    const { results } = await env.DB.prepare('SELECT * FROM iot_config').all();
    
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
    const orden = await request.json();
    const id = orden.id_dispositivo;
    
    // El valor puede venir de un toggle (estado_encendido) o un slider (poder_porcentaje)
    // Lo normalizamos a texto para la columna 'valor_actual'
    let nuevoValor = orden.valor;
    if (nuevoValor === undefined) {
        if (orden.estado_encendido !== undefined) {
            nuevoValor = orden.estado_encendido ? "1" : "0";
        } else if (orden.poder_porcentaje !== undefined) {
            nuevoValor = orden.poder_porcentaje.toString();
        }
    }

    if (!id) {
      return new Response(JSON.stringify({ error: "Falta ID de dispositivo" }), { status: 400 });
    }

    // Actualizamos la tabla de configuración dinámica
    const stmt = env.DB.prepare('UPDATE iot_config SET valor_actual = ? WHERE id = ?');
    const result = await stmt.bind(nuevoValor, id).run();

    if (result.meta.changes === 0) {
        // Si no existe en iot_config, intentamos en la tabla dispositivos (Compatibilidad)
        const stmtLegacy = env.DB.prepare('UPDATE dispositivos SET estado_encendido = ?, poder_porcentaje = ? WHERE id = ?');
        const isEncendido = nuevoValor === "1" || parseInt(nuevoValor) > 0;
        const subPotencia = parseInt(nuevoValor) || 0;
        await stmtLegacy.bind(isEncendido, subPotencia, id).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Error enviando orden" }), { status: 500 });
  }
}
