/**
 * Inverse Kinematics Panel
 * Input target position → solve for joint angles
 */

import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';
import { InfoTooltip } from './InfoTooltip';

interface IKResult {
    positions: number[];
    converged: boolean;
    final_error: number;
    iterations: number;
}

export function InverseKinematicsPanel() {
    const { robotInfo, jointPositions, setJointPositions } = useSessionStore();
    const [targetX, setTargetX] = useState(0.5);
    const [targetY, setTargetY] = useState(0);
    const [targetZ, setTargetZ] = useState(0.5);
    const [result, setResult] = useState<IKResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSolve = async () => {
        if (!robotInfo) return;
        setLoading(true);
        setError(null);
        try {
            const res = await apiService.computeInverseKinematics(
                [targetX, targetY, targetZ],
                jointPositions
            );
            setResult(res);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (result) {
            setJointPositions(result.positions);
        }
    };

    if (!robotInfo) {
        return (
            <div className="dynamics-panel">
                <h3>🎯 Inverse Kinematics <InfoTooltip title="Inverse Kinematics">Specify a target end-effector position (X, Y, Z) to compute the required joint angles.</InfoTooltip></h3>
                <div className="empty-state-mini">Load a robot first</div>
            </div>
        );
    }

    return (
        <div className="dynamics-panel">
            <h3>🎯 Inverse Kinematics <InfoTooltip title="Inverse Kinematics">Specify a target end-effector position (X, Y, Z) to compute the required joint angles.</InfoTooltip></h3>
            <p className="panel-description">Target position → joint angles</p>

            <div className="ik-inputs">
                <div className="ik-input-row">
                    <span className="coord-axis coord-x">X</span>
                    <input
                        type="number"
                        step="0.05"
                        value={targetX}
                        onChange={(e) => setTargetX(parseFloat(e.target.value) || 0)}
                    />
                    <span className="unit">m</span>
                </div>
                <div className="ik-input-row">
                    <span className="coord-axis coord-y">Y</span>
                    <input
                        type="number"
                        step="0.05"
                        value={targetY}
                        onChange={(e) => setTargetY(parseFloat(e.target.value) || 0)}
                    />
                    <span className="unit">m</span>
                </div>
                <div className="ik-input-row">
                    <span className="coord-axis coord-z">Z</span>
                    <input
                        type="number"
                        step="0.05"
                        value={targetZ}
                        onChange={(e) => setTargetZ(parseFloat(e.target.value) || 0)}
                    />
                    <span className="unit">m</span>
                </div>
            </div>

            <button className="compute-btn" onClick={handleSolve} disabled={loading}>
                {loading ? '⏳ Solving...' : '▶ Solve IK'}
            </button>

            {error && <div className="error-message">{error}</div>}

            {result && (
                <div className="dynamics-results">
                    <div className="ik-status">
                        <div className={`ik-badge ${result.converged ? 'ik-converged' : 'ik-failed'}`}>
                            {result.converged ? '✅ Converged' : '⚠ Not Converged'}
                        </div>
                        <div className="ik-stats">
                            <span>Error: {result.final_error.toExponential(2)} m</span>
                            <span>Iterations: {result.iterations}</span>
                        </div>
                    </div>

                    <div className="ik-solution">
                        {result.positions.map((val, i) => (
                            <div key={i} className="sv-bar-row">
                                <span className="sv-index">{robotInfo.jointNames[i]}</span>
                                <span className="sv-value">{val.toFixed(4)} rad</span>
                            </div>
                        ))}
                    </div>

                    <button className="compute-btn ik-apply-btn" onClick={handleApply}>
                        📌 Apply to Robot
                    </button>
                </div>
            )}
        </div>
    );
}

export default InverseKinematicsPanel;
