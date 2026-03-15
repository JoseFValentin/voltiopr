// ==============================================================
// BACKEND: API DE ADMINISTRACIÓN DE BASE DE DATOS
// ==============================================================
// Nota para no programadores:
// Este archivo es el "portero del almacén". Permite a las páginas
// de administración ver, agregar y borrar información de todas
// las tablas de nuestra base de datos en la nube.

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

// Tablas permitidas (seguridad: solo estas se pueden consultar/modificar)
const ALLOWED_TABLES = ['usuarios', 'dispositivos', 'iot_config', 'user_metadata'];

// Columnas que NO se deben mostrar en el admin (seguridad)
const HIDDEN_COLS = {};

// ==============================================================
// GET: Obtener registros de una tabla
// Ejemplo: GET /api/admin?table=usuarios
// ==============================================================
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const table = url.searchParams.get('table');

    // Sin parámetro de tabla: devolver schema completo (lista de tablas + recuento)
    if (!table) {
      const tablesInfo = [];
      for (const t of ALLOWED_TABLES) {
        try {
          const count = await env.DB.prepare(`SELECT COUNT(*) as c FROM ${t}`).first();
          const cols  = await env.DB.prepare(`PRAGMA table_info(${t})`).all();
          tablesInfo.push({
            name: t,
            rows: count?.c ?? 0,
            columns: cols.results.map(c => ({ name: c.name, type: c.type, pk: c.pk === 1 }))
          });
        } catch (_) {
          tablesInfo.push({ name: t, rows: 0, columns: [], error: 'Tabla no encontrada' });
        }
      }
      return new Response(JSON.stringify(tablesInfo), { status: 200, headers: CORS_HEADERS });
    }

    // Verificar que la tabla pedida esté en la lista blanca
    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: 'Tabla no permitida' }), { status: 403, headers: CORS_HEADERS });
    }

    const { results } = await env.DB.prepare(`SELECT * FROM ${table} ORDER BY rowid DESC LIMIT 500`).all();
    return new Response(JSON.stringify(results), { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('Admin GET error:', err);
    return new Response(JSON.stringify({ error: 'Error al leer la base de datos: ' + err.message }), { status: 500, headers: CORS_HEADERS });
  }
}

// ==============================================================
// POST: Insertar un registro nuevo en una tabla
// Body: { table: "usuarios", data: { username: "...", email: "...", ... } }
// ==============================================================
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { table, data } = body;

    if (!table || !data) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros: table y data son obligatorios' }), { status: 400, headers: CORS_HEADERS });
    }
    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: 'Tabla no permitida' }), { status: 403, headers: CORS_HEADERS });
    }

    const cols   = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    await env.DB.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).bind(...values).run();

    return new Response(JSON.stringify({ success: true, mensaje: `Registro insertado en "${table}"` }), { status: 201, headers: CORS_HEADERS });

  } catch (err) {
    console.error('Admin POST error:', err);
    return new Response(JSON.stringify({ error: 'Error al insertar: ' + err.message }), { status: 500, headers: CORS_HEADERS });
  }
}

// ==============================================================
// DELETE: Eliminar un registro por rowid o columna PK
// Ejemplo: DELETE /api/admin?table=usuarios&id=3&pk=id
// ==============================================================
export async function onRequestDelete({ request, env }) {
  try {
    const url   = new URL(request.url);
    const table = url.searchParams.get('table');
    const id    = url.searchParams.get('id');
    const pk    = url.searchParams.get('pk') || 'id'; // columna PK por defecto

    if (!table || !id) {
      return new Response(JSON.stringify({ error: 'Parámetros faltantes: table e id son obligatorios' }), { status: 400, headers: CORS_HEADERS });
    }
    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: 'Tabla no permitida' }), { status: 403, headers: CORS_HEADERS });
    }

    await env.DB.prepare(`DELETE FROM ${table} WHERE ${pk} = ?`).bind(id).run();

    return new Response(JSON.stringify({ success: true, mensaje: `Registro eliminado de "${table}"` }), { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('Admin DELETE error:', err);
    return new Response(JSON.stringify({ error: 'Error al eliminar: ' + err.message }), { status: 500, headers: CORS_HEADERS });
  }
}

// ==============================================================
// PUT: Actualizar un registro existente
// Body: { table: "iot_config", pk: "id", id: "led-1", data: { ... } }
// ==============================================================
export async function onRequestPut({ request, env }) {
  try {
    const body = await request.json();
    const { table, pk, id, data } = body;

    if (!table || !id || !data) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros: table, id y data son obligatorios' }), { status: 400, headers: CORS_HEADERS });
    }
    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: 'Tabla no permitida' }), { status: 403, headers: CORS_HEADERS });
    }

    const updates = Object.keys(data).map(col => `${col} = ?`).join(', ');
    const values = [...Object.values(data), id];

    await env.DB.prepare(`UPDATE ${table} SET ${updates} WHERE ${pk || 'id'} = ?`).bind(...values).run();

    return new Response(JSON.stringify({ success: true, mensaje: `Registro actualizado en "${table}"` }), { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('Admin PUT error:', err);
    return new Response(JSON.stringify({ error: 'Error al actualizar: ' + err.message }), { status: 500, headers: CORS_HEADERS });
  }
}
