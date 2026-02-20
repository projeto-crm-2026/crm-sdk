import { Message } from './types';
type MessageCallback = (msg: Message) => void;
export declare class WsClient {
    private readonly url;
    private readonly onMessage;
    private ws;
    private reconnectTimer;
    private closed;
    constructor(url: string, onMessage: MessageCallback);
    connect(): void;
    disconnect(): void;
}
export {};
