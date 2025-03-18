import { ChannelParams } from '../../types';

/**
 * Calculates the cross-sectional area of flow for a given water depth
 * @param depth Water depth
 * @param params Channel parameters
 * @returns Cross-sectional area
 */
export function calculateArea(depth: number, params: ChannelParams): number {
  switch (params.channelType) {
    case 'rectangular':
      return params.bottomWidth * depth;
      
    case 'trapezoidal':
      if (!params.sideSlope) 
        throw new Error("Side slope required for trapezoidal channel");
      return (params.bottomWidth + params.sideSlope * depth) * depth;
      
    case 'triangular':
      if (!params.sideSlope) 
        throw new Error("Side slope required for triangular channel");
      return params.sideSlope * depth * depth;
      
    case 'circular':
      if (!params.diameter) 
        throw new Error("Diameter required for circular channel");
      
      // For circular channel, calculate area based on the depth
      // Use the angle subtended by the water surface at the center
      const diameter = params.diameter;
      
      // If depth is 0, return 0
      if (depth <= 0) return 0;
      
      // If depth is greater than diameter, return full circle area
      if (depth >= diameter) return Math.PI * Math.pow(diameter / 2, 2);
      
      // Calculate the angle subtended by the water surface
      const theta = 2 * Math.acos(1 - 2 * depth / diameter);
      
      // Calculate area for partially filled circular channel
      return (Math.pow(diameter / 2, 2) * (theta - Math.sin(theta))) / 2;
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
}

/**
 * Calculates the wetted perimeter for a given water depth
 * @param depth Water depth
 * @param params Channel parameters
 * @returns Wetted perimeter
 */
export function calculateWetPerimeter(depth: number, params: ChannelParams): number {
  switch (params.channelType) {
    case 'rectangular':
      return params.bottomWidth + 2 * depth;
      
    case 'trapezoidal':
      if (!params.sideSlope) 
        throw new Error("Side slope required for trapezoidal channel");
      
      // Length of sloped sides using Pythagorean theorem
      const sideLength = depth * Math.sqrt(1 + Math.pow(params.sideSlope, 2));
      return params.bottomWidth + 2 * sideLength;
      
    case 'triangular':
      if (!params.sideSlope) 
        throw new Error("Side slope required for triangular channel");
      
      // Length of sides using Pythagorean theorem
      const triangleSideLength = depth * Math.sqrt(1 + Math.pow(params.sideSlope, 2));
      return 2 * triangleSideLength;
      
    case 'circular':
      if (!params.diameter) 
        throw new Error("Diameter required for circular channel");
      
      // If depth is 0, return 0
      if (depth <= 0) return 0;
      
      // If depth is greater than diameter, return full circle perimeter
      if (depth >= params.diameter) return Math.PI * params.diameter;
      
      // Calculate the angle subtended by the water surface
      const theta = 2 * Math.acos(1 - 2 * depth / params.diameter);
      
      // Calculate wetted perimeter for partially filled circular channel
      return (params.diameter / 2) * theta;
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
}

/**
 * Calculates the top width of the water surface for a given water depth
 * @param depth Water depth
 * @param params Channel parameters
 * @returns Top width of water surface
 */
export function calculateTopWidth(depth: number, params: ChannelParams): number {
  switch (params.channelType) {
    case 'rectangular':
      return params.bottomWidth;
      
    case 'trapezoidal':
      if (!params.sideSlope) 
        throw new Error("Side slope required for trapezoidal channel");
      
      // Top width = bottom width + 2 * (depth * side slope)
      return params.bottomWidth + 2 * (depth * params.sideSlope);
      
    case 'triangular':
      if (!params.sideSlope) 
        throw new Error("Side slope required for triangular channel");
      
      // Top width = 2 * (depth * side slope)
      return 2 * (depth * params.sideSlope);
      
    case 'circular':
      if (!params.diameter) 
        throw new Error("Diameter required for circular channel");
      
      // If depth is 0, return 0
      if (depth <= 0) return 0;
      
      // If depth is greater than diameter, return 0 (full circle has no top width)
      if (depth >= params.diameter) return 0;
      
      // Calculate the angle subtended by the water surface
      const theta = 2 * Math.acos(1 - 2 * depth / params.diameter);
      
      // Calculate top width for partially filled circular channel
      return params.diameter * Math.sin(theta / 2);
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
}

/**
 * Calculates the hydraulic radius for a given water depth
 * @param depth Water depth
 * @param params Channel parameters
 * @returns Hydraulic radius
 */
export function calculateHydraulicRadius(depth: number, params: ChannelParams): number {
  const area = calculateArea(depth, params);
  const wetPerimeter = calculateWetPerimeter(depth, params);
  
  // Avoid division by zero
  if (wetPerimeter === 0) return 0;
  
  return area / wetPerimeter;
}

/**
 * Calculates the hydraulic depth for a given water depth
 * @param depth Water depth
 * @param params Channel parameters
 * @returns Hydraulic depth
 */
export function calculateHydraulicDepth(depth: number, params: ChannelParams): number {
  const area = calculateArea(depth, params);
  const topWidth = calculateTopWidth(depth, params);
  
  // Avoid division by zero
  if (topWidth === 0) return depth;
  
  return area / topWidth;
}

/**
 * Calculates maximum possible depth for a given channel
 * @param params Channel parameters
 * @returns Maximum depth
 */
export function calculateMaxDepth(params: ChannelParams): number {
  switch (params.channelType) {
    case 'rectangular':
    case 'trapezoidal':
    case 'triangular':
      // For open channels, no definite max depth
      return Infinity;
      
    case 'circular':
      if (!params.diameter) 
        throw new Error("Diameter required for circular channel");
      
      // For circular channel, max depth is the diameter
      return params.diameter;
      
    default:
      throw new Error(`Unsupported channel type: ${params.channelType}`);
  }
}