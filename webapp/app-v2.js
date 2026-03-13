  VOLTIOPR - LÓGICA DE APLICACIÓN DINÁMICA (VERSIÓN 2.0)
  ==============================================================
*/
console.log("🚀 VoltioPR App JS cargado - Versión 2.0");


document.addEventListener('DOMContentLoaded', async () => {
  const isLoginPage = document.getElementById('login-form') !== null;
  const isRegisterPage = document.getElementById('register-form') !== null;
  const isDashboardPage = document.getElementById('iot-controls-container') !== null;
  const isConfigPage = document.getElementById('config-form') !== null;
  const isResetPage = document.getElementById('reset-password-form') !== null;

  if (isLoginPage) setupLogin();
  if (isRegisterPage) setupRegister();
  if (isResetPage) setupResetPassword();
  if (isDashboardPage) {
    checkUserSession();
    setupDashboardCharts();
    setupHardwareControls();
  }
  if (isConfigPage) {
    checkUserSession();
    setupConfig();
  }
});

// ==============================================================
// 1. SEGURIDAD Y SESIÓN
// ==============================================================
function checkUserSession() {
  if (!localStorage.getItem('voltiopr_session')) {
    window.location.href = 'index.html';
  }
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('voltiopr_session');
        localStorage.removeItem('voltiopr_user');
        window.location.href = 'index.html';
    });
  }
}

// ==============================================================
// 2. PANTALLA DE LOGIN
// ==============================================================
function setupLogin() {
  const form = document.getElementById('login-form');
  const errorMsg = document.getElementById('error-message');
  
  // Mostrar banner de cookies si no existe consentimiento
  if (!localStorage.getItem('voltiopr_cookies_consent')) {
    showCookieBanner();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    errorMsg.classList.add('hidden');

    // Capturar metadata básica
    const metadata = {
      userAgent: navigator.userAgent,
      consentCookies: localStorage.getItem('voltiopr_cookies_consent') === 'true'
    };

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, metadata })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.redirect) {
          errorMsg.innerHTML = `${data.message} <a href="${data.redirect}" class="underline font-bold">Ir al Registro</a>`;
        } else {
          errorMsg.textContent = data.error;
        }
        errorMsg.classList.remove('hidden');
        return;
      }

      localStorage.setItem('voltiopr_session', data.token);
      localStorage.setItem('voltiopr_user', data.usuario);
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorMsg.textContent = "Error de conexión. Inténtalo de nuevo.";
      errorMsg.classList.remove('hidden');
    }
  });

  // Setup botón olvidar contraseña
  const btnForgot = document.getElementById('btn-forgot-password');
  if (btnForgot) {
    btnForgot.addEventListener('click', async () => {
      const email = document.getElementById('email').value;
      if (!email) {
        errorMsg.textContent = "Escribe tu correo primero para enviarte el código.";
        errorMsg.classList.remove('hidden');
        return;
      }
      
      btnForgot.disabled = true;
      btnForgot.textContent = "Enviando...";

      try {
        const response = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
           alert(data.mensaje);
           localStorage.setItem('reset_email_temp', email);
           window.location.href = 'reset-password.html';
        } else if (data.token_debug) {
           // Falló el envío pero tenemos el código (Modo Simulación Inteligente)
           alert(`MODO DE PRUEBA: El servicio de email aún no tiene permiso de tu dominio (DNS propagándose).\n\nTU CÓDIGO ES: ${data.token_debug}\n\nÚsalo en la siguiente pantalla.`);
           localStorage.setItem('reset_email_temp', email);
           window.location.href = 'reset-password.html';
        } else {
           errorMsg.textContent = data.error || "Error al solicitar el código.";
           errorMsg.classList.remove('hidden');
        }
      } catch (err) {
        errorMsg.textContent = "Error al conectar con el servicio de correo.";
        errorMsg.classList.remove('hidden');
      } finally {
        btnForgot.disabled = false;
        btnForgot.textContent = "¿Olvidaste tu contraseña?";
      }
    });
  }
}

// ==============================================================
// 2.5 RESTAURAR CONTRASEÑA
// ==============================================================
function setupResetPassword() {
  const form = document.getElementById('reset-password-form');
  const emailInput = document.getElementById('reset-email');
  const errorMsg = document.getElementById('reset-error-message');
  const successMsg = document.getElementById('reset-success-message');

  // Recuperar el email que guardamos en el paso anterior
  const savedEmail = localStorage.getItem('reset_email_temp');
  if (savedEmail) {
    emailInput.value = savedEmail;
  } else {
    window.location.href = 'index.html';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = document.getElementById('reset-token').value;
    const newPassword = document.getElementById('new-password').value;

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: savedEmail, token, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        successMsg.textContent = data.mensaje;
        successMsg.classList.remove('hidden');
        localStorage.removeItem('reset_email_temp');
        setTimeout(() => { window.location.href = 'index.html'; }, 3000);
      } else {
        errorMsg.textContent = data.error;
        errorMsg.classList.remove('hidden');
      }
    } catch (err) {
      errorMsg.textContent = "Error de conexión.";
      errorMsg.classList.remove('hidden');
    }
  });
}

function showCookieBanner() {
  const banner = document.createElement('div');
  banner.className = "fixed bottom-4 left-4 right-4 bg-slate-900 border border-volti-accent/30 p-4 rounded-2xl z-50 flex flex-col md:flex-row items-center justify-between gap-4 glass-panel";
  banner.innerHTML = `
    <div class="text-xs text-slate-300">
      <span class="font-bold text-volti-accent">Cookies:</span> Usamos cookies para mejorar tu experiencia y seguridad en VoltioPR.
    </div>
    <div class="flex gap-2">
      <button id="accept-cookies" class="bg-volti-accent text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest">Aceptar</button>
      <button id="decline-cookies" class="bg-white/5 text-white/50 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/10">Rechazar</button>
    </div>
  `;
  document.body.appendChild(banner);
  
  document.getElementById('accept-cookies').onclick = () => {
    localStorage.setItem('voltiopr_cookies_consent', 'true');
    banner.remove();
  };
  document.getElementById('decline-cookies').onclick = () => {
    localStorage.setItem('voltiopr_cookies_consent', 'false');
    banner.remove();
  };
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

    if (password !== passConfirm) {
      errorMsg.textContent = "Las contraseñas no coinciden.";
      errorMsg.classList.remove('hidden');
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      successMsg.textContent = data.mensaje;
      successMsg.classList.remove('hidden');
      setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    } catch (err) {
      errorMsg.textContent = err.message;
      errorMsg.classList.remove('hidden');
    }
  });
}

// ==============================================================
// 4. CONFIGURACIÓN DE PINES (Nueva funcionalidad)
// ==============================================================
async function setupConfig() {
  const form = document.getElementById('config-form');
  const listContainer = document.getElementById('pines-list');

  // Cargar lista inicial
  const loadPines = async () => {
    const res = await fetch('/api/config');
    const pines = await res.json();
    listContainer.innerHTML = pines.map(p => `
      <div class="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition">
        <div class="flex items-center gap-3">
            <div class="p-2 bg-volti-accent/10 rounded-lg text-volti-accent font-bold text-[10px] w-12 text-center border border-volti-accent/20">
                ${p.pin}
            </div>
            <div>
                <p class="font-bold text-xs">${p.nombre}</p>
                <p class="text-[9px] text-slate-400 uppercase tracking-wider">${p.tipo}</p>
            </div>
        </div>
        <button onclick="deletePin('${p.id}')" class="text-red-400/50 hover:text-red-400 p-2 transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
        </button>
      </div>
    `).join('');
  };

  window.deletePin = async (id) => {
    if (confirm('¿Eliminar esta configuración?')) {
        await fetch(`/api/config?id=${id}`, { method: 'DELETE' });
        loadPines();
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      nombre: document.getElementById('conf-nombre').value,
      id: document.getElementById('conf-id').value,
      pin: document.getElementById('conf-pin').value,
      tipo: document.getElementById('conf-tipo').value,
      descripcion: document.getElementById('conf-desc').value
    };

    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
        form.reset();
        loadPines();
    }
  });

  loadPines();
}

// ==============================================================
// 5. DASHBOARD DINÁMICO
// ==============================================================
async function setupHardwareControls() {
  const container = document.getElementById('iot-controls-container');
  
  try {
    // 1. Obtener la configuración
    const configRes = await fetch('/api/config');
    const config = await configRes.json();
    
    if (config.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-slate-500 text-xs italic">No hay dispositivos configurados. Ve a "Configurar ESP" para añadir uno.</div>`;
        return;
    }

    container.innerHTML = ''; // Limpiar cargando

    // 2. Renderizar cada dispositivo según su tipo
    config.forEach(dev => {
      const card = document.createElement('div');
      card.className = "p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2";
      
      let controlHtml = '';
      
      switch(dev.tipo) {
        case 'DIGITAL_OUT':
          controlHtml = `
            <div class="flex items-center justify-between">
              <span class="font-medium text-xs uppercase tracking-wide text-slate-300">${dev.nombre} (${dev.pin})</span>
              <div class="relative inline-block w-10 align-middle select-none">
                <input type="checkbox" id="${dev.id}-toggle" ${dev.valor_actual == '1' ? 'checked' : ''} class="iot-dynamic-toggle toggle-checkbox absolute block w-5 h-5 rounded-full bg-slate-700 border-4 border-slate-700 appearance-none cursor-pointer transition-all" data-id="${dev.id}" />
                <label for="${dev.id}-toggle" class="toggle-label block overflow-hidden h-5 rounded-full bg-slate-800 cursor-pointer"></label>
              </div>
            </div>
          `;
          break;
        case 'PWM':
          controlHtml = `
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                 <span class="font-medium text-xs uppercase tracking-wide text-slate-300">${dev.nombre}</span>
                 <span class="text-[10px] text-volti-accent px-1.5 py-0.5 bg-volti-accent/10 rounded border border-volti-accent/20">${dev.pin}</span>
              </div>
              <div class="flex items-center gap-4">
                <input type="range" class="iot-dynamic-slider flex-grow accent-volti-accent" min="0" max="100" value="${dev.valor_actual}" data-id="${dev.id}" />
                <span class="text-[10px] font-mono text-volti-accent w-8 text-right">${dev.valor_actual}%</span>
              </div>
            </div>
          `;
          break;
        case 'ANALOG_IN':
          controlHtml = `
            <div class="flex items-center justify-between">
              <span class="font-medium text-xs uppercase tracking-wide text-slate-300">${dev.nombre}</span>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-volti-accent">${dev.valor_actual} units</span>
                <span class="text-[9px] text-slate-500 bg-white/5 px-2 py-1 rounded">${dev.pin}</span>
              </div>
            </div>
          `;
          break;
        case 'SERIAL':
          controlHtml = `
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="font-medium text-xs uppercase tracking-wide text-slate-300">${dev.nombre}</span>
                <span class="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20 font-bold">SERIAL</span>
              </div>
              <div class="bg-black/40 p-2 rounded-lg border border-white/5 font-mono text-[10px] text-green-400 overflow-hidden h-12 flex flex-col-reverse">
                <div>> Esperando datos...</div>
                <div class="opacity-50">> Terminal serial lista (${dev.pin})</div>
              </div>
            </div>
          `;
          break;
        case 'I2S':
          controlHtml = `
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <span class="font-medium text-xs uppercase tracking-wide text-slate-300">${dev.nombre}</span>
                <span class="text-[9px] text-slate-500">Bus I2S • Data Stream</span>
              </div>
              <div class="flex gap-1 h-6 items-end">
                <div class="w-1 bg-volti-accent/40 animate-pulse h-2"></div>
                <div class="w-1 bg-volti-accent/60 animate-pulse h-4" style="animation-delay: 0.2s"></div>
                <div class="w-1 bg-volti-accent/80 animate-pulse h-5" style="animation-delay: 0.4s"></div>
                <div class="w-1 bg-volti-accent animate-pulse h-3" style="animation-delay: 0.1s"></div>
              </div>
            </div>
          `;
          break;
        default:
          controlHtml = `<div class="text-[10px] text-slate-500 p-2 border border-dashed border-white/10 rounded-lg text-center">${dev.nombre} [${dev.tipo}]</div>`;
      }
      
      card.innerHTML = controlHtml;
      container.appendChild(card);
    });

    // 3. Agregar Event Listeners Dinámicos
    setupDynamicListeners();

  } catch(e) {
    container.innerHTML = `<div class="text-red-400 text-xs p-4 text-center">Error al conectar con la base de datos IoT.</div>`;
  }
}

function setupDynamicListeners() {
    // Listeners para Toggles
    document.querySelectorAll('.iot-dynamic-toggle').forEach(el => {
        el.addEventListener('change', async (e) => {
            const id = e.target.dataset.id;
            const val = e.target.checked ? '1' : '0';
            console.log(`📡 Orden dinámica: ${id} -> ${val}`);
            await fetch('/api/hardware', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_dispositivo: id, estado_encendido: e.target.checked, valor: val })
            });
        });
    });

    // Listeners para Sliders
    document.querySelectorAll('.iot-dynamic-slider').forEach(el => {
        el.addEventListener('input', (e) => {
            const span = e.target.nextElementSibling;
            if(span) span.textContent = e.target.value + '%';
        });
        el.addEventListener('change', async (e) => {
            const id = e.target.dataset.id;
            const val = e.target.value;
            await fetch('/api/hardware', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_dispositivo: id, poder_porcentaje: parseInt(val), valor: val })
            });
        });
    });
}

// ==============================================================
// 6. GRÁFICAS (CHART.JS)
// ==============================================================
function setupDashboardCharts() {
  const ctxLoad = document.getElementById('loadChart')?.getContext('2d');
  if(!ctxLoad) return;
  
  new Chart(ctxLoad, {
    type: 'line',
    data: {
      labels: ['00', '10', '20', '30', '40', '50'],
      datasets: [{
        label: 'Consumo',
        data: [45, 52, 48, 61, 55, 63],
        borderColor: '#0db9f2',
        borderWidth: 2,
        fill: true,
        backgroundColor: 'rgba(13, 185, 242, 0.05)',
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.03)' } } }
    }
  });

  const ctxThermal = document.getElementById('thermalChart')?.getContext('2d');
  if(!ctxThermal) return;

  new Chart(ctxThermal, {
    type: 'bar',
    data: {
      labels: ['A', 'B', 'C', 'D'],
      datasets: [{
        data: [65, 78, 42, 55],
        backgroundColor: '#0db9f2',
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}
