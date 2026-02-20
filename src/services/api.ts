/**
 * Local API service for communicating with the Pinocchio WASM module
 * Bypasses the backend entirely.
 */

import { DynamicsResult } from '../types/robot';
import { sampleMaxTorques, solveInverseKinematics } from '../utils/solvers';

class APIService {
  public pin: any = null;
  public model: any = null;
  public data: any = null;

  constructor() { }

  public loadWasmModel(pin: any, model: any) {
    this.pin = pin;
    this.model = model;
    this.data = new pin.Data(model);
  }

  /**
   * Compute inverse dynamics (torques from positions, velocities, accelerations)
   */
  async computeTorques(
    positions: number[],
    velocities: number[],
    accelerations: number[]
  ): Promise<DynamicsResult> {
    if (!this.pin || !this.model || !this.data) throw new Error("WASM not initialized");

    // RNEA
    const q = new Float64Array(positions);
    const v = new Float64Array(velocities);
    const a = new Float64Array(accelerations);

    // pin.rnea returns a Float64Array of joint torques
    const tau = this.pin.rnea(this.model, this.data, q, v, a);

    return {
      torques: Array.from(tau),
      kineticEnergy: 0,
      potentialEnergy: 0,
      totalEnergy: 0
    };
  }

  /**
   * Compute forward dynamics (accelerations from positions, velocities, torques)
   */
  async computeForwardDynamics(
    positions: number[],
    velocities: number[],
    torques: number[]
  ): Promise<{ accelerations: number[] }> {
    if (!this.pin || !this.model || !this.data) throw new Error("WASM not initialized");
    const q = new Float64Array(positions);
    const v = new Float64Array(velocities);
    const tau = new Float64Array(torques);
    const ddq = this.pin.aba(this.model, this.data, q, v, tau);
    return { accelerations: Array.from(ddq) };
  }

  /**
   * Compute energy
   */
  async computeEnergy(
    positions: number[],
    velocities: number[]
  ): Promise<{ kinetic_energy: number; potential_energy: number; total_energy: number }> {
    if (!this.pin || !this.model || !this.data) throw new Error("WASM not initialized");
    const q = new Float64Array(positions);
    const v = new Float64Array(velocities);
    const ke = this.pin.computeKineticEnergy(this.model, this.data, q, v);
    const pe = this.pin.computePotentialEnergy(this.model, this.data, q);
    return { kinetic_energy: ke, potential_energy: pe, total_energy: ke + pe };
  }

  /**
   * Compute max torques across workspace
   */
  async computeMaxTorques(
    positions: number[]
  ): Promise<{ max_torques: number[]; current_gravity_torques: number[]; joint_names: string[] }> {
    if (!this.pin || !this.model || !this.data) throw new Error("WASM not initialized");

    const { useSessionStore } = await import('../stores/sessionStore');
    const { robotInfo } = useSessionStore.getState();
    if (!robotInfo) throw new Error("Robot info not available");

    return sampleMaxTorques(this.pin, this.model, this.data, positions, robotInfo) as any;
  }

  /**
   * Compute forward kinematics
   */
  async computeForwardKinematics(
    positions: number[],
    _frameName?: string
  ): Promise<{ position: number[]; orientation: number[] }> {
    if (!this.pin || !this.model || !this.data) throw new Error("WASM not initialized");

    const q = new Float64Array(positions);
    this.pin.forwardKinematics(this.model, this.data, q);

    // Simplification for now: Return CoM position since the viewer relies on standard forwardKinematics
    // Usually we need frame updates. We'll improve this later.
    return { position: [0, 0, 0], orientation: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
  }

  /**
   * Compute Jacobian matrix
   */
  async computeJacobian(
    positions: number[]
  ): Promise<{ jacobian: number[][]; manipulability: number; singular_values: number[]; shape: number[] }> {
    if (!this.pin || !this.model || !this.data) throw new Error("WASM not initialized");

    const q = new Float64Array(positions);
    this.pin.computeJointJacobians(this.model, this.data, q);

    // We compute the jacobian of the last joint as a proxy for the whole robot end-effector
    const numJoints = this.model.njoints;
    // Pinocchio ReferenceFrame: WORLD=0, LOCAL=1, LOCAL_WORLD_ALIGNED=2
    const J = this.pin.getJointJacobian(this.model, this.data, numJoints - 1, 2);

    const nv = this.model.nv;
    const jacobian2D = [];
    for (let r = 0; r < 6; r++) {
      const row = [];
      for (let c = 0; c < nv; c++) {
        row.push(J[c * 6 + r]);
      }
      jacobian2D.push(row);
    }

    return { jacobian: jacobian2D, manipulability: 0, singular_values: [], shape: [6, nv] };
  }

  /**
   * Compute mass/inertia matrix
   */
  async computeMassMatrix(
    positions: number[]
  ): Promise<{ mass_matrix: number[][]; diagonal: number[]; condition_number: number; size: number }> {
    if (!this.pin || !this.model || !this.data) throw new Error("WASM not initialized");
    const q = new Float64Array(positions);
    const M_flat = this.pin.crba(this.model, this.data, q);

    const nv = this.model.nv;
    const massMatrix2D = [];
    const diagonal = [];
    for (let r = 0; r < nv; r++) {
      const row = [];
      for (let c = 0; c < nv; c++) {
        const val = M_flat[c * nv + r];
        row.push(val);
        if (r === c) diagonal.push(val);
      }
      massMatrix2D.push(row);
    }

    return { mass_matrix: massMatrix2D, diagonal, condition_number: 1, size: nv };
  }

  /**
   * Compute center of mass
   */
  async computeCenterOfMass(
    positions: number[]
  ): Promise<{ com: number[]; total_mass: number; link_masses: { name: string; mass: number }[] }> {
    if (!this.pin || !this.model || !this.data) throw new Error("WASM not initialized");

    const q = new Float64Array(positions);
    const com = this.pin.centerOfMass(this.model, this.data, q);
    const totalMass = this.pin.computeTotalMass(this.model);

    return {
      com: Array.from(com),
      total_mass: totalMass,
      link_masses: []
    };
  }

  /**
   * Compute inverse kinematics using Damped Least Squares
   */
  async computeInverseKinematics(
    targetPosition: number[],
    initialPositions: number[],
    _targetOrientation?: number[],
    maxIterations: number = 200
  ): Promise<{ positions: number[]; converged: boolean; final_error: number; iterations: number }> {
    if (!this.pin || !this.model || !this.data) throw new Error("WASM not initialized");

    return solveInverseKinematics(this.pin, this.model, this.data, targetPosition, initialPositions, maxIterations);
  }

  /**
   * Set gravity vector
   */
  async setGravity(
    _gravity: number[]
  ): Promise<{ gravity: number[]; magnitude: number }> {
    if (!this.model) throw new Error("WASM not initialized");
    throw new Error("setGravity: Not implemented in Embind yet");
  }

  // Generate Reports entirely in browser
  async exportReport(_sessionId: string, format: string, _screenshot?: string): Promise<any> {
    // Dynamic import of store to avoid circular issues
    const { useSessionStore } = await import('../stores/sessionStore');
    const state = useSessionStore.getState();
    const { robotInfo, jointPositions } = state;

    if (format === 'json') {
      return {
        robot: robotInfo?.name,
        dof: robotInfo?.dof,
        joint_names: robotInfo?.jointNames,
        current_positions: jointPositions
      };
    } else if (format === 'csv') {
      let csv = `Robot Name,${robotInfo?.name}\n`;
      csv += `Degrees of Freedom,${robotInfo?.dof}\n\n`;
      csv += `Joint,Position (rad)\n`;
      robotInfo?.jointNames.forEach((name, i) => {
        csv += `${name},${jointPositions[i]}\n`;
      });
      return csv;
    } else {
      throw new Error("PDF export requires a backend or jspdf library. Please use CSV or JSON for offline mode.");
    }
  }

  async listLibraryRobots() { return { robots: [] }; }
  async loadLibraryRobot(_id: string): Promise<any> { throw new Error("Library robots no longer supported in offline mode"); }
}

export const apiService = new APIService();
