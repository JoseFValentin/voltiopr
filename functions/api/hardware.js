// BACKEND: API DE CONTROL DE HARDWARE IoT (Unificada)
// ==============================================================
import { getUserFromToken } from './utils.js';

// La llave secreta que debe enviar el hardware
const ACCESS_KEY_SECRET = "v0ltio_Acc3ss_2026_Secur3";

function isAuthorized(request) {
  const apiKey = request.headers.get("X-API-KEY");
  return apiKey === ACCESS_KEY_SECRET;
}

export async function onRequestGet({ request, env }) {
  const isHardware = request.headers.get("X-API-KEY") === ACCESS_KEY_SECRET;
  const userId = !isHardware ? getUserFromToken(request) : null;

  if (!isHardware && !userId) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id) {
        // Validación de propiedad si es desde la web
        const query = userId 
          ? 'SELECT * FROM iot_config WHERE id = ? AND usuario_id = ?'
          : 'SELECT * FROM iot_config WHERE id = ?';
        
        const params = userId ? [id, userId] : [id];
        const device = await env.DB.prepare(query).bind(...params).first();
        
        if (!device && userId) {
           return new Response(JSON.stringify({ error: "Dispositivo no encontrado o no pertenece al usuario" }), { status: 404 });
        }
        
        return new Response(JSON.stringify(device), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Para la web, devolvemos solo lo del usuario
    if (userId) {
        const { results } = await env.DB.prepare('SELECT * FROM iot_config WHERE usuario_id = ?').bind(userId).all();
        return new Response(JSON.stringify({ success: true, datos_iot: results }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // Si es el hardware (NodeMCU), por ahora devolvemos todo o podrías filtrar por MAC si la tuviéramos
    const { results } = await env.DB.prepare('SELECT * FROM iot_config').all();
    return new Response(JSON.stringify({ success: true, datos_iot: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch(err) {
    return new Response(JSON.stringify({ error: "Error leyendo sensores" }), { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  const isHardware = request.headers.get("X-API-KEY") === ACCESS_KEY_SECRET;
  const userId = !isHardware ? getUserFromToken(request) : null;

  if (!isHardware && !userId) {
    return new Response(JSON.stringify({ error: "Acceso denegado" }), { status: 401 });
  }

  try {
    const orden = await request.json();
    const id = orden.id_dispositivo;
    
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
    const query = userId 
      ? 'UPDATE iot_config SET valor_actual = ? WHERE id = ? AND usuario_id = ?'
      : 'UPDATE iot_config SET valor_actual = ? WHERE id = ?';
    
    const params = userId ? [nuevoValor, id, userId] : [nuevoValor, id];
    const result = await env.DB.prepare(query).bind(...params).run();

    if (result.meta.changes === 0 && !userId) {
        // Legacy support solo si no hay userId (hardware directo a tabla antigua)
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
