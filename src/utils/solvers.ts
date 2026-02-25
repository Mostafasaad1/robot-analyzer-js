import { RobotInfo } from '../types/robot';

export interface WorkspaceResult {
  points: number[][]; // Array of [x, y, z] positions
  pointCount: number;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  samplingMethod: string;
  numSamples: number;
}


export function solveInverseKinematics(
    pin: any,
    model: any,
    data: any,
    targetPosition: number[],
    initialPositions: number[],
    maxIterations: number = 200
): { positions: number[]; converged: boolean; final_error: number; iterations: number } {
    if (!pin || !model || !data) throw new Error("WASM not initialized");

    const PINOCCHIO_TOLERANCE = 1e-4;
    const damp = 1e-6;
    const q = new Float64Array(initialPositions);
    const endEffectorId = model.njoints - 1;

    let converged = false;
    let final_error = Number.POSITIVE_INFINITY;
    let iters = 0;

    for (iters = 0; iters < maxIterations; iters++) {
        pin.forwardKinematics(model, data, q);
        pin.updateFramePlacements(model, data);
        const placement = pin.getJointPlacement(data, endEffectorId);

        const currentPos = placement.translation;

        const err = [
            currentPos[0] - targetPosition[0],
            currentPos[1] - targetPosition[1],
            currentPos[2] - targetPosition[2]
        ];

        final_error = Math.sqrt(err[0] * err[0] + err[1] * err[1] + err[2] * err[2]);
        if (final_error < PINOCCHIO_TOLERANCE) {
            converged = true;
            break;
        }

        pin.computeJointJacobians(model, data, q);
        const J_flat = pin.getJointJacobian(model, data, endEffectorId, 2); // LOCAL_WORLD_ALIGNED

        const nv = model.nv;
        const J = [];
        for (let r = 0; r < 3; r++) {
            const row = [];
            for (let c = 0; c < nv; c++) {
                row.push(J_flat[c * 6 + r]);
            }
            J.push(row);
        }

        // JJT = J * J^T
        const JJT = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let sum = 0;
                for (let k = 0; k < nv; k++) {
                    sum += J[i][k] * J[j][k];
                }
                if (i === j) sum += damp; // Damping
                JJT[i][j] = sum;
            }
        }

        const det = JJT[0][0] * (JJT[1][1] * JJT[2][2] - JJT[1][2] * JJT[2][1])
            - JJT[0][1] * (JJT[1][0] * JJT[2][2] - JJT[1][2] * JJT[2][0])
            + JJT[0][2] * (JJT[1][0] * JJT[2][1] - JJT[1][1] * JJT[2][0]);

        const invdet = 1 / det;
        const JJT_inv = [
            [(JJT[1][1] * JJT[2][2] - JJT[2][1] * JJT[1][2]) * invdet, (JJT[0][2] * JJT[2][1] - JJT[0][1] * JJT[2][2]) * invdet, (JJT[0][1] * JJT[1][2] - JJT[0][2] * JJT[1][1]) * invdet],
            [(JJT[1][2] * JJT[2][0] - JJT[1][0] * JJT[2][2]) * invdet, (JJT[0][0] * JJT[2][2] - JJT[0][2] * JJT[2][0]) * invdet, (JJT[1][0] * JJT[0][2] - JJT[0][0] * JJT[1][2]) * invdet],
            [(JJT[1][0] * JJT[2][1] - JJT[2][0] * JJT[1][1]) * invdet, (JJT[2][0] * JJT[0][1] - JJT[0][0] * JJT[2][1]) * invdet, (JJT[0][0] * JJT[1][1] - JJT[1][0] * JJT[0][1]) * invdet]
        ];

        // J^+ = J^T * JJT_inv
        // dq = - J^+ * err  =>  - J^T * JJT_inv * err
        const invErr = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            invErr[i] = JJT_inv[i][0] * err[0] + JJT_inv[i][1] * err[1] + JJT_inv[i][2] * err[2];
        }

        for (let c = 0; c < nv; c++) {
            let dq = 0;
            for (let r = 0; r < 3; r++) {
                dq += J[r][c] * invErr[r];
            }
            q[c] -= dq * 0.5; // step size
        }
    }

    return {
        positions: Array.from(q),
        converged,
        final_error,
        iterations: iters
    };
}

export function sampleMaxTorques(
  pin: any,
  model: any,
  data: any,
  positions: number[],
  robotInfo: RobotInfo,
  jointVelocities: number | number[] = 0,
  jointAccelerations: number | number[] = 0
): { max_torques: number[]; current_gravity_torques: number[]; joint_names: string[]; maxTorqueConfig: number[] } {
  if (!pin || !model || !data) throw new Error("WASM not initialized");

  const numJoints = positions.length;
  const nv = model.nv;

  // Create velocity array - either from array or uniformly from single value
  const velocity = new Float64Array(nv);
  if (Array.isArray(jointVelocities)) {
    for (let i = 0; i < nv && i < jointVelocities.length; i++) {
      velocity[i] = jointVelocities[i];
    }
  } else {
    for (let i = 0; i < nv; i++) {
      velocity[i] = jointVelocities;
    }
  }

  // Create acceleration array - either from array or uniformly from single value
  const acceleration = new Float64Array(nv);
  if (Array.isArray(jointAccelerations)) {
    for (let i = 0; i < nv && i < jointAccelerations.length; i++) {
      acceleration[i] = jointAccelerations[i];
    }
  } else {
    for (let i = 0; i < nv; i++) {
      acceleration[i] = jointAccelerations;
    }
  }

  // 1. Current torques (with specified velocity and acceleration)
  const q_current = new Float64Array(positions);
  const tau_current = pin.rnea(model, data, q_current, velocity, acceleration);
  const current_gravity_torques = Array.from(tau_current) as number[];

  // 2. Fast hybrid sampling: corners + reduced random sampling
  const max_torques: number[] = new Array(numJoints).fill(0);
  const maxTorqueConfig: number[] = new Array(numJoints).fill(0);
  const q_sample = new Float64Array(nv);
  const v_sample = new Float64Array(nv);

  // Helper to evaluate torque and update max_torques
  const evaluateTorque = (q: Float64Array) => {
    const tau = pin.rnea(model, data, q, v_sample, acceleration);
    for (let j = 0; j < numJoints; j++) {
      const absTorque = Math.abs(tau[j]);
      if (absTorque > max_torques[j]) {
        max_torques[j] = absTorque;
        // Store the configuration that produces this max torque
        for (let k = 0; k < numJoints; k++) {
          maxTorqueConfig[k] = q[k];
        }
      }
    }
  };

  // Phase 1: Evaluate all joint limit corners (most critical points)
  // Torque usually peaks at joint limits due to gravity and leverage
  // Tripled corner sampling: now covers first 6 joints instead of 4
  const corners = [];
  const numCorners = Math.pow(2, Math.min(numJoints, 6)); // Limit to first 6 joints for corners (64 corners max)
  
  for (let i = 0; i < numCorners; i++) {
    const mask = i;
    for (let j = 0; j < numJoints; j++) {
      const lower = robotInfo.lowerLimits[j] !== undefined && robotInfo.lowerLimits[j] !== null ? robotInfo.lowerLimits[j] : -Math.PI;
      const upper = robotInfo.upperLimits[j] !== undefined && robotInfo.upperLimits[j] !== null ? robotInfo.upperLimits[j] : Math.PI;
      // Use limit based on bit in mask (for first 6 joints)
      const useUpper = (j < 6) && ((mask >> j) & 1);
      q_sample[j] = useUpper ? upper : lower;
      v_sample[j] = velocity[j];
    }
    evaluateTorque(q_sample);
  }

  // Phase 2: Strategic grid sampling for interior points
  // Tripled sampling: 300 samples (was 100)
  const gridSamples = 300;
  for (let i = 0; i < gridSamples; i++) {
    for (let j = 0; j < numJoints; j++) {
      const lower = robotInfo.lowerLimits[j] !== undefined && robotInfo.lowerLimits[j] !== null ? robotInfo.lowerLimits[j] : -Math.PI;
      const upper = robotInfo.upperLimits[j] !== undefined && robotInfo.upperLimits[j] !== null ? robotInfo.upperLimits[j] : Math.PI;
      // Stratified sampling: sample at regular intervals then add jitter
      const step = (upper - lower) / 10;
      const interval = Math.floor(i / (gridSamples / 10));
      q_sample[j] = lower + interval * step + (Math.random() - 0.5) * step;
      v_sample[j] = velocity[j];
    }
    evaluateTorque(q_sample);
  }

  // Phase 3: Sample extreme configurations (tripled from 4 to 12 patterns)
  const extremes = [
    // Original 4 patterns
    'all_min',
    'all_max',
    'alternating_even_min',
    'alternating_odd_min',
    // Additional triple patterns
    'all_25_percent',
    'all_50_percent',
    'all_75_percent',
    'alternating_25_75',
    'alternating_75_25',
    'thirds_1',
    'thirds_2',
    'thirds_3'
  ];

  extremes.forEach(extreme => {
    for (let j = 0; j < numJoints; j++) {
      const lower = robotInfo.lowerLimits[j] !== undefined && robotInfo.lowerLimits[j] !== null ? robotInfo.lowerLimits[j] : -Math.PI;
      const upper = robotInfo.upperLimits[j] !== undefined && robotInfo.upperLimits[j] !== null ? robotInfo.upperLimits[j] : Math.PI;
      const range = upper - lower;

      if (extreme === 'all_min') {
        q_sample[j] = lower;
      } else if (extreme === 'all_max') {
        q_sample[j] = upper;
      } else if (extreme === 'alternating_even_min') {
        q_sample[j] = (j % 2 === 0) ? lower : upper;
      } else if (extreme === 'alternating_odd_min') {
        q_sample[j] = (j % 2 === 0) ? upper : lower;
      } else if (extreme === 'all_25_percent') {
        q_sample[j] = lower + range * 0.25;
      } else if (extreme === 'all_50_percent') {
        q_sample[j] = lower + range * 0.5;
      } else if (extreme === 'all_75_percent') {
        q_sample[j] = lower + range * 0.75;
      } else if (extreme === 'alternating_25_75') {
        q_sample[j] = (j % 2 === 0) ? lower + range * 0.25 : lower + range * 0.75;
      } else if (extreme === 'alternating_75_25') {
        q_sample[j] = (j % 2 === 0) ? lower + range * 0.75 : lower + range * 0.25;
      } else if (extreme === 'thirds_1') {
        q_sample[j] = lower + range * (j % 3 === 0 ? 1 : 0);
      } else if (extreme === 'thirds_2') {
        q_sample[j] = lower + range * (j % 3 === 1 ? 1 : 0);
      } else if (extreme === 'thirds_3') {
        q_sample[j] = lower + range * (j % 3 === 2 ? 1 : 0);
      } else {
        q_sample[j] = lower;
      }
      v_sample[j] = velocity[j];
    }
    evaluateTorque(q_sample);
  });

  return {
    max_torques,
    current_gravity_torques,
    joint_names: robotInfo.jointNames,
    maxTorqueConfig
  };
}

export function sampleWorkspace(
  pin: any,
  model: any,
  data: any,
  robotInfo: RobotInfo,
  numSamples: number = 2000,
  method: 'random' = 'random'
): WorkspaceResult {
  if (!pin || !model || !data) throw new Error("WASM not initialized");

  const nv = model.nv;
  const q = new Float64Array(nv);
  const points: number[][] = [];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  // Helper to evaluate one sample and record end-effector position
  const evaluateSample = () => {
    pin.forwardKinematics(model, data, q);
    pin.updateFramePlacements(model, data); // Update frame placements for accurate joint positions
    // Use the last joint as end-effector
    const endEffectorId = model.njoints - 1;
    const placement = pin.getJointPlacement(data, endEffectorId);
    const pos = placement.translation;
    points.push([pos[0], pos[1], pos[2]]);
    // Update bounding box
    if (pos[0] < minX) minX = pos[0];
    if (pos[1] < minY) minY = pos[1];
    if (pos[2] < minZ) minZ = pos[2];
    if (pos[0] > maxX) maxX = pos[0];
    if (pos[1] > maxY) maxY = pos[1];
    if (pos[2] > maxZ) maxZ = pos[2];
  };

  // Generate random samples
  for (let i = 0; i < numSamples; i++) {
    for (let j = 0; j < nv; j++) {
      const lower = robotInfo.lowerLimits[j] ?? -Math.PI;
      const upper = robotInfo.upperLimits[j] ?? Math.PI;
      q[j] = lower + Math.random() * (upper - lower);
    }
    evaluateSample();
  }

  return {
    points,
    pointCount: points.length,
    boundingBox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
    samplingMethod: method,
    numSamples: numSamples
  };
}
