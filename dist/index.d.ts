/**
 * CRM Chat Widget SDK
 *
 * Can be used as:
 * 1. A React component: `<CrmSdk workspaceId="..." publicKey="..." />`
 * 2. A vanilla JS `init()` call for non-React sites.
 */
export type { CrmSdkConfig } from './types';
export { version } from './version';
export { CrmSdk } from './crm-sdk-provider';
export type { CrmSdkProps } from './crm-sdk-provider';
import { CrmSdkConfig } from './types';
/**
 * Initializes the CRM Chat Widget via vanilla JS (non-React sites).
 * Calling `init` more than once is a no-op.
 *
 * @param config - SDK configuration options.
 */
export declare function init(config: CrmSdkConfig): void;
