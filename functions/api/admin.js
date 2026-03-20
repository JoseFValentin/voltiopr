import { getUserFromToken } from './utils.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

// Tablas permitidas (seguridad: solo estas se pueden consultar/modificar)
const ALLOWED_TABLES = ['usuarios', 'dispositivos', 'iot_config', 'user_metadata', 'firmwares'];

// ==============================================================
// GET: Obtener registros de una tabla
// ==============================================================
export async function onRequestGet({ request, env }) {
  try {
    const userId = getUserFromToken(request);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS_HEADERS });
    }

    // 1. Verificar si el usuario es SUPER ADMIN
    const userRow = await env.DB.prepare('SELECT es_admin FROM usuarios WHERE id = ?').bind(userId).first();
    const isSuperAdmin = userRow?.es_admin === 1;

    const url = new URL(request.url);
    const table = url.searchParams.get('table');

    // Sin parámetro de tabla: devolver schema filtrado por pertenencia
    if (!table) {
      const tablesInfo = [];
      for (const t of ALLOWED_TABLES) {
        // Privacidad: Solo Admin ve 'usuarios' completo o la tabla de otros
        if (!isSuperAdmin && t === 'usuarios') continue;

        try {
          // 1. Obtener la estructura de la tabla para ver si tiene columna de dueño
          const cols  = await env.DB.prepare(`PRAGMA table_info(${t})`).all();
          const hasUsuarioId = cols.results.some(c => c.name === 'usuario_id');
          const hasUserId = cols.results.some(c => c.name === 'user_id');

          // Contar solo lo que pertenece al usuario (si la tabla tiene columna de dueño)
          let countQuery = `SELECT COUNT(*) as c FROM ${t}`;
          if (!isSuperAdmin) {
            if (hasUsuarioId) countQuery += ` WHERE usuario_id = ${userId}`;
            else if (hasUserId) countQuery += ` WHERE user_id = ${userId}`;
          }

          const count = await env.DB.prepare(countQuery).first();
          
          tablesInfo.push({
            name: t,
            rows: count?.c ?? 0,
            columns: cols.results.map(c => ({ name: c.name, type: c.type, pk: c.pk === 1 }))
          });
        } catch (_) {
          tablesInfo.push({ name: t, rows: 0, columns: [], error: 'Tabla no accesible' });
        }
      }
      return new Response(JSON.stringify(tablesInfo), { status: 200, headers: CORS_HEADERS });
    }

    // Verificar que la tabla pedida esté en la lista blanca
    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: 'Tabla no permitida' }), { status: 403, headers: CORS_HEADERS });
    }

    // 2. Construir Query Filtrada por Privacidad (Verificar Schema en cada petición)
    const tableCols = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
    const hasUsuarioId = tableCols.results.some(c => c.name === 'usuario_id');
    const hasUserId    = tableCols.results.some(c => c.name === 'user_id');

    let query = `SELECT * FROM ${table}`;
    const params = [];

    if (!isSuperAdmin) {
        if (hasUsuarioId) {
            query += ` WHERE usuario_id = ?`;
            params.push(userId);
        } else if (hasUserId) {
            query += ` WHERE user_id = ?`;
            params.push(userId);
        } else if (table === 'usuarios') {
            query += ` WHERE id = ?`; // Solo se ve a sí mismo
            params.push(userId);
        }
    }

    query += ` ORDER BY rowid DESC LIMIT 500`;
    
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return new Response(JSON.stringify(results), { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('Admin GET error:', err);
    return new Response(JSON.stringify({ error: 'Error de base de datos: ' + err.message }), { status: 500, headers: CORS_HEADERS });
  }
}

// ==============================================================
// POST: Insertar un registro nuevo
// ==============================================================
export async function onRequestPost({ request, env }) {
  try {
    const userId = getUserFromToken(request);
    if (!userId) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS_HEADERS });

    const userRow = await env.DB.prepare('SELECT es_admin FROM usuarios WHERE id = ?').bind(userId).first();
    const isSuperAdmin = userRow?.es_admin === 1;

    const body = await request.json();
    const { table, data } = body;

    if (!table || !data) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros' }), { status: 400, headers: CORS_HEADERS });
    }
    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: 'Tabla no permitida' }), { status: 403, headers: CORS_HEADERS });
    }

    // Forzar el dueño si no es admin y la tabla lo soporta
    if (!isSuperAdmin) {
        const tableCols = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
        const hasUsuarioId = tableCols.results.some(c => c.name === 'usuario_id');
        const hasUserId    = tableCols.results.some(c => c.name === 'user_id');

        if (hasUsuarioId) data.usuario_id = userId;
        else if (hasUserId) data.user_id = userId;
        else if (table === 'usuarios') return new Response(JSON.stringify({ error: 'No puedes crear usuarios' }), { status: 403, headers: CORS_HEADERS });
    }

    const cols   = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    await env.DB.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).bind(...values).run();

    return new Response(JSON.stringify({ success: true, mensaje: `Registro insertado` }), { status: 201, headers: CORS_HEADERS });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error al insertar: ' + err.message }), { status: 500, headers: CORS_HEADERS });
  }
}

// ==============================================================
// DELETE: Eliminar un registro
// ==============================================================
export async function onRequestDelete({ request, env }) {
  try {
    const userId = getUserFromToken(request);
    if (!userId) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS_HEADERS });

    const userRow = await env.DB.prepare('SELECT es_admin FROM usuarios WHERE id = ?').bind(userId).first();
    const isSuperAdmin = userRow?.es_admin === 1;

    const url   = new URL(request.url);
    const table = url.searchParams.get('table');
    const id    = url.searchParams.get('id');
    const pk    = url.searchParams.get('pk') || 'id';

    if (!table || !id) {
      return new Response(JSON.stringify({ error: 'Parámetros faltantes' }), { status: 400, headers: CORS_HEADERS });
    }
    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: 'Tabla no permitida' }), { status: 403, headers: CORS_HEADERS });
    }

    // Validación de propiedad
    if (!isSuperAdmin) {
        const tableCols = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
        const hasUsuarioId = tableCols.results.some(c => c.name === 'usuario_id');
        const hasUserId    = tableCols.results.some(c => c.name === 'user_id');

        let ownerCol = null;
        if (hasUsuarioId) ownerCol = 'usuario_id';
        else if (hasUserId) ownerCol = 'user_id';
        
        if (table === 'usuarios') {
            if (id != userId) return new Response(JSON.stringify({ error: 'No puedes borrar otros usuarios' }), { status: 403, headers: CORS_HEADERS });
            ownerCol = 'id';
        }

        if (ownerCol) {
            const check = await env.DB.prepare(`SELECT * FROM ${table} WHERE ${pk} = ? AND ${ownerCol} = ?`).bind(id, userId).first();
            if (!check) return new Response(JSON.stringify({ error: 'Registro no encontrado o no te pertenece' }), { status: 404, headers: CORS_HEADERS });
        }
    }

    await env.DB.prepare(`DELETE FROM ${table} WHERE ${pk} = ?`).bind(id).run();

    return new Response(JSON.stringify({ success: true, mensaje: `Registro eliminado` }), { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error al eliminar: ' + err.message }), { status: 500, headers: CORS_HEADERS });
  }
}

// ==============================================================
// PUT: Actualizar un registro existente
// ==============================================================
export async function onRequestPut({ request, env }) {
  try {
    const userId = getUserFromToken(request);
    if (!userId) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS_HEADERS });

    const userRow = await env.DB.prepare('SELECT es_admin FROM usuarios WHERE id = ?').bind(userId).first();
    const isSuperAdmin = userRow?.es_admin === 1;

    const body = await request.json();
    const { table, pk, id, data } = body;

    if (!table || !id || !data) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros' }), { status: 400, headers: CORS_HEADERS });
    }
    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: 'Tabla no permitida' }), { status: 403, headers: CORS_HEADERS });
    }

    // Validación de propiedad
    if (!isSuperAdmin) {
        const tableCols = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
        const hasUsuarioId = tableCols.results.some(c => c.name === 'usuario_id');
        const hasUserId    = tableCols.results.some(c => c.name === 'user_id');

        let ownerCol = null;
        if (hasUsuarioId) ownerCol = 'usuario_id';
        else if (hasUserId) ownerCol = 'user_id';
        
        if (table === 'usuarios') {
            if (id != userId) return new Response(JSON.stringify({ error: 'No puedes editar otros usuarios' }), { status: 403, headers: CORS_HEADERS });
            ownerCol = 'id';
        }

        if (ownerCol) {
            const check = await env.DB.prepare(`SELECT * FROM ${table} WHERE ${pk || 'id'} = ? AND ${ownerCol} = ?`).bind(id, userId).first();
            if (!check) return new Response(JSON.stringify({ error: 'Registro no encontrado o no te pertenece' }), { status: 404, headers: CORS_HEADERS });
        }
        
        // Evitar que el usuario cambie el dueño o su propio estatus de admin
        delete data.usuario_id;
        delete data.user_id;
        delete data.es_admin;
        if (table === 'usuarios') delete data.id;
    }

    const updates = Object.keys(data).map(col => `${col} = ?`).join(', ');
    const values = [...Object.values(data), id];

    await env.DB.prepare(`UPDATE ${table} SET ${updates} WHERE ${pk || 'id'} = ?`).bind(...values).run();

    return new Response(JSON.stringify({ success: true, mensaje: `Registro actualizado` }), { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error al actualizar: ' + err.message }), { status: 500, headers: CORS_HEADERS });
  }
}
