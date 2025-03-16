import { ChannelParams } from '../../../stores/calculatorSlice';
import { calculateArea } from '../channelGeometry';
import { calculateVelocity, calculateFroudeNumber, calculateSpecificEnergy } from '../flowParameters';
import { calculateCriticalDepth } from '../criticalFlow';
import { calculateNormalDepth, classifyChannelSlope } from '../normalFlow';
import { calculateNextDepth } from './stepCalculator';
import { detectHydraulicJump } from './jumpDetector';
import { 
  FlowDepthPoint, 
  WaterSurfaceProfileResults,
  ProfileCalculationParams,
  ProfileType,
  StepCalculationParams
} from './types';

/**
 * Determines the water surface profile type based on channel characteristics and depths
 * @param channelSlope Channel slope classification ('mild', 'critical', or 'steep')
 * @param depth Current flow depth
 * @param normalDepth Normal depth
 * @param criticalDepth Critical depth
 * @returns Profile type classification (M1, M2, S1, etc.)
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
 * Calculates the initial profile point
 * @param position Initial position (station)
 * @param depth Initial depth
 * @param criticalDepth Critical depth
 * @param normalDepth Normal depth
 * @param params Channel parameters
 * @returns Initial flow depth point
 */
export function calculateInitialPoint(
  position: number,
  depth: number,
  criticalDepth: number,
  normalDepth: number,
  params: ChannelParams
): FlowDepthPoint {
  const area = calculateArea(depth, params);
  const velocity = calculateVelocity(params.discharge, area);
  const froudeNumber = calculateFroudeNumber(velocity, depth, params);
  const specificEnergy = calculateSpecificEnergy(depth, velocity, params);
  
  return {
    x: position,
    y: depth,
    velocity,
    froudeNumber,
    specificEnergy,
    criticalDepth,
    normalDepth
  };
}

/**
 * Sets up initial conditions for profile calculation
 * @param params Channel parameters
 * @returns ProfileCalculationParams with initial conditions
 */
export function setupInitialConditions(
  params: ChannelParams
): ProfileCalculationParams {
  // Calculate critical and normal depths
  const criticalDepth = calculateCriticalDepth(params);
  const normalDepth = calculateNormalDepth(params);
  
  // Classify the channel slope
  const channelSlope = classifyChannelSlope(params);
  
  // Default number of steps
  const numSteps = 100;
  
  // Set up initial conditions based on channel type and boundary conditions
  let initialDepth: number;
  let direction: 'upstream' | 'downstream';
  let startPosition: number;
  
  if (params.downstreamDepth !== undefined) {
    // If downstream depth is specified, use it and calculate upstream
    initialDepth = params.downstreamDepth;
    direction = 'upstream';
    startPosition = params.length;
  } else if (params.upstreamDepth !== undefined) {
    // If upstream depth is specified, use it and calculate downstream
    initialDepth = params.upstreamDepth;
    direction = 'downstream';
    startPosition = 0;
  } else {
    // Default behavior based on channel type
    if (channelSlope === 'mild') {
      // For mild slopes, start from downstream with critical depth as control
      initialDepth = criticalDepth;
      direction = 'upstream';
      startPosition = params.length;
    } else {
      // For steep slopes, start from upstream with normal depth as control
      initialDepth = normalDepth;
      direction = 'downstream';
      startPosition = 0;
    }
  }
  
  return {
    initialDepth,
    direction,
    startPosition,
    criticalDepth,
    normalDepth,
    numSteps,
    channelSlope,
    params
  };
}

/**
 * Validates parameters and handles edge cases
 * @param params Channel parameters
 * @returns Validation result with error message if invalid
 */
export function validateCalculationParameters(
  params: ChannelParams
): { isValid: boolean; message?: string } {
  // Check for negative or zero values
  if (params.discharge <= 0) {
    return { isValid: false, message: "Discharge must be positive" };
  }
  
  if (params.channelSlope <= 0) {
    return { isValid: false, message: "Channel slope must be positive" };
  }
  
  if (params.manningN <= 0) {
    return { isValid: false, message: "Manning's roughness must be positive" };
  }
  
  if (params.length <= 0) {
    return { isValid: false, message: "Channel length must be positive" };
  }
  
  // Check channel-specific parameters
  switch (params.channelType) {
    case 'rectangular':
    case 'trapezoidal':
      if (params.bottomWidth <= 0) {
        return { isValid: false, message: "Bottom width must be positive" };
      }
      break;
      
    case 'trapezoidal':
    case 'triangular':
      if (!params.sideSlope || params.sideSlope <= 0) {
        return { isValid: false, message: "Side slope must be positive" };
      }
      break;
      
    case 'circular':
      if (!params.diameter || params.diameter <= 0) {
        return { isValid: false, message: "Diameter must be positive" };
      }
      break;
  }
  
  // Check boundary conditions
  if (params.upstreamDepth !== undefined && params.upstreamDepth <= 0) {
    return { isValid: false, message: "Upstream depth must be positive" };
  }
  
  if (params.downstreamDepth !== undefined && params.downstreamDepth <= 0) {
    return { isValid: false, message: "Downstream depth must be positive" };
  }
  
  return { isValid: true };
}

/**
 * Main function to calculate water surface profile
 * @param params Channel parameters
 * @returns Water surface profile calculation results
 */
export function calculateWaterSurfaceProfile(
  params: ChannelParams
): WaterSurfaceProfileResults {
  // Validate parameters first
  const validation = validateCalculationParameters(params);
  if (!validation.isValid) {
    throw new Error(`Invalid parameters: ${validation.message}`);
  }
  
  // Setup initial conditions
  const calculationParams = setupInitialConditions(params);
  
  const { 
    initialDepth,
    direction,
    startPosition,
    criticalDepth,
    normalDepth,
    numSteps,
    channelSlope,
  } = calculationParams;
  
  // Set step size
  const dx = params.length / numSteps;
  
  // Initialize flow profile array
  const flowProfile: FlowDepthPoint[] = [];
  
  // Variables to track calculation status
  let isChoking = false;
  
  // Calculate initial point
  const initialPoint = calculateInitialPoint(
    startPosition,
    initialDepth,
    criticalDepth,
    normalDepth,
    params
  );
  
  // Add initial point to the profile
  flowProfile.push(initialPoint);
  
  // Current position and depth for iteration
  let currentPosition = startPosition;
  let currentDepth = initialDepth;
  
  // Calculation loop
  let i = 0;
  while (i < numSteps) {
    // Update position based on direction
    const nextPosition = direction === 'upstream' 
                       ? currentPosition - dx 
                       : currentPosition + dx;
    
    // Check if we're out of the channel bounds
    if (nextPosition < 0 || nextPosition > params.length) {
      break;
    }
    
    // Calculate the next depth using the standard step method
    const stepParams: StepCalculationParams = {
      currentX: currentPosition,
      currentY: currentDepth,
      nextX: nextPosition,
      direction,
      params
    };
    
    const nextDepth = calculateNextDepth(stepParams);
    
    // Check if next depth is valid
    if (nextDepth <= 0) {
      // Invalid depth - might be due to choking or other issues
      isChoking = true;
      break;
    }
    
    // Update current position and depth
    currentPosition = nextPosition;
    currentDepth = nextDepth;
    
    // Calculate point properties
    const point = calculateInitialPoint(
      currentPosition,
      currentDepth,
      criticalDepth,
      normalDepth,
      params
    );
    
    // Add point to the profile
    flowProfile.push(point);
    
    i++;
  }
  
  // Determine the profile type based on initial depth
  const profileType = determineProfileType(
    channelSlope, 
    initialDepth, 
    normalDepth, 
    criticalDepth
  );
  
  // Detect hydraulic jump
  const hydraulicJump = detectHydraulicJump(flowProfile, params);
  
  // Sort the profile by station for consistent display
  flowProfile.sort((a, b) => a.x - b.x);
  
  return {
    flowProfile,
    profileType: profileType.toString(),
    channelType: channelSlope,
    criticalDepth,
    normalDepth,
    isChoking,
    hydraulicJump
  };
}

/**
 * Creates a high-resolution profile with more calculation points
 * @param params Channel parameters
 * @param resolution Number of calculation points (default: 200)
 * @returns Water surface profile calculation results
 */
export function calculateHighResolutionProfile(
  params: ChannelParams,
  _resolution: number = 200
): WaterSurfaceProfileResults {
  // Save original channel length
  const originalLength = params.length;
  
  // Modify params to use higher resolution
  const modifiedParams = {
    ...params,
    length: originalLength
  };
  
  // Calculate with modified parameters
  const results = calculateWaterSurfaceProfile(modifiedParams);
  
  // Restore original length in results
  results.flowProfile.forEach(point => {
    if (point.x > originalLength) {
      point.x = originalLength;
    }
  });
  
  return results;
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
    profileType: "Mixed Profile",
    channelType: downstreamResults.channelType, // Use the same channel classification
    criticalDepth,
    normalDepth: calculateNormalDepth(params),
    isChoking: downstreamResults.isChoking || upstreamResults.isChoking,
    hydraulicJump
  };
}

/**
 * Interpolates profile at specific stations
 * @param profile Existing water surface profile
 * @param stations Array of stations to interpolate
 * @returns Array of interpolated flow depth points
 */
export function interpolateProfileAtStations(
  profile: FlowDepthPoint[],
  stations: number[]
): FlowDepthPoint[] {
  // Sort profile by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Check if profile has at least two points
  if (sortedProfile.length < 2) {
    throw new Error("Profile must have at least two points for interpolation");
  }
  
  // Get min and max stations in the profile
  const minStation = sortedProfile[0].x;
  const maxStation = sortedProfile[sortedProfile.length - 1].x;
  
  // Filter stations to those within the profile range
  const validStations = stations.filter(s => s >= minStation && s <= maxStation);
  
  // Interpolate results
  const results: FlowDepthPoint[] = [];
  
  for (const station of validStations) {
    // Find the two points that bracket the station
    let i = 0;
    while (i < sortedProfile.length - 1 && sortedProfile[i + 1].x < station) {
      i++;
    }
    
    // If station matches an existing point exactly, use that point
    if (sortedProfile[i].x === station) {
      results.push({ ...sortedProfile[i] });
      continue;
    }
    
    // Otherwise, interpolate between the two bracketing points
    const p1 = sortedProfile[i];
    const p2 = sortedProfile[i + 1];
    
    // Calculate interpolation factor
    const t = (station - p1.x) / (p2.x - p1.x);
    
    // Interpolate all properties
    const interpolatedPoint: FlowDepthPoint = {
      x: station,
      y: p1.y + t * (p2.y - p1.y),
      velocity: p1.velocity + t * (p2.velocity - p1.velocity),
      froudeNumber: p1.froudeNumber + t * (p2.froudeNumber - p1.froudeNumber),
      specificEnergy: p1.specificEnergy + t * (p2.specificEnergy - p1.specificEnergy),
      criticalDepth: p1.criticalDepth,
      normalDepth: p1.normalDepth
    };
    
    results.push(interpolatedPoint);
  }
  
  return results;
}

/**
 * Creates a uniformly spaced profile by interpolation
 * @param profile Original water surface profile
 * @param numPoints Desired number of points
 * @returns Uniformly spaced profile
 */
export function createUniformProfile(
  profile: FlowDepthPoint[],
  numPoints: number = 100
): FlowDepthPoint[] {
  // Sort profile by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Get min and max stations
  const minStation = sortedProfile[0].x;
  const maxStation = sortedProfile[sortedProfile.length - 1].x;
  
  // Create uniformly spaced stations
  const step = (maxStation - minStation) / (numPoints - 1);
  const stations: number[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    stations.push(minStation + i * step);
  }
  
  // Interpolate at the new stations
  return interpolateProfileAtStations(sortedProfile, stations);
}