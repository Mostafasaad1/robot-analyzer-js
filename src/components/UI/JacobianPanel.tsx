/**
 * Jacobian Panel
 * Shows the 6×n Jacobian matrix, manipulability score, and singular values
 */

import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';
import { InfoTooltip } from './InfoTooltip';

interface JacobianData {
    jacobian: number[][];
    manipulability: number;
    singular_values: number[];
    shape: number[];
}

export function JacobianPanel() {
    const { robotInfo, jointPositions } = useSessionStore();
    const [data, setData] = useState<JacobianData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

  const handleCompute = async () => {
    if (!robotInfo) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.computeJacobian(jointPositions);
      setData(result);
      
      // Update session store for PDF export
      const { useSessionStore } = await import('../../stores/sessionStore');
      useSessionStore.getState().updateComputedData({ jacobian: result.jacobian });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

    if (!robotInfo) {
        return (
            <div className="dynamics-panel">
                <h3>🧮 Jacobian <InfoTooltip title="Jacobian">Compute the 6×n Jacobian matrix, manipulability score, and singular values at the current configuration.</InfoTooltip></h3>
                <div className="empty-state-mini">Load a robot first</div>
            </div>
        );
    }

    const rowLabels = ['vx', 'vy', 'vz', 'ωx', 'ωy', 'ωz'];

    return (
        <div className="dynamics-panel">
            <h3>🧮 Jacobian <InfoTooltip title="Jacobian">Compute the 6×n Jacobian matrix, manipulability score, and singular values at the current configuration.</InfoTooltip></h3>
            <p className="panel-description">6×n matrix mapping joint velocities to end-effector velocity</p>

            <button className="compute-btn" onClick={handleCompute} disabled={loading}>
                {loading ? '⏳ Computing...' : '▶ Compute Jacobian'}
            </button>

            {error && <div className="error-message">{error}</div>}

            {data && (
                <div className="dynamics-results">
                    <div className="jacobian-metrics">
                        <div className={`metric-card ${data.manipulability < 0.01 ? 'metric-warning' : 'metric-ok'}`}>
                            <span className="metric-label">Manipulability</span>
                            <span className="metric-value">{data.manipulability.toExponential(3)}</span>
                            {data.manipulability < 0.01 && <span className="metric-badge">⚠ Near Singularity</span>}
                        </div>
                    </div>

                    <div className="sv-section">
                        <span className="sv-label">Singular Values:</span>
                        <div className="sv-bars">
                            {data.singular_values.map((sv, i) => {
                                const maxSv = Math.max(...data.singular_values);
                                return (
                                    <div key={i} className="sv-bar-row">
                                        <span className="sv-index">σ{i + 1}</span>
                                        <div className="sv-bar-bg">
                                            <div
                                                className="sv-bar"
                                                style={{ width: `${(sv / maxSv) * 100}%` }}
                                            />
                                        </div>
                                        <span className="sv-value">{sv.toFixed(4)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="matrix-container">
                        <table className="matrix-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    {robotInfo.jointNames.map((name, j) => (
                                        <th key={j} title={name}>{name.length > 6 ? name.slice(0, 5) + '…' : name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.jacobian.map((row, i) => (
                                    <tr key={i}>
                                        <td className="row-label">{rowLabels[i]}</td>
                                        {row.map((val, j) => {
                                            const absMax = Math.max(...data.jacobian.flat().map(Math.abs), 0.001);
                                            const intensity = Math.abs(val) / absMax;
                                            const hue = val >= 0 ? 200 : 0;
                                            return (
                                                <td
                                                    key={j}
                                                    className="matrix-cell"
                                                    style={{ backgroundColor: `hsla(${hue}, 80%, 50%, ${intensity * 0.6})` }}
                                                    title={val.toFixed(6)}
                                                >
                                                    {val.toFixed(3)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default JacobianPanel;
