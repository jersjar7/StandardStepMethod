// src/features/calculator/hooks/useStandardCalculation.ts

import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../stores';
import {
  startCalculation,
  setWaterSurfaceResults,
  calculationFailure,
  resetResults
} from '../stores/calculatorSlice';

import { calculationService, CalculationOptions } from '../services/calculationService';
import {
  ChannelParams,
  WaterSurfaceProfileResults,
  DetailedWaterSurfaceResults,
} from '../types';

/**
 * Options for the standard calculation hook
 */
export interface UseStandardCalculationOptions {
  useRedux?: boolean;          // Whether to use Redux for state management
  autoManageState?: boolean;   // Whether to automatically manage loading and error states
  calculationOptions?: Partial<CalculationOptions>; // Options for the calculation service
  onProgress?: (progress: number) => void; // Progress callback
}

/**
 * Default hook options
 */
const defaultOptions: UseStandardCalculationOptions = {
  useRedux: true,           // Use Redux by default
  autoManageState: true,    // Automatically manage state by default
  calculationOptions: {     // Default calculation options
    useWorker: true,
    useCache: true,
    showProgress: true
  }
};

/**
 * Unified calculation hook
 * 
 * This hook provides a standardized interface for water surface profile calculations,
 * supporting both Redux and local state management.
 * 
 * @param options Hook options
 * @returns Calculation methods and state
 */
export function useStandardCalculation(
  options: UseStandardCalculationOptions = defaultOptions
) {
  // Merge provided options with defaults
  const hookOptions = { ...defaultOptions, ...options };
  
  // Redux state and dispatch
  const dispatch = useDispatch();
  const reduxState = useSelector((state: RootState) => state.calculator);
  
  // Local state for when not using Redux
  const [localIsCalculating, setLocalIsCalculating] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localResults, setLocalResults] = useState<WaterSurfaceProfileResults | null>(null);
  const [progress, setProgress] = useState<number>(0);
  
  // Update calculation service options
  useEffect(() => {
    if (hookOptions.calculationOptions) {
      calculationService.updateOptions({
        ...hookOptions.calculationOptions,
        showProgress: true // Always enable progress reporting for the hook
      });
    }
    
    // Clean up when unmounting
    return () => {
      calculationService.terminate();
    };
  }, [hookOptions.calculationOptions]);

  /**
   * Progress handler
   * @param currentProgress Current progress value
   */
  const handleProgress = useCallback((currentProgress: number) => {
    setProgress(currentProgress);
    
    // If external progress handler is provided, call it
    if (hookOptions.onProgress) {
      hookOptions.onProgress(currentProgress);
    }
  }, [hookOptions.onProgress]);

  /**
   * Calculate water surface profile
   * @param params Channel parameters
   * @returns Promise with water surface profile results
   */
  const calculateWaterSurfaceProfile = useCallback(async (
    params: ChannelParams
  ): Promise<WaterSurfaceProfileResults | null> => {
    // Set loading state
    if (hookOptions.useRedux) {
      dispatch(startCalculation());
    } else if (hookOptions.autoManageState) {
      setLocalIsCalculating(true);
      setLocalError(null);
    }
    
    // Reset progress
    setProgress(0);
    
    try {
      // Run calculation through the service
      const result = await calculationService.calculateWaterSurfaceProfile(
        params, 
        handleProgress
      );
      
      // Handle error
      if (result.error) {
        if (hookOptions.useRedux) {
          dispatch(calculationFailure(result.error));
        } else if (hookOptions.autoManageState) {
          setLocalError(result.error);
          setLocalIsCalculating(false);
        }
        return null;
      }
      
      // Store results in state
      if (hookOptions.useRedux) {
        dispatch(setWaterSurfaceResults(result.results!));
      } else if (hookOptions.autoManageState) {
        setLocalResults(result.results!);
        setLocalIsCalculating(false);
      }
      
      return result.results || null;
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown calculation error';
      
      if (hookOptions.useRedux) {
        dispatch(calculationFailure(errorMessage));
      } else if (hookOptions.autoManageState) {
        setLocalError(errorMessage);
        setLocalIsCalculating(false);
      }
      
      return null;
    }
  }, [dispatch, hookOptions.useRedux, hookOptions.autoManageState, handleProgress]);

  /**
   * Calculate detailed water surface profile
   * @param params Channel parameters
   * @returns Promise with detailed water surface profile results
   */
  const calculateDetailedProfile = useCallback(async (
    params: ChannelParams
  ): Promise<DetailedWaterSurfaceResults | null> => {
    // Set loading state
    if (hookOptions.useRedux) {
      dispatch(startCalculation());
    } else if (hookOptions.autoManageState) {
      setLocalIsCalculating(true);
      setLocalError(null);
    }
    
    // Reset progress
    setProgress(0);
    
    try {
      // Run calculation through the service
      const result = await calculationService.calculateDetailedProfile(
        params, 
        handleProgress
      );
      
      // Handle error
      if (result.error) {
        if (hookOptions.useRedux) {
          dispatch(calculationFailure(result.error));
        } else if (hookOptions.autoManageState) {
          setLocalError(result.error);
          setLocalIsCalculating(false);
        }
        return null;
      }
      
      // Store results in state
      if (hookOptions.useRedux) {
        dispatch(setWaterSurfaceResults(result.results!));
      } else if (hookOptions.autoManageState) {
        setLocalResults(result.results!);
        setLocalIsCalculating(false);
      }
      
      return result.results || null;
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown calculation error';
      
      if (hookOptions.useRedux) {
        dispatch(calculationFailure(errorMessage));
      } else if (hookOptions.autoManageState) {
        setLocalError(errorMessage);
        setLocalIsCalculating(false);
      }
      
      return null;
    }
  }, [dispatch, hookOptions.useRedux, hookOptions.autoManageState, handleProgress]);

  /**
   * Calculate critical depth
   * @param params Channel parameters
   * @returns Critical depth
   */
  const calculateCriticalDepth = useCallback((
    params: ChannelParams
  ): number => {
    try {
      return calculationService.calculateCriticalDepth(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown calculation error';
      
      // Only update error state if autoManageState is enabled
      if (hookOptions.autoManageState) {
        if (hookOptions.useRedux) {
          dispatch(calculationFailure(errorMessage));
        } else {
          setLocalError(errorMessage);
        }
      }
      
      return 0;
    }
  }, [dispatch, hookOptions.useRedux, hookOptions.autoManageState]);

  /**
   * Calculate normal depth
   * @param params Channel parameters
   * @returns Normal depth
   */
  const calculateNormalDepth = useCallback((
    params: ChannelParams
  ): number => {
    try {
      return calculationService.calculateNormalDepth(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown calculation error';
      
      // Only update error state if autoManageState is enabled
      if (hookOptions.autoManageState) {
        if (hookOptions.useRedux) {
          dispatch(calculationFailure(errorMessage));
        } else {
          setLocalError(errorMessage);
        }
      }
      
      return 0;
    }
  }, [dispatch, hookOptions.useRedux, hookOptions.autoManageState]);

  /**
   * Reset calculation state
   */
  const resetCalculation = useCallback(() => {
    // Reset progress
    setProgress(0);
    
    if (hookOptions.useRedux) {
      dispatch(resetResults());
    } else if (hookOptions.autoManageState) {
      setLocalResults(null);
      setLocalError(null);
      setLocalIsCalculating(false);
    }
  }, [dispatch, hookOptions.useRedux, hookOptions.autoManageState]);

  /**
   * Get current calculation state
   */
  const getCalculationState = useCallback(() => {
    if (hookOptions.useRedux) {
      // Use Redux state
      return {
        isCalculating: reduxState.isCalculating,
        error: reduxState.error,
        results: reduxState.detailedResults,
        progress
      };
    } else {
      // Use local state
      return {
        isCalculating: localIsCalculating,
        error: localError,
        results: localResults,
        progress
      };
    }
  }, [
    hookOptions.useRedux,
    reduxState.isCalculating,
    reduxState.error,
    reduxState.detailedResults,
    localIsCalculating,
    localError,
    localResults,
    progress
  ]);

  /**
   * Update calculation options
   * @param newOptions New calculation options
   */
  const updateCalculationOptions = useCallback((
    newOptions: Partial<CalculationOptions>
  ) => {
    calculationService.updateOptions(newOptions);
  }, []);

  /**
   * Clear calculation cache
   */
  const clearCache = useCallback(() => {
    calculationService.clearCache();
  }, []);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return calculationService.getCacheStats();
  }, []);

  /**
   * Check if calculation can use a worker
   */
  const canUseWorker = useCallback(() => {
    return calculationService.canUseWorker();
  }, []);

  // Extract current state
  const { isCalculating, error, results } = getCalculationState();

  // Return hook interface
  return {
    // Core calculation methods
    calculateWaterSurfaceProfile,
    calculateDetailedProfile,
    calculateCriticalDepth,
    calculateNormalDepth,
    resetCalculation,
    
    // State management
    isCalculating,
    error,
    results,
    progress,
    
    // Configuration
    updateCalculationOptions,
    clearCache,
    getCacheStats,
    canUseWorker,
    
    // Raw access to service for advanced usage
    calculationService
  };
}

export default useStandardCalculation;