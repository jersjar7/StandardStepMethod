// src/features/calculator/types/resultTypes.ts

/**
 * Standardized Result Types
 * This file provides extensions and utilities for working with calculation results
 * while relying on the primary type definitions from the main types file.
 */

import { 
  HydraulicJump,
  ProfileType,
  FlowRegime,
  WaterSurfaceProfileResults,
  FlowDepthPoint
} from './index';
   
  /**
   * Type for calculation result with potential error
   * Used for error handling in calculation processes
   */
  export interface CalculationResultWithError {
    results?: WaterSurfaceProfileResults;
    error?: string;
  }
  
  /**
   * Type for detailed calculation result with potential error
   * Used for advanced calculations with error handling
   */
  export interface DetailedCalculationResultWithError {
    results?: WaterSurfaceProfileResults & {
      profileDescription: string;
      profileDetails: string;
      stats?: ProfileStatistics;
    };
    error?: string;
  }
  
  /**
   * Type guard to check if a result has an error
   */
  export function hasError(result: CalculationResultWithError): boolean {
    return result.error !== undefined;
  }
  
  /**
   * Type guard to check if a result has detailed information
   */
  export function hasDetailedInfo(
    result: WaterSurfaceProfileResults
  ): result is WaterSurfaceProfileResults & {
    profileDescription: string;
    profileDetails: string;
  } {
    return 'profileDescription' in result;
  }
  
  /**
   * Creates a standard water surface profile results object
   */
  export function createStandardResults(
    flowProfile: FlowDepthPoint[],
    profileType: ProfileType,
    channelType: string,
    criticalDepth: number,
    normalDepth: number,
    isChoking: boolean = false,
    hydraulicJump?: HydraulicJump
  ): WaterSurfaceProfileResults {
    return {
      flowProfile,
      profileType,
      channelType,
      criticalDepth,
      normalDepth,
      isChoking,
      hydraulicJump
    };
  }
  
  /**
   * Result type definition for exporting to various formats
   */
  export interface ExportOptions {
    format: 'csv' | 'json' | 'report';  // Export format
    filename?: string;                  // Optional filename
    includeChannelParams?: boolean;     // Whether to include channel parameters
    includeHeaders?: boolean;           // Whether to include headers (for CSV)
    decimalPlaces?: number;             // Number of decimal places
  }
  
  /**
   * Profile statistics interface
   */
  export interface ProfileStatistics {
    minDepth: number;
    maxDepth: number;
    avgDepth: number;
    minVelocity: number;
    maxVelocity: number;
    avgVelocity: number;
    minFroude: number;
    maxFroude: number;
    avgFroude: number;
    minEnergy: number;
    maxEnergy: number;
    avgEnergy: number;
    length: number;
    numPoints: number;
    predominantFlowRegime: string;
  }
  
  /**
   * Flow regime description options
   */
  export const FLOW_REGIME_DESCRIPTIONS: Record<FlowRegime, string> = {
    [FlowRegime.SUBCRITICAL]: 'Subcritical Flow (Fr < 1)',
    [FlowRegime.CRITICAL]: 'Critical Flow (Fr = 1)',
    [FlowRegime.SUPERCRITICAL]: 'Supercritical Flow (Fr > 1)'
  };
  
  /**
   * Profile type descriptions
   */
  export const PROFILE_TYPE_DESCRIPTIONS: Record<ProfileType, string> = {
    [ProfileType.M1]: 'M1 - Backwater Curve (Mild Slope)',
    [ProfileType.M2]: 'M2 - Drawdown Curve (Mild Slope)',
    [ProfileType.M3]: 'M3 - Rapidly Varied Flow (Mild Slope)',
    [ProfileType.S1]: 'S1 - Backwater Curve (Steep Slope)',
    [ProfileType.S2]: 'S2 - Drawdown Curve (Steep Slope)',
    [ProfileType.S3]: 'S3 - Rapidly Varied Flow (Steep Slope)',
    [ProfileType.C1]: 'C1 - Backwater Curve (Critical Slope)',
    [ProfileType.C2]: 'C2 - Uniform Flow (Critical Slope)',
    [ProfileType.C3]: 'C3 - Drawdown Curve (Critical Slope)',
    [ProfileType.UNKNOWN]: 'Unknown Profile Type',
    [ProfileType.MIXED]: 'Mixed Profile Type'
  };
  
  /**
   * Channel slope descriptions
   */
  export const CHANNEL_SLOPE_DESCRIPTIONS: Record<string, string> = {
    'mild': 'Mild Slope (yn > yc)',
    'critical': 'Critical Slope (yn = yc)',
    'steep': 'Steep Slope (yn < yc)'
  };
  
  /**
   * Get a description of the flow regime based on Froude number
   */
  export function getFlowRegimeDescription(froudeNumber: number): string {
    if (froudeNumber < 0.95) {
      return FLOW_REGIME_DESCRIPTIONS[FlowRegime.SUBCRITICAL];
    } else if (froudeNumber > 1.05) {
      return FLOW_REGIME_DESCRIPTIONS[FlowRegime.SUPERCRITICAL];
    } else {
      return FLOW_REGIME_DESCRIPTIONS[FlowRegime.CRITICAL];
    }
  }
  
  /**
   * Determine the profile type based on channel characteristics and depths
   */
  export function determineProfileType(
    channelSlope: string, 
    depth: number, 
    normalDepth: number, 
    criticalDepth: number
  ): ProfileType {
    if (channelSlope === 'mild') {
      if (depth > normalDepth) return ProfileType.M1;
      if (depth < normalDepth && depth > criticalDepth) return ProfileType.M2;
      if (depth < criticalDepth) return ProfileType.M3;
    } else if (channelSlope === 'steep') {
      if (depth > criticalDepth) return ProfileType.S1;
      if (depth < criticalDepth && depth > normalDepth) return ProfileType.S2;
      if (depth < normalDepth) return ProfileType.S3;
    } else if (channelSlope === 'critical') {
      if (depth > criticalDepth) return ProfileType.C1;
      if (depth < criticalDepth) return ProfileType.C3;
      return ProfileType.C2;
    }
    
    return ProfileType.UNKNOWN;
  }
  
  /**
   * Get a description of the profile type
   */
  export function getProfileTypeDescription(profileType: ProfileType): string {
    return PROFILE_TYPE_DESCRIPTIONS[profileType] || 'Unknown Profile Type';
  }

  /**
   * CalculationResultWithError
   */
  export interface CalculationResultWithError {
    results?: WaterSurfaceProfileResults;
    error?: string;
  }