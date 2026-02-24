/**
 * Max Torque Panel
 * Shows the maximum torque each joint dynamically faces across the workspace
 */

import { useState, useEffect } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';

export function MaxTorquePanel() {
  const { robotInfo, jointPositions } = useSessionStore();
  const [maxTorques, setMaxTorques] = useState<number[] | null>(null);
  const [gravityTorques, setGravityTorques] = useState<number[] | null>(null);
  const [jointNames, setJointNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [velocity, setVelocity] = useState<number>(0);
  const [acceleration, setAcceleration] = useState<number>(0);
  const [perJointVelocity, setPerJointVelocity] = useState<number[]>([]);
  const [perJointAcceleration, setPerJointAcceleration] = useState<number[]>([]);

  // Initialize per-joint arrays when robot info is available
  useEffect(() => {
    if (robotInfo && robotInfo.dof > 0) {
      setPerJointVelocity(new Array(robotInfo.dof).fill(0));
      setPerJointAcceleration(new Array(robotInfo.dof).fill(0));
    }
  }, [robotInfo]);

  const handleCompute = async () => {
    if (!robotInfo) return;
    setLoading(true);
    setError(null);
    try {
      const velocities = showAdvanced ? perJointVelocity : new Array(robotInfo.dof).fill(velocity);
      const accelerations = showAdvanced ? perJointAcceleration : new Array(robotInfo.dof).fill(acceleration);
      const result = await apiService.computeMaxTorques(jointPositions, velocities, accelerations);
      setMaxTorques(result.max_torques);
      setGravityTorques(result.current_gravity_torques);
      setJointNames(result.joint_names);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVelocityChange = (value: number) => {
    setVelocity(value);
    // Update per-joint arrays when uniform velocity changes
    if (robotInfo && robotInfo.dof > 0 && perJointVelocity.length === robotInfo.dof) {
      setPerJointVelocity(new Array(robotInfo.dof).fill(value));
    }
  };

  const handleAccelerationChange = (value: number) => {
    setAcceleration(value);
    // Update per-joint arrays when uniform acceleration changes
    if (robotInfo && robotInfo.dof > 0 && perJointAcceleration.length === robotInfo.dof) {
      setPerJointAcceleration(new Array(robotInfo.dof).fill(value));
    }
  };

    if (!robotInfo) {
        return (
            <div className="dynamics-panel">
                <h3>📊 Max Dynamic Torques</h3>
                <div className="empty-state-mini">Load a robot first</div>
            </div>
        );
    }

    const globalMax = maxTorques ? Math.max(...maxTorques) : 1;

    return (
      <div className="dynamics-panel">
        <h3>📊 Max Dynamic Torques</h3>
        <p className="panel-description">Peak torque each joint faces across workspace</p>
  
        <div className="input-group" style={{ marginBottom: '12px' }}>
          <label htmlFor="velocity" className="input-label" style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#a0a0a0' }}>
            Joint Velocity (rad/s)
          </label>
          <input
            id="velocity"
            type="number"
            step="0.01"
            value={velocity}
            onChange={(e) => handleVelocityChange(parseFloat(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '14px',
              border: '1px solid #3a3a5a',
              borderRadius: '6px',
              background: '#2a2a3a',
              color: '#ffffff',
              boxSizing: 'border-box'
            }}
            placeholder="0"
          />
        </div>
  
        <div className="input-group" style={{ marginBottom: '12px' }}>
          <label htmlFor="acceleration" className="input-label" style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#a0a0a0' }}>
            Joint Acceleration (rad/s²)
          </label>
          <input
            id="acceleration"
            type="number"
            step="0.01"
            value={acceleration}
            onChange={(e) => handleAccelerationChange(parseFloat(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '14px',
              border: '1px solid #3a3a5a',
              borderRadius: '6px',
              background: '#2a2a3a',
              color: '#ffffff',
              boxSizing: 'border-box'
            }}
            placeholder="0"
          />
        </div>

        <button
          className="compute-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ marginBottom: '12px', background: '#2a3a5a' }}
        >
          {showAdvanced ? '▲ Simple Mode' : '▼ Advanced: Per-Joint'}
        </button>

        {showAdvanced && robotInfo && (
          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', padding: '10px', background: '#1e1e2e', borderRadius: '6px', border: '1px solid #3a3a5a' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#a0a0a0' }}>Per-Joint Velocities & Accelerations</h4>
            {robotInfo.jointNames.map((name, i) => (
              <div key={i} style={{ marginBottom: '10px', padding: '8px', background: '#2a2a3a', borderRadius: '4px' }}>
                <div style={{ marginBottom: '6px', fontSize: '12px', color: '#d0d0d0', fontWeight: 'bold' }}>{name}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '10px', color: '#808080', marginBottom: '2px' }}>Vel (rad/s)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={perJointVelocity[i] || 0}
                      onChange={(e) => {
                        const newVals = [...perJointVelocity];
                        newVals[i] = parseFloat(e.target.value) || 0;
                        setPerJointVelocity(newVals);
                      }}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '12px',
                        border: '1px solid #3a3a5a',
                        borderRadius: '4px',
                        background: '#1a1a2a',
                        color: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '10px', color: '#808080', marginBottom: '2px' }}>Acc (rad/s²)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={perJointAcceleration[i] || 0}
                      onChange={(e) => {
                        const newVals = [...perJointAcceleration];
                        newVals[i] = parseFloat(e.target.value) || 0;
                        setPerJointAcceleration(newVals);
                      }}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '12px',
                        border: '1px solid #3a3a5a',
                        borderRadius: '4px',
                        background: '#1a1a2a',
                        color: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="compute-btn" onClick={handleCompute} disabled={loading}>
          {loading ? '⏳ Sampling workspace...' : '▶ Compute Max Torques'}
        </button>

            {error && <div className="error-message">{error}</div>}

            {maxTorques && (
                <div className="dynamics-results">
                    <h4>Max Torques (Gravity)</h4>
                    {(jointNames.length > 0 ? jointNames : robotInfo.jointNames).map((name, i) => (
                        <div key={i} className="result-row">
                            <span className="result-label" title={name}>{name}</span>
                            <div className="result-bar-container">
                                <div
                                    className="result-bar result-bar-max"
                                    style={{ width: `${(maxTorques[i] / globalMax) * 100}%` }}
                                />
                                {gravityTorques && (
                                    <div
                                        className="result-bar result-bar-current"
                                        style={{ width: `${(Math.abs(gravityTorques[i]) / globalMax) * 100}%` }}
                                    />
                                )}
                            </div>
                            <span className="result-value">{maxTorques[i].toFixed(4)} N·m</span>
                        </div>
                    ))}
                    {gravityTorques && (
                        <div className="legend">
                            <span className="legend-item"><span className="legend-color legend-max"></span> Max across workspace</span>
                            <span className="legend-item"><span className="legend-color legend-current"></span> Current config</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default MaxTorquePanel;
