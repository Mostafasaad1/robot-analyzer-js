/**
 * URDF parsing utilities
 */

import { RobotInfo } from '../types/robot';

/**
 * Parse URDF content to extract robot information
 */
export function parseURDF(urdfContent: string): Partial<RobotInfo> {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(urdfContent, 'application/xml');

  // Get robot name
  const robotElement = xmlDoc.getElementsByTagName('robot')[0];
  const robotName = robotElement?.getAttribute('name') || 'Unknown Robot';

  // Get all joints
  const jointElements = xmlDoc.getElementsByTagName('joint');
  const jointNames: string[] = [];
  const jointLimits: { lower: number[]; upper: number[] } = {
    lower: [],
    upper: [],
  };

  for (let i = 0; i < jointElements.length; i++) {
    const joint = jointElements[i];
    const jointType = joint.getAttribute('type');
    
    // Only consider movable joints (revolute, prismatic, continuous)
    if (jointType === 'revolute' || jointType === 'prismatic' || jointType === 'continuous') {
      const name = joint.getAttribute('name');
      if (name) {
        jointNames.push(name);
      }

      // Get joint limits
      const limit = joint.getElementsByTagName('limit')[0];
      if (limit) {
        const lower = parseFloat(limit.getAttribute('lower') || '0');
        const upper = parseFloat(limit.getAttribute('upper') || '0');
        jointLimits.lower.push(lower);
        jointLimits.upper.push(upper);
      } else {
        // For continuous joints, use -π to π
        jointLimits.lower.push(-Math.PI);
        jointLimits.upper.push(Math.PI);
      }
    }
  }

  // Get neutral configuration (all zeros for now)
  const neutralConfig = new Array(jointNames.length).fill(0);

  return {
    name: robotName,
    jointNames,
    jointCount: jointNames.length,
    dof: jointNames.length,
    lowerLimits: jointLimits.lower,
    upperLimits: jointLimits.upper,
    neutralConfig,
  };
}

/**
 * Extract mesh paths from URDF
 */
export function extractMeshPaths(urdfContent: string): string[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(urdfContent, 'application/xml');
  const meshTags = xmlDoc.getElementsByTagName('mesh');
  const meshPaths: string[] = [];

  for (let i = 0; i < meshTags.length; i++) {
    const filename = meshTags[i].getAttribute('filename');
    if (filename) {
      meshPaths.push(filename);
    }
  }

  return meshPaths;
}
