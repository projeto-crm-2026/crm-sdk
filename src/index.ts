/**
 * CRM Chat Widget SDK
 *
 * Embeddable SDK for integrating the CRM chat widget into any web page.
 */

export interface CrmSdkConfig {
  /** The unique identifier for the CRM workspace. */
  workspaceId: string;
  /** Optional base URL for the CRM API. Defaults to the production endpoint. */
  apiUrl?: string;
}

/**
 * Initializes the CRM Chat Widget and mounts it into the document.
 *
 * @param config - SDK configuration options.
 */
export function init(config: CrmSdkConfig): void {
  if (!config.workspaceId) {
    throw new Error('[crm-sdk] workspaceId is required');
  }
  // Widget bootstrap logic will be added in subsequent milestones.
  console.log(`[crm-sdk] initialized for workspace: ${config.workspaceId}`);
}

export const version = '0.1.0';
