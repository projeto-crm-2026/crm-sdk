/** All widget CSS injected into the Shadow DOM. */
export const WIDGET_STYLES = `
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
