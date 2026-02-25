/**
 * Workspace Visualization Panel
 * Computes and displays the robot's reachable workspace
 */
import React, { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';

export function WorkspacePanel(): JSX.Element {
  const {
    robotInfo,
    workspaceData,
    setWorkspaceData,
    toggleWorkspaceVisibility,
    setWorkspaceColor,
    setWorkspacePointSize,
  } = useSessionStore();

  const [numSamples, setNumSamples] = useState<number>(2000);
  const [method, setMethod] = useState<'random'>('random');
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady = !!robotInfo;

  const handleCompute = async () => {
    if (!isReady || isComputing) return;
    setIsComputing(true);
    setError(null);
    try {
      const result = await apiService.computeWorkspace(numSamples, method);
      setWorkspaceData({
        points: result.points,
        pointCount: result.pointCount,
        boundingBox: result.boundingBox,
        samplingMethod: result.samplingMethod,
        numSamples: result.numSamples,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to compute workspace');
    } finally {
      setIsComputing(false);
    }
  };

  const handleClear = () => {
    setWorkspaceData({ points: undefined, pointCount: undefined, boundingBox: undefined });
  };

  const showWorkspace = workspaceData?.showWorkspace ?? true;
  const color = workspaceData?.workspaceColor ?? '#60a5fa';
  const pointSize = workspaceData?.workspacePointSize ?? 0.08;

  const bbox = workspaceData?.boundingBox;
  const dimensions = bbox ? {
    x: (bbox.max[0] - bbox.min[0]).toFixed(3),
    y: (bbox.max[1] - bbox.min[1]).toFixed(3),
    z: (bbox.max[2] - bbox.min[2]).toFixed(3),
  } : null;

  if (!robotInfo) {
    return (
      <div className="workspace-panel">
        <h3>🔮 Workspace</h3>
        <div className="empty-state-mini">Load a robot first</div>
      </div>
    );
  }

  return (
    <div className="workspace-panel">
      <div className="panel-header">
        <h3>🔮 Workspace</h3>
        <button
          className={`toggle-btn ${showWorkspace ? 'active' : ''}`}
          onClick={toggleWorkspaceVisibility}
          title={showWorkspace ? 'Hide workspace' : 'Show workspace'}
        >
          {showWorkspace ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>

      <div className="panel-content">
        <div className="control-group">
          <label>
            <span>Samples:</span>
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={numSamples}
              onChange={(e) => setNumSamples(Math.max(100, Math.min(10000, parseInt(e.target.value) || 100)))}
              disabled={isComputing}
            />
          </label>
        </div>

        <div className="control-group">
          <button
            className="compute-btn"
            onClick={handleCompute}
            disabled={!isReady || isComputing}
          >
            {isComputing ? (
              <>
                <span className="spinner"></span>
                Computing...
              </>
            ) : (
              'Compute Workspace'
            )}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {workspaceData?.points && workspaceData.points.length > 0 && (
          <>
            <div className="divider"></div>
            
            <div className="control-group">
              <label>
                <span>Point Size:</span>
                <input
                  type="range"
                  min="0.01"
                  max="0.2"
                  step="0.01"
                  value={pointSize}
                  onChange={(e) => setWorkspacePointSize(parseFloat(e.target.value))}
                />
                <span className="value">{(pointSize ?? 0.08).toFixed(2)}</span>
              </label>
            </div>

            <div className="control-group">
              <label>
                <span>Color:</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setWorkspaceColor(e.target.value)}
                />
              </label>
            </div>

            <div className="control-group">
              <button className="clear-btn" onClick={handleClear}>
                Clear Workspace
              </button>
            </div>
          </>
        )}

        {workspaceData?.points && (
          <div className="stats">
            <div className="stat">
              <span className="label">Points:</span>
              <span className="value">{workspaceData.pointCount?.toLocaleString()}</span>
            </div>
            {dimensions && (
              <div className="stat">
                <span className="label">Size (m):</span>
                <span className="value">{dimensions.x} × {dimensions.y} × {dimensions.z}</span>
              </div>
            )}
            {workspaceData.samplingMethod && (
              <div className="stat">
                <span className="label">Method:</span>
                <span className="value">{workspaceData.samplingMethod}</span>
              </div>
            )}
          </div>
        )}

        {!isReady && (
          <div className="info-message">Upload a robot to compute workspace</div>
        )}
      </div>
    </div>
  );
}
