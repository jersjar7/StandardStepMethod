import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  startCalculation, 
  setWaterSurfaceResults,
  calculationFailure, 
  resetCalculator
} from '../stores/calculatorActions';
import { RootState } from '../../../stores';
import { 
  ChannelParams, 
  WaterSurfaceProfileResults,
  FlowRegime 
} from '../types';
import { useChannelCalculations } from './useChannelCalculations';
import { validateAllInputs } from '../validators/inputValidators';

/**
 * Hook for managing calculation state and actions with Redux
 * 
 * This hook provides methods to trigger water surface profile calculations
 * using the standardized data types, with proper Redux state management.
 */
export const useCalculation = () => {
  const dispatch = useDispatch();
  const { 
    calculateDetailedProfile,
    getCriticalDepth,
    getNormalDepth
  } = useChannelCalculations();
  
  // Get current state from Redux
  const { 
    channelParams,
    isCalculating, 
    detailedResults,
    error 
  } = useSelector((state: RootState) => state.calculator);

  /**
   * Run water surface profile calculation
   * Handles Redux state updates and error handling
   */
  const runCalculation = useCallback(async (params: ChannelParams = channelParams) => {
    // Start calculation and update Redux state
    dispatch(startCalculation());
    
    try {
      // Validate input parameters
      const { isValid, errors } = validateAllInputs(params);
      if (!isValid) {
        const errorMessage = Object.values(errors).join(', ');
        dispatch(calculationFailure(errorMessage));
        return null;
      }
      
      // First, ensure we have critical and normal depths
      const updatedParams = { ...params };
      if (!updatedParams.criticalDepth) {
        updatedParams.criticalDepth = getCriticalDepth(updatedParams);
      }
      
      if (!updatedParams.normalDepth) {
        updatedParams.normalDepth = getNormalDepth(updatedParams);
      }
      
      // Calculate detailed water surface profile
      const result = await calculateDetailedProfile(updatedParams);
      
      if (result.error) {
        dispatch(calculationFailure(result.error));
        return null;
      }
      
      if (!result.results) {
        dispatch(calculationFailure("Calculation produced no results"));
        return null;
      }
      
      // Update Redux state with results
      dispatch(setWaterSurfaceResults(result.results));
      
      return result.results;
    } catch (error) {
      // Handle calculation error
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      dispatch(calculationFailure(errorMessage));
      return null;
    }
  }, [dispatch, channelParams, calculateDetailedProfile, getCriticalDepth, getNormalDepth]);

  /**
   * Check if calculation can proceed based on current parameters
   */
  const canCalculate = useCallback((): boolean => {
    const { isValid } = validateAllInputs(channelParams);
    return isValid;
  }, [channelParams]);

  /**
   * Reset the calculator state
   */
  const resetCalculation = useCallback(() => {
    dispatch(resetCalculator());
  }, [dispatch]);

  /**
   * Get the channel slope classification based on normal and critical depths
   */
  const getChannelClassification = useCallback((): 'mild' | 'critical' | 'steep' | 'unknown' => {
    if (!detailedResults || !channelParams.normalDepth || !channelParams.criticalDepth) {
      return 'unknown';
    }
    
    const { normalDepth, criticalDepth } = channelParams;
    
    if (normalDepth > criticalDepth) return 'mild';
    if (normalDepth < criticalDepth) return 'steep';
    return 'critical';
  }, [detailedResults, channelParams]);

  /**
   * Get the predominant flow regime for the profile
   */
  const getFlowRegime = useCallback((): FlowRegime | undefined => {
    if (!detailedResults?.flowProfile || detailedResults.flowProfile.length === 0) {
      return undefined;
    }
    
    // Determine based on Froude numbers in the profile
    let subcriticalCount = 0;
    let supercriticalCount = 0;
    
    detailedResults.flowProfile.forEach(point => {
      if (point.froudeNumber < 1) subcriticalCount++;
      else supercriticalCount++;
    });
    
    if (subcriticalCount > supercriticalCount) {
      return FlowRegime.SUBCRITICAL;
    } else if (supercriticalCount > subcriticalCount) {
      return FlowRegime.SUPERCRITICAL;
    } else {
      return FlowRegime.CRITICAL;
    }
  }, [detailedResults]);

  return {
    runCalculation,
    resetCalculation,
    isCalculating,
    results: detailedResults,
    error,
    canCalculate,
    getChannelClassification,
    getFlowRegime
  };
};

export default useCalculation;