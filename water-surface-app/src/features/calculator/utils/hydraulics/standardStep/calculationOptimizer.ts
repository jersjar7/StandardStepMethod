import { ChannelParams } from '../../../types';
import { FlowDepthPoint, WaterSurfaceProfileResults, ProfileCalculationParams, StepCalculationParams } from './types';
import { calculateNextDepth, calculateNextDepthNewtonRaphson } from './stepCalculator';
import { calculatePropertiesAtDepth } from './stepCalculator';
import { calculateArea, calculateTopWidth } from '../channelGeometry';
import { calculateVelocity, calculateFroudeNumber, calculateSpecificEnergy } from '../flowParameters';

/**
 * Configuration options for the standard step calculation optimizer
 */
export interface OptimizerConfig {
  // Convergence control
  maxIterations?: number;
  tolerance?: number;
  
  // Step size control
  useAdaptiveStepSize?: boolean;
  minStepSize?: number;
  maxStepSize?: number;
  
  // Numerical method selection
  preferredMethod?: 'simple' | 'newtonRaphson' | 'adaptive';
  
  // Performance settings
  useMultithreading?: boolean;
  
  // Optimization levels
  optimizationLevel?: 'low' | 'medium' | 'high';
}

/**
 * Default optimizer configuration
 */
const DEFAULT_CONFIG: OptimizerConfig = {
  maxIterations: 50,
  tolerance: 0.0001,
  useAdaptiveStepSize: false,
  minStepSize: 0.1,
  maxStepSize: 10.0,
  preferredMethod: 'adaptive',
  useMultithreading: false,
  optimizationLevel: 'medium'
};

/**
 * Result of an optimized calculation step
 */
export interface OptimizedStepResult {
  depth: number;
  iterations: number;
  converged: boolean;
  method: string;
  error?: string;
  duration?: number; // Time taken for calculation in milliseconds
}

/**
 * Optimizer class for standard step calculations
 */
export class StandardStepOptimizer {
  private config: OptimizerConfig;
  
  /**
   * Create a new optimizer with configuration
   * @param config Optimizer configuration
   */
  constructor(config: Partial<OptimizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Calculate the next depth using the optimized calculation method
   * @param params Step calculation parameters
   * @returns Optimized step calculation result
   */
  calculateOptimizedNextDepth(params: StepCalculationParams): OptimizedStepResult {
    // Select the appropriate calculation method
    switch (this.config.preferredMethod) {
      case 'newtonRaphson':
        return this.calculateWithNewtonRaphson(params);
      case 'adaptive':
        return this.calculateWithAdaptiveMethod(params);
      case 'simple':
      default:
        return this.calculateWithSimpleMethod(params);
    }
  }
  
  /**
   * Calculate next depth using the simple iterative method
   * @param params Step calculation parameters
   * @returns Optimized step calculation result
   */
  private calculateWithSimpleMethod(params: StepCalculationParams): OptimizedStepResult {
    try {
      const startTime = performance.now();
      const result = calculateNextDepth(params);
      const endTime = performance.now();
      
      return {
        depth: result,
        iterations: 0, // We don't have access to iteration count from the simple method
        converged: true,
        method: 'simple',
        duration: endTime - startTime
      };
    } catch (error) {
      return {
        depth: 0,
        iterations: 0,
        converged: false,
        method: 'simple',
        error: error instanceof Error ? error.message : 'Unknown calculation error'
      };
    }
  }
  
  /**
   * Calculate next depth using the Newton-Raphson method
   * @param params Step calculation parameters
   * @returns Optimized step calculation result
   */
  private calculateWithNewtonRaphson(params: StepCalculationParams): OptimizedStepResult {
    try {
      const startTime = performance.now();
      const result = calculateNextDepthNewtonRaphson(params);
      const endTime = performance.now();
      
      return {
        depth: result,
        iterations: 0, // We don't have access to iteration count
        converged: true,
        method: 'newtonRaphson',
        duration: endTime - startTime
      };
    } catch (error) {
      return {
        depth: 0,
        iterations: 0,
        converged: false,
        method: 'newtonRaphson',
        error: error instanceof Error ? error.message : 'Unknown calculation error'
      };
    }
  }
  
  /**
   * Calculate next depth using an adaptive method selection
   * @param params Step calculation parameters
   * @returns Optimized step calculation result
   */
  private calculateWithAdaptiveMethod(params: StepCalculationParams): OptimizedStepResult {
    const startTime = performance.now();
    
    // Try with Newton-Raphson first
    const newtonResult = this.calculateWithNewtonRaphson(params);
    
    // If successful, return that result with updated duration
    if (newtonResult.converged && newtonResult.depth > 0) {
      const endTime = performance.now();
      return {
        ...newtonResult,
        duration: endTime - startTime
      };
    }
    
    // Otherwise, fall back to simple method
    const simpleResult = this.calculateWithSimpleMethod(params);
    const endTime = performance.now();
    
    return {
      ...simpleResult,
      method: 'adaptive:simple',
      duration: endTime - startTime
    };
  }
  
  /**
   * Optimize step size based on depth gradients
   * @param profile Partial water surface profile
   * @param currentPosition Current position in calculation
   * @param direction Calculation direction
   * @param defaultStepSize Default step size
   * @returns Optimized step size
   */
  optimizeStepSize(
    profile: FlowDepthPoint[],
    currentPosition: number,
    direction: 'upstream' | 'downstream',
    defaultStepSize: number
  ): number {
    if (!this.config.useAdaptiveStepSize) {
      return defaultStepSize;
    }
    
    // Need at least 2 points to calculate gradients
    if (profile.length < 2) {
      return defaultStepSize;
    }
    
    // Sort profile by station
    const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
    
    // Find the last calculated point
    let lastPoint: FlowDepthPoint | undefined;
    
    if (direction === 'upstream') {
      // For upstream calculations, find the point with the largest position less than or equal to currentPosition
      lastPoint = sortedProfile
        .filter(p => p.x <= currentPosition)
        .sort((a, b) => b.x - a.x)[0];
    } else {
      // For downstream calculations, find the point with the smallest position greater than or equal to currentPosition
      lastPoint = sortedProfile
        .filter(p => p.x >= currentPosition)
        .sort((a, b) => a.x - b.x)[0];
    }
    
    if (!lastPoint) {
      return defaultStepSize;
    }
    
    // Find the previous point relative to the last point
    const lastIndex = sortedProfile.findIndex(p => p.x === lastPoint!.x);
    const previousIndex = direction === 'upstream' ? lastIndex + 1 : lastIndex - 1;
    
    if (previousIndex < 0 || previousIndex >= sortedProfile.length) {
      return defaultStepSize;
    }
    
    const previousPoint = sortedProfile[previousIndex];
    
    // Calculate depth gradient
    const dx = Math.abs(lastPoint.x - previousPoint.x);
    const dy = Math.abs(lastPoint.y - previousPoint.y);
    const gradient = dy / dx;
    
    // Adjust step size based on gradient
    if (gradient > 0.1) {
      // High gradient - use smaller step size
      return Math.max(this.config.minStepSize!, defaultStepSize / 2);
    } else if (gradient < 0.01) {
      // Low gradient - use larger step size
      return Math.min(this.config.maxStepSize!, defaultStepSize * 1.5);
    }
    
    // Default
    return defaultStepSize;
  }
  
  /**
   * Optimize the entire profile calculation process
   * @param params Channel parameters
   * @param initialConditions Initial calculation conditions
   * @returns Optimized water surface profile calculation results
   */
  optimizeProfileCalculation(
    params: ChannelParams,
    initialConditions: ProfileCalculationParams
  ): WaterSurfaceProfileResults {
    const startTime = performance.now();
    
    const {
      initialDepth,
      direction,
      startPosition,
      criticalDepth,
      normalDepth,
      numSteps,
    } = initialConditions;
    
    // Basic step size
    let baseStepSize = params.length / numSteps;
    
    // Initialize flow profile array
    const flowProfile: FlowDepthPoint[] = [];
    
    // Variables to track calculation status
    let isChoking = false;
    
    // Calculate initial point properties
    const area = calculateArea(initialDepth, params);
    const velocity = calculateVelocity(params.discharge, area);
    const froudeNumber = calculateFroudeNumber(velocity, initialDepth, params);
    const specificEnergy = calculateSpecificEnergy(initialDepth, velocity, params);
    
    // Create initial point
    const initialPoint: FlowDepthPoint = {
      x: startPosition,
      y: initialDepth,
      velocity,
      froudeNumber,
      specificEnergy,
      criticalDepth,
      normalDepth,
      topWidth: calculateTopWidth(initialDepth, params)
    };
    
    // Add initial point to the profile
    flowProfile.push(initialPoint);
    
    // Current position and depth for iteration
    let currentPosition = startPosition;
    let currentDepth = initialDepth;
    
    // Track optimization performance
    let totalIterations = 0;
    let totalCalculationTime = 0;
    let calculationCount = 0;
    
    // Calculation loop
    let i = 0;
    while (i < numSteps) {
      // Optimize step size if enabled
      const stepSize = this.optimizeStepSize(flowProfile, currentPosition, direction, baseStepSize);
      
      // Update position based on direction
      const nextPosition = direction === 'upstream' 
                         ? currentPosition - stepSize 
                         : currentPosition + stepSize;
      
      // Check if we're out of the channel bounds
      if (nextPosition < 0 || nextPosition > params.length) {
        break;
      }
      
      // Calculate the next depth using the optimized method
      const stepParams: StepCalculationParams = {
        currentX: currentPosition,
        currentY: currentDepth,
        nextX: nextPosition,
        direction,
        params
      };
      
      // Use our optimized depth calculation
      const result = this.calculateOptimizedNextDepth(stepParams);
      
      // Update performance metrics
      if (result.duration) {
        totalCalculationTime += result.duration;
        calculationCount++;
      }
      totalIterations += result.iterations || 0;
      
      // Check for calculation problems
      if (!result.converged || result.depth <= 0) {
        isChoking = true;
        break;
      }
      
      // Update current position and depth
      currentPosition = nextPosition;
      currentDepth = result.depth;
      
      // Calculate properties at the new point
      const nextProps = calculatePropertiesAtDepth(currentDepth, params);
      
      // Create next point
      const nextPoint: FlowDepthPoint = {
        x: currentPosition,
        y: currentDepth,
        velocity: nextProps.velocity,
        froudeNumber: nextProps.froudeNumber,
        specificEnergy: nextProps.specificEnergy,
        criticalDepth,
        normalDepth,
        topWidth: calculateTopWidth(currentDepth, params)
      };
      
      // Add point to the profile
      flowProfile.push(nextPoint);
      
      i++;
    }
    
    // Sort the profile by station for consistent display
    flowProfile.sort((a, b) => a.x - b.x);
    
    // Determine profile type (would import and use determineProfileType in production)
    const profileType = "Optimized Profile";
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    const avgCalculationTime = calculationCount > 0 ? totalCalculationTime / calculationCount : 0;
    
    console.log(`Profile calculation optimized: ${totalDuration.toFixed(2)}ms total, ${avgCalculationTime.toFixed(2)}ms avg per step`);
    
    return {
      flowProfile,
      profileType,
      channelType: normalDepth > criticalDepth ? 'mild' : 'steep',
      criticalDepth,
      normalDepth,
      isChoking,
      hydraulicJump: undefined, // Would detect hydraulic jump in production
      // Additional metadata could be added here
      _optimizationMetadata: {
        totalDuration,
        totalIterations,
        avgCalculationTime,
        methodUsed: this.config.preferredMethod
      }
    } as any; // Using any to allow for the extra metadata that's not in the interface
  }
  
  /**
   * Apply post-calculation optimizations to an existing profile
   * @param profile Original water surface profile
   * @returns Optimized profile
   */
  optimizeExistingProfile(profile: FlowDepthPoint[]): FlowDepthPoint[] {
    // This function can apply various post-processing optimizations:
    // 1. Remove redundant points in flat areas
    // 2. Add more points in areas with high gradients
    // 3. Smooth out numerical noise
    
    if (profile.length <= 2) {
      return [...profile]; // No optimization possible for very short profiles
    }
    
    // Sort profile by station
    const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
    
    // Optimization level determines aggressiveness of point reduction
    const optimizationLevel = this.config.optimizationLevel || 'medium';
    
    // Calculate the threshold for "significant" depth changes
    // This threshold determines which points can be removed without losing accuracy
    let significanceThreshold: number;
    
    switch (optimizationLevel) {
      case 'low':
        significanceThreshold = 0.001; // Keep most points
        break;
      case 'high':
        significanceThreshold = 0.05; // Aggressive reduction
        break;
      case 'medium':
      default:
        significanceThreshold = 0.01; // Moderate reduction
        break;
    }
    
    // Compute the average depth
    const averageDepth = sortedProfile.reduce((sum, p) => sum + p.y, 0) / sortedProfile.length;
    
    // Relative threshold based on average depth
    const relativeThreshold = averageDepth * significanceThreshold;
    
    // Create an optimized profile by removing points that don't add much information
    const optimizedProfile: FlowDepthPoint[] = [sortedProfile[0]]; // Always keep first point
    
    for (let i = 1; i < sortedProfile.length - 1; i++) {
      const prev = optimizedProfile[optimizedProfile.length - 1];
      const current = sortedProfile[i];
      const next = sortedProfile[i + 1];
      
      // Calculate hypothetical linear interpolation between previous and next points
      const t = (current.x - prev.x) / (next.x - prev.x);
      const interpolatedDepth = prev.y + t * (next.y - prev.y);
      
      // If the actual depth differs significantly from interpolated, keep the point
      if (Math.abs(current.y - interpolatedDepth) > relativeThreshold) {
        optimizedProfile.push(current);
      }
      // Otherwise, this point doesn't add much information and can be skipped
    }
    
    // Always keep the last point
    optimizedProfile.push(sortedProfile[sortedProfile.length - 1]);
    
    return optimizedProfile;
  }
  
  /**
   * Checks if a calculation would benefit from optimization
   * @param params Channel parameters
   * @returns Whether optimization is recommended
   */
  isOptimizationRecommended(params: ChannelParams): boolean {
    // Optimization is most beneficial for:
    // 1. Long channels (many calculation points)
    // 2. Channels with high slopes (potential for rapid changes)
    // 3. Channels with complex geometries
    
    // Check channel length
    const isLongChannel = params.length > 1000; // Longer than 1000m
    
    // Check channel slope
    const isSteepChannel = params.channelSlope > 0.01; // Steeper than 1%
    
    // Check channel geometry
    const isComplexGeometry = params.channelType === 'circular' || params.channelType === 'trapezoidal';
    
    // Recommend optimization if any of these conditions are met
    return isLongChannel || isSteepChannel || isComplexGeometry;
  }
}

/**
 * Helper function to create a pre-configured optimizer
 * @param optimizationLevel Optimization level preset
 * @returns Configured optimizer instance
 */
export function createOptimizer(optimizationLevel: 'low' | 'medium' | 'high' = 'medium'): StandardStepOptimizer {
  switch (optimizationLevel) {
    case 'low':
      return new StandardStepOptimizer({
        maxIterations: 20,
        tolerance: 0.001,
        useAdaptiveStepSize: false,
        preferredMethod: 'simple',
        optimizationLevel: 'low'
      });
      
    case 'high':
      return new StandardStepOptimizer({
        maxIterations: 100,
        tolerance: 0.00001,
        useAdaptiveStepSize: true,
        minStepSize: 0.05,
        maxStepSize: 20.0,
        preferredMethod: 'adaptive',
        optimizationLevel: 'high'
      });
      
    case 'medium':
    default:
      return new StandardStepOptimizer({
        maxIterations: 50,
        tolerance: 0.0001,
        useAdaptiveStepSize: true,
        preferredMethod: 'adaptive',
        optimizationLevel: 'medium'
      });
  }
}

/**
 * Apply default optimizations to a profile calculation
 * @param params Channel parameters
 * @param initialConditions Initial calculation conditions
 * @returns Optimized water surface profile
 */
export function optimizeCalculation(
  params: ChannelParams,
  initialConditions: ProfileCalculationParams
): WaterSurfaceProfileResults {
  const optimizer = createOptimizer('medium');
  return optimizer.optimizeProfileCalculation(params, initialConditions);
}