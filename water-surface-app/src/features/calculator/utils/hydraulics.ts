import { ChannelParams } from '../stores/calculatorSlice';

// Gravitational acceleration constant
const G = 9.81; // m/s² in metric
const G_IMPERIAL = 32.2; // ft/s² in imperial

/**
 * Interface for flow depth points in the profile
 */
export interface FlowDepthPoint {
  x: number;  // Station (distance along channel)
  y: number;  // Depth
  velocity: number;  // Flow velocity
  froudeNumber: number;  // Froude number
  specificEnergy: number;  // Specific energy
  criticalDepth: number;  // Critical depth
  normalDepth: number;  // Normal depth
}

/**
 * Interface for hydraulic jump details
 */
export interface HydraulicJumpDetails {
  position: number;  // Location of jump
  depth1: number;    // Upstream depth
  depth2: number;    // Downstream depth
  energyLoss: number; // Energy loss at jump
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
 * @param params Channel parameters
 * @returns Critical depth
 */
export function calculateCriticalDepth(params: ChannelParams): number {
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  
  switch (params.channelType) {
    case 'rectangular':
      // For rectangular channels: yc = (q²/g)^(1/3) where q = Q/b
      return Math.pow((params.discharge / params.bottomWidth) ** 2 / g, 1/3);
      
    case 'trapezoidal':
      if (!params.sideSlope) 
        throw new Error("Side slope required for trapezoidal channel");
      
      // For trapezoidal channels, use iterative method
      let yc = Math.pow((params.discharge / params.bottomWidth) ** 2 / g, 1/3); // Initial guess
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
        
        // Adjust depth
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
      // For triangular: yc = (2*Q²/(g*m²))^(1/5)
      return Math.pow(2 * params.discharge ** 2 / (g * params.sideSlope ** 2), 1/5);
      
    case 'circular':
      if (!params.diameter) throw new Error("Diameter required for circular channel");
      
      // For circular channels, use iterative method
      let y = 0.5 * params.diameter; // Initial guess
      error = 1;
      maxIterations = 50;
      iterations = 0;
      
      while (error > 0.0001 && iterations < maxIterations) {
        const theta = 2 * Math.acos(1 - 2 * y / params.diameter);
        const area = (params.diameter ** 2 / 8) * (theta - Math.sin(theta));
        const topWidth = params.diameter * Math.sin(theta / 2);
        
        const fr = params.discharge / (area * Math.sqrt(g * (area / topWidth)));
        
        error = Math.abs(fr - 1);
        
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
 * @param params Channel parameters
 * @returns Normal depth
 */
export function calculateNormalDepth(params: ChannelParams): number {
  const kn = params.units === 'imperial' ? 1.49 : 1.0; // Manning's constant
  
  // Using Manning's equation: Q = (kn/n) * A * R^(2/3) * S^(1/2)
  
  // Initial guess at normal depth
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
    
    // Adjust depth
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
 * @param depth Water depth
 * @param velocity Flow velocity
 * @param params Channel parameters
 * @returns Froude number
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
 * @param depth Water depth
 * @param velocity Flow velocity
 * @param params Channel parameters
 * @returns Friction slope
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
  
  // Manning's equation rearranged for slope
  // S = (Q*n / (kn*A*R^(2/3)))^2
  return Math.pow((velocity * area) * params.manningN / (kn * area * Math.pow(hydraulicRadius, 2/3)), 2);
}

/**
 * Determines channel classification based on normal and critical depths
 * @param normalDepth Normal depth
 * @param criticalDepth Critical depth
 * @returns Channel classification
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
 * @param channelType Channel classification
 * @param flowDepth Current flow depth
 * @param normalDepth Normal depth
 * @param criticalDepth Critical depth
 * @returns Profile type classification
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
  const g = params.units === 'imperial' ? G_IMPERIAL : G;
  return depth + (velocity ** 2) / (2 * g);
}

/**
 * Calculates sequential depths for hydraulic jump
 * @param depth1 Upstream depth
 * @param froudeNumber Froude number
 * @param params Channel parameters
 * @returns Sequent depth
 */
export function calculateSequentialDepths(
  depth1: number,
  froudeNumber: number,
  params: ChannelParams
): number {
  // For rectangular channels, use the standard equation
  if (params.channelType === 'rectangular') {
    return (depth1 / 2) * (Math.sqrt(1 + 8 * froudeNumber ** 2) - 1);
  }
  
  // For non-rectangular channels, use a more general approach
  // This is a simplified approximation
  return depth1 * (Math.sqrt(1 + 8 * froudeNumber ** 2) - 1) / 2;
}

/**
 * Calculates the water surface profile using the standard step method
 * @param params Channel parameters
 * @returns Water surface profile calculation results
 */
export function calculateWaterSurfaceProfile(params: ChannelParams): WaterSurfaceResults {
  // Calculate critical and normal depths
  const criticalDepth = calculateCriticalDepth(params);
  const normalDepth = calculateNormalDepth(params);
  
  // Classify the channel
  const channelType = classifyChannel(normalDepth, criticalDepth);
  
  // Set up initial conditions based on channel type and boundary conditions
  let initialDepth: number;
  let direction: 'upstream' | 'downstream';
  let startPosition: number;
  
  if (params.downstreamDepth !== undefined) {
    // If downstream depth is specified, use it and calculate upstream
    initialDepth = params.downstreamDepth;
    direction = 'upstream';
    startPosition = params.length;
  } else if (params.upstreamDepth !== undefined) {
    // If upstream depth is specified, use it and calculate downstream
    initialDepth = params.upstreamDepth;
    direction = 'downstream';
    startPosition = 0;
  } else {
    // Default behavior based on channel type
    if (channelType === "mild") {
      // For mild channels, start from downstream with critical depth as control
      initialDepth = criticalDepth;
      direction = 'upstream';
      startPosition = params.length;
    } else {
      // For steep channels, start from upstream with normal depth as control
      initialDepth = normalDepth;
      direction = 'downstream';
      startPosition = 0;
    }
  }
  
  // Set step size
  const dx = params.length / 100;
  const numberOfSteps = 100;
  
  // Initialize the flow profile array
  const flowProfile: FlowDepthPoint[] = [];
  
  // Variables to track hydraulic jump
  let hydraulicJump: HydraulicJumpDetails | undefined;
  let isChoking = false;
  
  // Initial depth and position
  let currentDepth = initialDepth;
  let currentPosition = startPosition;
  
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
  
  // Perform the standard step calculations
  for (let i = 0; i < numberOfSteps; i++) {
    // Update position based on direction
    currentPosition = direction === 'upstream' ? currentPosition - dx : currentPosition + dx;
    
    // Check if we've reached the end of the channel
    if (currentPosition < 0 || currentPosition > params.length) break;
    
    // For standard step method, we need to solve for the depth that satisfies the energy equation
    
    // First, estimate the new depth based on the current conditions
    let estimatedDepth = currentDepth;
    let frictionSlope = calculateFrictionSlope(currentDepth, velocity, params);
    
    // Modify estimated depth based on flow conditions
    if (direction === 'upstream') {
      // For mild channels going upstream
      if (froudeNumber < 1) {
        // Subcritical flow - depth typically increases going upstream from control
        estimatedDepth = currentDepth + 0.01;
      } else {
        // Supercritical flow - depth typically decreases going upstream
        estimatedDepth = currentDepth - 0.01;
      }
    } else {
      // For steep channels going downstream
      if (froudeNumber > 1) {
        // Supercritical flow - depth typically decreases going downstream
        estimatedDepth = currentDepth - 0.01;
      } else {
        // Subcritical flow - depth typically increases going downstream
        estimatedDepth = currentDepth + 0.01;
      }
    }
    
    // Iterate to find the correct depth that satisfies energy balance
    let error = 1;
    let maxIterations = 50;
    let iterations = 0;
    
    while (error > 0.001 && iterations < maxIterations) {
      // Calculate properties at the estimated depth
      const newArea = calculateArea(estimatedDepth, params);
      const newVelocity = params.discharge / newArea;
      const newFrictionSlope = calculateFrictionSlope(estimatedDepth, newVelocity, params);
      
      // Average friction slope for the reach
      const avgFrictionSlope = (frictionSlope + newFrictionSlope) / 2;
      
      // Calculate head loss
      const headLoss = avgFrictionSlope * dx;
      
      // Calculate specific energy at the new section
      const newSpecificEnergy = calculateSpecificEnergy(estimatedDepth, newVelocity, params);
      
      // Calculate energy change
      // For upstream calculations, add head loss; for downstream, subtract head loss
      const energyChange = direction === 'upstream' ? headLoss : -headLoss;
      
      // Expected specific energy based on current energy and head loss
      const expectedSpecificEnergy = specificEnergy + energyChange;
      
      // Calculate error between computed and expected specific energy
      error = Math.abs(newSpecificEnergy - expectedSpecificEnergy) / expectedSpecificEnergy;
      
      // Adjust depth based on error
      if (newSpecificEnergy > expectedSpecificEnergy) {
        estimatedDepth -= 0.001;
      } else {
        estimatedDepth += 0.001;
      }
      
      iterations++;
    }
    
    // Prevent negative depths
    if (estimatedDepth <= 0) {
      estimatedDepth = 0.001; // Small positive value
    }
    
    // Check for hydraulic jump
    // A hydraulic jump occurs when flow transitions from supercritical to subcritical
    const newArea = calculateArea(estimatedDepth, params);
    const newVelocity = params.discharge / newArea;
    const newFroudeNumber = calculateFroudeNumber(estimatedDepth, newVelocity, params);
    
    if (froudeNumber > 1 && newFroudeNumber < 1) {
      // Calculate sequential depth for hydraulic jump using momentum equation
      const sequentialDepth = calculateSequentialDepths(currentDepth, froudeNumber, params);
      
      // Record the hydraulic jump
      hydraulicJump = {
        position: currentPosition,
        depth1: currentDepth,
        depth2: sequentialDepth,
        energyLoss: (sequentialDepth - currentDepth) ** 3 / (4 * currentDepth * sequentialDepth)
      };
      
      // Use the sequent depth after the jump
      estimatedDepth = sequentialDepth;
    }
    
    // Update current depth and recalculate properties
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
  
  // Sort the profile points by station (x-coordinate) for consistent display
  flowProfile.sort((a, b) => a.x - b.x);
  
  // Determine the profile type based on the first point's depth
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
 * @param depth Water depth
 * @param params Channel parameters
 * @returns Cross-sectional area
 */
export function calculateArea(depth: number, params: ChannelParams): number {
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

/**
 * Calculate top width of water surface
 * @param depth Water depth
 * @param params Channel parameters
 * @returns Top width
 */
export function calculateTopWidth(depth: number, params: ChannelParams): number {
  switch(params.channelType) {
    case 'rectangular':
      return params.bottomWidth;
      
    case 'trapezoidal':
      if (!params.sideSlope) 
        throw new Error("Side slope required for trapezoidal channel");
      return params.bottomWidth + 2 * params.sideSlope * depth;
      
    case 'triangular':
      if (!params.sideSlope) throw new Error("Side slope required for triangular channel");
      return 2 * params.sideSlope * depth;
      
    case 'circular':
      if (!params.diameter) throw new Error("Diameter required for circular channel");
      const theta = 2 * Math.acos(1 - 2 * depth / params.diameter);
      return params.diameter * Math.sin(theta / 2);
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
}

/**
 * Calculate wetted perimeter
 * @param depth Water depth
 * @param params Channel parameters
 * @returns Wetted perimeter
 */
export function calculateWetPerimeter(depth: number, params: ChannelParams): number {
  switch(params.channelType) {
    case 'rectangular':
      return params.bottomWidth + 2 * depth;
      
    case 'trapezoidal':
      if (!params.sideSlope) 
        throw new Error("Side slope required for trapezoidal channel");
      return params.bottomWidth + 2 * depth * Math.sqrt(1 + params.sideSlope ** 2);
      
    case 'triangular':
      if (!params.sideSlope) throw new Error("Side slope required for triangular channel");
      return 2 * depth * Math.sqrt(1 + params.sideSlope ** 2);
      
    case 'circular':
      if (!params.diameter) throw new Error("Diameter required for circular channel");
      const theta = 2 * Math.acos(1 - 2 * depth / params.diameter);
      return (params.diameter * theta) / 2;
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
}

/**
 * Calculate hydraulic radius
 * @param depth Water depth
 * @param params Channel parameters
 * @returns Hydraulic radius
 */
export function calculateHydraulicRadius(depth: number, params: ChannelParams): number {
  const area = calculateArea(depth, params);
  const wetPerimeter = calculateWetPerimeter(depth, params);
  return area / wetPerimeter;
}