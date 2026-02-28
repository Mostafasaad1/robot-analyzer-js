/**
 * Forward Dynamics Panel
 * Input: torque per joint → Compute accelerations using Pinocchio ABA
 */

import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';
import { InfoTooltip } from './InfoTooltip';

export function ForwardDynamicsPanel() {
    const { robotInfo, jointPositions } = useSessionStore();
    const [torques, setTorques] = useState<number[]>([]);
    const [accelerations, setAccelerations] = useState<number[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize torques when robot info changes
    const dof = robotInfo?.dof || 0;
    if (torques.length !== dof && dof > 0) {
        setTorques(new Array(dof).fill(0));
    }

    const handleTorqueChange = (index: number, value: number) => {
        const newTorques = [...torques];
        newTorques[index] = value;
        setTorques(newTorques);
    };

    const handleCompute = async () => {
        if (!robotInfo) return;
        setLoading(true);
        setError(null);
        try {
            const result = await apiService.computeForwardDynamics(
                jointPositions,
                new Array(dof).fill(0), // zero velocity
                torques
            );
            setAccelerations(result.accelerations);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!robotInfo) {
        return (
            <div className="dynamics-panel">
                <h3>🔄 Forward Dynamics <InfoTooltip title="Forward Dynamics">Compute joint accelerations from applied torques using Pinocchio's ABA algorithm.</InfoTooltip></h3>
                <div className="empty-state-mini">Load a robot first</div>
            </div>
        );
    }

    return (
        <div className="dynamics-panel">
            <h3>🔄 Forward Dynamics <InfoTooltip title="Forward Dynamics">Compute joint accelerations from applied torques using Pinocchio's ABA algorithm.</InfoTooltip></h3>
            <p className="panel-description">Torque → Acceleration (ABA)</p>

            <div className="dynamics-inputs">
                {robotInfo.jointNames.map((name, i) => (
                    <div key={i} className="dynamics-input-row">
                        <label title={name}>{name}</label>
                        <input
                            type="number"
                            step="0.5"
                            value={torques[i] || 0}
                            onChange={(e) => handleTorqueChange(i, parseFloat(e.target.value) || 0)}
                        />
                        <span className="unit">N·m</span>
                    </div>
                ))}
            </div>

            <button className="compute-btn" onClick={handleCompute} disabled={loading}>
                {loading ? '⏳ Computing...' : '▶ Compute Accelerations'}
            </button>

            {error && <div className="error-message">{error}</div>}

            {accelerations && (
                <div className="dynamics-results">
                    <h4>Resulting Accelerations</h4>
                    {robotInfo.jointNames.map((name, i) => (
                        <div key={i} className="result-row">
                            <span className="result-label" title={name}>{name}</span>
                            <div className="result-bar-container">
                                <div
                                    className="result-bar"
                                    style={{
                                        width: `${Math.min(Math.abs(accelerations[i]) / (Math.max(...accelerations.map(Math.abs)) || 1) * 100, 100)}%`,
                                        background: accelerations[i] >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                                    }}
                                />
                            </div>
                            <span className="result-value">{accelerations[i].toFixed(4)} rad/s²</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ForwardDynamicsPanel;
