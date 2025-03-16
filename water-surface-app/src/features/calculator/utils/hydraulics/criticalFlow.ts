import { ChannelParams } from '../../stores/calculatorSlice';
import { calculateArea, calculateTopWidth } from './channelGeometry';
import { calculateVelocity, calculateFroudeNumber } from './flowParameters';

// Gravitational acceleration constant
const G = 9.81; // m/s² in metric
const G_IMPERIAL = 32.2; // ft/s² in imperial

/**
 * Calculates the critical depth for a given channel and discharge
 * The critical depth is the depth at which specific energy is minimum
 * for a given discharge, or where Froude number equals 1
 * 
 * @param params Channel parameters including discharge and geometry
 * @returns Critical depth
 */
export function calculateCriticalDepth(params: ChannelParams): number {
  // Get gravitational acceleration based on unit system
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  
  switch (params.channelType) {
    case 'rectangular':
      // For rectangular channels: yc = (q²/g)^(1/3)
      // where q = Q/b (discharge per unit width)
      const q = params.discharge / params.bottomWidth;
      return Math.pow((q * q) / g, 1/3);
      
    case 'trapezoidal':
      // For trapezoidal channels, iterative solution is needed
      return findCriticalDepthIteratively(params);
      
    case 'triangular':
      // For triangular channels: yc = (2*Q²/(g*m²))^(1/5)
      // where m is the side slope
      if (!params.sideSlope) 
        throw new Error("Side slope required for triangular channel");
      
      return Math.pow(2 * params.discharge * params.discharge / (g * Math.pow(params.sideSlope, 2)), 1/5);
      
    case 'circular':
      // For circular channels, iterative solution is needed
      return findCriticalDepthIteratively(params);
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
}

/**
 * Iteratively finds the critical depth using the bisection method
 * @param params Channel parameters
 * @returns Critical depth
 */
function findCriticalDepthIteratively(params: ChannelParams): number {
  // Get gravitational acceleration based on unit system
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  
  // Initial search range
  let yMin = 0.001; // Small positive value to avoid division by zero
  let yMax: number;
  
  // Set yMax based on channel type
  switch (params.channelType) {
    case 'rectangular':
    case 'trapezoidal':
    case 'triangular':
      // Use a reasonable upper limit
      yMax = Math.pow(params.discharge, 0.4) * 2; // Empirical formula
      break;
      
    case 'circular':
      if (!params.diameter) 
        throw new Error("Diameter required for circular channel");
      
      // For circular channels, max depth is the diameter
      yMax = params.diameter;
      break;
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
  
  // Tolerance for convergence
  const tolerance = 0.0001;
  let maxIterations = 50;
  let iterations = 0;
  
  // Function to evaluate: F(y) = Q²*T/(g*A³) - 1
  // At critical depth, F(y) = 0
  const evaluateFunction = (y: number): number => {
    const area = calculateArea(y, params);
    const topWidth = calculateTopWidth(y, params);
    
    // Avoid division by zero
    if (area === 0 || topWidth === 0) return Number.MAX_VALUE;
    
    return (params.discharge * params.discharge * topWidth) / (g * Math.pow(area, 3)) - 1;
  };
  
  // Bisection method
  while ((yMax - yMin) > tolerance && iterations < maxIterations) {
    const yMid = (yMin + yMax) / 2;
    const fMid = evaluateFunction(yMid);
    
    if (Math.abs(fMid) < tolerance) {
      // Found solution
      return yMid;
    }
    
    const fMin = evaluateFunction(yMin);
    
    if (fMin * fMid < 0) {
      // Root is in the left half
      yMax = yMid;
    } else {
      // Root is in the right half
      yMin = yMid;
    }
    
    iterations++;
  }
  
  // Return the midpoint of the final interval
  return (yMin + yMax) / 2;
}

/**
 * Calculates the critical velocity
 * @param params Channel parameters
 * @returns Critical velocity
 */
export function calculateCriticalVelocity(params: ChannelParams): number {
  // Calculate critical depth
  const criticalDepth = calculateCriticalDepth(params);
  
  // Calculate area at critical depth
  const criticalArea = calculateArea(criticalDepth, params);
  
  // Calculate critical velocity
  return calculateVelocity(params.discharge, criticalArea);
}

/**
 * Calculates the critical energy
 * @param params Channel parameters
 * @returns Critical energy
 */
export function calculateCriticalEnergy(params: ChannelParams): number {
  // Get gravitational acceleration based on unit system
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  
  // Calculate critical depth
  const criticalDepth = calculateCriticalDepth(params);
  
  // For critical flow, specific energy = 1.5 * critical depth
  return 1.5 * criticalDepth;
}

/**
 * Checks if flow is critical at a given depth
 * @param depth Water depth
 * @param discharge Flow discharge
 * @param params Channel parameters
 * @returns True if flow is critical, false otherwise
 */
export function isFlowCritical(depth: number, discharge: number, params: ChannelParams): boolean {
  // Calculate area
  const area = calculateArea(depth, params);
  
  // Calculate velocity
  const velocity = calculateVelocity(discharge, area);
  
  // Calculate Froude number
  const froudeNumber = calculateFroudeNumber(velocity, depth, params);
  
  // Flow is critical if Froude number is approximately 1
  return Math.abs(froudeNumber - 1.0) < 0.05;
}