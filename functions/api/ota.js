// ==============================================================
// BACKEND: API DE ACTUALIZACIÓN OTA (Over-The-Air)
// ==============================================================

import { getUserFromToken } from './utils.js';

// --- GET: Descargar Firmware (Para el ESP32/ESP8266) ---
// El dispositivo llama a esta URL para saber si hay actualización o para descargarla
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const currentVersion = url.searchParams.get("version");

    // Validar seguridad (X-API-KEY del hardware)
    const apiKey = request.headers.get("X-API-KEY");
    if (apiKey !== "v0ltio_Acc3ss_2026_Secur3" && !getUserFromToken(request)) {
        return new Response("No autorizado", { status: 401 });
    }

    // 1. Acción: check -> ¿Hay versión nueva?
    if (action === "check") {
        const fw = await env.DB.prepare('SELECT version FROM firmwares WHERE activo = 1 ORDER BY fecha_subida DESC LIMIT 1').first();
        if (!fw) return new Response(JSON.stringify({ update_available: false }), { status: 200 });

        // Comparación simple (debe mejorar si se usa SemVer real x.y.z)
        const hasUpdate = currentVersion && (currentVersion !== fw.version);
        
        return new Response(JSON.stringify({ 
            update_available: hasUpdate, 
            latest_version: fw.version 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    // 2. Acción: download -> Enviar el binario crudo
    if (action === "download") {
        const fw = await env.DB.prepare('SELECT binario_base64, version FROM firmwares WHERE activo = 1 ORDER BY fecha_subida DESC LIMIT 1').first();
        if (!fw || !fw.binario_base64) return new Response("Firmware no encontrado", { status: 404 });

        // Remover el header de Data URI si lo tiene (data:application/octet-stream;base64,.....)
        let base64Data = fw.binario_base64;
        if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
        }

        // Decodificar Base64 a ArrayBuffer para enviarlo como binario
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return new Response(bytes.buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="voltiopr-v${fw.version}.bin"`,
                'Content-Length': len.toString()
            }
        });
    }

    // Default action (Dashboard Admin view - sin enviar el binario pesado)
    const userId = getUserFromToken(request);
    if (!userId) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });

    const { results } = await env.DB.prepare('SELECT id, version, descripcion, fecha_subida, activo FROM firmwares ORDER BY fecha_subida DESC').all();
    return new Response(JSON.stringify(results), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch(err) {
    return new Response(JSON.stringify({ error: "Error en servidor OTA", detalle: err.message }), { status: 500 });
  }
}

// --- POST: Subir Nuevo Firmware (Desde el Web Dashboard) ---
export async function onRequestPost({ request, env }) {
  try {
    const userId = getUserFromToken(request);
    if (!userId) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const data = await request.json();
    const { version, descripcion, binario_base64 } = data;

    if (!version || !binario_base64) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 });
    }

    // Desactivar todos los previos
    await env.DB.prepare('UPDATE firmwares SET activo = 0').run();

    // Insertar el nuevo y marcarlo activo
    const stmt = env.DB.prepare(`
      INSERT INTO firmwares (usuario_id, version, descripcion, binario_base64, activo)
      VALUES (?, ?, ?, ?, 1)
    `);
    await stmt.bind(userId, version, descripcion, binario_base64).run();

    return new Response(JSON.stringify({ success: true, mensaje: `Firmware v${version} guardado y activo` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Error al guardar firmware OTA" }), { status: 500 });
  }
}

// --- DELETE: Borrar un Firmware Histórico ---
export async function onRequestDelete({ request, env }) {
    try {
      const userId = getUserFromToken(request);
      if (!userId) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
  
      if (!id) return new Response(JSON.stringify({ error: "ID no proporcionado" }), { status: 400 });
  
      await env.DB.prepare('DELETE FROM firmwares WHERE id = ?').bind(id).run();
  
      return new Response(JSON.stringify({ success: true, mensaje: "Firmware eliminado del historial" }), { status: 200 });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Error al eliminar" }), { status: 500 });
    }
}
