import { getAuthenticatedUser } from './utils.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await getAuthenticatedUser(request, env);
    if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });

    const userId = user.id;
    // Jerarquía: Ver lo propio y lo de los hijos
    const { results } = await env.DB.prepare(`
      SELECT * FROM iot_config 
      WHERE usuario_id = ? 
      OR usuario_id IN (SELECT id FROM usuarios WHERE parent_id = ?)
    `).bind(userId, userId).all();
    
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch(err) {
    return new Response(JSON.stringify({ error: "Error al leer" }), { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await getAuthenticatedUser(request, env);
    if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });

    if (user.permisos === 'READ_ONLY') {
      return new Response(JSON.stringify({ error: "Sin permisos de edición" }), { status: 403 });
    }

    const userId = user.id;
    const { id, nombre, tipo, pin, descripcion, usuario_id } = await request.json();

    if (!id || !nombre || !tipo || !pin) return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });

    // Determinar a quién pertenece (por defecto al que crea, o validamos si es uno de sus hijos)
    let targetOwner = userId;
    if (usuario_id && usuario_id != userId) {
        const isChild = await env.DB.prepare("SELECT 1 FROM usuarios WHERE id = ? AND parent_id = ?").bind(usuario_id, userId).first();
        if (!isChild) return new Response(JSON.stringify({ error: "No puedes asignar a este usuario" }), { status: 403 });
        targetOwner = usuario_id;
    }

    const stmt = env.DB.prepare(`
      INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, descripcion)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        usuario_id = excluded.usuario_id,
        nombre = excluded.nombre,
        tipo = excluded.tipo,
        pin = excluded.pin,
        descripcion = excluded.descripcion
      WHERE usuario_id = ? OR usuario_id IN (SELECT id FROM usuarios WHERE parent_id = ?) OR usuario_id IS NULL
    `);
    
    await stmt.bind(id, targetOwner, nombre, tipo, pin, descripcion, userId, userId).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestDelete({ request, env }) {
    try {
      const user = await getAuthenticatedUser(request, env);
      if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
      if (user.permisos === 'READ_ONLY') return new Response(JSON.stringify({ error: "Sin permisos" }), { status: 403 });

      const userId = user.id;
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
  
      if (!id) return new Response(JSON.stringify({ error: "Falta ID" }), { status: 400 });
  
      await env.DB.prepare(`
        DELETE FROM iot_config 
        WHERE id = ? 
        AND (usuario_id = ? OR usuario_id IN (SELECT id FROM usuarios WHERE parent_id = ?))
      `).bind(id, userId, userId).run();
  
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
