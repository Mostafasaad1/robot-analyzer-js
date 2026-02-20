/**
 * Hook for managing robot sessions
 */

import { useCallback } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { usePinocchio } from '../contexts/PinocchioContext';
import { apiService } from '../services/api';
// @ts-ignore
import { parseURDF, buildPinocchioModel } from 'pinocchio-js/src/urdf-parser.mjs';

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15);
}

export function useRobotSession() {
  const { setSession, clearSession, sessionId, robotInfo } = useSessionStore();
  const { pin, isReady } = usePinocchio();

  const createSession = useCallback(async (urdfContent: string, meshFiles: Record<string, Blob>, urdfFilename?: string) => {
    if (!isReady || !pin) throw new Error("Pinocchio engine not ready");

    // 1. Parse URDF locally and build the WASM Model
    const urdfData = parseURDF(urdfContent);
    const model = buildPinocchioModel(pin, urdfData);

    // Provide the model to the API service for future dynamics computations
    apiService.loadWasmModel(pin, model);

    // 2. Build RobotInfo from urdfData
    // We only want moving joints for the frontend controls
    const movingJoints = urdfData.joints.filter((j: any) => j.type !== 'fixed');
    const jointNames = movingJoints.map((j: any) => j.name);

    // Safety check: Fall back to 0 if limit not defined
    const lowerLimits = movingJoints.map((j: any) => j.limits?.lower || 0);
    const upperLimits = movingJoints.map((j: any) => j.limits?.upper || 0);

    // Neutral configuration: returns a Float64Array from WASM
    const neutralConfigArray = pin.neutralConfiguration(model);
    const neutralConfig = Array.from(neutralConfigArray as Float64Array);

    const generatedRobotInfo = {
      name: urdfData.robotName || urdfFilename?.split('.')[0] || 'Local Robot',
      jointNames,
      jointCount: jointNames.length,
      dof: model.nv, // True degrees of freedom
      lowerLimits,
      upperLimits,
      neutralConfig
    };

    const newSessionId = generateSessionId();

    // 3. Store URDF content and mesh files along with robot info
    setSession(newSessionId, {
      ...generatedRobotInfo,
      urdfContent,
      meshFiles: Object.fromEntries(
        Object.entries(meshFiles).map(([key, blob]) => [key, blob])
      )
    });

    return { sessionId: newSessionId, robotInfo: generatedRobotInfo };
  }, [setSession, pin, isReady]);

  const loadSession = useCallback(async (_sessionId: string) => {
    // Session is already in Zustand localStorage, no backend fetch needed!
    return robotInfo;
  }, [robotInfo]);

  const deleteSession = useCallback(async () => {
    clearSession();
  }, [clearSession]);

  return {
    sessionId,
    robotInfo,
    createSession,
    loadSession,
    deleteSession,
    isSessionActive: !!sessionId,
  };
}
