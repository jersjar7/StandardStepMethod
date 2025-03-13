import { ChannelParameters, CalculationResult } from '../stores/slices/calculatorSlice';

/**
 * Service for handling hydraulic calculations
 */
export class CalculationService {
  /**
   * Calculate the water surface profile for a given channel
   * @param params Channel parameters 
   * @returns Array of calculation results
   */
  static calculateWaterSurfaceProfile(params: ChannelParameters): {
    results: CalculationResult[];
    hydraulicJump: {
      occurs: boolean;
      station?: number;
      upstreamDepth?: number;
      downstreamDepth?: number;
    }
  } {
    try {
      // Calculate critical and normal depths
      const criticalDepth = this.calculateCriticalDepth(params);
      const normalDepth = this.calculateNormalDepth(params);
      
      // Determine flow regime and step direction
      const isMild = normalDepth > criticalDepth;
      const stepDirection = isMild ? 1 : -1; // 1 for upstream, -1 for downstream
      
      // Set initial conditions based on regime
      let initialStation = stepDirection > 0 ? 0 : params.length;
      let initialDepth: number;
      
      if (isMild) {
        // For mild slope, start from downstream
        initialDepth = params.downstreamDepth || criticalDepth;
      } else {
        // For steep slope, start from upstream
        initialDepth = params.upstreamDepth || normalDepth;
      }
      
      // Calculate step size
      const numSteps = 100; // Number of calculation points
      const deltaX = params.length / numSteps;
      
      // Initialize results array
      const results: CalculationResult[] = [];
      
      // Perform standard step calculations
      let currentStation = initialStation;
      let currentDepth = initialDepth;
      
      while ((stepDirection > 0 && currentStation <= params.length) || 
             (stepDirection < 0 && currentStation >= 0)) {
        // Calculate hydraulic properties at current depth
        const sectionProps = this.calculateSectionProperties(currentDepth, params);
        const velocity = params.discharge / sectionProps.area;
        const froudeNumber = this.calculateFroudeNumber(currentDepth, velocity, sectionProps.topWidth);
        const specificEnergy = currentDepth + (velocity * velocity) / (2 * 9.81);
        
        // Store result
        results.push({
          station: currentStation,
          depth: currentDepth,
          velocity,
          area: sectionProps.area,
          topWidth: sectionProps.topWidth,
          wetPerimeter: sectionProps.wetPerimeter,
          hydraulicRadius: sectionProps.hydraulicRadius,
          energy: specificEnergy,
          froudeNumber,
          criticalDepth,
          normalDepth
        });
        
        // Move to next station
        currentStation += stepDirection * deltaX;
        
        // Skip if we've reached the end of the channel
        if ((stepDirection > 0 && currentStation > params.length) || 
            (stepDirection < 0 && currentStation < 0)) {
          break;
        }
        
        // Calculate next depth using standard step method
        currentDepth = this.calculateNextDepth(
          currentDepth, 
          velocity, 
          specificEnergy, 
          params, 
          deltaX, 
          stepDirection
        );
      }
      
      // Sort results by station
      results.sort((a, b) => a.station - b.station);
      
      // Check for hydraulic jump
      const hydraulicJump = this.detectHydraulicJump(results);
      
      return {
        results,
        hydraulicJump
      };
    } catch (error) {
      console.error("Error in calculation:", error);
      throw new Error(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Calculate properties of the channel section
   */
  static calculateSectionProperties(depth: number, params: ChannelParameters): {
    area: number;
    wetPerimeter: number;
    topWidth: number;
    hydraulicRadius: number;
  } {
    switch (params.channelType) {
      case 'rectangular':
        return this.calculateRectangularSection(depth, params);
      case 'trapezoidal':
        return this.calculateTrapezoidalSection(depth, params);
      case 'triangular':
        return this.calculateTriangularSection(depth, params);
      case 'circular':
        return this.calculateCircularSection(depth, params);
      default:
        throw new Error(`Unsupported channel type: ${params.channelType}`);
    }
  }
  
  /**
   * Calculate properties for rectangular section
   */
  static calculateRectangularSection(depth: number, params: ChannelParameters): {
    area: number;
    wetPerimeter: number;
    topWidth: number;
    hydraulicRadius: number;
  } {
    const area = params.bottomWidth * depth;
    const wetPerimeter = params.bottomWidth + 2 * depth;
    const topWidth = params.bottomWidth;
    const hydraulicRadius = area / wetPerimeter;
    
    return {
      area,
      wetPerimeter,
      topWidth,
      hydraulicRadius
    };
  }
  
  /**
   * Calculate properties for trapezoidal section
   */
  static calculateTrapezoidalSection(depth: number, params: ChannelParameters): {
    area: number;
    wetPerimeter: number;
    topWidth: number;
    hydraulicRadius: number;
  } {
    const topWidth = params.bottomWidth + 2 * params.sideSlope * depth;
    const area = (params.bottomWidth + params.sideSlope * depth) * depth;
    const wetPerimeter = params.bottomWidth + 2 * depth * Math.sqrt(1 + params.sideSlope * params.sideSlope);
    const hydraulicRadius = area / wetPerimeter;
    
    return {
      area,
      wetPerimeter,
      topWidth,
      hydraulicRadius
    };
  }
  
  /**
   * Calculate properties for triangular section
   */
  static calculateTriangularSection(depth: number, params: ChannelParameters): {
    area: number;
    wetPerimeter: number;
    topWidth: number;
    hydraulicRadius: number;
  } {
    const topWidth = 2 * params.sideSlope * depth;
    const area = params.sideSlope * depth * depth;
    const wetPerimeter = 2 * depth * Math.sqrt(1 + params.sideSlope * params.sideSlope);
    const hydraulicRadius = area / wetPerimeter;
    
    return {
      area,
      wetPerimeter,
      topWidth,
      hydraulicRadius
    };
  }
  
  /**
   * Calculate properties for circular section
   */
  static calculateCircularSection(depth: number, params: ChannelParameters): {
    area: number;
    wetPerimeter: number;
    topWidth: number;
    hydraulicRadius: number;
  } {
    // For circular channels
    const diameter = params.diameter || 1.0;
    
    // Calculate central angle in radians
    const theta = 2 * Math.acos(1 - 2 * depth / diameter);
    
    // Calculate area
    const area = (diameter * diameter / 8) * (theta - Math.sin(theta));
    
    // Calculate wetted perimeter
    const wetPerimeter = (diameter * theta) / 2;
    
    // Calculate top width
    const topWidth = diameter * Math.sin(theta / 2);
    
    // Calculate hydraulic radius
    const hydraulicRadius = area / wetPerimeter;
    
    return {
      area,
      wetPerimeter,
      topWidth,
      hydraulicRadius
    };
  }
  
  /**
   * Calculate critical depth for a channel
   */
  static calculateCriticalDepth(params: ChannelParameters): number {
    const g = 9.81; // Gravitational acceleration
    const q = params.discharge; // Discharge
    
    switch (params.channelType) {
      case 'rectangular':
        // For rectangular channels: yc = (q²/(g*b²))^(1/3)
        return Math.pow(q * q / (g * params.bottomWidth * params.bottomWidth), 1/3);
      
      case 'trapezoidal':
        // For trapezoidal channels, use iterative method
        let yc = 0.1; // Initial guess
        let error = 1;
        let iterations = 0;
        
        while (error > 0.0001 && iterations < 100) {
          const section = this.calculateTrapezoidalSection(yc, params);
          const froude = q / (section.area * Math.sqrt(g * section.area / section.topWidth));
          
          error = Math.abs(froude - 1);
          
          // Adjust depth based on Froude number
          if (froude > 1) {
            yc += 0.01;
          } else {
            yc -= 0.01;
          }
          
          iterations++;
        }
        
        return yc;
      
      case 'triangular':
        // For triangular channels: yc = (2*q²/(g*m²))^(1/5)
        return Math.pow(2 * q * q / (g * params.sideSlope * params.sideSlope), 1/5);
      
      case 'circular':
        // For circular channels, use iterative method
        let ycCircular = params.diameter / 4; // Initial guess
        error = 1;
        iterations = 0;
        
        while (error > 0.0001 && iterations < 100) {
          const section = this.calculateCircularSection(ycCircular, params);
          const froude = q / (section.area * Math.sqrt(g * section.area / section.topWidth));
          
          error = Math.abs(froude - 1);
          
          // Adjust depth based on Froude number
          if (froude > 1) {
            ycCircular += 0.01;
          } else {
            ycCircular -= 0.01;
          }
          
          iterations++;
        }
        
        return ycCircular;
      
      default:
        throw new Error(`Unsupported channel type: ${params.channelType}`);
    }
  }
  
  /**
   * Calculate normal depth using Manning's equation
   */
  static calculateNormalDepth(params: ChannelParameters): number {
    const { manningN, channelSlope, discharge } = params;
    
    // Use iterative approach to solve Manning's equation
    let yn = 0.1; // Initial guess
    let error = 1;
    let iterations = 0;
    
    while (error > 0.0001 && iterations < 100) {
      const section = this.calculateSectionProperties(yn, params);
      
      // Manning's equation: Q = (1/n) * A * R^(2/3) * S^(1/2)
      const calculatedQ = (1 / manningN) * section.area * 
        Math.pow(section.hydraulicRadius, 2/3) * Math.pow(channelSlope, 1/2);
      
      error = Math.abs(calculatedQ - discharge) / discharge;
      
      // Adjust normal depth based on error
      if (calculatedQ < discharge) {
        yn += 0.01; // Increase depth
      } else {
        yn -= 0.01; // Decrease depth
      }
      
      iterations++;
    }
    
    return yn;
  }
  
  /**
   * Calculate the Froude number
   */
  static calculateFroudeNumber(depth: number, velocity: number, topWidth: number): number {
    const g = 9.81; // Gravitational acceleration
    const hydraulicDepth = depth; // Approximation for rectangular channels
    
    return velocity / Math.sqrt(g * hydraulicDepth);
  }
  
  /**
   * Calculate the next depth using the standard step method
   */
  static calculateNextDepth(
    currentDepth: number, 
    velocity: number, 
    specificEnergy: number, 
    params: ChannelParameters, 
    deltaX: number, 
    stepDirection: number
  ): number {
    // Calculate friction slope using Manning's equation
    const section = this.calculateSectionProperties(currentDepth, params);
    const frictionSlope = Math.pow(params.discharge * params.manningN / 
                         (section.area * Math.pow(section.hydraulicRadius, 2/3)), 2);
    
    // Estimate next depth
    let nextDepth = currentDepth;
    
    // Iterative solution for energy equation
    let error = 1;
    let iterations = 0;
    
    while (error > 0.0001 && iterations < 50) {
      const nextSection = this.calculateSectionProperties(nextDepth, params);
      const nextVelocity = params.discharge / nextSection.area;
      const nextEnergy = nextDepth + (nextVelocity * nextVelocity) / (2 * 9.81);
      
      // Calculate head loss
      const avgFrictionSlope = (frictionSlope + Math.pow(params.discharge * params.manningN / 
                                (nextSection.area * Math.pow(nextSection.hydraulicRadius, 2/3)), 2)) / 2;
      const headLoss = avgFrictionSlope * deltaX;
      
      // Calculate energy difference
      const energyDiff = nextEnergy - (specificEnergy + stepDirection * headLoss);
      error = Math.abs(energyDiff);
      
      // Adjust next depth
      if (energyDiff > 0) {
        nextDepth -= 0.001;
      } else {
        nextDepth += 0.001;
      }
      
      iterations++;
    }
    
    return nextDepth;
  }
  
  /**
   * Detect hydraulic jump in the results
   */
  static detectHydraulicJump(results: CalculationResult[]): {
    occurs: boolean;
    station?: number;
    upstreamDepth?: number;
    downstreamDepth?: number;
  } {
    for (let i = 0; i < results.length - 1; i++) {
      // Check for transition from supercritical to subcritical flow
      if (results[i].froudeNumber > 1 && results[i + 1].froudeNumber < 1) {
        // Calculate conjugate depth using the momentum equation
        const upstreamDepth = results[i].depth;
        const upstreamFroude = results[i].froudeNumber;
        const downstreamDepth = 0.5 * upstreamDepth * (Math.sqrt(1 + 8 * upstreamFroude * upstreamFroude) - 1);
        
        return {
          occurs: true,
          station: (results[i].station + results[i + 1].station) / 2,
          upstreamDepth,
          downstreamDepth
        };
      }
    }
    
    // No hydraulic jump detected
    return {
      occurs: false
    };
  }
}