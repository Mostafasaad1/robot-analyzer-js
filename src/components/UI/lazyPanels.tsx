/**
 * Lazy-loaded UI panels for code splitting
 * Each panel is loaded only when needed, reducing initial bundle size
 */

import React, { lazy, Suspense } from 'react';

// Loading fallback for lazy panels
function PanelLoadingPlaceholder({ name = 'Panel' }: { name?: string }) {
  return (
    <div
      style={{
        padding: '24px',
        background: 'rgba(15, 15, 26, 0.95)',
        borderRadius: '12px',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#3b82f6',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          marginTop: '12px',
          fontSize: '12px',
          color: 'rgba(59, 130, 246, 0.6)',
          letterSpacing: '0.02em',
        }}
      >
        Loading {name}...
      </div>
    </div>
  );
}

// Lazy load each panel component
export const LazyMaxTorquePanel = lazy(() =>
  import('./MaxTorquePanel').then((module) => ({
    default: module.MaxTorquePanel,
  }))
);

export const LazyForwardDynamicsPanel = lazy(() =>
  import('./ForwardDynamicsPanel').then((module) => ({
    default: module.ForwardDynamicsPanel,
  }))
);

export const LazyInverseDynamicsPanel = lazy(() =>
  import('./InverseDynamicsPanel').then((module) => ({
    default: module.InverseDynamicsPanel,
  }))
);

export const LazyEnergyPanel = lazy(() =>
  import('./EnergyPanel').then((module) => ({
    default: module.EnergyPanel,
  }))
);

export const LazyGravityPanel = lazy(() =>
  import('./GravityPanel').then((module) => ({
    default: module.GravityPanel,
  }))
);

export const LazyCenterOfMassPanel = lazy(() =>
  import('./CenterOfMassPanel').then((module) => ({
    default: module.CenterOfMassPanel,
  }))
);

export const LazyMassMatrixPanel = lazy(() =>
  import('./MassMatrixPanel').then((module) => ({
    default: module.MassMatrixPanel,
  }))
);

export const LazyJacobianPanel = lazy(() =>
  import('./JacobianPanel').then((module) => ({
    default: module.JacobianPanel,
  }))
);

export const LazyIKPanel = lazy(() =>
  import('./IKPanel').then((module) => ({
    default: module.default || module.InverseKinematicsPanel,
  }))
);

export const LazyAnimationPanel = lazy(() =>
  import('./AnimationPanel').then((module) => ({
    default: module.AnimationPanel,
  }))
);

export const LazyExportPanel = lazy(() =>
  import('./ExportPanel').then((module) => ({
    default: module.ExportPanel,
  }))
);

export const LazyRobotInfo = lazy(() =>
  import('./RobotInfo').then((module) => ({
    default: module.RobotInfo,
  }))
);

export const LazyJointControl = lazy(() =>
  import('./JointControl').then((module) => ({
    default: module.JointControl,
  }))
);

/**
 * Suspense wrapper for lazy panels with loading fallback
 */
export function withLazyPanel<P extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>,
  panelName: string
): React.ComponentType<P> {
  return function LazyPanelWrapper(props: P) {
    return (
      <Suspense fallback={<PanelLoadingPlaceholder name={panelName} />}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    );
  };
}
