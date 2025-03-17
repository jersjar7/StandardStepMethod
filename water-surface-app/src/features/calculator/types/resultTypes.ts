// src/features/calculator/types/resultTypes.ts

/**
 * Standardized Result Types
 * This file provides extensions and utilities for working with calculation results
 * while relying on the primary type definitions from the main types file.
 */

import { 
    ChannelParams, 
    ChannelType, 
    UnitSystem,
    HydraulicJump,
    ProfileType as ProfileTypeEnum,
    FlowRegime as FlowRegimeEnum,
    WaterSurfaceProfileResults,
    FlowDepthPoint
  } from './index';
  
  // Re-export the enum types for convenience
  export type ProfileType = ProfileTypeEnum;
  export type FlowRegime = FlowRegimeEnum;
  
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
    profileType: ProfileTypeEnum | string,
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
  export const FLOW_REGIME_DESCRIPTIONS: Record<FlowRegimeEnum, string> = {
    [FlowRegimeEnum.SUBCRITICAL]: 'Subcritical Flow (Fr < 1)',
    [FlowRegimeEnum.CRITICAL]: 'Critical Flow (Fr = 1)',
    [FlowRegimeEnum.SUPERCRITICAL]: 'Supercritical Flow (Fr > 1)'
  };
  
  /**
   * Profile type descriptions
   */
  export const PROFILE_TYPE_DESCRIPTIONS: Record<ProfileTypeEnum, string> = {
    [ProfileTypeEnum.M1]: 'M1 - Backwater Curve (Mild Slope)',
    [ProfileTypeEnum.M2]: 'M2 - Drawdown Curve (Mild Slope)',
    [ProfileTypeEnum.M3]: 'M3 - Rapidly Varied Flow (Mild Slope)',
    [ProfileTypeEnum.S1]: 'S1 - Backwater Curve (Steep Slope)',
    [ProfileTypeEnum.S2]: 'S2 - Drawdown Curve (Steep Slope)',
    [ProfileTypeEnum.S3]: 'S3 - Rapidly Varied Flow (Steep Slope)',
    [ProfileTypeEnum.C1]: 'C1 - Backwater Curve (Critical Slope)',
    [ProfileTypeEnum.C2]: 'C2 - Uniform Flow (Critical Slope)',
    [ProfileTypeEnum.C3]: 'C3 - Drawdown Curve (Critical Slope)',
    [ProfileTypeEnum.UNKNOWN]: 'Unknown Profile Type'
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
      return FLOW_REGIME_DESCRIPTIONS[FlowRegimeEnum.SUBCRITICAL];
    } else if (froudeNumber > 1.05) {
      return FLOW_REGIME_DESCRIPTIONS[FlowRegimeEnum.SUPERCRITICAL];
    } else {
      return FLOW_REGIME_DESCRIPTIONS[FlowRegimeEnum.CRITICAL];
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
  ): ProfileTypeEnum {
    if (channelSlope === 'mild') {
      if (depth > normalDepth) return ProfileTypeEnum.M1;
      if (depth < normalDepth && depth > criticalDepth) return ProfileTypeEnum.M2;
      if (depth < criticalDepth) return ProfileTypeEnum.M3;
    } else if (channelSlope === 'steep') {
      if (depth > criticalDepth) return ProfileTypeEnum.S1;
      if (depth < criticalDepth && depth > normalDepth) return ProfileTypeEnum.S2;
      if (depth < normalDepth) return ProfileTypeEnum.S3;
    } else if (channelSlope === 'critical') {
      if (depth > criticalDepth) return ProfileTypeEnum.C1;
      if (depth < criticalDepth) return ProfileTypeEnum.C3;
      return ProfileTypeEnum.C2;
    }
    
    return ProfileTypeEnum.UNKNOWN;
  }
  
  /**
   * Get a description of the profile type
   */
  export function getProfileTypeDescription(profileType: ProfileTypeEnum): string {
    return PROFILE_TYPE_DESCRIPTIONS[profileType] || 'Unknown Profile Type';
  }