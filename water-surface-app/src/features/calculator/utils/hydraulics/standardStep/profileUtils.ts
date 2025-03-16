import { ChannelParams } from '../../../stores/calculatorSlice';
import { FlowDepthPoint, ProfileType } from './types';
import { detectFlowTransitions, determineFlowRegime } from './transitionDetector';

/**
 * Interface for profile statistics
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
 * Calculates statistical properties of a water surface profile
 * @param profile Array of flow depth points
 * @returns Statistical properties
 */
export function calculateProfileStatistics(profile: FlowDepthPoint[]): ProfileStatistics {
  if (profile.length === 0) {
    throw new Error("Cannot calculate statistics for empty profile");
  }
  
  // Initialize with values from first point
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
  
  // Count points in each flow regime
  let subcriticalCount = 0;
  let criticalCount = 0;
  let supercriticalCount = 0;
  
  // Process all points
  for (let i = 0; i < profile.length; i++) {
    const point = profile[i];
    
    // Track min, max, and sum of depth
    minDepth = Math.min(minDepth, point.y);
    maxDepth = Math.max(maxDepth, point.y);
    sumDepth += point.y;
    
    // Track min, max, and sum of velocity
    minVelocity = Math.min(minVelocity, point.velocity);
    maxVelocity = Math.max(maxVelocity, point.velocity);
    sumVelocity += point.velocity;
    
    // Track min, max, and sum of Froude number
    minFroude = Math.min(minFroude, point.froudeNumber);
    maxFroude = Math.max(maxFroude, point.froudeNumber);
    sumFroude += point.froudeNumber;
    
    // Track min, max, and sum of specific energy
    minEnergy = Math.min(minEnergy, point.specificEnergy);
    maxEnergy = Math.max(maxEnergy, point.specificEnergy);
    sumEnergy += point.specificEnergy;
    
    // Count flow regimes
    const regime = determineFlowRegime(point.froudeNumber);
    switch (regime) {
      case 'subcritical':
        subcriticalCount++;
        break;
      case 'critical':
        criticalCount++;
        break;
      case 'supercritical':
        supercriticalCount++;
        break;
    }
  }
  
  // Calculate profile length
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  const length = sortedProfile[sortedProfile.length - 1].x - sortedProfile[0].x;
  
  // Determine predominant flow regime
  let predominantFlowRegime = "Mixed Flow";
  
  if (subcriticalCount > criticalCount && subcriticalCount > supercriticalCount) {
    predominantFlowRegime = "Subcritical Flow";
  } else if (supercriticalCount > subcriticalCount && supercriticalCount > criticalCount) {
    predominantFlowRegime = "Supercritical Flow";
  } else if (criticalCount > subcriticalCount && criticalCount > supercriticalCount) {
    predominantFlowRegime = "Critical Flow";
  }
  
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
    predominantFlowRegime
  };
}

/**
 * Provides detailed profile classification and description
 * @param profile Array of flow depth points
 * @param params Channel parameters
 * @returns Profile description object
 */
export function getProfileDescription(
  profile: FlowDepthPoint[], 
  params: ChannelParams
): { classification: string; description: string; details: string } {
  // Sort profile by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Get first and last points
  const firstPoint = sortedProfile[0];
  const lastPoint = sortedProfile[sortedProfile.length - 1];
  
  // Detect transitions
  const transitions = detectFlowTransitions(profile);
  
  // Calculate profile statistics
  const stats = calculateProfileStatistics(profile);
  
  // Initialize variables for classification
  let classification = "";
  let description = "";
  let details = "";
  
  // Determine basic profile characteristics
  const isMild = firstPoint.normalDepth > firstPoint.criticalDepth;
  const isSteep = firstPoint.normalDepth < firstPoint.criticalDepth;
  
  if (transitions.length === 0) {
    // No transitions - uniform flow regime
    if (stats.minFroude < 1 && stats.maxFroude < 1) {
      // Subcritical flow throughout
      if (isMild) {
        if (stats.avgDepth > firstPoint.normalDepth) {
          classification = ProfileType.M1;
          description = "M1 - Backwater Curve (Mild Slope)";
          details = "Depth decreases in the downstream direction, approaching normal depth";
        } else {
          classification = ProfileType.M2;
          description = "M2 - Drawdown Curve (Mild Slope)";
          details = "Depth decreases in the downstream direction, approaching critical depth";
        }
      } else if (isSteep) {
        classification = ProfileType.S1;
        description = "S1 - Backwater Curve (Steep Slope)";
        details = "Depth decreases in the downstream direction";
      }
    } else if (stats.minFroude > 1 && stats.maxFroude > 1) {
      // Supercritical flow throughout
      if (isMild) {
        classification = ProfileType.M3;
        description = "M3 - Supercritical Flow (Mild Slope)";
        details = "Depth increases in the downstream direction";
      } else if (isSteep) {
        if (stats.avgDepth < firstPoint.normalDepth) {
          classification = ProfileType.S3;
          description = "S3 - Supercritical Flow (Steep Slope)";
          details = "Depth increases in the downstream direction, approaching normal depth";
        } else {
          classification = ProfileType.S2;
          description = "S2 - Drawdown Curve (Steep Slope)";
          details = "Depth decreases in the downstream direction, approaching critical depth";
        }
      }
    }
  } else {
    // With transitions
    if (transitions.some(t => t.isHydraulicJump)) {
      classification = "Hydraulic Jump";
      description = "Profile with Hydraulic Jump";
      details = `Transition from supercritical to subcritical flow at station ${transitions[0].station.toFixed(2)} m`;
    } else if (transitions.length === 1) {
      classification = "Transition Profile";
      description = "Profile with Flow Regime Transition";
      details = `Transition at station ${transitions[0].station.toFixed(2)} m`;
    } else {
      classification = "Complex Profile";
      description = "Complex Profile with Multiple Transitions";
      details = `${transitions.length} transitions detected`;
    }
  }
  
  // If classification is still empty, use a generic one
  if (!classification) {
    classification = "Mixed Profile";
    description = "Mixed Flow Profile";
    details = "Profile with mixed flow characteristics";
  }
  
  // Add statistical details
  details += `\nDepth: ${stats.minDepth.toFixed(3)} - ${stats.maxDepth.toFixed(3)} m`;
  details += `\nVelocity: ${stats.minVelocity.toFixed(3)} - ${stats.maxVelocity.toFixed(3)} m/s`;
  details += `\nFroude: ${stats.minFroude.toFixed(3)} - ${stats.maxFroude.toFixed(3)}`;
  
  return { classification, description, details };
}

/**
 * Filters a profile to reduce the number of points while preserving key features
 * @param profile Array of flow depth points
 * @param maxPoints Maximum number of points to include
 * @returns Filtered profile
 */
export function simplifyProfile(
  profile: FlowDepthPoint[], 
  maxPoints: number = 100
): FlowDepthPoint[] {
  if (profile.length <= maxPoints) {
    return [...profile];
  }
  
  // Sort by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Detect transitions to preserve
  const transitions = detectFlowTransitions(profile);
  
  // Calculate initial step size based on maxPoints
  const step = Math.floor(profile.length / maxPoints);
  
  // Select points
  const result: FlowDepthPoint[] = [];
  
  // Always include first and last points
  result.push(sortedProfile[0]);
  
  // Add points based on step size
  for (let i = step; i < sortedProfile.length - 1; i += step) {
    result.push(sortedProfile[i]);
  }
  
  // Add transition points if they're not already included
  for (const transition of transitions) {
    // Find closest existing point in result
    let closestIndex = -1;
    let minDistance = Number.MAX_VALUE;
    
    for (let i = 0; i < result.length; i++) {
      const distance = Math.abs(result[i].x - transition.station);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    // If closest point is too far, add a point at the transition
    if (minDistance > (sortedProfile[1].x - sortedProfile[0].x) * 2) {
      // Find the points in original profile that bracket the transition
      for (let i = 0; i < sortedProfile.length - 1; i++) {
        if (sortedProfile[i].x <= transition.station && 
            sortedProfile[i+1].x >= transition.station) {
          // Interpolate to get properties at transition station
          const t = (transition.station - sortedProfile[i].x) / 
                    (sortedProfile[i+1].x - sortedProfile[i].x);
          
          const interpolatedPoint: FlowDepthPoint = {
            x: transition.station,
            y: sortedProfile[i].y + t * (sortedProfile[i+1].y - sortedProfile[i].y),
            velocity: sortedProfile[i].velocity + t * (sortedProfile[i+1].velocity - sortedProfile[i].velocity),
            froudeNumber: 1.0, // At transition, Fr = 1
            specificEnergy: sortedProfile[i].specificEnergy + t * (sortedProfile[i+1].specificEnergy - sortedProfile[i].specificEnergy),
            criticalDepth: sortedProfile[i].criticalDepth,
            normalDepth: sortedProfile[i].normalDepth
          };
          
          result.push(interpolatedPoint);
          break;
        }
      }
    }
  }
  
  // Always include last point if not already included
  const lastPoint = sortedProfile[sortedProfile.length - 1];
  if (result[result.length - 1].x !== lastPoint.x) {
    result.push(lastPoint);
  }
  
  // Sort filtered points by station
  return result.sort((a, b) => a.x - b.x);
}