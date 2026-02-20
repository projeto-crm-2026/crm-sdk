import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClient } from './api';
import { loadSession, saveSession } from './session';
import { CrmSdkConfig, Message, VisitorSession } from './types';
import { WsClient } from './ws';

// ── Icons ────────────────────────────────────────────────────────────────────

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 pointer-events-none">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: size, height: size }} className="pointer-events-none">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px] pointer-events-none">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isVisitor = message.sender === 'visitor';
  return (
    <div className={`flex flex-col max-w-[80%] animate-msg-in ${isVisitor ? 'self-end' : 'self-start'}`}>
      <div
        className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
          isVisitor
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
        }`}
      >
        {message.content}
      </div>
      <div className={`text-[10px] text-gray-400 mt-1 px-1 ${isVisitor ? 'self-end' : ''}`}>
        {formatTime(message.createdAt)}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5 bg-white rounded-2xl rounded-bl-sm self-start shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce-dot" />
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce-dot-2" />
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce-dot-3" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 p-4 flex-1 bg-gray-50">
      <div className="h-9 w-[55%] rounded-2xl animate-shimmer bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%]" />
      <div className="h-9 w-[75%] self-end rounded-2xl animate-shimmer bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%]" />
      <div className="h-9 w-[60%] rounded-2xl animate-shimmer bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%]" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 text-sm text-center p-6">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 opacity-30">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span>Start a conversation — we typically reply in minutes.</span>
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────

export interface WidgetProps {
  config: CrmSdkConfig;
}

export default function Widget({ config }: WidgetProps) {
  const [isOpen, setIsOpen]         = useState(false);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending]   = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [agentName, setAgentName]   = useState('Support');
  const [agentAvatar, setAgentAvatar] = useState<string | null>(null);

  const sessionRef    = useRef<VisitorSession | null>(null);
  const apiRef        = useRef<ApiClient>(new ApiClient(config.apiUrl));
  const wsRef         = useRef<WsClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLTextAreaElement>(null);
  const isOpenRef     = useRef(false);
  // Capture initial config so effects/callbacks use stable references.
  const configRef     = useRef(config);

  // Keep isOpenRef in sync for the WS callback closure.
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }, []);

  const connectWs = useCallback((session: VisitorSession) => {
    const apiUrl = configRef.current.apiUrl ?? 'https://api.crm.exemplo.com';
    const wsBase = configRef.current.wsUrl ?? apiUrl.replace(/^http/, 'ws');
    const chatId = session.chatId ?? '';
    const wsUrl  = `${wsBase}/widget/ws?token=${encodeURIComponent(session.token ?? '')}&chatId=${encodeURIComponent(chatId)}`;

    wsRef.current?.disconnect();
    wsRef.current = new WsClient(wsUrl, (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      if (!isOpenRef.current) {
        setUnreadCount(prev => prev + 1);
      }
    });
    wsRef.current.connect();
  }, []); // connectWs reads configRef so it is stable

  // ── Initialization ────────────────────────────────────────────────────────

  useEffect(() => {
    const api   = apiRef.current;
    const saved = loadSession();

    api.init(configRef.current.workspaceId, saved?.visitorId)
      .then(async (data) => {
        api.setToken(data.token);

        const session: VisitorSession = {
          visitorId: data.visitorId,
          chatId:    data.chatId,
          token:     data.token,
        };
        sessionRef.current = session;
        saveSession(session);

        if (data.agentName)   setAgentName(data.agentName);
        if (data.agentAvatar) setAgentAvatar(data.agentAvatar);

        let history: Message[] = [];
        if (session.chatId) {
          try { history = await api.getMessages(session.chatId); } catch { /* ignore */ }
        }

        const msgs: Message[] = [];
        if (data.welcomeMessage && history.length === 0) {
          msgs.push({
            id: 'welcome', chatId: session.chatId ?? '',
            content: data.welcomeMessage, sender: 'agent',
            createdAt: new Date().toISOString(),
          });
        }
        setMessages([...msgs, ...history]);
        setIsLoading(false);
        connectWs(session);
      })
      .catch(() => {
        setIsLoading(false);
        showError('Could not connect to support. Please try again later.');
      });

    return () => { wsRef.current?.disconnect(); };
  }, [connectWs, showError]);

  // Scroll when messages change.
  useEffect(() => { scrollToBottom(); }, [messages, showTyping, scrollToBottom]);

  // Focus input when opening; clear badge.
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
      setUnreadCount(0);
    }
  }, [isOpen]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || !sessionRef.current || isSending) return;

    setInputValue('');
    setIsSending(true);

    const session = sessionRef.current;

    // Create chat thread on first message.
    if (!session.chatId) {
      try {
        const { chatId } = await apiRef.current.createChat(configRef.current.workspaceId, session.visitorId);
        session.chatId = chatId;
        sessionRef.current = session;
        saveSession(session);
        wsRef.current?.disconnect();
        connectWs(session);
      } catch {
        showError('Could not start conversation. Please try again.');
        setInputValue(content);
        setIsSending(false);
        return;
      }
    }

    // Optimistic bubble.
    const optimistic: Message = {
      id: `opt-${Date.now()}`, chatId: session.chatId,
      content, sender: 'visitor', createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setShowTyping(true);

    try {
      await apiRef.current.sendMessage(session.chatId, content);
    } catch {
      showError('Message could not be delivered. Please try again.');
    } finally {
      setShowTyping(false);
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Chat window ────────────────────────────────────────────── */}
      <div
        className={[
          'fixed bottom-24 right-6 z-[2147483645]',
          'w-[360px] max-w-[calc(100vw-2rem)]',
          'h-[520px] max-h-[calc(100vh-120px)]',
          'bg-white rounded-2xl flex flex-col overflow-hidden',
          'origin-bottom-right transition-all duration-[250ms]',
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-90 translate-y-4 pointer-events-none',
        ].join(' ')}
        style={{ boxShadow: isOpen ? '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)' : 'none' }}
        role="dialog"
        aria-label="Chat"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-3.5 flex items-center gap-2.5 flex-shrink-0 select-none">
          <div className="w-9 h-9 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {agentAvatar
              ? <img src={agentAvatar} alt={agentName} className="w-full h-full object-cover" />
              : <AgentIcon />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold truncate">{agentName}</div>
            <div className="text-xs opacity-85 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
              Online
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg opacity-80 hover:opacity-100 hover:bg-white/15 transition-all flex items-center justify-center"
            aria-label="Close chat"
            type="button"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 bg-gray-50 scroll-smooth"
            role="log"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
            )}
            {showTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="px-3.5 py-2 bg-red-50 text-red-800 text-xs border-t border-red-100 text-center flex-shrink-0" role="alert">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-end flex-shrink-0">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 min-h-[38px] max-h-[100px] px-3 py-2 border-[1.5px] border-gray-200 rounded-[20px] font-widget text-sm text-gray-800 bg-gray-50 resize-none outline-none focus:border-blue-400 focus:bg-white transition-colors placeholder:text-gray-400 overflow-y-auto leading-snug"
            aria-label="Message"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !inputValue.trim()}
            className="w-[38px] h-[38px] rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 hover:bg-blue-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            type="button"
            aria-label="Send"
          >
            <SendIcon />
          </button>
        </div>
      </div>

      {/* ── Launcher button ────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-6 right-6 z-[2147483646] w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-400 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all duration-200 relative outline-none"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        type="button"
      >
        {/* Chat / Close icon crossfade */}
        <span className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <CloseIcon size={24} />
        </span>
        <span className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isOpen ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}>
          <ChatIcon />
        </span>

        {/* Unread badge */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute top-0.5 right-0.5 w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
