# 🔐 Manual de Seguridad: Comunicación IoT en VoltioPR

Este documento explica cómo proteger la comunicación entre tus placas (ESP32/ESP8266) y los servidores de Cloudflare para que nadie más pueda controlar tus dispositivos.

## 1. Niveles de Seguridad Implementados

### Nivel 1: Encriptación HTTPS (Automático)
Toda la información viaja por un "túnel" encriptado gracias al certificado SSL de `.pages.dev`. Esto evita que alguien en la misma red WiFi pueda "sniffear" (espiar) la contraseña o el estado de tus pines.

### Nivel 2: Llave de Acceso (Access Key) - **NUEVO**
A partir de ahora, la API de VoltioPR requiere una **Llave de Acceso** secreta en cada petición. Si un dispositivo intenta preguntar el estado de un pin sin enviar esta llave CORRECTA, el servidor rechazará la conexión con un error `401 Unauthorized`.

---

## 2. Cómo Configurar y Trabajar con la Clave

### A. Definir la clave en el Servidor
La clave está configurada en el archivo `functions/api/hardware.js`. Por defecto, para este proyecto hemos establecido:
*   **CLAVE ELEGIDA:** `v0ltio_Acc3ss_2026_Secur3`

> [!TIP]
> Puedes cambiar esta clave en el archivo del servidor en cualquier momento, pero recuerda que deberás actualizarla en todos tus ESP.

### B. Enviar la clave desde el Hardware (Arduino)
Para que el servidor acepte la orden, el ESP debe incluir la llave en las "Cabeceras HTTP" (Headers). 

**Ejemplo de cabecera:**
`X-API-KEY: v0ltio_Acc3ss_2026_Secur3`

### C. Cómo cambiar la clave en el futuro
Si sospechas que alguien conoce tu llave, sigue estos pasos:
1. Abre `functions/api/hardware.js`.
2. Cambia el valor de la variable `ACCES_KEY_SECRET`.
3. Sube los cambios con `git push`.
4. Actualiza el código en tus placas ESP.

---

## 3. Ejemplo de flujo de trabajo seguro

1.  **Dashboard:** Tú mueves un interruptor en la web. La web envía tu sesión de usuario (JWT) para validar que ERES TÚ.
2.  **Servidor:** Cloudflare recibe la orden, valida tu identidad y actualiza la Database (D1).
3.  **ESP32/ESP8266:** El chip pregunta cada X segundos: "¿Hay cambios?". Pero ahora pregunta diciendo: "Soy yo, y aquí está mi llave secreta".
4.  **Servidor:** Compara la llave. Si coincide, le entrega el nuevo estado del pin.

---

## 4. Preguntas Frecuentes

**¿Qué pasa si pongo la llave mal en el Arduino?**
El ESP recibirá un código `401`. En el Monitor Serial de Arduino verás que la conexión falla y el pin no se actualizará.

**¿Es esta llave segura?**
Sí, porque viaja DENTRO del túnel HTTPS. Nadie puede verla aunque la intercepten, ya que está encriptada por el protocolo SSL antes de salir del chip.
