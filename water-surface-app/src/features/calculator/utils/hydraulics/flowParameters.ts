import { ChannelParams } from '../../stores/calculatorSlice';
import { calculateArea, calculateTopWidth, calculateHydraulicRadius } from './channelGeometry';

// Gravitational acceleration constant
const G = 9.81; // m/s² in metric
const G_IMPERIAL = 32.2; // ft/s² in imperial

/**
 * Calculates the velocity for a given discharge and flow area
 * @param discharge Flow discharge
 * @param area Flow area
 * @returns Flow velocity
 */
export function calculateVelocity(discharge: number, area: number): number {
  // Avoid division by zero
  if (area === 0) return 0;
  
  return discharge / area;
}

/**
 * Calculates the Froude number for given flow conditions
 * @param velocity Flow velocity
 * @param depth Water depth
 * @param params Channel parameters
 * @returns Froude number
 */
export function calculateFroudeNumber(
  velocity: number, 
  depth: number, 
  params: ChannelParams
): number {
  // Get gravitational acceleration based on unit system
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  
  // Calculate hydraulic depth (A/T)
  const area = calculateArea(depth, params);
  const topWidth = calculateTopWidth(depth, params);
  
  // Avoid division by zero
  if (topWidth === 0) return 0;
  
  const hydraulicDepth = area / topWidth;
  
  // Calculate Froude number: Fr = V / sqrt(g * D_h)
  return velocity / Math.sqrt(g * hydraulicDepth);
}

/**
 * Calculates the specific energy for given flow conditions
 * @param depth Water depth
 * @param velocity Flow velocity
 * @param params Channel parameters
 * @returns Specific energy
 */
export function calculateSpecificEnergy(
  depth: number, 
  velocity: number, 
  params: ChannelParams
): number {
  // Get gravitational acceleration based on unit system
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  
  // Calculate specific energy: E = y + V²/(2g)
  return depth + (Math.pow(velocity, 2) / (2 * g));
}

/**
 * Calculates the friction slope using Manning's equation
 * @param velocity Flow velocity
 * @param hydraulicRadius Hydraulic radius
 * @param manningN Manning's roughness coefficient
 * @param units Unit system ('metric' or 'imperial')
 * @returns Friction slope
 */
export function calculateFrictionSlope(
  velocity: number, 
  hydraulicRadius: number, 
  manningN: number,
  units: 'metric' | 'imperial' = 'metric'
): number {
  // Manning's equation coefficient based on unit system
  const k = units === 'imperial' ? 1.49 : 1.0;
  
  // Avoid division by zero or negative hydraulic radius
  if (hydraulicRadius <= 0) return 0;
  
  // Calculate friction slope using Manning's equation: S_f = (n*V)²/(k²*R^(4/3))
  return Math.pow((manningN * velocity) / (k * Math.pow(hydraulicRadius, 2/3)), 2);
}

/**
 * Calculates the friction slope for given flow conditions
 * @param depth Water depth
 * @param discharge Flow discharge
 * @param params Channel parameters
 * @returns Friction slope
 */
export function calculateChannelFrictionSlope(
  depth: number, 
  discharge: number, 
  params: ChannelParams
): number {
  // Calculate area
  const area = calculateArea(depth, params);
  
  // Calculate velocity
  const velocity = calculateVelocity(discharge, area);
  
  // Calculate hydraulic radius
  const hydraulicRadius = calculateHydraulicRadius(depth, params);
  
  // Calculate friction slope
  return calculateFrictionSlope(velocity, hydraulicRadius, params.manningN, params.units);
}

/**
 * Calculates the shear stress at the channel boundary
 * @param depth Water depth
 * @param frictionSlope Friction slope
 * @param params Channel parameters
 * @returns Shear stress
 */
export function calculateShearStress(
  depth: number, 
  frictionSlope: number, 
  params: ChannelParams
): number {
  // Specific weight of water (γ)
  const specificWeight = params.units === 'imperial' ? 62.4 : 9810; // lb/ft³ or N/m³
  
  // Calculate hydraulic radius
  const hydraulicRadius = calculateHydraulicRadius(depth, params);
  
  // Calculate shear stress: τ = γ * R * S_f
  return specificWeight * hydraulicRadius * frictionSlope;
}

/**
 * Determines the flow regime based on Froude number
 * @param froudeNumber Froude number
 * @returns Flow regime description
 */
export function determineFlowRegime(froudeNumber: number): 'subcritical' | 'critical' | 'supercritical' {
  if (froudeNumber < 0.95) {
    return 'subcritical';
  } else if (froudeNumber > 1.05) {
    return 'supercritical';
  } else {
    return 'critical';
  }
}

/**
 * Calculates the specific force for a given depth and discharge
 * @param depth Water depth
 * @param discharge Flow discharge
 * @param params Channel parameters
 * @returns Specific force
 */
export function calculateSpecificForce(
  depth: number, 
  discharge: number, 
  params: ChannelParams
): number {
  // Get gravitational acceleration based on unit system
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  
  // Calculate area
  const area = calculateArea(depth, params);
  
  // Calculate first moment of area
  let firstMoment = 0;
  
  switch (params.channelType) {
    case 'rectangular':
      // For rectangular: A * y/2
      firstMoment = area * depth / 2;
      break;
      
    case 'trapezoidal':
      // For trapezoidal: more complex calculation needed
      if (!params.sideSlope) 
        throw new Error("Side slope required for trapezoidal channel");
      
      const bottomWidth = params.bottomWidth;
      const topWidth = bottomWidth + 2 * params.sideSlope * depth;
      
      // First moment for a trapezoid: A * y_c
      // Where y_c is the centroid height from the water surface
      const centroidHeight = depth / 3 * (2 * bottomWidth + topWidth) / (bottomWidth + topWidth);
      firstMoment = area * centroidHeight;
      break;
      
    case 'triangular':
      // For triangular: A * y/3
      firstMoment = area * depth / 3;
      break;
      
    case 'circular':
      // For circular: complex calculation
      if (!params.diameter) 
        throw new Error("Diameter required for circular channel");
      
      // This is an approximation for partially filled circular channels
      const ratio = depth / params.diameter;
      
      // Simplified approximation for the centroid location
      let centroidFactor = 0.5;
      if (ratio <= 0.5) {
        centroidFactor = 0.4 * ratio;
      } else if (ratio < 1.0) {
        centroidFactor = 0.2 + 0.3 * ratio;
      }
      
      firstMoment = area * depth * centroidFactor;
      break;
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
  
  // Calculate velocity
  const velocity = calculateVelocity(discharge, area);
  
  // Calculate momentum flux: Q²/(g*A)
  const momentumFlux = Math.pow(discharge, 2) / (g * area);
  
  // Calculate specific force: F = firstMoment + momentumFlux
  return firstMoment + momentumFlux;
}