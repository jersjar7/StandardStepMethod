import { ChannelParams } from '../../../stores/calculatorSlice';
import { FlowDepthPoint } from './types';
import { 
  isHydraulicJumpPossible, 
  calculateHydraulicJump, 
  HydraulicJumpResult 
} from '../hydraulicJump';

/**
 * Checks if a hydraulic jump is present between two profile points
 * @param point1 First profile point
 * @param point2 Second profile point
 * @returns True if a hydraulic jump may be present
 */
export function isJumpBetweenPoints(
  point1: FlowDepthPoint,
  point2: FlowDepthPoint
): boolean {
  // Jump occurs when flow transitions from supercritical to subcritical
  // Fr > 1 to Fr < 1
  return (point1.froudeNumber > 1 && point2.froudeNumber < 1);
}

/**
 * Detects a hydraulic jump in the profile and calculates its properties
 * @param profile Array of flow depth points
 * @param params Channel parameters
 * @returns Hydraulic jump details or undefined if no jump is detected
 */
export function detectHydraulicJump(
  profile: FlowDepthPoint[],
  params: ChannelParams
): HydraulicJumpResult | undefined {
  // Sort profile by station to ensure correct order
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Look for jumps in the entire profile
  for (let i = 0; i < sortedProfile.length - 1; i++) {
    const currentPoint = sortedProfile[i];
    const nextPoint = sortedProfile[i+1];
    
    if (isJumpBetweenPoints(currentPoint, nextPoint)) {
      // Verify if jump is possible at the current depth
      if (isHydraulicJumpPossible(currentPoint.y, params)) {
        // Calculate jump location - approximately halfway between points
        const jumpLocation = (currentPoint.x + nextPoint.x) / 2;
        
        // Calculate hydraulic jump details
        return calculateHydraulicJump(currentPoint.y, jumpLocation, params);
      }
    }
  }
  
  return undefined;
}

/**
 * Refines the jump location for greater accuracy
 * @param profile Array of flow depth points
 * @param jumpLocation Approximate jump location
 * @param params Channel parameters
 * @returns Refined hydraulic jump details
 */
export function refineJumpLocation(
  profile: FlowDepthPoint[],
  jumpLocation: number,
  params: ChannelParams
): HydraulicJumpResult | undefined {
  // Sort profile by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Find the two points closest to the jump location
  let closestIndex = 0;
  let minDistance = Math.abs(sortedProfile[0].x - jumpLocation);
  
  for (let i = 1; i < sortedProfile.length; i++) {
    const distance = Math.abs(sortedProfile[i].x - jumpLocation);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  
  // Get the point just before and just after the closest point
  const beforeIndex = Math.max(0, closestIndex - 1);
  const afterIndex = Math.min(sortedProfile.length - 1, closestIndex + 1);
  
  // Check if there's a transition between these points
  for (let i = beforeIndex; i < afterIndex; i++) {
    if (isJumpBetweenPoints(sortedProfile[i], sortedProfile[i+1])) {
      // Calculate more accurate jump location based on Froude number gradient
      const fr1 = sortedProfile[i].froudeNumber;
      const fr2 = sortedProfile[i+1].froudeNumber;
      const x1 = sortedProfile[i].x;
      const x2 = sortedProfile[i+1].x;
      
      // Linear interpolation to find where Fr = 1
      const interpolationFactor = (1 - fr1) / (fr2 - fr1);
      const refinedLocation = x1 + interpolationFactor * (x2 - x1);
      
      // Calculate hydraulic jump details with the refined location
      return calculateHydraulicJump(sortedProfile[i].y, refinedLocation, params);
    }
  }
  
  // Fall back to the original jump calculation if no transition is found
  return calculateHydraulicJump(
    sortedProfile[closestIndex].y, 
    jumpLocation, 
    params
  );
}

/**
 * Detects multiple hydraulic jumps in a profile
 * @param profile Array of flow depth points
 * @param params Channel parameters
 * @returns Array of hydraulic jump details
 */
export function detectMultipleJumps(
  profile: FlowDepthPoint[],
  params: ChannelParams
): HydraulicJumpResult[] {
  const jumps: HydraulicJumpResult[] = [];
  
  // Sort profile by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Look for jumps in the entire profile
  for (let i = 0; i < sortedProfile.length - 1; i++) {
    const currentPoint = sortedProfile[i];
    const nextPoint = sortedProfile[i+1];
    
    if (isJumpBetweenPoints(currentPoint, nextPoint)) {
      // Verify if jump is possible at the current depth
      if (isHydraulicJumpPossible(currentPoint.y, params)) {
        // Calculate approximate jump location
        const jumpLocation = (currentPoint.x + nextPoint.x) / 2;
        
        // Calculate hydraulic jump details
        const jump = calculateHydraulicJump(currentPoint.y, jumpLocation, params);
        
        // Add jump to the list if it exists
        if (jump) {
          jumps.push(jump);
        }
      }
    }
  }
  
  return jumps;
}

/**
 * Updates a profile to account for hydraulic jumps
 * @param profile Array of flow depth points
 * @param jumps Array of hydraulic jump details
 * @returns Updated profile with jump-corrected depths
 */
export function incorporateJumpsIntoProfile(
  profile: FlowDepthPoint[],
  jumps: HydraulicJumpResult[]
): FlowDepthPoint[] {
  if (jumps.length === 0) {
    return profile; // No jumps to incorporate
  }
  
  // Sort profile by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Sort jumps by position
  const sortedJumps = [...jumps].sort((a, b) => a.position - b.position);
  
  // Create a new array to store the updated profile
  const updatedProfile: FlowDepthPoint[] = [];
  
  // Process points and incorporate jumps
  for (let i = 0; i < sortedProfile.length; i++) {
    const currentPoint = sortedProfile[i];
    
    // Add current point to the updated profile
    updatedProfile.push(currentPoint);
    
    // Check if there's a jump after this point and before the next point
    if (i < sortedProfile.length - 1) {
      const nextPoint = sortedProfile[i+1];
      
      for (const jump of sortedJumps) {
        if (jump.position > currentPoint.x && jump.position < nextPoint.x) {
          // There's a jump between these points
          // Add a point at the jump location with the sequent depth
          const jumpPointBefore: FlowDepthPoint = {
            x: jump.position - 0.01, // Just before jump
            y: jump.depth1,
            velocity: currentPoint.velocity, // Approximate values
            froudeNumber: jump.froudeNumber1,
            specificEnergy: currentPoint.specificEnergy, // Approximate
            criticalDepth: currentPoint.criticalDepth,
            normalDepth: currentPoint.normalDepth
          };
          
          const jumpPointAfter: FlowDepthPoint = {
            x: jump.position + 0.01, // Just after jump
            y: jump.depth2,
            velocity: nextPoint.velocity, // Approximate values
            froudeNumber: 1 / jump.froudeNumber1, // Approximate
            specificEnergy: nextPoint.specificEnergy, // Approximate
            criticalDepth: nextPoint.criticalDepth,
            normalDepth: nextPoint.normalDepth
          };
          
          updatedProfile.push(jumpPointBefore);
          updatedProfile.push(jumpPointAfter);
        }
      }
    }
  }
  
  // Sort the updated profile by station
  return updatedProfile.sort((a, b) => a.x - b.x);
}