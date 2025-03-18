import { useState, useCallback } from 'react';
import { 
  WaterSurfaceProfileResults,
  ChannelParams,
  DetailedWaterSurfaceResults,
} from '../types';

// Import the calculation utilities with renamed imports to avoid naming conflicts
import { 
  calculateWaterSurfaceProfile as waterSurfaceProfileCalculator,
  calculateDetailedProfile as detailedProfileCalculator,
  calculateProfileWithErrorHandling as profileErrorHandler
} from '../utils/hydraulics';

import {
  calculateCriticalDepth
} from '../utils/hydraulics/criticalFlow';

import {
  calculateNormalDepth
} from '../utils/hydraulics/normalFlow';

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
   * Calculate the water surface profile for a given channel
   * 
   * @param params Channel parameters
   * @returns Promise with standardized water surface profile results
   */
  const calculateWaterSurfaceProfile = useCallback(async (
    params: ChannelParams
  ): Promise<WaterSurfaceProfileResults | null> => {
    setIsCalculating(true);
    setError(null);
    
    try {
      // Call the imported utility function to calculate the water surface profile
      const output: WaterSurfaceProfileResults = waterSurfaceProfileCalculator(params);
      
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
   * Run a detailed calculation that returns results using the standardized types
   * 
   * @param params Channel parameters
   * @returns Promise with standardized water surface profile results
   */
  const calculateDetailedProfile = useCallback(async (
    params: ChannelParams
  ): Promise<{ results?: DetailedWaterSurfaceResults; error?: string }> => {
    setIsCalculating(true);
    setError(null);
    
    try {
      // Call the detailed calculation function that returns standardized results
      const result = await Promise.resolve(detailedProfileCalculator(params));
      
      setIsCalculating(false);
      
      if (result.error) {
        setError(result.error);
      }
      
      return result;
    } catch (error) {
      setIsCalculating(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      return { error: errorMessage };
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
      const result = profileErrorHandler(params);
      
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
   * Get the full water surface profile results
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
      const output = waterSurfaceProfileCalculator(params);
      
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
    // Standardized calculation methods
    calculateWaterSurfaceProfile,
    calculateDetailedProfile,
    calculateProfileWithHandling,
    getRawWaterSurfaceProfile,
    
    // Helper calculations
    getCriticalDepth,
    getNormalDepth,
    
    // State
    isCalculating,
    error
  };
};

export default useChannelCalculations;