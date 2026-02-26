/**
 * Workspace Visualization Panel
 * Computes and displays the robot's reachable workspace with boundary mesh
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
    toggleWorkspaceMeshVisibility,
    setWorkspaceMeshColor,
    setWorkspaceMeshOpacity,
    } = useSessionStore();

  // Ray-casting parameters
  const [numRays, setNumRays] = useState<number>(500);
  const [epsilon, setEpsilon] = useState<number>(0.001); // 1mm precision
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady = !!robotInfo;

  const handleCompute = async () => {
    if (!isReady || isComputing) return;
    setIsComputing(true);
    setError(null);
    try {
      const result = await apiService.computeWorkspaceWithBoundary(numRays, epsilon);
      setWorkspaceData({
        points: result.points,
        pointCount: result.pointCount,
        boundingBox: result.boundingBox,
        samplingMethod: result.samplingMethod,
        numSamples: result.numSamples,
        boundaryMethod: 'ray_casting',
        boundary: result.boundary,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to compute workspace');
    } finally {
      setIsComputing(false);
    }
  };

  const handleClear = () => {
    setWorkspaceData({
      points: undefined,
      pointCount: undefined,
      boundingBox: undefined,
      boundary: undefined,
      boundaryMethod: undefined,
    });
  };

  const showWorkspace = workspaceData?.showWorkspace ?? true;
  const showMesh = workspaceData?.showWorkspaceMesh ?? true;
  const pointColor = workspaceData?.workspaceColor ?? '#60a5fa';
  const pointSize = workspaceData?.workspacePointSize ?? 0.08;
  const meshColor = workspaceData?.workspaceMeshColor ?? '#34d399';
  const meshOpacity = workspaceData?.workspaceMeshOpacity ?? 0.3;

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
        {/* Ray-Casting Settings */}
        <div className="control-group">
          <label className="slider-label">
            <span>Rays: {numRays}</span>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={numRays}
              onChange={(e) => setNumRays(parseInt(e.target.value))}
              disabled={isComputing}
            />
          </label>
        </div>

        <div className="control-group">
          <label className="slider-label">
            <span>Precision: {(epsilon * 1000).toFixed(1)} mm</span>
            <input
              type="range"
              min="0.0001"
              max="0.01"
              step="0.0001"
              value={epsilon}
              onChange={(e) => setEpsilon(parseFloat(e.target.value))}
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

            {/* Point Visualization Controls */}
            <div className="section-header">
              <span>Points</span>
            </div>
            <div className="control-group">
              <label className="slider-label">
                <span>Size</span>
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
              <label className="color-label">
                <span>Color</span>
                <input
                  type="color"
                  value={pointColor}
                  onChange={(e) => setWorkspaceColor(e.target.value)}
                />
              </label>
            </div>

            {/* Mesh Visualization Controls */}
            {workspaceData.boundary && (
              <>
                <div className="section-header">
                  <span>Boundary Mesh</span>
                </div>
                <div className="control-group">
                  <label className="toggle-label">
                    <span>Show Mesh</span>
                    <button
                      className={`toggle-smaller ${showMesh ? 'active' : ''}`}
                      onClick={toggleWorkspaceMeshVisibility}
                    >
                      {showMesh ? 'ON' : 'OFF'}
                    </button>
                  </label>
                </div>

                {showMesh && (
                  <>
                    <div className="control-group">
                      <label className="color-label">
                        <span>Mesh Color</span>
                        <input
                          type="color"
                          value={meshColor}
                          onChange={(e) => setWorkspaceMeshColor(e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="control-group">
                      <label className="slider-label">
                        <span>Opacity</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={meshOpacity}
                          onChange={(e) => setWorkspaceMeshOpacity(parseFloat(e.target.value))}
                        />
                        <span className="value">{(meshOpacity ?? 0.3).toFixed(2)}</span>
                      </label>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="control-group">
              <button className="clear-btn" onClick={handleClear}>
                Clear Workspace
              </button>
            </div>
          </>
        )}

        {/* Statistics */}
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
        {workspaceData.boundaryMethod && (
          <div className="stat">
            <span className="label">Method:</span>
            <span className="value">{workspaceData.boundaryMethod.replace('_', ' ')}</span>
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
