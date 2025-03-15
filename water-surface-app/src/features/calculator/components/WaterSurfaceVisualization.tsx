import React, { useEffect, useRef, useState } from 'react';
import { CalculationResult } from '../stores/calculatorSlice';

interface WaterSurfaceVisualizationProps {
  results: CalculationResult[];
}

const WaterSurfaceVisualization: React.FC<WaterSurfaceVisualizationProps> = ({ results }) => {
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
    if (!results || results.length === 0) {
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
  }, [results, canvasSize]);

  const renderWaterSurface = () => {
    if (!canvasRef.current || !results || results.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Extract data from results
    const stations = results.map(r => r.station);
    const depths = results.map(r => r.depth);
    const criticalDepth = results[0]?.criticalDepth || 0;
    const normalDepth = results[0]?.normalDepth || 0;

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
    ctx.fillText('Station (m)', canvas.width / 2, canvas.height - 10);
    
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Elevation (m)', 0, 0);
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
      ctx.fillText(`Critical Depth: ${criticalDepth.toFixed(3)} m`, canvas.width - padding.right, transformY(criticalDepth) - 10);
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
      ctx.fillText(`Normal Depth: ${normalDepth.toFixed(3)} m`, canvas.width - padding.right, transformY(normalDepth) - 10);
    }

    // Draw water surface
    ctx.beginPath();
    ctx.moveTo(transformX(results[0].station), transformY(results[0].depth));
    
    for (let i = 1; i < results.length; i++) {
      ctx.lineTo(transformX(results[i].station), transformY(results[i].depth));
    }
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Fill water area
    ctx.lineTo(transformX(results[results.length - 1].station), transformY(0));
    ctx.lineTo(transformX(results[0].station), transformY(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fill();

    // Draw froude number indicators
    results.forEach((result, i) => {
      // Only draw for some points to avoid clutter
      if (i % 10 === 0) {
        const x = transformX(result.station);
        const y = transformY(result.depth);
        
        if (result.froudeNumber > 1) {
          // Supercritical flow - red indicator
          ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        } else if (result.froudeNumber < 1) {
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
        </div>
      </div>
      
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