/**
 * Lazy-loaded 3D Robot Viewer
 * Only loads Three.js libraries when the viewer is actually rendered
 */

import { lazy, Suspense } from 'react';

// Loading spinner for the 3D viewer
function ViewerLoadingPlaceholder() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#3b82f6',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(59, 130, 246, 0.3)',
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
          marginTop: '16px',
          fontSize: '14px',
          color: 'rgba(59, 130, 246, 0.6)',
          letterSpacing: '0.02em',
        }}
      >
        Loading 3D Viewer...
      </div>
    </div>
  );
}

// Lazy load the actual RobotViewer component
const RobotViewer = lazy(() => import('./RobotViewer').then((module) => ({
  default: module.default || module.RobotViewer,
})));

/**
 * LazyRobotViewer - Optimized version that only loads Three.js when needed
 * This significantly reduces initial bundle size and improves initial page load
 */
export function LazyRobotViewer() {
  return (
    <Suspense fallback={<ViewerLoadingPlaceholder />}>
      <RobotViewer />
    </Suspense>
  );
}

export default LazyRobotViewer;
