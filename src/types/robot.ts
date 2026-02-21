/**
 * Robot-related type definitions
 */

export interface RobotInfo {
  name: string;
  jointNames: string[];
  jointCount: number;
  dof: number;
  lowerLimits: number[];
  upperLimits: number[];
  neutralConfig: number[];
  urdfContent?: string;
  meshFiles?: Record<string, Blob>;
}

export interface JointPosition {
  name: string;
  value: number;
  lowerLimit: number;
  upperLimit: number;
}

export interface DynamicsResult {
  torques: number[];
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
}

export interface AnimationFrame {
  time: number;
  positions: number[];
  velocities: number[];
  accelerations: number[];
  torques: number[];
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
}

export enum AnimationPattern {
  SINE_WAVE = 'sine_wave',
  CIRCULAR = 'circular',
  WAVE = 'wave',
  RANDOM = 'random'
}

export interface AnimationConfig {
  pattern: AnimationPattern;
  amplitude: number;
  frequency: number;
  speed: number;
}
