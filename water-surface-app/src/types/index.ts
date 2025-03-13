// Channel section types
export enum ChannelType {
    RECTANGULAR = 'rectangular',
    TRAPEZOIDAL = 'trapezoidal',
    TRIANGULAR = 'triangular',
    CIRCULAR = 'circular'
  }
  
  export interface ChannelParams {
    type: ChannelType;
    bottomWidth?: number; // b - for rectangular and trapezoidal
    sideSlope?: number;   // m - for trapezoidal and triangular
    diameter?: number;    // d0 - for circular
    roughness: number;    // Manning's n value
    slope: number;        // S0 - longitudinal slope
    discharge: number;    // Q - discharge in m³/s or ft³/s
    length: number;       // Channel length
    stepHeight?: number;  // Height of step (if any)
    stepPosition?: number; // Position of step from upstream end
    units: 'metric' | 'imperial';
  }
  
  // Results of calculations
  export interface FlowDepthPoint {
    x: number;            // Distance along channel
    y: number;            // Flow depth
    velocity: number;     // Flow velocity
    froudeNumber: number; // Froude number
    specificEnergy: number; // Specific energy
    criticalDepth: number; // Critical depth
    normalDepth: number;  // Normal depth
  }
  
  export interface CalculationResults {
    flowProfile: FlowDepthPoint[];
    profileType: string;   // e.g., "M1", "S2", etc.
    channelType: string;   // "mild", "steep", "critical", etc.
    criticalDepth: number;
    normalDepth: number;
    isChoking: boolean;
    hydraulicJump?: {
      position: number;
      depth1: number;
      depth2: number;
      energyLoss: number;
    }
  }