/**
 * Standardized Result Types
 * This file provides standardized types for calculation results and errors
 * to ensure consistent interfaces throughout the application.
 */

import { 
  WaterSurfaceProfileResults,
  DetailedWaterSurfaceResults,
  FlowRegime,
  ProfileType,
  FlowDepthPoint,
  ChannelParams
} from './index';

/**
 * Standardized calculation result with error handling
 */
export interface CalculationResultWithError {
  results?: WaterSurfaceProfileResults;
  error?: string;
}

/**
 * Standardized detailed calculation result with error handling
 */
export interface DetailedCalculationResultWithError {
  results?: DetailedWaterSurfaceResults;
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
): result is DetailedWaterSurfaceResults {
  return 'profileDescription' in result;
}

/**
 * Profile statistics
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
  subcriticalPercentage?: number;
  supercriticalPercentage?: number;
  calculationTime?: number;
  calculationMethod?: string;
}

/**
 * Calculation metadata
 * Additional information about the calculation process
 */
export interface CalculationMetadata {
  calculationTime: number;        // Calculation time in milliseconds
  calculationMethod: string;      // Calculation method used
  workerUsed: boolean;            // Whether a worker was used
  cacheUsed: boolean;             // Whether cache was used
  iterationCount?: number;        // Number of iterations performed
  convergenceCount?: number;      // Number of points where convergence was achieved
  numCalculationPoints: number;   // Number of calculation points
  warnings?: string[];            // Any warnings during calculation
}

/**
 * Flow regime descriptions
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
 * Create standardized water surface profile results
 */
export function createStandardResults(
  flowProfile: FlowDepthPoint[],
  profileType: ProfileType,
  channelType: string,
  criticalDepth: number,
  normalDepth: number,
  isChoking: boolean = false,
  hydraulicJump?: any
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
 * Create standardized detailed water surface profile results
 */
export function createDetailedResults(
  baseResults: WaterSurfaceProfileResults,
  profileDescription: string,
  profileDetails: string,
  flowRegime: FlowRegime,
  stats: ProfileStatistics
): DetailedWaterSurfaceResults {
  return {
    ...baseResults,
    profileDescription,
    profileDetails,
    flowRegime,
    stats
  };
}

/**
 * Create a calculation result with error
 */
export function createCalculationResult(
  results?: WaterSurfaceProfileResults,
  error?: string
): CalculationResultWithError {
  return { results, error };
}

/**
 * Create a detailed calculation result with error
 */
export function createDetailedCalculationResult(
  results?: DetailedWaterSurfaceResults,
  error?: string
): DetailedCalculationResultWithError {
  return { results, error };
}

/**
 * Calculate profile statistics
 */
export function calculateProfileStatistics(profile: FlowDepthPoint[]): ProfileStatistics {
  if (profile.length === 0) {
    // Return empty statistics if no data
    return {
      minDepth: 0,
      maxDepth: 0,
      avgDepth: 0,
      minVelocity: 0,
      maxVelocity: 0,
      avgVelocity: 0,
      minFroude: 0,
      maxFroude: 0,
      avgFroude: 0,
      minEnergy: 0,
      maxEnergy: 0,
      avgEnergy: 0,
      length: 0,
      numPoints: 0,
      predominantFlowRegime: 'Unknown'
    };
  }
  
  // Initialize with first point values
  let minDepth = profile[0].y;
  let maxDepth = profile[0].y;
  let sumDepth = profile[0].y;
  
  let minVelocity = profile[0].velocity;
  let maxVelocity = profile[0].velocity;
  let sumVelocity = profile[0].velocity;
  
  let minFroude = profile[0].froudeNumber;
  let maxFroude = profile[0].froudeNumber;
  let sumFroude = profile[0].froudeNumber;
  
  let minEnergy = profile[0].specificEnergy;
  let maxEnergy = profile[0].specificEnergy;
  let sumEnergy = profile[0].specificEnergy;
  
  // Count flow regimes
  let subcriticalCount = 0;
  let supercriticalCount = 0;
  
  // Analyze all points
  for (let i = 0; i < profile.length; i++) {
    const point = profile[i];
    
    // Update min, max, and sum for depth
    minDepth = Math.min(minDepth, point.y);
    maxDepth = Math.max(maxDepth, point.y);
    sumDepth += point.y;
    
    // Update min, max, and sum for velocity
    minVelocity = Math.min(minVelocity, point.velocity);
    maxVelocity = Math.max(maxVelocity, point.velocity);
    sumVelocity += point.velocity;
    
    // Update min, max, and sum for Froude number
    minFroude = Math.min(minFroude, point.froudeNumber);
    maxFroude = Math.max(maxFroude, point.froudeNumber);
    sumFroude += point.froudeNumber;
    
    // Update min, max, and sum for specific energy
    minEnergy = Math.min(minEnergy, point.specificEnergy);
    maxEnergy = Math.max(maxEnergy, point.specificEnergy);
    sumEnergy += point.specificEnergy;
    
    // Count flow regimes
    if (point.froudeNumber < 1) {
      subcriticalCount++;
    } else {
      supercriticalCount++;
    }
  }
  
  // Sort profile by station to calculate length
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  const length = sortedProfile[sortedProfile.length - 1].x - sortedProfile[0].x;
  
  // Determine predominant flow regime
  const subcriticalPercentage = (subcriticalCount / profile.length) * 100;
  const supercriticalPercentage = (supercriticalCount / profile.length) * 100;
  
  let predominantFlowRegime = 'Mixed Flow';
  if (subcriticalPercentage > 75) {
    predominantFlowRegime = 'Subcritical Flow';
  } else if (supercriticalPercentage > 75) {
    predominantFlowRegime = 'Supercritical Flow';
  }
  
  // Return statistics
  return {
    minDepth,
    maxDepth,
    avgDepth: sumDepth / profile.length,
    minVelocity,
    maxVelocity,
    avgVelocity: sumVelocity / profile.length,
    minFroude,
    maxFroude,
    avgFroude: sumFroude / profile.length,
    minEnergy,
    maxEnergy,
    avgEnergy: sumEnergy / profile.length,
    length,
    numPoints: profile.length,
    predominantFlowRegime,
    subcriticalPercentage,
    supercriticalPercentage
  };
}

/**
 * Format calculation results as a string report
 */
export function formatResultsAsReport(
  results: DetailedWaterSurfaceResults, 
  params: ChannelParams
): string {
  // Create a formatted text report
  let report = `WATER SURFACE PROFILE CALCULATION REPORT\n`;
  report += `=====================================\n\n`;
  
  // Channel information
  report += `CHANNEL PARAMETERS:\n`;
  report += `Channel Type: ${params.channelType}\n`;
  
  switch (params.channelType) {
    case 'rectangular':
      report += `Bottom Width: ${params.bottomWidth.toFixed(2)} m\n`;
      break;
    case 'trapezoidal':
      report += `Bottom Width: ${params.bottomWidth.toFixed(2)} m\n`;
      report += `Side Slope: ${params.sideSlope?.toFixed(2)} (H:V)\n`;
      break;
    case 'triangular':
      report += `Side Slope: ${params.sideSlope?.toFixed(2)} (H:V)\n`;
      break;
    case 'circular':
      report += `Diameter: ${params.diameter?.toFixed(2)} m\n`;
      break;
  }
  
  report += `Manning's Roughness: ${params.manningN.toFixed(4)}\n`;
  report += `Channel Slope: ${params.channelSlope.toFixed(6)} m/m\n`;
  report += `Discharge: ${params.discharge.toFixed(2)} m³/s\n`;
  report += `Channel Length: ${params.length.toFixed(2)} m\n\n`;
  
  // Profile information
  report += `PROFILE INFORMATION:\n`;
  report += `Profile Type: ${PROFILE_TYPE_DESCRIPTIONS[results.profileType]}\n`;
  report += `Channel Slope Classification: ${results.channelType}\n`;
  report += `Critical Depth: ${results.criticalDepth.toFixed(3)} m\n`;
  report += `Normal Depth: ${results.normalDepth.toFixed(3)} m\n`;
  
  if (results.profileDescription) {
    report += `Profile Description: ${results.profileDescription}\n`;
  }
  
  if (results.stats) {
    report += `\nPROFILE STATISTICS:\n`;
    report += `Depth Range: ${results.stats.minDepth.toFixed(3)} - ${results.stats.maxDepth.toFixed(3)} m\n`;
    report += `Average Depth: ${results.stats.avgDepth.toFixed(3)} m\n`;
    report += `Velocity Range: ${results.stats.minVelocity.toFixed(3)} - ${results.stats.maxVelocity.toFixed(3)} m/s\n`;
    report += `Average Velocity: ${results.stats.avgVelocity.toFixed(3)} m/s\n`;
    report += `Froude Number Range: ${results.stats.minFroude.toFixed(3)} - ${results.stats.maxFroude.toFixed(3)}\n`;
    report += `Average Froude Number: ${results.stats.avgFroude.toFixed(3)}\n`;
    report += `Predominant Flow Regime: ${results.stats.predominantFlowRegime}\n`;
    
    if (results.stats.subcriticalPercentage !== undefined) {
      report += `Subcritical Flow: ${results.stats.subcriticalPercentage.toFixed(1)}% of profile\n`;
    }
    
    if (results.stats.supercriticalPercentage !== undefined) {
      report += `Supercritical Flow: ${results.stats.supercriticalPercentage.toFixed(1)}% of profile\n`;
    }
  }
  
  // Hydraulic jump information
  if (results.hydraulicJump?.occurs) {
    report += `\nHYDRAULIC JUMP:\n`;
    report += `Location: ${results.hydraulicJump.station.toFixed(2)} m\n`;
    report += `Upstream Depth: ${results.hydraulicJump.upstreamDepth.toFixed(3)} m\n`;
    report += `Downstream Depth: ${results.hydraulicJump.downstreamDepth.toFixed(3)} m\n`;
    
    if (results.hydraulicJump.energyLoss !== undefined) {
      report += `Energy Loss: ${results.hydraulicJump.energyLoss.toFixed(3)} m\n`;
    }
    
    if (results.hydraulicJump.jumpType) {
      report += `Jump Type: ${results.hydraulicJump.jumpType}\n`;
    }
  }
  
  // Table header for profile points
  report += `\nPROFILE POINTS (selected points):\n`;
  report += `Station (m) | Depth (m) | Velocity (m/s) | Froude Number | Specific Energy (m)\n`;
  report += `-----------|-----------|---------------|---------------|------------------\n`;
  
  // Select points to include (to avoid overly long reports)
  const pointsToInclude = selectRepresentativePoints(results.flowProfile, 20);
  
  // Add points to the table
  for (const point of pointsToInclude) {
    report += `${point.x.toFixed(2).padStart(11)} | `;
    report += `${point.y.toFixed(3).padStart(9)} | `;
    report += `${point.velocity.toFixed(3).padStart(13)} | `;
    report += `${point.froudeNumber.toFixed(3).padStart(13)} | `;
    report += `${point.specificEnergy.toFixed(3).padStart(18)}\n`;
  }
  
  return report;
}

/**
 * Select representative points from a profile for reporting
 * This reduces the number of points while preserving important features
 */
function selectRepresentativePoints(
  profile: FlowDepthPoint[], 
  maxPoints: number
): FlowDepthPoint[] {
  if (profile.length <= maxPoints) {
    return profile;
  }
  
  // Sort by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Always include first and last points
  const result: FlowDepthPoint[] = [sortedProfile[0]];
  
  // Select evenly spaced points in between
  const step = Math.floor((sortedProfile.length - 2) / (maxPoints - 2));
  
  for (let i = step; i < sortedProfile.length - 1; i += step) {
    result.push(sortedProfile[i]);
  }
  
  // Add the last point
  result.push(sortedProfile[sortedProfile.length - 1]);
  
  // Sort results by station
  return result.sort((a, b) => a.x - b.x);
}