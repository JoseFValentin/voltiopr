import { getAuthenticatedUser } from './utils.js';

// La llave secreta que debe enviar el hardware
const ACCESS_KEY_SECRET = "v0ltio_Acc3ss_2026_Secur3";

export async function onRequestGet({ request, env }) {
  const isHardware = request.headers.get("X-API-KEY") === ACCESS_KEY_SECRET;
  const user = !isHardware ? await getAuthenticatedUser(request, env) : null;

  if (!isHardware && !user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const userId = user?.id;

    if (id) {
        // Un usuario puede ver lo suyo o lo de sus hijos
        let query = 'SELECT * FROM iot_config WHERE id = ?';
        let params = [id];
        
        if (!isHardware) {
           query += ' AND (usuario_id = ? OR usuario_id IN (SELECT id FROM usuarios WHERE parent_id = ?))';
           params.push(userId, userId);
        }
        
        const device = await env.DB.prepare(query).bind(...params).first();
        if (!device && !isHardware) {
           return new Response(JSON.stringify({ error: "Dispositivo no encontrado o acceso denegado" }), { status: 404 });
        }
        return new Response(JSON.stringify(device), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Para la web, devolvemos lo del usuario y sus hijos
    if (!isHardware) {
        const { results } = await env.DB.prepare('SELECT * FROM iot_config WHERE usuario_id = ? OR usuario_id IN (SELECT id FROM usuarios WHERE parent_id = ?)').bind(userId, userId).all();
        return new Response(JSON.stringify({ success: true, datos_iot: results }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // Si es el hardware (NodeMCU), devolvemos todo
    const { results } = await env.DB.prepare('SELECT * FROM iot_config').all();
    return new Response(JSON.stringify({ success: true, datos_iot: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch(err) {
    return new Response(JSON.stringify({ error: "Error de base de datos" }), { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  const isHardware = request.headers.get("X-API-KEY") === ACCESS_KEY_SECRET;
  const user = !isHardware ? await getAuthenticatedUser(request, env) : null;

  if (!isHardware && !user) {
    return new Response(JSON.stringify({ error: "Acceso denegado" }), { status: 401 });
  }

  // Verificar permisos de control
  if (user && user.permisos === 'READ_ONLY') {
    return new Response(JSON.stringify({ error: "No tienes permisos para controlar dispositivos" }), { status: 403 });
  }

  try {
    const orden = await request.json();
    const id = orden.id_dispositivo;
    const userId = user?.id;
    
    let nuevoValor = orden.valor;
    if (nuevoValor === undefined) {
        if (orden.estado_encendido !== undefined) {
            nuevoValor = orden.estado_encendido ? "1" : "0";
        } else if (orden.poder_porcentaje !== undefined) {
            nuevoValor = orden.poder_porcentaje.toString();
        }
    }

    if (!id) return new Response(JSON.stringify({ error: "Falta ID" }), { status: 400 });

    // Actualizamos la tabla de configuración dinámica
    let query = 'UPDATE iot_config SET valor_actual = ? WHERE id = ?';
    let params = [nuevoValor, id];

    if (!isHardware) {
        query += ' AND (usuario_id = ? OR usuario_id IN (SELECT id FROM usuarios WHERE parent_id = ?))';
        params.push(userId, userId);
    }
    
    const result = await env.DB.prepare(query).bind(...params).run();

    if (result.meta.changes === 0 && !isHardware) {
        return new Response(JSON.stringify({ error: "No autorizado o dispositivo inexistente" }), { status: 403 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Error enviando orden" }), { status: 500 });
  }
}
