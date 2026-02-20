/**
 * Public SDK configuration passed to `init()`.
 */
export interface CrmSdkConfig {
  /** The unique identifier for the CRM workspace. */
  workspaceId: string;
  /** Public API key used to authenticate widget requests (`X-Widget-Key` header). */
  publicKey: string;
  /** Base URL for the CRM API. Defaults to the production endpoint. */
  apiUrl?: string;
  /** Base URL for the CRM WebSocket endpoint. Inferred from apiUrl when omitted. */
  wsUrl?: string;
}

/**
 * Visitor session persisted in localStorage.
 */
export interface VisitorSession {
  visitorId: string;
  chatId?: number;
  token?: string;
}

/**
 * A single chat message.
 */
export interface Message {
  id?: string;
  type?: string;
  chat_id: number;
  content: string;
  sender_id?: number | null;
  visitor_id?: string;
  created_at: string;
}

/**
 * Response from POST /widget/init.
 */
export interface InitResponse {
  visitor_id: string;
  token: string;
  chat?: {
    id: number;
    uuid: string;
    status: string;
    origin: string;
  };
}

/**
 * Response from POST /widget/chat.
 */
export interface CreateChatResponse {
  id: number;
  uuid: string;
  status: string;
  origin: string;
}
