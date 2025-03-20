// src/features/calculator/services/workerManager.ts

import { ChannelParams, WaterSurfaceProfileResults, DetailedWaterSurfaceResults } from '../types';
import { ProgressCallback } from './calculationService';

/**
 * Worker calculation message types
 */
export enum WorkerMessageType {
  CALCULATE_WATER_SURFACE = 'calculateWaterSurface',
  CALCULATE_DETAILED_PROFILE = 'calculateDetailedProfile',
  CALCULATE_CRITICAL_DEPTH = 'calculateCriticalDepth',
  CALCULATE_NORMAL_DEPTH = 'calculateNormalDepth',
  PROGRESS_UPDATE = 'progressUpdate',
  CALCULATION_ERROR = 'calculationError',
  CALCULATION_RESULT = 'calculationResult',
  WORKER_READY = 'workerReady',
  TERMINATE = 'terminate',
  DEBUG = 'debug' // Added debug message type
}

/**
 * Worker message structure
 */
export interface WorkerMessage {
  type: WorkerMessageType | string;
  payload?: any;
  id?: string; // Message ID for tracking requests
}

/**
 * Worker calculation options
 */
export interface WorkerCalculationOptions {
  highResolution?: boolean;
  timeout?: number;
  onProgress?: ProgressCallback;
}

/**
 * Default calculation options
 */
const defaultCalculationOptions: WorkerCalculationOptions = {
  highResolution: false,
  timeout: 30000
};

/**
 * Worker state enum
 */
enum WorkerState {
  INITIALIZING = 'initializing',
  READY = 'ready',
  FAILED = 'failed',
  TERMINATED = 'terminated'
}

/**
 * Worker Manager
 * 
 * Handles creation, communication, and termination of Web Workers
 * for hydraulic calculations.
 */
class WorkerManager {
  private worker: Worker | null = null;
  private workerState: WorkerState = WorkerState.FAILED;
  private pendingRequests: Map<string, { 
    resolve: (value: any) => void; 
    reject: (reason: any) => void;
    timeoutId?: number;
    onProgress?: (progress: number) => void;
  }> = new Map();
  private pendingMessages: WorkerMessage[] = [];
  private nextRequestId = 1;
  private initAttempted = false;
  private workerInitTimeout: number | null = null;
  private workerId: string | null = null;

  /**
   * Create a new worker manager
   */
  constructor() {
    this.initWorker();
  }

  /**
 * Initialize the worker if needed and supported
 */
private initWorker(): void {
  console.log("Attempting to initialize worker...");
  
  // Only create the worker if it's not already created and the browser supports Web Workers
  if (!this.worker && this.isWorkerSupported() && !this.initAttempted) {
    this.initAttempted = true;
    this.workerState = WorkerState.INITIALIZING;
    
    try {
      console.log("Creating new worker instance...");
      
      // Check module worker support first to avoid unrecoverable errors
      if (this.isModuleWorkerSupported()) {
        // Create a new worker with module type
        this.worker = new Worker(new URL('../workers/calculationWorker.ts', import.meta.url), { type: 'module' });
      } else {
        // Fallback to classic worker if module workers not supported
        console.log("Module workers not supported, falling back to classic worker");
        this.worker = new Worker(new URL('../workers/calculationWorkerFallback.js', import.meta.url));
      }
      
      console.log("Worker created, setting up message handlers...");
      
      // Set up message handler
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      
      // Set up error handler
      this.worker.onerror = this.handleWorkerError.bind(this);
      
      // Wait for worker ready message or timeout
      // Increased timeout significantly for slower environments or complex initialization
      this.workerInitTimeout = window.setTimeout(() => {
        // Only mark as ready if we're still initializing
        if (this.workerState === WorkerState.INITIALIZING) {
          console.warn("Worker ready timeout - worker did not send ready message");
          // Change from automatically marking as ready to failed
          // since we didn't receive proper initialization
          this.workerState = WorkerState.FAILED;
          console.log("Worker initialization failed (timeout). Using direct calculations.");
          // Process pending requests with error to avoid hanging
          this.processPendingRequests(new Error('Worker initialization timed out'));
        }
      }, 10000); // Increased timeout from 5000ms to 10000ms
      
      console.log("Worker initialization initiated");
    } catch (error) {
      this.handleWorkerInitializationFailure(error);
    }
  } else if (this.initAttempted && !this.worker) {
    console.log("Worker initialization already failed before, not retrying");
  } else if (this.worker) {
    console.log("Worker already exists");
  } else {
    console.log("Web Workers not supported");
  }
}

  /**
   * Handle worker initialization failure
   * @param error Error that occurred during initialization
   */
  private handleWorkerInitializationFailure(error: any): void {
    console.error('Failed to initialize calculation worker:', error);
    this.worker = null;
    this.workerState = WorkerState.FAILED;
    
    // Clear worker init timeout if set
    if (this.workerInitTimeout !== null) {
      window.clearTimeout(this.workerInitTimeout);
      this.workerInitTimeout = null;
    }
    
    // Fall back to non-worker calculations
    this.processPendingRequests(new Error('Worker initialization failed: ' + (error instanceof Error ? error.message : String(error))));
  }

  /**
   * Process any pending messages when the worker becomes ready
   */
  private processPendingMessages(): void {
    if (this.worker && this.workerState === WorkerState.READY) {
      while (this.pendingMessages.length > 0) {
        const message = this.pendingMessages.shift();
        if (message) {
          console.log(`Sending pending message: ${message.type} (ID: ${message.id})`);
          try {
            this.worker.postMessage(message);
          } catch (error) {
            console.error(`Failed to send pending message: ${message.type}`, error);
            // Handle the failure for this specific message
            if (message.id && this.pendingRequests.has(message.id)) {
              const request = this.pendingRequests.get(message.id)!;
              request.reject(new Error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`));
              this.pendingRequests.delete(message.id);
            }
          }
        }
      }
    }
  }

  /**
   * Process pending requests with an error, used when worker fails
   */
  private processPendingRequests(error: Error): void {
    this.pendingRequests.forEach((request, key) => {
      // Skip worker init request
      if (key !== 'worker-init') {
        request.reject(error);
        
        // Clear timeout if set
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }
      }
    });
    
    // Clear pending requests except worker init
    const workerInitRequest = this.pendingRequests.get('worker-init');
    this.pendingRequests.clear();
    
    // Restore worker init request if it exists
    if (workerInitRequest) {
      this.pendingRequests.set('worker-init', workerInitRequest);
    }
    
    // Clear pending messages
    this.pendingMessages = [];
  }

  /**
   * Handle messages from the worker
   * @param event Worker message event
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const message = event.data as WorkerMessage;
    
    // Skip if message is invalid
    if (!message || !message.type) {
      console.warn('Received invalid message from worker');
      return;
    }
    
    console.log(`Received message from worker: ${message.type} (ID: ${message.id || 'none'})`);
    
    switch (message.type) {
      case WorkerMessageType.WORKER_READY:
        // Handle worker ready message
        console.log("Worker reported ready");
        
        // Clear init timeout if it exists
        if (this.workerInitTimeout !== null) {
          window.clearTimeout(this.workerInitTimeout);
          this.workerInitTimeout = null;
        }
        
        // Store worker ID if provided
        if (message.payload && message.payload.workerId) {
          this.workerId = message.payload.workerId;
        }
        
        // Mark worker as ready and process pending messages
        this.workerState = WorkerState.READY;
        this.processPendingMessages();
        
        // Resolve any pending worker-init request
        if (this.pendingRequests.has('worker-init')) {
          this.pendingRequests.get('worker-init')!.resolve(true);
          this.pendingRequests.delete('worker-init');
        }
        break;
        
      case WorkerMessageType.CALCULATION_RESULT:
        // Handle calculation result
        if (message.id && this.pendingRequests.has(message.id)) {
          const request = this.pendingRequests.get(message.id)!;
          
          // Clear timeout if set
          if (request.timeoutId) {
            clearTimeout(request.timeoutId);
          }
          
          // Resolve the promise with the result
          request.resolve(message.payload);
          
          // Remove the request from pending requests
          this.pendingRequests.delete(message.id);
        }
        break;
        
      case WorkerMessageType.CALCULATION_ERROR:
        // Handle calculation error
        if (message.id && this.pendingRequests.has(message.id)) {
          const request = this.pendingRequests.get(message.id)!;
          
          // Clear timeout if set
          if (request.timeoutId) {
            clearTimeout(request.timeoutId);
          }
          
          // Reject the promise with the error
          request.reject(new Error(message.payload));
          
          // Remove the request from pending requests
          this.pendingRequests.delete(message.id);
        } else if (message.id === 'worker-init') {
          // This is an error from worker initialization
          console.error('Worker initialization error:', message.payload);
          this.workerState = WorkerState.FAILED;
        } else if (!message.id) {
          // This is a global worker error
          console.error('Worker error:', message.payload);
        }
        break;
        
      case WorkerMessageType.PROGRESS_UPDATE:
        // Handle progress update
        if (message.id && this.pendingRequests.has(message.id)) {
          const request = this.pendingRequests.get(message.id)!;
          
          // Call progress callback if available using the stored callback
          if (request.onProgress && typeof request.onProgress === 'function') {
            request.onProgress(message.payload.progress);
          }
        }
        break;
        
      case WorkerMessageType.DEBUG:
        // Handle debug messages
        console.log(`Worker debug:`, message.payload);
        break;
        
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle worker errors
   * @param error Worker error event
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);
    
    // Mark worker as failed
    this.workerState = WorkerState.FAILED;
    
    // Clear init timeout if it exists
    if (this.workerInitTimeout !== null) {
      window.clearTimeout(this.workerInitTimeout);
      this.workerInitTimeout = null;
    }
    
    // Create error message
    const errorMessage = `Worker error: ${error.message}`;
    
    // Reject worker init request if it exists
    if (this.pendingRequests.has('worker-init')) {
      this.pendingRequests.get('worker-init')!.reject(new Error(errorMessage));
      this.pendingRequests.delete('worker-init');
    }
    
    // Reject all pending requests
    this.processPendingRequests(new Error(errorMessage));
    
    // Terminate and cleanup
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.initAttempted = true; // Mark as attempted so we don't retry automatically
  }

  /**
   * Send a message to the worker and return a promise
   * @param type Message type
   * @param payload Message payload
   * @param options Calculation options
   * @returns Promise that resolves with the worker's response
   */
  private sendMessageToWorker<T>(
    type: WorkerMessageType,
    payload: any,
    options: WorkerCalculationOptions = defaultCalculationOptions
  ): Promise<T> {
    // Initialize worker if needed
    if (!this.initAttempted) {
      this.initWorker();
    }
    
    // Generate a unique ID for this request
    const id = `${type}-${this.nextRequestId++}`;
    
    // Create a promise for the request
    return new Promise<T>((resolve, reject) => {
      // If worker initialization failed or workers not supported, reject immediately
      if (!this.isWorkerSupported() || (this.initAttempted && this.workerState === WorkerState.FAILED)) {
        reject(new Error('Web Workers are not supported in this environment'));
        return;
      }
      
      // If worker is terminated, reject immediately
      if (this.workerState === WorkerState.TERMINATED) {
        reject(new Error('Worker has been terminated'));
        return;
      }
      
      // Create timeout if needed
      let timeoutId: number | undefined;
      
      if (options.timeout) {
        timeoutId = window.setTimeout(() => {
          // Remove the request from pending requests
          if (this.pendingRequests.has(id)) {
            console.log(`Request timed out: ${type} (ID: ${id})`);
            this.pendingRequests.delete(id);
            reject(new Error('Calculation timed out'));
          }
        }, options.timeout);
      }
      
      // Add the request to pending requests
      this.pendingRequests.set(id, { 
        resolve, 
        reject, 
        timeoutId,
        // Store the progress callback here instead of sending it to the worker
        onProgress: options.onProgress
      });
      
      // Create message object
      const message: WorkerMessage = {
        type,
        payload: {
          ...payload,
          options: {
            ...options,
            // Remove the callback before sending to worker
            onProgress: undefined
          }
        },
        id
      };
      
      // Send to worker if ready, otherwise queue
      if (this.worker && this.workerState === WorkerState.READY) {
        console.log(`Sending message to worker: ${type} (ID: ${id})`);
        try {
          this.worker.postMessage(message);
        } catch (error) {
          console.error(`Failed to send message: ${type}`, error);
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            reject(new Error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`));
          }
        }
      } else if (this.worker && this.workerState === WorkerState.INITIALIZING) {
        console.log(`Worker not ready, queueing message: ${type} (ID: ${id})`);
        this.pendingMessages.push(message);
      } else {
        console.error(`No worker available, rejecting: ${type} (ID: ${id})`);
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          reject(new Error('Worker not available'));
        }
      }
    });
  }

  /**
   * Check if Web Workers are supported in the current environment
   * @returns Whether Web Workers are supported
   */
  isWorkerSupported(): boolean {
    return typeof Worker !== 'undefined';
  }

  /**
   * Check if module workers are supported in the current environment
   * @returns Whether module workers are supported
   */
  isModuleWorkerSupported(): boolean {
    try {
      // This will throw if module workers are not supported
      const blob = new Blob(['export default {}'], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url, { type: 'module' });
      worker.terminate();
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate water surface profile using a worker
   * @param params Channel parameters
   * @param options Calculation options
   * @returns Promise with water surface profile results
   */
  calculateWaterSurfaceProfile(
    params: ChannelParams,
    options: WorkerCalculationOptions = defaultCalculationOptions
  ): Promise<WaterSurfaceProfileResults> {
    return this.sendMessageToWorker<WaterSurfaceProfileResults>(
      WorkerMessageType.CALCULATE_WATER_SURFACE,
      { params },
      options
    );
  }

  /**
   * Calculate detailed water surface profile using a worker
   * @param params Channel parameters
   * @param options Calculation options
   * @returns Promise with detailed water surface profile results
   */
  calculateDetailedProfile(
    params: ChannelParams,
    options: WorkerCalculationOptions = defaultCalculationOptions
  ): Promise<DetailedWaterSurfaceResults> {
    return this.sendMessageToWorker<DetailedWaterSurfaceResults>(
      WorkerMessageType.CALCULATE_DETAILED_PROFILE,
      { params },
      options
    );
  }

  /**
   * Calculate critical depth using a worker
   * @param params Channel parameters
   * @returns Promise with critical depth
   */
  calculateCriticalDepth(params: ChannelParams): Promise<number> {
    return this.sendMessageToWorker<number>(
      WorkerMessageType.CALCULATE_CRITICAL_DEPTH,
      { params }
    );
  }

  /**
   * Calculate normal depth using a worker
   * @param params Channel parameters
   * @returns Promise with normal depth
   */
  calculateNormalDepth(params: ChannelParams): Promise<number> {
    return this.sendMessageToWorker<number>(
      WorkerMessageType.CALCULATE_NORMAL_DEPTH,
      { params }
    );
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    // Clear init timeout if it exists
    if (this.workerInitTimeout !== null) {
      window.clearTimeout(this.workerInitTimeout);
      this.workerInitTimeout = null;
    }
    
    if (this.worker) {
      // Mark worker as terminated
      this.workerState = WorkerState.TERMINATED;
      
      // Send termination message to the worker
      try {
        this.worker.postMessage({ type: WorkerMessageType.TERMINATE });
      } catch (error) {
        console.warn('Error sending termination message to worker:', error);
      }
      
      // Terminate the worker
      try {
        this.worker.terminate();
      } catch (error) {
        console.warn('Error terminating worker:', error);
      }
      
      this.worker = null;
    }
    
    // Reject all pending requests with termination error
    this.pendingRequests.forEach((request, key) => {
      if (key !== 'worker-init') {
        request.reject(new Error('Worker terminated'));
        
        // Clear timeout if set
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }
      }
    });
    
    // Clear pending requests
    const workerInitRequest = this.pendingRequests.get('worker-init');
    this.pendingRequests.clear();
    
    // Restore worker init request if it exists
    if (workerInitRequest) {
      this.pendingRequests.set('worker-init', workerInitRequest);
    }
    
    // Clear pending messages
    this.pendingMessages = [];
  }

  /**
   * Reset the worker manager state
   * Useful if persistent issues occur with the worker
   */
  reset(): void {
    this.terminate();
    this.initAttempted = false;
    this.workerState = WorkerState.FAILED;
    this.initWorker();
  }

  /**
   * Check if the manager has a worker
   * @returns Whether the manager has a worker
   */
  hasWorker(): boolean {
    return this.worker !== null && this.workerState === WorkerState.READY;
  }

  /**
   * Check if the manager has pending requests
   * @returns Whether the manager has pending requests
   */
  hasPendingRequests(): boolean {
    // Exclude worker init request from count
    let count = 0;
    this.pendingRequests.forEach((_, key) => {
      if (key !== 'worker-init') {
        count++;
      }
    });
    return count > 0;
  }

  /**
   * Get the number of pending requests
   * @returns Number of pending requests
   */
  getPendingRequestCount(): number {
    // Exclude worker init request from count
    let count = 0;
    this.pendingRequests.forEach((_, key) => {
      if (key !== 'worker-init') {
        count++;
      }
    });
    return count;
  }
  
  /**
   * Get the worker state
   * @returns Current worker state
   */
  getWorkerState(): string {
    return this.workerState;
  }
  
  /**
   * Get the worker ID
   * @returns Worker ID if available
   */
  getWorkerId(): string | null {
    return this.workerId;
  }
}

export default WorkerManager;