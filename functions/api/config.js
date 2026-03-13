// ==============================================================
// BACKEND: API DE CONFIGURACIÓN IOT (Pines ESP)
// ==============================================================

export async function onRequestGet({ env }) {
  try {
    // Obtenemos todos los dispositivos configurados
    const { results } = await env.DB.prepare('SELECT * FROM iot_config').all();
    
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch(err) {
    return new Response(JSON.stringify({ error: "Error al leer la configuración" }), { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const { id, nombre, tipo, pin, descripcion } = data;

    if (!id || !nombre || !tipo || !pin) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 });
    }

    // Insertar o actualizar configuración (Upsert)
    const stmt = env.DB.prepare(`
      INSERT INTO iot_config (id, nombre, tipo, pin, descripcion)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nombre = excluded.nombre,
        tipo = excluded.tipo,
        pin = excluded.pin,
        descripcion = excluded.descripcion
    `);
    
    await stmt.bind(id, nombre, tipo, pin, descripcion).run();

    return new Response(JSON.stringify({ success: true, mensaje: "Configuración guardada" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error al guardar configuración" }), { status: 500 });
  }
}

export async function onRequestDelete({ request, env }) {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
  
      if (!id) {
        return new Response(JSON.stringify({ error: "ID no proporcionado" }), { status: 400 });
      }
  
      await env.DB.prepare('DELETE FROM iot_config WHERE id = ?').bind(id).run();
  
      return new Response(JSON.stringify({ success: true, mensaje: "Dispositivo eliminado" }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Error al eliminar" }), { status: 500 });
    }
  }
