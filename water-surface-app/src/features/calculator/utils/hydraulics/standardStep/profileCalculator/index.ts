/**
 * Profile Calculator Module
 * 
 * A collection of functions for water surface profile calculation
 * using the standard step method. This module includes:
 * - Core calculation algorithm
 * - Initial conditions setup and validation
 * - Profile interpolation and resampling
 * - Advanced calculation methods
 */

// Re-export core calculation functions
export { 
    calculateWaterSurfaceProfile,
    calculateInitialPoint,
    determineProfileType
  } from './coreCalculator';
  
  // Re-export initialization functions
  export {
    setupInitialConditions,
    validateCalculationParameters,
    determineOptimalStartingCondition,
    calculateOptimalStepCount
  } from './initialConditions';
  
  // Re-export profile interpolation functions
  export {
    interpolateProfileAtStations,
    createUniformProfile,
    resampleProfile,
    extractProfileSegment
  } from './profileInterpolation';
  
  // Re-export advanced calculation functions
  export {
    calculateHighResolutionProfile,
    calculateBidirectionalProfile,
    calculateMultipleFlowProfiles,
    calculateVariableRoughnessProfile,
    calculateAdaptiveResolutionProfile
  } from './advancedCalculations';
  
  // Combined interface for all profile calculator exports
  import { ChannelParams } from '../../../../stores/calculatorSlice';
  import { FlowDepthPoint, WaterSurfaceProfileResults } from '../types';
  
  /**
   * Calculates water surface profile with error handling and validation
   * @param params Channel parameters
   * @returns Result object with water surface profile or error message
   */
  export function calculateProfileWithErrorHandling(
    params: ChannelParams
  ): { results?: WaterSurfaceProfileResults; error?: string } {
    // Import needed functions
    const { validateCalculationParameters } = require('./initialConditions');
    const { calculateWaterSurfaceProfile } = require('./coreCalculator');
    
    try {
      // Validate parameters
      const validation = validateCalculationParameters(params);
      if (!validation.isValid) {
        return { error: validation.message };
      }
      
      // Calculate profile
      const results = calculateWaterSurfaceProfile(params);
      
      return { results };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Unknown calculation error' 
      };
    }
  }
  
  /**
   * Comprehensive profile calculation with additional options
   * @param params Channel parameters
   * @param options Calculation options
   * @returns Water surface profile results
   */
  export function calculateComprehensiveProfile(
    params: ChannelParams,
    options: {
      resolution?: 'low' | 'medium' | 'high' | 'adaptive';
      direction?: 'auto' | 'upstream' | 'downstream' | 'bidirectional';
      interpolate?: boolean;
      interpolationPoints?: number;
    } = {}
  ): WaterSurfaceProfileResults {
    // Set default options
    const {
      resolution = 'medium',
      direction = 'auto',
      interpolate = false,
      interpolationPoints = 100
    } = options;
    
    // Import needed functions
    const { calculateWaterSurfaceProfile } = require('./coreCalculator');
    const { calculateHighResolutionProfile, calculateBidirectionalProfile, calculateAdaptiveResolutionProfile } = require('./advancedCalculations');
    const { createUniformProfile } = require('./profileInterpolation');
    
    // Calculate profile based on resolution
    let results: WaterSurfaceProfileResults;
    
    switch (resolution) {
      case 'low':
        results = calculateWaterSurfaceProfile(params);
        break;
      case 'high':
        results = calculateHighResolutionProfile(params, 300);
        break;
      case 'adaptive':
        results = calculateAdaptiveResolutionProfile(params);
        break;
      case 'medium':
      default:
        results = calculateHighResolutionProfile(params, 150);
        break;
    }
    
    // Apply direction-based calculation
    if (direction === 'bidirectional') {
      results = calculateBidirectionalProfile(params);
    }
    
    // Interpolate if requested
    if (interpolate) {
      results.flowProfile = createUniformProfile(results.flowProfile, interpolationPoints);
    }
    
    return results;
  }