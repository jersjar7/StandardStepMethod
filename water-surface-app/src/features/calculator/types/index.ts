/**
 * Central type definitions for the water surface profile calculator
 * This file serves as the single source of truth for all types used throughout the calculator feature
 */

// Import types from specialized modules
import { 
  HydraulicJump, 
  BaseHydraulicJump, 
  OccurringHydraulicJump, 
  NoHydraulicJump,
  classifyJump
} from './hydraulicJumpTypes';

import {
  CalculationResultWithError,
  DetailedCalculationResultWithError,
  ProfileStatistics,
  FLOW_REGIME_DESCRIPTIONS,
  PROFILE_TYPE_DESCRIPTIONS,
  CHANNEL_SLOPE_DESCRIPTIONS,
  getFlowRegimeDescription,
  determineProfileType,
  getProfileTypeDescription
} from './resultTypes';

import {
  WorkerMessage,
  WorkerMessageType,
  WorkerCalculationMessage,
  WorkerProgressMessage,
  WorkerResultMessage,
  WorkerErrorMessage
} from './workerTypes';

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
  
  // Internal calculation parameters - not part of the public API
  _numSteps?: number;         // Number of calculation steps
  _tolerance?: number;        // Convergence tolerance
  _maxIterations?: number;    // Maximum iterations per step
  _method?: string;           // Calculation method
  _highResolution?: boolean;  // Whether to use high-resolution calculation
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
 * Water surface profile results
 */
export interface WaterSurfaceProfileResults {
  flowProfile: FlowDepthPoint[];    // Array of flow depth points
  profileType: ProfileType;         // Profile classification using enum
  channelType: string;              // Channel slope classification (mild, steep, critical)
  criticalDepth: number;            // Critical depth for the channel and discharge
  normalDepth: number;              // Normal depth for the channel and discharge
  isChoking: boolean;               // Indicates if choking occurred
  hydraulicJump?: HydraulicJump;    // Hydraulic jump details, if any
}

/**
 * Detailed water surface profile results with additional analysis
 */
export interface DetailedWaterSurfaceResults extends WaterSurfaceProfileResults {
  profileDescription?: string;      // Human-readable profile description
  profileDetails?: string;          // Detailed information about the profile
  flowRegime?: FlowRegime;          // Predominant flow regime
  stats?: ProfileStatistics;        // Statistical analysis of the profile
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
 * Calculation progress event
 */
export interface CalculationProgressEvent {
  progress: number;         // Progress value (0-100)
  message?: string;         // Optional progress message
  currentStep?: number;     // Current calculation step
  totalSteps?: number;      // Total calculation steps
  stage?: string;           // Current calculation stage
}

/**
 * Calculation task status
 */
export enum CalculationTaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled'
}

/**
 * Calculation task
 */
export interface CalculationTask {
  id: string;              // Task ID
  status: CalculationTaskStatus;  // Task status
  params: ChannelParams;   // Channel parameters
  startTime: number;       // Start timestamp
  endTime?: number;        // End timestamp
  progress: number;        // Progress value (0-100)
  result?: WaterSurfaceProfileResults;  // Calculation result
  error?: string;          // Error message if task failed
}

/**
 * Calculation service configuration
 */
export interface CalculationServiceConfig {
  useWorker: boolean;      // Whether to use Web Workers
  useCache: boolean;       // Whether to use cache
  cacheTTL: number;        // Cache time-to-live in milliseconds
  defaultTimeout: number;  // Default calculation timeout in milliseconds
}

// Re-export hydraulic jump types
export type { 
  HydraulicJump, 
  BaseHydraulicJump, 
  OccurringHydraulicJump, 
  NoHydraulicJump,
  classifyJump
};

// Re-export result types
export type {
  CalculationResultWithError,
  DetailedCalculationResultWithError,
  ProfileStatistics,
  FLOW_REGIME_DESCRIPTIONS,
  PROFILE_TYPE_DESCRIPTIONS,
  CHANNEL_SLOPE_DESCRIPTIONS,
  getFlowRegimeDescription,
  determineProfileType,
  getProfileTypeDescription
};

// Re-export worker types
export type {
  WorkerMessage,
  WorkerMessageType,
  WorkerCalculationMessage,
  WorkerProgressMessage,
  WorkerResultMessage,
  WorkerErrorMessage
};