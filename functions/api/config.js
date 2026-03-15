// ==============================================================
// BACKEND: API DE CONFIGURACIÓN IOT (Pines ESP)
// ==============================================================

import { getUserFromToken } from './utils.js';

export async function onRequestGet({ request, env }) {
  try {
    const userId = getUserFromToken(request);
    if (!userId) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    // Obtenemos todos los dispositivos configurados para este usuario
    const { results } = await env.DB.prepare('SELECT * FROM iot_config WHERE usuario_id = ?').bind(userId).all();
    
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
    const userId = getUserFromToken(request);
    if (!userId) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const data = await request.json();
    const { id, nombre, tipo, pin, descripcion } = data;

    if (!id || !nombre || !tipo || !pin) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 });
    }

    // Insertar o actualizar configuración (Upsert) - Asegurando que el usuario sea el dueño
    const stmt = env.DB.prepare(`
      INSERT INTO iot_config (id, usuario_id, nombre, tipo, pin, descripcion)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        usuario_id = excluded.usuario_id,
        nombre = excluded.nombre,
        tipo = excluded.tipo,
        pin = excluded.pin,
        descripcion = excluded.descripcion
      WHERE usuario_id = ? OR usuario_id IS NULL
    `);
    
    await stmt.bind(id, userId, nombre, tipo, pin, descripcion, userId).run();

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
      const userId = getUserFromToken(request);
      if (!userId) {
        return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
      }

      const url = new URL(request.url);
      const id = url.searchParams.get('id');
  
      if (!id) {
        return new Response(JSON.stringify({ error: "ID no proporcionado" }), { status: 400 });
      }
  
      await env.DB.prepare('DELETE FROM iot_config WHERE id = ? AND usuario_id = ?').bind(id, userId).run();
  
      return new Response(JSON.stringify({ success: true, mensaje: "Dispositivo eliminado" }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Error al eliminar" }), { status: 500 });
    }
  }
