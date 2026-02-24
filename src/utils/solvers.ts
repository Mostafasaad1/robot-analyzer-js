import { RobotInfo } from '../types/robot';

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
  jointVelocity: number = 0,
  jointAcceleration: number = 0
): { max_torques: number[]; current_gravity_torques: number[]; joint_names: string[] } {
  if (!pin || !model || !data) throw new Error("WASM not initialized");

  const numJoints = positions.length;
  const nv = model.nv;

  // Create velocity and acceleration arrays with uniform values
  const velocity = new Float64Array(nv);
  const acceleration = new Float64Array(nv);
  for (let i = 0; i < nv; i++) {
    velocity[i] = jointVelocity;
    acceleration[i] = jointAcceleration;
  }

  // 1. Current torques (with specified velocity and acceleration)
  const q_current = new Float64Array(positions);
  const tau_current = pin.rnea(model, data, q_current, velocity, acceleration);
  const current_gravity_torques = Array.from(tau_current) as number[];

  // 2. Monte Carlo sampling over joint limits to find peak torques
  const max_torques: number[] = new Array(numJoints).fill(0);
  const numSamples = 2000;
  const q_rand = new Float64Array(nv);
  const v_rand = new Float64Array(nv);

  for (let i = 0; i < numSamples; i++) {
    for (let j = 0; j < numJoints; j++) {
      const lower = robotInfo.lowerLimits[j] !== undefined && robotInfo.lowerLimits[j] !== null ? robotInfo.lowerLimits[j] : -Math.PI;
      const upper = robotInfo.upperLimits[j] !== undefined && robotInfo.upperLimits[j] !== null ? robotInfo.upperLimits[j] : Math.PI;
      q_rand[j] = lower + Math.random() * (upper - lower);
      v_rand[j] = jointVelocity;
    }

    const tau_rand = pin.rnea(model, data, q_rand, v_rand, acceleration);
    for (let j = 0; j < numJoints; j++) {
      const absTorque = Math.abs(tau_rand[j]);
      if (absTorque > max_torques[j]) {
        max_torques[j] = absTorque;
      }
    }
  }

  return {
    max_torques,
    current_gravity_torques,
    joint_names: robotInfo.jointNames
  };
}
