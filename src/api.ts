import { CreateChatResponse, InitResponse, Message } from './types';

const DEFAULT_API_URL = 'https://api.crm.exemplo.com';

export class ApiClient {
  private baseUrl: string;
  private publicKey: string;
  private token: string | undefined;

  constructor(publicKey: string, baseUrl: string = DEFAULT_API_URL) {
    this.publicKey = publicKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setToken(token: string): void {
    this.token = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
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
    return res.json() as Promise<T>;
  }

  /** POST /widget/init — exchange workspaceId + optional visitorId for a session token. */
  async init(workspaceId: string, visitorId?: string, chatId?: number): Promise<InitResponse> {
    return this.request<InitResponse>('POST', '/widget/init', {
      workspace_id: workspaceId,
      visitor_id: visitorId,
      chat_id: chatId ?? undefined,
    });
  }

  /** POST /widget/chat — create a new chat thread. */
  async createChat(visitorId: string): Promise<CreateChatResponse> {
    return this.request<CreateChatResponse>('POST', '/widget/chat', {
      visitor_id: visitorId,
    });
  }

  /** POST /widget/chat/{chatId}/messages — send a visitor message. */
  async sendMessage(chatId: number, content: string): Promise<Message> {
    return this.request<Message>('POST', `/widget/chat/${chatId}/messages`, { content });
  }

  /** GET /widget/chat/{chatId}/messages — fetch message history. */
  async getMessages(chatId: number): Promise<Message[]> {
    return this.request<Message[]>('GET', `/widget/chat/${chatId}/messages`);
  }
}
