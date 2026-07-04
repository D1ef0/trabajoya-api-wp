const STORAGE_KEY = 'trabajoya_admin_token';

const state = {
  view: 'overview',
  sessionsPage: 1,
  messagesPage: 1,
  webhooksPage: 1,
  user: null,
};

const els = {
  loginScreen: document.getElementById('login-screen'),
  app: document.getElementById('app'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  loginBtn: document.getElementById('login-btn'),
  loginError: document.getElementById('login-error'),
  logoutBtn: document.getElementById('logout-btn'),
  userLabel: document.getElementById('user-label'),
  refreshBtn: document.getElementById('refresh-btn'),
  viewTitle: document.getElementById('view-title'),
  viewSubtitle: document.getElementById('view-subtitle'),
  statsGrid: document.getElementById('stats-grid'),
  sessionsTable: document.getElementById('sessions-table'),
  sessionsPagination: document.getElementById('sessions-pagination'),
  sessionsSearch: document.getElementById('sessions-search'),
  sessionsStatus: document.getElementById('sessions-status'),
  messagesTable: document.getElementById('messages-table'),
  messagesPagination: document.getElementById('messages-pagination'),
  messagesSearch: document.getElementById('messages-search'),
  messagesDirection: document.getElementById('messages-direction'),
  funnelChart: document.getElementById('funnel-chart'),
  funnelTable: document.getElementById('funnel-table'),
  webhooksTable: document.getElementById('webhooks-table'),
  webhooksPagination: document.getElementById('webhooks-pagination'),
  sessionDialog: document.getElementById('session-dialog'),
  dialogTitle: document.getElementById('dialog-title'),
  dialogMeta: document.getElementById('dialog-meta'),
  dialogContext: document.getElementById('dialog-context'),
  dialogThread: document.getElementById('dialog-thread'),
  dialogClose: document.getElementById('dialog-close'),
};

function getToken() {
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

function setToken(token) {
  localStorage.setItem(STORAGE_KEY, token);
}

function clearToken() {
  localStorage.removeItem(STORAGE_KEY);
}

async function api(path, options = {}) {
  const headers = {
    ...(options.headers ?? {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/admin/api${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    state.user = null;
    showLogin('Sesión expirada. Ingresa de nuevo.');
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json();
}

function showLogin(message = '') {
  els.app.classList.add('hidden');
  els.loginScreen.classList.remove('hidden');
  els.loginError.textContent = message;
  els.loginError.classList.toggle('hidden', !message);
}

function showApp() {
  els.loginScreen.classList.add('hidden');
  els.app.classList.remove('hidden');
  els.userLabel.textContent = state.user
    ? `${state.user.name ?? state.user.username}`
    : '';
}

async function login() {
  const username = els.username.value.trim();
  const password = els.password.value;

  if (!username || !password) {
    showLogin('Usuario y contraseña requeridos');
    return;
  }

  const response = await fetch('/admin/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    showLogin('Usuario o contraseña incorrectos');
    throw new Error('Login failed');
  }

  const data = await response.json();
  setToken(data.accessToken);
  state.user = data.user;
  showApp();
  switchView('overview');
}

function formatDate(value) {
  return new Date(value).toLocaleString('es-SV', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function badge(status) {
  return `<span class="badge ${status}">${status}</span>`;
}

function renderPagination(container, page, totalPages, onChange) {
  container.innerHTML = '';

  const prev = document.createElement('button');
  prev.textContent = 'Anterior';
  prev.disabled = page <= 1;
  prev.onclick = () => onChange(page - 1);

  const label = document.createElement('span');
  label.textContent = `Página ${page} de ${totalPages}`;
  label.style.color = 'var(--muted)';

  const next = document.createElement('button');
  next.textContent = 'Siguiente';
  next.disabled = page >= totalPages;
  next.onclick = () => onChange(page + 1);

  container.append(prev, label, next);
}

async function loadOverview() {
  const stats = await api('/stats');
  els.statsGrid.innerHTML = [
    ['Sesiones totales', stats.sessionsTotal],
    ['Sesiones activas', stats.sessionsActive],
    ['En handoff', stats.sessionsHandoff],
    ['Mensajes totales', stats.messagesTotal],
    ['Mensajes hoy', stats.messagesToday],
    ['Webhooks hoy', stats.webhooksToday],
  ]
    .map(
      ([label, value]) => `
      <article class="stat-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>`,
    )
    .join('');
}

async function loadSessions() {
  const params = new URLSearchParams({
    page: String(state.sessionsPage),
    limit: '20',
  });

  if (els.sessionsSearch.value.trim()) {
    params.set('search', els.sessionsSearch.value.trim());
  }
  if (els.sessionsStatus.value) {
    params.set('status', els.sessionsStatus.value);
  }

  const result = await api(`/sessions?${params}`);
  els.sessionsTable.innerHTML = result.data
    .map(
      (session) => `
      <tr data-wa="${encodeURIComponent(session.waNumber)}">
        <td>${session.waNumber}</td>
        <td><code>${session.currentStep}</code></td>
        <td>${badge(session.status)}</td>
        <td>${session.messageCount}</td>
        <td>${formatDate(session.lastMessageAt)}</td>
      </tr>`,
    )
    .join('');

  els.sessionsTable.querySelectorAll('tr').forEach((row) => {
    row.addEventListener('click', () =>
      openSession(row.dataset.wa ?? ''),
    );
  });

  renderPagination(
    els.sessionsPagination,
    result.meta.page,
    result.meta.totalPages,
    (page) => {
      state.sessionsPage = page;
      loadSessions();
    },
  );
}

async function openSession(waNumberEncoded) {
  const waNumber = decodeURIComponent(waNumberEncoded);
  const session = await api(`/sessions/${encodeURIComponent(waNumber)}`);

  els.dialogTitle.textContent = session.waNumber;
  els.dialogMeta.textContent = `${session.currentStep} · ${session.status} · ${session.messages.length} mensajes`;
  els.dialogContext.textContent = JSON.stringify(session.context, null, 2);
  els.dialogThread.innerHTML = session.messages
    .map(
      (message) => `
      <div class="bubble ${message.direction}">
        ${message.preview}
        <small>${message.direction} · ${message.type} · ${formatDate(message.createdAt)}</small>
      </div>`,
    )
    .join('');

  els.sessionDialog.showModal();
}

async function loadMessages() {
  const params = new URLSearchParams({
    page: String(state.messagesPage),
    limit: '30',
  });

  if (els.messagesSearch.value.trim()) {
    params.set('search', els.messagesSearch.value.trim());
  }
  if (els.messagesDirection.value) {
    params.set('direction', els.messagesDirection.value);
  }

  const result = await api(`/messages?${params}`);
  els.messagesTable.innerHTML = result.data
    .map(
      (message) => `
      <tr>
        <td>${formatDate(message.createdAt)}</td>
        <td>${message.waNumber}</td>
        <td>${message.direction}</td>
        <td>${message.type}</td>
        <td>${message.preview}</td>
      </tr>`,
    )
    .join('');

  renderPagination(
    els.messagesPagination,
    result.meta.page,
    result.meta.totalPages,
    (page) => {
      state.messagesPage = page;
      loadMessages();
    },
  );
}

async function loadFunnel() {
  const funnel = await api('/analytics/funnel');
  const max = Math.max(...funnel.byStep.map((row) => row.count), 1);

  els.funnelChart.innerHTML = funnel.byStep
    .map(
      (row) => `
      <div class="funnel-row">
        <code>${row.step}</code>
        <div class="funnel-bar"><span style="width:${(row.count / max) * 100}%"></span></div>
        <strong>${row.count}</strong>
      </div>`,
    )
    .join('');

  els.funnelTable.innerHTML = funnel.byStepAndStatus
    .map(
      (row) => `
      <tr>
        <td><code>${row.step}</code></td>
        <td>${badge(row.status)}</td>
        <td>${row.count}</td>
      </tr>`,
    )
    .join('');
}

async function loadWebhooks() {
  const result = await api(
    `/webhook-events?page=${state.webhooksPage}&limit=30`,
  );

  els.webhooksTable.innerHTML = result.data
    .map(
      (event) => `
      <tr>
        <td><code>${event.waMessageId}</code></td>
        <td>${formatDate(event.processedAt)}</td>
      </tr>`,
    )
    .join('');

  renderPagination(
    els.webhooksPagination,
    result.meta.page,
    result.meta.totalPages,
    (page) => {
      state.webhooksPage = page;
      loadWebhooks();
    },
  );
}

const viewMeta = {
  overview: ['Resumen', 'Métricas en tiempo real'],
  sessions: ['Conversaciones', 'Sesiones activas y recientes'],
  messages: ['Mensajes', 'Log completo inbound/outbound'],
  funnel: ['Embudo', 'Distribución por paso del flujo'],
  webhooks: ['Webhooks', 'Eventos procesados (idempotencia)'],
};

async function loadCurrentView() {
  const [title, subtitle] = viewMeta[state.view];
  els.viewTitle.textContent = title;
  els.viewSubtitle.textContent = subtitle;

  if (state.view === 'overview') await loadOverview();
  if (state.view === 'sessions') await loadSessions();
  if (state.view === 'messages') await loadMessages();
  if (state.view === 'funnel') await loadFunnel();
  if (state.view === 'webhooks') await loadWebhooks();
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('hidden', section.id !== `view-${view}`);
  });
  loadCurrentView().catch(console.error);
}

async function bootstrap() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view ?? 'overview'));
  });

  els.loginBtn.addEventListener('click', () => {
    login().catch(() => {});
  });

  els.password.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') els.loginBtn.click();
  });

  els.logoutBtn.addEventListener('click', () => {
    clearToken();
    state.user = null;
    showLogin();
  });

  els.refreshBtn.addEventListener('click', () => {
    loadCurrentView().catch(console.error);
  });

  els.dialogClose.addEventListener('click', () => els.sessionDialog.close());

  let searchTimer;
  const debouncedSessions = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.sessionsPage = 1;
      loadSessions().catch(console.error);
    }, 300);
  };

  els.sessionsSearch.addEventListener('input', debouncedSessions);
  els.sessionsStatus.addEventListener('change', debouncedSessions);
  els.messagesSearch.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.messagesPage = 1;
      loadMessages().catch(console.error);
    }, 300);
  });
  els.messagesDirection.addEventListener('change', () => {
    state.messagesPage = 1;
    loadMessages().catch(console.error);
  });

  if (getToken()) {
    try {
      state.user = await api('/auth/me');
      showApp();
      switchView('overview');
      return;
    } catch {
      /* fall through to login */
    }
  }

  showLogin();
}

bootstrap();
