/**
 * Info Tooltip Component
 * Shows an information icon with a tooltip that uses React Portal
 * to position on top of all panels, outside the component hierarchy.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import './InfoTooltip.css';

export interface InfoTooltipProps {
  title: string;
  children?: React.ReactNode;
}

const InfoIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

export function InfoTooltip({ title, children }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <div className="info-tooltip-container">
        <span
          className="info-icon"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          onClick={() => setIsVisible(!isVisible)}
          aria-label="Information"
          role="button"
          tabIndex={0}
          aria-expanded={isVisible}
        >
          <InfoIcon />
        </span>
      </div>
      {isVisible && (
        createPortal(
          <div className="info-tooltip-tooltip-panel visible">
            <div className="tooltip-close" onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}>
              ✕
            </div>
            <div className="info-tooltip-title">{title}</div>
            {children && <div className="info-tooltip-content">{children}</div>}
          </div>,
          document.body
        )
      )}
    </>
  );
}

export default InfoTooltip;
