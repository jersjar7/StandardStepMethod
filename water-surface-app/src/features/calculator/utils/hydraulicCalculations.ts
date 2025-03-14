import { ChannelParameters, CalculationResult } from '../stores/calculatorSlice';

/**
 * Calculate hydraulic properties for a trapezoidal channel section
 */
export function calculateTrapezoidalSection(depth: number, params: ChannelParameters): {
  area: number;
  wetPerimeter: number;
  topWidth: number;
  hydraulicRadius: number;
} {
  // Extract properties with defaults to handle optional values
  const { bottomWidth = 0, sideSlope = 0 } = params;
  
  // Area calculation
  const area = (bottomWidth + sideSlope * depth) * depth;
  
  // Wetted perimeter
  const wetPerimeter = bottomWidth + 2 * depth * Math.sqrt(1 + sideSlope * sideSlope);
  
  // Top width
  const topWidth = bottomWidth + 2 * sideSlope * depth;
  
  // Hydraulic radius
  const hydraulicRadius = area / wetPerimeter;
  
  return {
    area,
    wetPerimeter,
    topWidth,
    hydraulicRadius
  };
}

/**
 * Calculate the critical depth for a trapezoidal channel
 */
export function calculateCriticalDepth(params: ChannelParameters): number {
  const { bottomWidth = 0, sideSlope = 0, discharge } = params;
  const g = 9.81; // gravitational acceleration in m/s²
  
  // For trapezoidal channels, we need to use iterative method
  let yc = 0.1; // Initial guess
  let error = 1;
  let maxIterations = 100;
  let iteration = 0;
  
  while (error > 0.0001 && iteration < maxIterations) {
    // Calculate left side of equation (b + 2*m*y)*q²/(g*(b + m*y)³*y³)
    const topWidth = bottomWidth + 2 * sideSlope * yc;
    const area = (bottomWidth + sideSlope * yc) * yc;
    
    const leftSide = (topWidth * discharge * discharge) / (g * Math.pow(area, 3));
    
    error = Math.abs(leftSide - 1);
    
    // Adjust yc based on error
    if (leftSide > 1) {
      yc += error * 0.1; // Increase depth if left side is too large
    } else {
      yc -= error * 0.1; // Decrease depth if left side is too small
    }
    
    iteration++;
  }
  
  return yc;
}

/**
 * Calculate the normal depth for a trapezoidal channel using Manning's equation
 */
export function calculateNormalDepth(params: ChannelParameters): number {
  const { manningN, channelSlope, discharge } = params;
  
  // For trapezoidal channels, we need to use iterative method
  let yn = 0.1; // Initial guess
  let error = 1;
  let maxIterations = 100;
  let iteration = 0;
  
  while (error > 0.0001 && iteration < maxIterations) {
    const section = calculateTrapezoidalSection(yn, params);
    
    // Manning's equation: Q = (1/n) * A * R^(2/3) * S^(1/2)
    const manningDischarge = (1 / manningN) * section.area * 
      Math.pow(section.hydraulicRadius, 2/3) * Math.pow(channelSlope, 1/2);
    
    error = Math.abs(manningDischarge - discharge) / discharge;
    
    // Adjust yn based on error
    if (manningDischarge < discharge) {
      yn += error * 0.1; // Increase depth if calculated discharge is too small
    } else {
      yn -= error * 0.1; // Decrease depth if calculated discharge is too large
    }
    
    iteration++;
  }
  
  return yn;
}

/**
 * Calculate the water surface profile using the standard step method
 */
export function calculateWaterSurfaceProfile(params: ChannelParameters): CalculationResult[] {
  const results: CalculationResult[] = [];
  const { length, discharge } = params;
  
  // Calculate critical and normal depths
  const criticalDepth = calculateCriticalDepth(params);
  const normalDepth = calculateNormalDepth(params);
  
  // Determine channel type (mild, steep, critical)
  const flowRegime = normalDepth > criticalDepth ? 'mild' : 
                     normalDepth < criticalDepth ? 'steep' : 'critical';
  
  // Determine step direction and initial depth based on channel type
  let stepDirection = 1; // 1 for upstream, -1 for downstream
  let initialDepth = 0;
  let deltaX = 50; // Step size in m or ft
  
  if (flowRegime === 'mild') {
    // For mild channels, we typically start from downstream
    stepDirection = 1;
    initialDepth = params.downstreamDepth || criticalDepth;
  } else {
    // For steep channels, we typically start from upstream
    stepDirection = -1;
    initialDepth = params.upstreamDepth || normalDepth;
  }
  
  let currentDepth = initialDepth;
  let currentStation = stepDirection > 0 ? 0 : length;
  
  // Standard step method implementation
  while (currentStation >= 0 && currentStation <= length) {
    // Calculate section properties
    const section = calculateTrapezoidalSection(currentDepth, params);
    
    // Calculate velocity
    const velocity = discharge / section.area;
    
    // Calculate Froude number
    const froudeNumber = velocity / Math.sqrt(9.81 * section.area / section.topWidth);
    
    // Calculate specific energy
    const energy = currentDepth + (velocity * velocity) / (2 * 9.81);
    
    // Store results
    results.push({
      station: currentStation,
      depth: currentDepth,
      velocity,
      area: section.area,
      topWidth: section.topWidth,
      wetPerimeter: section.wetPerimeter,
      hydraulicRadius: section.hydraulicRadius,
      energy,
      froudeNumber,
      criticalDepth,
      normalDepth
    });
    
    // Compute next depth using energy equation
    if (currentStation !== (stepDirection > 0 ? length : 0)) {
      // Calculate friction slope using Manning's equation
      const frictionSlope = Math.pow(discharge * params.manningN / 
                           (section.area * Math.pow(section.hydraulicRadius, 2/3)), 2);
      
      // Calculate average friction slope
      const avgFrictionSlope = frictionSlope;
      
      // Calculate change in energy grade line
      const energyLoss = avgFrictionSlope * deltaX;
      
      // Calculate next depth iteratively
      let nextDepth = currentDepth;
      let error = 1;
      let iteration = 0;
      
      while (error > 0.0001 && iteration < 50) {
        const nextSection = calculateTrapezoidalSection(nextDepth, params);
        const nextVelocity = discharge / nextSection.area;
        const nextEnergy = nextDepth + (nextVelocity * nextVelocity) / (2 * 9.81);
        
        const energyDiff = nextEnergy - (energy + energyLoss);
        error = Math.abs(energyDiff);
        
        // Adjust next depth
        if (energyDiff > 0) {
          nextDepth -= error * 0.1;
        } else {
          nextDepth += error * 0.1;
        }
        
        iteration++;
      }
      
      currentDepth = nextDepth;
    }
    
    // Move to next station
    currentStation += stepDirection * deltaX;
  }
  
  return results;
}

/**
 * Determine if a hydraulic jump would occur and its location
 */
export function calculateHydraulicJump(results: CalculationResult[]): {
  occurs: boolean;
  station?: number;
  upstreamDepth?: number;
  downstreamDepth?: number;
} {
  // Check if jump is possible (need supercritical flow changing to subcritical)
  let jumpFound = false;
  let jumpStation = 0;
  let upstreamDepth = 0;
  let downstreamDepth = 0;
  
  // Look for transition from supercritical to subcritical
  for (let i = 0; i < results.length - 1; i++) {
    if (results[i].froudeNumber > 1 && results[i + 1].froudeNumber < 1) {
      jumpFound = true;
      jumpStation = (results[i].station + results[i + 1].station) / 2;
      upstreamDepth = results[i].depth;
      
      // Calculate conjugate depth using the momentum equation for rectangular channels
      // Note: For trapezoidal channels, this is an approximation
      downstreamDepth = 0.5 * upstreamDepth * (
        Math.sqrt(1 + 8 * Math.pow(results[i].froudeNumber, 2)) - 1
      );
      
      break;
    }
  }
  
  return {
    occurs: jumpFound,
    station: jumpFound ? jumpStation : undefined,
    upstreamDepth: jumpFound ? upstreamDepth : undefined,
    downstreamDepth: jumpFound ? downstreamDepth : undefined
  };
}

/**
 * Main function to run all calculations
 */
export function runCalculations(params: ChannelParameters): {
  results: CalculationResult[];
  hydraulicJump: {
    occurs: boolean;
    station?: number;
    upstreamDepth?: number;
    downstreamDepth?: number;
  }
} {
  // Calculate water surface profile
  const results = calculateWaterSurfaceProfile(params);
  
  // Check for hydraulic jump
  const hydraulicJump = calculateHydraulicJump(results);
  
  return {
    results,
    hydraulicJump
  };
}