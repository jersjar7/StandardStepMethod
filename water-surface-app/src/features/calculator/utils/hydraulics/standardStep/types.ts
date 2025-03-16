import { ChannelParams } from '../../../stores/calculatorSlice';
import { HydraulicJumpResult } from '../hydraulicJump';

/**
 * Interface for flow depth points in the profile
 */
export interface FlowDepthPoint {
  x: number;                // Station (distance along channel)
  y: number;                // Depth
  velocity: number;         // Flow velocity
  froudeNumber: number;     // Froude number
  specificEnergy: number;   // Specific energy
  criticalDepth: number;    // Critical depth
  normalDepth: number;      // Normal depth
}

/**
 * Interface for water surface profile calculation results
 */
export interface WaterSurfaceProfileResults {
  flowProfile: FlowDepthPoint[];    // Array of flow depth points
  profileType: string;              // Profile classification (M1, M2, S1, etc.)
  channelType: string;              // Channel slope classification (mild, steep, critical)
  criticalDepth: number;            // Critical depth for the channel and discharge
  normalDepth: number;              // Normal depth for the channel and discharge
  isChoking: boolean;               // Indicates if choking occurred
  hydraulicJump?: HydraulicJumpResult; // Hydraulic jump details, if any
}

/**
 * Interface for step calculation parameters
 */
export interface StepCalculationParams {
  currentX: number;         // Current station
  currentY: number;         // Current depth
  nextX: number;            // Next station
  direction: 'upstream' | 'downstream'; // Calculation direction
  params: ChannelParams;    // Channel parameters
}

/**
 * Interface for profile calculation parameters
 */
export interface ProfileCalculationParams {
  initialDepth: number;
  direction: 'upstream' | 'downstream';
  startPosition: number;
  criticalDepth: number;
  normalDepth: number;
  numSteps: number;
  channelSlope: 'mild' | 'critical' | 'steep';
  params: ChannelParams;
}

/**
 * Enum for profile types
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
  UNKNOWN = 'Unknown'
}

/**
 * Enum for flow regimes
 */
export enum FlowRegime {
  SUBCRITICAL = 'subcritical',
  CRITICAL = 'critical',
  SUPERCRITICAL = 'supercritical'
}

/**
 * Interface for calculation result at a single point
 */
export interface CalculationPoint {
  depth: number;
  velocity: number;
  froudeNumber: number;
  specificEnergy: number;
  area: number;
  hydraulicRadius: number;
  frictionSlope: number;
}