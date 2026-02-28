/**
 * Inverse Dynamics Panel
 * Input: acceleration per joint → Compute torques using Pinocchio RNEA
 */

import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';
import { InfoTooltip } from './InfoTooltip';

export function InverseDynamicsPanel() {
    const { robotInfo, jointPositions } = useSessionStore();
    const [accelerations, setAccelerations] = useState<number[]>([]);
    const [torques, setTorques] = useState<number[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize accelerations when robot info changes
    const dof = robotInfo?.dof || 0;
    if (accelerations.length !== dof && dof > 0) {
        setAccelerations(new Array(dof).fill(0));
    }

    const handleAccelChange = (index: number, value: number) => {
        const newAccels = [...accelerations];
        newAccels[index] = value;
        setAccelerations(newAccels);
    };

    const handleCompute = async () => {
        if (!robotInfo) return;
        setLoading(true);
        setError(null);
        try {
            const result = await apiService.computeTorques(
                jointPositions,
                new Array(dof).fill(0), // zero velocity
                accelerations
            );
            setTorques(result.torques);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!robotInfo) {
        return (
            <div className="dynamics-panel">
                <h3>⚙️ Inverse Dynamics <InfoTooltip title="Inverse Dynamics">Compute joint torques from desired accelerations using Pinocchio's RNEA algorithm.</InfoTooltip></h3>
                <div className="empty-state-mini">Load a robot first</div>
            </div>
        );
    }

    return (
        <div className="dynamics-panel">
            <h3>⚙️ Inverse Dynamics <InfoTooltip title="Inverse Dynamics">Compute joint torques from desired accelerations using Pinocchio's RNEA algorithm.</InfoTooltip></h3>
            <p className="panel-description">Acceleration → Torque (RNEA)</p>

            <div className="dynamics-inputs">
                {robotInfo.jointNames.map((name, i) => (
                    <div key={i} className="dynamics-input-row">
                        <label title={name}>{name}</label>
                        <input
                            type="number"
                            step="0.5"
                            value={accelerations[i] || 0}
                            onChange={(e) => handleAccelChange(i, parseFloat(e.target.value) || 0)}
                        />
                        <span className="unit">rad/s²</span>
                    </div>
                ))}
            </div>

            <button className="compute-btn" onClick={handleCompute} disabled={loading}>
                {loading ? '⏳ Computing...' : '▶ Compute Torques'}
            </button>

            {error && <div className="error-message">{error}</div>}

            {torques && (
                <div className="dynamics-results">
                    <h4>Resulting Torques</h4>
                    {robotInfo.jointNames.map((name, i) => (
                        <div key={i} className="result-row">
                            <span className="result-label" title={name}>{name}</span>
                            <div className="result-bar-container">
                                <div
                                    className="result-bar"
                                    style={{
                                        width: `${Math.min(Math.abs(torques[i]) / (Math.max(...torques.map(Math.abs)) || 1) * 100, 100)}%`,
                                        background: torques[i] >= 0 ? 'var(--color-accent)' : 'var(--color-warning)',
                                    }}
                                />
                            </div>
                            <span className="result-value">{torques[i].toFixed(4)} N·m</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default InverseDynamicsPanel;
