import { ChannelParams } from '../../types';
import { 
  calculateArea, 
  calculateWetPerimeter 
} from './channelGeometry';
import { 
  calculateVelocity, 
  calculateFroudeNumber, 
  calculateSpecificEnergy,
  calculateFrictionSlope,
} from './flowParameters';
import { 
  calculateCriticalDepth 
} from './criticalFlow';
import { 
  calculateNormalDepth, 
  classifyChannelSlope 
} from './normalFlow';
import { 
  calculateHydraulicJump, 
} from './hydraulicJump';

/**
 * Interface for flow depth points in the profile
 */
export interface FlowDepthPoint {
  x: number;           // Station (distance along channel)
  y: number;           // Depth
  velocity: number;    // Flow velocity
  froudeNumber: number; // Froude number
  specificEnergy: number; // Specific energy
  criticalDepth: number; // Critical depth
  normalDepth: number;  // Normal depth
}

/**
 * Interface for water surface profile calculation results
 */
export interface WaterSurfaceProfileResults {
  flowProfile: FlowDepthPoint[];
  profileType: string;
  channelType: string;
  criticalDepth: number;
  normalDepth: number;
  isChoking: boolean;
  hydraulicJump?: ReturnType<typeof calculateHydraulicJump>;
}

/**
 * Calculates the water surface profile using the standard step method
 * @param params Channel parameters
 * @returns Water surface profile calculation results
 */
export function calculateWaterSurfaceProfile(params: ChannelParams): WaterSurfaceProfileResults {
  // Calculate critical and normal depths
  const criticalDepth = calculateCriticalDepth(params);
  const normalDepth = calculateNormalDepth(params);
  
  // Classify the channel slope
  const channelSlope = classifyChannelSlope(params);
  
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
  
  // Set step size
  const numSteps = 100; // Number of calculation points
  const dx = params.length / numSteps; // Step size
  
  // Initialize flow profile array
  const flowProfile: FlowDepthPoint[] = [];
  
  // Variables to track hydraulic jump
  let hydraulicJump = undefined;
  let isChoking = false;
  
  // Initial position and depth
  let currentPosition = startPosition;
  let currentDepth = initialDepth;
  
  // Calculate properties at the initial point
  const initialArea = calculateArea(currentDepth, params);
  const initialVelocity = calculateVelocity(params.discharge, initialArea);
  const initialFroudeNumber = calculateFroudeNumber(initialVelocity, currentDepth, params);
  const initialEnergy = calculateSpecificEnergy(currentDepth, initialVelocity, params);
  
  // Add initial point to the profile
  flowProfile.push({
    x: currentPosition,
    y: currentDepth,
    velocity: initialVelocity,
    froudeNumber: initialFroudeNumber,
    specificEnergy: initialEnergy,
    criticalDepth: criticalDepth,
    normalDepth: normalDepth
  });
  
  // Calculate water surface profile step by step
  for (let i = 0; i < numSteps; i++) {
    // Update position based on direction
    const nextPosition = direction === 'upstream' 
                       ? currentPosition - dx 
                       : currentPosition + dx;
    
    // Check if we're out of the channel bounds
    if (nextPosition < 0 || nextPosition > params.length) {
      break;
    }
    
    // Calculate the next depth using the standard step method
    const nextDepth = calculateNextDepth(
      currentPosition, 
      currentDepth, 
      nextPosition,
      direction,
      params
    );
    
    // Check if next depth is valid
    if (nextDepth <= 0) {
      // Invalid depth - might be due to choking or other issues
      isChoking = true;
      break;
    }
    
    // Calculate properties at the new point
    const nextArea = calculateArea(nextDepth, params);
    const nextVelocity = calculateVelocity(params.discharge, nextArea);
    const nextFroudeNumber = calculateFroudeNumber(nextVelocity, nextDepth, params);
    const nextEnergy = calculateSpecificEnergy(nextDepth, nextVelocity, params);
    
    // Check for hydraulic jump
    // Jump occurs when flow transitions from supercritical to subcritical
    if (initialFroudeNumber > 1 && nextFroudeNumber < 1) {
      // Calculate hydraulic jump details
      const jumpLocation = (currentPosition + nextPosition) / 2;
      hydraulicJump = calculateHydraulicJump(currentDepth, jumpLocation, params);
      
      // After hydraulic jump, continue with sequent depth
      if (hydraulicJump.occurs) {
        currentDepth = hydraulicJump.downstreamDepth;
      }
    } else {
      // No jump, update current depth for next iteration
      currentDepth = nextDepth;
    }
    
    // Update current position
    currentPosition = nextPosition;
    
    // Add point to the profile
    flowProfile.push({
      x: currentPosition,
      y: currentDepth,
      velocity: nextVelocity,
      froudeNumber: nextFroudeNumber,
      specificEnergy: nextEnergy,
      criticalDepth: criticalDepth,
      normalDepth: normalDepth
    });
  }
  
  // Determine the profile type
  const profileType = determineProfileType(
    channelSlope, 
    initialDepth, 
    normalDepth, 
    criticalDepth
  );
  
  // Sort the profile by station for consistent display
  flowProfile.sort((a, b) => a.x - b.x);
  
  return {
    flowProfile,
    profileType,
    channelType: channelSlope,
    criticalDepth,
    normalDepth,
    isChoking,
    hydraulicJump
  };
}

/**
 * Calculates the next depth in the water surface profile
 * @param currentX Current station
 * @param currentY Current depth
 * @param nextX Next station
 * @param direction Calculation direction
 * @param params Channel parameters
 * @returns Next depth
 */
function calculateNextDepth(
  currentX: number, 
  currentY: number, 
  nextX: number,
  direction: 'upstream' | 'downstream',
  params: ChannelParams
): number {
  
  // Calculate properties at current point
  const currentArea = calculateArea(currentY, params);
  const currentVelocity = calculateVelocity(params.discharge, currentArea);
  const currentEnergy = calculateSpecificEnergy(currentY, currentVelocity, params);
  
  // Calculate bed elevation difference
  const dx = Math.abs(nextX - currentX);
  const dz = params.channelSlope * dx * (direction === 'upstream' ? 1 : -1);
  
  // Calculate friction slope at current point
  const currentFrictionSlope = calculateFrictionSlope(
    currentVelocity,
    currentArea / calculateWetPerimeter(currentY, params),
    params.manningN,
    params.units
  );
  
  // Initial estimate for next depth
  let nextY = currentY;
  
  // For mild slope flowing downstream or steep slope flowing upstream,
  // depth typically decreases
  if ((params.channelSlope < 0.001 && direction === 'downstream') ||
      (params.channelSlope > 0.01 && direction === 'upstream')) {
    nextY = currentY * 0.95;
  } else {
    // Otherwise, depth typically increases
    nextY = currentY * 1.05;
  }
  
  // Iterate to find the next depth
  const tolerance = 0.0001;
  const maxIterations = 50;
  let iterations = 0;
  
  while (iterations < maxIterations) {
    // Calculate properties at estimated next point
    const nextArea = calculateArea(nextY, params);
    const nextVelocity = calculateVelocity(params.discharge, nextArea);
    const nextEnergy = calculateSpecificEnergy(nextY, nextVelocity, params);
    
    // Calculate friction slope at next point
    const nextFrictionSlope = calculateFrictionSlope(
      nextVelocity,
      nextArea / calculateWetPerimeter(nextY, params),
      params.manningN,
      params.units
    );
    
    // Average friction slope
    const avgFrictionSlope = (currentFrictionSlope + nextFrictionSlope) / 2;
    
    // Head loss due to friction
    const headLoss = avgFrictionSlope * dx;
    
    // Expected energy at next point based on energy equation
    const expectedNextEnergy = currentEnergy + dz - headLoss;
    
    // Error in energy
    const error = nextEnergy - expectedNextEnergy;
    
    // Check if solution converged
    if (Math.abs(error) < tolerance) {
      break;
    }
    
    // Adjust depth based on error
    if (error > 0) {
      // If energy is too high, increase depth
      nextY += 0.01;
    } else {
      // If energy is too low, decrease depth
      nextY -= 0.01;
    }
    
    // Ensure depth remains positive
    if (nextY <= 0) {
      nextY = 0.01;
    }
    
    iterations++;
  }
  
  return nextY;
}

/**
 * Determines the water surface profile type based on channel slope and depths
 * @param channelSlope Channel slope classification ('mild', 'critical', or 'steep')
 * @param depth Current flow depth
 * @param normalDepth Normal depth
 * @param criticalDepth Critical depth
 * @returns Profile type classification (M1, M2, S1, etc.)
 */
function determineProfileType(
  channelSlope: string, 
  depth: number, 
  normalDepth: number, 
  criticalDepth: number
): string {
  if (channelSlope === 'mild') {
    if (depth > normalDepth) return 'M1';
    if (depth < normalDepth && depth > criticalDepth) return 'M2';
    if (depth < criticalDepth) return 'M3';
  } else if (channelSlope === 'steep') {
    if (depth > criticalDepth) return 'S1';
    if (depth < criticalDepth && depth > normalDepth) return 'S2';
    if (depth < normalDepth) return 'S3';
  } else if (channelSlope === 'critical') {
    if (depth > criticalDepth) return 'C1';
    if (depth < criticalDepth) return 'C3';
    return 'C0';
  }
  
  return 'Unknown';
}