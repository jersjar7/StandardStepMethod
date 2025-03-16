import { FlowDepthPoint, FlowRegime } from './types';

/**
 * Interface for flow transition
 */
export interface FlowTransition {
  fromRegime: FlowRegime;
  toRegime: FlowRegime;
  station: number;
  fromDepth: number;
  toDepth: number;
  fromFroude: number;
  toFroude: number;
  isHydraulicJump: boolean;
}

/**
 * Determines the flow regime based on Froude number
 * @param froudeNumber Froude number
 * @returns Flow regime
 */
export function determineFlowRegime(froudeNumber: number): FlowRegime {
  if (froudeNumber < 0.95) {
    return FlowRegime.SUBCRITICAL;
  } else if (froudeNumber > 1.05) {
    return FlowRegime.SUPERCRITICAL;
  } else {
    return FlowRegime.CRITICAL;
  }
}

/**
 * Detects all flow regime transitions in a water surface profile
 * @param profile Array of flow depth points
 * @returns Array of flow transitions
 */
export function detectFlowTransitions(profile: FlowDepthPoint[]): FlowTransition[] {
  // Sort the profile by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Array to store detected transitions
  const transitions: FlowTransition[] = [];
  
  // Look for transitions in consecutive points
  for (let i = 0; i < sortedProfile.length - 1; i++) {
    const currentPoint = sortedProfile[i];
    const nextPoint = sortedProfile[i + 1];
    
    const currentRegime = determineFlowRegime(currentPoint.froudeNumber);
    const nextRegime = determineFlowRegime(nextPoint.froudeNumber);
    
    // Check if there's a regime change
    if (currentRegime !== nextRegime) {
      // Calculate transition station by linear interpolation
      // Find where Froude number equals 1.0
      const fr1 = currentPoint.froudeNumber;
      const fr2 = nextPoint.froudeNumber;
      
      // If they're on opposite sides of Fr = 1, interpolate
      if ((fr1 < 1 && fr2 > 1) || (fr1 > 1 && fr2 < 1)) {
        // Linear interpolation to find where Fr = 1
        const t = (1 - fr1) / (fr2 - fr1);
        const transitionStation = currentPoint.x + t * (nextPoint.x - currentPoint.x);
        
        // Interpolate depth at transition
        const fromDepth = currentPoint.y;
        const toDepth = nextPoint.y;
        
        // Determine if this is a hydraulic jump
        // A hydraulic jump is characterized by a sudden increase in depth 
        // when going from supercritical to subcritical flow
        const isHydraulicJump = (fr1 > 1 && fr2 < 1) && (toDepth > fromDepth);
        
        transitions.push({
          fromRegime: currentRegime,
          toRegime: nextRegime,
          station: transitionStation,
          fromDepth,
          toDepth,
          fromFroude: fr1,
          toFroude: fr2,
          isHydraulicJump
        });
      }
    }
  }
  
  return transitions;
}

/**
 * Classifies a profile based on transitions
 * @param transitions Array of flow transitions
 * @param initialRegime Initial flow regime
 * @returns Classification string
 */
export function classifyProfileByTransitions(
  transitions: FlowTransition[], 
  initialRegime: FlowRegime
): string {
  if (transitions.length === 0) {
    // No transitions - uniform flow regime
    switch (initialRegime) {
      case FlowRegime.SUBCRITICAL:
        return "Subcritical Flow Throughout";
      case FlowRegime.SUPERCRITICAL:
        return "Supercritical Flow Throughout";
      case FlowRegime.CRITICAL:
        return "Critical Flow Throughout";
      default:
        return "Unknown Flow Regime";
    }
  } else if (transitions.length === 1) {
    const transition = transitions[0];
    
    if (transition.isHydraulicJump) {
      return "Hydraulic Jump Profile";
    } else if (transition.fromRegime === FlowRegime.SUPERCRITICAL && 
               transition.toRegime === FlowRegime.SUBCRITICAL) {
      return "Gradual Transition from Supercritical to Subcritical";
    } else if (transition.fromRegime === FlowRegime.SUBCRITICAL && 
               transition.toRegime === FlowRegime.SUPERCRITICAL) {
      return "Choked Flow - Subcritical to Supercritical";
    }
  } else if (transitions.length > 1) {
    // Multiple transitions
    const hasHydraulicJump = transitions.some(t => t.isHydraulicJump);
    
    if (hasHydraulicJump) {
      return "Complex Profile with Hydraulic Jump";
    } else {
      return "Complex Profile with Multiple Transitions";
    }
  }
  
  return "Mixed Flow Profile";
}

/**
 * Finds the critical depth transition location
 * @param profile Array of flow depth points
 * @returns Station where depth equals critical depth, or -1 if not found
 */
export function findCriticalDepthLocation(profile: FlowDepthPoint[]): number {
  // Sort the profile by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Look for points where depth ≈ critical depth
  for (let i = 0; i < sortedProfile.length - 1; i++) {
    const current = sortedProfile[i];
    const next = sortedProfile[i + 1];
    
    // Check if critical depth is between current and next depths
    if ((current.y < current.criticalDepth && next.y > next.criticalDepth) ||
        (current.y > current.criticalDepth && next.y < next.criticalDepth)) {
      
      // Linear interpolation to find where y = yc
      const t = (current.criticalDepth - current.y) / (next.y - current.y);
      const station = current.x + t * (next.x - current.x);
      
      return station;
    }
    
    // Also check if any point is already at critical depth
    if (Math.abs(current.y - current.criticalDepth) / current.criticalDepth < 0.01) {
      return current.x;
    }
  }
  
  return -1; // Not found
}

/**
 * Finds the normal depth transition location
 * @param profile Array of flow depth points
 * @returns Station where depth equals normal depth, or -1 if not found
 */
export function findNormalDepthLocation(profile: FlowDepthPoint[]): number {
  // Sort the profile by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Look for points where depth ≈ normal depth
  for (let i = 0; i < sortedProfile.length - 1; i++) {
    const current = sortedProfile[i];
    const next = sortedProfile[i + 1];
    
    // Check if normal depth is between current and next depths
    if ((current.y < current.normalDepth && next.y > next.normalDepth) ||
        (current.y > current.normalDepth && next.y < next.normalDepth)) {
      
      // Linear interpolation to find where y = yn
      const t = (current.normalDepth - current.y) / (next.y - current.y);
      const station = current.x + t * (next.x - current.x);
      
      return station;
    }
    
    // Also check if any point is already at normal depth
    if (Math.abs(current.y - current.normalDepth) / current.normalDepth < 0.01) {
      return current.x;
    }
  }
  
  return -1; // Not found
}