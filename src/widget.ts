import { ApiClient } from './api';
import { loadSession, saveSession } from './session';
import { WIDGET_STYLES } from './styles';
import { CrmSdkConfig, Message, VisitorSession } from './types';
import { WsClient } from './ws';

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

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  html?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    e.setAttribute(k, v);
  }
  if (html !== undefined) e.innerHTML = html;
  return e;
}

// Widget ─────────────────────────────────────────────────────────────────────

export class Widget {
  private readonly config: Required<CrmSdkConfig>;
  private readonly api: ApiClient;
  private ws: WsClient | null = null;
  private session: VisitorSession | null = null;

  private isOpen = false;
  private unread = 0;

  // DOM refs
  private host!: HTMLDivElement;
  private shadow!: ShadowRoot;
  private launcher!: HTMLButtonElement;
  private badge!: HTMLSpanElement;
  private chatWindow!: HTMLDivElement;
  private messagesEl!: HTMLDivElement;
  private inputEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private typingEl!: HTMLDivElement;
  private errorEl!: HTMLDivElement;
  private loadingEl!: HTMLDivElement;

  constructor(config: CrmSdkConfig) {
    this.config = {
      apiUrl: 'https://api.crm.exemplo.com',
      wsUrl: '',
      ...config,
    };
    this.api = new ApiClient(this.config.apiUrl);
  }

  mount(): void {
    this.buildDOM();
    document.body.appendChild(this.host);
    this.initialize().catch(() => {
      this.showError('Could not connect to support. Please try again later.');
    });
  }

  // ── DOM construction ───────────────────────────────────────────────────────

  private buildDOM(): void {
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
    }) as HTMLTextAreaElement;
    this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
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

  private async initialize(): Promise<void> {
    const saved = loadSession();
    let visitorId: string | undefined = saved?.visitorId;

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
      if (nameEl) nameEl.textContent = initData.agentName;
    }
    if (initData.agentAvatar) {
      const avatarEl = this.shadow.querySelector('.crm-header-avatar');
      if (avatarEl) {
        const img = el('img', { src: initData.agentAvatar, alt: initData.agentName ?? 'Agent' });
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
      } catch {
        this.showMessages();
        if (initData.welcomeMessage) {
          this.appendSystemMessage(initData.welcomeMessage);
        }
      }
    } else {
      this.showMessages();
      if (initData.welcomeMessage) {
        this.appendSystemMessage(initData.welcomeMessage);
      } else {
        this.showEmptyState();
      }
    }

    this.connectWs();
  }

  private connectWs(): void {
    if (!this.session) return;

    let wsBase = this.config.wsUrl;
    if (!wsBase) {
      // Derive WS URL from apiUrl
      wsBase = this.config.apiUrl.replace(/^http/, 'ws');
    }
    const chatId = this.session.chatId ?? '';
    const wsUrl = `${wsBase}/widget/ws?token=${encodeURIComponent(this.session.token ?? '')}&chatId=${encodeURIComponent(chatId)}`;

    this.ws = new WsClient(wsUrl, (msg: Message) => {
      this.appendMessage(msg);
      if (!this.isOpen) {
        this.unread++;
        this.updateBadge();
      }
    });
    this.ws.connect();
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  private showMessages(): void {
    this.loadingEl.setAttribute('hidden', '');
    this.messagesEl.removeAttribute('hidden');
  }

  private showEmptyState(): void {
    if (this.messagesEl.querySelector('.crm-empty')) return;
    const empty = el('div', { class: 'crm-empty' });
    empty.innerHTML = `${ICON_EMPTY}<span>Start a conversation — we typically reply in minutes.</span>`;
    this.messagesEl.appendChild(empty);
  }

  private removeEmptyState(): void {
    const empty = this.messagesEl.querySelector('.crm-empty');
    if (empty) empty.remove();
  }

  private appendMessage(msg: Message): void {
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

  private appendSystemMessage(text: string): void {
    this.removeEmptyState();
    const msg: Message = {
      id: 'welcome',
      chatId: '',
      content: text,
      sender: 'agent',
      createdAt: new Date().toISOString(),
    };
    this.appendMessage(msg);
  }

  private showError(msg: string): void {
    this.errorEl.textContent = msg;
    this.errorEl.removeAttribute('hidden');
    setTimeout(() => this.errorEl.setAttribute('hidden', ''), 5000);
  }

  private scrollToBottom(): void {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private autoResize(): void {
    this.inputEl.style.height = 'auto';
    this.inputEl.style.height = `${this.inputEl.scrollHeight}px`;
  }

  private updateBadge(): void {
    if (this.unread > 0) {
      this.badge.textContent = this.unread > 9 ? '9+' : String(this.unread);
      this.badge.removeAttribute('hidden');
    } else {
      this.badge.setAttribute('hidden', '');
    }
  }

  // ── Open / close ──────────────────────────────────────────────────────────

  toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  open(): void {
    this.isOpen = true;
    this.chatWindow.classList.remove('crm-hidden');
    this.launcher.setAttribute('aria-label', 'Close chat');
    this.launcher.innerHTML = ICON_CLOSE;
    this.launcher.appendChild(this.badge);
    this.unread = 0;
    this.updateBadge();
    setTimeout(() => this.inputEl.focus(), 200);
  }

  close(): void {
    this.isOpen = false;
    this.chatWindow.classList.add('crm-hidden');
    this.launcher.setAttribute('aria-label', 'Open chat');
    this.launcher.innerHTML = ICON_CHAT;
    this.launcher.appendChild(this.badge);
  }

  // ── Sending messages ──────────────────────────────────────────────────────

  private async handleSend(): Promise<void> {
    const content = this.inputEl.value.trim();
    if (!content || !this.session) return;

    this.inputEl.value = '';
    this.inputEl.style.height = 'auto';
    this.sendBtn.disabled = true;

    // Ensure a chat thread exists
    if (!this.session.chatId) {
      try {
        const { chatId } = await this.api.createChat(
          this.config.workspaceId,
          this.session.visitorId,
        );
        this.session.chatId = chatId;
        saveSession(this.session);
        // Re-connect WS with the new chatId
        this.ws?.disconnect();
        this.connectWs();
      } catch {
        this.showError('Could not start conversation. Please try again.');
        this.inputEl.value = content;
        this.sendBtn.disabled = false;
        return;
      }
    }

    // Optimistic UI: show the message immediately
    const optimistic: Message = {
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
    } catch {
      this.showError('Message could not be delivered. Please try again.');
    } finally {
      this.typingEl.setAttribute('hidden', '');
      if (this.typingEl.parentNode) this.typingEl.parentNode.removeChild(this.typingEl);
      this.sendBtn.disabled = false;
    }
  }
}
