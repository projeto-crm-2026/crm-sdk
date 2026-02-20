import { Message } from './types';

type MessageCallback = (msg: Message) => void;

const RECONNECT_DELAY_MS = 3000;

export class WsClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(
    private readonly url: string,
    private readonly onMessage: MessageCallback,
  ) {}

  connect(): void {
    if (this.closed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    try {
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as Message;
          this.onMessage(data);
        } catch {
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
    } catch {
      // WebSocket constructor can throw in some environments.
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
  }
}
