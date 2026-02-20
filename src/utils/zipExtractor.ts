/**
 * ZIP file extraction utilities
 */

import JSZip from 'jszip';

export interface ExtractedRobotPackage {
  urdfContent: string;
  meshFiles: Map<string, Blob>;
  urdfFilename: string;
}

/**
 * Extract URDF and mesh files from a ZIP archive
 */
export async function extractRobotPackage(zipFile: File): Promise<ExtractedRobotPackage> {
  const zip = new JSZip();
  const arrayBuffer = await zipFile.arrayBuffer();
  await zip.loadAsync(arrayBuffer);

  const meshFiles = new Map<string, Blob>();
  let urdfContent = '';
  let urdfFilename = '';

  // Find URDF file and mesh files
  const files = Object.keys(zip.files);

  for (const filename of files) {
    const file = zip.file(filename);
    if (!file) continue;

    // Skip directories
    if (filename.endsWith('/')) continue;

    // Check if it's a URDF file
    if (filename.toLowerCase().endsWith('.urdf')) {
      urdfContent = await file.async('text');
      urdfFilename = filename;
      continue;
    }

    // Check if it's a mesh file (STL or DAE)
    if (filename.toLowerCase().endsWith('.stl') || filename.toLowerCase().endsWith('.dae')) {
      const blob = await file.async('blob');
      meshFiles.set(filename, blob);
    }
  }

  if (!urdfContent) {
    throw new Error('No URDF file found in the ZIP archive');
  }

  return {
    urdfContent,
    meshFiles,
    urdfFilename,
  };
}

/**
 * Validate robot package structure
 */
export function validateRobotPackage(extracted: ExtractedRobotPackage): { valid: boolean; error?: string } {
  const { urdfContent, meshFiles } = extracted;

  // Parse URDF to check for mesh references
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(urdfContent, 'application/xml');

  // Check for mesh references
  const meshTags = xmlDoc.getElementsByTagName('mesh');
  const referencedMeshes = new Set<string>();

  for (let i = 0; i < meshTags.length; i++) {
    const filename = meshTags[i].getAttribute('filename');
    if (filename) {
      referencedMeshes.add(filename);
    }
  }

  // Check if all referenced meshes are present
  for (const meshRef of referencedMeshes) {
    if (!meshFiles.has(meshRef)) {
      // Strip package:// prefix if present, then normalize
      let cleanRef = meshRef.replace(/\\/g, '/');
      if (cleanRef.startsWith('package://')) {
        cleanRef = cleanRef.replace('package://', '');
      }

      // Extract just the filename for fallback matching
      const basename = cleanRef.split('/').pop() || cleanRef;

      const found = Array.from(meshFiles.keys()).some(key => {
        const normalizedKey = key.replace(/\\/g, '/');
        return (
          normalizedKey.endsWith(cleanRef) ||
          cleanRef.endsWith(normalizedKey) ||
          normalizedKey.endsWith(basename)
        );
      });

      if (!found) {
        return {
          valid: false,
          error: `Missing mesh file: ${meshRef}`,
        };
      }
    }
  }

  return { valid: true };
}
