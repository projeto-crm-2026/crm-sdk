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

import React from 'react';
import { createRoot } from 'react-dom/client';

import { CrmSdkConfig } from './types';
import Widget from './Widget';
import widgetCSS from './widget.css';

let _mounted = false;

/**
 * Initializes the CRM Chat Widget and mounts it into the document.
 * Calling `init` more than once is a no-op.
 *
 * @param config - SDK configuration options.
 */
export function init(config: CrmSdkConfig): void {
  if (!config.workspaceId) {
    throw new Error('[crm-sdk] workspaceId is required');
  }
  if (_mounted) return;
  _mounted = true;

  const bootstrap = () => {
    // Host element appended to <body>
    const host = document.createElement('div');
    host.id = 'crm-widget-host';
    document.body.appendChild(host);

    // Shadow root provides full CSS isolation
    const shadow = host.attachShadow({ mode: 'open' });

    // Inject Tailwind CSS (processed at build time) into shadow root
    const style = document.createElement('style');
    style.textContent = widgetCSS;
    shadow.appendChild(style);

    // React root container — inherits font-widget via className
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
