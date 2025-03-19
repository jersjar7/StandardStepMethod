// src/features/calculator/workers/calculationWorkerFallback.js

/**
 * This is a fallback implementation of the worker that doesn't use ES modules.
 * It's used when the browser doesn't support module workers.
 */

// Define message types
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
    payload: 'Fallback worker script starting initialization'
  });
  
  /**
   * Report progress to the main thread
   * @param {number} progress Progress value (0-100)
   * @param {string} id Message ID
   */
  function reportProgress(progress, id) {
    self.postMessage({
      type: WorkerMessageType.PROGRESS_UPDATE,
      payload: { progress },
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
  
  // Signal that the worker is ready - in this fallback, we can't actually perform calculations
  // but we can at least handle messages and report errors properly
  self.postMessage({
    type: WorkerMessageType.WORKER_READY,
    payload: {
      capabilities: {
        canCalculate: false, // Indicate that this worker can't actually calculate
        isFullyFunctional: false,
        isFallback: true     // Indicate that this is a fallback worker
      }
    }
  });
  
  // Add global error handler
  self.addEventListener('error', (event) => {
    console.error('Fallback worker error:', event.message, event.filename, event.lineno);
    
    self.postMessage({
      type: WorkerMessageType.CALCULATION_ERROR,
      payload: `Fallback worker error: ${event.message} at ${event.filename}:${event.lineno}`,
      id: 'global-error'
    });
  });
  
  /**
   * Main message handler for the worker
   * In this fallback, we don't actually perform calculations but simulate progress and return errors
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
  
    // Simulate progress updates for calculation requests
    if (type === WorkerMessageType.CALCULATE_WATER_SURFACE || 
        type === WorkerMessageType.CALCULATE_DETAILED_PROFILE) {
      
      // Report initial progress
      reportProgress(0, id);
      
      // Simulate calculation with progress updates
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        if (progress >= 100) {
          clearInterval(progressInterval);
          progress = 100;
        }
        reportProgress(progress, id);
        
        // At the end, report that calculation failed
        if (progress === 100) {
          reportError('Calculation not supported in fallback worker', id);
        }
      }, 200);
    } else {
      // For simpler calculations, just report failure immediately
      reportError('Calculation not supported in fallback worker', id);
    }
  });