import { CreateChatResponse, InitResponse, Message } from './types';
export declare class ApiClient {
    private baseUrl;
    private token;
    constructor(baseUrl?: string);
    setToken(token: string): void;
    private request;
    /** POST /widget/init — exchange workspaceId + optional visitorId for a session token. */
    init(workspaceId: string, visitorId?: string): Promise<InitResponse>;
    /** POST /widget/chat — create a new chat thread. */
    createChat(workspaceId: string, visitorId: string): Promise<CreateChatResponse>;
    /** POST /widget/chat/{chatId}/messages — send a visitor message. */
    sendMessage(chatId: string, content: string): Promise<Message>;
    /** GET /widget/chat/{chatId}/messages — fetch message history. */
    getMessages(chatId: string): Promise<Message[]>;
}
