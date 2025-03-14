import { useState, useCallback } from 'react';
import { ChannelParameters, CalculationResult } from '../stores/calculatorSlice';

/**
 * Hook for handling hydraulic calculations
 */
export const useChannelCalculations = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculate the water surface profile for a given channel
   */
  const calculateWaterSurfaceProfile = useCallback(async (params: ChannelParameters): Promise<{
    results: CalculationResult[];
    hydraulicJump: {
      occurs: boolean;
      station?: number;
      upstreamDepth?: number;
      downstreamDepth?: number;
    }
  }> => {
    setIsCalculating(true);
    setError(null);
    
    try {
      // Calculate critical and normal depths
      const criticalDepth = calculateCriticalDepth(params);
      const normalDepth = calculateNormalDepth(params);
      
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
        const sectionProps = calculateSectionProperties(currentDepth, params);
        const velocity = params.discharge / sectionProps.area;
        const froudeNumber = calculateFroudeNumber(currentDepth, velocity, sectionProps.topWidth);
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
        currentDepth = calculateNextDepth(
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
      const hydraulicJump = detectHydraulicJump(results);
      
      setIsCalculating(false);
      return {
        results,
        hydraulicJump
      };
    } catch (error) {
      setIsCalculating(false);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      throw error;
    }
  }, []);

  /**
   * Calculate section properties based on channel type
   */
  const calculateSectionProperties = (depth: number, params: ChannelParameters): {
    area: number;
    wetPerimeter: number;
    topWidth: number;
    hydraulicRadius: number;
  } => {
    switch (params.channelType) {
      case 'rectangular':
        return calculateRectangularSection(depth, params);
      case 'trapezoidal':
        return calculateTrapezoidalSection(depth, params);
      case 'triangular':
        return calculateTriangularSection(depth, params);
      case 'circular':
        return calculateCircularSection(depth, params);
      default:
        throw new Error(`Unsupported channel type: ${params.channelType}`);
    }
  };
  
  /**
   * Calculate properties for rectangular section
   */
  const calculateRectangularSection = (depth: number, params: ChannelParameters): {
    area: number;
    wetPerimeter: number;
    topWidth: number;
    hydraulicRadius: number;
  } => {
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
  };
  
  /**
   * Calculate properties for trapezoidal section
   */
  const calculateTrapezoidalSection = (depth: number, params: ChannelParameters): {
    area: number;
    wetPerimeter: number;
    topWidth: number;
    hydraulicRadius: number;
  } => {
    const sideSlope = params.sideSlope || 0;
    const topWidth = params.bottomWidth + 2 * sideSlope * depth;
    const area = (params.bottomWidth + sideSlope * depth) * depth;
    const wetPerimeter = params.bottomWidth + 2 * depth * Math.sqrt(1 + sideSlope * sideSlope);
    const hydraulicRadius = area / wetPerimeter;
    
    return {
      area,
      wetPerimeter,
      topWidth,
      hydraulicRadius
    };
  };
  
  /**
   * Calculate properties for triangular section
   */
  const calculateTriangularSection = (depth: number, params: ChannelParameters): {
    area: number;
    wetPerimeter: number;
    topWidth: number;
    hydraulicRadius: number;
  } => {
    const sideSlope = params.sideSlope || 1;
    const topWidth = 2 * sideSlope * depth;
    const area = sideSlope * depth * depth;
    const wetPerimeter = 2 * depth * Math.sqrt(1 + sideSlope * sideSlope);
    const hydraulicRadius = area / wetPerimeter;
    
    return {
      area,
      wetPerimeter,
      topWidth,
      hydraulicRadius
    };
  };
  
  /**
   * Calculate properties for circular section
   */
  const calculateCircularSection = (depth: number, params: ChannelParameters): {
    area: number;
    wetPerimeter: number;
    topWidth: number;
    hydraulicRadius: number;
  } => {
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
  };
  
  /**
   * Calculate critical depth for a channel
   */
  const calculateCriticalDepth = (params: ChannelParameters): number => {
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
          const section = calculateTrapezoidalSection(yc, params);
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
        const sideSlope = params.sideSlope || 1;
        return Math.pow(2 * q * q / (g * sideSlope * sideSlope), 1/5);
      
      case 'circular':
        // For circular channels, use iterative method
        const diameter = params.diameter || 1.0;
        let ycCircular = diameter / 4; // Initial guess
        error = 1;
        iterations = 0;
        
        while (error > 0.0001 && iterations < 100) {
          const section = calculateCircularSection(ycCircular, params);
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
  };
  
  /**
   * Calculate normal depth using Manning's equation
   */
  const calculateNormalDepth = (params: ChannelParameters): number => {
    const { manningN, channelSlope, discharge } = params;
    
    // Use iterative approach to solve Manning's equation
    let yn = 0.1; // Initial guess
    let error = 1;
    let iterations = 0;
    
    while (error > 0.0001 && iterations < 100) {
      const section = calculateSectionProperties(yn, params);
      
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
  };
  
  /**
   * Calculate the Froude number
   */
  const calculateFroudeNumber = (depth: number, velocity: number, topWidth: number): number => {
    const g = 9.81; // Gravitational acceleration
    const hydraulicDepth = depth; // Approximation for rectangular channels
    
    return velocity / Math.sqrt(g * hydraulicDepth);
  };
  
  /**
   * Calculate the next depth using the standard step method
   */
  const calculateNextDepth = (
    currentDepth: number, 
    velocity: number, 
    specificEnergy: number, 
    params: ChannelParameters, 
    deltaX: number, 
    stepDirection: number
  ): number => {
    // Calculate friction slope using Manning's equation
    const section = calculateSectionProperties(currentDepth, params);
    const frictionSlope = Math.pow(params.discharge * params.manningN / 
                        (section.area * Math.pow(section.hydraulicRadius, 2/3)), 2);
    
    // Estimate next depth
    let nextDepth = currentDepth;
    
    // Iterative solution for energy equation
    let error = 1;
    let iterations = 0;
    
    while (error > 0.0001 && iterations < 50) {
      const nextSection = calculateSectionProperties(nextDepth, params);
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
  };
  
  /**
   * Detect hydraulic jump in the results
   */
  const detectHydraulicJump = (results: CalculationResult[]): {
    occurs: boolean;
    station?: number;
    upstreamDepth?: number;
    downstreamDepth?: number;
  } => {
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
  };

  return {
    calculateWaterSurfaceProfile,
    calculateCriticalDepth,
    calculateNormalDepth,
    isCalculating,
    error
  };
};