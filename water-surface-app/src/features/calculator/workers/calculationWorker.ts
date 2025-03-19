// src/features/calculator/workers/calculationWorker.ts

console.log('Worker initializing, attempting to import utilities...');
// Keep imports at the top level as required
import { 
  calculateWaterSurfaceProfile,
  calculateDetailedProfile,
  calculateCriticalDepth,
  calculateNormalDepth
} from '../utils/hydraulics/index';  // More specific import path

import { WorkerMessageType } from '../services/workerManager';

console.log('Imports successful!');

// This will be sent even if other worker initialization fails
self.postMessage({
  type: 'debug',
  payload: 'Worker script loaded and executed',
});

// Add global error handler
self.addEventListener('error', (event) => {
  console.error('Worker error:', event.message, event.filename, event.lineno);
  self.postMessage({
    type: 'calculationError',
    payload: `Worker error: ${event.message} at ${event.filename}:${event.lineno}`,
    id: 'global-error'
  });
});

// Add unhandled rejection handler
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection in worker:', event.reason);
  self.postMessage({
    type: 'calculationError',
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

  try {
    switch (type) {
      case WorkerMessageType.CALCULATE_WATER_SURFACE:
        // Calculate water surface profile
        handleWaterSurfaceCalculation(payload, id);
        break;

      case WorkerMessageType.CALCULATE_DETAILED_PROFILE:
        // Calculate detailed profile
        handleDetailedProfileCalculation(payload, id);
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
        // In a real worker context, we would just return as the main thread
        // will terminate this worker after sending this message
        console.log('Worker received termination message');
        break;

      default:
        console.warn(`Unknown message type: ${type}`);
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
function handleWaterSurfaceCalculation(payload: any, id?: string): void {
  try {
    const { params, options } = payload;
    
    // Report initial progress - removed options?.onProgress check
    reportProgress(0, id);
    
    // Enable progress monitoring for longer calculations
    const progressMonitoring = setInterval(() => {
      // This is a simplified simulation of progress
      // In a real implementation, the calculation would report actual progress
      const randomProgress = Math.floor(Math.random() * 20) + 1;
      reportProgress(randomProgress, id);
    }, 200);
    
    // Check if high-resolution calculation is requested
    let results;
    if (options?.highResolution) {
      // Use high-resolution calculation
      results = calculateWaterSurfaceProfile({
        ...params,
        _highResolution: true,
        _numSteps: 300 // Increase number of calculation points
      });
    } else {
      // Use standard calculation
      results = calculateWaterSurfaceProfile(params);
    }
    
    // Clear progress monitoring
    clearInterval(progressMonitoring);
    
    // Final progress update - removed options?.onProgress check
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
function handleDetailedProfileCalculation(payload: any, id?: string): void {
  try {
    const { params } = payload;
    
    // Report initial progress - removed options?.onProgress check
    reportProgress(0, id);
    
    // Enable progress monitoring for longer calculations
    const progressMonitoring = setInterval(() => {
      // This is a simplified simulation of progress
      // In a real implementation, the calculation would report actual progress
      const randomProgress = Math.floor(Math.random() * 20) + 1;
      reportProgress(randomProgress, id);
    }, 200);
    
    // Calculate detailed profile
    const result = calculateDetailedProfile(params);
    
    // Clear progress monitoring
    clearInterval(progressMonitoring);
    
    // Final progress update - removed options?.onProgress check
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
    
    // Calculate critical depth
    const result = calculateCriticalDepth(params);
    
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
    
    // Calculate normal depth
    const result = calculateNormalDepth(params);
    
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

// Signal that the worker is ready
console.log('Hydraulic calculation worker initialized');