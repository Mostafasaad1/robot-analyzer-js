/**
 * Center of Mass Panel
 * Shows CoM position, total mass, and per-link mass breakdown
 */

import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';

interface ComData {
    com: number[];
    total_mass: number;
    link_masses: { name: string; mass: number }[];
}

export function CenterOfMassPanel() {
    const { robotInfo, jointPositions } = useSessionStore();
    const [data, setData] = useState<ComData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCompute = async () => {
        if (!robotInfo) return;
        setLoading(true);
        setError(null);
        try {
            const result = await apiService.computeCenterOfMass(jointPositions);
            setData(result);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!robotInfo) {
        return (
            <div className="dynamics-panel">
                <h3>🎯 Center of Mass</h3>
                <div className="empty-state-mini">Load a robot first</div>
            </div>
        );
    }

    return (
        <div className="dynamics-panel">
            <h3>🎯 Center of Mass</h3>
            <p className="panel-description">CoM position and mass distribution</p>

            <button className="compute-btn" onClick={handleCompute} disabled={loading}>
                {loading ? '⏳ Computing...' : '▶ Compute CoM'}
            </button>

            {error && <div className="error-message">{error}</div>}

            {data && (
                <div className="dynamics-results">
                    <div className="com-position">
                        <div className="com-header">
                            <span className="com-total-mass">{data.total_mass.toFixed(3)} kg</span>
                            <span className="com-total-label">Total Mass</span>
                        </div>
                        <div className="com-coords">
                            <div className="com-coord">
                                <span className="coord-axis coord-x">X</span>
                                <span className="coord-value">{data.com[0]?.toFixed(4)} m</span>
                            </div>
                            <div className="com-coord">
                                <span className="coord-axis coord-y">Y</span>
                                <span className="coord-value">{data.com[1]?.toFixed(4)} m</span>
                            </div>
                            <div className="com-coord">
                                <span className="coord-axis coord-z">Z</span>
                                <span className="coord-value">{data.com[2]?.toFixed(4)} m</span>
                            </div>
                        </div>
                    </div>

                    <div className="mass-breakdown">
                        <span className="sv-label">Per-Link Mass:</span>
                        <div className="sv-bars">
                            {data.link_masses.map((link, i) => {
                                const maxMass = Math.max(...data.link_masses.map(l => l.mass));
                                return (
                                    <div key={i} className="sv-bar-row">
                                        <span className="sv-index" title={link.name}>
                                            {link.name.length > 8 ? link.name.slice(0, 7) + '…' : link.name}
                                        </span>
                                        <div className="sv-bar-bg">
                                            <div
                                                className="sv-bar mass-bar"
                                                style={{ width: `${(link.mass / maxMass) * 100}%` }}
                                            />
                                        </div>
                                        <span className="sv-value">{link.mass.toFixed(2)} kg</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CenterOfMassPanel;
