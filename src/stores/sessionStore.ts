/**
 * Optimized session store with selectors and computed state
 * Uses Zustand with localStorage persistence and selectors
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RobotInfo } from '../types/robot';

// State interface
interface SessionState {
  sessionId: string | null;
  robotInfo: RobotInfo | null;
  jointPositions: number[];
  jointVelocities: number[];
  isAnimating: boolean;
  computedData: {
    torques?: number[];
    energy?: { kinetic: number; potential: number };
    massMatrix?: number[][];
    jacobian?: number[][];
    com?: { x: number; y: number; z: number };
    lastComputed?: number;
  };
  workspaceData: {
    points?: number[][]; // Array of [x, y, z] positions
    pointCount?: number;
    boundingBox?: {
      min: [number, number, number];
      max: [number, number, number];
    };
    samplingMethod?: string;
    numSamples?: number;
    lastComputed?: number;
    // Visualization settings
    showWorkspace?: boolean;
    workspaceColor?: string;
    workspacePointSize?: number;
  };

  // Actions
  setSession: (id: string, info: RobotInfo) => void;
  clearSession: () => void;
  setJointPositions: (positions: number[]) => void;
  setJointVelocities: (velocities: number[]) => void;
  setAnimating: (animating: boolean) => void;
  updateComputedData: (data: Partial<SessionState['computedData']>) => void;
  clearComputedData: () => void;
  // Workspace actions
  setWorkspaceData: (data: Partial<SessionState['workspaceData']>) => void;
  clearWorkspaceData: () => void;
  toggleWorkspaceVisibility: () => void;
  setWorkspaceColor: (color: string) => void;
  setWorkspacePointSize: (size: number) => void;
}

// Create the store
export const useSessionStore = create<SessionState>()(
  persist(
    (set, _get) => ({
      sessionId: null,
      robotInfo: null,
      jointPositions: [],
      jointVelocities: [],
      isAnimating: false,
      computedData: {},
      workspaceData: {
        showWorkspace: true,
        workspaceColor: '#60a5fa', // blue-400
        workspacePointSize: 0.08,
      },

      setSession: (id, info) => set({
        sessionId: id,
        robotInfo: info,
        jointPositions: info.neutralConfig || [],
        jointVelocities: new Array(info.dof).fill(0),
        computedData: {}
      }),

      clearSession: () => set({
        sessionId: null,
        robotInfo: null,
        jointPositions: [],
        jointVelocities: [],
        isAnimating: false,
        computedData: {}
      }),

      setJointPositions: (positions) => set({ jointPositions: positions }),

      setJointVelocities: (velocities) => set({ jointVelocities: velocities }),

      setAnimating: (animating) => set({ isAnimating: animating }),

      updateComputedData: (data) => set((state) => ({
        computedData: {
          ...state.computedData,
          ...data,
          lastComputed: Date.now()
        }
      })),

      clearComputedData: () => set({ computedData: {} }),

      // Workspace actions
      setWorkspaceData: (data) => set((state) => ({
        workspaceData: {
          ...state.workspaceData,
          ...data,
          lastComputed: Date.now()
        }
      })),

      clearWorkspaceData: () => set({
        workspaceData: {
          showWorkspace: true,
          workspaceColor: '#60a5fa',
          workspacePointSize: 0.08,
        }
      }),

      toggleWorkspaceVisibility: () => set((state) => ({
        workspaceData: {
          ...state.workspaceData,
          showWorkspace: !state.workspaceData.showWorkspace
        }
      })),

      setWorkspaceColor: (color) => set((state) => ({
        workspaceData: {
          ...state.workspaceData,
          workspaceColor: color
        }
      })),

      setWorkspacePointSize: (size) => set((state) => ({
        workspaceData: {
          ...state.workspaceData,
          workspacePointSize: size
        }
      })),
    }),
    {
      name: 'robot-session',
      partialize: (state) => {
        // Exclude large binary data (urdfContent, meshFiles) from persistence
        const robotInfo = state.robotInfo ? {
          name: state.robotInfo.name,
          jointNames: state.robotInfo.jointNames,
          jointCount: state.robotInfo.jointCount,
          dof: state.robotInfo.dof,
          lowerLimits: state.robotInfo.lowerLimits,
          upperLimits: state.robotInfo.upperLimits,
          neutralConfig: state.robotInfo.neutralConfig,
        } : null;

        return {
          sessionId: state.sessionId,
          robotInfo,
          jointPositions: state.jointPositions,
        };
      },
    }
  )
);

// =====================
// SELECTORS
// =====================

// Basic selectors
export const selectSessionId = (state: SessionState) => state.sessionId;
export const selectRobotInfo = (state: SessionState) => state.robotInfo;
export const selectJointPositions = (state: SessionState) => state.jointPositions;
export const selectJointVelocities = (state: SessionState) => state.jointVelocities;
export const selectIsAnimating = (state: SessionState) => state.isAnimating;
export const selectComputedData = (state: SessionState) => state.computedData;

// Derived selectors (computed values)
export const selectJointCount = (state: SessionState) =>
  state.robotInfo?.jointCount || 0;

export const selectJointNames = (state: SessionState) =>
  state.robotInfo?.jointNames || [];

export const selectJointLowerLimits = (state: SessionState) =>
  state.robotInfo?.lowerLimits || [];

export const selectJointUpperLimits = (state: SessionState) =>
  state.robotInfo?.upperLimits || [];

export const selectNeutralConfig = (state: SessionState) =>
  state.robotInfo?.neutralConfig || [];

export const selectRobotName = (state: SessionState) =>
  state.robotInfo?.name || '';

// Computed joint states
export const selectJointStates = (state: SessionState) => {
  const names = state.robotInfo?.jointNames || [];
  return names.map((name, i) => ({
    name,
    position: state.jointPositions[i] || 0,
    velocity: state.jointVelocities[i] || 0,
    lowerLimit: state.robotInfo?.lowerLimits[i],
    upperLimit: state.robotInfo?.upperLimits[i],
  }));
};

// Check if positions are within limits
export const selectPositionsWithinLimits = (state: SessionState): boolean => {
  const { jointPositions, robotInfo } = state;
  if (!robotInfo) return false;

  return jointPositions.every((pos, i) => {
    const lower = robotInfo.lowerLimits[i];
    const upper = robotInfo.upperLimits[i];
    return (lower === null || lower === undefined || pos >= lower) &&
      (upper === null || upper === undefined || pos <= upper);
  });
};

// Check if session is ready
export const selectIsSessionReady = (state: SessionState): boolean => {
  return !!(
    state.sessionId &&
    state.robotInfo &&
    state.jointPositions.length === state.robotInfo.dof
  );
};

// Get torques from computed data
export const selectComputedTorques = (state: SessionState) =>
  state.computedData.torques;

// Get energy from computed data
export const selectComputedEnergy = (state: SessionState) =>
  state.computedData.energy;

// Get mass matrix from computed data
export const selectComputedMassMatrix = (state: SessionState) =>
  state.computedData.massMatrix;

// Get Jacobian from computed data
export const selectComputedJacobian = (state: SessionState) =>
  state.computedData.jacobian;

// Get CoM from computed data
export const selectComputedCoM = (state: SessionState) =>
  state.computedData.com;

// Check if computed data is recent (within 1 second)
export const selectIsComputedDataFresh = (state: SessionState): boolean => {
  const lastComputed = state.computedData.lastComputed;
  if (!lastComputed) return false;
  return Date.now() - lastComputed < 1000;
};

// Get joint position as object mapping
export const selectJointPositionMap = (state: SessionState): { [key: string]: number } => {
  const names = state.robotInfo?.jointNames || [];
  const map: { [key: string]: number } = {};
  names.forEach((name, i) => {
    map[name] = state.jointPositions[i] || 0;
  });
  return map;
};

// Get computed data summary
export const selectComputedDataSummary = (state: SessionState) => {
  const { computedData } = state;
  const summary: { [key: string]: any } = {};

  if (computedData.torques) {
    summary.torques = {
      max: Math.max(...computedData.torques),
      min: Math.min(...computedData.torques),
      absMax: Math.max(...computedData.torques.map(Math.abs)),
    };
  }

  if (computedData.energy) {
    summary.energy = computedData.energy;
  }

  if (computedData.com) {
    summary.com = computedData.com;
  }

  if (computedData.lastComputed) {
    summary.lastComputed = computedData.lastComputed;
    summary.isFresh = Date.now() - computedData.lastComputed < 1000;
  }

  return summary;
};

// Hook-based selector convenience functions
export const useJointCount = () => useSessionStore(selectJointCount);
export const useJointNames = () => useSessionStore(selectJointNames);
export const useJointStates = () => useSessionStore(selectJointStates);
export const useIsSessionReady = () => useSessionStore(selectIsSessionReady);
export const useIsComputedDataFresh = () => useSessionStore(selectIsComputedDataFresh);
export const useComputedDataSummary = () => useSessionStore(selectComputedDataSummary);
export const useRobotName = () => useSessionStore(selectRobotName);

// Workspace selectors
export const selectWorkspaceData = (state: SessionState) => state.workspaceData;
export const selectWorkspacePoints = (state: SessionState) => state.workspaceData.points;
export const selectShowWorkspace = (state: SessionState) => state.workspaceData.showWorkspace;
export const selectWorkspaceColor = (state: SessionState) => state.workspaceData.workspaceColor;
export const selectWorkspacePointSize = (state: SessionState) => state.workspaceData.workspacePointSize;

// Workspace hooks
export const useWorkspaceData = () => useSessionStore(selectWorkspaceData);
export const useWorkspacePoints = () => useSessionStore(selectWorkspacePoints);
export const useShowWorkspace = () => useSessionStore(selectShowWorkspace);
export const useWorkspaceColor = () => useSessionStore(selectWorkspaceColor);
export const useWorkspacePointSize = () => useSessionStore(selectWorkspacePointSize);
