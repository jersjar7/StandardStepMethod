/**
 * Worker-related types for water surface profile calculations
 * These types standardize communication between the main thread and worker
 */

import { 
    ChannelParams, 
    WaterSurfaceProfileResults, 
    DetailedWaterSurfaceResults 
  } from './index';
  
  /**
   * Worker message types
   */
  export enum WorkerMessageType {
    // Commands sent to worker
    CALCULATE_WATER_SURFACE = 'calculateWaterSurface',
    CALCULATE_DETAILED_PROFILE = 'calculateDetailedProfile',
    CALCULATE_CRITICAL_DEPTH = 'calculateCriticalDepth',
    CALCULATE_NORMAL_DEPTH = 'calculateNormalDepth',
    TERMINATE = 'terminate',
    
    // Responses from worker
    PROGRESS_UPDATE = 'progressUpdate',
    CALCULATION_ERROR = 'calculationError',
    CALCULATION_RESULT = 'calculationResult',
    WORKER_READY = 'workerReady',
    WORKER_ERROR = 'workerError'
  }
  
  /**
   * Base worker message interface
   */
  export interface WorkerMessage {
    type: WorkerMessageType;  // Message type for routing
    id?: string;              // Optional message ID for tracking requests
    payload?: any;            // Message payload
  }
  
  /**
   * Worker calculation options
   */
  export interface WorkerCalculationOptions {
    highResolution?: boolean;    // Whether to use high-resolution calculation
    timeout?: number;            // Calculation timeout in milliseconds
    onProgress?: boolean;        // Whether to report progress
    numSteps?: number;           // Number of calculation steps
    method?: string;             // Calculation method (simple, newtonRaphson, adaptive)
    bidirectional?: boolean;     // Whether to calculate from both directions
  }
  
  /**
   * Worker calculation message
   */
  export interface WorkerCalculationMessage extends WorkerMessage {
    type: WorkerMessageType.CALCULATE_WATER_SURFACE | 
          WorkerMessageType.CALCULATE_DETAILED_PROFILE | 
          WorkerMessageType.CALCULATE_CRITICAL_DEPTH | 
          WorkerMessageType.CALCULATE_NORMAL_DEPTH;
    payload: {
      params: ChannelParams;              // Channel parameters
      options?: WorkerCalculationOptions; // Calculation options
    };
  }
  
  /**
   * Worker progress message
   */
  export interface WorkerProgressMessage extends WorkerMessage {
    type: WorkerMessageType.PROGRESS_UPDATE;
    payload: {
      progress: number;      // Progress percentage (0-100)
      stage?: string;        // Optional calculation stage
      message?: string;      // Optional progress message
      currentStep?: number;  // Current step
      totalSteps?: number;   // Total steps
    };
  }
  
  /**
   * Worker result message
   */
  export interface WorkerResultMessage extends WorkerMessage {
    type: WorkerMessageType.CALCULATION_RESULT;
    payload: WaterSurfaceProfileResults | DetailedWaterSurfaceResults | number;
  }
  
  /**
   * Worker error message
   */
  export interface WorkerErrorMessage extends WorkerMessage {
    type: WorkerMessageType.CALCULATION_ERROR | WorkerMessageType.WORKER_ERROR;
    payload: string;  // Error message
  }
  
  /**
   * Worker ready message
   */
  export interface WorkerReadyMessage extends WorkerMessage {
    type: WorkerMessageType.WORKER_READY;
    payload: {
      workerId: string;        // Worker identifier
      capabilities: {
        supportsSharedArrayBuffer: boolean;  // Whether SharedArrayBuffer is supported
        supportsOffscreenCanvas: boolean;    // Whether OffscreenCanvas is supported
        supportedCalculations: string[];     // Supported calculation types
      };
    };
  }
  
  /**
   * Type guard to check if a message is a calculation message
   */
  export function isCalculationMessage(message: WorkerMessage): message is WorkerCalculationMessage {
    return message.type === WorkerMessageType.CALCULATE_WATER_SURFACE ||
           message.type === WorkerMessageType.CALCULATE_DETAILED_PROFILE ||
           message.type === WorkerMessageType.CALCULATE_CRITICAL_DEPTH ||
           message.type === WorkerMessageType.CALCULATE_NORMAL_DEPTH;
  }
  
  /**
   * Type guard to check if a message is a progress message
   */
  export function isProgressMessage(message: WorkerMessage): message is WorkerProgressMessage {
    return message.type === WorkerMessageType.PROGRESS_UPDATE;
  }
  
  /**
   * Type guard to check if a message is a result message
   */
  export function isResultMessage(message: WorkerMessage): message is WorkerResultMessage {
    return message.type === WorkerMessageType.CALCULATION_RESULT;
  }
  
  /**
   * Type guard to check if a message is an error message
   */
  export function isErrorMessage(message: WorkerMessage): message is WorkerErrorMessage {
    return message.type === WorkerMessageType.CALCULATION_ERROR ||
           message.type === WorkerMessageType.WORKER_ERROR;
  }
  
  /**
   * Type guard to check if a message is a ready message
   */
  export function isReadyMessage(message: WorkerMessage): message is WorkerReadyMessage {
    return message.type === WorkerMessageType.WORKER_READY;
  }
  
  /**
   * Create a calculation message
   */
  export function createCalculationMessage(
    type: WorkerMessageType.CALCULATE_WATER_SURFACE | 
          WorkerMessageType.CALCULATE_DETAILED_PROFILE | 
          WorkerMessageType.CALCULATE_CRITICAL_DEPTH | 
          WorkerMessageType.CALCULATE_NORMAL_DEPTH,
    params: ChannelParams,
    options?: WorkerCalculationOptions,
    id?: string
  ): WorkerCalculationMessage {
    return {
      type,
      payload: {
        params,
        options
      },
      id
    };
  }
  
  /**
   * Create a progress message
   */
  export function createProgressMessage(
    progress: number,
    stage?: string,
    message?: string,
    currentStep?: number,
    totalSteps?: number,
    id?: string
  ): WorkerProgressMessage {
    return {
      type: WorkerMessageType.PROGRESS_UPDATE,
      payload: {
        progress,
        stage,
        message,
        currentStep,
        totalSteps
      },
      id
    };
  }
  
  /**
   * Create a result message
   */
  export function createResultMessage(
    result: WaterSurfaceProfileResults | DetailedWaterSurfaceResults | number,
    id?: string
  ): WorkerResultMessage {
    return {
      type: WorkerMessageType.CALCULATION_RESULT,
      payload: result,
      id
    };
  }
  
  /**
   * Create an error message
   */
  export function createErrorMessage(
    error: string,
    isWorkerError: boolean = false,
    id?: string
  ): WorkerErrorMessage {
    return {
      type: isWorkerError ? WorkerMessageType.WORKER_ERROR : WorkerMessageType.CALCULATION_ERROR,
      payload: error,
      id
    };
  }