/**
 * Export Panel
 * Export robot analysis report as JSON, CSV, or PDF
 */

import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';
import { InfoTooltip } from './InfoTooltip';

export function ExportPanel() {
  const { sessionId, robotInfo } = useSessionStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    if (!sessionId) return;
    setLoading(format);
    setError(null);
    try {
      const data = await apiService.exportReport(sessionId, format);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${robotInfo?.name || 'robot'}_report_${timestamp}`;

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${filename}.json`);
      } else if (format === 'pdf') {
        // data is a Blob for PDF
        const blob = data as Blob;
        downloadBlob(blob, `${filename}.pdf`);
      } else if (format === 'csv') {
        const blob = new Blob([data], { type: 'text/csv' });
        downloadBlob(blob, `${filename}.csv`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(null);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!robotInfo) {
    return (
      <div className="dynamics-panel">
        <h3>📊 Export Report <InfoTooltip title="Export Report">{"Download robot analysis reports in multiple formats.\n\n📌 PDF includes:\n• Robot info & 3D screenshot\n• Joint positions table\n• Inverse Dynamics (torques)\n• Forward Dynamics (accelerations)\n• Max Dynamic Torques\n• Energy analysis\n• Center of Mass\n• Mass Matrix & Jacobian\n• Workspace analysis\n• Summary\n\n⚠️ Only computed data is exported. Run analyses first!\n\n📋 JSON/CSV: Structured data export."}</InfoTooltip></h3>
        <div className="empty-state-mini">Load a robot first</div>
      </div>
    );
  }

  return (
    <div className="dynamics-panel">
      <h3>📊 Export Report <InfoTooltip title="Export Report">{"Download robot analysis reports in multiple formats.\n\n📌 PDF includes:\n• Robot info & 3D screenshot\n• Joint positions table\n• Inverse Dynamics (torques)\n• Forward Dynamics (accelerations)\n• Max Dynamic Torques\n• Energy analysis\n• Center of Mass\n• Mass Matrix & Jacobian\n• Workspace analysis\n• Summary\n\n⚠️ Only computed data is exported. Run analyses first!\n\n📋 JSON/CSV: Structured data export."}</InfoTooltip></h3>
      <p className="panel-description">Download comprehensive analysis</p>

      <div className="export-buttons">
        <button
          className="compute-btn export-json-btn"
          onClick={() => handleExport('json')}
          disabled={loading !== null}
        >
          {loading === 'json' ? '⏳ Exporting...' : '📋 JSON'}
        </button>
        <button
          className="compute-btn export-csv-btn"
          onClick={() => handleExport('csv')}
          disabled={loading !== null}
        >
          {loading === 'csv' ? '⏳ Exporting...' : '📄 CSV'}
        </button>
        <button
          className="compute-btn export-pdf-btn"
          onClick={() => handleExport('pdf')}
          disabled={loading !== null}
        >
          {loading === 'pdf' ? '⏳ Generating PDF...' : '📑 PDF'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default ExportPanel;
