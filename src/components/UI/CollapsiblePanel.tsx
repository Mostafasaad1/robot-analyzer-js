/**
 * Collapsible Panel Component
 * Reusable accordion wrapper for sidebar panel groups
 */

import { useState } from 'react';

interface CollapsiblePanelProps {
    title: string;
    icon: string;
    defaultOpen?: boolean;
    accentColor?: string;
    children: React.ReactNode;
}

export function CollapsiblePanel({
    title,
    icon,
    defaultOpen = false,
    accentColor,
    children,
}: CollapsiblePanelProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const accentStyle = accentColor
        ? { '--panel-accent': accentColor } as React.CSSProperties
        : undefined;

    return (
        <div
            className={`collapsible-panel ${isOpen ? 'collapsible-open' : ''}`}
            style={accentStyle}
            role="region"
            aria-label={title}
        >
            <button
                className="collapsible-header"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span className="collapsible-icon">{icon}</span>
                <span className="collapsible-title">{title}</span>
                <span className="collapsible-chevron">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                            d="M3 4.5L6 7.5L9 4.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            </button>
            {isOpen && (
                <div className="collapsible-content">
                    <div className="collapsible-inner">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CollapsiblePanel;
