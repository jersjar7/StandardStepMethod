import { ChannelParams } from '../../stores/calculatorSlice';
import { 
  calculateArea, 
  calculateWetPerimeter,
  calculateTopWidth,
  calculateHydraulicRadius 
} from './channelGeometry';
import { 
  calculateVelocity, 
  calculateFroudeNumber, 
  calculateSpecificEnergy,
  calculateFrictionSlope,
} from './flowParameters';
import { 
  calculateCriticalDepth 
} from './criticalFlow';
import { 
  calculateNormalDepth, 
  classifyChannelSlope 
} from './normalFlow';
import { 
  calculateHydraulicJump, 
  isHydraulicJumpPossible
} from './hydraulicJump';

/**
 * Interface for flow depth points in the profile
 */
export interface FlowDepthPoint {
  x: number;           // Station (distance along channel)
  y: number;           // Depth
  velocity: number;    // Flow velocity
  froudeNumber: number; // Froude number
  specificEnergy: number; // Specific energy
  criticalDepth: number; // Critical depth
  normalDepth: number;  // Normal depth
}

/**
 * Interface for water surface profile calculation results
 */
export interface WaterSurfaceProfileResults {
  flowProfile: FlowDepthPoint[];
  profileType: string;
  channelType: string;
  criticalDepth: number;
  normalDepth: number;
  isChoking: boolean;
  hydraulicJump?: ReturnType<typeof calculateHydraulicJump>;
}

/**
 * Reusable cache for expensive calculations
 */
const calculationCache = {
  criticalDepth: new Map<string, number>(),
  normalDepth: new Map<string, number>(),
  
  // Generate cache key from params
  getCacheKey(params: ChannelParams, prop: string): string {
    // Create a unique key based on relevant parameters
    return `${params.channelType}_${params.discharge}_${params.channelSlope}_${params.manningN}_${prop}`;
  },
  
  // Clear cache if needed (e.g., when params change significantly)
  clearCache(): void {
    this.criticalDepth.clear();
    this.normalDepth.clear();
  }
};

/**
 * Calculates the water surface profile using the standard step method
 * @param params Channel parameters
 * @returns Water surface profile calculation results
 */
export function calculateWaterSurfaceProfile(params: ChannelParams): WaterSurfaceProfileResults {
  // Calculate critical and normal depths with caching
  const criticalDepthKey = calculationCache.getCacheKey(params, 'critical');
  const normalDepthKey = calculationCache.getCacheKey(params, 'normal');
  
  let criticalDepth: number;
  let normalDepth: number;
  
  // Use cached values if available
  if (calculationCache.criticalDepth.has(criticalDepthKey)) {
    criticalDepth = calculationCache.criticalDepth.get(criticalDepthKey)!;
  } else {
    criticalDepth = calculateCriticalDepth(params);
    calculationCache.criticalDepth.set(criticalDepthKey, criticalDepth);
  }
  
  if (calculationCache.normalDepth.has(normalDepthKey)) {
    normalDepth = calculationCache.normalDepth.get(normalDepthKey)!;
  } else {
    normalDepth = calculateNormalDepth(params);
    calculationCache.normalDepth.set(normalDepthKey, normalDepth);
  }
  
  // Classify the channel slope
  const channelSlope = classifyChannelSlope(params);
  
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
    if (channelSlope === 'mild') {
      // For mild slopes, start from downstream with critical depth as control
      initialDepth = criticalDepth;
      direction = 'upstream';
      startPosition = params.length;
    } else {
      // For steep slopes, start from upstream with normal depth as control
      initialDepth = normalDepth;
      direction = 'downstream';
      startPosition = 0;
    }
  }
  
  // Set step size - adaptive based on channel length
  const baseDx = params.length / 100; // Base step size
  const flowProfile: FlowDepthPoint[] = [];
  
  // Variables to track hydraulic jump
  let hydraulicJump = undefined;
  let isChoking = false;
  
  // Initial position and depth
  let currentPosition = startPosition;
  let currentDepth = initialDepth;
  
  // Pre-calculate gradual transitions
  const channelTransitions = detectTransitions(params, criticalDepth, normalDepth);
  
  // Create initial point
  const initialArea = calculateArea(currentDepth, params);
  const initialVelocity = calculateVelocity(params.discharge, initialArea);
  const initialFroudeNumber = calculateFroudeNumber(initialVelocity, currentDepth, params);
  const initialEnergy = calculateSpecificEnergy(currentDepth, initialVelocity, params);
  
  // Add initial point to the profile
  flowProfile.push({
    x: currentPosition,
    y: currentDepth,
    velocity: initialVelocity,
    froudeNumber: initialFroudeNumber,
    specificEnergy: initialEnergy,
    criticalDepth,
    normalDepth
  });
  
  // Adaptive step size variables
  let dx = baseDx;
  let prevFroudeNumber = initialFroudeNumber;
  let lastJumpCheck = 0;
  
  // Keep track of rapid changes for adaptive step size
  let depthGradient = 0;
  
  // Calculate water surface profile step by step
  while (true) {
    // Update position based on direction and step size
    const nextPosition = direction === 'upstream' 
                       ? currentPosition - dx 
                       : currentPosition + dx;
    
    // Check if we're out of the channel bounds
    if (nextPosition < 0 || nextPosition > params.length) {
      break;
    }
    
    // Check if we're approaching a transition area
    const nearTransition = channelTransitions.some(t => 
      Math.abs(nextPosition - t.position) < 5 * baseDx);
    
    // Adjust step size if near transition area or if depth is changing rapidly
    if (nearTransition || Math.abs(depthGradient) > 0.05) {
      dx = baseDx / 4; // Reduce step size for higher accuracy
    } else {
      dx = baseDx; // Use normal step size
    }
    
    // Calculate the next depth using the standard step method
    try {
      const nextDepth = calculateNextDepth(
        currentPosition, 
        currentDepth, 
        nextPosition,
        direction,
        params
      );
      
      // Check if next depth is valid
      if (nextDepth <= 0) {
        isChoking = true;
        break;
      }
      
      // Calculate properties at the new point
      const nextArea = calculateArea(nextDepth, params);
      const nextVelocity = calculateVelocity(params.discharge, nextArea);
      const nextFroudeNumber = calculateFroudeNumber(nextVelocity, nextDepth, params);
      const nextEnergy = calculateSpecificEnergy(nextDepth, nextVelocity, params);
      
      // Update depth gradient for adaptive step size
      depthGradient = (nextDepth - currentDepth) / dx;
      
      // Check for hydraulic jump - more robust detection
      // 1. Check for transition from supercritical to subcritical
      // 2. Check every few steps to avoid missing jumps between calculation points
      const distanceSinceLastCheck = Math.abs(currentPosition - lastJumpCheck);
      
      if (distanceSinceLastCheck > 5 * baseDx) {
        // Periodically check for possible hydraulic jump conditions
        lastJumpCheck = currentPosition;
        
        if (prevFroudeNumber > 1 && nextFroudeNumber < 1) {
          // Clear hydraulic jump condition - check if jump is possible
          if (isHydraulicJumpPossible(currentDepth, params)) {
            const jumpLocation = (currentPosition + nextPosition) / 2;
            hydraulicJump = calculateHydraulicJump(currentDepth, jumpLocation, params);
            
            // After hydraulic jump, continue with sequent depth
            if (hydraulicJump) {
              currentDepth = hydraulicJump.depth2;
              
              // Add jump point to the profile
              flowProfile.push({
                x: jumpLocation,
                y: hydraulicJump.depth2,
                velocity: params.discharge / calculateArea(hydraulicJump.depth2, params),
                froudeNumber: nextFroudeNumber,
                specificEnergy: nextEnergy - hydraulicJump.energyLoss,
                criticalDepth,
                normalDepth
              });
              
              // Skip to next iteration
              currentPosition = nextPosition;
              prevFroudeNumber = nextFroudeNumber;
              continue;
            }
          }
        }
      }
      
      // No jump, update current depth for next iteration
      currentDepth = nextDepth;
      currentPosition = nextPosition;
      prevFroudeNumber = nextFroudeNumber;
      
      // Add point to the profile
      flowProfile.push({
        x: currentPosition,
        y: currentDepth,
        velocity: nextVelocity,
        froudeNumber: nextFroudeNumber,
        specificEnergy: nextEnergy,
        criticalDepth,
        normalDepth
      });
      
    } catch (error) {
      // Handle calculation errors
      console.error(`Error at station ${nextPosition}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      isChoking = true;
      break;
    }
  }
  
  // Determine the profile type
  const profileType = determineProfileType(
    channelSlope, 
    initialDepth, 
    normalDepth, 
    criticalDepth
  );
  
  // Sort the profile by station for consistent display
  flowProfile.sort((a, b) => a.x - b.x);
  
  return {
    flowProfile,
    profileType,
    channelType: channelSlope,
    criticalDepth,
    normalDepth,
    isChoking,
    hydraulicJump
  };
}

/**
 * Detect transitions in the channel for adaptive step sizing
 * @param params Channel parameters
 * @param criticalDepth Critical depth
 * @param normalDepth Normal depth
 * @returns Array of transition locations
 */
function detectTransitions(
  params: ChannelParams, 
  criticalDepth: number, 
  normalDepth: number
): Array<{position: number, type: string}> {
  const transitions: Array<{position: number, type: string}> = [];
  
  // For mild slope, transition near critical depth control
  if (normalDepth > criticalDepth) {
    transitions.push({
      position: params.length,
      type: 'critical control'
    });
  }
  
  // For steep slope, transition near jump location
  if (normalDepth < criticalDepth) {
    // Estimate jump location - typically about 20-30% along channel
    const estimatedJumpLoc = params.length * 0.25;
    transitions.push({
      position: estimatedJumpLoc,
      type: 'potential jump'
    });
  }
  
  // Add control points
  if (params.upstreamDepth !== undefined) {
    transitions.push({
      position: 0,
      type: 'upstream control'
    });
  }
  
  if (params.downstreamDepth !== undefined) {
    transitions.push({
      position: params.length,
      type: 'downstream control'
    });
  }
  
  return transitions;
}

/**
 * Calculates the next depth in the water surface profile using improved Newton-Raphson method
 * @param currentX Current station
 * @param currentY Current depth
 * @param nextX Next station
 * @param direction Calculation direction
 * @param params Channel parameters
 * @returns Next depth
 */
function calculateNextDepth(
  currentX: number, 
  currentY: number, 
  nextX: number,
  direction: 'upstream' | 'downstream',
  params: ChannelParams
): number {
  // Calculate properties at current point
  const currentArea = calculateArea(currentY, params);
  const currentWetPerimeter = calculateWetPerimeter(currentY, params);
  const currentHydraulicRadius = currentArea / currentWetPerimeter;
  const currentVelocity = calculateVelocity(params.discharge, currentArea);
  const currentEnergy = calculateSpecificEnergy(currentY, currentVelocity, params);
  
  // Calculate bed elevation difference
  const dx = Math.abs(nextX - currentX);
  const dz = params.channelSlope * dx * (direction === 'upstream' ? 1 : -1);
  
  // Calculate friction slope at current point
  const currentFrictionSlope = calculateFrictionSlope(
    currentVelocity,
    currentHydraulicRadius,
    params.manningN,
    params.units
  );
  
  // Initial estimate for next depth - better initial guess
  let nextY: number;
  
  if (direction === 'upstream') {
    if (currentY > calculateNormalDepth(params)) {
      // Backwater curve - depth increases moving upstream
      nextY = currentY * 1.05;
    } else {
      // Drawdown curve - depth decreases moving upstream
      nextY = currentY * 0.95;
    }
  } else { // downstream
    if (currentY > calculateNormalDepth(params)) {
      // Drawdown curve - depth decreases moving downstream
      nextY = currentY * 0.95;
    } else {
      // Backwater curve - depth increases moving downstream
      nextY = currentY * 1.05;
    }
  }
  
  // Constrain initial guess to reasonable bounds
  nextY = Math.max(0.1 * currentY, Math.min(10 * currentY, nextY));
  
  // Improved convergence parameters
  const tolerance = 0.0001;
  const maxIterations = 50;
  let iterations = 0;
  let prevError = Infinity;
  
  // Newton-Raphson method for faster convergence
  while (iterations < maxIterations) {
    // Calculate properties at estimated next point
    const nextArea = calculateArea(nextY, params);
    const nextTopWidth = calculateTopWidth(nextY, params);
    const nextWetPerimeter = calculateWetPerimeter(nextY, params);
    const nextHydraulicRadius = nextArea / nextWetPerimeter;
    const nextVelocity = calculateVelocity(params.discharge, nextArea);
    const nextEnergy = calculateSpecificEnergy(nextY, nextVelocity, params);
    
    // Calculate friction slope at next point
    const nextFrictionSlope = calculateFrictionSlope(
      nextVelocity,
      nextHydraulicRadius,
      params.manningN,
      params.units
    );
    
    // Average friction slope
    const avgFrictionSlope = (currentFrictionSlope + nextFrictionSlope) / 2;
    
    // Head loss due to friction
    const headLoss = avgFrictionSlope * dx;
    
    // Expected energy at next point based on energy equation
    const expectedNextEnergy = currentEnergy + dz - headLoss;
    
    // Error in energy
    const error = nextEnergy - expectedNextEnergy;
    
    // Check if solution converged
    if (Math.abs(error) < tolerance) {
      break;
    }
    
    // If error is growing or oscillating, switch to bisection method
    if (Math.abs(error) > Math.abs(prevError) && iterations > 5) {
      // Use bisection method for more robustness
      return findDepthByBisection(
        currentX, currentY, nextX, direction, params, 
        currentEnergy, dz, currentFrictionSlope
      );
    }
    
    // Calculate derivative of energy with respect to depth
    // dE/dy = 1 - Q²/(g*A³) * dA/dy
    // Approximate dA/dy ≈ topWidth
    const g = params.units === 'imperial' ? 32.2 : 9.81;
    const dEdy = 1 - Math.pow(params.discharge, 2) / (g * Math.pow(nextArea, 3)) * nextTopWidth;
    
    // Newton-Raphson update
    // Avoid division by zero
    if (Math.abs(dEdy) > 0.0001) {
      const delta = error / dEdy;
      // Dampen the correction to avoid overshooting
      const dampingFactor = Math.min(1.0, 0.7 + 0.3 * (maxIterations - iterations) / maxIterations);
      nextY -= delta * dampingFactor;
    } else {
      // If derivative is near zero, make small adjustment
      if (error > 0) {
        nextY += 0.01 * nextY;
      } else {
        nextY -= 0.01 * nextY;
      }
    }
    
    // Ensure depth remains positive and reasonable
    nextY = Math.max(0.001, nextY);
    
    // Save current error for next iteration
    prevError = error;
    iterations++;
  }
  
  // If Newton-Raphson didn't converge, try bisection method
  if (iterations >= maxIterations) {
    return findDepthByBisection(
      currentX, currentY, nextX, direction, params, 
      currentEnergy, dz, currentFrictionSlope
    );
  }
  
  return nextY;
}

/**
 * Fallback method using bisection for more robust convergence
 */
function findDepthByBisection(
  currentX: number, 
  currentY: number, 
  nextX: number,
  direction: 'upstream' | 'downstream',
  params: ChannelParams,
  currentEnergy: number,
  dz: number,
  currentFrictionSlope: number
): number {
  const dx = Math.abs(nextX - currentX);
  
  // Set reasonable search bounds
  const yMin = 0.1 * currentY;
  const yMax = 10 * currentY;
  
  let yLow = yMin;
  let yHigh = yMax;
  
  const tolerance = 0.0001;
  const maxIterations = 50;
  let iterations = 0;
  
  // Function to evaluate energy balance
  const evaluateEnergyBalance = (y: number): number => {
    const area = calculateArea(y, params);
    const wetPerimeter = calculateWetPerimeter(y, params);
    const hydraulicRadius = area / wetPerimeter;
    const velocity = calculateVelocity(params.discharge, area);
    const energy = calculateSpecificEnergy(y, velocity, params);
    
    const frictionSlope = calculateFrictionSlope(
      velocity,
      hydraulicRadius,
      params.manningN,
      params.units
    );
    
    const avgFrictionSlope = (currentFrictionSlope + frictionSlope) / 2;
    const headLoss = avgFrictionSlope * dx;
    
    const expectedEnergy = currentEnergy + dz - headLoss;
    
    return energy - expectedEnergy;
  };
  
  // Bisection method
  while ((yHigh - yLow) > tolerance && iterations < maxIterations) {
    const yMid = (yLow + yHigh) / 2;
    const fMid = evaluateEnergyBalance(yMid);
    
    if (Math.abs(fMid) < tolerance) {
      return yMid;
    }
    
    const fLow = evaluateEnergyBalance(yLow);
    
    if (fLow * fMid < 0) {
      yHigh = yMid;
    } else {
      yLow = yMid;
    }
    
    iterations++;
  }
  
  return (yLow + yHigh) / 2