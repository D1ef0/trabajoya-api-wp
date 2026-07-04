const STORAGE_KEY = 'trabajoya_admin_token';

const state = {
  view: 'overview',
  sessionsPage: 1,
  messagesPage: 1,
  webhooksPage: 1,
  requestsPage: 1,
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
  requestsTable: document.getElementById('requests-table'),
  requestsPagination: document.getElementById('requests-pagination'),
  requestsPath: document.getElementById('requests-path'),
  requestsMethod: document.getElementById('requests-method'),
  requestsStatus: document.getElementById('requests-status'),
  requestDialog: document.getElementById('request-dialog'),
  requestDialogTitle: document.getElementById('request-dialog-title'),
  requestDialogMeta: document.getElementById('request-dialog-meta'),
  requestDialogBody: document.getElementById('request-dialog-body'),
  requestDialogClose: document.getElementById('request-dialog-close'),
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

function statusBadge(code) {
  if (code === null || code === undefined) {
    return '<span class="badge idle">—</span>';
  }

  let cls = 'idle';
  if (code >= 500) cls = 'error';
  else if (code >= 400) cls = 'warning';
  else if (code >= 200) cls = 'active';

  return `<span class="badge ${cls}">${code}</span>`;
}

function methodBadge(method) {
  return `<span class="method-badge method-${method.toLowerCase()}">${method}</span>`;
}

function truncate(value, max = 80) {
  if (!value) return '—';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDuration(ms) {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatJson(value) {
  if (value === null || value === undefined || value === '') {
    return '(vacío)';
  }

  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
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
    ['Requests totales', stats.requestCapturesTotal],
    ['Requests hoy', stats.requestCapturesToday],
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

async function loadRequests() {
  const params = new URLSearchParams({
    page: String(state.requestsPage),
    limit: '30',
  });

  if (els.requestsPath.value.trim()) {
    params.set('path', els.requestsPath.value.trim());
  }
  if (els.requestsMethod.value) {
    params.set('method', els.requestsMethod.value);
  }
  if (els.requestsStatus.value) {
    params.set('statusCode', els.requestsStatus.value);
  }

  const result = await api(`/request-captures?${params}`);
  els.requestsTable.innerHTML = result.data
    .map(
      (capture) => `
      <tr data-id="${capture.id}">
        <td>${formatDate(capture.createdAt)}</td>
        <td>${methodBadge(capture.method)}</td>
        <td><code>${escapeHtml(truncate(capture.path, 60))}</code></td>
        <td>${statusBadge(capture.statusCode)}</td>
        <td>${formatDuration(capture.durationMs)}</td>
        <td>${capture.ip ?? '—'}</td>
      </tr>`,
    )
    .join('');

  els.requestsTable.querySelectorAll('tr').forEach((row) => {
    row.addEventListener('click', () =>
      openRequestCapture(row.dataset.id ?? ''),
    );
  });

  renderPagination(
    els.requestsPagination,
    result.meta.page,
    result.meta.totalPages,
    (page) => {
      state.requestsPage = page;
      loadRequests();
    },
  );
}

async function openRequestCapture(id) {
  const capture = await api(`/request-captures/${id}`);
  const query = capture.queryString ? `?${capture.queryString}` : '';

  els.requestDialogTitle.textContent = `${capture.method} ${capture.path}`;
  els.requestDialogMeta.textContent = [
    formatDate(capture.createdAt),
    capture.statusCode ? `HTTP ${capture.statusCode}` : null,
    capture.durationMs !== null ? formatDuration(capture.durationMs) : null,
    capture.ip,
    capture.userAgent,
  ]
    .filter(Boolean)
    .join(' · ');

  els.requestDialogBody.innerHTML = `
    <section class="detail-block">
      <h4>URL</h4>
      <pre class="context-box">${escapeHtml(`${capture.method} ${capture.path}${query}`)}</pre>
    </section>
    <section class="detail-block">
      <h4>Headers</h4>
      <pre class="context-box">${escapeHtml(formatJson(capture.headers))}</pre>
    </section>
    <section class="detail-block">
      <h4>Body</h4>
      <pre class="context-box">${escapeHtml(formatJson(capture.body))}</pre>
    </section>`;

  els.requestDialog.showModal();
}

const viewMeta = {
  overview: ['Resumen', 'Métricas en tiempo real'],
  sessions: ['Conversaciones', 'Sesiones activas y recientes'],
  messages: ['Mensajes', 'Log completo inbound/outbound'],
  funnel: ['Embudo', 'Distribución por paso del flujo'],
  webhooks: ['Webhooks', 'Eventos procesados (idempotencia)'],
  requests: ['Requests', 'Log de requests HTTP entrantes'],
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
  if (state.view === 'requests') await loadRequests();
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
  els.requestDialogClose.addEventListener('click', () =>
    els.requestDialog.close(),
  );

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

  const debouncedRequests = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.requestsPage = 1;
      loadRequests().catch(console.error);
    }, 300);
  };

  els.requestsPath.addEventListener('input', debouncedRequests);
  els.requestsMethod.addEventListener('change', () => {
    state.requestsPage = 1;
    loadRequests().catch(console.error);
  });
  els.requestsStatus.addEventListener('change', () => {
    state.requestsPage = 1;
    loadRequests().catch(console.error);
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
