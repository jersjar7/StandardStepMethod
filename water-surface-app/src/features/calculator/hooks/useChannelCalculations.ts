import { useState, useCallback } from 'react';
import { 
  ChannelParams, 
  CalculationResult, 
  HydraulicJump 
} from '../stores/calculatorSlice';
import { 
  calculateWaterSurfaceProfile as calculateProfile,
  calculateCriticalDepth,
  calculateNormalDepth,
  FlowDepthPoint
} from '../utils/hydraulics';

/**
 * Hook for handling hydraulic calculations
 */
export const useChannelCalculations = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculate the water surface profile for a given channel
   */
  const calculateWaterSurfaceProfile = useCallback(async (params: ChannelParams): Promise<{
    results: CalculationResult[];
    hydraulicJump: HydraulicJump;
  }> => {
    setIsCalculating(true);
    setError(null);
    
    try {
      // Call the imported utility function to calculate the water surface profile
      const output = calculateProfile(params);
      
      // Convert from the hydraulics utility format to our application format
      const results: CalculationResult[] = output.flowProfile.map((point: FlowDepthPoint) => ({
        station: point.x,
        depth: point.y,
        velocity: point.velocity,
        area: calculateArea(point.y, params), // Calculate area based on depth
        topWidth: calculateTopWidth(point.y, params),
        wetPerimeter: calculateWetPerimeter(point.y, params),
        hydraulicRadius: calculateHydraulicRadius(point.y, params),
        energy: point.specificEnergy,
        froudeNumber: point.froudeNumber,
        criticalDepth: point.criticalDepth,
        normalDepth: point.normalDepth
      }));
      
      // Convert hydraulic jump format
      const hydraulicJump: HydraulicJump = output.hydraulicJump ? {
        occurs: true,
        station: output.hydraulicJump.position,
        upstreamDepth: output.hydraulicJump.depth1,
        downstreamDepth: output.hydraulicJump.depth2
      } : { occurs: false };
      
      setIsCalculating(false);
      return {
        results,
        hydraulicJump
      };
    } catch (error) {
      setIsCalculating(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      throw error;
    }
  }, []);

  // Helper functions to calculate channel properties
  // These are only used for the conversion between formats
  const calculateArea = (depth: number, params: ChannelParams): number => {
    switch (params.channelType) {
      case 'rectangular':
        return params.bottomWidth * depth;
      case 'trapezoidal':
        return (params.bottomWidth + (params.sideSlope || 0) * depth) * depth;
      case 'triangular':
        return (params.sideSlope || 1) * depth * depth;
      case 'circular':
        const diameter = params.diameter || 1.0;
        const theta = 2 * Math.acos(1 - 2 * depth / diameter);
        return (diameter * diameter / 8) * (theta - Math.sin(theta));
      default:
        throw new Error(`Unsupported channel type: ${params.channelType}`);
    }
  };
  
  const calculateTopWidth = (depth: number, params: ChannelParams): number => {
    switch (params.channelType) {
      case 'rectangular':
        return params.bottomWidth;
      case 'trapezoidal':
        return params.bottomWidth + 2 * (params.sideSlope || 0) * depth;
      case 'triangular':
        return 2 * (params.sideSlope || 1) * depth;
      case 'circular':
        const diameter = params.diameter || 1.0;
        const theta = 2 * Math.acos(1 - 2 * depth / diameter);
        return diameter * Math.sin(theta / 2);
      default:
        throw new Error(`Unsupported channel type: ${params.channelType}`);
    }
  };
  
  const calculateWetPerimeter = (depth: number, params: ChannelParams): number => {
    switch (params.channelType) {
      case 'rectangular':
        return params.bottomWidth + 2 * depth;
      case 'trapezoidal':
        return params.bottomWidth + 2 * depth * Math.sqrt(1 + (params.sideSlope || 0) ** 2);
      case 'triangular':
        return 2 * depth * Math.sqrt(1 + (params.sideSlope || 1) ** 2);
      case 'circular':
        const diameter = params.diameter || 1.0;
        const theta = 2 * Math.acos(1 - 2 * depth / diameter);
        return (diameter * theta) / 2;
      default:
        throw new Error(`Unsupported channel type: ${params.channelType}`);
    }
  };
  
  const calculateHydraulicRadius = (depth: number, params: ChannelParams): number => {
    const area = calculateArea(depth, params);
    const wetPerimeter = calculateWetPerimeter(depth, params);
    return area / wetPerimeter;
  };

  return {
    calculateWaterSurfaceProfile,
    calculateCriticalDepth, // Expose the imported utility functions
    calculateNormalDepth,
    isCalculating,
    error
  };
};