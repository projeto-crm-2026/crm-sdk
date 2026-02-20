import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';

const version = '0.1.0';

const DEFAULT_API_URL = 'https://api.crm.exemplo.com';
class ApiClient {
    constructor(publicKey, baseUrl = DEFAULT_API_URL) {
        this.publicKey = publicKey;
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    setToken(token) {
        this.token = token;
    }
    async request(method, path, body) {
        const headers = {
            'Content-Type': 'application/json',
            'X-Widget-Key': this.publicKey,
        };
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
    async init(workspaceId, visitorId, chatId) {
        return this.request('POST', '/widget/init', {
            workspace_id: workspaceId,
            visitor_id: visitorId,
            chat_id: chatId !== null && chatId !== void 0 ? chatId : undefined,
        });
    }
    /** POST /widget/chat — create a new chat thread. */
    async createChat(visitorId) {
        return this.request('POST', '/widget/chat', {
            visitor_id: visitorId,
        });
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

const RECONNECT_DELAY_MS = 3000;
class WsClient {
    constructor(url, onMessage) {
        this.url = url;
        this.onMessage = onMessage;
        this.ws = null;
        this.reconnectTimer = null;
        this.closed = false;
        this.pendingMessages = [];
        this.readyPromise = null;
        this.readyResolve = null;
    }
    connect() {
        if (this.closed)
            return;
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }
        this.readyPromise = new Promise((resolve) => {
            this.readyResolve = resolve;
        });
        try {
            console.log('[crm-sdk] WS connecting to', this.url);
            this.ws = new WebSocket(this.url);
            this.ws.addEventListener('open', () => {
                var _a;
                console.log('[crm-sdk] WS connected');
                // Flush any queued messages.
                for (const msg of this.pendingMessages) {
                    this.ws.send(msg);
                }
                this.pendingMessages = [];
                (_a = this.readyResolve) === null || _a === void 0 ? void 0 : _a.call(this);
            });
            this.ws.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.onMessage(data);
                }
                catch (_a) {
                    // Ignore malformed frames.
                }
            });
            this.ws.addEventListener('close', (e) => {
                console.log('[crm-sdk] WS closed', e.code, e.reason);
                if (!this.closed) {
                    this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
                }
            });
            this.ws.addEventListener('error', (e) => {
                console.error('[crm-sdk] WS error', e);
            });
        }
        catch (_a) {
            // WebSocket constructor can throw in some environments.
        }
    }
    /** Wait until the WebSocket connection is open. */
    async waitForOpen() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN)
            return;
        if (this.readyPromise)
            await this.readyPromise;
    }
    /** Send a JSON message through the WebSocket. Queues if not yet open. */
    send(data) {
        const payload = JSON.stringify(data);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(payload);
        }
        else {
            // Queue the message — it will be flushed on 'open'.
            this.pendingMessages.push(payload);
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
        this.pendingMessages = [];
    }
}

// ── Icons ────────────────────────────────────────────────────────────────────
function ChatIcon() {
    return (jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-7 h-7 pointer-events-none", children: jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }));
}
function CloseIcon({ size = 20 }) {
    return (jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", style: { width: size, height: size }, className: "pointer-events-none", children: [jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }));
}
function SendIcon() {
    return (jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "w-[18px] h-[18px] pointer-events-none", children: jsx("path", { d: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" }) }));
}
function AgentIcon() {
    return (jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "w-5 h-5", children: jsx("path", { d: "M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" }) }));
}
// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso) {
    try {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    catch (_a) {
        return '';
    }
}
// ── Sub-components ───────────────────────────────────────────────────────────
function MessageBubble({ message, visitorId, isNew }) {
    const isVisitor = message.visitor_id === visitorId && !message.sender_id;
    return (jsxs("div", { className: `flex flex-col max-w-[80%] ${isNew ? 'animate-msg-in' : ''} ${isVisitor ? 'self-end' : 'self-start'}`, children: [jsx("div", { className: `px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${isVisitor
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'}`, children: message.content }), jsx("div", { className: `text-[10px] text-gray-400 mt-1 px-1 ${isVisitor ? 'self-end' : ''}`, children: formatTime(message.created_at) })] }));
}
function TypingIndicator() {
    return (jsxs("div", { className: "flex items-center gap-1 px-3 py-2.5 bg-white rounded-2xl rounded-bl-sm self-start shadow-sm", children: [jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce-dot" }), jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce-dot-2" }), jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce-dot-3" })] }));
}
function LoadingSkeleton() {
    return (jsxs("div", { className: "flex flex-col gap-2.5 p-4 flex-1 bg-gray-50", children: [jsx("div", { className: "h-9 w-[55%] rounded-2xl animate-shimmer bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%]" }), jsx("div", { className: "h-9 w-[75%] self-end rounded-2xl animate-shimmer bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%]" }), jsx("div", { className: "h-9 w-[60%] rounded-2xl animate-shimmer bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%]" })] }));
}
function EmptyState() {
    return (jsxs("div", { className: "flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 text-sm text-center p-6", children: [jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", className: "w-12 h-12 opacity-30", children: jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }), jsx("span", { children: "Start a conversation \u2014 we typically reply in minutes." })] }));
}
function Widget({ config }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showTyping, setShowTyping] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [agentName, setAgentName] = useState('Suporte');
    const [agentAvatar, setAgentAvatar] = useState(null);
    const [newMessageIds, setNewMessageIds] = useState(new Set());
    useRef(0);
    const sessionRef = useRef(null);
    const apiRef = useRef(new ApiClient(config.publicKey, config.apiUrl));
    const wsRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const isOpenRef = useRef(false);
    // Capture initial config so effects/callbacks use stable references.
    const configRef = useRef(config);
    // Keep isOpenRef in sync for the WS callback closure.
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
    const scrollToBottom = useCallback(() => {
        var _a;
        (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
    }, []);
    const showError = useCallback((msg) => {
        setError(msg);
        setTimeout(() => setError(null), 5000);
    }, []);
    const connectWs = useCallback((session) => {
        var _a, _b, _c, _d;
        // Only connect WebSocket when we have a chatId.
        if (!session.chatId)
            return;
        const apiUrl = (_a = configRef.current.apiUrl) !== null && _a !== void 0 ? _a : 'https://api.crm.exemplo.com';
        const wsBase = (_b = configRef.current.wsUrl) !== null && _b !== void 0 ? _b : apiUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBase}/ws/widget/${session.chatId}?widget_key=${encodeURIComponent(configRef.current.publicKey)}&token=${encodeURIComponent((_c = session.token) !== null && _c !== void 0 ? _c : '')}&visitor_id=${encodeURIComponent(session.visitorId)}`;
        (_d = wsRef.current) === null || _d === void 0 ? void 0 : _d.disconnect();
        wsRef.current = new WsClient(wsUrl, (msg) => {
            setMessages(prev => {
                var _a;
                const updated = [...prev, msg];
                // Track new message IDs for animation.
                const id = (_a = msg.id) !== null && _a !== void 0 ? _a : `ws-${prev.length}`;
                setNewMessageIds(new Set([id]));
                setTimeout(() => setNewMessageIds(new Set()), 400);
                return updated;
            });
            if (!isOpenRef.current) {
                setUnreadCount(prev => prev + 1);
            }
        });
        wsRef.current.connect();
    }, []); // connectWs reads configRef so it is stable
    // ── Initialization ────────────────────────────────────────────────────────
    useEffect(() => {
        const api = apiRef.current;
        const saved = loadSession();
        console.log('[crm-sdk] Calling POST /widget/init...', { workspaceId: configRef.current.workspaceId, visitorId: saved === null || saved === void 0 ? void 0 : saved.visitorId, chatId: saved === null || saved === void 0 ? void 0 : saved.chatId });
        api.init(configRef.current.workspaceId, saved === null || saved === void 0 ? void 0 : saved.visitorId, saved === null || saved === void 0 ? void 0 : saved.chatId)
            .then(async (data) => {
            var _a, _b, _c;
            console.log('[crm-sdk] init response:', data);
            api.setToken(data.token);
            const chatId = (_b = (_a = data.chat) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : saved === null || saved === void 0 ? void 0 : saved.chatId;
            const session = {
                visitorId: data.visitor_id,
                chatId,
                token: data.token,
            };
            sessionRef.current = session;
            saveSession(session);
            let history = [];
            if (session.chatId) {
                try {
                    history = await api.getMessages(session.chatId);
                }
                catch ( /* ignore */_d) { /* ignore */ }
            }
            // Welcome message
            const msgs = [];
            if (history.length === 0) {
                msgs.push({
                    id: 'welcome',
                    type: 'message',
                    chat_id: (_c = session.chatId) !== null && _c !== void 0 ? _c : 0,
                    content: 'Olá! Como podemos ajudar?',
                    sender_id: null,
                    visitor_id: undefined,
                    created_at: new Date().toISOString(),
                });
            }
            setMessages([...msgs, ...history]);
            setIsLoading(false);
            connectWs(session);
        })
            .catch((err) => {
            console.error('[crm-sdk] init failed:', err);
            setIsLoading(false);
            showError('Could not connect to support. Please try again later.');
        });
        return () => { var _a; (_a = wsRef.current) === null || _a === void 0 ? void 0 : _a.disconnect(); };
    }, [connectWs, showError]);
    // Scroll when messages change.
    useEffect(() => { scrollToBottom(); }, [messages, showTyping, scrollToBottom]);
    // Focus input when opening; clear badge.
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => { var _a; return (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, 200);
            setUnreadCount(0);
        }
    }, [isOpen]);
    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleSend = async () => {
        var _a, _b, _c;
        const content = inputValue.trim();
        if (!content || !sessionRef.current || isSending)
            return;
        setInputValue('');
        setIsSending(true);
        const session = sessionRef.current;
        // Create chat thread on first message.
        if (!session.chatId) {
            try {
                const res = await apiRef.current.createChat(session.visitorId);
                session.chatId = res.id;
                sessionRef.current = session;
                saveSession(session);
                (_a = wsRef.current) === null || _a === void 0 ? void 0 : _a.disconnect();
                connectWs(session);
                // Wait for WS to be ready before sending.
                await ((_b = wsRef.current) === null || _b === void 0 ? void 0 : _b.waitForOpen());
            }
            catch (_d) {
                showError('Could not start conversation. Please try again.');
                setInputValue(content);
                setIsSending(false);
                return;
            }
        }
        // Send via WebSocket — the broadcast will add the message to the list.
        (_c = wsRef.current) === null || _c === void 0 ? void 0 : _c.send({
            type: 'message',
            content,
            visitor_id: session.visitorId,
        });
        setIsSending(false);
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };
    // ── Render ────────────────────────────────────────────────────────────────
    return (jsxs("div", { className: "fixed bottom-3 right-3 z-[2147483645] flex flex-col items-end", children: [jsxs("div", { className: [
                    'w-[360px] max-w-[calc(100vw-1.5rem)]',
                    'h-[520px] max-h-[calc(100vh-100px)]',
                    'bg-white rounded-2xl flex flex-col overflow-hidden mb-3',
                    'origin-bottom-right transition-all duration-[250ms]',
                    isOpen
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-95 translate-y-4 pointer-events-none',
                ].join(' '), style: { boxShadow: isOpen ? '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)' : 'none' }, role: "dialog", "aria-label": "Chat", "aria-hidden": !isOpen, children: [jsxs("div", { className: "bg-blue-600 text-white px-4 py-3.5 flex items-center gap-2.5 flex-shrink-0 select-none", children: [jsx("div", { className: "w-9 h-9 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0 overflow-hidden", children: agentAvatar
                                    ? jsx("img", { src: agentAvatar, alt: agentName, className: "w-full h-full object-cover" })
                                    : jsx(AgentIcon, {}) }), jsxs("div", { className: "flex-1 min-w-0", children: [jsx("div", { className: "text-[15px] font-semibold truncate", children: agentName }), jsxs("div", { className: "text-xs opacity-85 flex items-center gap-1", children: [jsx("span", { className: "inline-block w-1.5 h-1.5 rounded-full bg-green-400" }), "Online"] })] }), jsx("button", { onClick: () => setIsOpen(false), className: "p-1 rounded-lg opacity-80 hover:opacity-100 hover:bg-white/15 transition-all flex items-center justify-center", "aria-label": "Close chat", type: "button", children: jsx(CloseIcon, { size: 20 }) })] }), isLoading ? (jsx(LoadingSkeleton, {})) : (jsxs("div", { className: "flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 bg-gray-50 scroll-smooth", role: "log", "aria-live": "polite", children: [messages.length === 0 ? (jsx(EmptyState, {})) : (messages.map((msg, idx) => {
                                var _a, _b;
                                const key = (_a = msg.id) !== null && _a !== void 0 ? _a : `msg-${idx}`;
                                return (jsx(MessageBubble, { message: msg, visitorId: (_b = sessionRef.current) === null || _b === void 0 ? void 0 : _b.visitorId, isNew: newMessageIds.has(key) }, key));
                            })), showTyping && jsx(TypingIndicator, {}), jsx("div", { ref: messagesEndRef })] })), error && (jsx("div", { className: "px-3.5 py-2 bg-red-50 text-red-800 text-xs border-t border-red-100 text-center flex-shrink-0", role: "alert", children: error })), jsxs("div", { className: "p-3 bg-white border-t border-gray-100 flex gap-2 items-end flex-shrink-0", children: [jsx("textarea", { ref: inputRef, value: inputValue, onChange: handleInputChange, onKeyDown: handleKeyDown, placeholder: "Digite uma mensagem\u2026", rows: 1, className: "flex-1 min-h-[38px] max-h-[100px] px-3 py-2 border-[1.5px] border-gray-200 rounded-[20px] font-widget text-sm text-gray-800 bg-gray-50 resize-none outline-none focus:border-blue-400 focus:bg-white transition-colors placeholder:text-gray-400 overflow-y-auto leading-snug", "aria-label": "Message" }), jsx("button", { onClick: handleSend, disabled: isSending || !inputValue.trim(), className: "w-[38px] h-[38px] rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 hover:bg-blue-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all", type: "button", "aria-label": "Send", children: jsx(SendIcon, {}) })] })] }), jsxs("button", { onClick: () => setIsOpen(prev => !prev), className: "w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-400 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all duration-200 relative outline-none flex-shrink-0", "aria-label": isOpen ? 'Close chat' : 'Open chat', type: "button", children: [jsx("span", { className: `absolute inset-0 flex items-center justify-center transition-all duration-200 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`, children: jsx(CloseIcon, { size: 24 }) }), jsx("span", { className: `absolute inset-0 flex items-center justify-center transition-all duration-200 ${isOpen ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`, children: jsx(ChatIcon, {}) }), unreadCount > 0 && !isOpen && (jsx("span", { className: "absolute top-0.5 right-0.5 w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white pointer-events-none", children: unreadCount > 9 ? '9+' : unreadCount }))] })] }));
}

var css_248z = "@import url(\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap\");*,:after,:before{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }\r\n\r\n/*! tailwindcss v3.4.19 | MIT License | https://tailwindcss.com*/*,:after,:before{border:0 solid #e5e7eb;box-sizing:border-box}:after,:before{--tw-content:\"\"}:host,html{-webkit-text-size-adjust:100%;font-feature-settings:normal;-webkit-tap-highlight-color:transparent;font-family:ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;font-variation-settings:normal;line-height:1.5;-moz-tab-size:4;-o-tab-size:4;tab-size:4}body{line-height:inherit;margin:0}hr{border-top-width:1px;color:inherit;height:0}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,pre,samp{font-feature-settings:normal;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-size:1em;font-variation-settings:normal}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{border-collapse:collapse;border-color:inherit;text-indent:0}button,input,optgroup,select,textarea{font-feature-settings:inherit;color:inherit;font-family:inherit;font-size:100%;font-variation-settings:inherit;font-weight:inherit;letter-spacing:inherit;line-height:inherit;margin:0;padding:0}button,select{text-transform:none}button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dd,dl,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}fieldset{margin:0}fieldset,legend{padding:0}menu,ol,ul{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{color:#9ca3af;opacity:1}input::placeholder,textarea::placeholder{color:#9ca3af;opacity:1}[role=button],button{cursor:pointer}:disabled{cursor:default}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{height:auto;max-width:100%}[hidden]:where(:not([hidden=until-found])){display:none}.container{width:100%}@media (min-width:640px){.container{max-width:640px}}@media (min-width:768px){.container{max-width:768px}}@media (min-width:1024px){.container{max-width:1024px}}@media (min-width:1280px){.container{max-width:1280px}}@media (min-width:1536px){.container{max-width:1536px}}.pointer-events-none{pointer-events:none}.pointer-events-auto{pointer-events:auto}.fixed{position:fixed}.absolute{position:absolute}.relative{position:relative}.inset-0{inset:0}.bottom-3{bottom:.75rem}.right-0\\.5{right:.125rem}.right-3{right:.75rem}.top-0\\.5{top:.125rem}.z-\\[2147483645\\]{z-index:2147483645}.mb-3{margin-bottom:.75rem}.mt-1{margin-top:.25rem}.inline-block{display:inline-block}.flex{display:flex}.contents{display:contents}.h-1\\.5{height:.375rem}.h-12{height:3rem}.h-14{height:3.5rem}.h-5{height:1.25rem}.h-7{height:1.75rem}.h-9{height:2.25rem}.h-\\[18px\\]{height:18px}.h-\\[38px\\]{height:38px}.h-\\[520px\\]{height:520px}.h-full{height:100%}.max-h-\\[100px\\]{max-height:100px}.max-h-\\[calc\\(100vh-100px\\)\\]{max-height:calc(100vh - 100px)}.min-h-\\[38px\\]{min-height:38px}.w-1\\.5{width:.375rem}.w-12{width:3rem}.w-14{width:3.5rem}.w-5{width:1.25rem}.w-7{width:1.75rem}.w-9{width:2.25rem}.w-\\[18px\\]{width:18px}.w-\\[360px\\]{width:360px}.w-\\[38px\\]{width:38px}.w-\\[55\\%\\]{width:55%}.w-\\[60\\%\\]{width:60%}.w-\\[75\\%\\]{width:75%}.w-full{width:100%}.min-w-0{min-width:0}.max-w-\\[80\\%\\]{max-width:80%}.max-w-\\[calc\\(100vw-1\\.5rem\\)\\]{max-width:calc(100vw - 1.5rem)}.flex-1{flex:1 1 0%}.flex-shrink-0{flex-shrink:0}.origin-bottom-right{transform-origin:bottom right}.translate-y-0{--tw-translate-y:0px}.translate-y-0,.translate-y-4{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.translate-y-4{--tw-translate-y:1rem}.scale-100{--tw-scale-x:1;--tw-scale-y:1}.scale-100,.scale-75{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.scale-75{--tw-scale-x:.75;--tw-scale-y:.75}.scale-95{--tw-scale-x:.95;--tw-scale-y:.95;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.animate-bounce-dot{animation:bounce-dot 1.2s ease infinite}.animate-bounce-dot-2{animation:bounce-dot 1.2s ease .2s infinite}@keyframes bounce-dot{0%,60%,to{transform:translateY(0)}30%{transform:translateY(-5px)}}.animate-bounce-dot-3{animation:bounce-dot 1.2s ease .4s infinite}@keyframes msg-in{0%{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.animate-msg-in{animation:msg-in .2s ease}@keyframes shimmer{0%{background-position:200% 0}to{background-position:-200% 0}}.animate-shimmer{animation:shimmer 1.4s linear infinite}.select-none{-webkit-user-select:none;-moz-user-select:none;user-select:none}.resize-none{resize:none}.flex-col{flex-direction:column}.items-end{align-items:flex-end}.items-center{align-items:center}.justify-center{justify-content:center}.gap-1{gap:.25rem}.gap-2{gap:.5rem}.gap-2\\.5{gap:.625rem}.self-start{align-self:flex-start}.self-end{align-self:flex-end}.overflow-hidden{overflow:hidden}.overflow-y-auto{overflow-y:auto}.scroll-smooth{scroll-behavior:smooth}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.break-words{overflow-wrap:break-word}.rounded-2xl{border-radius:1rem}.rounded-\\[20px\\]{border-radius:20px}.rounded-full{border-radius:9999px}.rounded-lg{border-radius:.5rem}.rounded-bl-sm{border-bottom-left-radius:.125rem}.rounded-br-sm{border-bottom-right-radius:.125rem}.border-2{border-width:2px}.border-\\[1\\.5px\\]{border-width:1.5px}.border-t{border-top-width:1px}.border-gray-100{--tw-border-opacity:1;border-color:rgb(243 244 246/var(--tw-border-opacity,1))}.border-gray-200{--tw-border-opacity:1;border-color:rgb(229 231 235/var(--tw-border-opacity,1))}.border-red-100{--tw-border-opacity:1;border-color:rgb(254 226 226/var(--tw-border-opacity,1))}.border-white{--tw-border-opacity:1;border-color:rgb(255 255 255/var(--tw-border-opacity,1))}.bg-blue-400{--tw-bg-opacity:1;background-color:rgb(96 165 250/var(--tw-bg-opacity,1))}.bg-blue-600{--tw-bg-opacity:1;background-color:rgb(37 99 235/var(--tw-bg-opacity,1))}.bg-gray-50{--tw-bg-opacity:1;background-color:rgb(249 250 251/var(--tw-bg-opacity,1))}.bg-green-400{--tw-bg-opacity:1;background-color:rgb(74 222 128/var(--tw-bg-opacity,1))}.bg-red-50{--tw-bg-opacity:1;background-color:rgb(254 242 242/var(--tw-bg-opacity,1))}.bg-red-500{--tw-bg-opacity:1;background-color:rgb(239 68 68/var(--tw-bg-opacity,1))}.bg-white{--tw-bg-opacity:1;background-color:rgb(255 255 255/var(--tw-bg-opacity,1))}.bg-gradient-to-r{background-image:linear-gradient(to right,var(--tw-gradient-stops))}.from-gray-100{--tw-gradient-from:#f3f4f6 var(--tw-gradient-from-position);--tw-gradient-to:rgba(243,244,246,0) var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)}.via-gray-200{--tw-gradient-to:rgba(229,231,235,0) var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),#e5e7eb var(--tw-gradient-via-position),var(--tw-gradient-to)}.to-gray-100{--tw-gradient-to:#f3f4f6 var(--tw-gradient-to-position)}.bg-\\[length\\:200\\%_100\\%\\]{background-size:200% 100%}.object-cover{-o-object-fit:cover;object-fit:cover}.p-1{padding:.25rem}.p-3{padding:.75rem}.p-4{padding:1rem}.p-6{padding:1.5rem}.px-1{padding-left:.25rem;padding-right:.25rem}.px-3{padding-left:.75rem;padding-right:.75rem}.px-3\\.5{padding-left:.875rem;padding-right:.875rem}.px-4{padding-left:1rem;padding-right:1rem}.py-2{padding-bottom:.5rem;padding-top:.5rem}.py-2\\.5{padding-bottom:.625rem;padding-top:.625rem}.py-3\\.5{padding-bottom:.875rem;padding-top:.875rem}.text-center{text-align:center}.font-widget{font-family:TASA Orbiter,Inter,system-ui,-apple-system,sans-serif}.text-\\[10px\\]{font-size:10px}.text-\\[15px\\]{font-size:15px}.text-sm{font-size:.875rem;line-height:1.25rem}.text-xs{font-size:.75rem;line-height:1rem}.font-bold{font-weight:700}.font-semibold{font-weight:600}.leading-relaxed{line-height:1.625}.leading-snug{line-height:1.375}.text-gray-400{--tw-text-opacity:1;color:rgb(156 163 175/var(--tw-text-opacity,1))}.text-gray-800{--tw-text-opacity:1;color:rgb(31 41 55/var(--tw-text-opacity,1))}.text-red-800{--tw-text-opacity:1;color:rgb(153 27 27/var(--tw-text-opacity,1))}.text-white{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity,1))}.opacity-0{opacity:0}.opacity-100{opacity:1}.opacity-30{opacity:.3}.opacity-80{opacity:.8}.opacity-85{opacity:.85}.shadow{--tw-shadow:0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px -1px rgba(0,0,0,.1);--tw-shadow-colored:0 1px 3px 0 var(--tw-shadow-color),0 1px 2px -1px var(--tw-shadow-color)}.shadow,.shadow-sm{box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-sm{--tw-shadow:0 1px 2px 0 rgba(0,0,0,.05);--tw-shadow-colored:0 1px 2px 0 var(--tw-shadow-color)}.shadow-xl{--tw-shadow:0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1);--tw-shadow-colored:0 20px 25px -5px var(--tw-shadow-color),0 8px 10px -6px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.outline-none{outline:2px solid transparent;outline-offset:2px}.transition-all{transition-duration:.15s;transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1)}.transition-colors{transition-duration:.15s;transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1)}.duration-200{transition-duration:.2s}.duration-\\[250ms\\]{transition-duration:.25s}.placeholder\\:text-gray-400::-moz-placeholder{--tw-text-opacity:1;color:rgb(156 163 175/var(--tw-text-opacity,1))}.placeholder\\:text-gray-400::placeholder{--tw-text-opacity:1;color:rgb(156 163 175/var(--tw-text-opacity,1))}.hover\\:bg-blue-400:hover{--tw-bg-opacity:1;background-color:rgb(96 165 250/var(--tw-bg-opacity,1))}.hover\\:bg-white\\/15:hover{background-color:hsla(0,0%,100%,.15)}.hover\\:opacity-100:hover{opacity:1}.focus\\:border-blue-400:focus{--tw-border-opacity:1;border-color:rgb(96 165 250/var(--tw-border-opacity,1))}.focus\\:bg-white:focus{--tw-bg-opacity:1;background-color:rgb(255 255 255/var(--tw-bg-opacity,1))}.active\\:scale-95:active{--tw-scale-x:.95;--tw-scale-y:.95;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.disabled\\:cursor-not-allowed:disabled{cursor:not-allowed}.disabled\\:opacity-40:disabled{opacity:.4}";

/**
 * Drop-in React component that renders the CRM chat widget
 * inside an isolated Shadow DOM.
 *
 * @example
 * ```tsx
 * import { CrmSdk } from '@projeto-crm-2026/crm-sdk';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <CrmSdk workspaceId="ws_123" publicKey="pk_abc" />
 *     </>
 *   );
 * }
 * ```
 */
function CrmSdk({ workspaceId, publicKey, apiUrl, wsUrl }) {
    const hostRef = useRef(null);
    const [portalTarget, setPortalTarget] = useState(null);
    const config = useMemo(() => ({ workspaceId, publicKey, apiUrl, wsUrl }), [workspaceId, publicKey, apiUrl, wsUrl]);
    useEffect(() => {
        const host = hostRef.current;
        if (!host)
            return;
        // Attach shadow DOM once
        const shadow = host.attachShadow({ mode: 'open' });
        // Inject compiled Tailwind CSS
        const style = document.createElement('style');
        style.textContent = css_248z;
        shadow.appendChild(style);
        // React mount target
        const container = document.createElement('div');
        container.className = 'font-widget';
        shadow.appendChild(container);
        setPortalTarget(container);
    }, []);
    return (jsxs(Fragment, { children: [jsx("div", { ref: hostRef, style: { position: 'contents' } }), portalTarget && createPortal(jsx(Widget, { config: config }), portalTarget)] }));
}

/**
 * CRM Chat Widget SDK
 *
 * Can be used as:
 * 1. A React component: `<CrmSdk workspaceId="..." publicKey="..." />`
 * 2. A vanilla JS `init()` call for non-React sites.
 */
let _mounted = false;
/**
 * Initializes the CRM Chat Widget via vanilla JS (non-React sites).
 * Calling `init` more than once is a no-op.
 *
 * @param config - SDK configuration options.
 */
function init(config) {
    console.log('[crm-sdk] init() called with config:', config);
    if (!config.workspaceId) {
        throw new Error('[crm-sdk] workspaceId is required');
    }
    if (!config.publicKey) {
        throw new Error('[crm-sdk] publicKey is required');
    }
    if (_mounted)
        return;
    _mounted = true;
    const bootstrap = () => {
        const host = document.createElement('div');
        host.id = 'crm-widget-host';
        document.body.appendChild(host);
        const shadow = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = css_248z;
        shadow.appendChild(style);
        const container = document.createElement('div');
        container.className = 'font-widget';
        shadow.appendChild(container);
        createRoot(container).render(React.createElement(Widget, { config }));
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    }
    else {
        bootstrap();
    }
}

export { CrmSdk, init, version };
//# sourceMappingURL=crm-sdk.esm.js.map
