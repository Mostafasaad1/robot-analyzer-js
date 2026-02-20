/**
 * Max Torque Panel
 * Shows the maximum torque each joint dynamically faces across the workspace
 */

import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';

export function MaxTorquePanel() {
    const { robotInfo, jointPositions } = useSessionStore();
    const [maxTorques, setMaxTorques] = useState<number[] | null>(null);
    const [gravityTorques, setGravityTorques] = useState<number[] | null>(null);
    const [jointNames, setJointNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCompute = async () => {
        if (!robotInfo) return;
        setLoading(true);
        setError(null);
        try {
            const result = await apiService.computeMaxTorques(jointPositions);
            setMaxTorques(result.max_torques);
            setGravityTorques(result.current_gravity_torques);
            setJointNames(result.joint_names);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
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
