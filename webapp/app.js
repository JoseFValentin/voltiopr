/*
  ==============================================================
  VOLTIOPR - LÓGICA DE APLICACIÓN (FRONTEND)
  ==============================================================
  Nota para no programadores:
  Este archivo controla el comportamiento de la página web.
  Ahora se comunica con nuestro propio "Backend" (Cloudflare Functions)
  en vez de usar Supabase directamente.
*/

// ==============================================================
// 1. FUNCIÓN PRINCIPAL QUE ARRANCA TODO
// ==============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const isLoginPage = document.getElementById('login-form') !== null;
  const isRegisterPage = document.getElementById('register-form') !== null;
  const isDashboardPage = document.getElementById('loadChart') !== null;

  if (isLoginPage) setupLogin();
  if (isRegisterPage) setupRegister();
  if (isDashboardPage) {
    checkUserSession();
    setupDashboardCharts();
    setupHardwareControls();
  }
});

// ==============================================================
// 2. PANTALLA DE LOGIN
// ==============================================================
function setupLogin() {
  const form = document.getElementById('login-form');
  const errorMsg = document.getElementById('error-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    errorMsg.classList.add('hidden');

    try {
      // Llamar a nuestra propia API de login en Cloudflare
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error desconocido");
      }

      // Guardar sesión y redirigir
      localStorage.setItem('voltiopr_session', data.token);
      localStorage.setItem('voltiopr_user', data.usuario);
      window.location.href = 'dashboard.html';

    } catch (err) {
      errorMsg.textContent = err.message;
      errorMsg.classList.remove('hidden');
    }
  });
}

// ==============================================================
// 3. PANTALLA DE REGISTRO
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
      errorMsg.textContent = "Las contraseñas no coinciden.";
      errorMsg.classList.remove('hidden');
      return;
    }

    try {
      // Llamar a nuestra API de registro
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      successMsg.textContent = data.mensaje;
      successMsg.classList.remove('hidden');
      
      setTimeout(() => { window.location.href = 'index.html'; }, 3000);

    } catch (err) {
      errorMsg.textContent = err.message;
      errorMsg.classList.remove('hidden');
    }
  });
}

// ==============================================================
// 4. SEGURIDAD DEL DASHBOARD 
// ==============================================================
function checkUserSession() {
  // Verificamos si existe el pase guardado en la memoria del navegador
  if (!localStorage.getItem('voltiopr_session')) {
    window.location.href = 'index.html';
  }

  // Comportamiento Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('voltiopr_session');
    localStorage.removeItem('voltiopr_user');
    window.location.href = 'index.html';
  });
}

// ==============================================================
// 5. GRÁFICAS DEL DASHBOARD (CHART.JS)
// ==============================================================
function setupDashboardCharts() {
  const generateData = () => Array.from({length: 12}, () => Math.floor(Math.random() * 40) + 30);

  const ctxLoad = document.getElementById('loadChart').getContext('2d');
  new Chart(ctxLoad, {
    type: 'line',
    data: {
      labels: ['00s', '05s', '10s', '15s', '20s', '25s', '30s', '35s', '40s', '45s', '50s', '55s'],
      datasets: [{
        label: 'Carga Eléctrica (kW)',
        data: generateData(),
        borderColor: '#0db9f2',
        backgroundColor: 'rgba(13, 185, 242, 0.1)',
        fill: true,
        tension: 0.4,
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

  const ctxThermal = document.getElementById('thermalChart').getContext('2d');
  new Chart(ctxThermal, {
    type: 'bar',
    data: {
      labels: ['Sensor A', 'Sensor B', 'Chip C', 'Entrada', 'Salida', 'Afuera'],
      datasets: [{
        label: 'Grados °C',
        data: [65, 72, 68, 24, 45, 22],
        backgroundColor: [
          'rgba(255, 75, 43, 0.6)', 'rgba(255, 75, 43, 0.8)', 'rgba(255, 75, 43, 0.6)',
          'rgba(13, 185, 242, 0.6)', 'rgba(13, 185, 242, 0.8)', 'rgba(13, 185, 242, 0.6)'
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

  setTimeout(() => {
    const syncPill = document.getElementById('sync-status');
    if(syncPill) {
      syncPill.textContent = "Data DB Local";
      syncPill.className = "px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full border border-green-500/20 uppercase";
    }
  }, 2000);
}

// ==============================================================
// 6. COMUNICACIÓN DE HARDWARE IOT VIA CLOUDFLARE
// ==============================================================
async function setupHardwareControls() {
  
  // 1. Al cargar la pantalla, pedimos los datos actuales a la BD
  try {
    const res = await fetch('/api/hardware');
    if (res.ok) {
      const dbInfo = await res.json();
      console.log("Datos Iot Cargados desde la BD:", dbInfo);
      
      // Actualizamos los interruptores en la pantalla segun la base de datos
      dbInfo.datos_iot.forEach(disp => {
        const toggle = document.getElementById(disp.id);
        if (toggle) toggle.checked = disp.estado_encendido;
        
        // Asumiendo que los sliders se llaman igual que el id pero terminan diferente
        const pureId = disp.id.split('-')[0]; // ej: de 'reactor-toggle' saca 'reactor'
        const slider = document.getElementById(pureId + '-pwm');
        if (slider) {
            slider.value = disp.poder_porcentaje;
            const span = document.getElementById(pureId + '-pwm-value');
            if(span) span.textContent = disp.poder_porcentaje + '%';
        }
      });
    }
  } catch(e) { console.error("Error al cargar estado del IoT", e); }

  // 2. Lógica para cuando tocas un interruptor
  document.querySelectorAll('.iot-toggle').forEach(toggle => {
    toggle.addEventListener('change', async (e) => {
      const isTurnedOn = e.target.checked;
      const deviceId = e.target.id;
      // Obtener el slider correspondiente para guardar su valor actual tambien
      const pureId = deviceId.split('-')[0];
      const slider = document.getElementById(pureId + '-pwm');
      const potenciaActual = slider ? parseInt(slider.value) : 0;
      
      console.log(`📡 Enviando orden: [${deviceId}] -> ${isTurnedOn ? 'ON' : 'OFF'}`);

      await fetch('/api/hardware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           id_dispositivo: deviceId,
           estado_encendido: isTurnedOn,
           poder_porcentaje: potenciaActual
        })
      });
    });
  });

  // 3. Lógica para potencias (Barras deslizantes)
  document.querySelectorAll('.iot-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const valueSpan = document.getElementById(e.target.id + '-value');
      if (valueSpan) valueSpan.textContent = e.target.value + '%';
    });
    
    // Al soltar el click del ratón (change) manda a guardar
    slider.addEventListener('change', async (e) => {
      const powerValue = parseInt(e.target.value);
      const pureId = e.target.id.split('-')[0]; // de "reactor-pwm" -> "reactor"
      const toggleId = pureId + '-toggle';
      const toggle = document.getElementById(toggleId);
      const isOn = toggle ? toggle.checked : false;

      console.log(`📡 Enviando orden de Potencia: [${pureId}] -> ${powerValue}%`);
      
      await fetch('/api/hardware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           id_dispositivo: toggleId,
           estado_encendido: isOn,
           poder_porcentaje: powerValue
        })
      });
    });
  });

  // Marcadores Visuales Diagnósticos Extras
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
