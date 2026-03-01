/**
 * PDF Report Generator
 * Generates comprehensive robot analysis reports using jsPDF
 */

import { jsPDF } from 'jspdf';

// Types for report data
interface RobotInfo {
  name?: string;
  dof: number;
  jointCount: number;
  jointNames: string[];
  lowerLimits?: (number | null)[];
  upperLimits?: (number | null)[];
}

interface ComputedData {
  torques?: number[];
  energy?: { kinetic: number; potential: number; total?: number };
  massMatrix?: number[][];
  jacobian?: number[][];
  com?: { x: number; y: number; z: number };
  forwardDynamics?: { accelerations: number[] };
  maxTorques?: {
    maxTorques: number[];
    gravityTorques: number[];
    jointNames: string[];
    config?: number[];
  };
  lastComputed?: number;
}

interface WorkspaceReportData {
  pointCount?: number;
  boundingBox?: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

interface PDFReportOptions {
  robotInfo: RobotInfo;
  jointPositions: number[];
  computedData?: ComputedData;
  workspaceData?: WorkspaceReportData;
  screenshot?: string;
}

// Color scheme (as tuples for proper type inference)
const COLORS = {
  primary: [30, 58, 138] as [number, number, number],      // Dark blue
  secondary: [59, 130, 246] as [number, number, number],   // Blue
  accent: [16, 185, 129] as [number, number, number],      // Green
  text: [31, 41, 55] as [number, number, number],          // Dark gray
  lightGray: [156, 163, 175] as [number, number, number],  // Gray
  background: [249, 250, 251] as [number, number, number], // Light gray
  warning: [245, 158, 11] as [number, number, number],     // Amber
  error: [239, 68, 68] as [number, number, number],        // Red
};

/**
 * Generate a comprehensive PDF report for robot analysis
 */
export async function generatePDFReport(options: PDFReportOptions): Promise<Blob> {
  const { robotInfo, jointPositions, computedData, workspaceData, screenshot } = options;
  
  // Create PDF document (A4 format)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  
  let y = margin;
  let pageNum = 1;

  // Helper function to add a new page
  const addNewPage = () => {
    // Add footer to current page before adding new one
    addFooter();
    doc.addPage();
    pageNum++;
    y = margin;
  };

  // Helper function to check if we need a new page
  const checkNewPage = (neededHeight: number): boolean => {
    if (y + neededHeight > pageHeight - 20) {
      addNewPage();
      return true;
    }
    return false;
  };

  // Add footer to all pages at the end
  const addFooter = () => {
    // Footer line
    doc.setDrawColor(...COLORS.lightGray);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    
    // Footer text
    doc.setTextColor(...COLORS.lightGray);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Robot Analyzer - Pinocchio.js', margin, pageHeight - 7);
    doc.text(`Page ${pageNum}`, pageWidth - margin - 15, pageHeight - 7);
  };

  // === HEADER ===
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Robot Analysis Report', margin, 18);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Generated: ${date}`, margin, 28);
  
  y = 45;

  // === ROBOT INFO SECTION ===
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, y, contentWidth, 32, 3, 3, 'F');
  
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Robot Information', margin + 5, y + 8);
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const robotName = robotInfo.name || 'Unknown Robot';
  doc.text(`Name: ${robotName}`, margin + 5, y + 16);
  doc.text(`Degrees of Freedom: ${robotInfo.dof}`, margin + 5, y + 24);
  doc.text(`Joint Count: ${robotInfo.jointCount}`, margin + 80, y + 16);
  
  y += 40;

  // === 3D VIEW SCREENSHOT ===
  if (screenshot) {
    checkNewPage(90);
    
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3D Robot View', margin, y);
    y += 5;
    
    try {
      // Add screenshot with proper aspect ratio
      // Calculate dimensions maintaining aspect ratio
      const maxImgWidth = contentWidth;
      const maxImgHeight = 70;
      
      // We need to get the image dimensions first
      // For now, use fixed dimensions that work for most 3D views
      const imgWidth = maxImgWidth;
      const imgHeight = maxImgHeight;
      
      // Center the image
      const imgX = margin;
      
      // Add border
      doc.setDrawColor(...COLORS.lightGray);
      doc.setLineWidth(0.5);
      doc.rect(imgX - 1, y - 1, imgWidth + 2, imgHeight + 2);
      
      doc.addImage(screenshot, 'JPEG', imgX, y, imgWidth, imgHeight, undefined, 'MEDIUM');
      y += imgHeight + 10;
    } catch (e) {
      doc.setTextColor(...COLORS.lightGray);
      doc.setFontSize(10);
      doc.text('[Screenshot not available]', margin, y + 30);
      y += 40;
    }
  }

  // === JOINT POSITIONS TABLE ===
  checkNewPage(35 + Math.min(robotInfo.jointNames.length, 15) * 7);
  
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Joint Positions', margin, y);
  y += 5;

  // Table header
  doc.setFillColor(...COLORS.secondary);
  doc.rect(margin, y, contentWidth, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Joint Name', margin + 3, y + 5);
  doc.text('Position (rad)', margin + 55, y + 5);
  doc.text('Position (deg)', margin + 95, y + 5);
  doc.text('Limits', margin + 135, y + 5);
  
  y += 8;

  // Table rows
  doc.setFont('helvetica', 'normal');
  robotInfo.jointNames.forEach((name, i) => {
    checkNewPage(10);
    
    const isEven = i % 2 === 0;
    if (isEven) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y, contentWidth, 7, 'F');
    }
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(8);
    
    // Truncate long joint names
    const displayName = name.length > 18 ? name.substring(0, 16) + '...' : name;
    doc.text(displayName, margin + 3, y + 5);
    
    const pos = jointPositions[i] ?? 0;
    doc.text(pos.toFixed(4), margin + 55, y + 5);
    doc.text((pos * 180 / Math.PI).toFixed(2), margin + 95, y + 5);
    
    // Limits
    const lower = robotInfo.lowerLimits?.[i];
    const upper = robotInfo.upperLimits?.[i];
    let limitsText = '—';
    if (lower !== null && lower !== undefined && upper !== null && upper !== undefined) {
      limitsText = `${(lower * 180 / Math.PI).toFixed(0)}° to ${(upper * 180 / Math.PI).toFixed(0)}°`;
    }
    doc.setFontSize(7);
    doc.text(limitsText, margin + 135, y + 5);
    doc.setFontSize(8);
    
    y += 7;
  });
  
  y += 8;

  // === DYNAMICS DATA ===
  if (computedData) {
    // === INVERSE DYNAMICS (Torques) ===
    if (computedData.torques && computedData.torques.length > 0) {
      checkNewPage(40 + Math.min(computedData.torques.length, 10) * 7);
      
      doc.setFillColor(...COLORS.background);
      doc.roundedRect(margin, y, contentWidth, 10, 3, 3, 'F');
      
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('⚡ Inverse Dynamics (Torques)', margin + 5, y + 7);
      y += 15;

      // Table header
      doc.setFillColor(100, 116, 139);
      doc.rect(margin, y, contentWidth, 7, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Joint', margin + 3, y + 5);
      doc.text('Torque (N·m)', margin + 60, y + 5);
      doc.text('Magnitude', margin + 100, y + 5);
      doc.text('Direction', margin + 140, y + 5);
      y += 7;

      const maxTorque = Math.max(...computedData.torques.map(Math.abs));
      
      computedData.torques.forEach((torque, i) => {
        checkNewPage(8);
        
        const isEven = i % 2 === 0;
        if (isEven) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, y, contentWidth, 6, 'F');
        }
        
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(8);
        
        const jointName = robotInfo.jointNames[i] || `Joint ${i}`;
        const displayName = jointName.length > 20 ? jointName.substring(0, 18) + '...' : jointName;
        doc.text(displayName, margin + 3, y + 4);
        doc.text(torque.toFixed(4), margin + 60, y + 4);
        doc.text(Math.abs(torque).toFixed(4), margin + 100, y + 4);
        doc.text(torque >= 0 ? 'CCW (+)' : 'CW (-)', margin + 140, y + 4);
        
        y += 6;
      });

      // Summary
      y += 5;
      doc.setTextColor(...COLORS.accent);
      doc.setFontSize(9);
      doc.text(`Max Torque: ${maxTorque.toFixed(4)} N·m | Total: ${computedData.torques.reduce((a, b) => a + Math.abs(b), 0).toFixed(4)} N·m`, margin, y);
      y += 10;
    }

    // === FORWARD DYNAMICS (Accelerations) ===
    if (computedData.forwardDynamics?.accelerations) {
      checkNewPage(40);

      doc.setFillColor(...COLORS.background);
      doc.roundedRect(margin, y, contentWidth, 10, 3, 3, 'F');

      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('🔄 Forward Dynamics (Accelerations)', margin + 5, y + 7);
      y += 15;

      doc.setFillColor(100, 116, 139);
      doc.rect(margin, y, contentWidth, 7, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Joint', margin + 3, y + 5);
      doc.text('Acceleration (rad/s²)', margin + 60, y + 5);
      y += 7;

      computedData.forwardDynamics.accelerations.forEach((acc: number, i: number) => {
        checkNewPage(7);

        const isEven = i % 2 === 0;
        if (isEven) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, y, contentWidth, 6, 'F');
        }

        doc.setTextColor(...COLORS.text);
        doc.setFontSize(8);

        const jointName = robotInfo.jointNames[i] || `Joint ${i}`;
        doc.text(jointName.substring(0, 20), margin + 3, y + 4);
        doc.text(acc.toFixed(6), margin + 60, y + 4);

        y += 6;
      });
      y += 8;
    }

    // === MAX DYNAMIC TORQUES ===
    if (computedData.maxTorques && computedData.maxTorques.maxTorques.length > 0) {
      const mt = computedData.maxTorques;
      checkNewPage(40 + Math.min(mt.maxTorques.length, 10) * 7);

      doc.setFillColor(...COLORS.background);
      doc.roundedRect(margin, y, contentWidth, 10, 3, 3, 'F');

      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('📊 Max Dynamic Torques (Workspace)', margin + 5, y + 7);
      y += 15;

      // Table header
      doc.setFillColor(100, 116, 139);
      doc.rect(margin, y, contentWidth, 7, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Joint', margin + 3, y + 5);
      doc.text('Max Torque (N·m)', margin + 55, y + 5);
      doc.text('Current Gravity', margin + 100, y + 5);
      y += 7;

      const globalMax = Math.max(...mt.maxTorques);

      mt.maxTorques.forEach((torque: number, i: number) => {
        checkNewPage(8);

        const isEven = i % 2 === 0;
        if (isEven) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, y, contentWidth, 6, 'F');
        }

        doc.setTextColor(...COLORS.text);
        doc.setFontSize(8);

        const jointName = mt.jointNames[i] || robotInfo.jointNames[i] || `Joint ${i}`;
        const displayName = jointName.length > 18 ? jointName.substring(0, 16) + '...' : jointName;
        doc.text(displayName, margin + 3, y + 4);
        doc.text(torque.toFixed(4), margin + 55, y + 4);
        doc.text((mt.gravityTorques[i] ?? 0).toFixed(4), margin + 100, y + 4);

        y += 6;
      });

      // Summary
      y += 5;
      doc.setTextColor(...COLORS.accent);
      doc.setFontSize(9);
      doc.text(`Global Max: ${globalMax.toFixed(4)} N·m | Worst-case joint torques across workspace`, margin, y);
      y += 10;
    }

    // === ENERGY ANALYSIS ===
    if (computedData.energy) {
      checkNewPage(40);
      
      doc.setFillColor(...COLORS.background);
      doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'F');
      
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('⚡ Energy Analysis', margin + 5, y + 8);
      
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const energy = computedData.energy;
      const ke = energy.kinetic ?? 0;
      const pe = energy.potential ?? 0;
      const total = energy.total ?? (ke + pe);
      
      doc.text(`Kinetic Energy:`, margin + 10, y + 18);
      doc.text(`${ke.toFixed(6)} J`, margin + 60, y + 18);
      
      doc.text(`Potential Energy:`, margin + 10, y + 26);
      doc.text(`${pe.toFixed(6)} J`, margin + 60, y + 26);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Energy:`, margin + 10, y + 34);
      doc.setTextColor(...COLORS.accent);
      doc.text(`${total.toFixed(6)} J`, margin + 60, y + 34);
      
      y += 45;
    }

    // === CENTER OF MASS ===
    if (computedData.com) {
      checkNewPage(30);
      
      doc.setFillColor(...COLORS.background);
      doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'F');
      
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('🎯 Center of Mass', margin + 5, y + 8);
      
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const com = computedData.com;
      doc.text(`X: ${com.x.toFixed(6)} m`, margin + 10, y + 16);
      doc.text(`Y: ${com.y.toFixed(6)} m`, margin + 60, y + 16);
      doc.text(`Z: ${com.z.toFixed(6)} m`, margin + 110, y + 16);
      
      // Distance from origin
      const dist = Math.sqrt(com.x ** 2 + com.y ** 2 + com.z ** 2);
      doc.setTextColor(...COLORS.accent);
      doc.text(`Distance from origin: ${dist.toFixed(6)} m`, margin + 10, y + 23);
      
      y += 35;
    }

    // === MASS MATRIX ===
    if (computedData.massMatrix && computedData.massMatrix.length > 0) {
      const n = computedData.massMatrix.length;
      checkNewPage(50);
      
      doc.setFillColor(...COLORS.background);
      doc.roundedRect(margin, y, contentWidth, 10, 3, 3, 'F');
      
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`📐 Mass Matrix (M) - ${n}×${n}`, margin + 5, y + 7);
      y += 15;

      // Diagonal elements (effective inertia)
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Effective Inertia (Diagonal):', margin, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const diagonal = computedData.massMatrix.map((row, i) => row[i]);
      const diagText = diagonal.map((d, i) => `J${i + 1}: ${d.toFixed(4)}`).join(', ');
      
      // Split into multiple lines if too long
      const words = diagText.split(', ');
      let currentLine = '';
      words.forEach((word) => {
        if ((currentLine + word).length > 90) {
          doc.text(currentLine.trim(), margin, y);
          y += 5;
          currentLine = word + ', ';
        } else {
          currentLine += word + ', ';
        }
      });
      if (currentLine.trim()) {
        doc.text(currentLine.trim().replace(/,\s*$/, ''), margin, y);
        y += 5;
      }

      // Condition number estimate
      const diagMax = Math.max(...diagonal);
      const diagMin = Math.min(...diagonal.filter(d => d > 0.001));
      if (diagMin > 0) {
        const conditionEstimate = diagMax / diagMin;
        doc.setTextColor(...COLORS.accent);
        doc.setFontSize(9);
        doc.text(`Condition Estimate: ${conditionEstimate.toFixed(2)}`, margin, y);
        y += 8;
      }

      // Show matrix if small enough
      if (n <= 6) {
        checkNewPage(25);
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Full Matrix:', margin, y);
        y += 6;
        
        doc.setFont('courier', 'normal');
        doc.setFontSize(6);
        computedData.massMatrix.forEach((row, i) => {
          const rowStr = row.map(v => v.toFixed(3).padStart(8)).join('');
          doc.text(`[${i}] ${rowStr}`, margin, y);
          y += 4;
        });
      }
      
      y += 8;
    }

    // === JACOBIAN ===
    if (computedData.jacobian && computedData.jacobian.length > 0) {
      const rows = computedData.jacobian.length;
      const cols = computedData.jacobian[0]?.length || 0;
      
      checkNewPage(50);
      
      doc.setFillColor(...COLORS.background);
      doc.roundedRect(margin, y, contentWidth, 10, 3, 3, 'F');
      
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`🧮 Jacobian Matrix - ${rows}×${cols}`, margin + 5, y + 7);
      y += 15;

      // Compute singular values (simplified - just show norms)
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      // Row norms
      const rowNorms = computedData.jacobian.map(row => 
        Math.sqrt(row.reduce((sum, val) => sum + val * val, 0))
      );
      
      doc.text('Row Norms (velocity transmission):', margin, y);
      y += 5;
      doc.setFontSize(8);
      const normsText = rowNorms.map((n, i) => `Row ${i}: ${n.toFixed(4)}`).join(', ');
      
      // Wrap text
      const normWords = normsText.split(', ');
      let normLine = '';
      normWords.forEach((word) => {
        if ((normLine + word).length > 95) {
          doc.text(normLine.trim(), margin, y);
          y += 4;
          normLine = word + ', ';
        } else {
          normLine += word + ', ';
        }
      });
      if (normLine.trim()) {
        doc.text(normLine.trim().replace(/,\s*$/, ''), margin, y);
        y += 6;
      }

      // Manipulability measure
      const manip = Math.sqrt(rowNorms.reduce((sum, n) => sum + n * n, 0));
      doc.setTextColor(...COLORS.accent);
      doc.setFontSize(9);
      doc.text(`Manipulability Index: ${manip.toFixed(6)}`, margin, y);
      y += 10;
    }
  }

  // === WORKSPACE DATA ===
  if (workspaceData) {
    checkNewPage(35);
    
    doc.setFillColor(...COLORS.background);
    doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F');
    
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('🔮 Workspace Analysis', margin + 5, y + 8);
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (workspaceData.pointCount) {
      doc.text(`Sample Points: ${workspaceData.pointCount.toLocaleString()}`, margin + 10, y + 18);
    }
    
    if (workspaceData.boundingBox) {
      const bb = workspaceData.boundingBox;
      const dx = (bb.max[0] - bb.min[0]).toFixed(4);
      const dy = (bb.max[1] - bb.min[1]).toFixed(4);
      const dz = (bb.max[2] - bb.min[2]).toFixed(4);
      doc.text(`Dimensions: ${dx} × ${dy} × ${dz} m`, margin + 10, y + 26);
      
      // Volume estimate
      const volume = (bb.max[0] - bb.min[0]) * (bb.max[1] - bb.min[1]) * (bb.max[2] - bb.min[2]);
      doc.text(`Volume: ${volume.toFixed(4)} m³`, margin + 100, y + 18);
    }
    
    y += 40;
  }

  // === SUMMARY SECTION ===
  checkNewPage(50);
  
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin + 5, y + 5);
  y += 12;

  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const summaryItems: string[] = [];
  summaryItems.push(`Robot: ${robotInfo.name || 'Unknown'}`);
  summaryItems.push(`DOF: ${robotInfo.dof}`);
  summaryItems.push(`Joints analyzed: ${robotInfo.jointCount}`);
  
  if (computedData?.torques) {
    const maxT = Math.max(...computedData.torques.map(Math.abs));
    summaryItems.push(`Max torque: ${maxT.toFixed(4)} N·m`);
  }
  
  if (computedData?.energy) {
    summaryItems.push(`Total energy: ${(computedData.energy.kinetic + computedData.energy.potential).toFixed(4)} J`);
  }
  
  if (computedData?.com) {
    const dist = Math.sqrt(computedData.com.x ** 2 + computedData.com.y ** 2 + computedData.com.z ** 2);
    summaryItems.push(`CoM distance: ${dist.toFixed(4)} m`);
  }
  
  if (workspaceData?.boundingBox) {
    const bb = workspaceData.boundingBox;
    const maxReach = Math.max(
      Math.abs(bb.max[0]), Math.abs(bb.min[0]),
      Math.abs(bb.max[1]), Math.abs(bb.min[1])
    );
    summaryItems.push(`Max reach: ~${maxReach.toFixed(3)} m`);
  }

  // Display summary in two columns
  const col1 = summaryItems.slice(0, Math.ceil(summaryItems.length / 2));
  const col2 = summaryItems.slice(Math.ceil(summaryItems.length / 2));
  
  col1.forEach((item, i) => {
    doc.text(`• ${item}`, margin + 5, y + (i * 5));
  });
  
  col2.forEach((item, i) => {
    doc.text(`• ${item}`, margin + 90, y + (i * 5));
  });

  // Add footer to last page
  addFooter();

  // Return as Blob
  return doc.output('blob');
}

/**
 * Capture 3D canvas as screenshot with proper aspect ratio
 */
export async function captureCanvasScreenshot(
  maxWidth: number = 1280,
  quality: number = 0.85
): Promise<string | null> {
  try {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;

    // Create a temporary canvas for resizing
    const tempCanvas = document.createElement('canvas');
    let width = canvas.width;
    let height = canvas.height;

    // Maintain aspect ratio
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);
    }

    tempCanvas.width = width;
    tempCanvas.height = height;
    
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(canvas, 0, 0, width, height);

    return tempCanvas.toDataURL('image/jpeg', quality);
  } catch (e) {
    console.error('Failed to capture screenshot:', e);
    return null;
  }
}

export default generatePDFReport;
