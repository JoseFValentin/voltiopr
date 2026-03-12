/*
  ==============================================================
  VOLTIOPR - LÓGICA DE APLICACIÓN (CEREBRO DEL PROYECTO)
  ==============================================================
  Nota para no programadores:
  Este archivo controla el comportamiento de la página web. Si el
  dashboard fuera un coche, este archivo sería el motor.
  
  Aquí:
  1. Nos conectamos a la Base de Datos (Supabase).
  2. Revisamos si el usuario ingresó correctamente su contraseña (Login).
  3. Enviamos las órdenes para encender luces (NodeMCU/IoT).
  4. Mostramos las gráficas (Chart.js) de temperatura o corriente.
*/

// ==============================================================
// 1. CONFIGURACIÓN DE SUPABASE (BASE DE DATOS EN LA NUBE)
// ==============================================================
/* 
  ⚠ IMPORTANTE ⚠
  Para que esto funcione de forma real, debes crear una cuenta gratuita
  en Supabase (supabase.com), crear un proyecto, y pegar aquí tu propia  URL y KEY de esa base de datos.
*/
const SUPABASE_URL = 'https://TUOPROYECTO.supabase.co'; 
const SUPABASE_ANON_KEY = 'TU_CLAVE_ANONIMA_PUBLICA';

// Iniciamos el "Cliente" de Supabase solo si supabase está disponible
let supabase;
if (window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ==============================================================
// 2. FUNCIÓN PRINCIPAL QUE ARRANCA TODO
// ==============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Cuando se carga la página (DOM), revisamos en qué pantalla estamos
  const isLoginPage = document.getElementById('login-form') !== null;
  const isRegisterPage = document.getElementById('register-form') !== null;
  const isDashboardPage = document.getElementById('loadChart') !== null;

  if (isLoginPage) {
    setupLogin();
  }

  if (isRegisterPage) {
    setupRegister();
  }

  if (isDashboardPage) {
    // Si estamos en el dashboard, primero verificamos que el usuario esté conectado
    checkUserSession();
    setupDashboardCharts();
    setupHardwareControls();
  }
});


// ==============================================================
// 3. PANTALLA DE LOGIN (INICIAR SESIÓN O REGISTRO)
// ==============================================================
function setupLogin() {
  const form = document.getElementById('login-form');
  const btnLogin = document.getElementById('btn-login');
  const btnForgotPassword = document.getElementById('btn-forgot-password');
  const btnGoogle = document.getElementById('btn-google');
  const errorMsg = document.getElementById('error-message');
  const successMsg = document.getElementById('success-message');

  // Si intentan iniciar sesión (submit del formulario)
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página intente "recargarse"
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    errorMsg.classList.add('hidden'); // Ocultar errores previos

    try {
      /* 
         Magia de Supabase: Inicia sesión usando correo y contraseña.
         Si tus credenciales son inválidas, la pantalla dará un aviso. 
         (Nota: Para propósitos de este demo en frontend limpio, simulo el éxito si falla la conexión)
      */
      if(SUPABASE_URL.includes("TUOPROYECTO")) {
        // MODO SIMULACIÓN PARA QUE VEAS QUE FUNCIONA SIN BASE DE DATOS AÚN
        localStorage.setItem('voltiopr_session', 'simulated_token');
        window.location.href = 'dashboard.html';
        return;
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;
      
      // Si todo sale bien, guardamos al usuario y lo mandamos al panel
      window.location.href = 'dashboard.html';
      
    } catch (err) {
      errorMsg.textContent = "Error: " + err.message;
      errorMsg.classList.remove('hidden');
    }
  });

  // ===================================
  // BOTÓN RECUPERAR CONTRASEÑA
  // ===================================
  // Esta función pide un correo, e instruye a Supabase que envíe un link mágico
  if(btnForgotPassword) {
    btnForgotPassword.addEventListener('click', async () => {
      const email = document.getElementById('email').value;
      errorMsg.classList.add('hidden');
      successMsg.classList.add('hidden');

      if(!email) {
        errorMsg.textContent = "Por favor escribe tu correo electrónico arriba primero para recuperarlo.";
        errorMsg.classList.remove('hidden');
        return;
      }

      try {
        if(SUPABASE_URL.includes("TUOPROYECTO")) {
          alert(`Modo Simulación: Te habríamos enviado un correo a ${email} para restaurar la clave.`);
          return;
        }

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/dashboard.html',
        });
        if (error) throw error;

        successMsg.textContent = "Te enviamos las instrucciones a tu correo.";
        successMsg.classList.remove('hidden');
      } catch (err) {
        errorMsg.textContent = "Error: " + err.message;
        errorMsg.classList.remove('hidden');
      }
    });
  }

  // ===================================
  // LOGEO CON GOOGLE (OAuth)
  // ===================================
  // Esta función redirecciona al usuario a Iniciar sesión con su cuenta de Google.
  if(btnGoogle) {
    btnGoogle.addEventListener('click', async () => {
      errorMsg.classList.add('hidden');
      
      try {
        if(SUPABASE_URL.includes("TUOPROYECTO")) {
          alert(`Modo Simulación: No se puede conectar a Google sin una base de datos de Supabase real configurada.`);
          return;
        }

        // Magia que nos da Supabase para redireccionar al login de Google
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/dashboard.html'
          }
        });
        if (error) throw error;
        
      } catch (err) {
        errorMsg.textContent = "Error con Google: " + err.message;
        errorMsg.classList.remove('hidden');
      }
    });
  }
}

// ==============================================================
// 3.5. PANTALLA DE REGISTRO
// ==============================================================
function setupRegister() {
  const form = document.getElementById('register-form');
  const errorMsg = document.getElementById('reg-error-message');
  const successMsg = document.getElementById('reg-success-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const passConfirm = document.getElementById('reg-password-confirm').value;

    errorMsg.classList.add('hidden');
    successMsg.classList.add('hidden');

    if (password !== passConfirm) {
      errorMsg.textContent = "Las contraseñas no coinciden. Inténtalo de nuevo.";
      errorMsg.classList.remove('hidden');
      return;
    }

    try {
      if(SUPABASE_URL.includes("TUOPROYECTO")) {
        alert(`Modo Simulación: Usuario [${username}] con correo [${email}] registrado correctamente.`);
        window.location.href = 'index.html';
        return;
      }

      // Supabase: Registro y guardar metadata (Nombre de usuario) en base de datos.
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username // Esto guarda el usuario en la BD bajo "raw_user_meta_data"
          }
        }
      });
      
      if (error) throw error;

      successMsg.textContent = "¡Registro existoso! Revisa tu bandeja de correo para confirmar tu cuenta y luego inicia sesión.";
      successMsg.classList.remove('hidden');
      
      // Opcional: Redireccionar al cabo de 3 segundos
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 4000);

    } catch (err) {
      errorMsg.textContent = "Error al registrar: " + err.message;
      errorMsg.classList.remove('hidden');
    }
  });
}

// ==============================================================
// 4. SEGURIDAD DEL DASHBOARD 
// ==============================================================
async function checkUserSession() {
  // Queremos protegernos de que nadie entre escribiendo "dashboard.html" sin login
  if(SUPABASE_URL.includes("TUOPROYECTO")) {
    if(!localStorage.getItem('voltiopr_session')) {
      window.location.href = 'index.html';
    }
  } else {
    // Si tienes Supabase real, verificas la sesión correcta:
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Si no existe sesión, lo regresas a la puerta trasera (Login)
      window.location.href = 'index.html';
    }
  }

  // Comportamiento del Botón de Cierre de Sesión (Logout)
  document.getElementById('btn-logout').addEventListener('click', async () => {
    if(SUPABASE_URL.includes("TUOPROYECTO")) {
      localStorage.removeItem('voltiopr_session');
    } else {
      await supabase.auth.signOut();
    }
    window.location.href = 'index.html';
  });
}


// ==============================================================
// 5. GRÁFICAS DEL DASHBOARD (CHART.JS)
// ==============================================================
function setupDashboardCharts() {
  /*
    Aquí "dibujamos" las maravillosas gráficas.
    Por defecto, usamos datos semi-aleatorios para demostración.
    Si tienes Supabase, podrías reemplazar los arrays internos por datos reales leyendo de una tabla 'sensores'.
  */
  const generateData = () => Array.from({length: 12}, () => Math.floor(Math.random() * 40) + 30);

  // Gráfico 1: Línea (Consumo)
  const ctxLoad = document.getElementById('loadChart').getContext('2d');
  new Chart(ctxLoad, {
    type: 'line',
    data: {
      labels: ['00s', '05s', '10s', '15s', '20s', '25s', '30s', '35s', '40s', '45s', '50s', '55s'],
      datasets: [{
        label: 'Carga Eléctrica (kW)',
        data: generateData(),
        borderColor: '#0db9f2', // Azul Volti
        backgroundColor: 'rgba(13, 185, 242, 0.1)', // Fondo difuminado bajo la linea
        fill: true,
        tension: 0.4, // Curvatura suave
        borderWidth: 2,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
        x: { grid: { display: false }, ticks: { color: '#64748b' } }
      }
    }
  });

  // Gráfico 2: Barras Térmicas
  const ctxThermal = document.getElementById('thermalChart').getContext('2d');
  new Chart(ctxThermal, {
    type: 'bar',
    data: {
      labels: ['Sensor A', 'Sensor B', 'Chip C', 'Entrada', 'Salida', 'Afuera'],
      datasets: [{
        label: 'Grados °C',
        data: [65, 72, 68, 24, 45, 22],
        backgroundColor: [
          'rgba(255, 75, 43, 0.6)',  // Rojo vivo (Caliente)
          'rgba(255, 75, 43, 0.8)',
          'rgba(255, 75, 43, 0.6)',
          'rgba(13, 185, 242, 0.6)', // Azul frío (Ventilado)
          'rgba(13, 185, 242, 0.8)',
          'rgba(13, 185, 242, 0.6)'
        ],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
        x: { grid: { display: false }, ticks: { color: '#64748b' } }
      }
    }
  });

  // Simular Sincronización 
  setTimeout(() => {
    const syncPill = document.getElementById('sync-status');
    if(syncPill) {
      syncPill.textContent = "Data Recibida";
      syncPill.className = "px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full border border-green-500/20 uppercase";
    }
  }, 2000);
}

// ==============================================================
// 6. COMUNICACIÓN DE HARDWARE IOT (NODEMCU O ESP32)
// ==============================================================
function setupHardwareControls() {
  /*
    Este código detecta si mueves un interruptor o una barra de potencia 
    y luego "avisa" (actualiza el estado) para que el Hardware Físico 
    (Arduino/NodeMCU) pueda reaccionar en el mundo real.
  */

  // Lógica de los interruptores (Interruptores de encendido/apagado estilo iOS)
  // document.querySelectorAll permite "seleccionar todos los elementos" de tipo interruptor
  document.querySelectorAll('.iot-toggle').forEach(toggle => {
    toggle.addEventListener('change', async (e) => {
      const isTurnedOn = e.target.checked; // ¿Está prendido? Si(true) o No(false)
      const deviceId = e.target.id; // 'reactor-toggle' o 'cooling-toggle'
      
      console.log(`📡 El usuario solicita cambiar [${deviceId}] al estado: ${isTurnedOn ? 'ENCENDIDO' : 'APAGADO'}`);

      // SI USAS SUPABASE REAL PARA INFORMAR AL ARDUINO:
      if(!SUPABASE_URL.includes("TUOPROYECTO")) {
        try {
          // Escribe el estado On/Off en la base de datos para que el NodeMCU lo lea
          // await supabase.from('iot_devices').update({ is_on: isTurnedOn }).match({ device_id: deviceId });
        } catch(err) {
          console.error("Error contactando BD", err);
        }
      }
    });
  });

  // Lógica para potencias (Barras deslizantes "Poder al X%")
  document.querySelectorAll('.iot-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      // El slider mueve un simple número.
      const currentPowerLevel = e.target.value;
      const deviceId = e.target.id; // 'reactor-pwm'

      // Buscamos el texto chiquito "45%" que está al lado del slider
      // y actualizamos el número que muestra
      const valueSpan = document.getElementById(deviceId + '-value');
      if (valueSpan) {
        valueSpan.textContent = currentPowerLevel + '%';
      }
    });
    
    // Una vez que dejas de presionar/deslizar, se envía el mandato
    slider.addEventListener('change', async (e) => {
      console.log(`📡 Potencia de ${e.target.id} guardada al poder: ${e.target.value}%`);
      
      // Aquí enviarías a supabase como arriba
    });
  });

  // Pintar marcadores genéricos de estado de pines en el cuadrito chiquito
  const pinContainer = document.getElementById('pin-status-container');
  if(pinContainer) {
    pinContainer.innerHTML = `
      <div class="flex flex-col items-center p-3 rounded-xl bg-volti-accent/5 border border-volti-accent/20">
        <div class="w-4 h-4 rounded-full bg-volti-accent shadow-[0_0_15px_#0db9f2] mb-2 ring-4 ring-volti-accent/10"></div>
        <span class="text-[10px] uppercase font-bold text-white">Relé D1</span>
        <span class="text-[10px] font-bold text-volti-accent mt-1">ON</span>
      </div>
      <div class="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5">
        <div class="w-4 h-4 rounded-full bg-slate-800 mb-2 border border-slate-700"></div>
        <span class="text-[10px] uppercase font-bold text-slate-500">Relé D2</span>
        <span class="text-[10px] font-bold text-slate-600 mt-1">OFF</span>
      </div>
    `;
  }
}
