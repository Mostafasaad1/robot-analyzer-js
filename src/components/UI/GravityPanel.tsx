/**
 * Gravity Panel
 * Change gravity direction with presets and custom input
 */

import { useState } from 'react';
import { apiService } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';

const PRESETS = [
    { label: '⬇ Floor', icon: '⬇', gravity: [0, 0, -9.81] },
    { label: '⬆ Ceiling', icon: '⬆', gravity: [0, 0, 9.81] },
    { label: '➡ Wall-X', icon: '➡', gravity: [9.81, 0, 0] },
    { label: '⬅ Wall-Y', icon: '⬅', gravity: [0, 9.81, 0] },
    { label: '🚀 Zero-G', icon: '🚀', gravity: [0, 0, 0] },
];

export function GravityPanel() {
    const { robotInfo } = useSessionStore();
    const [gx, setGx] = useState(0);
    const [gy, setGy] = useState(0);
    const [gz, setGz] = useState(-9.81);
    const [magnitude, setMagnitude] = useState(9.81);
    const [loading, setLoading] = useState(false);
    const [activePreset, setActivePreset] = useState<string>('⬇ Floor');
    const [error, setError] = useState<string | null>(null);

    const applyGravity = async (gravity: number[], presetLabel?: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiService.setGravity(gravity);
            setGx(result.gravity[0]);
            setGy(result.gravity[1]);
            setGz(result.gravity[2]);
            setMagnitude(result.magnitude);
            if (presetLabel) setActivePreset(presetLabel);
            else setActivePreset('');
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!robotInfo) {
        return (
            <div className="dynamics-panel">
                <h3>🌍 Gravity</h3>
                <div className="empty-state-mini">Load a robot first</div>
            </div>
        );
    }

    return (
        <div className="dynamics-panel">
            <h3>🌍 Gravity</h3>
            <p className="panel-description">Change gravity direction for dynamics</p>

            <div className="gravity-presets">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.label}
                        className={`gravity-preset-btn ${activePreset === preset.label ? 'active' : ''}`}
                        onClick={() => applyGravity(preset.gravity, preset.label)}
                        disabled={loading}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <div className="gravity-custom">
                <span className="sv-label">Custom Vector:</span>
                <div className="ik-inputs">
                    <div className="ik-input-row">
                        <span className="coord-axis coord-x">X</span>
                        <input type="number" step="0.5" value={gx} onChange={(e) => setGx(parseFloat(e.target.value) || 0)} />
                        <span className="unit">m/s²</span>
                    </div>
                    <div className="ik-input-row">
                        <span className="coord-axis coord-y">Y</span>
                        <input type="number" step="0.5" value={gy} onChange={(e) => setGy(parseFloat(e.target.value) || 0)} />
                        <span className="unit">m/s²</span>
                    </div>
                    <div className="ik-input-row">
                        <span className="coord-axis coord-z">Z</span>
                        <input type="number" step="0.5" value={gz} onChange={(e) => setGz(parseFloat(e.target.value) || 0)} />
                        <span className="unit">m/s²</span>
                    </div>
                </div>
                <button className="compute-btn" onClick={() => applyGravity([gx, gy, gz])} disabled={loading}>
                    {loading ? '⏳ Applying...' : '▶ Apply Custom'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="gravity-status">
                <span className="metric-label">Magnitude</span>
                <span className="metric-value">{magnitude.toFixed(2)} m/s²</span>
            </div>
        </div>
    );
}

export default GravityPanel;
