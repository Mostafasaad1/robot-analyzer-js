import { useState, useCallback } from 'react';
import { FloatingPanel } from './FloatingPanel';
import './FloatingPanel.css';

interface PanelConfig {
  id: string;
  title: string;
  icon: string;
  accentColor: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
  defaultMinimized?: boolean;
  position?: { x: number; y: number };
}

interface FloatingPanelManagerProps {
  panels: PanelConfig[];
}

type PanelState = 'expanded' | 'collapsed' | 'minimized';

interface PanelStateRecord {
  state: PanelState;
  position: { x: number; y: number };
}

export function FloatingPanelManager({ panels }: FloatingPanelManagerProps) {
  const [panelStates, setPanelStates] = useState<Record<string, PanelStateRecord>>(
    panels.reduce((acc, panel) => ({
      ...acc,
      [panel.id]: {
        state: panel.defaultMinimized ? 'minimized' : panel.defaultOpen ? 'expanded' : 'collapsed',
        position: panel.position || { x: 0, y: 0 }
      }
    }), {})
  );

  const updatePanelState = useCallback((panelId: string, newState: PanelState) => {
    setPanelStates(prev => ({
      ...prev,
      [panelId]: {
        ...prev[panelId],
        state: newState
      }
    }));
  }, []);

  const updatePanelPosition = useCallback((panelId: string, position: { x: number; y: number }) => {
    setPanelStates(prev => ({
      ...prev,
      [panelId]: {
        ...prev[panelId],
        position
      }
    }));
  }, []);

  const toggleAllPanels = useCallback((state: PanelState) => {
    setPanelStates(prev => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach(panelId => {
        newStates[panelId].state = state;
      });
      return newStates;
    });
  }, []);

  const autoSortPanels = useCallback(() => {
    const panelWidth = 320;
    const panelHeight = 500;
    const gap = 20;
    const startX = 20;
    const startY = 80;
    const maxColumns = Math.floor((window.innerWidth - startX) / (panelWidth + gap));

    setPanelStates(prev => {
      const newStates = { ...prev };
      let x = startX;
      let y = startY;
      let col = 0;

      panels.forEach(panel => {
        // Only sort visible panels (not collapsed)
        if (newStates[panel.id].state !== 'collapsed') {
          newStates[panel.id] = {
            ...newStates[panel.id],
            position: { x, y }
          };
          col++;
          if (col >= maxColumns) {
            col = 0;
            x = startX;
            y += panelHeight + gap;
          } else {
            x += panelWidth + gap;
          }
        }
      });
      return newStates;
    });
  }, [panels]);

  const getMinimizedPanels = useCallback(() => {
    return panels.filter(panel => panelStates[panel.id]?.state === 'minimized');
  }, [panels, panelStates]);

  const getVisiblePanels = useCallback(() => {
    return panels.filter(panel => panelStates[panel.id]?.state !== 'minimized' && panelStates[panel.id]?.state !== 'collapsed');
  }, [panels, panelStates]);

  return (
    <>
      {/* Floating Panels - Only show expanded panels */}
      {getVisiblePanels().map(panel => {
        const panelState = panelStates[panel.id];
        if (!panelState) return null;

        return (
          <FloatingPanel
            key={panel.id}
            title={panel.title}
            icon={panel.icon}
            accentColor={panel.accentColor}
            defaultOpen={panelState.state === 'expanded'}
            defaultMinimized={false}
            position={panelState.position}
            onStateChange={(newState) => updatePanelState(panel.id, newState)}
            onPositionChange={(newPosition) => updatePanelPosition(panel.id, newPosition)}
          >
            {panel.content}
          </FloatingPanel>
        );
      })}

      {/* Panel Dock for minimized panels */}
      {getMinimizedPanels().length > 0 && (
        <div className="panel-dock">
          {getMinimizedPanels().map(panel => (
            <div
              key={panel.id}
              className="docked-panel"
              onClick={() => updatePanelState(panel.id, 'expanded')}
              style={{ borderLeftColor: panel.accentColor }}
            >
              <div className="docked-title">
                <span className="docked-icon">{panel.icon}</span>
                <span>{panel.title}</span>
              </div>
              <div className="docked-controls">
                <button
                  className="docked-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    updatePanelState(panel.id, 'expanded');
                  }}
                  title="Expand"
                >
                  ⤢
                </button>
                <button
                  className="docked-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    updatePanelState(panel.id, 'collapsed');
                  }}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Control Panel */}
      <div className="floating-panel floating-panel-expanded" style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        width: '200px',
        height: 'auto',
        zIndex: 1001
      }}>
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-icon">⚙️</span>
            <span className="panel-title-text">Controls</span>
          </div>
        </div>
        <div className="panel-content-inner">
          <div className="control-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="compute-btn"
              onClick={() => toggleAllPanels('expanded')}
            >
              Expand All
            </button>
            <button
              className="compute-btn"
              onClick={() => toggleAllPanels('minimized')}
            >
              Minimize All
            </button>
            <button
              className="compute-btn"
              onClick={() => toggleAllPanels('collapsed')}
            >
              Close All
            </button>
            <button
              className="compute-btn"
              onClick={autoSortPanels}
            >
              Auto Sort
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default FloatingPanelManager;