/**
 * Robot Library Panel
 * Browse and load robots from the built-in library
 */

import { useState, useEffect } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';

interface LibraryRobot {
    filename: string;
    name: string;
}

export function RobotLibraryPanel() {
    const { setSession } = useSessionStore();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [robots, setRobots] = useState<LibraryRobot[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingRobot, setLoadingRobot] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isCollapsed) {
            fetchRobots();
        }
    }, [isCollapsed]);

    const fetchRobots = async () => {
        // Avoid refetching if we already have robots (unless explicit refresh needed)
        if (robots.length > 0) return;

        setLoading(true);
        try {
            const data = await apiService.listLibraryRobots();
            setRobots(data.robots);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLoad = async (robot: LibraryRobot) => {
        setLoadingRobot(robot.filename);
        setError(null);
        try {
            const result = await apiService.loadLibraryRobot(robot.filename);
            setSession(result.sessionId, result.robotInfo);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoadingRobot(null);
        }
    };

    return (
        <div className="dynamics-panel">
            <div
                className="panel-header"
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none'
                }}
            >
                <h3 style={{ margin: 0 }}>📚 Robot Library</h3>
                <span style={{ fontSize: '1.2em', color: '#64748b' }}>
                    {isCollapsed ? '▶' : '▼'}
                </span>
            </div>

            {!isCollapsed && (
                <>
                    <p className="panel-description">Pre-loaded robot models</p>

                    {loading && <div className="loading-text">Loading library...</div>}
                    {error && <div className="error-message">{error}</div>}

                    <div className="library-grid">
                        {robots.map((robot) => (
                            <button
                                key={robot.filename}
                                className="library-robot-btn"
                                onClick={() => handleLoad(robot)}
                                disabled={loadingRobot !== null}
                            >
                                <span className="library-robot-icon">🤖</span>
                                <span className="library-robot-name">{robot.name}</span>
                                {loadingRobot === robot.filename && <span className="loading-spinner">⏳</span>}
                            </button>
                        ))}
                        {robots.length === 0 && !loading && (
                            <div className="empty-state-mini">
                                No robots found. Add .zip files to the <code>urdf/</code> directory.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default RobotLibraryPanel;
