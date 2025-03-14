import { ChannelParams } from '../stores/calculatorSlice';

// Gravitational acceleration
const G = 9.81; // m/s² in metric
const G_IMPERIAL = 32.2; // ft/s² in imperial

/**
 * Interface for flow depth points in the profile
 */
export interface FlowDepthPoint {
  x: number;
  y: number;
  velocity: number;
  froudeNumber: number;
  specificEnergy: number;
  criticalDepth: number;
  normalDepth: number;
}

/**
 * Interface for hydraulic jump details
 */
export interface HydraulicJumpDetails {
  position: number;
  depth1: number;
  depth2: number;
  energyLoss: number;
}

/**
 * Interface for calculation results
 */
export interface WaterSurfaceResults {
  flowProfile: FlowDepthPoint[];
  profileType: string;
  channelType: string;
  criticalDepth: number;
  normalDepth: number;
  isChoking: boolean;
  hydraulicJump?: HydraulicJumpDetails;
}

/**
 * Calculates the critical depth for a given channel and discharge
 */
export function calculateCriticalDepth(params: ChannelParams): number {
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  
  switch(params.channelType) {
    case 'rectangular':
      // yc = (q²/g)^(1/3) where q = Q/b
      return Math.pow((params.discharge / params.bottomWidth) ** 2 / g, 1/3);
      
    case 'trapezoidal':
      if (!params.sideSlope) 
        throw new Error("Side slope required for trapezoidal channel");
      
      // For trapezoidal channels, we need to use an iterative method
      // Start with an initial guess based on rectangular approximation
      let yc = Math.pow((params.discharge / params.bottomWidth) ** 2 / g, 1/3);
      let error = 1;
      let maxIterations = 50;
      let iterations = 0;
      
      while (error > 0.0001 && iterations < maxIterations) {
        // A = (b + m*y)y
        const area = (params.bottomWidth + params.sideSlope * yc) * yc;
        // T = b + 2*m*y
        const topWidth = params.bottomWidth + 2 * params.sideSlope * yc;
        
        // Froude number equation: Fr = Q / (A * sqrt(g * A/T))
        const fr = params.discharge / (area * Math.sqrt(g * (area / topWidth)));
        
        // Error is difference from Fr = 1
        error = Math.abs(fr - 1);
        
        // Adjust depth based on Froude number
        if (fr > 1) {
          yc += 0.01;
        } else {
          yc -= 0.01;
        }
        
        iterations++;
      }
      
      return yc;
      
    case 'triangular':
      if (!params.sideSlope) throw new Error("Side slope required for triangular channel");
      // yc = (2*Q²/(g*m²))^(1/5)
      return Math.pow(2 * params.discharge ** 2 / (g * params.sideSlope ** 2), 1/5);
      
    case 'circular':
      if (!params.diameter) throw new Error("Diameter required for circular channel");
      
      // For circular channels, we need to iterate to find critical depth
      // Start with initial guess at 0.5 * diameter
      let y = 0.5 * params.diameter;
      error = 1;
      maxIterations = 50;
      iterations = 0;
      
      while (error > 0.0001 && iterations < maxIterations) {
        // Calculate area and top width for a circular section
        const theta = 2 * Math.acos(1 - 2 * y / params.diameter);
        const area = (params.diameter ** 2 / 8) * (theta - Math.sin(theta));
        const topWidth = params.diameter * Math.sin(theta / 2);
        
        // Froude number equation
        const fr = params.discharge / (area * Math.sqrt(g * (area / topWidth)));
        
        // Error is difference from Fr = 1
        error = Math.abs(fr - 1);
        
        // Adjust depth based on Froude number
        if (fr > 1) {
          y += 0.01;
        } else {
          y -= 0.01;
        }
        
        iterations++;
      }
      
      return y;
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
}

/**
 * Calculates the normal depth for a given channel, discharge, slope, and roughness
 */
export function calculateNormalDepth(params: ChannelParams): number {
  const kn = params.units === 'imperial' ? 1.49 : 1.0; // Manning's constant
  
  // Using Manning's equation: Q = (kn/n) * A * R^(2/3) * S^(1/2)
  // We need to iterate to find the depth that satisfies this equation
  
  // Start with an initial guess at critical depth
  let yn = calculateCriticalDepth(params);
  let error = 1;
  let maxIterations = 50;
  let iterations = 0;
  
  while (error > 0.0001 && iterations < maxIterations) {
    // Calculate area, wetted perimeter, and hydraulic radius
    let area: number;
    let wettedPerimeter: number;
    
    switch(params.channelType) {
      case 'rectangular':
        area = params.bottomWidth * yn;
        wettedPerimeter = params.bottomWidth + 2 * yn;
        break;
        
      case 'trapezoidal':
        if (!params.sideSlope) 
          throw new Error("Side slope required for trapezoidal channel");
        area = (params.bottomWidth + params.sideSlope * yn) * yn;
        wettedPerimeter = params.bottomWidth + 2 * yn * Math.sqrt(1 + params.sideSlope ** 2);
        break;
        
      case 'triangular':
        if (!params.sideSlope) throw new Error("Side slope required for triangular channel");
        area = params.sideSlope * yn ** 2;
        wettedPerimeter = 2 * yn * Math.sqrt(1 + params.sideSlope ** 2);
        break;
        
      case 'circular':
        if (!params.diameter) throw new Error("Diameter required for circular channel");
        const theta = 2 * Math.acos(1 - 2 * yn / params.diameter);
        area = (params.diameter ** 2 / 8) * (theta - Math.sin(theta));
        wettedPerimeter = (params.diameter * theta) / 2;
        break;
        
      default:
        throw new Error(`Unsupported channel type: ${params.channelType}`);
    }
    
    const hydraulicRadius = area / wettedPerimeter;
    
    // Calculate discharge using Manning's equation
    const calculatedQ = (kn / params.manningN) * area * Math.pow(hydraulicRadius, 2/3) * Math.pow(params.channelSlope, 1/2);
    
    // Error is difference from actual discharge
    error = Math.abs(calculatedQ - params.discharge) / params.discharge;
    
    // Adjust depth based on calculated discharge
    if (calculatedQ < params.discharge) {
      yn += 0.01;
    } else {
      yn -= 0.01;
    }
    
    iterations++;
  }
  
  return yn;
}

/**
 * Calculates Froude number for a given flow condition
 */
export function calculateFroudeNumber(
  depth: number, 
  velocity: number, 
  params: ChannelParams
): number {
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  let topWidth: number;
  let area: number;
  
  switch(params.channelType) {
    case 'rectangular':
      topWidth = params.bottomWidth;
      area = params.bottomWidth * depth;
      break;
      
    case 'trapezoidal':
      if (!params.sideSlope) 
        throw new Error("Side slope required for trapezoidal channel");
      topWidth = params.bottomWidth + 2 * params.sideSlope * depth;
      area = (params.bottomWidth + params.sideSlope * depth) * depth;
      break;
      
    case 'triangular':
      if (!params.sideSlope) throw new Error("Side slope required for triangular channel");
      topWidth = 2 * params.sideSlope * depth;
      area = params.sideSlope * depth ** 2;
      break;
      
    case 'circular':
      if (!params.diameter) throw new Error("Diameter required for circular channel");
      const theta = 2 * Math.acos(1 - 2 * depth / params.diameter);
      topWidth = params.diameter * Math.sin(theta / 2);
      area = (params.diameter ** 2 / 8) * (theta - Math.sin(theta));
      break;
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
  
  // Froude number = V / sqrt(g * hydraulicDepth)
  // where hydraulicDepth = A / T
  const hydraulicDepth = area / topWidth;
  return velocity / Math.sqrt(g * hydraulicDepth);
}

/**
 * Calculates the friction slope using Manning's equation
 */
export function calculateFrictionSlope(
  depth: number, 
  velocity: number, 
  params: ChannelParams
): number {
  const kn = params.units === 'imperial' ? 1.49 : 1.0; // Manning's constant
  let area: number;
  let wettedPerimeter: number;
  
  switch(params.channelType) {
    case 'rectangular':
      area = params.bottomWidth * depth;
      wettedPerimeter = params.bottomWidth + 2 * depth;
      break;
      
    case 'trapezoidal':
      if (!params.sideSlope) 
        throw new Error("Side slope required for trapezoidal channel");
      area = (params.bottomWidth + params.sideSlope * depth) * depth;
      wettedPerimeter = params.bottomWidth + 2 * depth * Math.sqrt(1 + params.sideSlope ** 2);
      break;
      
    case 'triangular':
      if (!params.sideSlope) throw new Error("Side slope required for triangular channel");
      area = params.sideSlope * depth ** 2;
      wettedPerimeter = 2 * depth * Math.sqrt(1 + params.sideSlope ** 2);
      break;
      
    case 'circular':
      if (!params.diameter) throw new Error("Diameter required for circular channel");
      const theta = 2 * Math.acos(1 - 2 * depth / params.diameter);
      area = (params.diameter ** 2 / 8) * (theta - Math.sin(theta));
      wettedPerimeter = (params.diameter * theta) / 2;
      break;
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
  
  const hydraulicRadius = area / wettedPerimeter;
  
  // Manning's equation rearranged to solve for the slope
  // S = (Q*n / (kn*A*R^(2/3)))^2
  return Math.pow((velocity * area) * params.manningN / (kn * area * Math.pow(hydraulicRadius, 2/3)), 2);
}

/**
 * Determines channel classification based on normal and critical depths
 */
export function classifyChannel(normalDepth: number, criticalDepth: number): string {
  if (normalDepth > criticalDepth) {
    return "mild";
  } else if (normalDepth < criticalDepth) {
    return "steep";
  } else {
    return "critical";
  }
}

/**
 * Determines the profile type (M1, S2, etc.)
 */
export function determineProfileType(
  channelType: string,
  flowDepth: number,
  normalDepth: number,
  criticalDepth: number
): string {
  if (channelType === "mild") {
    if (flowDepth > normalDepth) return "M1";
    if (flowDepth < normalDepth && flowDepth > criticalDepth) return "M2";
    if (flowDepth < criticalDepth) return "M3";
  } else if (channelType === "steep") {
    if (flowDepth > criticalDepth) return "S1";
    if (flowDepth < criticalDepth && flowDepth > normalDepth) return "S2";
    if (flowDepth < normalDepth) return "S3";
  } else if (channelType === "critical") {
    if (flowDepth > criticalDepth) return "C1";
    if (flowDepth < criticalDepth) return "C3";
  }
  
  return "Unknown";
}

/**
 * Calculates the specific energy for a given depth and velocity
 */
export function calculateSpecificEnergy(
  depth: number, 
  velocity: number, 
  params: ChannelParams
): number {
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  return depth + (velocity ** 2) / (2 * g);
}

/**
 * Calculates sequential depths for hydraulic jump
 */
export function calculateSequentialDepths(
  depth1: number,
  froudeNumber: number,
  params: ChannelParams
): number {
  if (params.channelType !== 'rectangular') {
    throw new Error("Sequential depths calculation is implemented only for rectangular channels");
  }
  
  // y2 = (y1/2) * (sqrt(1 + 8*Fr^2) - 1)
  return (depth1 / 2) * (Math.sqrt(1 + 8 * froudeNumber ** 2) - 1);
}

/**
 * Calculates the water surface profile using the standard step method
 */
export function calculateWaterSurfaceProfile(params: ChannelParams): WaterSurfaceResults {
  // Calculate critical and normal depths
  const criticalDepth = calculateCriticalDepth(params);
  const normalDepth = calculateNormalDepth(params);
  
  // Classify the channel
  const channelType = classifyChannel(normalDepth, criticalDepth);
  
  // Set up initial conditions based on channel type
  let initialDepth: number;
  let direction: 'upstream' | 'downstream';
  
  if (channelType === "mild") {
    // For mild channels, start from downstream with critical depth
    initialDepth = params.downstreamDepth || criticalDepth;
    direction = 'upstream';
  } else {
    // For steep channels, start from upstream with normal depth
    initialDepth = params.upstreamDepth || normalDepth;
    direction = 'downstream';
  }
  
  // Step size
  const dx = params.length / 100;
  
  // Initialize the flow profile array
  const flowProfile: FlowDepthPoint[] = [];
  
  // Variables to track hydraulic jump
  let hydraulicJump: HydraulicJumpDetails | undefined;
  let isChoking = false;
  
  // Initial depth and position
  let currentDepth = initialDepth;
  let currentPosition = direction === 'upstream' ? params.length : 0;
  
  // Calculate the initial flow properties
  let area = calculateArea(currentDepth, params);
  let velocity = params.discharge / area;
  let froudeNumber = calculateFroudeNumber(currentDepth, velocity, params);
  let specificEnergy = calculateSpecificEnergy(currentDepth, velocity, params);
  
  // Add the initial point
  flowProfile.push({
    x: currentPosition,
    y: currentDepth,
    velocity,
    froudeNumber,
    specificEnergy,
    criticalDepth,
    normalDepth
  });
  
  // Perform the step method calculations
  for (let i = 0; i < 100; i++) {
    // Update position based on direction
    currentPosition = direction === 'upstream' ? currentPosition - dx : currentPosition + dx;
    
    // Skip if we've reached the end of the channel
    if (currentPosition < 0 || currentPosition > params.length) break;
    
    // For standard step method, we need to solve for the depth that satisfies the energy equation
    // This requires an iterative solution
    
    // First, estimate the new depth
    let estimatedDepth = currentDepth;
    let frictionSlope = calculateFrictionSlope(currentDepth, velocity, params);
    
    if (direction === 'upstream') {
      // For mild channels going upstream
      if (froudeNumber < 1) {
        // Subcritical flow - depth increases going upstream from control
        estimatedDepth += 0.01;
      } else {
        // Supercritical flow - depth decreases going upstream from control
        estimatedDepth -= 0.01;
      }
    } else {
      // For steep channels going downstream
      if (froudeNumber > 1) {
        // Supercritical flow - depth decreases going downstream
        estimatedDepth -= 0.01;
      } else {
        // Subcritical flow - depth increases going downstream
        estimatedDepth += 0.01;
      }
    }
    
    // Iterate to find the correct depth
    let error = 1;
    let maxIterations = 50;
    let iterations = 0;
    
    while (error > 0.001 && iterations < maxIterations) {
      // Calculate properties at the estimated depth
      const newArea = calculateArea(estimatedDepth, params);
      const newVelocity = params.discharge / newArea;
      const newFrictionSlope = calculateFrictionSlope(estimatedDepth, newVelocity, params);
      const avgFrictionSlope = (frictionSlope + newFrictionSlope) / 2;
      
      // Calculate head loss
      const headLoss = avgFrictionSlope * dx;
      
      // Calculate specific energy at the new section
      const newSpecificEnergy = calculateSpecificEnergy(estimatedDepth, newVelocity, params);
      
      // Calculate energy change needed
      const energyChange = direction === 'upstream' ? headLoss : -headLoss;
      
      // Calculate expected specific energy
      const expectedSpecificEnergy = specificEnergy + energyChange;
      
      // Calculate error
      error = Math.abs(newSpecificEnergy - expectedSpecificEnergy);
      
      // Adjust depth based on error
      if (newSpecificEnergy > expectedSpecificEnergy) {
        estimatedDepth -= 0.001;
      } else {
        estimatedDepth += 0.001;
      }
      
      iterations++;
    }
    
    // Check for hydraulic jump when flow transitions from supercritical to subcritical
    if (froudeNumber > 1 && calculateFroudeNumber(estimatedDepth, params.discharge / calculateArea(estimatedDepth, params), params) < 1) {
      // Calculate sequential depth for hydraulic jump
      const sequentialDepth = calculateSequentialDepths(currentDepth, froudeNumber, params);
      
      // Record the hydraulic jump
      hydraulicJump = {
        position: currentPosition,
        depth1: currentDepth,
        depth2: sequentialDepth,
        energyLoss: (sequentialDepth - currentDepth) ** 3 / (4 * currentDepth * sequentialDepth)
      };
      
      // Set the new depth after the jump
      estimatedDepth = sequentialDepth;
    }
    
    // Check for choking condition
    if (specificEnergy < calculateSpecificEnergy(criticalDepth, params.discharge / calculateArea(criticalDepth, params), params)) {
      isChoking = true;
    }
    
    // Update current depth and calculate new properties
    currentDepth = estimatedDepth;
    area = calculateArea(currentDepth, params);
    velocity = params.discharge / area;
    froudeNumber = calculateFroudeNumber(currentDepth, velocity, params);
    specificEnergy = calculateSpecificEnergy(currentDepth, velocity, params);
    
    // Add point to profile
    flowProfile.push({
      x: currentPosition,
      y: currentDepth,
      velocity,
      froudeNumber,
      specificEnergy,
      criticalDepth,
      normalDepth
    });
  }
  
  // Sort the profile by x position
  flowProfile.sort((a, b) => a.x - b.x);
  
  // Determine the profile type based on starting conditions
  const profileType = determineProfileType(
    channelType, 
    flowProfile[0].y, 
    normalDepth, 
    criticalDepth
  );
  
  return {
    flowProfile,
    profileType,
    channelType,
    criticalDepth,
    normalDepth,
    isChoking,
    hydraulicJump
  };
}

/**
 * Helper function to calculate cross-sectional area
 */
function calculateArea(depth: number, params: ChannelParams): number {
  switch(params.channelType) {
    case 'rectangular':
      return params.bottomWidth * depth;
      
    case 'trapezoidal':
      if (!params.sideSlope) 
        throw new Error("Side slope required for trapezoidal channel");
      return (params.bottomWidth + params.sideSlope * depth) * depth;
      
    case 'triangular':
      if (!params.sideSlope) throw new Error("Side slope required for triangular channel");
      return params.sideSlope * depth ** 2;
      
    case 'circular':
      if (!params.diameter) throw new Error("Diameter required for circular channel");
      const theta = 2 * Math.acos(1 - 2 * depth / params.diameter);
      return (params.diameter ** 2 / 8) * (theta - Math.sin(theta));
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
}