/**
 * Robot Library Panel
 * Browse and load robots from the built-in library
 */

import { useState, useEffect } from 'react';
import { useRobotSession } from '../../hooks/useRobotSession';
import { extractRobotPackage, validateRobotPackage } from '../../utils/zipExtractor';

interface LibraryRobot {
    filename: string;
    name: string;
}

const BUILTIN_ROBOTS: LibraryRobot[] = [
    { filename: 'abb_irb120_support.zip', name: 'ABB IRB 120' },
    { filename: 'yumi_description.zip', name: 'ABB YuMi (IRB 14000)' },
    { filename: 'franka_description.zip', name: 'Franka Emika Panda' },
    { filename: 'iiwa_description.zip', name: 'KUKA LBR iiwa' },
    { filename: 'kuka_kr120_support.zip', name: 'KUKA KR 120' },
    { filename: 'kuka_kr210_support.zip', name: 'KUKA KR 210' },
    { filename: 'staubli_rx160_support.zip', name: 'Stäubli RX160' },
];

export function RobotLibraryPanel() {
    const { createSession } = useRobotSession();
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
        // Just set the hardcoded list
        setRobots(BUILTIN_ROBOTS);
    };

    const handleLoad = async (robot: LibraryRobot) => {
        setLoadingRobot(robot.filename);
        setError(null);
        try {
            // Fetch the zip from the public directory
            const url = `${import.meta.env.BASE_URL}library/${robot.filename}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to download ${robot.name}`);
            }

            const blob = await response.blob();
            const file = new File([blob], robot.filename, { type: 'application/zip' });

            // Extract ZIP locally
            const extracted = await extractRobotPackage(file);

            // Validate package completeness
            const validation = validateRobotPackage(extracted);
            if (!validation.valid) {
                throw new Error(validation.error || 'Invalid robot package');
            }

            // Convert Map to Record
            const meshFilesRecord: Record<string, Blob> = {};
            extracted.meshFiles.forEach((b, filename) => {
                meshFilesRecord[filename] = b;
            });

            // Parse URDF, compile WASM model, and create session
            await createSession(extracted.urdfContent, meshFilesRecord, extracted.urdfFilename);

        } catch (err: any) {
            setError(err.message || "Failed to load robot");
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
