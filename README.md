# crm-sdk

> Embeddable CRM Chat Widget SDK — React 19 + TypeScript + Tailwind CSS, framework-agnostic.

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

The SDK renders a floating chat button and window (JivoChat / Zendesk style) on any website.  
Built with **React 19** and **Tailwind CSS v3**. All styles are processed at build time and injected at runtime into an isolated **Shadow DOM** — no external CSS files or global style conflicts.

## Features

- 💬 Floating launcher button + animated chat window (React components)
- 🎨 Color palette: `#60a5fa` (blue-400), `#2563eb` (blue-600), `#000` — font: *TASA Orbiter*
- 🎭 Tailwind CSS utility classes — responsive, animated, accessible
- 🔌 Connects to your CRM backend: `/widget/init`, `/widget/chat`, `/widget/chat/{chatID}/messages`, WebSocket
- 💾 Visitor session restored from `localStorage` between page loads
- 📱 Responsive — full-screen on mobile, floating panel on desktop
- 🔒 Shadow DOM isolation — zero CSS conflicts with the host page
- 📦 Three output formats: **UMD** (script tag), **ESM** (bundler), **CJS** (Node tooling)

## Installation

```bash
npm install @projeto-crm-2026/crm-sdk
```

Or load directly via a `<script>` tag (see [Integration](#integration)).

## Quick Start

### ES Module / bundler

```ts
import { init } from '@projeto-crm-2026/crm-sdk';

init({
  workspaceId: 'YOUR_WORKSPACE_ID',
  // apiUrl: 'https://your-crm-backend.example.com', // optional
});
```

### Script tag (UMD)

```html
<script src="https://unpkg.com/@projeto-crm-2026/crm-sdk/dist/crm-sdk.umd.js"></script>
<script>
  CrmSdk.init({ workspaceId: 'YOUR_WORKSPACE_ID' });
</script>
```

## Integration

See [`examples/index.html`](./examples/index.html) for a complete, copy-pasteable example.

## Configuration

| Option        | Type     | Required | Default                            | Description                                   |
|---------------|----------|----------|------------------------------------|-----------------------------------------------|
| `workspaceId` | `string` | ✅ yes   | —                                  | Your CRM workspace identifier                 |
| `apiUrl`      | `string` | no       | `https://api.crm.exemplo.com`      | Base URL for the CRM REST API                 |
| `wsUrl`       | `string` | no       | Derived from `apiUrl` (ws/wss)     | WebSocket server URL (overrides auto-derive)  |

## API Contract

The SDK communicates with the following endpoints:

| Method | Path                                | Description                             |
|--------|-------------------------------------|-----------------------------------------|
| `POST` | `/widget/init`                      | Exchange `workspaceId` + visitor ID for a session token |
| `POST` | `/widget/chat`                      | Create a new chat thread                |
| `POST` | `/widget/chat/{chatId}/messages`    | Send a visitor message                  |
| `GET`  | `/widget/chat/{chatId}/messages`    | Fetch message history                   |
| `WS`   | `/widget/ws?token=…&chatId=…`       | Real-time message push from agents      |

### POST /widget/init

**Request body**

```json
{ "workspaceId": "abc123", "visitorId": "optional-if-returning" }
```

**Response**

```json
{
  "visitorId": "vis_xyz",
  "chatId": "chat_abc",
  "token": "jwt...",
  "agentName": "Support",
  "agentAvatar": "https://…/avatar.png",
  "welcomeMessage": "Hi! How can we help?"
}
```

### POST /widget/chat

**Request body**

```json
{ "workspaceId": "abc123", "visitorId": "vis_xyz" }
```

**Response**

```json
{ "chatId": "chat_abc" }
```

### POST /widget/chat/{chatId}/messages

**Request body**

```json
{ "content": "Hello, I need help with my order." }
```

**Response** — the newly created message object:

```json
{
  "id": "msg_001",
  "chatId": "chat_abc",
  "content": "Hello, I need help with my order.",
  "sender": "visitor",
  "createdAt": "2026-02-20T17:00:00.000Z"
}
```

### WebSocket

Connect to `/widget/ws?token=<jwt>&chatId=<chatId>`.  
The server pushes JSON frames for incoming agent messages:

```json
{
  "id": "msg_002",
  "chatId": "chat_abc",
  "content": "Sure, let me look that up for you!",
  "sender": "agent",
  "createdAt": "2026-02-20T17:00:05.000Z"
}
```

The SDK automatically reconnects on disconnect (3 s delay).

## Development

```bash
# Install dependencies
npm install

# Build (outputs to dist/)
npm run build

# Watch mode
npm run dev

# Type-check without emitting files
npm run typecheck
```

## Output files

| File                   | Format | Use case                        |
|------------------------|--------|---------------------------------|
| `dist/crm-sdk.umd.js`  | UMD    | `<script>` tag, exposes `CrmSdk` global |
| `dist/crm-sdk.esm.js`  | ESM    | Modern bundlers (Vite, webpack, Rollup) |
| `dist/crm-sdk.cjs.js`  | CJS    | CommonJS / Node.js tooling      |
| `dist/index.d.ts`      | TS     | TypeScript type declarations    |

## Project Structure

```
crm-sdk/
├── src/
│   ├── index.ts        # Public API — exports init()
│   ├── Widget.tsx      # React widget (launcher + chat window)
│   ├── widget.css      # Tailwind CSS directives (processed at build time)
│   ├── api.ts          # HTTP client
│   ├── ws.ts           # WebSocket client
│   ├── session.ts      # localStorage session management
│   ├── types.ts        # Shared TypeScript interfaces
│   ├── typings.d.ts    # CSS module type declaration
│   └── version.ts      # Package version constant
├── examples/
│   └── index.html      # Integration example
├── dist/               # Built outputs (generated)
├── tailwind.config.js
├── rollup.config.mjs
├── tsconfig.json
├── package.json
└── README.md
```

## Tech Stack

| Tool           | Version | Role                         |
|----------------|---------|------------------------------|
| React          | 19      | UI components                |
| TypeScript     | 5       | Type safety                  |
| Tailwind CSS   | 3       | Utility-first styling        |
| Rollup         | 4       | UMD/ESM/CJS bundling         |
| PostCSS        | 8       | CSS processing pipeline      |
| Shadow DOM     | native  | Style isolation              |

## License

MIT — see [LICENSE](./LICENSE).


