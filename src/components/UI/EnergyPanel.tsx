/**
 * Energy Panel
 * Shows kinetic, potential, and total energy at the current configuration
 * Backend endpoint already exists: POST /api/dynamics/energy/
 */

import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';

interface EnergyData {
    kinetic_energy: number;
    potential_energy: number;
    total_energy: number;
}

export function EnergyPanel() {
    const { robotInfo, jointPositions } = useSessionStore();
    const [velocities, setVelocities] = useState<number[]>([]);
    const [energy, setEnergy] = useState<EnergyData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const dof = robotInfo?.dof || 0;
    if (velocities.length !== dof && dof > 0) {
        setVelocities(new Array(dof).fill(0));
    }

    const handleVelChange = (index: number, value: number) => {
        const newVels = [...velocities];
        newVels[index] = value;
        setVelocities(newVels);
    };

    const handleCompute = async () => {
        if (!robotInfo) return;
        setLoading(true);
        setError(null);
        try {
            const result = await apiService.computeEnergy(jointPositions, velocities);
            setEnergy(result as unknown as EnergyData);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!robotInfo) {
        return (
            <div className="dynamics-panel">
                <h3>⚡ Energy</h3>
                <div className="empty-state-mini">Load a robot first</div>
            </div>
        );
    }

    const maxEnergy = energy ? Math.max(Math.abs(energy.kinetic_energy), Math.abs(energy.potential_energy), Math.abs(energy.total_energy), 0.001) : 1;

    return (
        <div className="dynamics-panel">
            <h3>⚡ Energy</h3>
            <p className="panel-description">Kinetic + Potential energy at current config</p>

            <div className="dynamics-inputs">
                {robotInfo.jointNames.map((name, i) => (
                    <div key={i} className="dynamics-input-row">
                        <label title={name}>{name}</label>
                        <input
                            type="number"
                            step="0.5"
                            value={velocities[i] || 0}
                            onChange={(e) => handleVelChange(i, parseFloat(e.target.value) || 0)}
                        />
                        <span className="unit">rad/s</span>
                    </div>
                ))}
            </div>

            <button className="compute-btn" onClick={handleCompute} disabled={loading}>
                {loading ? '⏳ Computing...' : '▶ Compute Energy'}
            </button>

            {error && <div className="error-message">{error}</div>}

            {energy && (
                <div className="dynamics-results">
                    <div className="energy-cards">
                        <div className="energy-card energy-kinetic">
                            <span className="energy-label">Kinetic</span>
                            <div className="energy-bar-bg">
                                <div className="energy-bar" style={{ width: `${(Math.abs(energy.kinetic_energy) / maxEnergy) * 100}%` }} />
                            </div>
                            <span className="energy-value">{energy.kinetic_energy.toFixed(4)} J</span>
                        </div>
                        <div className="energy-card energy-potential">
                            <span className="energy-label">Potential</span>
                            <div className="energy-bar-bg">
                                <div className="energy-bar" style={{ width: `${(Math.abs(energy.potential_energy) / maxEnergy) * 100}%` }} />
                            </div>
                            <span className="energy-value">{energy.potential_energy.toFixed(4)} J</span>
                        </div>
                        <div className="energy-card energy-total">
                            <span className="energy-label">Total</span>
                            <div className="energy-bar-bg">
                                <div className="energy-bar" style={{ width: `${(Math.abs(energy.total_energy) / maxEnergy) * 100}%` }} />
                            </div>
                            <span className="energy-value">{energy.total_energy.toFixed(4)} J</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EnergyPanel;
