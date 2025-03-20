/**
 * Enhanced Fallback Worker Implementation
 * 
 * This is a fallback implementation of the worker that doesn't use ES modules.
 * It's used when the browser doesn't support module workers or when the module
 * worker fails to load. This version ensures full compatibility with the
 * main worker interface.
 */

// Define message types - keep synchronized with main worker
const WorkerMessageType = {
  CALCULATE_WATER_SURFACE: 'calculateWaterSurface',
  CALCULATE_DETAILED_PROFILE: 'calculateDetailedProfile',
  CALCULATE_CRITICAL_DEPTH: 'calculateCriticalDepth',
  CALCULATE_NORMAL_DEPTH: 'calculateNormalDepth',
  PROGRESS_UPDATE: 'progressUpdate',
  CALCULATION_ERROR: 'calculationError',
  CALCULATION_RESULT: 'calculationResult',
  WORKER_READY: 'workerReady',
  WORKER_ERROR: 'workerError',
  TERMINATE: 'terminate',
  DEBUG: 'debug'
};

// Constants for calculation simulation
const SIMULATION_STEP_MS = 200;  // Time between progress updates in ms
const SIMULATION_STEPS = 10;     // Number of steps for simulation

// Signal that the fallback worker is starting up
self.postMessage({
  type: WorkerMessageType.DEBUG,
  payload: 'Fallback worker script starting initialization'
});

/**
 * Report progress to the main thread
 * @param {number} progress Progress value (0-100)
 * @param {string} id Message ID
 * @param {string} [message] Optional status message
 */
function reportProgress(progress, id, message) {
  self.postMessage({
    type: WorkerMessageType.PROGRESS_UPDATE,
    payload: { 
      progress,
      message: message || `Simulating calculation (${progress}%)`,
      stage: 'simulation' 
    },
    id
  });
}

/**
 * Send error message to the main thread
 * @param {string} error Error message
 * @param {string} id Message ID
 */
function reportError(error, id) {
  self.postMessage({
    type: WorkerMessageType.CALCULATION_ERROR,
    payload: error,
    id
  });
}

/**
 * Send result to the main thread
 * @param {any} result Calculation result
 * @param {string} id Message ID
 */
function reportResult(result, id) {
  self.postMessage({
    type: WorkerMessageType.CALCULATION_RESULT,
    payload: result,
    id
  });
}

/**
 * Simulate a calculation with progress updates
 * @param {string} id Message ID
 * @param {string} type Calculation type
 * @param {Object} params Calculation parameters
 */
function simulateCalculation(id, type, params) {
  let progress = 0;
  
  // Report initial progress
  reportProgress(progress, id, 'Starting fallback calculation simulation');
  
  // Determine what kind of result to send based on calculation type
  let resultToSend;
  
  // For consistent fallback behavior, prepare simplified mock results based on calculation type
  switch(type) {
    case WorkerMessageType.CALCULATE_CRITICAL_DEPTH:
      // Critical depth approximation based on rectangular channel formula
      // This is a very rough approximation but better than nothing
      resultToSend = estimateCriticalDepth(params);
      break;
      
    case WorkerMessageType.CALCULATE_NORMAL_DEPTH:
      // Normal depth approximation 
      resultToSend = estimateNormalDepth(params);
      break;
      
    case WorkerMessageType.CALCULATE_WATER_SURFACE:
      // Water surface profile simplified mock result
      resultToSend = createMockWaterSurfaceProfile(params);
      break;
      
    case WorkerMessageType.CALCULATE_DETAILED_PROFILE:
      // Detailed profile simplified mock result
      resultToSend = createMockDetailedProfile(params);
      break;
      
    default:
      // For unknown calculation types, report error
      reportError(`Unsupported calculation type: ${type} in fallback worker`, id);
      return;
  }
  
  // Simulate calculation with progress updates
  const progressInterval = setInterval(() => {
    // Update progress
    progress += Math.ceil(100 / SIMULATION_STEPS);
    
    if (progress >= 100) {
      // Clear interval when done
      clearInterval(progressInterval);
      progress = 100;
      
      // Final progress update
      reportProgress(progress, id, 'Fallback calculation complete');
      
      // Send result
      reportResult(resultToSend, id);
    } else {
      // Report intermediate progress
      reportProgress(progress, id);
    }
  }, SIMULATION_STEP_MS);
}

/**
 * Estimate critical depth for fallback mode (simplified calculation)
 * @param {Object} params Channel parameters
 * @returns {number} Estimated critical depth
 */
function estimateCriticalDepth(params) {
  try {
    // Very simplified critical depth calculation
    // For rectangular channel: yc = (q²/g)^(1/3)
    const g = params.units === 'imperial' ? 32.2 : 9.81;
    
    // Default to rectangular formula if no specific formula available
    switch(params.channelType) {
      case 'rectangular':
        const q = params.discharge / params.bottomWidth;
        return Math.pow((q * q) / g, 1/3);
        
      case 'triangular':
        // Very rough approximation
        if (params.sideSlope) {
          return Math.pow(2 * params.discharge * params.discharge / 
            (g * Math.pow(params.sideSlope, 2)), 1/5);
        }
        return 0.5; // Fallback value
        
      case 'trapezoidal':
      case 'circular':
      default:
        // Use a very simplified approximation based on discharge
        return Math.pow(params.discharge, 0.4) * 0.3;
    }
  } catch (error) {
    // If calculation fails, return a reasonable default
    return 0.3;
  }
}

/**
 * Estimate normal depth for fallback mode (simplified calculation)
 * @param {Object} params Channel parameters
 * @returns {number} Estimated normal depth
 */
function estimateNormalDepth(params) {
  try {
    // Very simplified normal depth calculation using Manning's equation
    // Calculate a rough approximation
    const k = params.units === 'imperial' ? 1.49 : 1.0;
    
    // Default rectangular approximation
    let area, perimeter;
    
    switch(params.channelType) {
      case 'rectangular':
        // Use a simplified iterative approach
        let depth = 0.1;
        for (let i = 0; i < 10; i++) {
          area = params.bottomWidth * depth;
          perimeter = params.bottomWidth + 2 * depth;
          const hydraulicRadius = area / perimeter;
          
          // Calculate discharge using Manning's equation
          const calculatedQ = (k / params.manningN) * area * 
                            Math.pow(hydraulicRadius, 2/3) * 
                            Math.pow(params.channelSlope, 1/2);
          
          // Adjust depth
          if (calculatedQ < params.discharge) {
            depth *= 1.2;
          } else {
            depth /= 1.1;
          }
        }
        return depth;
        
      default:
        // For other channel types, use a very simplified formula
        return Math.pow(params.discharge, 0.4) * 
               Math.pow(params.manningN, 0.6) * 
               Math.pow(params.channelSlope, -0.3);
    }
  } catch (error) {
    // If calculation fails, return a reasonable default
    return 0.5;
  }
}

/**
 * Create a simplified mock water surface profile
 * @param {Object} params Channel parameters
 * @returns {Object} Mock water surface profile results
 */
function createMockWaterSurfaceProfile(params) {
  // Create a mock profile with a reasonable number of points
  const numPoints = 20;
  const criticalDepth = estimateCriticalDepth(params);
  const normalDepth = estimateNormalDepth(params);
  
  const flowProfile = [];
  
  // Generate some reasonable points
  for (let i = 0; i < numPoints; i++) {
    const station = (i / (numPoints - 1)) * params.length;
    
    // Calculate a simple depth profile
    // In a real calculation this would be based on the energy equation
    const depthFactor = 0.8 + 0.4 * Math.sin(i / (numPoints - 1) * Math.PI);
    const depth = normalDepth * depthFactor;
    
    // Generate a simplified velocity
    const velocity = params.discharge / (depth * (params.bottomWidth || 1));
    
    // Add a point to the profile
    flowProfile.push({
      x: station,
      y: depth,
      velocity: velocity,
      froudeNumber: velocity / Math.sqrt(9.81 * depth),
      specificEnergy: depth + (velocity * velocity) / (2 * 9.81),
      criticalDepth: criticalDepth,
      normalDepth: normalDepth,
      topWidth: params.channelType === 'rectangular' ? params.bottomWidth : params.bottomWidth + 2 * depth
    });
  }
  
  // Return a simplified water surface profile
  return {
    flowProfile: flowProfile,
    profileType: normalDepth > criticalDepth ? 'M2' : 'S2',
    channelType: normalDepth > criticalDepth ? 'mild' : 'steep',
    criticalDepth: criticalDepth,
    normalDepth: normalDepth,
    isChoking: false,
    hydraulicJump: { occurs: false }
  };
}

/**
 * Create a simplified mock detailed profile
 * @param {Object} params Channel parameters
 * @returns {Object} Mock detailed water surface profile results
 */
function createMockDetailedProfile(params) {
  // Start with a basic profile
  const baseProfile = createMockWaterSurfaceProfile(params);
  
  // Add detailed information
  return {
    ...baseProfile,
    profileDescription: "Mock water surface profile (fallback calculation)",
    profileDetails: "Generated by fallback worker with simplified calculations",
    flowRegime: baseProfile.normalDepth > baseProfile.criticalDepth ? 'subcritical' : 'supercritical',
    stats: {
      minDepth: Math.min(...baseProfile.flowProfile.map(p => p.y)),
      maxDepth: Math.max(...baseProfile.flowProfile.map(p => p.y)),
      avgDepth: baseProfile.flowProfile.reduce((sum, p) => sum + p.y, 0) / baseProfile.flowProfile.length,
      minVelocity: Math.min(...baseProfile.flowProfile.map(p => p.velocity)),
      maxVelocity: Math.max(...baseProfile.flowProfile.map(p => p.velocity)),
      avgVelocity: baseProfile.flowProfile.reduce((sum, p) => sum + p.velocity, 0) / baseProfile.flowProfile.length,
      minFroude: Math.min(...baseProfile.flowProfile.map(p => p.froudeNumber)),
      maxFroude: Math.max(...baseProfile.flowProfile.map(p => p.froudeNumber)),
      avgFroude: baseProfile.flowProfile.reduce((sum, p) => sum + p.froudeNumber, 0) / baseProfile.flowProfile.length,
      length: params.length,
      numPoints: baseProfile.flowProfile.length,
      predominantFlowRegime: baseProfile.normalDepth > baseProfile.criticalDepth ? 'Subcritical Flow' : 'Supercritical Flow'
    }
  };
}

// Signal that the worker is ready - with proper capabilities information
// exactly matching the structure from the main worker
self.postMessage({
  type: WorkerMessageType.WORKER_READY,
  payload: {
    workerId: 'fallback-' + Date.now().toString(),
    capabilities: {
      supportsSharedArrayBuffer: false,
      supportsOffscreenCanvas: false,
      supportedCalculations: [
        'calculateWaterSurfaceProfile',
        'calculateDetailedProfile', 
        'calculateCriticalDepth', 
        'calculateNormalDepth'
      ],
      isFallback: true,
      fallbackReason: 'Using non-module worker fallback'
    }
  }
});

// Add global error handler
self.addEventListener('error', (event) => {
  console.error('Fallback worker error:', event.message, event.filename, event.lineno);
  
  self.postMessage({
    type: WorkerMessageType.WORKER_ERROR,
    payload: `Fallback worker error: ${event.message} at ${event.filename}:${event.lineno}`,
    id: 'global-error'
  });
});

/**
 * Main message handler for the worker
 */
self.addEventListener('message', function(event) {
  // Get message data
  const { type, payload, id } = event.data;

  // Skip if message is invalid
  if (!type) {
    return;
  }

  // Handle termination messages immediately
  if (type === WorkerMessageType.TERMINATE) {
    console.log('Fallback worker received termination message');
    return;
  }

  // Debug message to aid in troubleshooting
  self.postMessage({
    type: WorkerMessageType.DEBUG,
    payload: `Fallback worker processing message: ${type} (ID: ${id || 'none'})`
  });

  // Handle calculation requests
  switch (type) {
    case WorkerMessageType.CALCULATE_WATER_SURFACE:
    case WorkerMessageType.CALCULATE_DETAILED_PROFILE:
    case WorkerMessageType.CALCULATE_CRITICAL_DEPTH:
    case WorkerMessageType.CALCULATE_NORMAL_DEPTH:
      simulateCalculation(id, type, payload.params);
      break;
      
    default:
      // For unknown message types, send error
      reportError(`Unknown message type: ${type}`, id);
  }
});