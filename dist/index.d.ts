/**
 * CRM Chat Widget SDK
 *
 * Embeddable SDK for integrating the CRM chat widget into any website.
 * Built with React + TypeScript + Tailwind CSS. Styles are injected at
 * runtime into an isolated Shadow DOM — no external CSS files required.
 *
 * @example
 * ```html
 * <script src="crm-sdk.umd.js"></script>
 * <script>CrmSdk.init({ workspaceId: 'YOUR_WORKSPACE_ID' });</script>
 * ```
 *
 * @example
 * ```ts
 * import { init } from '@projeto-crm-2026/crm-sdk';
 * init({ workspaceId: 'YOUR_WORKSPACE_ID' });
 * ```
 */
export type { CrmSdkConfig } from './types';
export { version } from './version';
import { CrmSdkConfig } from './types';
/**
 * Initializes the CRM Chat Widget and mounts it into the document.
 * Calling `init` more than once is a no-op.
 *
 * @param config - SDK configuration options.
 */
export declare function init(config: CrmSdkConfig): void;
