# Guía de Implementación: VOLTIOPR (Cloudflare Edition) ⚡

¡Hola! Esta guía está actualizada para la nueva arquitectura **Full-Stack nativa de Cloudflare**. Hemos eliminado la dependencia de Supabase para que todo viva dentro de un mismo ecosistema más rápido y profesional.

---

## 🏗️ 1. ¿Cómo funciona esta nueva versión?

Tu proyecto ahora usa **Cloudflare Pages** para la web y **Cloudflare D1** como base de datos.

### Estructura del Proyecto:
*   `/webapp`: Contiene la interfaz (HTML, CSS, JS).
    *   `app.js`: Ahora se comunica con tus propias "Funciones" de Cloudflare.
*   `/functions/api`: Contiene el "Cerebro" del servidor.
    *   `login.js`, `register.js`, `hardware.js`: Controlan la seguridad y el IoT.
*   `/db/schema.sql`: El plano maestro de tu base de datos.
*   `wrangler.toml`: El manual de configuración para Cloudflare.

---

## 🚀 2. Subir a GitHub

Para que Cloudflare pueda publicar tu sitio, primero debemos asegurar que el código esté en tu repositorio:

1.  Abre tu terminal en VS Code.
2.  Escribe estos comandos para asegurar que todo esté guardado:
    ```bash
    git add .
    git commit -m "Actualización: Guía de implementación para Cloudflare D1"
    git push origin main
    ```

---

## ☁️ 3. Publicar en Cloudflare (Paso a Paso)

### Paso A: Crear la Base de Datos D1
1. Entra a tu [Panel de Cloudflare](https://dash.cloudflare.com/).
2. Ve a **Workers & Pages** -> **D1**.
3. Haz clic en **Create database** -> **Dashboard**.
4. Ponle el nombre: `voltiopr_db`.
5. Una vez creada, copia el **Database ID** (un código largo con letras y números).
6. **IMPORTANTE**: Abre el archivo `wrangler.toml` en VS Code y pega ese código donde dice `database_id = ""`.

### Paso B: Crear el Sitio Web (Pages)
1. En el panel de Cloudflare, ve a **Workers & Pages** -> **Create application** -> **Pages**.
2. Haz clic en **Connect to Git** y selecciona tu repositorio `voltiopr`.
3. **Configuración de Build**:
   - **Framework preset**: `None`.
   - **Build command**: (Déjalo vacío).
   - **Build output directory**: `webapp`.
4. Haz clic en **Save and Deploy**.

### Paso C: Conectar la Base de Datos al Sitio
1. Una vez desplegado, ve a la pestaña **Settings** (Ajustes) de tu proyecto en Cloudflare Pages.
2. En el menú lateral elige **Functions**.
3. Baja hasta **D1 database bindings**.
4. Haz clic en **Add binding**.
5. **Variable name**: Pon exactamente `DB`.
6. **D1 database**: Selecciona `voltiopr_db`.
7. Haz clic en **Save**.
8. **MUY IMPORTANTE**: Debes ir a la pestaña **Deployments** y hacer clic en **Retry deployment** (o subir un nuevo cambio a GitHub) para que Cloudflare reconozca la conexión a la base de datos.

---

## 📡 4. Cómo conectar el NodeMCU (IoT)

Tu placa ahora se comunicará con `https://tu-dominio.com/api/hardware`.

1.  **GET**: El NodeMCU pregunta `https://tu-dominio.com/api/hardware` y recibirá un JSON con el estado de los relés.
2.  **POST**: Si el NodeMCU tiene sensores, puede enviar datos a esa misma dirección.

Los beneficios de esta versión:
✅ **Más rápido**: La base de datos y la web están en el mismo servidor.
✅ **Más seguro**: Nadie puede ver cómo funciona tu base de datos desde afuera.
✅ **Escalable**: Soporta miles de usuarios sin costo adicional (en el plan gratuito).

---
¡Felicidades! VoltioPR ahora es una aplicación profesional de nivel industrial.
