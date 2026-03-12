# Guía Definitiva de Implementación: VOLTIOPR (Blue Edition)

¡Hola! Esta guía está escrita asumiendo que **no eres un programador experto**. Te explicaré paso a paso cómo funciona este sistema que acabamos de crear, cómo publicarlo gratis en internet usando tu dominio `voltiop.com`, y cómo conectar tu placa base (NodeMCU o ESP32) al panel de control.

---

## 🏗️ 1. ¿Cómo funciona todo este código?

Hemos consolidado todo tu proyecto en una versión **muy ligera y moderna** que no necesita servidores complejos ni instalaciones raras. Funciona usando el navegador y herramientas externas (CDNs).

La estructura de la carpeta `webapp` que acabamos de crear es la siguiente:
*   `index.html`: La pantalla de Login (Puerta principal).
*   `dashboard.html`: El Panel de Control principal (Donde están las gráficas y botones).
*   `styles.css`: El "maquillaje" de tu página. Todos los colores, brillos color neón, y el efecto de "cristal" (*glassmorphism*) viven aquí. Al tenerlo separado, ambas páginas se ven idénticas sin repetir código.
*   `app.js`: ¡El Cerebro! 🧠 Aquí es donde ocurre la magia. Este archivo se encarga de revisar contraseñas, dibujar las gráficas, y enviar órdenes a tu Hardware (NodeMCU).

### El Flujo IoT (El Camino de los Datos):
1.  **Tú** mueves un botón en tu celular o computadora en `dashboard.html`.
2.  El archivo `app.js` se da cuenta de esto y le dice a **Supabase** (tu base de datos en la nube gratuita): *"Oye, el jefe quiere Encender el Relé 2"*.
3.  Tu plaquita de WiFi (el **NodeMCU**) siempre está conectada al internet silenciosamente *"escuchando"* a la nube de Supabase. Apenas nota que cambió la orden, físicamente dispara electricidad encendiendo el foco, motor o lo que tengas conectado.

---

## 🚀 2. Publicar en internet TOTALMENTE GRATIS (Cloudflare Pages)

Cloudflare Pages es ideal para proyectos como este (llamados "Vanilla JS" o frontends estáticos). Es fácil, rápido y te permite conectar tu propio dominio (`voltiop.com`) sin pagar un centavo de hosting.

### Paso A Paso:

1.  **Sube tu carpeta `webapp` a GitHub**:
    *   Si aún no la tienes, crea una cuenta gratuita en [GitHub.com](https://github.com/).
    *   Crea un nuevo repositorio y nómbralo `voltiopr-dashboard`.
    *   Arrastra exclusivamente los archivos de la carpeta `webapp` (`index.html`, `dashboard.html`, `styles.css`, `app.js`) a ese repositorio y guárdalos (haz un *commit*).

2.  **Crea tu proyecto en Cloudflare Pages**:
    *   Ve a [Cloudflare Dashboard](https://dash.cloudflare.com/) e inicia sesión.
    *   En el menú izquierdo, busca la sección **Workers & Pages** -> **Pages**.
    *   Haz clic en **Connect to Git** (Conectar a Git). Cloudflare te pedirá permiso para ver tu cuenta de GitHub. Apruébalo.
    *   Selecciona tu nuevo repositorio `voltiopr-dashboard`.
    *   Haz clic en **Begin Setup** (Comenzar configuración).

3.  **Configura el despliegue (Build settings)**:
    *   ¡Esta es la mejor parte! Como diseñamos este código **especialmente** para ti de forma nativa (sin Vite, Node.js ni "empaquetadores" que den dolor de cabeza), la configuración es facilísima:
    *   **Framework preset:** Selecciona `None` (Ninguno).
    *   **Build command:** Déjalo completamente en blanco.
    *   **Build output directory:** Déjalo completamente en blanco.
    *   Dale clic al botón azul **Save and Deploy**. En solo 10 segundos, Cloudflare publicará tu página con un nombre raro (terminado en `.pages.dev`).

4.  **Conecta tu dominio (voltiop.com)**:
    *   Una vez publicado, entra a las configuraciones de este proyecto recién creado en Cloudflare Pages y ve a la pestaña **Custom Domains** (Dominios personalizados).
    *   Escribe `voltiop.com` u `panel.voltiop.com`.
    *   Cloudflare hará todo automáticamente para conectarlo. Probablemente en 5 minutos ya puedas entrar a `tu-dominio.com` y ver tu pantalla azul luminosa de Login.

---

## 🔒 3. Conectando la Base de Datos y Sesiones (Supabase)

Para que el registro te deje entrar (y no sea de mentira temporal como lo dejé ahora mismo configurado para que lo puedas probar), necesitas hacer lo siguiente:

1.  Ve a [Supabase.com](https://supabase.com/) y crea un proyecto nuevo (Plan Gratuito).
2.  Terminado de crear, ve a **Project Settings** (el engrane abajito a la izquierda) -> **API**.
3.  Encuentra tu **URL del Proyecto** (Ej. `https://xxxxxx.supabase.co`) y tu Clave **anon (Public)**.
4.  Abre el archivo `app.js` de nuestro código y reemplaza en las primeras líneas estas dos variables:
    ```javascript
    const SUPABASE_URL = 'https://TUOPROYECTO.supabase.co'; 
    const SUPABASE_ANON_KEY = 'TU_CLAVE_ANONIMA_PUBLICA';
    ```
### Página de Registro (Datos Personales):
Ahora el botón de crear cuenta nos lleva a `register.html`, donde pedimos Nombre de Usuario, Correo y Contraseña. 
* Cuando el usuario llena el formulario, Supabase guarda su email y clave normalmente, pero **el nombre de usuario** se guarda en un lugar especial de Supabase llamado `raw_user_meta_data`.
* **Dato Técnico:** Si en el futuro quieres leer los nombres de los usuarios dentro de `dashboard.html` o en tu base de datos, siempre estarán guardados de forma segura vinculados a su sesión bajo la estructura de información del usuario provista por Supabase en `session.user.user_metadata.username`.

5.  Actualiza los archivos en tu GitHub. Cloudflare detectará que cambiaste el `app.js` y `index.html` y actualizará tu página en internet en segundos.

### Habilitando Google Login (Opcional):
Para que el botón de **"Iniciar Sesión con Google"** funcione de verdad:
1. Dentro de Supabase, ve a **Authentication** -> **Providers**.
2. Encuentra la opción **Google** y actívala.
3. Te pedirá que pegues tu "Client ID" y "Client Secret". Estos códigos te los da Google creando una app gratuita en `console.cloud.google.com`.
4. El botón detectará todo automáticamente y conectará al usuario.

### Recuperar Contraseña:
Agregamos la opción de **"¿Olvidaste tu contraseña?"**. Funciona muy facil:
1. El usuario debe escribir solo su email la casilla.
2. Hacer clic en "Olvidaste tu contraseña".
3. **Tu Supabase** automáticamente le enviará un correo a esa persona con un enlace seguro mágico para volver a entrar al Dashboard.

---

## 📡 4. ¿Y cómo conecto el Robot / NodeMCU a Supabase?

La manera más efectiva para el "IoT Libre de Mantenimiento" es usar un enfoque llamado **API Polling (Consultas cortas) o REST HTTP**.

1.  En el panel web de Supabase (Editor SQL o Table Editor), crea una tabla pequeña llamada `iot_devices`. Ponle tres columnas esenciales:
    *   `id` (Un número cualquiera como "1" para tu relé primario).
    *   `device_id` (Texto identificador, e.j., 'reactor-toggle' para coincidir con nuestro código `app.js`).
    *   `estado_on` (Boolean - TRUE / FALSE - que dice si debe estar prendido o no).
2.  En el NodeMCU (programado desde el Arduino IDE en lenguaje C++), importarás la librería de Wi-Fi (`ESP8266WiFi.h`) y la librería HTTPS (`ESP8266HTTPClient.h`).
3.  En el inicio del NodeMCU (`void loop()`), harás que pase revisar a esa misma base de datos Supabase usando la URL de tú proyecto y tu Clave public (`anon`) preguntando a través de protocolo REST GET: *"¿Está el estado_on en TRUE?"*.
4.  Si recibe TRUE, ejecutas el clásico comando Arduino `digitalWrite(PinRele, HIGH);`.
5.  Al final del `app.js` nuestro (Revisa la línea de la función `setupHardwareControls()`), dejé comentada la función:
    ```javascript
    // await supabase.from('iot_devices').update({ estado_on: isTurnedOn }).match({ device_id: deviceId });
    ```
    Cuando el usuario mueve la barrita, en el celular, automáticamente el `app.js` cambia el status a TRUE en Supabase. Instantes después, el NodeMCU se da cuenta del cambio, y enciende tu dispositivo en el Mundo Real.

¡Felicidades! Tienes tu ecosistema cerrado, programado y unificado en una interfaz Blue Edition futurista.
