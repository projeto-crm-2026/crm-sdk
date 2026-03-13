export interface CrmSdkProps {
    workspaceId: string;
    publicKey: string;
}
/**
 * Drop-in React component that renders the CRM chat widget
 * inside an isolated Shadow DOM.
 *
 * @example
 * ```tsx
 * import { CrmSdk } from '@projeto-crm-2026/crm-sdk';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <CrmSdk workspaceId="ws_123" publicKey="pk_abc" />
 *     </>
 *   );
 * }
 * ```
 */
export declare function CrmSdk({ workspaceId, publicKey }: CrmSdkProps): import("react/jsx-runtime").JSX.Element;
