

const CONFIG = {
  USERS: 'https://jsonplaceholder.typicode.com/users',
  PRODUCTS: 'https://fakestoreapi.com/products',
  PAY_ENDPOINT: 'https://jsonplaceholder.typicode.com/posts' // endpoint de prueba para POST
};

/* -------------------------
   Utilidades DOM
   ------------------------- */
const $ = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);

/* -------------------------
   Toast Notifications
   ------------------------- */
function showToast(msg, type = 'info') {
  const container = $('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* -------------------------
   Navegación lateral
   ------------------------- */
qsa('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    qsa('.panel').forEach(p => p.classList.remove('active'));
    $(target).classList.add('active');
  });
});

/* -------------------------
   Estado local / Observer
   ------------------------- */
let usersCache = [];
const listeners = [];
function subscribe(fn) { listeners.push(fn); }
function emit(event, payload) { listeners.forEach(fn => { try { fn(event, payload); } catch (e) { } }); }

/* -------------------------
   Cargar usuarios (jsonplaceholder)
   ------------------------- */
$('loadUsers').addEventListener('click', async () => {
  const c = $('usersContainer');
  c.innerHTML = '<div class="spinner"></div> Cargando usuarios...';
  try {
    const res = await fetch(CONFIG.USERS);
    const data = await res.json();
    usersCache = data; // guardar cache
    renderUsers(data);
  } catch (e) {
    c.innerHTML = 'Error cargando usuarios: ' + e.message;
    showToast('Error cargando usuarios', 'error');
  }
});

function renderUsers(list) {
  const c = $('usersContainer');
  c.innerHTML = '';
  if (!list.length) { c.innerHTML = '<div>No hay usuarios</div>'; return; }
  list.forEach(u => {
    const card = document.createElement('div');
    card.className = 'card-user';
    card.innerHTML = `
      <h3>${u.name}</h3>
      <p><strong>Usuario:</strong> ${u.username}</p>
      <p><strong>Email:</strong> ${u.email}</p>
      <p><strong>Ciudad:</strong> ${u.address?.city || ''}</p>
      <div>
        <button class="small-btn" data-id="${u.id}" data-action="invoice">Facturar</button>
        <button class="small-btn" data-id="${u.id}" data-action="pay">Pagar</button>
        <button class="small-btn" data-id="${u.id}" data-action="notify">Notificar</button>
      </div>
    `;
    c.appendChild(card);
  });

  // delegación de eventos para botones dentro de cards
  c.querySelectorAll('.small-btn').forEach(b => {
    b.addEventListener('click', async (ev) => {
      const id = b.dataset.id;
      const action = b.dataset.action;
      const user = usersCache.find(x => String(x.id) === String(id));
      if (action === 'invoice') await createInvoiceForUser(user);
      if (action === 'pay') await processPaymentForUser(user);
      if (action === 'notify') await notifyUser(user);
    });
  });
}

/* -------------------------
   Facturación (FakeStore) - 
   ------------------------- */
$('loadProducts').addEventListener('click', async () => {
  const wrap = $('invoicesContainer');
  wrap.innerHTML = '<div class="spinner"></div> Cargando productos...';
  try {
    const res = await fetch(CONFIG.PRODUCTS);
    const data = await res.json();
    // Generar tabla de productos (se usan como items para facturas)
    const cols = ['ID', 'Título', 'Precio', 'Categoría'];
    let html = `<div class="table-wrap"><table class="table"><thead><tr>`;
    cols.forEach(h => html += `<th>${h}</th>`);
    html += `</tr></thead><tbody>`;
    data.forEach(p => {
      html += `<tr>
        <td>${p.id}</td>
        <td>${p.title}</td>
        <td>$${p.price}</td>
        <td>${p.category}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    wrap.innerHTML = html;
  } catch (e) {
    wrap.innerHTML = 'Error cargando productos: ' + e.message;
    showToast('Error cargando productos', 'error');
  }
});

/* -------------------------
   Pagos (simulado con POST)
   ------------------------- */
$('processPayment').addEventListener('click', async () => {
  const amount = Number($('payAmount').value || 0);
  const method = $('payMethod').value;

  if (amount <= 0) {
    showToast('El monto debe ser mayor a 0', 'error');
    return;
  }

  await processPayment({ amount, method, source: 'dashboard_manual' });
});

async function processPaymentForUser(user) {
  // ejemplo: pagar monto aleatorio
  const amount = Math.floor(Math.random() * 200) + 20;
  await processPayment({ amount, method: 'card', user });
}

async function processPayment(payload) {
  const log = $('paymentsLog');
  const entry = { time: new Date().toISOString(), payload };
  log.innerHTML = `Procesando pago...`;
  try {
    const res = await fetch(CONFIG.PAY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    const msg = `Pago simulado OK — id: ${data.id ?? '(simulado)'} — monto: ${payload.amount}`;
    log.innerHTML = `<div>${msg}</div>` + log.innerHTML;
    emit('payment_success', { payload, response: data });
    showToast('Pago realizado con éxito', 'success');
    return data;
  } catch (e) {
    log.innerHTML = `<div>Error procesando pago: ${e.message}</div>` + log.innerHTML;
    emit('payment_error', { error: e.message });
    showToast('Error al procesar pago', 'error');
    throw e;
  }
}

/* -------------------------
   Notificaciones (local observer)
   ------------------------- */
$('subscribeNotif').addEventListener('click', () => {
  subscribe((ev, payload) => {
    const el = $('notifLog');
    const line = `<div><strong>[${new Date().toLocaleTimeString()}] ${ev}</strong> — ${JSON.stringify(payload)}</div>`;
    el.innerHTML = line + el.innerHTML;
  });
  alert('Suscrito a notificaciones locales');
});

$('emitNotif').addEventListener('click', async () => {
  const sample = { msg: 'Notificación manual desde dashboard', when: new Date().toISOString() };
  await sendNotification(sample);
});

async function notifyUser(user) {
  const payload = { to: user.email, userId: user.id, when: new Date().toISOString() };
  await sendNotification(payload);
}

async function sendNotification(payload) {
  try {

    const res = await fetch(CONFIG.PAY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    emit('notification_sent', { payload, response: data });
    showToast('Notificación enviada', 'success');
    return data;
  } catch (e) {
    emit('notification_error', { error: e.message });
    showToast('Error enviando notificación', 'error');
    throw e;
  }
}

/* -------------------------
   Buscador simple (por nombre)
   ------------------------- */
$('btnSearch').addEventListener('click', () => {
  const q = $('searchInput').value.trim().toLowerCase();
  if (!q) { renderUsers(usersCache); return; }
  const matches = usersCache.filter(u => (u.name || '').toLowerCase().includes(q));
  renderUsers(matches);
});

/* -------------------------
   Refrescar todo
   ------------------------- */
$('btnRefresh').addEventListener('click', () => {

  if (usersCache.length) renderUsers(usersCache);

  $('paymentsLog').innerHTML = '';
  $('notifLog').innerHTML = '';
});

/* -------------------------
   Inicialización mínima: opción de precargar usuarios
   ------------------------- */
(async function init() {

  try {
    const res = await fetch(CONFIG.USERS);
    usersCache = await res.json();
    renderUsers(usersCache.slice(0, 8));
  } catch (e) {
    console.warn('No se pudieron precargar usuarios:', e.message);
  }
})();
