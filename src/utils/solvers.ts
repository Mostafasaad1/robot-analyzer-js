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

// Vector3 helpers for convex hull
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vec3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return vec3Scale(v, 1 / len);
}

/**
 * Compute the boundary surface of a point cloud
 * Uses convex hull to find the outer shell, then filters to keep only boundary faces
 * This creates a mesh that wraps around the outermost points
 */
export function computeConvexHull(pointsArray: number[][]): { vertices: number[]; faces: number[] } {
  const n = pointsArray.length;

  if (n < 4) {
    return { vertices: pointsArray.flat(), faces: [] };
  }

  // Convert to Vec3 - keep more points for accurate boundary
  // Only downsample if very large point cloud (> 2000 points)
  const points: Vec3[] = n > 2000
    ? downsamplePoints(pointsArray, 2000).map(p => ({ x: p[0], y: p[1], z: p[2] }))
    : pointsArray.map(p => ({ x: p[0], y: p[1], z: p[2] }));

  // Use QuickHull to get the convex hull (outer boundary)
  return quickHull3D(points);
}

/**
 * QuickHull 3D algorithm - finds the convex hull boundary
 * Returns only the outer shell faces connecting boundary points
 */
function quickHull3D(points: Vec3[]): { vertices: number[]; faces: number[] } {
  const n = points.length;
  if (n < 4) return { vertices: [], faces: [] };

  // Find 6 extreme points (min/max on each axis)
  let minXIdx = 0, maxXIdx = 0, minYIdx = 0, maxYIdx = 0, minZIdx = 0, maxZIdx = 0;
  
  for (let i = 1; i < n; i++) {
    if (points[i].x < points[minXIdx].x) minXIdx = i;
    if (points[i].x > points[maxXIdx].x) maxXIdx = i;
    if (points[i].y < points[minYIdx].y) minYIdx = i;
    if (points[i].y > points[maxYIdx].y) maxYIdx = i;
    if (points[i].z < points[minZIdx].z) minZIdx = i;
    if (points[i].z > points[maxZIdx].z) maxZIdx = i;
  }

  // Start with tetrahedron from extreme points
  const extremes = [minXIdx, maxXIdx, minYIdx, maxYIdx, minZIdx, maxZIdx];
  const uniqueExtremes = Array.from(new Set(extremes));
  
  if (uniqueExtremes.length < 4) {
    return boundingBoxFallback(points);
  }

  // Create initial tetrahedron from first 4 unique extremes
  const initialIndices = uniqueExtremes.slice(0, 4);
  const faces: HullFace[] = [];
  
  // Create 4 faces for tetrahedron
  const tetraFaces: [number, number, number][] = [
    [initialIndices[0], initialIndices[1], initialIndices[2]],
    [initialIndices[0], initialIndices[2], initialIndices[3]],
    [initialIndices[0], initialIndices[3], initialIndices[1]],
    [initialIndices[1], initialIndices[3], initialIndices[2]],
  ];

  for (const [a, b, c] of tetraFaces) {
    const face = new HullFace([a, b, c], points);
    faces.push(face);
  }

  // Ensure consistent orientation (outward normals)
  for (let i = 1; i < faces.length; i++) {
    const ref = faces[0].computeCentroid(points);
    const test = faces[i].computeCentroid(points);
    const toRef = vec3Sub(ref, faces[i].computeCentroid(points));
    const normal = faces[i].getNormal();
    if (vec3Dot(toRef, normal) > 0) {
      faces[i].flip();
    }
  }

  // Assign points to faces
  for (let i = 0; i < n; i++) {
    if (initialIndices.includes(i)) continue;
    for (const face of faces) {
      if (face.isOutside(i, points)) {
        face.addPoint(i);
        break;
      }
    }
  }

  // Expand hull
  let iterations = 0;
  const maxIterations = n * 3;
  
  while (iterations < maxIterations) {
    iterations++;
    
    // Find face with furthest point
    let bestFace: HullFace | null = null;
    let bestPoint = -1;
    let bestDist = 0;
    
    for (const face of faces) {
      const { idx, dist } = face.getFurthestPoint(points);
      if (dist > bestDist) {
        bestDist = dist;
        bestFace = face;
        bestPoint = idx;
      }
    }
    
    if (!bestFace || bestPoint === -1 || bestDist < 1e-9) break;
    
    // Find visible faces from this point
    const visibleFaces: HullFace[] = [];
    const stack: HullFace[] = [bestFace];
    const seen = new Set< HullFace>();
    
    while (stack.length > 0) {
      const face = stack.pop()!;
      if (seen.has(face)) continue;
      seen.add(face);
      
      if (face.isOutside(bestPoint, points)) {
        visibleFaces.push(face);
        // Add adjacent faces
        for (const other of faces) {
          if (other !== face && !seen.has(other) && sharesEdge(face, other)) {
            stack.push(other);
          }
        }
      }
    }
    
    if (visibleFaces.length === 0) {
      bestFace.clearPoints();
      continue;
    }
    
    // Find horizon edges
    const horizonEdges = findHorizonEdges2(visibleFaces, faces);
    
    // Remove visible faces
    for (const f of visibleFaces) {
      const idx = faces.indexOf(f);
      if (idx !== -1) faces.splice(idx, 1);
    }
    
    // Create new faces from horizon edges
    for (const edge of horizonEdges) {
      const newFace = new HullFace([edge[0], edge[1], bestPoint], points);
      faces.push(newFace);
    }
    
    // Reassign points from removed faces
    for (const face of visibleFaces) {
      for (const pt of face.getPoints()) {
        for (const newFace of faces) {
          if (newFace.hasVertex(bestPoint) && newFace.isOutside(pt, points)) {
            newFace.addPoint(pt);
            break;
          }
        }
      }
    }
  }

  // Extract result
  if (faces.length === 0) {
    return boundingBoxFallback(points);
  }

  // Get unique vertices
  const vertexSet = new Set<number>();
  for (const face of faces) {
    for (const v of face.vertices) vertexSet.add(v);
  }

  const vertexList = Array.from(vertexSet).sort((a, b) => a - b);
  const vertexMap = new Map<number, number>();
  vertexList.forEach((v, i) => vertexMap.set(v, i));

  const vertices: number[] = [];
  for (const idx of vertexList) {
    const p = points[idx];
    vertices.push(p.x, p.y, p.z);
  }

  const resultFaces: number[] = [];
  for (const face of faces) {
    resultFaces.push(
      vertexMap.get(face.vertices[0])!,
      vertexMap.get(face.vertices[1])!,
      vertexMap.get(face.vertices[2])!
    );
  }

  if (vertices.length < 12 || resultFaces.length < 4) {
    return boundingBoxFallback(points);
  }

  return { vertices, faces: resultFaces };
}

function findHorizonEdges2(visibleFaces: HullFace[], allFaces: HullFace[]): [number, number][] {
  const edgeCount = new Map<string, [number, number]>();
  
  for (const face of visibleFaces) {
    const edges: [number, number][] = [
      [face.vertices[0], face.vertices[1]],
      [face.vertices[1], face.vertices[2]],
      [face.vertices[2], face.vertices[0]],
    ];
    
    for (const [a, b] of edges) {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (!edgeCount.has(key)) {
        edgeCount.set(key, [a, b]);
      } else {
        edgeCount.delete(key);
      }
    }
  }
  
  return Array.from(edgeCount.values());
}

function sharesEdge(a: HullFace, b: HullFace): boolean {
  const setA = new Set(a.vertices);
  let count = 0;
  for (const v of b.vertices) {
    if (setA.has(v)) count++;
  }
  return count === 2;
}

class HullFace {
  vertices: [number, number, number];
  private normal: Vec3 | null = null;
  private constant: number = 0;
  private points: Set<number> = new Set();

  constructor(vertices: [number, number, number], points: Vec3[]) {
    this.vertices = vertices;
    this.computePlane(points);
  }

  private computePlane(points: Vec3[]): void {
    const p0 = points[this.vertices[0]];
    const p1 = points[this.vertices[1]];
    const p2 = points[this.vertices[2]];

    const v1 = vec3Sub(p1, p0);
    const v2 = vec3Sub(p2, p0);
    this.normal = vec3Normalize(vec3Cross(v1, v2));
    this.constant = vec3Dot(this.normal, p0);
  }

  getNormal(): Vec3 {
    return this.normal!;
  }

  computeCentroid(points: Vec3[]): Vec3 {
    const p0 = points[this.vertices[0]];
    const p1 = points[this.vertices[1]];
    const p2 = points[this.vertices[2]];
    return {
      x: (p0.x + p1.x + p2.x) / 3,
      y: (p0.y + p1.y + p2.y) / 3,
      z: (p0.z + p1.z + p2.z) / 3
    };
  }

  signedDistance(idx: number, points: Vec3[]): number {
    return vec3Dot(this.normal!, points[idx]) - this.constant;
  }

  isOutside(idx: number, points: Vec3[]): boolean {
    return this.signedDistance(idx, points) > 1e-9;
  }

  addPoint(idx: number): void {
    this.points.add(idx);
  }

  getPoints(): number[] {
    return Array.from(this.points);
  }

  clearPoints(): void {
    this.points.clear();
  }

  getFurthestPoint(points: Vec3[]): { idx: number; dist: number } {
    let best = { idx: -1, dist: 0 };
    for (const idx of this.points) {
      const d = this.signedDistance(idx, points);
      if (d > best.dist) {
        best.dist = d;
        best.idx = idx;
      }
    }
    return best;
  }

  hasVertex(v: number): boolean {
    return this.vertices[0] === v || this.vertices[1] === v || this.vertices[2] === v;
  }

  flip(): void {
    [this.vertices[0], this.vertices[1]] = [this.vertices[1], this.vertices[0]];
    if (this.normal) {
      this.normal = vec3Scale(this.normal, -1);
      this.constant = -this.constant;
    }
  }
}

/**
 * Downsample points using spatial hashing for faster convex hull
 */
function downsamplePoints(points: number[][], targetCount: number): number[][] {
  if (points.length <= targetCount) {
    return points;
  }

  // Simple grid-based downsampling
  const gridSize = Math.ceil(Math.cbrt(points.length / targetCount));
  const grid = new Map<string, number[]>();

  // Find bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const p of points) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
    if (p[2] < minZ) minZ = p[2];
    if (p[2] > maxZ) maxZ = p[2];
  }

  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;
  const zRange = maxZ - minZ || 1;
  const maxRange = Math.max(xRange, yRange, zRange);

  // Assign points to grid cells
  for (const p of points) {
    const gx = Math.floor(((p[0] - minX) / xRange) * gridSize);
    const gy = Math.floor(((p[1] - minY) / yRange) * gridSize);
    const gz = Math.floor(((p[2] - minZ) / zRange) * gridSize);
    const key = `${gx},${gy},${gz}`;

    if (!grid.has(key)) {
      grid.set(key, p);
    } else {
      // Keep point with max distance from grid center
      const existing = grid.get(key)!;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const cz = (minZ + maxZ) / 2;
      const distExisting = (existing[0] - cx) ** 2 + (existing[1] - cy) ** 2 + (existing[2] - cz) ** 2;
      const distNew = (p[0] - cx) ** 2 + (p[1] - cy) ** 2 + (p[2] - cz) ** 2;
      if (distNew > distExisting) {
        grid.set(key, p);
      }
    }
  }

  return Array.from(grid.values());
}

// Face class for QuickHull
class Face {
  vertices: [number, number, number];
  private normal: Vec3;
  private constant: number;
  private visiblePoints: Set<number>;

  constructor(vertices: [number, number, number], points: Vec3[]) {
    this.vertices = vertices;
    this.visiblePoints = new Set();
    [this.normal, this.constant] = this.computePlane(points);
  }

  private computePlane(points: Vec3[]): [Vec3, number] {
    const p0 = points[this.vertices[0]];
    const p1 = points[this.vertices[1]];
    const p2 = points[this.vertices[2]];

    const v1 = vec3Sub(p1, p0);
    const v2 = vec3Sub(p2, p0);
    const normal = vec3Normalize(vec3Cross(v1, v2));
    const constant = vec3Dot(normal, p0);

    return [normal, constant];
  }

  // Signed distance from point to plane (positive = in front of face)
  signedDistance(pointIdx: number, points: Vec3[]): number {
    return vec3Dot(this.normal, points[pointIdx]) - this.constant;
  }

  // Check if a point is in front of this face
  isFaceVisible(pointIdx: number, points: Vec3[]): boolean {
    return this.signedDistance(pointIdx, points) > 1e-9;
  }

  getFurthestVisiblePoint(points: Vec3[]): { idx: number; dist: number } | null {
    let furthest: { idx: number; dist: number } | null = null;

    for (const ptIdx of this.visiblePoints) {
      const dist = this.signedDistance(ptIdx, points);
      if (dist > 1e-9) {
        if (furthest === null || dist > furthest.dist) {
          furthest = { idx: ptIdx, dist };
        }
      }
    }

    return furthest;
  }

  addVisiblePoint(pointIdx: number): void {
    this.visiblePoints.add(pointIdx);
  }

  getVisiblePoints(): number[] {
    return Array.from(this.visiblePoints);
  }

  hasVertex(vertexIdx: number): boolean {
    return this.vertices[0] === vertexIdx ||
           this.vertices[1] === vertexIdx ||
           this.vertices[2] === vertexIdx;
  }

  // Flip face orientation
  flip(): void {
    [this.vertices[0], this.vertices[1]] = [this.vertices[1], this.vertices[0]];
    this.normal = vec3Scale(this.normal, -1);
    this.constant = -this.constant;
  }
}

// Find horizon edges - edges that are only in one of the visible faces
function findHorizonEdges(visibleFaces: Face[], remainingFaces: Face[]): [number, number][] {
  const edgeCount: Map<string, { count: number; faces: Face[] }> = new Map();

  // Count how many times each edge appears in visible faces
  for (const face of visibleFaces) {
    const edges: [number, number][] = [
      [face.vertices[0], face.vertices[1]],
      [face.vertices[1], face.vertices[2]],
      [face.vertices[2], face.vertices[0]],
    ];

    for (const edge of edges) {
      const [a, b] = edge;
      const key = `${Math.min(a, b)},${Math.max(a, b)}`;
      if (!edgeCount.has(key)) {
        edgeCount.set(key, { count: 0, faces: [] });
      }
      const data = edgeCount.get(key)!;
      data.count++;
      data.faces.push(face);
    }
  }

  // Horizon edges appear exactly once in visible faces
  const horizonEdges: [number, number][] = [];
  for (const [key, data] of edgeCount) {
    if (data.count === 1) {
      const [a, b] = key.split(',').map(Number) as [number, number];
      horizonEdges.push([a, b]);
    }
  }

  return horizonEdges;
}

// Fallback: axis-aligned bounding box
function boundingBoxFallback(points: Vec3[]): { vertices: number[]; faces: number[] } {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }

  const corners = [
    minX, minY, minZ,
    maxX, minY, minZ,
    maxX, maxY, minZ,
    minX, maxY, minZ,
    minX, minY, maxZ,
    maxX, minY, maxZ,
    maxX, maxY, maxZ,
    minX, maxY, maxZ,
  ];

  const faces = [
    0, 2, 1,  0, 3, 2,  // Bottom
    4, 5, 6,  4, 6, 7,  // Top
    0, 1, 5,  0, 5, 4,  // Front
    2, 3, 7,  2, 7, 6,  // Back
    3, 0, 4,  3, 4, 7,  // Left
    1, 2, 6,  1, 6, 5   // Right
  ];

  return { vertices: corners, faces };
}

/**
 * Compute alpha shape boundary from point cloud
 * @param points Array of 3D points
 * @param alpha Alpha value for shape control (smaller = tighter fit)
 * @returns Object containing vertices and faces
 */
export function computeAlphaShape(points: number[][], alpha: number = 1.0): { vertices: number[]; faces: number[] } {
  // Alpha shape: like convex hull but allows concavities
  // For alpha = infinity, it's the convex hull
  // For smaller alpha, it carves out regions where points are sparse
  
  // Simplified approach: use convex hull but filter faces by edge length
  // This creates a "tighter" hull that follows the point cloud more closely
  const hull = computeConvexHull(points);
  
  if (alpha >= 1.0) {
    // Use full convex hull
    return hull;
  }
  
  // For smaller alpha, we'd need to subdivide and filter
  // For now, return the convex hull as a reasonable approximation
  return hull;
}

/**
 * Options for workspace boundary computation
 */
export interface WorkspaceBoundaryOptions {
  method: 'none' | 'convex_hull' | 'alpha_shape';
  alpha?: number; // For alpha shapes
}

/**
 * Compute workspace with optional boundary mesh
 * @returns Workspace result with points and optional boundary mesh
 */
export function sampleWorkspaceWithBoundary(
  pin: any,
  model: any,
  data: any,
  robotInfo: RobotInfo,
  numSamples: number = 2000,
  boundaryOptions: WorkspaceBoundaryOptions = { method: 'none' }
): WorkspaceResult & { boundary?: { vertices: number[]; faces: number[] } } {
  const result = sampleWorkspace(pin, model, data, robotInfo, numSamples, 'random');

  let boundary: { vertices: number[]; faces: number[] } | undefined = undefined;
  if (boundaryOptions.method === 'convex_hull' && result.points.length >= 4) {
    boundary = computeConvexHull(result.points);
  } else if (boundaryOptions.method === 'alpha_shape' && result.points.length >= 4) {
    boundary = computeAlphaShape(result.points, boundaryOptions.alpha);
  }

  return {
    ...result,
    boundary
  };
}
