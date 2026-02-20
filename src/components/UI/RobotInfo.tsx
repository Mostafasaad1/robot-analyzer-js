/**
 * Robot Information Display
 */

import { useSessionStore } from '../../stores/sessionStore';

export function RobotInfo() {
  const { robotInfo, sessionId } = useSessionStore();

  if (!robotInfo) {
    return (
      <div className="robot-info">
        <h3>ℹ️ Robot Info</h3>
        <div className="empty-state-mini">
          <p>No robot loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="robot-info">
      <h3>ℹ️ Robot Info</h3>
      <div className="info-grid">
        <div className="info-item">
          <span className="label">Name</span>
          <span className="value">{robotInfo.name || 'Unknown'}</span>
        </div>
        <div className="info-item">
          <span className="label">DOF</span>
          <span className="value">{robotInfo.dof}</span>
        </div>
        <div className="info-item">
          <span className="label">Joints</span>
          <span className="value">{robotInfo.jointCount}</span>
        </div>
        <div className="info-item">
          <span className="label">Session</span>
          <span className="value session-id">{sessionId?.slice(0, 8) || '—'}...</span>
        </div>
      </div>
      {robotInfo.jointNames.length > 0 && (
        <div className="joint-names">
          <span className="label">Joint Names</span>
          <div className="joint-tags">
            {robotInfo.jointNames.map((name, i) => (
              <span key={i} className="joint-tag">{name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RobotInfo;
