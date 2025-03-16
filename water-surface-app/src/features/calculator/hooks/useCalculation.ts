import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  startCalculation, 
  calculationSuccess, 
  calculationFailure, 
  resetCalculator
} from '../stores/calculatorActions';
import { RootState } from '../../../stores';
import { ChannelParams, CalculationResult, HydraulicJump } from '../types';
import { useChannelCalculations } from './useChannelCalculations';
import { validateAllInputs } from '../validators/inputValidators';

/**
 * Hook for managing calculation state and actions with Redux
 * 
 * This hook provides methods to trigger water surface profile calculations
 * while managing the application state through Redux.
 */
export const useCalculation = () => {
  const dispatch = useDispatch();
  const { 
    calculateWaterSurfaceProfile,
    getCriticalDepth,
    getNormalDepth
  } = useChannelCalculations();
  
  // Get current state from Redux
  const { 
    channelParams,
    isCalculating, 
    results, 
    hydraulicJump,
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
      
      // Calculate water surface profile
      const { results, hydraulicJump } = await calculateWaterSurfaceProfile(updatedParams);
      
      // Update Redux state with results
      dispatch(calculationSuccess({
        results,
        hydraulicJump
      }));
      
      return { results, hydraulicJump };
    } catch (error) {
      // Handle calculation error
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      dispatch(calculationFailure(errorMessage));
      return null;
    }
  }, [dispatch, channelParams, calculateWaterSurfaceProfile, getCriticalDepth, getNormalDepth]);

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
    if (!results.length || !channelParams.normalDepth || !channelParams.criticalDepth) {
      return 'unknown';
    }
    
    const { normalDepth, criticalDepth } = channelParams;
    
    if (normalDepth > criticalDepth) return 'mild';
    if (normalDepth < criticalDepth) return 'steep';
    return 'critical';
  }, [results, channelParams]);

  return {
    runCalculation,
    resetCalculation,
    isCalculating,
    results,
    hydraulicJump,
    error,
    canCalculate,
    getChannelClassification
  };
};

export default useCalculation;