// src/features/calculator/workers/calculationWorker.ts

/**
 * Worker Message Types
 * Define these directly to avoid circular imports
 */
const WorkerMessageType = {
  CALCULATE_WATER_SURFACE: 'calculateWaterSurface',
  CALCULATE_DETAILED_PROFILE: 'calculateDetailedProfile',
  CALCULATE_CRITICAL_DEPTH: 'calculateCriticalDepth',
  CALCULATE_NORMAL_DEPTH: 'calculateNormalDepth',
  PROGRESS_UPDATE: 'progressUpdate',
  CALCULATION_ERROR: 'calculationError',
  CALCULATION_RESULT: 'calculationResult',
  WORKER_READY: 'workerReady',
  TERMINATE: 'terminate'
};

// Signal that the worker is starting up
self.postMessage({
  type: 'debug',
  payload: 'Worker script starting initialization'
});

// Track import success/failure
let importsSuccessful = false;

// Define types for the worker module functions
type WaterSurfaceProfileFn = (params: any) => any;
type DetailedProfileFn = (params: any) => any;
type CriticalDepthFn = (params: any) => number;
type NormalDepthFn = (params: any) => number;

// Worker modules and functions will be stored here
const workerModules: {
  calculateWaterSurfaceProfile: WaterSurfaceProfileFn | null;
  calculateDetailedProfile: DetailedProfileFn | null;
  calculateCriticalDepth: CriticalDepthFn | null;
  calculateNormalDepth: NormalDepthFn | null;
} = {
  calculateWaterSurfaceProfile: null,
  calculateDetailedProfile: null,
  calculateCriticalDepth: null,
  calculateNormalDepth: null
};

// Attempt to dynamically import the modules
async function loadModules() {
  try {
    // Dynamically import modules to avoid circular dependencies
    const hydraulicsModule = await import('../utils/hydraulics/index.js');
    
    // Store the imported functions
    workerModules.calculateWaterSurfaceProfile = hydraulicsModule.calculateWaterSurfaceProfile;
    workerModules.calculateDetailedProfile = hydraulicsModule.calculateDetailedProfile;
    workerModules.calculateCriticalDepth = hydraulicsModule.calculateCriticalDepth;
    workerModules.calculateNormalDepth = hydraulicsModule.calculateNormalDepth;
    
    importsSuccessful = true;
    
    self.postMessage({
      type: 'debug',
      payload: 'Worker modules loaded successfully'
    });
    
    // Signal that the worker is ready
    self.postMessage({
      type: WorkerMessageType.WORKER_READY,
      payload: {
        capabilities: {
          canCalculate: true,
          importsSuccessful: true
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('Failed to load worker modules:', error);
    
    self.postMessage({
      type: 'debug',
      payload: `Worker failed to load modules: ${error instanceof Error ? error.message : String(error)}`
    });
    
    // Signal that the worker is ready but with limited capabilities
    self.postMessage({
      type: WorkerMessageType.WORKER_READY,
      payload: {
        capabilities: {
          canCalculate: false,
          importsSuccessful: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    });
    
    return false;
  }
}

// Start loading modules immediately
loadModules().catch(error => {
  console.error('Unhandled error during module loading:', error);
});

// Add global error handler
self.addEventListener('error', (event) => {
  console.error('Worker error:', event.message, event.filename, event.lineno);
  
  self.postMessage({
    type: WorkerMessageType.CALCULATION_ERROR,
    payload: `Worker error: ${event.message} at ${event.filename}:${event.lineno}`,
    id: 'global-error'
  });
});

// Add unhandled rejection handler
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection in worker:', event.reason);
  
  self.postMessage({
    type: WorkerMessageType.CALCULATION_ERROR,
    payload: `Unhandled rejection in worker: ${event.reason}`,
    id: 'global-rejection'
  });
});

/**
 * Worker context
 * In a Web Worker, 'self' refers to the worker's global scope
 */
const ctx: Worker = self as any;

/**
 * Report progress to the main thread
 * @param progress Progress value (0-100)
 * @param id Message ID
 */
function reportProgress(progress: number, id?: string): void {
  ctx.postMessage({
    type: WorkerMessageType.PROGRESS_UPDATE,
    payload: { progress },
    id
  });
}

/**
 * Main message handler for the worker
 * Receives calculation requests from the main thread
 */
ctx.addEventListener('message', async (event) => {
  // Get message data
  const { type, payload, id } = event.data;

  // Skip if message is invalid
  if (!type) {
    return;
  }

  // If modules aren't loaded yet and this isn't a termination message,
  // wait for modules to load before processing
  if (!importsSuccessful && type !== WorkerMessageType.TERMINATE) {
    try {
      const success = await loadModules();
      if (!success) {
        ctx.postMessage({
          type: WorkerMessageType.CALCULATION_ERROR,
          payload: 'Worker modules failed to load',
          id
        });
        return;
      }
    } catch (error) {
      ctx.postMessage({
        type: WorkerMessageType.CALCULATION_ERROR,
        payload: `Failed to load worker modules: ${error instanceof Error ? error.message : String(error)}`,
        id
      });
      return;
    }
  }

  try {
    switch (type) {
      case WorkerMessageType.CALCULATE_WATER_SURFACE:
        // Calculate water surface profile
        await handleWaterSurfaceCalculation(payload, id);
        break;

      case WorkerMessageType.CALCULATE_DETAILED_PROFILE:
        // Calculate detailed profile
        await handleDetailedProfileCalculation(payload, id);
        break;

      case WorkerMessageType.CALCULATE_CRITICAL_DEPTH:
        // Calculate critical depth
        handleCriticalDepthCalculation(payload, id);
        break;

      case WorkerMessageType.CALCULATE_NORMAL_DEPTH:
        // Calculate normal depth
        handleNormalDepthCalculation(payload, id);
        break;

      case WorkerMessageType.TERMINATE:
        // Terminate the worker
        console.log('Worker received termination message');
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
        ctx.postMessage({
          type: WorkerMessageType.CALCULATION_ERROR,
          payload: `Unknown message type: ${type}`,
          id
        });
    }
  } catch (error) {
    // Send error message back to main thread
    ctx.postMessage({
      type: WorkerMessageType.CALCULATION_ERROR,
      payload: error instanceof Error ? error.message : 'Unknown calculation error',
      id
    });
  }
});

/**
 * Handle water surface profile calculation
 * @param payload Message payload
 * @param id Message ID
 */
async function handleWaterSurfaceCalculation(payload: any, id?: string): Promise<void> {
  try {
    const { params, options } = payload;
    
    // Report initial progress
    reportProgress(0, id);
    
    // Real start time for progress calculation
    const startTime = performance.now();
    // Estimated total calculation time (ms)
    const estimatedDuration = 2000; 
    
    // Create progress tracker that uses time-based estimation
    let progressInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const estimatedProgress = Math.min(90, (elapsed / estimatedDuration) * 100);
      reportProgress(Math.round(estimatedProgress), id);
    }, 100);
    
    // Check if calculation function is available
    if (!workerModules.calculateWaterSurfaceProfile) {
      clearInterval(progressInterval);
      throw new Error('Calculation function not available');
    }
    
    // Check if high-resolution calculation is requested
    let results;
    if (options?.highResolution) {
      // Use high-resolution calculation with type safety check
      const fn = workerModules.calculateWaterSurfaceProfile;
      results = fn({
        ...params,
        _highResolution: true,
        _numSteps: 300 // Increase number of calculation points
      });
    } else {
      // Use standard calculation with type safety check
      const fn = workerModules.calculateWaterSurfaceProfile;
      results = fn(params);
    }
    
    // Clear progress interval
    clearInterval(progressInterval);
    
    // Final progress update
    reportProgress(100, id);
    
    // Send results back to main thread
    ctx.postMessage({
      type: WorkerMessageType.CALCULATION_RESULT,
      payload: results,
      id
    });
  } catch (error) {
    // Send error message back to main thread
    ctx.postMessage({
      type: WorkerMessageType.CALCULATION_ERROR,
      payload: error instanceof Error ? error.message : 'Unknown calculation error',
      id
    });
  }
}

/**
 * Handle detailed profile calculation
 * @param payload Message payload
 * @param id Message ID
 */
async function handleDetailedProfileCalculation(payload: any, id?: string): Promise<void> {
  try {
    const { params } = payload;
    
    // Report initial progress
    reportProgress(0, id);
    
    // Real start time for progress calculation
    const startTime = performance.now();
    // Estimated total calculation time (ms)
    const estimatedDuration = 2500;
    
    // Create progress tracker that uses time-based estimation
    let progressInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const estimatedProgress = Math.min(90, (elapsed / estimatedDuration) * 100);
      reportProgress(Math.round(estimatedProgress), id);
    }, 100);
    
    // Check if calculation function is available
    if (!workerModules.calculateDetailedProfile) {
      clearInterval(progressInterval);
      throw new Error('Calculation function not available');
    }
    
    // Calculate detailed profile with type safety check
    const fn = workerModules.calculateDetailedProfile;
    const result = fn(params);
    
    // Clear progress interval
    clearInterval(progressInterval);
    
    // Final progress update
    reportProgress(100, id);
    
    // Check for errors
    if (result.error) {
      // Send error message back to main thread
      ctx.postMessage({
        type: WorkerMessageType.CALCULATION_ERROR,
        payload: result.error,
        id
      });
      return;
    }
    
    // Send results back to main thread
    ctx.postMessage({
      type: WorkerMessageType.CALCULATION_RESULT,
      payload: result.results,
      id
    });
  } catch (error) {
    // Send error message back to main thread
    ctx.postMessage({
      type: WorkerMessageType.CALCULATION_ERROR,
      payload: error instanceof Error ? error.message : 'Unknown calculation error',
      id
    });
  }
}

/**
 * Handle critical depth calculation
 * @param payload Message payload
 * @param id Message ID
 */
function handleCriticalDepthCalculation(payload: any, id?: string): void {
  try {
    const { params } = payload;
    
    // Check if calculation function is available
    if (!workerModules.calculateCriticalDepth) {
      throw new Error('Calculation function not available');
    }
    
    // Calculate critical depth with type safety check
    const fn = workerModules.calculateCriticalDepth;
    const result = fn(params);
    
    // Send results back to main thread
    ctx.postMessage({
      type: WorkerMessageType.CALCULATION_RESULT,
      payload: result,
      id
    });
  } catch (error) {
    // Send error message back to main thread
    ctx.postMessage({
      type: WorkerMessageType.CALCULATION_ERROR,
      payload: error instanceof Error ? error.message : 'Unknown calculation error',
      id
    });
  }
}

/**
 * Handle normal depth calculation
 * @param payload Message payload
 * @param id Message ID
 */
function handleNormalDepthCalculation(payload: any, id?: string): void {
  try {
    const { params } = payload;
    
    // Check if calculation function is available
    if (!workerModules.calculateNormalDepth) {
      throw new Error('Calculation function not available');
    }
    
    // Calculate normal depth with type safety check
    const fn = workerModules.calculateNormalDepth;
    const result = fn(params);
    
    // Send results back to main thread
    ctx.postMessage({
      type: WorkerMessageType.CALCULATION_RESULT,
      payload: result,
      id
    });
  } catch (error) {
    // Send error message back to main thread
    ctx.postMessage({
      type: WorkerMessageType.CALCULATION_ERROR,
      payload: error instanceof Error ? error.message : 'Unknown calculation error',
      id
    });
  }
}