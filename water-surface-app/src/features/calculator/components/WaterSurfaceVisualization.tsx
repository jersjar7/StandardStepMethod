import React, { useEffect, useRef, useState } from 'react';
import { 
  WaterSurfaceProfileResults,
  FlowDepthPoint,
  UnitSystem
} from '../types';
import { formatWithUnit } from '../../../utils/formatters';

interface WaterSurfaceVisualizationProps {
  standardResults: WaterSurfaceProfileResults;
  unitSystem?: UnitSystem;
}

const WaterSurfaceVisualization: React.FC<WaterSurfaceVisualizationProps> = ({ 
  standardResults,
  unitSystem = 'metric'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });

  useEffect(() => {
    // Handle resize events
    const handleResize = () => {
      if (containerRef.current) {
        const width = Math.min(containerRef.current.clientWidth, 800);
        setCanvasSize({ width, height: width / 2 });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    // Check if we have valid standardized results
    const hasResults = standardResults?.flowProfile && standardResults.flowProfile.length > 0;
    
    if (!hasResults) {
      setIsLoading(false);
      setError("No calculation results available");
      return;
    }

    try {
      setIsLoading(true);
      renderWaterSurface();
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during visualization");
      setIsLoading(false);
    }
  }, [standardResults, canvasSize, unitSystem]);

  const renderWaterSurface = () => {
    if (!canvasRef.current || !standardResults?.flowProfile) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Extract data from standardized results
    const flowProfile = standardResults.flowProfile;
    const stations = flowProfile.map(p => p.x);
    const depths = flowProfile.map(p => p.y);
    const criticalDepth = standardResults.criticalDepth;
    const normalDepth = standardResults.normalDepth;

    // Find min and max values for scaling
    const minStation = Math.min(...stations);
    const maxStation = Math.max(...stations);
    const maxDepth = Math.max(...depths, criticalDepth, normalDepth) * 1.2; // Add 20% margin

    // Set padding
    const padding = { left: 50, right: 30, top: 20, bottom: 50 };
    
    // Calculate scale factors
    const xScale = (canvas.width - padding.left - padding.right) / (maxStation - minStation);
    const yScale = (canvas.height - padding.top - padding.bottom) / maxDepth;
    
    // Function to convert coordinates
    const transformX = (x: number) => padding.left + (x - minStation) * xScale;
    const transformY = (y: number) => canvas.height - padding.bottom - y * yScale;

    // Draw axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(padding.left, canvas.height - padding.bottom);
    ctx.lineTo(canvas.width - padding.right, canvas.height - padding.bottom);
    ctx.stroke();
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(padding.left, canvas.height - padding.bottom);
    ctx.lineTo(padding.left, padding.top);
    ctx.stroke();

    // X axis ticks and labels
    const xStep = Math.ceil((maxStation - minStation) / 10);
    for (let i = 0; i <= maxStation; i += xStep) {
      const x = transformX(i);
      
      // Draw tick
      ctx.beginPath();
      ctx.moveTo(x, canvas.height - padding.bottom);
      ctx.lineTo(x, canvas.height - padding.bottom + 5);
      ctx.stroke();
      
      // Draw label
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.fillText(i.toString(), x, canvas.height - padding.bottom + 15);
    }
    
    // Y axis ticks and labels
    const yStep = maxDepth / 5;
    for (let i = 0; i <= maxDepth; i += yStep) {
      const y = transformY(i);
      
      // Draw tick
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left - 5, y);
      ctx.stroke();
      
      // Draw label
      ctx.fillStyle = '#000';
      ctx.textAlign = 'right';
      ctx.fillText(i.toFixed(1), padding.left - 8, y + 4);
    }

    // Axis labels
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText(`Station (${unitSystem === 'metric' ? 'm' : 'ft'})`, canvas.width / 2, canvas.height - 10);
    
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(`Elevation (${unitSystem === 'metric' ? 'm' : 'ft'})`, 0, 0);
    ctx.restore();

    // Draw channel bottom
    ctx.beginPath();
    ctx.moveTo(transformX(minStation), transformY(0));
    ctx.lineTo(transformX(maxStation), transformY(0));
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw critical depth line
    if (criticalDepth > 0) {
      ctx.beginPath();
      ctx.moveTo(transformX(minStation), transformY(criticalDepth));
      ctx.lineTo(transformX(maxStation), transformY(criticalDepth));
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Label
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'right';
      ctx.fillText(`Critical Depth: ${criticalDepth.toFixed(3)} ${unitSystem === 'metric' ? 'm' : 'ft'}`, canvas.width - padding.right, transformY(criticalDepth) - 10);
    }

    // Draw normal depth line
    if (normalDepth > 0) {
      ctx.beginPath();
      ctx.moveTo(transformX(minStation), transformY(normalDepth));
      ctx.lineTo(transformX(maxStation), transformY(normalDepth));
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Label
      ctx.fillStyle = '#10b981';
      ctx.textAlign = 'right';
      ctx.fillText(`Normal Depth: ${normalDepth.toFixed(3)} ${unitSystem === 'metric' ? 'm' : 'ft'}`, canvas.width - padding.right, transformY(normalDepth) - 10);
    }

    // Draw water surface
    // Sort data points by station to ensure correct line drawing
    const sortedPoints = [...flowProfile].sort((a, b) => a.x - b.x);
    
    ctx.beginPath();
    ctx.moveTo(transformX(sortedPoints[0].x), transformY(sortedPoints[0].y));
    
    for (let i = 1; i < sortedPoints.length; i++) {
      ctx.lineTo(transformX(sortedPoints[i].x), transformY(sortedPoints[i].y));
    }
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Fill water area
    ctx.lineTo(transformX(sortedPoints[sortedPoints.length - 1].x), transformY(0));
    ctx.lineTo(transformX(sortedPoints[0].x), transformY(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fill();

    // Draw froude number indicators
    sortedPoints.forEach((point, i) => {
      // Only draw for some points to avoid clutter
      if (i % 10 === 0) {
        const x = transformX(point.x);
        const y = transformY(point.y);
        
        if (point.froudeNumber > 1) {
          // Supercritical flow - red indicator
          ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        } else if (point.froudeNumber < 1) {
          // Subcritical flow - blue indicator
          ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    });
    
    // Draw title
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.font = '16px Arial';
    ctx.fillText('Water Surface Profile', canvas.width / 2, padding.top);
    
    // Draw hydraulic jump if present
    if (standardResults.hydraulicJump?.occurs) {
      const jump = standardResults.hydraulicJump;
      const jumpStation = jump.station || 0;
      
      if (jumpStation >= minStation && jumpStation <= maxStation) {
        const jumpX = transformX(jumpStation);
        const upstreamY = transformY(jump.upstreamDepth || 0);
        const downstreamY = transformY(jump.downstreamDepth || 0);
        
        // Draw vertical line representing the jump
        ctx.beginPath();
        ctx.moveTo(jumpX, upstreamY);
        ctx.lineTo(jumpX, downstreamY);
        ctx.strokeStyle = '#f59e0b'; // Amber color
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw arrow heads
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(jumpX - 5, upstreamY + 5);
        ctx.lineTo(jumpX, upstreamY);
        ctx.lineTo(jumpX + 5, upstreamY + 5);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(jumpX - 5, downstreamY - 5);
        ctx.lineTo(jumpX, downstreamY);
        ctx.lineTo(jumpX + 5, downstreamY - 5);
        ctx.fill();
        
        // Label
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.fillText('Hydraulic Jump', jumpX, upstreamY - 10);
      }
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Water Surface Profile Visualization</h3>
      
      {isLoading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : error ? (
        <div className="h-96 flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : (
        <div ref={containerRef} className="w-full flex flex-col items-center">
          <canvas 
            ref={canvasRef} 
            width={canvasSize.width} 
            height={canvasSize.height}
            className="border border-gray-200"
          />
        </div>
      )}
      
      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-2">Visualization Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500"></div>
            <span className="ml-2 text-sm text-gray-700">Water Surface Profile</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500"></div>
            <span className="ml-2 text-sm text-gray-700">Critical Depth</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500"></div>
            <span className="ml-2 text-sm text-gray-700">Normal Depth</span>
          </div>
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="ml-2 text-sm text-gray-700">Subcritical Flow (Fr &lt; 1)</span>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="ml-2 text-sm text-gray-700">Supercritical Flow (Fr &gt; 1)</span>
            </div>
          </div>
          {standardResults?.hydraulicJump?.occurs && (
            <div className="flex items-center">
              <div className="w-4 h-4 bg-amber-500"></div>
              <span className="ml-2 text-sm text-gray-700">Hydraulic Jump</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Profile Information */}
      {standardResults && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h4 className="text-md font-medium text-gray-900 mb-2">Profile Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <span className="text-sm font-medium">Profile Type: </span>
              <span className="text-sm">{standardResults.profileType}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Channel Type: </span>
              <span className="text-sm">{standardResults.channelType}</span>
            </div>
            {standardResults.hydraulicJump?.occurs && (
              <div className="col-span-1 md:col-span-2">
                <span className="text-sm font-medium">Hydraulic Jump: </span>
                <span className="text-sm">
                  Occurs at station {formatWithUnit(standardResults.hydraulicJump.station || 0, 'station', unitSystem, 2)}, 
                  from depth {formatWithUnit(standardResults.hydraulicJump.upstreamDepth || 0, 'depth', unitSystem, 3)} 
                  to {formatWithUnit(standardResults.hydraulicJump.downstreamDepth || 0, 'depth', unitSystem, 3)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Flow regime explanation */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 className="text-md font-medium text-gray-900 mb-2">Flow Regime Information</h4>
        <p className="text-sm text-gray-700">
          The water surface profile shows how water depth changes along the channel. 
          For subcritical flow (Fr &lt; 1), control is from downstream, while for supercritical flow (Fr &gt; 1), 
          control is from upstream. Normal depth represents uniform flow, and critical depth 
          is where specific energy is minimized.
        </p>
      </div>
    </div>
  );
};

export default WaterSurfaceVisualization;