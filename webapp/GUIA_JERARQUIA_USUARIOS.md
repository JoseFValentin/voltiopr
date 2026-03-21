# Guía de Jerarquía de Usuarios en VoltioPR

Este documento explica en detalle cómo funciona el sistema de usuarios, sub-usuarios (parientes/invitados) y permisos en Plataforma VoltioPR, así como los pasos para crearlos.

---

## 🏗️ 1. Entendiendo la Estructura

La base de datos de VoltioPR está diseñada con **3 Niveles de Jerarquía**:

1. **Admin Global** (`es_admin = TRUE`): Los creadores de la plataforma. Tienen acceso al Panel de Administración y control total de todo el sistema.
2. **Usuario Principal / Cuenta Dueña** (`parent_id = NULL`): Un usuario normal que se registra a través de la página web. Es dueño de sus propios dispositivos IoT (NodeMCU/ESP32).
3. **Sub-Usuarios / Parientes** (`parent_id = ID_Del_Dueño`): Cuentas secundarias creadas por el Usuario Principal (ej. hijos, invitados de hotel, empleados). Tienen acceso limitado a los dispositivos del Usuario Principal.

### 🛡️ Niveles de Permisos para Sub-Usuarios (`permisos`):
*   `ALL`: Control total (Pueden añadir y borrar dispositivos del Dashboard).
*   `CONTROL`: Solo pueden prender y apagar los dispositivos existentes.
*   `READ_ONLY`: Solo pueden ver el estado de los sensores, sin tocar nada.

---

## 🛠️ 2. Crear un Usuario Principal

Este es el proceso normal que cualquier persona hace al usar la página web por primera vez.

1.  El usuario entra a `voltiopr.com`.
2.  Hace clic en **"Registrarse"**.
3.  Ingresa su **Nombre, Correo y Contraseña**.
4.  El sistema encripta la contraseña usando nivel bancario (PBKDF2) y guarda el perfil en la tabla `usuarios` de la base de datos.
    *   *Ejemplo de registro interno:* 
        *   `id`: 5
        *   `username`: "Juan Perez"
        *   `email`: "juan@email.com"
        *   `parent_id`: `NULL` (Significa que él es el jefe de la cuenta).

---

## 👨‍👩‍👧 3. Crear Sub-Usuarios (Parientes)

> **Nota:** La interfaz gráfica (botones) para que un Usuario Principal cree parientes desde su Dashboard aún está en desarrollo. Sin embargo, la Base de Datos ya soporta esto al 100%. 

Actualmente, como **Admin Global**, puedes crear sub-usuarios desde el **Panel de Base de Datos** (`/admin.html`).

### Paso a Paso desde el Panel de Admin:

**PASO 1: Identificar el ID del Usuario Principal**
1. Inicia sesión como Admin y ve a **Base de Datos** en el menú.
2. Selecciona la tabla `usuarios`.
3. Busca al dueño de la cuenta (Ej: "Juan Perez").
4. Anota su número de **`id`** (Supongamos que el ID de Juan es `5`).

**PASO 2: Insertar el Nuevo Sub-Usuario**
1. En la misma tabla de `usuarios`, haz clic en el botón verde **"Insertar"**.
2. Rellena los datos para el pariente de la siguiente manera:
    *   `username`: "Maria Perez (Hija)"
    *   `email`: "maria@email.com"
    *   `password_hash`: *(Puedes insertar texto plano temporalmente, la próxima vez que Maria inicie sesión, el sistema actualizará su contraseña al formato seguro PBKDF2)*. Ejemplo: "123456"
    *   `es_admin`: `0` (Falso).
    *   **`parent_id`: `5`** (El número de ID de Juan Perez).
    *   **`permisos`: `CONTROL`** (Para que María solo pueda apagar/prender cosas).
3. Haz clic en **"Guardar"**.

¡Listo! Cuando la base de datos asocie el dispositivo `"luz-sala"` al ID `5` (Juan), internamente comprenderá que el usuario de Maria (`parent_id = 5`) también tiene derecho a ver esa "luz-sala", pero limitándose a lo que sus `permisos` dicten.

---

## 🏨 4. Caso de Uso: Ejemplo de Hotel

Imagina que **VoltioPR** se usa en un hotel inteligente:

1.  **El Gerente (Usuario Principal):** 
    *   ID: `10`, Nombre: "Gerencia Resort", `parent_id`: `NULL`.
    *   Registra las luces y el aire acondicionado de la *Habitación 201* bajo su cuenta (ID 10).
2.  **El Huésped (Sub-Usuario):** 
    *   Llega un turista. El gerente entra al sistema y le crea un usuario temporal.
    *   Nombre: "Huésped 201", email: "h201@resort.com".
    *   **`parent_id`: `10`**
    *   **`permisos`: `CONTROL`**
3.  **Resultado:** El huésped entra a la aplicación del hotel con su celular y puede controlar el aire acondicionado y las luces de su cuarto, pero no puede borrar los dispositivos del sistema ni ver parámetros avanzados, porque su cuenta está amarrada como sub-usuario del Gerente.
