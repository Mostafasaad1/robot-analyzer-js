/**
 * Main App component
 */

import { useState } from 'react';
import { useSessionStore } from './stores/sessionStore';
import { RobotUpload } from './components/UI/RobotUpload';
import { RobotInfo } from './components/UI/RobotInfo';
import { JointControl } from './components/UI/JointControl';
import { AnimationPanel } from './components/UI/AnimationPanel';
import { InverseDynamicsPanel } from './components/UI/InverseDynamicsPanel';
import { MaxTorquePanel } from './components/UI/MaxTorquePanel';
import { ForwardDynamicsPanel } from './components/UI/ForwardDynamicsPanel';
import { EnergyPanel } from './components/UI/EnergyPanel';
import { JacobianPanel } from './components/UI/JacobianPanel';
import { MassMatrixPanel } from './components/UI/MassMatrixPanel';
import { CenterOfMassPanel } from './components/UI/CenterOfMassPanel';
import { InverseKinematicsPanel as IKPanel } from './components/UI/IKPanel';
import { GravityPanel } from './components/UI/GravityPanel';
import { ExportPanel } from './components/UI/ExportPanel';
import { RobotLibraryPanel } from './components/UI/RobotLibraryPanel';
import { FloatingPanelManager } from './components/UI/FloatingPanelManager';
import { CollapsibleSection } from './components/UI/CollapsibleSection';
import { RobotViewer } from './components/Viewer/RobotViewer';
import './App.css';
import './components/UI/FloatingPanel.css';
import './components/UI/CollapsibleSection.css';

function App() {
  const { sessionId, robotInfo, jointPositions, setJointPositions } = useSessionStore();

  const handleJointChange = (index: number, value: number) => {
    // Update local state
    const newPositions = [...jointPositions];
    newPositions[index] = value;
    setJointPositions(newPositions);
  };

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${robotInfo?.name || 'robot'}_screenshot.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const panels = [
    {
      id: 'robot',
      title: 'Robot',
      icon: '🤖',
      accentColor: '#3b82f6',
      content: (
        <>
          <CollapsibleSection title="Robot Library" icon="📚" accentColor="#3b82f6" defaultOpen={false}>
            <RobotLibraryPanel />
          </CollapsibleSection>
          <CollapsibleSection title="Upload Robot" icon="📤" accentColor="#3b82f6" defaultOpen={false}>
            <RobotUpload />
          </CollapsibleSection>
          <CollapsibleSection title="Robot Info" icon="ℹ️" accentColor="#3b82f6" defaultOpen={false}>
            <RobotInfo />
          </CollapsibleSection>
        </>
      ),
      defaultOpen: false,
      defaultMinimized: true,
      position: { x: 20, y: 80 }
    },
    {
      id: 'controls',
      title: 'Controls',
      icon: '🎮',
      accentColor: '#8b5cf6',
      content: (
        <>
          <CollapsibleSection title="Joint Control" icon="🎚️" accentColor="#8b5cf6" defaultOpen={false}>
            <JointControl onJointChange={handleJointChange} />
          </CollapsibleSection>
          <CollapsibleSection title="Animation" icon="🎬" accentColor="#8b5cf6" defaultOpen={false}>
            <AnimationPanel />
          </CollapsibleSection>
          <CollapsibleSection title="Gravity" icon="🌍" accentColor="#8b5cf6" defaultOpen={false}>
            <GravityPanel />
          </CollapsibleSection>
        </>
      ),
      defaultOpen: false,
      defaultMinimized: true,
      position: { x: 360, y: 80 }
    },
    {
      id: 'kinematics',
      title: 'Kinematics',
      icon: '📐',
      accentColor: '#06b6d4',
      content: (
        <>
          <CollapsibleSection title="Inverse Kinematics" icon="🎯" accentColor="#06b6d4" defaultOpen={false}>
            <IKPanel />
          </CollapsibleSection>
          <CollapsibleSection title="Jacobian" icon="📊" accentColor="#06b6d4" defaultOpen={false}>
            <JacobianPanel />
          </CollapsibleSection>
          <CollapsibleSection title="Center of Mass" icon="⚖️" accentColor="#06b6d4" defaultOpen={false}>
            <CenterOfMassPanel />
          </CollapsibleSection>
        </>
      ),
      defaultOpen: false,
      defaultMinimized: true,
      position: { x: 20, y: 320 }
    },
    {
      id: 'dynamics',
      title: 'Dynamics',
      icon: '⚡',
      accentColor: '#22c55e',
      content: (
        <>
          <CollapsibleSection title="Energy" icon="⚡" accentColor="#22c55e" defaultOpen={false}>
            <EnergyPanel />
          </CollapsibleSection>
          <CollapsibleSection title="Mass Matrix" icon="📐" accentColor="#22c55e" defaultOpen={false}>
            <MassMatrixPanel />
          </CollapsibleSection>
          <CollapsibleSection title="Inverse Dynamics" icon="🔄" accentColor="#22c55e" defaultOpen={false}>
            <InverseDynamicsPanel />
          </CollapsibleSection>
          <CollapsibleSection title="Max Torque" icon="💪" accentColor="#22c55e" defaultOpen={false}>
            <MaxTorquePanel />
          </CollapsibleSection>
          <CollapsibleSection title="Forward Dynamics" icon="➡️" accentColor="#22c55e" defaultOpen={false}>
            <ForwardDynamicsPanel />
          </CollapsibleSection>
        </>
      ),
      defaultOpen: false,
      defaultMinimized: true,
      position: { x: 360, y: 320 }
    },
    {
      id: 'export',
      title: 'Export',
      icon: '📊',
      accentColor: '#f59e0b',
      content: (
        <CollapsibleSection title="Export Data" icon="📥" accentColor="#f59e0b" defaultOpen={false}>
          <ExportPanel />
        </CollapsibleSection>
      ),
      defaultOpen: false,
      defaultMinimized: true,
      position: { x: 700, y: 80 }
    },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <h1>🤖 Robot Analyzer</h1>
          {robotInfo && (
            <div className="header-robot-info">
              <span className="header-robot-name">{robotInfo.name}</span>
              <span className="header-dof-badge">{robotInfo.dof} DOF</span>
            </div>
          )}
        </div>
        <div className="header-right">
          {sessionId && (
            <div className="header-actions">
              <button
                className="header-action-btn"
                onClick={handleScreenshot}
                title="Screenshot 3D View"
                aria-label="Take screenshot of 3D view"
              >
                📸
              </button>
            </div>
          )}
          <div className="session-info">
            {sessionId ? (
              <span className="connected" aria-live="polite">Connected</span>
            ) : (
              <span className="disconnected" aria-live="polite">Disconnected</span>
            )}
          </div>
        </div>
      </header>

      <div className="app-content">
        <div
          className={`sidebar-backdrop ${sidebarOpen ? 'sidebar-backdrop-visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Floating Panels */}
        <FloatingPanelManager panels={panels} />

        <main className="viewer">
          <RobotViewer />
        </main>
      </div>
    </div>
  );
}

export default App;
