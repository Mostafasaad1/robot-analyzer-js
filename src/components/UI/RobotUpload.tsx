/**
 * Robot Upload Component
 */

import { useState } from 'react';
import { useRobotSession } from '../../hooks/useRobotSession';
import { extractRobotPackage, validateRobotPackage } from '../../utils/zipExtractor';
import { parseURDF } from '../../utils/urdfParser';
import { InfoTooltip } from './InfoTooltip';

export function RobotUpload() {
  const { createSession } = useRobotSession();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please upload a .zip file');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setProgress(0);

      // Extract ZIP
      const extracted = await extractRobotPackage(file);
      setProgress(30);

      // Validate package
      const validation = validateRobotPackage(extracted);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid robot package');
      }
      setProgress(50);

      // Parse URDF to get robot info (not used locally but could be for validation)
      void parseURDF(extracted.urdfContent);
      setProgress(70);

      // Convert Map to Record for API
      const meshFilesRecord: Record<string, Blob> = {};
      extracted.meshFiles.forEach((blob, filename) => {
        meshFilesRecord[filename] = blob;
      });

      // Create session with backend
      await createSession(extracted.urdfContent, meshFilesRecord, extracted.urdfFilename);
      setProgress(100);

      // Reset after success
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload robot');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="robot-upload">
      <h3>
        📁 Upload Robot
        <InfoTooltip
          title="Required ZIP Structure"
          position="right"
        >
          <p>The ZIP file should contain:</p>
          <ul>
            <li><code>.urdf</code> or <code>.xacro</code> robot description file</li>
            <li><code>meshes/</code> folder with STL or DAE files</li>
            <li>Optional: <code>urdf/</code> subfolder for URDF files</li>
          </ul>
          <pre>
robot_description.zip
├── robot.urdf
└── meshes/
    ├── link1.stl
    ├── link2.stl
    └── ...
          </pre>
          <p><strong>Note:</strong> The URDF file should reference mesh files using relative paths like <code>package://meshes/link1.stl</code> or <code>meshes/link1.stl</code></p>
        </InfoTooltip>
      </h3>
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
          id="robot-upload-input"
        />
        <label htmlFor="robot-upload-input" className="upload-button">
          {uploading ? (
            <span>
              <span className="spinner">⏳</span> Uploading... {progress}%
            </span>
          ) : (
            <span>📤 Choose ZIP File</span>
          )}
        </label>
        <p className="upload-hint">
          Drag & drop or click to upload<br />
          ZIP containing URDF and mesh files (STL/DAE)
        </p>
      </div>
      {error && <div className="error-message">⚠️ {error}</div>}
    </div>
  );
}

export default RobotUpload;
