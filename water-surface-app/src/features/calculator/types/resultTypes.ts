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
    ProfileType,
    FlowRegime 
  } from './index';

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
  flowRegime?: FlowRegime;   // Flow regime classification
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
  profileType: ProfileType;  // Profile classification
  channelType: string;       // Channel slope classification (mild, steep, critical)
  criticalDepth: number;     // Critical depth for the channel and discharge
  normalDepth: number;       // Normal depth for the channel and discharge
  isChoking: boolean;        // Indicates if choking occurred
}

/**
 * Standard water surface profile results
 * Used for most application operations and data display
 */
export interface StandardWaterSurfaceResults extends BaseWaterSurfaceResults {
  results: StandardCalculationResult[];  // Calculation results
  hydraulicJump?: HydraulicJump;         // Hydraulic jump details, if any
}

/**
 * Detailed water surface profile results with additional analysis
 * Used for comprehensive reporting and advanced visualization
 */
export interface DetailedWaterSurfaceResults extends StandardWaterSurfaceResults {
  profileDescription: string;        // Human-readable profile description
  profileDetails: string;            // Detailed information about the profile
  flowRegime: FlowRegime;            // Predominant flow regime
  executionTime?: number;            // Calculation time in milliseconds
  iterationCount?: number;           // Total number of iterations
  warnings?: string[];               // Any warnings during calculation
  
  // Detailed statistical analysis
  stats?: {
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
  };
}

/**
 * Type for calculation result with potential error
 * Used for error handling in calculation processes
 */
export interface CalculationResultWithError {
  results?: StandardWaterSurfaceResults;
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
  result: StandardWaterSurfaceResults | DetailedWaterSurfaceResults
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
  flowPoints: FlowDepthPoint[],
  profileType: ProfileType,
  channelType: string,
  criticalDepth: number,
  normalDepth: number,
  isChoking: boolean = false,
  hydraulicJump?: HydraulicJump,
  params?: ChannelParams
): StandardWaterSurfaceResults {
  // Convert flow points to standard results if params are provided
  const results = params 
    ? flowPoints.map(point => convertFlowPointToStandardResult(point, params))
    : [] as StandardCalculationResult[];
    
  return {
    profileType,
    channelType,
    criticalDepth,
    normalDepth,
    isChoking,
    results,
    hydraulicJump
  };
}

/**
 * Enhances standard results with detailed analysis
 */
export function enhanceWithDetails(
  standardResults: StandardWaterSurfaceResults,
  details: Partial<Omit<DetailedWaterSurfaceResults, keyof StandardWaterSurfaceResults>>
): DetailedWaterSurfaceResults {
  return {
    ...standardResults,
    profileDescription: details.profileDescription || `${standardResults.profileType} Profile`,
    profileDetails: details.profileDetails || '',
    flowRegime: details.flowRegime || FlowRegime.SUBCRITICAL,
    ...details
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
  [ProfileType.UNKNOWN]: 'Unknown Profile Type'
};

/**
 * Channel slope descriptions
 */
export const CHANNEL_SLOPE_DESCRIPTIONS = {
  'mild': 'Mild Slope (yn > yc)',
  'critical': 'Critical Slope (yn = yc)',
  'steep': 'Steep Slope (yn < yc)'
};