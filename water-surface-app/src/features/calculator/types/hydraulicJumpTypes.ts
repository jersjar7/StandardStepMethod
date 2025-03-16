/**
 * Standardized hydraulic jump type definitions
 * This file contains the central type definitions for hydraulic jumps
 * to ensure consistency across the application.
 */

/**
 * Base hydraulic jump interface with discriminated union pattern
 */
export interface BaseHydraulicJump {
    occurs: boolean;  // Discriminant property
  }
  
  /**
   * Interface for when a hydraulic jump occurs
   */
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
  
  /**
   * Interface for when no hydraulic jump occurs
   */
  export interface NoHydraulicJump extends BaseHydraulicJump {
    occurs: false;
  }
  
  /**
   * Unified hydraulic jump type using discriminated union
   */
  export type HydraulicJump = OccurringHydraulicJump | NoHydraulicJump;
  
  /**
   * Extended hydraulic jump result for internal calculations
   * Includes additional technical properties not needed in the UI
   */
  export interface HydraulicJumpResult extends OccurringHydraulicJump {
    position: number;             // Alias for station (used internally)
    depth1: number;               // Alias for upstreamDepth (used internally)
    depth2: number;               // Alias for downstreamDepth (used internally)
    sequentDepthRatio: number;    // Ratio of downstream to upstream depth (y2/y1)
    efficiency: number;           // Jump efficiency (1 - energy loss / upstream energy)
    specificForce1?: number;      // Specific force upstream of jump
    specificForce2?: number;      // Specific force downstream of jump
  }
  
  /**
   * Converts a HydraulicJumpResult to the standard HydraulicJump type
   * @param result HydraulicJumpResult from calculations
   * @returns Standardized HydraulicJump for store and UI
   */
  export function convertToStandardHydraulicJump(result?: HydraulicJumpResult | null): HydraulicJump {
    if (!result) return { occurs: false };
    
    return {
      occurs: true,
      station: result.position,
      upstreamDepth: result.depth1,
      downstreamDepth: result.depth2,
      energyLoss: result.energyLoss,
      froudeNumber1: result.froudeNumber1,
      length: result.length,
      jumpType: result.jumpType
    };
  }
  
  /**
   * Classifies a hydraulic jump based on upstream Froude number
   * @param froudeNumber1 Upstream Froude number
   * @returns Classification string
   */
  export function classifyHydraulicJump(froudeNumber1: number): string {
    if (froudeNumber1 < 1) {
      return 'No Jump';
    } else if (froudeNumber1 < 1.7) {
      return 'Undular Jump';
    } else if (froudeNumber1 < 2.5) {
      return 'Weak Jump';
    } else if (froudeNumber1 < 4.5) {
      return 'Oscillating Jump';
    } else if (froudeNumber1 < 9.0) {
      return 'Steady Jump';
    } else {
      return 'Strong Jump';
    }
  }
  
  /**
   * Type guard to check if a hydraulic jump occurs
   * @param jump HydraulicJump to check
   * @returns Type predicate for jump occurring
   */
  export function isOccurringJump(jump: HydraulicJump): jump is OccurringHydraulicJump {
    return jump.occurs === true;
  }