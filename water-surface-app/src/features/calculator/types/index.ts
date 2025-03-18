/**
 * Central type definitions for the water surface profile calculator
 * This file serves as the single source of truth for all types used throughout the calculator feature
 */

// Import types from specialized modules
import { 
  HydraulicJump, 
  BaseHydraulicJump, 
  OccurringHydraulicJump, 
  NoHydraulicJump 
} from './hydraulicJumpTypes';

/**
 * Unit system
 */
export type UnitSystem = 'metric' | 'imperial';

/**
 * Channel types
 */
export type ChannelType = 'rectangular' | 'trapezoidal' | 'triangular' | 'circular';

/**
 * Calculation direction
 */
export type CalculationDirection = 'upstream' | 'downstream';

/**
 * Channel slope classification
 */
export type ChannelSlope = 'mild' | 'critical' | 'steep';

/**
 * Flow regime classification
 */
export enum FlowRegime {
  SUBCRITICAL = 'subcritical',
  CRITICAL = 'critical',
  SUPERCRITICAL = 'supercritical'
}

/**
 * Profile type classification
 */
export enum ProfileType {
  // Mild slope profiles
  M1 = 'M1',   // Backwater curve
  M2 = 'M2',   // Drawdown curve
  M3 = 'M3',   // Rapidly varied flow
  
  // Steep slope profiles
  S1 = 'S1',   // Backwater curve
  S2 = 'S2',   // Drawdown curve
  S3 = 'S3',   // Rapidly varied flow
  
  // Critical slope profiles
  C1 = 'C1',   // Backwater curve
  C2 = 'C2',   // Uniform flow
  C3 = 'C3',   // Drawdown curve
  
  // Unknown profile
  MIXED = 'Mixed',
  UNKNOWN = 'Unknown'
}

/**
 * Channel parameters
 */
export interface ChannelParams {
  channelType: ChannelType;
  bottomWidth: number;        // For rectangular and trapezoidal
  sideSlope?: number;         // For trapezoidal and triangular
  diameter?: number;          // For circular
  manningN: number;           // Manning's roughness coefficient
  channelSlope: number;       // Channel bed slope
  discharge: number;          // Flow rate
  length: number;             // Channel length
  upstreamDepth?: number;     // Optional boundary condition
  downstreamDepth?: number;   // Optional boundary condition
  criticalDepth?: number;     // Reference value, calculated if not provided
  normalDepth?: number;       // Reference value, calculated if not provided
  units?: UnitSystem;         // Unit system
}

/**
 * Flow depth point in the profile
 */
export interface FlowDepthPoint {
  x: number;                 // Station (distance along channel)
  y: number;                 // Depth
  velocity: number;          // Flow velocity
  froudeNumber: number;      // Froude number
  specificEnergy: number;    // Specific energy
  criticalDepth: number;     // Critical depth
  normalDepth: number;       // Normal depth
  topWidth: number;          // Top width of water surface
}

// Re-export hydraulic jump types
export type { 
  HydraulicJump, 
  BaseHydraulicJump, 
  OccurringHydraulicJump, 
  NoHydraulicJump 
};

/**
 * Calculation result for a single point
 */
export interface CalculationResult {
  station: number;           // Distance along channel
  depth: number;             // Water depth
  velocity: number;          // Flow velocity
  area: number;              // Flow area
  topWidth: number;          // Top width of water surface
  wetPerimeter: number;      // Wetted perimeter
  hydraulicRadius: number;   // Hydraulic radius (A/P)
  energy: number;            // Specific energy
  froudeNumber: number;      // Froude number
  criticalDepth?: number;    // Critical depth
  normalDepth?: number;      // Normal depth
}

/**
 * Profile statistics
 */
export interface ProfileStatistics {
  minDepth: number;                // Minimum depth
  maxDepth: number;                // Maximum depth
  avgDepth: number;                // Average depth
  minVelocity: number;             // Minimum velocity
  maxVelocity: number;             // Maximum velocity
  avgVelocity: number;             // Average velocity
  minFroude: number;               // Minimum Froude number
  maxFroude: number;               // Maximum Froude number
  avgFroude: number;               // Average Froude number
  minEnergy: number;               // Minimum specific energy
  maxEnergy: number;               // Maximum specific energy
  avgEnergy: number;               // Average specific energy
  length: number;                  // Profile length
  numPoints: number;               // Number of calculation points
  predominantFlowRegime: string;   // Predominant flow regime
}

/**
 * Water surface profile results
 */
export interface WaterSurfaceProfileResults {
  flowProfile: FlowDepthPoint[];    // Array of flow depth points
  profileType: ProfileType;         // Profile classification using enum or string
  channelType: string;              // Channel slope classification (mild, steep, critical)
  criticalDepth: number;            // Critical depth for the channel and discharge
  normalDepth: number;              // Normal depth for the channel and discharge
  isChoking: boolean;               // Indicates if choking occurred
  hydraulicJump?: HydraulicJump;    // Hydraulic jump details, if any
  // Added optional properties for extended analysis
  profileDescription?: string;      // Human-readable profile description
  profileDetails?: string;          // Detailed information about the profile
  stats?: ProfileStatistics;        // Statistical analysis of the profile
}

/**
 * Step calculation parameters
 */
export interface StepCalculationParams {
  currentX: number;                // Current station
  currentY: number;                // Current depth
  nextX: number;                   // Next station
  direction: CalculationDirection; // Calculation direction
  params: ChannelParams;           // Channel parameters
}

/**
 * Profile calculation parameters
 */
export interface ProfileCalculationParams {
  initialDepth: number;            // Initial water depth
  direction: CalculationDirection; // Calculation direction
  startPosition: number;           // Starting station
  criticalDepth: number;           // Critical depth
  normalDepth: number;             // Normal depth
  numSteps: number;                // Number of calculation steps
  channelSlope: ChannelSlope;      // Channel slope classification
  params: ChannelParams;           // Channel parameters
}

/**
 * Flow transition
 */
export interface FlowTransition {
  fromRegime: FlowRegime;       // Initial flow regime
  toRegime: FlowRegime;         // Final flow regime
  station: number;              // Transition location
  fromDepth: number;            // Depth before transition
  toDepth: number;              // Depth after transition
  fromFroude: number;           // Froude number before transition
  toFroude: number;             // Froude number after transition
  isHydraulicJump: boolean;     // Whether this is a hydraulic jump
}

/**
 * Calculator state
 */
export interface CalculatorState {
  channelParams: ChannelParams;
  results: CalculationResult[];
  hydraulicJump?: HydraulicJump;
  isCalculating: boolean;
  error: string | null;
  selectedResultIndex?: number;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: 'csv' | 'json' | 'report';  // Export format
  filename?: string;                  // Optional filename
  includeChannelParams?: boolean;     // Whether to include channel parameters
  includeHeaders?: boolean;           // Whether to include headers (for CSV)
  decimalPlaces?: number;             // Number of decimal places
}

/**
 * DetailedWaterSurfaceResults
 */
export interface DetailedWaterSurfaceResults extends WaterSurfaceProfileResults {
  profileDescription?: string;
  profileDetails?: string;
  flowRegime?: FlowRegime;
  stats?: ProfileStatistics;
}

/**
 * enhanceWithDetails
 */
export function enhanceWithDetails<T extends WaterSurfaceProfileResults>(
  baseResults: T, 
  additionalProps: Partial<DetailedWaterSurfaceResults>
): DetailedWaterSurfaceResults {
  return {
    ...baseResults,
    ...additionalProps
  };
}

// Removed: export * from './resultTypes';