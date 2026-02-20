import { Message } from './types';
type MessageCallback = (msg: Message) => void;
export declare class WsClient {
    private readonly url;
    private readonly onMessage;
    private ws;
    private reconnectTimer;
    private closed;
    private pendingMessages;
    private readyPromise;
    private readyResolve;
    constructor(url: string, onMessage: MessageCallback);
    connect(): void;
    /** Wait until the WebSocket connection is open. */
    waitForOpen(): Promise<void>;
    /** Send a JSON message through the WebSocket. Queues if not yet open. */
    send(data: {
        type: string;
        content: string;
        visitor_id?: string;
    }): void;
    disconnect(): void;
}
export {};
