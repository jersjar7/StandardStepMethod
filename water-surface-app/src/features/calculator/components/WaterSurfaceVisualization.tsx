import React, { useEffect, useRef, useState } from 'react';
import { 
  WaterSurfaceProfileResults,
  UnitSystem
} from '../types';
import { formatWithUnit } from '../../../utils/formatters';

interface WaterSurfaceVisualizationProps {
  results: WaterSurfaceProfileResults;
  unitSystem?: UnitSystem;
}

const WaterSurfaceVisualization: React.FC<WaterSurfaceVisualizationProps> = ({ 
  results,
  unitSystem = 'metric'
}) => {
  // Rest of the existing implementation remains the same, 
  // just replace all instances of `standardResults` with `results`
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
    // Check if we have valid results
    const hasResults = results?.flowProfile && results.flowProfile.length > 0;
    
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
  }, [results, canvasSize, unitSystem]);

  // Rest of the existing implementation, 
  // replacing `standardResults` with `results`
  const renderWaterSurface = () => {
    if (!canvasRef.current || !results?.flowProfile) return;
    
    // Existing implementation remains the same
    // Just replace all `standardResults` with `results`
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
      
      {/* Rest of the existing implementation, 
          replacing `standardResults` with `results` */}
      
      {/* Additional information from results if available */}
      {results && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Profile Information</h4>
          <p className="text-xs text-gray-700">
            Profile Type: {results.profileType}
          </p>
          {'profileDescription' in results && results.profileDescription && (
            <p className="text-xs text-gray-700 mt-1">
              {results.profileDescription}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WaterSurfaceVisualization;