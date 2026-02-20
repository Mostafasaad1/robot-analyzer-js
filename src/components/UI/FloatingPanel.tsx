import React, { useState, useCallback, useRef, useEffect } from 'react';

interface FloatingPanelProps {
  title: string;
  icon: string;
  accentColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  defaultMinimized?: boolean;
  position?: { x: number; y: number };
  onStateChange?: (state: 'expanded' | 'collapsed' | 'minimized') => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
}

type PanelState = 'expanded' | 'collapsed' | 'minimized';

export function FloatingPanel({
  title,
  icon,
  accentColor,
  children,
  defaultOpen = true,
  defaultMinimized = false,
  position: initialPosition = { x: 0, y: 0 },
  onStateChange,
  onPositionChange,
}: FloatingPanelProps) {
  const [state, setState] = useState<PanelState>(
    defaultMinimized ? 'minimized' : defaultOpen ? 'expanded' : 'collapsed'
  );
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const currentPositionRef = useRef(initialPosition);

  // Sync position ref with state and update DOM
  useEffect(() => {
    currentPositionRef.current = position;
    if (panelRef.current && !isDragging) {
      panelRef.current.style.transform = `translate(${position.x}px, ${position.y}px)`;
    }
  }, [position, isDragging]);

  // Optimized drag handlers with direct DOM manipulation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.panel-controls')) {
      return;
    }
    isDraggingRef.current = true;
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - currentPositionRef.current.x,
      y: e.clientY - currentPositionRef.current.y,
    };
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;
    
    // Boundary checking
    const panelWidth = panelRef.current?.offsetWidth || 320;
    const panelHeight = panelRef.current?.offsetHeight || 500;
    const maxX = window.innerWidth - panelWidth;
    const maxY = window.innerHeight - panelHeight;
    
    const boundedX = Math.max(0, Math.min(newX, maxX));
    const boundedY = Math.max(0, Math.min(newY, maxY));
    
    currentPositionRef.current = { x: boundedX, y: boundedY };
    
    // Direct DOM update for maximum performance
    if (panelRef.current) {
      panelRef.current.style.transform = `translate(${boundedX}px, ${boundedY}px)`;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      setPosition(currentPositionRef.current);
      if (onPositionChange) {
        onPositionChange(currentPositionRef.current);
      }
    }
  }, [onPositionChange]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const toggleExpand = useCallback(() => {
    const newState = state === 'expanded' ? 'collapsed' : 'expanded';
    setState(newState);
    if (onStateChange) onStateChange(newState);
  }, [state, onStateChange]);

  const toggleMinimize = useCallback(() => {
    const newState = state === 'minimized' ? 'expanded' : 'minimized';
    setState(newState);
    if (onStateChange) onStateChange(newState);
  }, [state, onStateChange]);

  const handleClose = useCallback(() => {
    setState('collapsed');
    if (onStateChange) onStateChange('collapsed');
  }, [onStateChange]);

  return (
    <div 
      ref={panelRef}
      className={`floating-panel floating-panel-${state}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        '--panel-accent': accentColor,
      } as React.CSSProperties}
    >
      <div 
        className="panel-header"
        onMouseDown={handleMouseDown}
      >
        <div className="panel-title">
          <span className="panel-icon">{icon}</span>
          <span className="panel-title-text">{title}</span>
        </div>
        <div className="panel-controls">
          <button 
            className="panel-control-btn minimize-btn"
            onClick={toggleMinimize}
            title={state === 'minimized' ? 'Expand' : 'Minimize'}
          >
            {state === 'minimized' ? '⤢' : '🗕'}
          </button>
          <button 
            className="panel-control-btn expand-btn"
            onClick={toggleExpand}
            title={state === 'expanded' ? 'Collapse' : 'Expand'}
          >
            {state === 'expanded' ? '−' : '+'}
          </button>
          <button 
            className="panel-control-btn close-btn"
            onClick={handleClose}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>
      
      {state !== 'minimized' && (
        <div className="panel-content">
          {state === 'expanded' && (
            <div className="panel-content-inner">
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FloatingPanel;