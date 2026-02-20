/**
 * Public SDK configuration passed to `init()`.
 */
export interface CrmSdkConfig {
    /** The unique identifier for the CRM workspace. */
    workspaceId: string;
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
    chatId?: string;
    token?: string;
}
/**
 * A single chat message.
 */
export interface Message {
    id: string;
    chatId: string;
    content: string;
    sender: 'visitor' | 'agent';
    createdAt: string;
}
/**
 * Response from POST /widget/init.
 */
export interface InitResponse {
    visitorId: string;
    chatId?: string;
    token: string;
    agentName?: string;
    agentAvatar?: string;
    welcomeMessage?: string;
}
/**
 * Response from POST /widget/chat.
 */
export interface CreateChatResponse {
    chatId: string;
}
