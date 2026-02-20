import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CrmSdkConfig } from './types';
import Widget from './Widget';
import widgetCSS from './widget.css';

export interface CrmSdkProps {
    workspaceId: string;
    publicKey: string;
    apiUrl?: string;
    wsUrl?: string;
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
export function CrmSdk({ workspaceId, publicKey, apiUrl, wsUrl }: CrmSdkProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    const config: CrmSdkConfig = useMemo(
        () => ({ workspaceId, publicKey, apiUrl, wsUrl }),
        [workspaceId, publicKey, apiUrl, wsUrl],
    );

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        // Attach shadow DOM once
        const shadow = host.attachShadow({ mode: 'open' });

        // Inject compiled Tailwind CSS
        const style = document.createElement('style');
        style.textContent = widgetCSS;
        shadow.appendChild(style);

        // React mount target
        const container = document.createElement('div');
        container.className = 'font-widget';
        shadow.appendChild(container);

        setPortalTarget(container);
    }, []);

    return (
        <>
            <div ref={hostRef} style={{ position: 'contents' as any }} />
            {portalTarget && createPortal(<Widget config={config} />, portalTarget)}
        </>
    );
}