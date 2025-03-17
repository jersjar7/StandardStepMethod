import { useState, useCallback } from 'react';
import { 
  CalculationResult, 
  HydraulicJump,
  FlowDepthPoint,
  WaterSurfaceProfileResults,
  ChannelParams,
  StandardCalculationResult,
  ProfileType,
  FlowRegime,
  DetailedWaterSurfaceResults
} from '../types';

// Import the calculation utilities
import { 
  calculateWaterSurfaceProfile as calculationUtil,
  calculateDetailedProfile,
  calculateProfileWithErrorHandling
} from '../utils/hydraulics';

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
  const convertFlowPointsToResults = useCallback((
    points: FlowDepthPoint[],
    params: ChannelParams
  ): CalculationResult[] => {
    return points.map(point => {
      // Use the topWidth and area calculations from the geometry utilities
      const area = calculateArea(point.y, params);
      const topWidth = calculateTopWidth(point.y, params);
      const wetPerimeter = calculateWetPerimeter(point.y, params);
      const hydraulicRadius = calculateHydraulicRadius(point.y, params);
      
      return {
        station: point.x,
        depth: point.y,
        velocity: point.velocity,
        area,
        topWidth,
        wetPerimeter,
        hydraulicRadius,
        energy: point.specificEnergy,
        froudeNumber: point.froudeNumber,
        criticalDepth: point.criticalDepth,
        normalDepth: point.normalDepth
      };
    });
  }, []);

  /**
   * Calculate the water surface profile for a given channel
   * Legacy method that returns results in the old format for backward compatibility
   * 
   * @param params Channel parameters
   * @returns Promise with calculation results and hydraulic jump information
   */
  const calculateWaterSurfaceProfile = useCallback(async (params: ChannelParams): Promise<{
    results: CalculationResult[];
    hydraulicJump: HydraulicJump;
    profileType: ProfileType;
    flowRegime: FlowRegime;
  }> => {
    setIsCalculating(true);
    setError(null);
    
    try {
      // Call the imported utility function to calculate the water surface profile
      // We're doing a synchronous calculation but wrapping in an async function for future flexibility
      const output: WaterSurfaceProfileResults = calculationUtil(params);
      
      // Convert from the hydraulics utility format to our application format
      const results = convertFlowPointsToResults(output.flowProfile, params);
      
      // Extract hydraulic jump, profile type, and determine flow regime
      const hydraulicJump = output.hydraulicJump || { occurs: false };
      const profileType = output.profileType as ProfileType;
      
      // Determine flow regime based on Froude numbers
      let subcriticalCount = 0;
      let supercriticalCount = 0;
      
      output.flowProfile.forEach(point => {
        if (point.froudeNumber < 1) subcriticalCount++;
        else supercriticalCount++;
      });
      
      const flowRegime = subcriticalCount > supercriticalCount ? 
        FlowRegime.SUBCRITICAL : FlowRegime.SUPERCRITICAL;
      
      setIsCalculating(false);
      return {
        results,
        hydraulicJump,
        profileType,
        flowRegime
      };
    } catch (error) {
      setIsCalculating(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      throw error;
    }
  }, [convertFlowPointsToResults]);

  /**
   * Run a detailed calculation that returns results using the new standardized types
   * 
   * @param params Channel parameters
   * @returns Promise with standardized water surface profile results
   */
  const runDetailedCalculation = useCallback(async (
    params: ChannelParams
  ): Promise<WaterSurfaceProfileResults | null> => {
    setIsCalculating(true);
    setError(null);
    
    try {
      // Call the detailed calculation function that returns standardized results
      const result = calculateDetailedProfile(params);
      
      setIsCalculating(false);
      
      if (result.error) {
        setError(result.error);
        return null;
      }
      
      return result.results || null;
    } catch (error) {
      setIsCalculating(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    }
  }, []);

  /**
   * Calculate the water surface profile with error handling and standardized return type
   * 
   * @param params Channel parameters
   * @returns Promise with standardized water surface profile results or null if error
   */
  const calculateProfileWithHandling = useCallback(async (
    params: ChannelParams
  ): Promise<WaterSurfaceProfileResults | null> => {
    setIsCalculating(true);
    setError(null);
    
    try {
      const result = calculateProfileWithErrorHandling(params);
      
      setIsCalculating(false);
      
      if (result.error) {
        setError(result.error);
        return null;
      }
      
      return result.results || null;
    } catch (error) {
      setIsCalculating(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    }
  }, []);

  /**
   * Get the full water surface profile results without conversion
   * Useful for advanced visualizations and analysis
   * 
   * @param params Channel parameters
   * @returns Promise with full water surface profile results
   */
  const getRawWaterSurfaceProfile = useCallback(async (
    params: ChannelParams
  ): Promise<WaterSurfaceProfileResults> => {
    setIsCalculating(true);
    setError(null);
    
    try {
      // Call the imported utility function to calculate the water surface profile
      const output = calculationUtil(params);
      
      setIsCalculating(false);
      return output;
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
    // Legacy calculation method for backward compatibility
    calculateWaterSurfaceProfile,
    
    // New standardized calculation methods
    runDetailedCalculation,
    calculateProfileWithHandling,
    getRawWaterSurfaceProfile,
    
    // Helper calculations
    getCriticalDepth,
    getNormalDepth,
    convertFlowPointsToResults,
    
    // State
    isCalculating,
    error
  };
};

export default useChannelCalculations;