# Frontend Optimization Guide

This document describes all the optimizations implemented for maximum frontend performance.

## Implemented Optimizations

### 1. API & Caching (Tasks 24-28)

**Files Created:**
- `src/services/optimizedApi.ts` - API service with:
  - TTL-based caching (200 entries, configurable TTL)
  - Request batching support
  - Debounced and throttled variants
  - Cache key generation with position rounding

- `src/utils/cache.ts` - Generic cache utility:
  - LRU eviction with configurable max size
  - TTL-based expiration
  - Session-based cache invalidation

- `src/utils/debounce.ts` - Rate limiting utilities:
  - `debounce()` - Execute after delay
  - `throttle()` - Execute at most every N ms
  - `rafThrottle()` - RAF-based for animations
  - `debounceAsync()` / `throttleAsync()` - Async variants

### 2. State Management (Tasks 29-30)

**File Modified:**
- `src/stores/sessionStore.ts` - Enhanced with:
  - Selectors for efficient state access
  - Computed values (joint count, joint states, etc.)
  - Session readiness checks
  - Computed data freshness tracking

### 3. Code Splitting & Lazy Loading (Tasks 31-35)

**Files Created:**
- `src/components/Viewer/LazyRobotViewer.tsx` - Lazy loads Three.js viewer
- `src/components/UI/lazyPanels.tsx` - Lazy loads all UI panels:
  - MaxTorquePanel
  - ForwardDynamicsPanel
  - InverseDynamicsPanel
  - EnergyPanel
  - GravityPanel
  - CenterOfMassPanel
  - MassMatrixPanel
  - JacobianPanel
  - IKPanel
  - AnimationPanel
  - ExportPanel
  - RobotInfo
  - JointControl

### 4. React Performance (Tasks 36-40)

**Optimizations:**
- `useMemo` hook patterns for expensive computations
- `useCallback` hook patterns for function stability
- `React.memo` for component memoization
- Panel render optimization with selectors

### 5. Browser Performance (Tasks 41-43)

**File Created:**
- `src/utils/browserPerformance.ts` - Performance utilities:
  - `scheduleRaf()` - Coalesces RAF callbacks
  - `rafThrottle()` - RAF-based throttling
  - `isTimeBudgetAvailable()` - Frame budget checking
  - `FPSCounter` class - FPS monitoring

### 6. Virtualization (Task 44)

**Note:** Implement using `@tanstack/react-virtual` for large joint lists.

### 7. WebSocket & State Batching (Tasks 45-47)

**Optimizations:**
- Message debouncing for frequent updates
- State batching with Zustand's subscribe pattern
- Clear computed data on session change

### 8. Performance Monitoring (Task 53)

**File Created:**
- `src/utils/performance.ts` - Performance tracking:
  - `perf` global tracker
  - `useRenderTime()` - Component render timing
  - `withRenderTime()` - HOC for automatic tracking
  - `logPerformanceMetrics()` - Console logging
  - `exportPerformanceMetrics()` - JSON export

### 9. Build Configuration (Tasks 55-67)

**File Created:**
- `vite.config.optimized.ts` - Optimized build config:
  - Code splitting by library (React, Three.js, etc.)
  - Brotli/Gzip compression
  - Bundle analysis support
  - Terser minification with console stripping
  - CSS code splitting
  - Source maps for debugging

## Installation Requirements

To use all optimizations, install these dependencies:

```bash
npm install --save-dev @vitejs/plugin-react-swc
npm install --save-dev vite-plugin-compression
npm install --save-dev rollup-plugin-visualizer
npm install --save-dev @tanstack/react-virtual
```

## Usage

### Using Lazy Components

```tsx
// Original import
import { MaxTorquePanel } from './components/UI/MaxTorquePanel';

// Optimized lazy import
import { LazyMaxTorquePanel } from './components/UI/lazyPanels';

// Wrap with Suspense
<Suspense fallback={<LoadingFallback />}>
  <LazyMaxTorquePanel />
</Suspense>
```

### Using Optimized API

```tsx
import { useApi } from './contexts/ApiContext';

function MyComponent() {
  const { api } = useApi();
  
  // Uses cache automatically
  const torques = await api.computeTorques(positions);
}
```

### Using Performance Monitoring

```tsx
import { withRenderTime } from './utils/performance';

const MyOptimizedComponent = withRenderTime(Component);
```

### Using RAF Throttling

```tsx
import { rafThrottle } from './utils/debounce';

const throttledUpdate = rafThrottle((val: number) => {
  // Runs at most once per animation frame
  updateJoint(val);
});
```

## Build Commands

```bash
# Standard build
npm run build

# Analyze bundle size
npm run build:analyze

# Production build with max optimization
npm run build:prod

# Preview production build
npm run preview
```

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Initial Bundle Size | < 150KB | Achievable with lazy loading |
| Time to Interactive | < 3s | With code splitting |
| Lighthouse Score | 90+ | With all optimizations |
| API Response Time | < 100ms | With caching |
| 60 FPS Rendering | Stable | With RAF throttling |
