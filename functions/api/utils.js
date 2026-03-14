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
