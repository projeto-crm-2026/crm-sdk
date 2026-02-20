const version = '0.1.0';

const DEFAULT_API_URL = 'https://api.crm.exemplo.com';
class ApiClient {
    constructor(baseUrl = DEFAULT_API_URL) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    setToken(token) {
        this.token = token;
    }
    async request(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
            throw new Error(`[crm-sdk] HTTP ${res.status} ${res.statusText} — ${method} ${path}`);
        }
        return res.json();
    }
    /** POST /widget/init — exchange workspaceId + optional visitorId for a session token. */
    async init(workspaceId, visitorId) {
        return this.request('POST', '/widget/init', { workspaceId, visitorId });
    }
    /** POST /widget/chat — create a new chat thread. */
    async createChat(workspaceId, visitorId) {
        return this.request('POST', '/widget/chat', { workspaceId, visitorId });
    }
    /** POST /widget/chat/{chatId}/messages — send a visitor message. */
    async sendMessage(chatId, content) {
        return this.request('POST', `/widget/chat/${chatId}/messages`, { content });
    }
    /** GET /widget/chat/{chatId}/messages — fetch message history. */
    async getMessages(chatId) {
        return this.request('GET', `/widget/chat/${chatId}/messages`);
    }
}

const SESSION_KEY = 'crm_visitor_session';
/** Load a previously saved visitor session from localStorage. */
function loadSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch (_a) {
        return null;
    }
}
/** Persist a visitor session to localStorage. */
function saveSession(session) {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    catch (_a) {
        // Ignore storage errors (e.g. private mode quota exceeded).
    }
}

/** All widget CSS injected into the Shadow DOM. */
const WIDGET_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

  :host {
    --crm-blue-400: #60a5fa;
    --crm-blue-600: #2563eb;
    --crm-black: #000000;
    --crm-white: #ffffff;
    --crm-gray-50: #f9fafb;
    --crm-gray-100: #f3f4f6;
    --crm-gray-200: #e5e7eb;
    --crm-gray-500: #6b7280;
    --crm-gray-800: #1f2937;
    --crm-radius: 16px;
    --crm-font: 'TASA Orbiter', 'Inter', system-ui, -apple-system, sans-serif;
    --crm-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10);
    all: initial;
    display: block;
    font-family: var(--crm-font);
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  /* ── Launcher button ───────────────────────────────────────────── */
  .crm-launcher {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483646;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--crm-blue-600);
    color: var(--crm-white);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--crm-shadow);
    transition: transform 0.2s ease, background 0.2s ease;
    outline: none;
  }

  .crm-launcher:hover {
    background: var(--crm-blue-400);
    transform: scale(1.08);
  }

  .crm-launcher:active {
    transform: scale(0.96);
  }

  .crm-launcher svg {
    width: 28px;
    height: 28px;
    pointer-events: none;
  }

  /* Unread badge */
  .crm-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #ef4444;
    color: var(--crm-white);
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    border: 2px solid var(--crm-white);
    transition: opacity 0.2s;
  }

  .crm-badge[hidden] { display: none; }

  /* ── Chat window ────────────────────────────────────────────────── */
  .crm-window {
    position: fixed;
    bottom: 92px;
    right: 24px;
    z-index: 2147483645;
    width: 360px;
    max-width: calc(100vw - 32px);
    height: 520px;
    max-height: calc(100vh - 120px);
    background: var(--crm-white);
    border-radius: var(--crm-radius);
    box-shadow: var(--crm-shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform-origin: bottom right;
    transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
  }

  .crm-window.crm-hidden {
    transform: scale(0.85) translateY(16px);
    opacity: 0;
    pointer-events: none;
  }

  /* ── Header ─────────────────────────────────────────────────────── */
  .crm-header {
    background: var(--crm-blue-600);
    color: var(--crm-white);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    user-select: none;
  }

  .crm-header-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--crm-blue-400);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .crm-header-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .crm-header-avatar svg {
    width: 20px;
    height: 20px;
    color: var(--crm-white);
  }

  .crm-header-info {
    flex: 1;
    min-width: 0;
  }

  .crm-header-name {
    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .crm-header-status {
    font-size: 12px;
    opacity: 0.85;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .crm-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4ade80;
    display: inline-block;
  }

  .crm-close-btn {
    background: transparent;
    border: none;
    color: var(--crm-white);
    cursor: pointer;
    padding: 4px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.85;
    transition: opacity 0.15s, background 0.15s;
    flex-shrink: 0;
  }

  .crm-close-btn:hover {
    opacity: 1;
    background: rgba(255,255,255,0.15);
  }

  .crm-close-btn svg {
    width: 20px;
    height: 20px;
  }

  /* ── Messages area ──────────────────────────────────────────────── */
  .crm-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--crm-gray-50);
    scroll-behavior: smooth;
  }

  .crm-messages::-webkit-scrollbar {
    width: 4px;
  }

  .crm-messages::-webkit-scrollbar-track {
    background: transparent;
  }

  .crm-messages::-webkit-scrollbar-thumb {
    background: var(--crm-gray-200);
    border-radius: 4px;
  }

  /* ── Message bubble ─────────────────────────────────────────────── */
  .crm-msg {
    display: flex;
    flex-direction: column;
    max-width: 80%;
    animation: crm-msg-in 0.2s ease;
  }

  @keyframes crm-msg-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .crm-msg--agent {
    align-self: flex-start;
  }

  .crm-msg--visitor {
    align-self: flex-end;
  }

  .crm-msg__bubble {
    padding: 9px 13px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.5;
    word-break: break-word;
  }

  .crm-msg--agent .crm-msg__bubble {
    background: var(--crm-white);
    color: var(--crm-gray-800);
    border-bottom-left-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .crm-msg--visitor .crm-msg__bubble {
    background: var(--crm-blue-600);
    color: var(--crm-white);
    border-bottom-right-radius: 4px;
  }

  .crm-msg__time {
    font-size: 10px;
    color: var(--crm-gray-500);
    margin-top: 3px;
    padding: 0 4px;
  }

  .crm-msg--visitor .crm-msg__time {
    align-self: flex-end;
  }

  /* ── Typing indicator ───────────────────────────────────────────── */
  .crm-typing {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: var(--crm-white);
    border-radius: 16px;
    border-bottom-left-radius: 4px;
    align-self: flex-start;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .crm-typing span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--crm-blue-400);
    animation: crm-bounce 1.2s infinite;
  }

  .crm-typing span:nth-child(2) { animation-delay: 0.2s; }
  .crm-typing span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes crm-bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30%           { transform: translateY(-5px); }
  }

  .crm-typing[hidden] { display: none; }

  /* ── Empty state ────────────────────────────────────────────────── */
  .crm-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--crm-gray-500);
    font-size: 14px;
    text-align: center;
    padding: 24px;
  }

  .crm-empty svg {
    width: 48px;
    height: 48px;
    opacity: 0.35;
  }

  /* ── Input area ─────────────────────────────────────────────────── */
  .crm-footer {
    padding: 12px;
    background: var(--crm-white);
    border-top: 1px solid var(--crm-gray-100);
    display: flex;
    gap: 8px;
    align-items: flex-end;
    flex-shrink: 0;
  }

  .crm-input {
    flex: 1;
    min-height: 38px;
    max-height: 100px;
    padding: 9px 12px;
    border: 1.5px solid var(--crm-gray-200);
    border-radius: 20px;
    font-family: var(--crm-font);
    font-size: 14px;
    color: var(--crm-gray-800);
    background: var(--crm-gray-50);
    resize: none;
    outline: none;
    transition: border-color 0.15s;
    line-height: 1.4;
    overflow-y: auto;
  }

  .crm-input:focus {
    border-color: var(--crm-blue-400);
    background: var(--crm-white);
  }

  .crm-input::placeholder {
    color: var(--crm-gray-500);
  }

  .crm-send-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--crm-blue-600);
    color: var(--crm-white);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s, transform 0.1s;
    outline: none;
  }

  .crm-send-btn:hover {
    background: var(--crm-blue-400);
  }

  .crm-send-btn:active {
    transform: scale(0.92);
  }

  .crm-send-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  .crm-send-btn svg {
    width: 18px;
    height: 18px;
  }

  /* ── Error banner ───────────────────────────────────────────────── */
  .crm-error {
    padding: 8px 14px;
    background: #fef2f2;
    color: #991b1b;
    font-size: 12px;
    border-top: 1px solid #fecaca;
    text-align: center;
    flex-shrink: 0;
  }

  .crm-error[hidden] { display: none; }

  /* ── Loading skeleton ───────────────────────────────────────────── */
  .crm-loading {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    flex: 1;
    background: var(--crm-gray-50);
  }

  .crm-skeleton {
    height: 36px;
    border-radius: 16px;
    background: linear-gradient(90deg, var(--crm-gray-100) 25%, var(--crm-gray-200) 50%, var(--crm-gray-100) 75%);
    background-size: 200% 100%;
    animation: crm-shimmer 1.4s infinite;
  }

  .crm-skeleton--short { width: 55%; }
  .crm-skeleton--long  { width: 80%; align-self: flex-end; }

  @keyframes crm-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .crm-loading[hidden] { display: none; }

  /* ── Responsive ─────────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .crm-window {
      bottom: 0;
      right: 0;
      width: 100vw;
      max-width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      border-radius: 0;
    }

    .crm-launcher {
      bottom: 16px;
      right: 16px;
    }
  }
`;

const RECONNECT_DELAY_MS = 3000;
class WsClient {
    constructor(url, onMessage) {
        this.url = url;
        this.onMessage = onMessage;
        this.ws = null;
        this.reconnectTimer = null;
        this.closed = false;
    }
    connect() {
        if (this.closed)
            return;
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }
        try {
            this.ws = new WebSocket(this.url);
            this.ws.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.onMessage(data);
                }
                catch (_a) {
                    // Ignore malformed frames.
                }
            });
            this.ws.addEventListener('close', () => {
                if (!this.closed) {
                    this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
                }
            });
            this.ws.addEventListener('error', () => {
                // Let the 'close' event handle reconnection.
            });
        }
        catch (_a) {
            // WebSocket constructor can throw in some environments.
        }
    }
    disconnect() {
        this.closed = true;
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// SVG icons ─────────────────────────────────────────────────────────────────
const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
</svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
  <line x1="18" y1="6" x2="6" y2="18"/>
  <line x1="6" y1="6" x2="18" y2="18"/>
</svg>`;
const ICON_SEND = `<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
</svg>`;
const ICON_AGENT = `<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
</svg>`;
const ICON_EMPTY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
</svg>`;
// Helpers ────────────────────────────────────────────────────────────────────
function formatTime(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    catch (_a) {
        return '';
    }
}
function el(tag, attrs = {}, html) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        e.setAttribute(k, v);
    }
    if (html !== undefined)
        e.innerHTML = html;
    return e;
}
// Widget ─────────────────────────────────────────────────────────────────────
class Widget {
    constructor(config) {
        this.ws = null;
        this.session = null;
        this.isOpen = false;
        this.unread = 0;
        this.config = Object.assign({ apiUrl: 'https://api.crm.exemplo.com', wsUrl: '' }, config);
        this.api = new ApiClient(this.config.apiUrl);
    }
    mount() {
        this.buildDOM();
        document.body.appendChild(this.host);
        this.initialize().catch(() => {
            this.showError('Could not connect to support. Please try again later.');
        });
    }
    // ── DOM construction ───────────────────────────────────────────────────────
    buildDOM() {
        this.host = el('div', { id: 'crm-widget-host' });
        this.shadow = this.host.attachShadow({ mode: 'open' });
        // Styles
        const style = el('style', {}, WIDGET_STYLES);
        this.shadow.appendChild(style);
        // Launcher button
        this.launcher = el('button', { class: 'crm-launcher', 'aria-label': 'Open chat', type: 'button' });
        this.launcher.innerHTML = ICON_CHAT;
        this.badge = el('span', { class: 'crm-badge', hidden: '', 'aria-label': 'Unread messages' }, '0');
        this.launcher.appendChild(this.badge);
        this.launcher.addEventListener('click', () => this.toggle());
        this.shadow.appendChild(this.launcher);
        // Chat window
        this.chatWindow = el('div', { class: 'crm-window crm-hidden', role: 'dialog', 'aria-label': 'Chat' });
        // Header
        const header = el('div', { class: 'crm-header' });
        const avatarEl = el('div', { class: 'crm-header-avatar' }, ICON_AGENT);
        const infoEl = el('div', { class: 'crm-header-info' });
        const nameEl = el('div', { class: 'crm-header-name' }, 'Support');
        const statusEl = el('div', { class: 'crm-header-status' });
        statusEl.innerHTML = `<span class="crm-status-dot"></span> Online`;
        infoEl.appendChild(nameEl);
        infoEl.appendChild(statusEl);
        const closeBtn = el('button', { class: 'crm-close-btn', 'aria-label': 'Close chat', type: 'button' });
        closeBtn.innerHTML = ICON_CLOSE;
        closeBtn.addEventListener('click', () => this.close());
        header.appendChild(avatarEl);
        header.appendChild(infoEl);
        header.appendChild(closeBtn);
        this.chatWindow.appendChild(header);
        // Loading skeleton
        this.loadingEl = el('div', { class: 'crm-loading' });
        this.loadingEl.innerHTML = `
      <div class="crm-skeleton crm-skeleton--short"></div>
      <div class="crm-skeleton crm-skeleton--long"></div>
      <div class="crm-skeleton crm-skeleton--short"></div>
    `;
        this.chatWindow.appendChild(this.loadingEl);
        // Messages
        this.messagesEl = el('div', { class: 'crm-messages', role: 'log', 'aria-live': 'polite' });
        this.messagesEl.setAttribute('hidden', '');
        this.chatWindow.appendChild(this.messagesEl);
        // Typing indicator (appended inside messages when needed)
        this.typingEl = el('div', { class: 'crm-typing', hidden: '' });
        this.typingEl.innerHTML = '<span></span><span></span><span></span>';
        // Error banner
        this.errorEl = el('div', { class: 'crm-error', role: 'alert', hidden: '' });
        this.chatWindow.appendChild(this.errorEl);
        // Footer / input
        const footer = el('div', { class: 'crm-footer' });
        this.inputEl = el('textarea', {
            class: 'crm-input',
            placeholder: 'Type a message…',
            rows: '1',
            'aria-label': 'Message',
        });
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
        this.inputEl.addEventListener('input', () => this.autoResize());
        this.sendBtn = el('button', { class: 'crm-send-btn', type: 'button', 'aria-label': 'Send' });
        this.sendBtn.innerHTML = ICON_SEND;
        this.sendBtn.addEventListener('click', () => this.handleSend());
        footer.appendChild(this.inputEl);
        footer.appendChild(this.sendBtn);
        this.chatWindow.appendChild(footer);
        this.shadow.appendChild(this.chatWindow);
    }
    // ── Session & initialization ──────────────────────────────────────────────
    async initialize() {
        var _a;
        const saved = loadSession();
        let visitorId = saved === null || saved === void 0 ? void 0 : saved.visitorId;
        const initData = await this.api.init(this.config.workspaceId, visitorId);
        this.api.setToken(initData.token);
        this.session = {
            visitorId: initData.visitorId,
            chatId: initData.chatId,
            token: initData.token,
        };
        saveSession(this.session);
        // Update header if agent info was returned
        if (initData.agentName) {
            const nameEl = this.shadow.querySelector('.crm-header-name');
            if (nameEl)
                nameEl.textContent = initData.agentName;
        }
        if (initData.agentAvatar) {
            const avatarEl = this.shadow.querySelector('.crm-header-avatar');
            if (avatarEl) {
                const img = el('img', { src: initData.agentAvatar, alt: (_a = initData.agentName) !== null && _a !== void 0 ? _a : 'Agent' });
                avatarEl.innerHTML = '';
                avatarEl.appendChild(img);
            }
        }
        // Load message history if a chat already exists
        if (this.session.chatId) {
            try {
                const history = await this.api.getMessages(this.session.chatId);
                this.showMessages();
                history.forEach((m) => this.appendMessage(m));
                if (initData.welcomeMessage && history.length === 0) {
                    this.appendSystemMessage(initData.welcomeMessage);
                }
            }
            catch (_b) {
                this.showMessages();
                if (initData.welcomeMessage) {
                    this.appendSystemMessage(initData.welcomeMessage);
                }
            }
        }
        else {
            this.showMessages();
            if (initData.welcomeMessage) {
                this.appendSystemMessage(initData.welcomeMessage);
            }
            else {
                this.showEmptyState();
            }
        }
        this.connectWs();
    }
    connectWs() {
        var _a, _b;
        if (!this.session)
            return;
        let wsBase = this.config.wsUrl;
        if (!wsBase) {
            // Derive WS URL from apiUrl
            wsBase = this.config.apiUrl.replace(/^http/, 'ws');
        }
        const chatId = (_a = this.session.chatId) !== null && _a !== void 0 ? _a : '';
        const wsUrl = `${wsBase}/widget/ws?token=${encodeURIComponent((_b = this.session.token) !== null && _b !== void 0 ? _b : '')}&chatId=${encodeURIComponent(chatId)}`;
        this.ws = new WsClient(wsUrl, (msg) => {
            this.appendMessage(msg);
            if (!this.isOpen) {
                this.unread++;
                this.updateBadge();
            }
        });
        this.ws.connect();
    }
    // ── UI helpers ────────────────────────────────────────────────────────────
    showMessages() {
        this.loadingEl.setAttribute('hidden', '');
        this.messagesEl.removeAttribute('hidden');
    }
    showEmptyState() {
        if (this.messagesEl.querySelector('.crm-empty'))
            return;
        const empty = el('div', { class: 'crm-empty' });
        empty.innerHTML = `${ICON_EMPTY}<span>Start a conversation — we typically reply in minutes.</span>`;
        this.messagesEl.appendChild(empty);
    }
    removeEmptyState() {
        const empty = this.messagesEl.querySelector('.crm-empty');
        if (empty)
            empty.remove();
    }
    appendMessage(msg) {
        this.removeEmptyState();
        const isVisitor = msg.sender === 'visitor';
        const wrap = el('div', { class: `crm-msg crm-msg--${isVisitor ? 'visitor' : 'agent'}` });
        const bubble = el('div', { class: 'crm-msg__bubble' });
        bubble.textContent = msg.content;
        const time = el('div', { class: 'crm-msg__time' });
        time.textContent = formatTime(msg.createdAt);
        wrap.appendChild(bubble);
        wrap.appendChild(time);
        this.messagesEl.appendChild(wrap);
        this.scrollToBottom();
    }
    appendSystemMessage(text) {
        this.removeEmptyState();
        const msg = {
            id: 'welcome',
            chatId: '',
            content: text,
            sender: 'agent',
            createdAt: new Date().toISOString(),
        };
        this.appendMessage(msg);
    }
    showError(msg) {
        this.errorEl.textContent = msg;
        this.errorEl.removeAttribute('hidden');
        setTimeout(() => this.errorEl.setAttribute('hidden', ''), 5000);
    }
    scrollToBottom() {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
    autoResize() {
        this.inputEl.style.height = 'auto';
        this.inputEl.style.height = `${this.inputEl.scrollHeight}px`;
    }
    updateBadge() {
        if (this.unread > 0) {
            this.badge.textContent = this.unread > 9 ? '9+' : String(this.unread);
            this.badge.removeAttribute('hidden');
        }
        else {
            this.badge.setAttribute('hidden', '');
        }
    }
    // ── Open / close ──────────────────────────────────────────────────────────
    toggle() {
        this.isOpen ? this.close() : this.open();
    }
    open() {
        this.isOpen = true;
        this.chatWindow.classList.remove('crm-hidden');
        this.launcher.setAttribute('aria-label', 'Close chat');
        this.launcher.innerHTML = ICON_CLOSE;
        this.launcher.appendChild(this.badge);
        this.unread = 0;
        this.updateBadge();
        setTimeout(() => this.inputEl.focus(), 200);
    }
    close() {
        this.isOpen = false;
        this.chatWindow.classList.add('crm-hidden');
        this.launcher.setAttribute('aria-label', 'Open chat');
        this.launcher.innerHTML = ICON_CHAT;
        this.launcher.appendChild(this.badge);
    }
    // ── Sending messages ──────────────────────────────────────────────────────
    async handleSend() {
        var _a;
        const content = this.inputEl.value.trim();
        if (!content || !this.session)
            return;
        this.inputEl.value = '';
        this.inputEl.style.height = 'auto';
        this.sendBtn.disabled = true;
        // Ensure a chat thread exists
        if (!this.session.chatId) {
            try {
                const { chatId } = await this.api.createChat(this.config.workspaceId, this.session.visitorId);
                this.session.chatId = chatId;
                saveSession(this.session);
                // Re-connect WS with the new chatId
                (_a = this.ws) === null || _a === void 0 ? void 0 : _a.disconnect();
                this.connectWs();
            }
            catch (_b) {
                this.showError('Could not start conversation. Please try again.');
                this.inputEl.value = content;
                this.sendBtn.disabled = false;
                return;
            }
        }
        // Optimistic UI: show the message immediately
        const optimistic = {
            id: `opt-${Date.now()}`,
            chatId: this.session.chatId,
            content,
            sender: 'visitor',
            createdAt: new Date().toISOString(),
        };
        this.appendMessage(optimistic);
        // Show typing indicator
        this.messagesEl.appendChild(this.typingEl);
        this.typingEl.removeAttribute('hidden');
        this.scrollToBottom();
        try {
            await this.api.sendMessage(this.session.chatId, content);
        }
        catch (_c) {
            this.showError('Message could not be delivered. Please try again.');
        }
        finally {
            this.typingEl.setAttribute('hidden', '');
            if (this.typingEl.parentNode)
                this.typingEl.parentNode.removeChild(this.typingEl);
            this.sendBtn.disabled = false;
        }
    }
}

/**
 * CRM Chat Widget SDK
 *
 * Embeddable SDK for integrating the CRM chat widget into any website.
 * Zero dependencies — all styles are injected via JavaScript using Shadow DOM.
 *
 * @example
 * ```html
 * <script src="crm-sdk.umd.js"></script>
 * <script>CrmSdk.init({ workspaceId: 'YOUR_WORKSPACE_ID' });</script>
 * ```
 *
 * @example
 * ```ts
 * import { init } from '@projeto-crm-2026/crm-sdk';
 * init({ workspaceId: 'YOUR_WORKSPACE_ID' });
 * ```
 */
let _widget = null;
/**
 * Initializes the CRM Chat Widget and mounts it into the document.
 * Calling `init` more than once with the same config is a no-op.
 *
 * @param config - SDK configuration options.
 */
function init(config) {
    if (!config.workspaceId) {
        throw new Error('[crm-sdk] workspaceId is required');
    }
    if (_widget)
        return;
    _widget = new Widget(config);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => _widget.mount());
    }
    else {
        _widget.mount();
    }
}

export { init, version };
//# sourceMappingURL=crm-sdk.esm.js.map
