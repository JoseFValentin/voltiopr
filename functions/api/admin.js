import { getAuthenticatedUser } from './utils.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ALLOWED_TABLES = ['usuarios', 'dispositivos', 'iot_config', 'user_metadata', 'firmwares'];

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
} // Solo para asegurar que exportamos la base si fuera necesario, pero wrangler usa onRequestGet etc.

// ==============================================================
// GET: Obtener registros de una tabla (Jerárquico)
// ==============================================================
export async function onRequestGet({ request, env }) {
  try {
    const user = await getAuthenticatedUser(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS_HEADERS });

    const userId = user.id;
    const isSuperAdmin = user.es_admin === 1;

    const url = new URL(request.url);
    const table = url.searchParams.get('table');

    if (!table) {
      const tablesInfo = [];
      for (const t of ALLOWED_TABLES) {
        const cols = await env.DB.prepare(`PRAGMA table_info(${t})`).all();
        const hasUsuarioId = cols.results.some(c => c.name === 'usuario_id');
        const hasUserId = cols.results.some(c => c.name === 'user_id');

        let countQuery = `SELECT COUNT(*) as c FROM ${t}`;
        const countParams = [];

        if (!isSuperAdmin) {
          if (hasUsuarioId) {
            countQuery += ` WHERE usuario_id = ? OR usuario_id IN (SELECT id FROM usuarios WHERE parent_id = ?)`;
            countParams.push(userId, userId);
          } else if (hasUserId) {
            countQuery += ` WHERE user_id = ? OR user_id IN (SELECT id FROM usuarios WHERE parent_id = ?)`;
            countParams.push(userId, userId);
          } else if (t === 'usuarios') {
            countQuery += ` WHERE id = ? OR parent_id = ?`;
            countParams.push(userId, userId);
          }
        }

        const count = await env.DB.prepare(countQuery).bind(...countParams).first();
        tablesInfo.push({
          name: t,
          rows: count?.c ?? 0,
          columns: cols.results.map(c => ({ name: c.name, type: c.type, pk: c.pk === 1 }))
        });
      }
      return new Response(JSON.stringify(tablesInfo), { status: 200, headers: CORS_HEADERS });
    }

    if (!ALLOWED_TABLES.includes(table)) return new Response(JSON.stringify({ error: 'Tabla no permitida' }), { status: 403, headers: CORS_HEADERS });

    const tableCols = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
    const hasUsuarioId = tableCols.results.some(c => c.name === 'usuario_id');
    const hasUserId    = tableCols.results.some(c => c.name === 'user_id');

    let query = `SELECT t.* FROM ${table} t`;
    if (hasUsuarioId) {
        query = `SELECT t.*, u.username as usuario_nombre FROM ${table} t LEFT JOIN usuarios u ON t.usuario_id = u.id`;
    } else if (hasUserId && table !== 'usuarios') {
        query = `SELECT t.*, u.username as usuario_nombre FROM ${table} t LEFT JOIN usuarios u ON t.user_id = u.id`;
    } else if (table === 'usuarios') {
        query = `SELECT t.*, u.username as parent_nombre FROM usuarios t LEFT JOIN usuarios u ON t.parent_id = u.id`;
    }

    const params = [];
    if (!isSuperAdmin) {
        if (hasUsuarioId) {
            query += (query.includes(' WHERE ') ? ' AND' : ' WHERE') + ` (t.usuario_id = ? OR t.usuario_id IN (SELECT id FROM usuarios WHERE parent_id = ?))`;
            params.push(userId, userId);
        } else if (hasUserId) {
            query += (query.includes(' WHERE ') ? ' AND' : ' WHERE') + ` (t.user_id = ? OR t.user_id IN (SELECT id FROM usuarios WHERE parent_id = ?))`;
            params.push(userId, userId);
        } else if (table === 'usuarios') {
            query += (query.includes(' WHERE ') ? ' AND' : ' WHERE') + ` (t.id = ? OR t.parent_id = ?)`;
            params.push(userId, userId);
        }
    }

    query += ` ORDER BY t.rowid DESC LIMIT 500`;
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return new Response(JSON.stringify(results), { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
  }
}

// ==============================================================
// POST: Insertar (Jerárquico)
// ==============================================================
export async function onRequestPost({ request, env }) {
  try {
    const user = await getAuthenticatedUser(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS_HEADERS });
    if (user.permisos === 'READ_ONLY') return new Response(JSON.stringify({ error: 'Sin permisos de escritura' }), { status: 403, headers: CORS_HEADERS });

    const userId = user.id;
    const isSuperAdmin = user.es_admin === 1;

    const body = await request.json();
    const { table, data } = body;

    if (!table || !data) return new Response(JSON.stringify({ error: 'Faltan parámetros' }), { status: 400, headers: CORS_HEADERS });
    if (!ALLOWED_TABLES.includes(table)) return new Response(JSON.stringify({ error: 'Tabla no permitida' }), { status: 403, headers: CORS_HEADERS });

    if (!isSuperAdmin) {
        const tableCols = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
        const hasUsuarioId = tableCols.results.some(c => c.name === 'usuario_id');
        const hasUserId    = tableCols.results.some(c => c.name === 'user_id');

        if (hasUsuarioId) data.usuario_id = userId;
        else if (hasUserId) data.user_id = userId;
        else if (table === 'usuarios') {
          data.parent_id = userId; // Un padre crea sub-usuarios
          data.es_admin = 0;
          if (!data.permisos) data.permisos = 'ALL';
        }
    }

    const cols   = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    await env.DB.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).bind(...values).run();

    return new Response(JSON.stringify({ success: true }), { status: 201, headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
  }
}

// ==============================================================
// PUT: Actualizar (Jerárquico)
// ==============================================================
export async function onRequestPut({ request, env }) {
  try {
    const user = await getAuthenticatedUser(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS_HEADERS });
    if (user.permisos === 'READ_ONLY') return new Response(JSON.stringify({ error: 'Sin permisos de escritura' }), { status: 403, headers: CORS_HEADERS });

    const userId = user.id;
    const isSuperAdmin = user.es_admin === 1;
    const body = await request.json();
    const { table, data, id, pk } = body;

    if (!table || !data || !id || !pk) return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400, headers: CORS_HEADERS });
    
    if (!isSuperAdmin) {
      let ownerCheckQuery = `SELECT 1 FROM ${table} WHERE ${pk} = ?`;
      let ownerParams = [id];

      const tableCols = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
      const hasUsuarioId = tableCols.results.some(c => c.name === 'usuario_id');
      const hasUserId    = tableCols.results.some(c => c.name === 'user_id');

      if (hasUsuarioId) {
        ownerCheckQuery += ` AND (usuario_id = ? OR usuario_id IN (SELECT id FROM usuarios WHERE parent_id = ?))`;
        ownerParams.push(userId, userId);
      } else if (hasUserId) {
        ownerCheckQuery += ` AND (user_id = ? OR user_id IN (SELECT id FROM usuarios WHERE parent_id = ?))`;
        ownerParams.push(userId, userId);
      } else if (table === 'usuarios') {
        ownerCheckQuery += ` AND (id = ? OR parent_id = ?)`;
        ownerParams.push(userId, userId);
      } else {
        return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: CORS_HEADERS });
      }

      const isOwner = await env.DB.prepare(ownerCheckQuery).bind(...ownerParams).first();
      if (!isOwner) return new Response(JSON.stringify({ error: 'No autorizado para editar' }), { status: 403, headers: CORS_HEADERS });

      delete data.es_admin;
      if (table === 'usuarios') delete data.parent_id;
      else { delete data.usuario_id; delete data.user_id; }
    }

    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), id];
    await env.DB.prepare(`UPDATE ${table} SET ${sets} WHERE ${pk} = ?`).bind(...values).run();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
  }
}

// ==============================================================
// DELETE: Eliminar (Jerárquico)
// ==============================================================
export async function onRequestDelete({ request, env }) {
  try {
    const user = await getAuthenticatedUser(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS_HEADERS });
    if (user.permisos === 'READ_ONLY') return new Response(JSON.stringify({ error: 'Sin permisos de escritura' }), { status: 403, headers: CORS_HEADERS });

    const userId = user.id;
    const isSuperAdmin = user.es_admin === 1;
    const url = new URL(request.url);
    const table = url.searchParams.get('table');
    const id = url.searchParams.get('id');
    const pk = url.searchParams.get('pk') || 'id';

    if (!isSuperAdmin) {
      let ownerCheckQuery = `SELECT 1 FROM ${table} WHERE ${pk} = ?`;
      let ownerParams = [id];

      const tableCols = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
      const hasUsuarioId = tableCols.results.some(c => c.name === 'usuario_id');
      const hasUserId    = tableCols.results.some(c => c.name === 'user_id');

      if (hasUsuarioId) {
        ownerCheckQuery += ` AND (usuario_id = ? OR usuario_id IN (SELECT id FROM usuarios WHERE parent_id = ?))`;
        ownerParams.push(userId, userId);
      } else if (hasUserId) {
        ownerCheckQuery += ` AND (user_id = ? OR user_id IN (SELECT id FROM usuarios WHERE parent_id = ?))`;
        ownerParams.push(userId, userId);
      } else if (table === 'usuarios') {
        ownerCheckQuery += ` AND (id = ? OR parent_id = ?)`;
        ownerParams.push(userId, userId);
      } else {
        return new Response(JSON.stringify({ error: 'Denegado' }), { status: 403, headers: CORS_HEADERS });
      }

      const isOwner = await env.DB.prepare(ownerCheckQuery).bind(...ownerParams).first();
      if (!isOwner) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: CORS_HEADERS });
    }

    await env.DB.prepare(`DELETE FROM ${table} WHERE ${pk} = ?`).bind(id).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
  }
}
