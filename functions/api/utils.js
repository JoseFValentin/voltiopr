/**
 * UTILIDADES DE SEGURIDAD PARA VOLTIOPR
 * Implementación de Hashing Profesional (PBKDF2) usando Web Crypto API
 */

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Usamos un salt fijo por ahora para simplificar la migración, 
  // pero lo ideal sería un salt aleatorio guardado en la DB por usuario.
  const salt = encoder.encode("voltiopr_secure_salt_2024");
  
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordData,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const exportedKey = await crypto.subtle.exportKey("raw", derivedKey);
  const hashArray = Array.from(new Uint8Array(exportedKey));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


export async function verifyPassword(password, hash) {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

/**
 * Extrae el ID de usuario desde el token de sesión
 * @param {Request} request 
 * @returns {number|null} ID del usuario o null si no es válido
 */
export function getUserFromToken(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  // Limpiar "Bearer " con regex para manejar múltiples espacios y trim final
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  
  if (token.startsWith("SESSION_")) {
    const rawContent = token.replace("SESSION_", "");
    
    // 1. Intentar como Formato Directo (UUID : ID)
    if (rawContent.includes(":")) {
       const parts = rawContent.split(":");
       const userId = parseInt(parts[parts.length - 1]);
       if (!isNaN(userId)) return userId;
    }

    // 2. Fallback: Formato Antiguo (solo el ID como número)
    const oldId = parseInt(rawContent);
    if (!isNaN(oldId)) return oldId;
  }
  return null;
}
/**
 * Obtiene el objeto de usuario completo (incluyendo permisos y jerarquía)
 */
export async function getAuthenticatedUser(request, env) {
  const userId = getUserFromToken(request);
  if (!userId) return null;

  try {
    const user = await env.DB.prepare("SELECT id, username, email, es_admin, parent_id, permisos FROM usuarios WHERE id = ?")
      .bind(userId)
      .first();
    return user;
  } catch (e) {
    return null;
  }
}
