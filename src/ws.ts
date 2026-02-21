import { Message } from './types';

type MessageCallback = (msg: Message) => void;

const RECONNECT_DELAY_MS = 3000;

export class WsClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private pendingMessages: string[] = [];
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;

  constructor(
    private readonly url: string,
    private readonly onMessage: MessageCallback,
  ) {}

  connect(): void {
    if (this.closed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });

    try {
      console.log('[crm-sdk] WS connecting to', this.url);
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('open', () => {
        console.log('[crm-sdk] WS connected');
        // Flush any queued messages.
        for (const msg of this.pendingMessages) {
          this.ws!.send(msg);
        }
        this.pendingMessages = [];
        this.readyResolve?.();
      });

      this.ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as Message;
          this.onMessage(data);
        } catch {
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
    } catch {
      // WebSocket constructor can throw in some environments.
    }
  }

  /** Wait until the WebSocket connection is open. */
  async waitForOpen(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.readyPromise) await this.readyPromise;
  }

  /** Send a JSON message through the WebSocket. Queues if not yet open. */
  send(data: { type: string; content: string; visitor_id?: string }): void {
    const payload = JSON.stringify(data);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      // Queue the message — it will be flushed on 'open'.
      this.pendingMessages.push(payload);
    }
  }

  disconnect(): void {
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
