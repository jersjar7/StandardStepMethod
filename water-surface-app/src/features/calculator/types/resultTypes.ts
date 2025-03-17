// src/features/calculator/types/resultTypes.ts

/**
 * Unified Result Types
 * This file centralizes all calculation result types using a common hierarchy,
 * following the same pattern used for hydraulic jumps.
 */

// Import necessary types and enums
import { 
    ChannelParams, 
    ChannelType, 
    UnitSystem,
    HydraulicJump,
    ProfileType as ProfileTypeEnum,
    FlowRegime as FlowRegimeEnum 
  } from './index';

// Use enum types without redefining them
export type ProfileType = ProfileTypeEnum;
export type FlowRegime = FlowRegimeEnum;

/**
 * Base interface for a single calculation point result
 * Contains essential hydraulic properties at a station
 */
export interface BaseCalculationResult {
  station: number;           // Distance along channel
  depth: number;             // Water depth
  velocity: number;          // Flow velocity
  froudeNumber: number;      // Froude number
}

/**
 * Standard calculation result with complete hydraulic properties
 * Used in UI components and for data export
 */
export interface StandardCalculationResult extends BaseCalculationResult {
  area: number;              // Flow area
  topWidth: number;          // Top width of water surface
  wetPerimeter: number;      // Wetted perimeter
  hydraulicRadius: number;   // Hydraulic radius (A/P)
  energy: number;            // Specific energy
  criticalDepth?: number;    // Critical depth
  normalDepth?: number;      // Normal depth
}

/**
 * Enhanced calculation result with additional analysis properties
 * Used for detailed reporting and visualization
 */
export interface DetailedCalculationResult extends StandardCalculationResult {
  shearStress?: number;      // Boundary shear stress
  flowRegime?: FlowRegimeEnum;   // Flow regime classification
  frictionSlope?: number;    // Friction slope
  energyGradeLine?: number;  // Energy grade line elevation
  specificForce?: number;    // Specific force
}

/**
 * Flow depth point used internally by the hydraulic calculations
 * Designed for the standard step method implementation
 */
export interface FlowDepthPoint {
  x: number;                 // Station (distance along channel)
  y: number;                 // Depth
  velocity: number;          // Flow velocity
  froudeNumber: number;      // Froude number
  specificEnergy: number;    // Specific energy
  criticalDepth: number;     // Critical depth
  normalDepth: number;       // Normal depth
}

/**
 * Base water surface profile results
 * Contains the minimum properties needed to represent a calculation
 */
export interface BaseWaterSurfaceResults {
  profileType: ProfileTypeEnum | string;  // Profile classification
  channelType: string;       // Channel slope classification (mild, steep, critical)
  criticalDepth: number;     // Critical depth for the channel and discharge
  normalDepth: number;       // Normal depth for the channel and discharge
  isChoking: boolean;        // Indicates if choking occurred
  flowProfile: FlowDepthPoint[]; // Flow points from calculation
  hydraulicJump?: HydraulicJump; // Hydraulic jump details, if any
}

/**
 * Standard water surface profile results
 * Used for most application operations and data display
 */
export interface StandardWaterSurfaceResults extends BaseWaterSurfaceResults {
  results: StandardCalculationResult[];  // Calculation results
}

/**
 * Detailed water surface profile results with additional analysis
 * Used for comprehensive reporting and advanced visualization
 */
export interface DetailedWaterSurfaceResults extends BaseWaterSurfaceResults {
  profileDescription: string;        // Human-readable profile description
  profileDetails: string;            // Detailed information about the profile
  flowRegime: FlowRegimeEnum;        // Predominant flow regime
  executionTime?: number;            // Calculation time in milliseconds
  iterationCount?: number;           // Total number of iterations
  warnings?: string[];               // Any warnings during calculation
  
  // Detailed statistical analysis
  stats?: ProfileStatistics;
}

/**
 * The main WaterSurfaceProfileResults type used throughout the application
 * Compatible with both standard and detailed formats
 */
export type WaterSurfaceProfileResults = BaseWaterSurfaceResults;

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
  results?: DetailedWaterSurfaceResults;
  error?: string;
}

/**
 * Type guard to check if a result has an error
 */
export function hasError(result: CalculationResultWithError | DetailedCalculationResultWithError): boolean {
  return result.error !== undefined;
}

/**
 * Type guard to check if a result is a detailed result
 */
export function isDetailedResult(
  result: WaterSurfaceProfileResults
): result is DetailedWaterSurfaceResults {
  return 'profileDescription' in result;
}

/**
 * Converts a flow depth point to standard calculation result
 * Used for transitioning between internal calculation format and UI format
 */
export function convertFlowPointToStandardResult(
  point: FlowDepthPoint,
  params: ChannelParams
): StandardCalculationResult {
  // This would contain implementation to map and calculate properties
  // Implementation omitted for this example
  return {
    station: point.x,
    depth: point.y,
    velocity: point.velocity,
    froudeNumber: point.froudeNumber,
    area: 0, // Calculate from params and depth
    topWidth: 0, // Calculate from params and depth
    wetPerimeter: 0, // Calculate from params and depth
    hydraulicRadius: 0, // Calculate from params and depth
    energy: point.specificEnergy,
    criticalDepth: point.criticalDepth,
    normalDepth: point.normalDepth
  };
}

/**
 * Creates standard water surface results from internal calculation data
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
    profileType,
    channelType,
    criticalDepth,
    normalDepth,
    isChoking,
    flowProfile,
    hydraulicJump
  };
}

/**
 * Enhances standard results with detailed analysis
 */
export function enhanceWithDetails(
  standardResults: WaterSurfaceProfileResults,
  details: Partial<Omit<DetailedWaterSurfaceResults, keyof WaterSurfaceProfileResults>>
): DetailedWaterSurfaceResults {
  return {
    ...standardResults,
    profileDescription: details.profileDescription || `${standardResults.profileType} Profile`,
    profileDetails: details.profileDetails || '',
    flowRegime: details.flowRegime || FlowRegimeEnum.SUBCRITICAL,
    stats: details.stats,
    executionTime: details.executionTime,
    iterationCount: details.iterationCount,
    warnings: details.warnings
  };
}

/**
 * Result type definition for exporting to various formats
 * Used by the export service
 */
export interface ExportResultOptions {
  format: 'csv' | 'json' | 'report';  // Export format
  filename?: string;                  // Optional filename
  includeChannelParams?: boolean;     // Whether to include channel parameters
  includeHeaders?: boolean;           // Whether to include headers (for CSV)
  decimalPlaces?: number;             // Number of decimal places
}

// Export common analysis types and constants used with results

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