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

import React from 'react';
import { createRoot } from 'react-dom/client';

import { CrmSdkConfig } from './types';
import Widget from './Widget';
import widgetCSS from './widget.css';

let _mounted = false;

/**
 * Initializes the CRM Chat Widget via vanilla JS (non-React sites).
 * Calling `init` more than once is a no-op.
 *
 * @param config - SDK configuration options.
 */
export function init(config: CrmSdkConfig): void {
  console.log('[crm-sdk] init() called with config:', config);
  if (!config.workspaceId) {
    throw new Error('[crm-sdk] workspaceId is required');
  }
  if (!config.publicKey) {
    throw new Error('[crm-sdk] publicKey is required');
  }
  if (_mounted) return;
  _mounted = true;

  const bootstrap = () => {
    const host = document.createElement('div');
    host.id = 'crm-widget-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = widgetCSS;
    shadow.appendChild(style);

    const container = document.createElement('div');
    container.className = 'font-widget';
    shadow.appendChild(container);

    createRoot(container).render(React.createElement(Widget, { config }));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}