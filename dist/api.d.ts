import { CreateChatResponse, InitResponse, Message } from './types';
export declare class ApiClient {
    private baseUrl;
    private publicKey;
    private token;
    constructor(publicKey: string, baseUrl?: string);
    setToken(token: string): void;
    private request;
    /** POST /widget/init — exchange workspaceId + optional visitorId for a session token. */
    init(workspaceId: string, visitorId?: string, chatId?: number): Promise<InitResponse>;
    /** POST /widget/chat — create a new chat thread. */
    createChat(visitorId: string): Promise<CreateChatResponse>;
    /** POST /widget/chat/{chatId}/messages — send a visitor message. */
    sendMessage(chatId: number, content: string): Promise<Message>;
    /** GET /widget/chat/{chatId}/messages — fetch message history. */
    getMessages(chatId: number): Promise<Message[]>;
}
