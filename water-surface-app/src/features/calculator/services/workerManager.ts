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
  TERMINATE = 'terminate'
}

/**
 * Worker message structure
 */
export interface WorkerMessage {
  type: WorkerMessageType;
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
 * Worker Manager
 * 
 * Handles creation, communication, and termination of Web Workers
 * for hydraulic calculations.
 */
class WorkerManager {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { 
    resolve: (value: any) => void; 
    reject: (reason: any) => void;
    timeoutId?: number;
  }> = new Map();
  private nextRequestId = 1;

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
    // Only create the worker if it's not already created and the browser supports Web Workers
    if (!this.worker && this.isWorkerSupported()) {
      try {
        // Create a new worker
        this.worker = new Worker(new URL('../workers/calculationWorker.ts', import.meta.url), { type: 'module' });
        
        // Set up message handler
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        
        // Set up error handler
        this.worker.onerror = this.handleWorkerError.bind(this);
      } catch (error) {
        console.error('Failed to initialize calculation worker:', error);
        this.worker = null;
      }
    }
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
    
    switch (message.type) {
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
        }
        break;
        
      case WorkerMessageType.PROGRESS_UPDATE:
        // Handle progress update
        if (message.id && this.pendingRequests.has(message.id)) {
          const request = this.pendingRequests.get(message.id)!;
          const options = message.payload.options;
          
          // Call progress callback if available
          if (options && options.onProgress) {
            options.onProgress(message.payload.progress);
          }
        }
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
    
    // Reject all pending requests
    this.pendingRequests.forEach((request) => {
      request.reject(new Error(`Worker error: ${error.message}`));
      
      // Clear timeout if set
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
    });
    
    // Clear pending requests
    this.pendingRequests.clear();
    
    // Terminate and recreate the worker
    this.terminate();
    this.initWorker();
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
    this.initWorker();
    
    // Check if worker is available
    if (!this.worker) {
      return Promise.reject(new Error('Web Workers are not supported in this environment'));
    }
    
    // Generate a unique ID for this request
    const id = `${type}-${this.nextRequestId++}`;
    
    // Create a promise for the request
    const promise = new Promise<T>((resolve, reject) => {
      // Create timeout if needed
      let timeoutId: number | undefined;
      
      if (options.timeout) {
        timeoutId = window.setTimeout(() => {
          // Remove the request from pending requests
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            reject(new Error('Calculation timed out'));
          }
        }, options.timeout);
      }
      
      // Add the request to pending requests
      this.pendingRequests.set(id, { resolve, reject, timeoutId });
      
      // Send the message to the worker
      this.worker!.postMessage({
        type,
        payload: {
          ...payload,
          options
        },
        id
      });
    });
    
    return promise;
  }

  /**
   * Check if Web Workers are supported in the current environment
   * @returns Whether Web Workers are supported
   */
  isWorkerSupported(): boolean {
    return typeof Worker !== 'undefined';
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
    if (this.worker) {
      // Send termination message to the worker
      this.worker.postMessage({ type: WorkerMessageType.TERMINATE });
      
      // Terminate the worker
      this.worker.terminate();
      this.worker = null;
    }
    
    // Reject all pending requests
    this.pendingRequests.forEach((request) => {
      request.reject(new Error('Worker terminated'));
      
      // Clear timeout if set
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
    });
    
    // Clear pending requests
    this.pendingRequests.clear();
  }

  /**
   * Check if the manager has a worker
   * @returns Whether the manager has a worker
   */
  hasWorker(): boolean {
    return this.worker !== null;
  }

  /**
   * Check if the manager has pending requests
   * @returns Whether the manager has pending requests
   */
  hasPendingRequests(): boolean {
    return this.pendingRequests.size > 0;
  }

  /**
   * Get the number of pending requests
   * @returns Number of pending requests
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }
}

export default WorkerManager;