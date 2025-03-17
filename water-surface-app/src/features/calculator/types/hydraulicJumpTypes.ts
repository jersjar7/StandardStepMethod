/**
 * Unified Hydraulic Jump Types
 * This file defines the core HydraulicJump types and extensions
 * to be used consistently throughout the application.
 */

// Base type with discriminated union pattern
export interface BaseHydraulicJump {
  occurs: boolean;  // Discriminant property
}

// When a hydraulic jump occurs
export interface OccurringHydraulicJump extends BaseHydraulicJump {
  occurs: true;
  station: number;          // Location of jump
  upstreamDepth: number;    // Upstream depth (y1)
  downstreamDepth: number;  // Downstream depth (y2)
  energyLoss?: number;      // Energy loss at jump
  froudeNumber1?: number;   // Upstream Froude number
  length?: number;          // Approximate length of hydraulic jump
  jumpType?: string;        // Classification of jump (undular, weak, etc.)
}

// When no hydraulic jump occurs
export interface NoHydraulicJump extends BaseHydraulicJump {
  occurs: false;
}

// The primary hydraulic jump type used throughout the application
export type HydraulicJump = OccurringHydraulicJump | NoHydraulicJump;

// Extended type for internal calculations with additional properties
// This extends the core type rather than being a separate incompatible type
export interface HydraulicJumpDetails extends OccurringHydraulicJump {
  // Properties used by calculation utilities
  sequentDepthRatio: number;    // Ratio of downstream to upstream depth (y2/y1)
  efficiency: number;           // Jump efficiency (1 - energy loss / upstream energy)
  specificForce1?: number;      // Specific force upstream of jump
  specificForce2?: number;      // Specific force downstream of jump
  
  // Legacy property aliases for backward compatibility
  position?: number;            // Alias for station
  depth1?: number;              // Alias for upstreamDepth
  depth2?: number;              // Alias for downstreamDepth
}

// Jump classification types
export type JumpType = 'undular' | 'weak' | 'oscillating' | 'steady' | 'strong' | 'none';

export interface JumpClassification {
  type: JumpType;
  description: string;
  froudeRange: string;
}

// Type guards for working with hydraulic jumps
export function isOccurringJump(jump: HydraulicJump): jump is OccurringHydraulicJump {
  return jump.occurs === true;
}

export function isDetailedJump(jump: HydraulicJump): jump is HydraulicJumpDetails {
  return isOccurringJump(jump) && 'sequentDepthRatio' in jump;
}

// Hydraulic jump classifications based on upstream Froude number
export const HYDRAULIC_JUMP_CLASSIFICATIONS: Record<Exclude<JumpType, 'none'>, JumpClassification> = {
  undular: {
    type: 'undular',
    description: 'Undular Jump - Small waves, minimal energy loss',
    froudeRange: '1.0 - 1.7'
  },
  weak: {
    type: 'weak',
    description: 'Weak Jump - Smooth surface, low energy dissipation',
    froudeRange: '1.7 - 2.5'
  },
  oscillating: {
    type: 'oscillating',
    description: 'Oscillating Jump - Unstable, pulsating flow with surface waves',
    froudeRange: '2.5 - 4.5'
  },
  steady: {
    type: 'steady',
    description: 'Steady Jump - Well-defined, stable jump with good energy dissipation',
    froudeRange: '4.5 - 9.0'
  },
  strong: {
    type: 'strong',
    description: 'Strong Jump - Intense turbulence, high energy dissipation',
    froudeRange: '> 9.0'
  }
};

/**
 * Classifies a hydraulic jump based on upstream Froude number
 * @param froudeNumber1 Upstream Froude number
 * @returns Jump type classification
 */
export function classifyJump(froudeNumber1: number): JumpType {
  if (froudeNumber1 < 1) return 'none';
  if (froudeNumber1 < 1.7) return 'undular';
  if (froudeNumber1 < 2.5) return 'weak';
  if (froudeNumber1 < 4.5) return 'oscillating';
  if (froudeNumber1 < 9.0) return 'steady';
  return 'strong';
}

/**
 * Get classification details for a hydraulic jump
 * @param froudeNumber1 Upstream Froude number
 * @returns Classification details or undefined if no jump
 */
export function getJumpClassification(froudeNumber1: number): JumpClassification | undefined {
  const jumpType = classifyJump(froudeNumber1);
  return jumpType !== 'none' ? HYDRAULIC_JUMP_CLASSIFICATIONS[jumpType] : undefined;
}

/**
 * Creates a standard hydraulic jump object
 * Used instead of type conversion since there's now a single type hierarchy
 */
export function createHydraulicJump(
  props?: Partial<OccurringHydraulicJump> | null
): HydraulicJump {
  if (!props) return { occurs: false };
  
  const { station, upstreamDepth, downstreamDepth } = props;
  
  if (station === undefined || upstreamDepth === undefined || downstreamDepth === undefined) {
    return { occurs: false };
  }
  
  return {
    occurs: true,
    station,
    upstreamDepth,
    downstreamDepth,
    ...props
  };
}

/**
 * Adds detailed calculations to a basic hydraulic jump
 * @param jump Basic hydraulic jump
 * @param additionalData Additional calculations
 * @returns Enhanced hydraulic jump with calculation details
 */
export function enhanceJumpWithDetails(
  jump: OccurringHydraulicJump,
  additionalData: Partial<HydraulicJumpDetails>
): HydraulicJumpDetails {
  // Ensure minimum required properties
  const sequentDepthRatio = additionalData.sequentDepthRatio ?? 
    jump.downstreamDepth / jump.upstreamDepth;
  
  const efficiency = additionalData.efficiency ?? 0.5; // Default if not provided
  
  return {
    ...jump,
    sequentDepthRatio,
    efficiency,
    ...additionalData
  };
}