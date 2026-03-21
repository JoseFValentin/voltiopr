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
  const token = authHeader ? authHeader.replace("Bearer ", "") : null;
  
  if (!token) return null;

  if (token.startsWith("SESSION_")) {
    const rawContent = token.replace("SESSION_", "");
    
    // 1. Intentar como Formato Nuevo (Base64: UUID + ID)
    try {
      const payload = atob(rawContent);
      if (payload.length > 36) {
        const userId = payload.substring(36);
        return parseInt(userId);
      }
    } catch (e) {
      // Ignorar error de base64 y pasar al fallback
    }

    // 2. Fallback: Formato Antiguo (ID directo o JSON simple)
    const possibleId = parseInt(rawContent);
    if (!isNaN(possibleId)) return possibleId;
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
