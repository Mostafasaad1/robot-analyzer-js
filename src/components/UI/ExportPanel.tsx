/**
 * Export Panel
 * Export robot analysis report as JSON or CSV
 */

import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { apiService } from '../../services/api';
import { InfoTooltip } from './InfoTooltip';

export function ExportPanel() {
    const { sessionId, robotInfo } = useSessionStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resizeScreenshot = (dataUrl: string, maxWidth: number = 1280): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Fill white background to avoid black transparency in some viewers
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    // Use JPEG for better compression since it's a report
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                } else {
                    resolve(dataUrl);
                }
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    };

    const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
        if (!sessionId) return;
        setLoading(true);
        setError(null);
        try {
            let screenshot = undefined;
            if (format === 'pdf') {
                // Capture screenshot from the 3D canvas
                const canvas = document.querySelector('canvas');
                if (canvas) {
                    const rawScreenshot = canvas.toDataURL('image/png');
                    screenshot = await resizeScreenshot(rawScreenshot);
                }
            }

            const data = await apiService.exportReport(sessionId, format, screenshot);

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${robotInfo?.name || 'robot'}_report.json`;
                a.click();
                URL.revokeObjectURL(url);
            } else if (format === 'pdf') {
                // Create blob link for PDF
                const blob = new Blob([data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${robotInfo?.name || 'robot'}_report.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            } else if (format === 'csv') {
                // For CSV, data should be the text content
                const blob = new Blob([data], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${robotInfo?.name || 'robot'}_report.csv`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!robotInfo) {
        return (
            <div className="dynamics-panel">
                <h3>📊 Export Report <InfoTooltip title="Export Report">Download the complete robot analysis as JSON, CSV, or PDF format for documentation and sharing.</InfoTooltip></h3>
                <div className="empty-state-mini">Load a robot first</div>
            </div>
        );
    }

    return (
        <div className="dynamics-panel">
            <h3>📊 Export Report <InfoTooltip title="Export Report">Download the complete robot analysis as JSON, CSV, or PDF format for documentation and sharing.</InfoTooltip></h3>
            <p className="panel-description">Download comprehensive analysis</p>

            <div className="export-buttons">
                <button
                    className="compute-btn export-json-btn"
                    onClick={() => handleExport('json')}
                    disabled={loading}
                >
                    {loading ? '⏳' : '📋 JSON'}
                </button>
                <button
                    className="compute-btn export-csv-btn"
                    onClick={() => handleExport('csv')}
                    disabled={loading}
                >
                    {loading ? '⏳' : '📄 CSV'}
                </button>
                <button
                    className="compute-btn export-pdf-btn"
                    onClick={() => handleExport('pdf')}
                    disabled={loading}
                >
                    {loading ? '⏳' : '📑 PDF'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
        </div>
    );
}

export default ExportPanel;
