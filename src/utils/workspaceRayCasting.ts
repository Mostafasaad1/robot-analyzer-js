import { RobotInfo } from '../types/robot';

/**
 * Workspace result with ray-casting specific options
 */
export interface WorkspaceRayCastingResult {
  points: number[][];
  pointCount: number;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  samplingMethod: string;
  numSamples: number;
  raysProcessed: number;
  successRate: number;
}

/**
 * Options for ray-casting workspace sampling
 */
export interface WorkspaceRayCastingOptions {
  numRays?: number;          // Number of rays (default: 500)
  epsilon?: number;          // Binary search precision in meters (default: 0.001 = 1mm)
  maxIKIterations?: number;  // Max IK iterations per boundary test (default: 100)
  onProgress?: (current: number, total: number, point?: number[]) => void;
}

/**
 * Generate uniformly distributed rays on a sphere using Fibonacci spiral
 * @param numRays Number of rays to generate
 * @returns Array of unit direction vectors [dx, dy, dz]
 */
export function generateSphericalRays(numRays: number): number[][] {
  const rays: number[][] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
  
  for (let i = 0; i < numRays; i++) {
    const y = 1 - (i / (numRays - 1)) * 2;  // y from 1 to -1
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;
    
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    
    // Normalize (already unit length for sphere)
    rays.push([x, y, z]);
  }
  
  return rays;
}

/**
 * Find a point guaranteed to be inside the workspace
 * Uses neutral joint configuration (midpoint of limits)
 * @returns Origin point [x, y, z] at end-effector
 */
export function findWorkspaceOrigin(
  pin: any,
  model: any,
  data: any,
  robotInfo: RobotInfo
): [number, number, number] {
  const nv = model.nv;
  const q = new Float64Array(nv);
  
  // Use midpoint of joint limits as neutral configuration
  for (let j = 0; j < nv; j++) {
    const lower = robotInfo.lowerLimits[j] ?? -Math.PI;
    const upper = robotInfo.upperLimits[j] ?? Math.PI;
    q[j] = (lower + upper) / 2;
  }
  
  pin.forwardKinematics(model, data, q);
  pin.updateFramePlacements(model, data);
  const endEffectorId = model.njoints - 1;
  const placement = pin.getJointPlacement(data, endEffectorId);
  
  return [placement.translation[0], placement.translation[1], placement.translation[2]];
}

/**
 * Estimate maximum reach of the robot
 * @returns Estimated maximum reach in meters
 */
export function estimateMaxReach(model: any, robotInfo: RobotInfo): number {
  const nv = model.nv;
  let maxReach = 0;
  
  for (let j = 0; j < nv; j++) {
    const lower = robotInfo.lowerLimits[j] ?? -Math.PI;
    const upper = robotInfo.upperLimits[j] ?? Math.PI;
    const range = upper - lower;
    maxReach += Math.abs(range);
  }
  
  // Add margin and ensure minimum
  return Math.max(maxReach * 0.5, 2.0);
}

/**
 * Test if a target position is reachable using IK solver
 * @returns true if reachable, false otherwise
 */
function isReachable(
  pin: any,
  model: any,
  data: any,
  targetPos: number[],
  robotInfo: RobotInfo,
  maxIterations: number
): boolean {
  const nv = model.nv;
  const q = new Float64Array(nv);
  
  // Start from neutral configuration
  for (let j = 0; j < nv; j++) {
    const lower = robotInfo.lowerLimits[j] ?? -Math.PI;
    const upper = robotInfo.upperLimits[j] ?? Math.PI;
    q[j] = (lower + upper) / 2;
  }
  
  const result = solveInverseKinematicsSimple(pin, model, data, targetPos, q, maxIterations);
  return result.converged;
}

/**
 * Simple IK solver for reachability testing
 */
function solveInverseKinematicsSimple(
  pin: any,
  model: any,
  data: any,
  targetPosition: number[],
  initialPositions: Float64Array,
  maxIterations: number = 100
): { converged: boolean; final_error: number } {
  const PINOCCHIO_TOLERANCE = 1e-4;
  const damp = 1e-6;
  const q = new Float64Array(initialPositions);
  const endEffectorId = model.njoints - 1;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    pin.forwardKinematics(model, data, q);
    pin.updateFramePlacements(model, data);
    const placement = pin.getJointPlacement(data, endEffectorId);
    const currentPos = placement.translation;
    
    const err = [
      currentPos[0] - targetPosition[0],
      currentPos[1] - targetPosition[1],
      currentPos[2] - targetPosition[2]
    ];
    
    const final_error = Math.sqrt(err[0] * err[0] + err[1] * err[1] + err[2] * err[2]);
    if (final_error < PINOCCHIO_TOLERANCE) {
      return { converged: true, final_error };
    }
    
    pin.computeJointJacobians(model, data, q);
    const J_flat = pin.getJointJacobian(model, data, endEffectorId, 2);
    
    const nv = model.nv;
    const J: number[][] = [];
    for (let r = 0; r < 3; r++) {
      const row: number[] = [];
      for (let c = 0; c < nv; c++) {
        row.push(J_flat[c * 6 + r]);
      }
      J.push(row);
    }
    
    // JJT = J * J^T
    const JJT = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let sum = 0;
        for (let k = 0; k < nv; k++) {
          sum += J[i][k] * J[j][k];
        }
        if (i === j) sum += damp;
        JJT[i][j] = sum;
      }
    }
    
    const det = JJT[0][0] * (JJT[1][1] * JJT[2][2] - JJT[1][2] * JJT[2][1])
      - JJT[0][1] * (JJT[1][0] * JJT[2][2] - JJT[1][2] * JJT[2][0])
      + JJT[0][2] * (JJT[1][0] * JJT[2][1] - JJT[1][1] * JJT[2][0]);
    
    if (Math.abs(det) < 1e-12) break; // Singular
    
    const invdet = 1 / det;
    const JJT_inv = [
      [(JJT[1][1] * JJT[2][2] - JJT[2][1] * JJT[1][2]) * invdet, (JJT[0][2] * JJT[2][1] - JJT[0][1] * JJT[2][2]) * invdet, (JJT[0][1] * JJT[1][2] - JJT[0][2] * JJT[1][1]) * invdet],
      [(JJT[1][2] * JJT[2][0] - JJT[1][0] * JJT[2][2]) * invdet, (JJT[0][0] * JJT[2][2] - JJT[0][2] * JJT[2][0]) * invdet, (JJT[1][0] * JJT[0][2] - JJT[0][0] * JJT[1][2]) * invdet],
      [(JJT[1][0] * JJT[2][1] - JJT[2][0] * JJT[1][1]) * invdet, (JJT[2][0] * JJT[0][1] - JJT[0][0] * JJT[2][1]) * invdet, (JJT[0][0] * JJT[1][1] - JJT[1][0] * JJT[0][1]) * invdet]
    ];
    
    const invErr = [
      JJT_inv[0][0] * err[0] + JJT_inv[0][1] * err[1] + JJT_inv[0][2] * err[2],
      JJT_inv[1][0] * err[0] + JJT_inv[1][1] * err[1] + JJT_inv[1][2] * err[2],
      JJT_inv[2][0] * err[0] + JJT_inv[2][1] * err[1] + JJT_inv[2][2] * err[2]
    ];
    
    for (let c = 0; c < nv; c++) {
      let dq = 0;
      for (let r = 0; r < 3; r++) {
        dq += J[r][c] * invErr[r];
      }
      q[c] -= dq * 0.5;
    }
  }
  
  return { converged: false, final_error: Number.POSITIVE_INFINITY };
}

/**
 * Binary search to find exact boundary point along a ray
 * @param origin Starting point inside workspace
 * @param direction Unit direction vector
 * @param R_min Minimum radius (reachable)
 * @param R_max Maximum radius (unreachable)
 * @param epsilon Convergence threshold
 * @returns Boundary point [x, y, z] or null
 */
export function binarySearchBoundary(
  origin: [number, number, number],
  direction: [number, number, number],
  R_min: number,
  R_max: number,
  epsilon: number,
  pin: any,
  model: any,
  data: any,
  robotInfo: RobotInfo,
  maxIKIterations: number
): [number, number, number] | null {
  let low = R_min;
  let high = R_max;
  const targetPos = [0, 0, 0];
  
  // First, find a reachable R_min and unreachable R_max
  // Check if origin is reachable (should always be)
  targetPos[0] = origin[0];
  targetPos[1] = origin[1];
  targetPos[2] = origin[2];
  
  if (!isReachable(pin, model, data, targetPos, robotInfo, maxIKIterations)) {
    // Origin itself not reachable - unusual case
    return null;
  }
  
  // Expand high until unreachable (with limit)
  let testHigh = R_max;
  let maxTests = 10;
  while (maxTests > 0) {
    targetPos[0] = origin[0] + direction[0] * testHigh;
    targetPos[1] = origin[1] + direction[1] * testHigh;
    targetPos[2] = origin[2] + direction[2] * testHigh;
    
    if (!isReachable(pin, model, data, targetPos, robotInfo, maxIKIterations)) {
      high = testHigh;
      break;
    }
    testHigh *= 2;
    maxTests--;
  }
  
  if (maxTests === 0) {
    // Couldn't find unreachable point, use current high
    high = testHigh;
  }
  
  // Binary search
  const maxIterations = 50; // Prevent infinite loops
  let iterations = 0;
  
  while (high - low > epsilon && iterations < maxIterations) {
    const mid = (low + high) / 2;
    targetPos[0] = origin[0] + direction[0] * mid;
    targetPos[1] = origin[1] + direction[1] * mid;
    targetPos[2] = origin[2] + direction[2] * mid;
    
    if (isReachable(pin, model, data, targetPos, robotInfo, maxIKIterations)) {
      low = mid; // Reachable, expand outward
    } else {
      high = mid; // Unreachable, shrink inward
    }
    iterations++;
  }
  
  return [
    origin[0] + direction[0] * low,
    origin[1] + direction[1] * low,
    origin[2] + direction[2] * low
  ];
}

/**
 * Main ray-casting workspace sampler
 * Uses binary search along spherical rays to find workspace boundary
 * 
 * @param pin Pinocchio WASM instance
 * @param model Pinocchio model
 * @param data Pinocchio data
 * @param robotInfo Robot information
 * @param options Ray-casting options
 * @returns Workspace result with boundary points
 */
export function sampleWorkspaceRayCasting(
  pin: any,
  model: any,
  data: any,
  robotInfo: RobotInfo,
  options: WorkspaceRayCastingOptions = {}
): WorkspaceRayCastingResult {
  const {
    numRays = 500,
    epsilon = 0.001,
    maxIKIterations = 100,
    onProgress
  } = options;
  
  // Step 1: Find origin point inside workspace
  const origin = findWorkspaceOrigin(pin, model, data, robotInfo);
  
  // Step 2: Generate uniformly distributed rays
  const rays = generateSphericalRays(numRays);
  
  // Step 3: Estimate maximum reach
  const estimatedMaxReach = estimateMaxReach(model, robotInfo);
  
  // Step 4: Binary search for boundary point along each ray
  const points: number[][] = [];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let raysProcessed = 0;
  
  for (let i = 0; i < rays.length; i++) {
    const direction = rays[i] as [number, number, number];
    const boundaryPoint = binarySearchBoundary(
      origin,
      direction,
      0,
      estimatedMaxReach,
      epsilon,
      pin,
      model,
      data,
      robotInfo,
      maxIKIterations
    );
    
    if (boundaryPoint) {
      points.push(boundaryPoint);
      raysProcessed++;
      
      // Update bounding box
      if (boundaryPoint[0] < minX) minX = boundaryPoint[0];
      if (boundaryPoint[1] < minY) minY = boundaryPoint[1];
      if (boundaryPoint[2] < minZ) minZ = boundaryPoint[2];
      if (boundaryPoint[0] > maxX) maxX = boundaryPoint[0];
      if (boundaryPoint[1] > maxY) maxY = boundaryPoint[1];
      if (boundaryPoint[2] > maxZ) maxZ = boundaryPoint[2];
    }
    
    // Report progress
    onProgress?.(i + 1, rays.length, boundaryPoint || undefined);
  }
  
  return {
    points,
    pointCount: points.length,
    boundingBox: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ]
    },
    samplingMethod: 'ray_casting',
    numSamples: points.length,
    raysProcessed,
    successRate: raysProcessed / rays.length
  };
}
