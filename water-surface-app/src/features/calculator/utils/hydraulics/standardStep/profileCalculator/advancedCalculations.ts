import { ChannelParams } from '../../../../types';
import { calculateCriticalDepth } from '../../criticalFlow';
import { calculateNormalDepth } from '../../normalFlow';
import { 
  WaterSurfaceProfileResults, 
  FlowDepthPoint, 
  ProfileType 
} from '../types';
import { detectHydraulicJump } from '../jumpDetector';
import { calculateWaterSurfaceProfile } from './coreCalculator';

/**
 * Calculates a high-resolution water surface profile with more calculation points
 * @param params Channel parameters
 * @param resolution Number of calculation points (default: 200)
 * @returns Water surface profile calculation results
 */
export function calculateHighResolutionProfile(
  params: ChannelParams,
  resolution: number = 200
): WaterSurfaceProfileResults {
  // Create modified params with higher resolution
  const modifiedParams = {
    ...params,
    _numSteps: resolution // Internal parameter to override default step count
  };
  
  // Calculate profile with high resolution
  return calculateWaterSurfaceProfile(modifiedParams as any);
}

/**
 * Calculates profiles from both directions and merges them
 * This can be useful to handle complex profiles with hydraulic jumps
 * @param params Channel parameters
 * @returns Combined water surface profile
 */
export function calculateBidirectionalProfile(
  params: ChannelParams
): WaterSurfaceProfileResults {
  // Calculate from upstream to downstream
  const downstreamParams = {
    ...params,
    upstreamDepth: calculateNormalDepth(params),
    downstreamDepth: undefined
  };
  
  // Calculate from downstream to upstream
  const upstreamParams = {
    ...params,
    upstreamDepth: undefined,
    downstreamDepth: calculateCriticalDepth(params)
  };
  
  // Calculate profiles from both directions
  const downstreamResults = calculateWaterSurfaceProfile(downstreamParams);
  const upstreamResults = calculateWaterSurfaceProfile(upstreamParams);
  
  // Merge profiles
  // For mixed flow regimes, we need to determine which portions to keep
  const mergedProfile: FlowDepthPoint[] = [];
  const criticalDepth = calculateCriticalDepth(params);
  
  // Identify transition point (if any)
  let transitionStation = -1;
  for (let i = 0; i < downstreamResults.flowProfile.length - 1; i++) {
    const current = downstreamResults.flowProfile[i];
    const next = downstreamResults.flowProfile[i + 1];
    
    // Look for transition from subcritical to supercritical or vice versa
    if ((current.froudeNumber < 1 && next.froudeNumber > 1) ||
        (current.froudeNumber > 1 && next.froudeNumber < 1)) {
      transitionStation = (current.x + next.x) / 2;
      break;
    }
  }
  
  // If no transition found, use the profile with higher resolution
  if (transitionStation < 0) {
    if (downstreamResults.flowProfile.length > upstreamResults.flowProfile.length) {
      return downstreamResults;
    } else {
      return upstreamResults;
    }
  }
  
  // Otherwise, combine profiles at the transition point
  for (const point of downstreamResults.flowProfile) {
    if (point.x <= transitionStation) {
      mergedProfile.push(point);
    }
  }
  
  for (const point of upstreamResults.flowProfile) {
    if (point.x >= transitionStation) {
      mergedProfile.push(point);
    }
  }
  
  // Sort merged profile by station
  mergedProfile.sort((a, b) => a.x - b.x);
  
  // Detect hydraulic jump
  const hydraulicJump = detectHydraulicJump(mergedProfile, params);
  
  return {
    flowProfile: mergedProfile,
    profileType: ProfileType.MIXED,
    channelType: downstreamResults.channelType, // Use the same channel classification
    criticalDepth,
    normalDepth: calculateNormalDepth(params),
    isChoking: downstreamResults.isChoking || upstreamResults.isChoking,
    hydraulicJump
  };
}

/**
 * Calculates multiple profiles with different flow rates
 * Useful for analyzing channel behavior under varying flow conditions
 * @param baseParams Base channel parameters
 * @param flowRates Array of flow rates to calculate profiles for
 * @returns Array of water surface profile results for each flow rate
 */
export function calculateMultipleFlowProfiles(
  baseParams: ChannelParams,
  flowRates: number[]
): WaterSurfaceProfileResults[] {
  return flowRates.map(flowRate => {
    const params = { ...baseParams, discharge: flowRate };
    return calculateWaterSurfaceProfile(params);
  });
}

/**
 * Calculates profiles with variable roughness along the channel
 * @param baseParams Base channel parameters
 * @param roughnessSegments Array of segments with different roughness values
 * @returns Water surface profile with variable roughness
 */
export function calculateVariableRoughnessProfile(
  baseParams: ChannelParams,
  roughnessSegments: Array<{ startStation: number; endStation: number; manningN: number }>
): WaterSurfaceProfileResults {
  // Sort segments by station
  const sortedSegments = [...roughnessSegments].sort((a, b) => a.startStation - b.startStation);
  
  // Validate segments
  let currentStation = 0;
  for (const segment of sortedSegments) {
    if (segment.startStation < currentStation) {
      throw new Error("Roughness segments must not overlap");
    }
    if (segment.startStation > segment.endStation) {
      throw new Error("Segment start station must be less than end station");
    }
    if (segment.endStation > baseParams.length) {
      throw new Error("Segment end station cannot exceed channel length");
    }
    currentStation = segment.endStation;
  }
  
  // For variable roughness, we need to calculate segments separately and merge
  const segmentProfiles: FlowDepthPoint[][] = [];
  
  // Set up initial conditions based on channel type
  let direction: 'upstream' | 'downstream';
  
  // Calculate critical and normal depths if not already provided
  const normalDepth = baseParams.normalDepth ?? calculateNormalDepth(baseParams);
  const criticalDepth = baseParams.criticalDepth ?? calculateCriticalDepth(baseParams);
  
  if (normalDepth > criticalDepth) {
    // Mild slope - subcritical flow
    direction = 'upstream';
  } else {
    // Steep slope - supercritical flow
    direction = 'downstream';
  }
  
  // Calculate each segment with appropriate roughness
  let previousProfile: FlowDepthPoint[] = [];
  
  for (let i = 0; i < sortedSegments.length; i++) {
    const segment = sortedSegments[i];
    const segmentParams = {
      ...baseParams,
      manningN: segment.manningN,
      length: segment.endStation - segment.startStation
    };
    
    // Set boundary conditions based on previous calculations and direction
    if (direction === 'upstream') {
      if (i === sortedSegments.length - 1) {
        // Last segment (most downstream)
        segmentParams.downstreamDepth = baseParams.downstreamDepth || calculateCriticalDepth(segmentParams);
      } else if (previousProfile.length > 0) {
        // Use depth from previous calculation as downstream boundary
        const matchPoint = previousProfile.find(p => Math.abs(p.x - segment.endStation) < 0.001);
        if (matchPoint) {
          segmentParams.downstreamDepth = matchPoint.y;
        }
      }
    } else {
      if (i === 0) {
        // First segment (most upstream)
        segmentParams.upstreamDepth = baseParams.upstreamDepth || calculateNormalDepth(segmentParams);
      } else if (previousProfile.length > 0) {
        // Use depth from previous calculation as upstream boundary
        const matchPoint = previousProfile.find(p => Math.abs(p.x - segment.startStation) < 0.001);
        if (matchPoint) {
          segmentParams.upstreamDepth = matchPoint.y;
        }
      }
    }
    
    // Calculate profile for this segment
    const segmentResult = calculateWaterSurfaceProfile(segmentParams);
    
    // Adjust station values to match global coordinates
    const adjustedProfile = segmentResult.flowProfile.map(point => ({
      ...point,
      x: point.x + segment.startStation
    }));
    
    segmentProfiles.push(adjustedProfile);
    previousProfile = adjustedProfile;
  }
  
  // Merge all segment profiles
  const mergedProfile: FlowDepthPoint[] = [];
  for (const profile of segmentProfiles) {
    mergedProfile.push(...profile);
  }
  
  // Sort merged profile by station and remove duplicates
  const sortedProfile = mergedProfile
    .sort((a, b) => a.x - b.x)
    // Filter out duplicates with similar stations
    .filter((point, index, array) => 
      index === 0 || Math.abs(point.x - array[index - 1].x) > 0.001
    );
  
  // Detect hydraulic jump
  const hydraulicJump = detectHydraulicJump(sortedProfile, baseParams);
  
  return {
    flowProfile: sortedProfile,
    profileType: ProfileType.MIXED,
    channelType: normalDepth > criticalDepth ? 'mild' : 'steep',
    criticalDepth: calculateCriticalDepth(baseParams),
    normalDepth: calculateNormalDepth(baseParams), // Average normal depth
    isChoking: false, // Determined from merged profile
    hydraulicJump
  };
}

/**
 * Calculates profiles with adaptive resolution
 * Uses higher resolution in areas of rapid change
 * @param params Channel parameters
 * @returns Water surface profile with adaptive resolution
 */
export function calculateAdaptiveResolutionProfile(
  params: ChannelParams
): WaterSurfaceProfileResults {
  // First calculate with base resolution
  const baseResult = calculateWaterSurfaceProfile(params);
  
  // Detect areas of rapid change (high depth or Froude number gradients)
  const depthGradients: number[] = [];
  const froudeGradients: number[] = [];
  
  const sortedProfile = [...baseResult.flowProfile].sort((a, b) => a.x - b.x);
  
  for (let i = 0; i < sortedProfile.length - 1; i++) {
    const p1 = sortedProfile[i];
    const p2 = sortedProfile[i + 1];
    
    const dx = p2.x - p1.x;
    if (dx > 0) {
      const depthGradient = Math.abs(p2.y - p1.y) / dx;
      const froudeGradient = Math.abs(p2.froudeNumber - p1.froudeNumber) / dx;
      
      depthGradients.push(depthGradient);
      froudeGradients.push(froudeGradient);
    }
  }
  
  // Calculate threshold for high gradient (e.g., top 20%)
  const depthGradientThreshold = calculatePercentile(depthGradients, 80);
  const froudeGradientThreshold = calculatePercentile(froudeGradients, 80);
  
  // Identify regions for refinement
  const refinementRegions: Array<{ start: number; end: number }> = [];
  let inRegion = false;
  let regionStart = 0;
  
  for (let i = 0; i < sortedProfile.length - 1; i++) {
    const p1 = sortedProfile[i];
    const p2 = sortedProfile[i + 1];
    
    const dx = p2.x - p1.x;
    if (dx > 0) {
      const depthGradient = Math.abs(p2.y - p1.y) / dx;
      const froudeGradient = Math.abs(p2.froudeNumber - p1.froudeNumber) / dx;
      
      const isHighGradient = 
        depthGradient > depthGradientThreshold || 
        froudeGradient > froudeGradientThreshold;
      
      if (isHighGradient && !inRegion) {
        // Start of high gradient region
        inRegion = true;
        regionStart = p1.x;
      } else if (!isHighGradient && inRegion) {
        // End of high gradient region
        inRegion = false;
        refinementRegions.push({ start: regionStart, end: p1.x });
      }
    }
  }
  
  // Close any open region
  if (inRegion) {
    refinementRegions.push({ 
      start: regionStart, 
      end: sortedProfile[sortedProfile.length - 1].x 
    });
  }
  
  // Calculate high-resolution segments for each refinement region
  const refinedSegments: FlowDepthPoint[][] = [];
  
  for (const region of refinementRegions) {
    // Create parameters for this segment
    const segmentParams = {
      ...params,
      length: region.end - region.start
    };
    
    // Set appropriate boundary conditions
    const upstreamPoint = sortedProfile.find(p => Math.abs(p.x - region.start) < 0.001);
    const downstreamPoint = sortedProfile.find(p => Math.abs(p.x - region.end) < 0.001);
    
    if (upstreamPoint) {
      segmentParams.upstreamDepth = upstreamPoint.y;
    }
    
    if (downstreamPoint) {
      segmentParams.downstreamDepth = downstreamPoint.y;
    }
    
    // Calculate high-resolution profile for this segment
    const segmentResult = calculateHighResolutionProfile(segmentParams, 50);
    
    // Adjust station values
    const adjustedProfile = segmentResult.flowProfile.map(point => ({
      ...point,
      x: point.x + region.start
    }));
    
    refinedSegments.push(adjustedProfile);
  }
  
  // Merge original profile with refined segments
  let mergedProfile: FlowDepthPoint[] = [...sortedProfile];
  
  for (const segment of refinedSegments) {
    // Remove points from original profile that are within the refined segment
    const segmentStart = segment[0].x;
    const segmentEnd = segment[segment.length - 1].x;
    
    mergedProfile = mergedProfile.filter(point => 
      point.x < segmentStart || point.x > segmentEnd
    );
    
    // Add refined points
    mergedProfile.push(...segment);
  }
  
  // Sort the merged profile
  mergedProfile.sort((a, b) => a.x - b.x);
  
  // Return updated result
  return {
    ...baseResult,
    profileType: ProfileType.MIXED,
    flowProfile: mergedProfile
  };
}

/**
 * Calculate percentile value from an array
 * @param values Array of numbers
 * @param percentile Percentile (0-100)
 * @returns Percentile value
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sortedValues = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}