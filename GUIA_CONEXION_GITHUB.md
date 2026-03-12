# Guía Completa: Conectar tu Proyecto (Antigravity/VS Code) con GitHub

Esta guía detalla los pasos exactos para conectar tu entorno de desarrollo local (donde usas Antigravity dentro de VS Code) y subir tu proyecto a un repositorio de GitHub. Esto es fundamental para tener un respaldo de tu código, colaborar con otros desarrolladores y habilitar despliegues automáticos (como en Cloudflare Pages).

## Requisitos Previos

1. **Git Instalado:** Debes tener Git instalado en tu computadora. Puedes descargarlo de [git-scm.com](https://git-scm.com/).
2. **Cuenta de GitHub:** Si aún no tienes una, regístrate de forma gratuita en [github.com](https://github.com/).
3. **Tu Proyecto Local:** Debes estar posicionado en la carpeta de tu proyecto, en tu caso: `c:\Sites\stitch_acceso_al_sistema\voltiopr`.

---

## Paso 1: Inicializar el Repositorio Local

Primero, necesitamos decirle a tu sistema que comience a rastrear los cambios en tu carpeta local.

1. Abre la terminal en VS Code (`Ctrl` + `` ` ``).
2. Asegúrate de estar en la ruta de tu proyecto: `c:\Sites\stitch_acceso_al_sistema\voltiopr`.
3. Ejecuta el siguiente comando para inicializar Git:
   ```bash
   git init
   ```

## Paso 2: Preparar y Confirmar tus Archivos (Commit)

Ahora, vamos a agregar todos tus archivos actuales al repositorio local.

1. Para agregar todos los archivos, ejecuta:
   ```bash
   git add .
   ```
2. A continuación, guarda este estado creando tu primer "commit":
   ```bash
   git commit -m "Commit inicial: Estructura base del proyecto VoltioPR"
   ```

## Paso 3: Crear el Repositorio Remoto en GitHub

1. Ve a [GitHub](https://github.com/) e inicia sesión.
2. En la esquina superior derecha, haz clic en el botón **`+`** y luego en **"New repository"** (Nuevo repositorio).
3. Escribe un nombre para tu repositorio, por ejemplo: `voltiopr`.
4. Elige si quieres que sea **Público** o **Privado**.
5. **MUY IMPORTANTE:** *No* marques las opciones de agregar un archivo README, .gitignore o licencia en este paso, ya que vamos a subir los archivos que ya tienes localmente.
6. Haz clic en el botón verde **"Create repository"**.

## Paso 4: Vincular el Repositorio Local con GitHub y Subir el Código

GitHub te mostrará unas instrucciones. Como ya tienes un repositorio local, seguiremos la sección que dice *"…or push an existing repository from the command line"*.

En la terminal de VS Code, ejecuta estos tres comandos uno por uno (asegúrate de cambiar `<TU_USUARIO>` por tu nombre de usuario de GitHub):

1. **Cambiar la rama principal a 'main':**
   ```bash
   git branch -M main
   ```

2. **Vincular el origen remoto:**
   ```bash
   git remote add origin https://github.com/<TU_USUARIO>/voltiopr.git
   ```

3. **Subir los archivos a GitHub (Push):**
   ```bash
   git push -u origin main
   ```

> **Nota sobre autenticación:** La primera vez que hagas un `push` o si VS Code te lo solicita, se abrirá una ventana en tu navegador pidiéndote que autorices a Visual Studio Code (o a Git Credential Manager) a acceder a tu cuenta de GitHub. Simplemente acepta para conceder los permisos.

---

## 🚀 Integración Directa desde la Interfaz de VS Code (Alternativa sin comandos)

Si prefieres no usar la terminal, puedes hacer todo esto con ayuda de la interfaz gráfica y de manera integrada con Antigravity:

1. Ve al icono de **Control de código fuente** (Source Control) en la barra lateral izquierda de VS Code (el icono que parece un grafo de nodos o simplemente presiona `Ctrl+Shift+G`).
2. Haz clic en el botón **"Initialize Repository"** si aún no lo has hecho.
3. Escribe un mensaje en la caja de texto, por ejemplo "Commit inicial", y haz clic en el botón **"Commit"** (te pedirá que guardes y prepares todos los archivos, dile que sí).
4. Luego, haz clic en el botón **"Publish Branch"**.
5. Te aparecerá un menú desplegable en la parte superior pidiéndote que inicies sesión en GitHub. Permite la conexión.
6. VS Code te preguntará si quieres publicar el repositorio como **Público** o **Privado**. Elige la opción que desees.
7. ¡Listo! VS Code creará el repositorio en tu cuenta de GitHub y subirá todos los archivos automáticamente.

## Siguientes Pasos (Deploy en Cloudflare Pages)

Una vez que tu código esté en GitHub, puedes ir a tu panel de Cloudflare, crear un nuevo proyecto de Pages, conectarlo directamente a este repositorio de GitHub (rama `main`) y cada vez que hagas un `git push`, tu web se actualizará automáticamente.
