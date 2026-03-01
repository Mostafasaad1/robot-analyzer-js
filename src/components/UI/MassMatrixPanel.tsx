/**
 * Mass Matrix Panel
 * Shows the joint-space inertia matrix as a heatmap with diagonal bars
 */

import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';
import { InfoTooltip } from './InfoTooltip';

interface MassMatrixData {
    mass_matrix: number[][];
    diagonal: number[];
    condition_number: number;
    size: number;
}

export function MassMatrixPanel() {
    const { robotInfo, jointPositions } = useSessionStore();
    const [data, setData] = useState<MassMatrixData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

  const handleCompute = async () => {
    if (!robotInfo) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.computeMassMatrix(jointPositions);
      setData(result);
      
      // Update session store for PDF export
      const { useSessionStore } = await import('../../stores/sessionStore');
      useSessionStore.getState().updateComputedData({ massMatrix: result.mass_matrix });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

    if (!robotInfo) {
        return (
            <div className="dynamics-panel">
                <h3>📐 Mass Matrix <InfoTooltip title="Mass Matrix">Compute the joint-space inertia matrix M(q), effective inertia (diagonal), and condition number.</InfoTooltip></h3>
                <div className="empty-state-mini">Load a robot first</div>
            </div>
        );
    }

    return (
        <div className="dynamics-panel">
            <h3>📐 Mass Matrix <InfoTooltip title="Mass Matrix">Compute the joint-space inertia matrix M(q), effective inertia (diagonal), and condition number.</InfoTooltip></h3>
            <p className="panel-description">Joint-space inertia matrix M(q)</p>

            <button className="compute-btn" onClick={handleCompute} disabled={loading}>
                {loading ? '⏳ Computing...' : '▶ Compute Mass Matrix'}
            </button>

            {error && <div className="error-message">{error}</div>}

            {data && (
                <div className="dynamics-results">
                    <div className="jacobian-metrics">
                        <div className="metric-card metric-ok">
                            <span className="metric-label">Condition Number</span>
                            <span className="metric-value">{data.condition_number.toExponential(2)}</span>
                        </div>
                    </div>

                    <div className="diagonal-section">
                        <span className="sv-label">Effective Inertia (diagonal):</span>
                        <div className="sv-bars">
                            {data.diagonal.map((val, i) => {
                                const maxVal = Math.max(...data.diagonal);
                                return (
                                    <div key={i} className="sv-bar-row">
                                        <span className="sv-index" title={robotInfo.jointNames[i]}>
                                            {robotInfo.jointNames[i]?.length > 6
                                                ? robotInfo.jointNames[i].slice(0, 5) + '…'
                                                : robotInfo.jointNames[i]}
                                        </span>
                                        <div className="sv-bar-bg">
                                            <div
                                                className="sv-bar inertia-bar"
                                                style={{ width: `${(val / maxVal) * 100}%` }}
                                            />
                                        </div>
                                        <span className="sv-value">{val.toFixed(4)}</span>
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
                                {data.mass_matrix.map((row, i) => (
                                    <tr key={i}>
                                        <td className="row-label" title={robotInfo.jointNames[i]}>
                                            {robotInfo.jointNames[i]?.length > 6
                                                ? robotInfo.jointNames[i].slice(0, 5) + '…'
                                                : robotInfo.jointNames[i]}
                                        </td>
                                        {row.map((val, j) => {
                                            const absMax = Math.max(...data.mass_matrix.flat().map(Math.abs), 0.001);
                                            const intensity = Math.abs(val) / absMax;
                                            const isDiag = i === j;
                                            const hue = isDiag ? 45 : 200;
                                            return (
                                                <td
                                                    key={j}
                                                    className={`matrix-cell ${isDiag ? 'matrix-diag' : ''}`}
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

export default MassMatrixPanel;
