import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  accentColor = 'var(--color-accent)',
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="collapsible-section">
      <button 
        className="section-header"
        onClick={() => setIsOpen(!isOpen)}
        style={{ borderLeftColor: accentColor }}
      >
        <div className="section-title">
          {icon && <span className="section-icon">{icon}</span>}
          <span className="section-title-text">{title}</span>
        </div>
        <span className="section-toggle">
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <div className="section-content">
          {children}
        </div>
      )}
    </div>
  );
}

export default CollapsibleSection;