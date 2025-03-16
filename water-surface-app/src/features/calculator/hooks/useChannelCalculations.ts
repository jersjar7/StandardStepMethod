import { useState, useCallback } from 'react';
import { 
  CalculationResult, 
  HydraulicJump,
  FlowDepthPoint,
  WaterSurfaceProfileResults,
  ChannelParams
} from '../types';
import { 
  convertToStandardHydraulicJump 
} from '../types/hydraulicJumpTypes';
import { 
  calculateWaterSurfaceProfile as calculationUtil
} from '../utils/hydraulics/standardStep/profileCalculator';
import {
  calculateCriticalDepth
} from '../utils/hydraulics/criticalFlow';
import {
  calculateNormalDepth
} from '../utils/hydraulics/normalFlow';
import {
  calculateArea,
  calculateTopWidth,
  calculateWetPerimeter,
  calculateHydraulicRadius
} from '../utils/hydraulics/channelGeometry';

/**
 * Hook for handling hydraulic calculations
 * 
 * This hook provides a clean interface for performing water surface profile calculations
 * and related hydraulic computations, with proper state management for loading and error states.
 */
export const useChannelCalculations = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Convert flow points from calculation utility to standard calculation results
   * @param points Flow depth points from calculation
   * @param params Channel parameters
   * @returns Standardized calculation results
   */
  const convertFlowPointsToResults = (
    points: FlowDepthPoint[],
    params: ChannelParams
  ): CalculationResult[] => {
    return points.map(point => ({
      station: point.x,
      depth: point.y,
      velocity: point.velocity,
      area: calculateArea(point.y, params),
      topWidth: calculateTopWidth(point.y, params),
      wetPerimeter: calculateWetPerimeter(point.y, params),
      hydraulicRadius: calculateHydraulicRadius(point.y, params),
      energy: point.specificEnergy,
      froudeNumber: point.froudeNumber,
      criticalDepth: point.criticalDepth,
      normalDepth: point.normalDepth
    }));
  };

  /**
   * Calculate the water surface profile for a given channel
   * 
   * @param params Channel parameters
   * @returns Promise with calculation results and hydraulic jump information
   */
  const calculateWaterSurfaceProfile = useCallback(async (params: ChannelParams): Promise<{
    results: CalculationResult[];
    hydraulicJump: HydraulicJump;
  }> => {
    setIsCalculating(true);
    setError(null);
    
    try {
      // Call the imported utility function to calculate the water surface profile
      // We're doing a synchronous calculation but wrapping in an async function for future flexibility
      const output: WaterSurfaceProfileResults = calculationUtil(params);
      
      // Convert from the hydraulics utility format to our application format
      const results = convertFlowPointsToResults(output.flowProfile, params);
      
      // Convert hydraulic jump format using the standardized conversion function
      const hydraulicJump = output.hydraulicJump || { occurs: false };
      
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

  /**
   * Calculate the critical depth for the given channel parameters
   * 
   * @param params Channel parameters
   * @returns Critical depth
   */
  const getCriticalDepth = useCallback((params: ChannelParams): number => {
    try {
      return calculateCriticalDepth(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      return 0;
    }
  }, []);

  /**
   * Calculate the normal depth for the given channel parameters
   * 
   * @param params Channel parameters
   * @returns Normal depth
   */
  const getNormalDepth = useCallback((params: ChannelParams): number => {
    try {
      return calculateNormalDepth(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      return 0;
    }
  }, []);

  return {
    calculateWaterSurfaceProfile,
    getCriticalDepth,
    getNormalDepth,
    isCalculating,
    error
  };
};