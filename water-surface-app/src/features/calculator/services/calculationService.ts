/**
 * Enhanced worker availability testing and improved fallback logic
 * for the calculation service.
 */

import { ChannelParams, WaterSurfaceProfileResults, DetailedWaterSurfaceResults } from '../types';
import { CalculationResultWithError } from '../types/resultTypes';
import WorkerManager from './workerManager';
import {
  calculateWaterSurfaceProfile as directCalculateWaterSurfaceProfile,
  calculateDetailedProfile as directCalculateDetailedProfile,
  calculateCriticalDepth as directCalculateCriticalDepth,
  calculateNormalDepth as directCalculateNormalDepth
} from '../utils/hydraulics';

/**
 * Cache entry for calculation results
 */
interface CacheEntry<T> {
  result: T;
  timestamp: number;
  params: ChannelParams;
}

/**
 * Options for calculation service
 */
export interface CalculationOptions {
  useWorker?: boolean;         // Whether to use a Web Worker for calculation
  useCache?: boolean;          // Whether to use cache for results
  cacheTTL?: number;           // Time-to-live for cache entries in milliseconds
  highResolution?: boolean;    // Whether to use high-resolution calculation
  showProgress?: boolean;      // Whether to report calculation progress
  timeout?: number;            // Timeout for calculation in milliseconds
  fallbackToDirectCalculation?: boolean; // Whether to fall back to direct calculation if worker fails
  forceDirectCalculation?: boolean; // Force direct calculation even if workers are available
  workerTestTimeout?: number;  // Timeout for worker availability testing in milliseconds
}

/**
 * Default calculation options
 */
const defaultOptions: CalculationOptions = {
  useWorker: true,               // Use Web Worker by default
  useCache: true,                // Use cache by default
  cacheTTL: 10 * 60 * 1000,      // 10 minutes
  highResolution: false,         // Standard resolution by default
  showProgress: false,           // No progress reporting by default
  timeout: 30000,                // 30 seconds timeout
  fallbackToDirectCalculation: true, // Fall back to direct calculation if worker fails
  forceDirectCalculation: false,  // Don't force direct calculation by default
  workerTestTimeout: 5000        // 5 seconds timeout for worker testing
};

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: number) => void;

/**
 * Worker capabilities information
 */
interface WorkerCapabilities {
  supported: boolean;
  testedSuccessfully: boolean;
  moduleSupported: boolean;
  lastTestTimestamp: number;
  failReason?: string;
}

/**
 * Calculation Service
 * 
 * Provides a unified interface for water surface profile calculations,
 * supporting both direct calculations and Web Worker-based calculations.
 */
class CalculationService {
  private workerManager: WorkerManager;
  private cache: Map<string, CacheEntry<any>>;
  private options: CalculationOptions;
  private workerCapabilities: WorkerCapabilities = {
    supported: false,
    testedSuccessfully: false,
    moduleSupported: false,
    lastTestTimestamp: 0
  };
  
  // Counter for direct calculations (useful for diagnostics)
  private directCalculationCount = 0;
  private workerCalculationCount = 0;
  private workerFailureCount = 0;

  /**
   * Create a new calculation service
   * @param options Service configuration options
   */
  constructor(options: Partial<CalculationOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
    this.workerManager = new WorkerManager();
    this.cache = new Map();
    
    // Check environment for basic worker support
    this.checkEnvironmentSupport();
    
    // Test worker availability if enabled
    if (this.options.useWorker && this.workerCapabilities.supported) {
      this.testWorkerAvailability();
    }
  }

  /**
   * Check if the environment supports Web Workers
   * This is a basic check before any actual testing
   */
  private checkEnvironmentSupport(): void {
    // First check if we're in a browser environment
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    if (!isBrowser) {
      this.workerCapabilities.supported = false;
      this.workerCapabilities.failReason = 'Not in a browser environment';
      return;
    }
    
    // Check if Worker constructor is available
    const workerSupported = typeof Worker !== 'undefined';
    this.workerCapabilities.supported = workerSupported;
    
    // Check if module workers are supported (feature detection)
    try {
      this.workerCapabilities.moduleSupported = this.workerManager.isModuleWorkerSupported();
    } catch (error) {
      this.workerCapabilities.moduleSupported = false;
    }
    
    if (!workerSupported) {
      this.workerCapabilities.failReason = 'Web Workers not supported in this browser';
    }
  }

  /**
   * Test if workers are available and functioning with improved reliability
   * This tests actual worker operation, not just feature detection
   */
  private async testWorkerAvailability(): Promise<boolean> {
    // Skip testing if workers are disabled or already determined to be unsupported
    if (!this.options.useWorker || !this.workerCapabilities.supported) {
      return false;
    }
    
    // If we've tested recently, don't test again
    const now = Date.now();
    const testInterval = 5 * 60 * 1000; // 5 minutes
    if (this.workerCapabilities.lastTestTimestamp > 0 && 
        now - this.workerCapabilities.lastTestTimestamp < testInterval) {
      return this.workerCapabilities.testedSuccessfully;
    }
    
    // Update test timestamp
    this.workerCapabilities.lastTestTimestamp = now;
    
    // Create a Promise that rejects after a timeout
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Worker test timed out')), this.options.workerTestTimeout);
    });
    
    try {
      // Simple rectangular channel test parameters
      const testParams: ChannelParams = {
        channelType: 'rectangular',
        bottomWidth: 10,
        manningN: 0.03,
        channelSlope: 0.001,
        discharge: 50,
        length: 100,
        units: 'metric'
      };
      
      // Perform a simple calculation to test if workers are working properly
      // Use Promise.race to add a timeout
      await Promise.race([
        this.workerManager.calculateCriticalDepth(testParams),
        timeoutPromise
      ]);
      
      // If we get here, the test was successful
      console.log('Worker test successful');
      this.workerCapabilities.testedSuccessfully = true;
      return true;
    } catch (error) {
      // Include detailed error information
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.workerCapabilities.failReason = `Worker test failed: ${errorMsg}`;
      this.workerCapabilities.testedSuccessfully = false;
      
      console.warn(`Worker test failed, falling back to direct calculations: ${errorMsg}`);
      
      // Reset worker manager to clear any failed state
      this.workerManager.reset();
      return false;
    }
  }

  /**
   * Generate a cache key for the given parameters
   * @param params Channel parameters
   * @param calculationType Type of calculation
   * @returns Cache key string
   */
  private generateCacheKey(params: ChannelParams, calculationType: string): string {
    // To avoid cache key collisions due to object property order variations,
    // extract and sort the relevant parameters for the key generation
    const paramsToInclude: Record<string, any> = {
      channelType: params.channelType,
      _calculationType: calculationType,
      _highResolution: this.options.highResolution
    };
    
    // Include relevant parameters based on channel type
    switch (params.channelType) {
      case 'rectangular':
        paramsToInclude.bottomWidth = params.bottomWidth;
        break;
      case 'trapezoidal':
        paramsToInclude.bottomWidth = params.bottomWidth;
        paramsToInclude.sideSlope = params.sideSlope;
        break;
      case 'triangular':
        paramsToInclude.sideSlope = params.sideSlope;
        break;
      case 'circular':
        paramsToInclude.diameter = params.diameter;
        break;
    }
    
    // Include common parameters
    paramsToInclude.manningN = params.manningN;
    paramsToInclude.channelSlope = params.channelSlope;
    paramsToInclude.discharge = params.discharge;
    paramsToInclude.length = params.length;
    paramsToInclude.units = params.units;
    
    // Include boundary conditions if specified
    if (params.upstreamDepth !== undefined) {
      paramsToInclude.upstreamDepth = params.upstreamDepth;
    }
    
    if (params.downstreamDepth !== undefined) {
      paramsToInclude.downstreamDepth = params.downstreamDepth;
    }
    
    // Sort keys for consistent order
    return JSON.stringify(paramsToInclude, Object.keys(paramsToInclude).sort());
  }

  /**
   * Check if a cache entry is valid
   * @param entry Cache entry to check
   * @returns Whether the entry is still valid
   */
  private isCacheValid(entry: CacheEntry<any>): boolean {
    if (!this.options.useCache) return false;
    
    const now = Date.now();
    return now - entry.timestamp < (this.options.cacheTTL || 0);
  }

  /**
   * Determine if we should use a worker for calculation with enhanced decision logic
   * @returns Whether to use a worker
   */
  private shouldUseWorker(): boolean {
    // If direct calculation is forced, always use direct calculation
    if (this.options.forceDirectCalculation) {
      return false;
    }
    
    // If worker usage is disabled in options, don't use worker
    if (!this.options.useWorker) {
      return false;
    }
    
    // Check if workers are supported and have been tested successfully
    if (!this.workerCapabilities.supported || !this.workerCapabilities.testedSuccessfully) {
      return false;
    }
    
    // Re-test worker availability if it's been a long time since last test
    const now = Date.now();
    const testInterval = 10 * 60 * 1000; // 10 minutes
    if (now - this.workerCapabilities.lastTestTimestamp > testInterval) {
      // For this check, we'll use the previous result but trigger a new test for next time
      this.testWorkerAvailability().catch(() => {});
    }
    
    // Use worker if we've passed all checks
    return true;
  }

  /**
   * Handle direct calculation with progress reporting
   * @param params Channel parameters
   * @param calculationMethod The actual calculation function
   * @param onProgress Optional progress callback
   * @returns Calculation result
   */
  private handleDirectCalculation<T>(
    params: ChannelParams,
    calculationMethod: (params: ChannelParams) => T | { results?: T; error?: string },
    onProgress?: ProgressCallback
  ): Promise<{ results?: T; error?: string }> {
    return new Promise((resolve) => {
      // Track direct calculation count
      this.directCalculationCount++;
      
      // Report initial progress
      if (onProgress && this.options.showProgress) {
        onProgress(0);
      }
      
      try {
        // Perform calculation
        const result = calculationMethod(params);
        
        // Report final progress
        if (onProgress && this.options.showProgress) {
          onProgress(100);
        }
        
        // Handle different return formats
        if (result && typeof result === 'object' && 'error' in result) {
          // Result is already in the right format
          resolve(result as { results?: T; error?: string });
        } else {
          // Result is just the value, wrap it
          resolve({ results: result as T });
        }
      } catch (error) {
        // Handle and standardize errors
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'string'
            ? error
            : 'Unknown calculation error';
            
        // Report error in progress
        if (onProgress && this.options.showProgress) {
          onProgress(0);
        }
        
        resolve({ error: errorMessage });
      }
    });
  }

  /**
   * Calculate water surface profile
   * 
   * @param params Channel parameters
   * @param onProgress Optional progress callback
   * @returns Promise with water surface profile results or error
   */
  async calculateWaterSurfaceProfile(
    params: ChannelParams,
    onProgress?: ProgressCallback
  ): Promise<CalculationResultWithError> {
    // Check cache first if enabled
    if (this.options.useCache) {
      const cacheKey = this.generateCacheKey(params, 'waterSurfaceProfile');
      const cachedResult = this.cache.get(cacheKey);
      
      if (cachedResult && this.isCacheValid(cachedResult)) {
        // For cached results, report 100% progress immediately
        if (onProgress && this.options.showProgress) {
          onProgress(100);
        }
        return { results: cachedResult.result };
      }
    }
    
    // Determine calculation method (worker or direct)
    const useWorker = this.shouldUseWorker();
    
    try {
      let result: WaterSurfaceProfileResults;
      
      if (useWorker) {
        try {
          // Track worker calculation count
          this.workerCalculationCount++;
          
          // Use Web Worker for calculation
          result = await this.workerManager.calculateWaterSurfaceProfile(params, {
            highResolution: this.options.highResolution,
            timeout: this.options.timeout,
            onProgress: this.options.showProgress ? onProgress : undefined
          });
        } catch (workerError) {
          // Track worker failure count
          this.workerFailureCount++;
          
          // Log detailed error information for diagnostics
          const errorMsg = workerError instanceof Error 
            ? workerError.message 
            : String(workerError);
          
          console.warn(`Worker calculation failed: ${errorMsg}`);
          
          // If fallback is disabled, re-throw the error
          if (!this.options.fallbackToDirectCalculation) {
            throw workerError;
          }
          
          // Otherwise, fall back to direct calculation
          console.log('Falling back to direct calculation');
          
          // Use enhanced direct calculation handling
          const directResult = await this.handleDirectCalculation<WaterSurfaceProfileResults>(
            params,
            directCalculateWaterSurfaceProfile,
            onProgress
          );
          
          // Handle errors from direct calculation
          if (directResult.error) {
            return directResult as CalculationResultWithError;
          }
          
          result = directResult.results!;
        }
      } else {
        // Use direct calculation with enhanced handling
        const directResult = await this.handleDirectCalculation<WaterSurfaceProfileResults>(
          params,
          directCalculateWaterSurfaceProfile,
          onProgress
        );
        
        // Handle errors from direct calculation
        if (directResult.error) {
          return directResult as CalculationResultWithError;
        }
        
        result = directResult.results!;
      }
      
      // Cache the result if caching is enabled
      if (this.options.useCache) {
        const cacheKey = this.generateCacheKey(params, 'waterSurfaceProfile');
        this.cache.set(cacheKey, {
          result,
          timestamp: Date.now(),
          params
        });
      }
      
      return { results: result };
    } catch (error) {
      // Handle and standardize errors
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string'
          ? error
          : 'Unknown calculation error';
          
      return { error: errorMessage };
    }
  }

  /**
   * Calculate detailed water surface profile
   * 
   * @param params Channel parameters
   * @param onProgress Optional progress callback
   * @returns Promise with detailed water surface profile results or error
   */
  async calculateDetailedProfile(
    params: ChannelParams,
    onProgress?: ProgressCallback
  ): Promise<{ results?: DetailedWaterSurfaceResults; error?: string }> {
    // Check cache first if enabled
    if (this.options.useCache) {
      const cacheKey = this.generateCacheKey(params, 'detailedProfile');
      const cachedResult = this.cache.get(cacheKey);
      
      if (cachedResult && this.isCacheValid(cachedResult)) {
        // For cached results, report 100% progress immediately
        if (onProgress && this.options.showProgress) {
          onProgress(100);
        }
        return { results: cachedResult.result };
      }
    }
    
    // Determine calculation method (worker or direct)
    const useWorker = this.shouldUseWorker();
    
    try {
      let result: DetailedWaterSurfaceResults;
      
      if (useWorker) {
        try {
          // Track worker calculation count
          this.workerCalculationCount++;
          
          // Use Web Worker for calculation
          result = await this.workerManager.calculateDetailedProfile(params, {
            highResolution: this.options.highResolution,
            timeout: this.options.timeout,
            onProgress: this.options.showProgress ? onProgress : undefined
          });
        } catch (workerError) {
          // Track worker failure count
          this.workerFailureCount++;
          
          // Log detailed error information for diagnostics
          const errorMsg = workerError instanceof Error 
            ? workerError.message 
            : String(workerError);
          
          console.warn(`Worker detailed profile calculation failed: ${errorMsg}`);
          
          // If fallback is disabled, re-throw the error
          if (!this.options.fallbackToDirectCalculation) {
            throw workerError;
          }
          
          // Otherwise, fall back to direct calculation
          console.log('Falling back to direct detailed profile calculation');
          
          // Use enhanced direct calculation handling
          const directResult = await this.handleDirectCalculation<DetailedWaterSurfaceResults>(
            params,
            directCalculateDetailedProfile,
            onProgress
          );
          
          // Handle possible error from direct calculation
          if (directResult.error) {
            return directResult;
          }
          
          result = directResult.results!;
        }
      } else {
        // Use direct calculation with enhanced handling
        const directResult = await this.handleDirectCalculation<DetailedWaterSurfaceResults>(
          params,
          directCalculateDetailedProfile,
          onProgress
        );
        
        // Handle possible error from direct calculation
        if (directResult.error) {
          return directResult;
        }
        
        result = directResult.results!;
      }
      
      // Cache the result if caching is enabled
      if (this.options.useCache && result) {
        const cacheKey = this.generateCacheKey(params, 'detailedProfile');
        this.cache.set(cacheKey, {
          result,
          timestamp: Date.now(),
          params
        });
      }
      
      return { results: result };
    } catch (error) {
      // Handle and standardize errors
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string'
          ? error
          : 'Unknown calculation error';
          
      return { error: errorMessage };
    }
  }

  /**
   * Calculate profile with standardized error handling
   * 
   * @param params Channel parameters
   * @param onProgress Optional progress callback
   * @returns Promise with water surface profile results or null if error
   */
  async calculateProfileWithHandling(
    params: ChannelParams,
    onProgress?: ProgressCallback
  ): Promise<WaterSurfaceProfileResults | null> {
    const result = await this.calculateWaterSurfaceProfile(params, onProgress);
    return result.results || null;
  }

  /**
   * Calculate critical depth
   * 
   * @param params Channel parameters
   * @returns Critical depth
   */
  calculateCriticalDepth(params: ChannelParams): number {
    // Check cache first if enabled
    if (this.options.useCache) {
      const cacheKey = this.generateCacheKey(params, 'criticalDepth');
      const cachedResult = this.cache.get(cacheKey);
      
      if (cachedResult && this.isCacheValid(cachedResult)) {
        return cachedResult.result;
      }
    }
    
    // For simple calculations, just use direct calculation
    // Web Workers add too much overhead for these simple calculations
    this.directCalculationCount++;
    const result = directCalculateCriticalDepth(params);
    
    // Cache the result if caching is enabled
    if (this.options.useCache) {
      const cacheKey = this.generateCacheKey(params, 'criticalDepth');
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        params
      });
    }
    
    return result;
  }

  /**
   * Calculate normal depth
   * 
   * @param params Channel parameters
   * @returns Normal depth
   */
  calculateNormalDepth(params: ChannelParams): number {
    // Check cache first if enabled
    if (this.options.useCache) {
      const cacheKey = this.generateCacheKey(params, 'normalDepth');
      const cachedResult = this.cache.get(cacheKey);
      
      if (cachedResult && this.isCacheValid(cachedResult)) {
        return cachedResult.result;
      }
    }
    
    // For simple calculations, just use direct calculation
    // Web Workers add too much overhead for these simple calculations
    this.directCalculationCount++;
    const result = directCalculateNormalDepth(params);
    
    // Cache the result if caching is enabled
    if (this.options.useCache) {
      const cacheKey = this.generateCacheKey(params, 'normalDepth');
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        params
      });
    }
    
    return result;
  }

  /**
   * Check if calculation can offload to a worker
   * @returns Whether Web Workers are supported and available
   */
  canUseWorker(): boolean {
    return this.workerCapabilities.supported && this.workerCapabilities.testedSuccessfully;
  }

  /**
   * Clear calculation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Force worker re-testing
   * Useful if you suspect worker state may have changed
   */
  async retestWorker(): Promise<boolean> {
    // Reset test timestamp to force a new test
    this.workerCapabilities.lastTestTimestamp = 0;
    return this.testWorkerAvailability();
  }

  /**
   * Update calculation options
   * @param options New calculation options
   */
  updateOptions(options: Partial<CalculationOptions>): void {
    const previousWorkerOption = this.options.useWorker;
    
    this.options = { ...this.options, ...options };
    
    // If useWorker option changed from false to true, retest worker
    if (!previousWorkerOption && this.options.useWorker) {
      this.testWorkerAvailability().catch(() => {});
    }
  }

  /**
   * Get current calculation options
   * @returns Current options
   */
  getOptions(): CalculationOptions {
    return { ...this.options };
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getCacheStats(): { size: number; enabled: boolean; ttl: number } {
    return {
      size: this.cache.size,
      enabled: !!this.options.useCache,
      ttl: this.options.cacheTTL || 0
    };
  }

  /**
   * Get worker capabilities information
   * @returns Worker capabilities
   */
  getWorkerCapabilities(): WorkerCapabilities {
    return { ...this.workerCapabilities };
  }

  /**
   * Get calculation statistics
   * @returns Calculation statistics
   */
  getCalculationStats(): { 
    directCalculations: number; 
    workerCalculations: number;
    workerFailures: number;
    fallbackRate: number;
  } {
    // Calculate fallback rate
    const fallbackRate = this.workerCalculationCount > 0 
      ? this.workerFailureCount / this.workerCalculationCount 
      : 0;
    
    return {
      directCalculations: this.directCalculationCount,
      workerCalculations: this.workerCalculationCount,
      workerFailures: this.workerFailureCount,
      fallbackRate
    };
  }

  /**
   * Terminate any active workers
   * Should be called when the component unmounts
   */
  terminate(): void {
    this.workerManager.terminate();
  }
  
  /**
   * Perform a comprehensive diagnostic test of the calculation system
   * Useful for debugging and reporting
   */
  async runDiagnostics(): Promise<Record<string, any>> {
    const startTime = Date.now();
    const results: Record<string, any> = {
      workerCapabilities: this.getWorkerCapabilities(),
      cacheEnabled: this.options.useCache,
      cacheSize: this.cache.size,
      workerRunning: this.workerManager.hasWorker(),
      workerPendingRequests: this.workerManager.getPendingRequestCount(),
      calculationStats: this.getCalculationStats(),
      tests: {} as Record<string, any>,
      totalDuration: 0 // Initialize this property now
    };
    
    // Test parameters
    const testParams: ChannelParams = {
      channelType: 'rectangular',
      bottomWidth: 10,
      manningN: 0.03,
      channelSlope: 0.001,
      discharge: 50,
      length: 100,
      units: 'metric'
    };
    
    // Test direct calculation
    try {
      const directStart = Date.now();
      const directResult = directCalculateCriticalDepth(testParams);
      results.tests.directCalculation = {
        success: true,
        duration: Date.now() - directStart,
        result: directResult
      };
    } catch (error) {
      results.tests.directCalculation = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    // Test worker calculation if available
    if (this.workerCapabilities.supported && this.workerCapabilities.testedSuccessfully) {
      try {
        const workerStart = Date.now();
        const workerResult = await this.workerManager.calculateCriticalDepth(testParams);
        results.tests.workerCalculation = {
          success: true,
          duration: Date.now() - workerStart,
          result: workerResult
        };
      } catch (error) {
        results.tests.workerCalculation = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    } else {
      results.tests.workerCalculation = {
        success: false,
        reason: "Workers not available",
        details: this.workerCapabilities.failReason
      };
    }
    
    // Test cache
    if (this.options.useCache) {
      try {
        // Clear any existing cache entry
        const cacheKey = this.generateCacheKey(testParams, 'criticalDepth');
        this.cache.delete(cacheKey);
        
        // First calculation should not be cached
        const cacheStart = Date.now();
        this.calculateCriticalDepth(testParams);
        const firstDuration = Date.now() - cacheStart;
        
        // Second calculation should use cache
        const cacheStart2 = Date.now();
        this.calculateCriticalDepth(testParams);
        const secondDuration = Date.now() - cacheStart2;
        
        results.tests.caching = {
          success: true,
          firstDuration,
          secondDuration,
          speedup: firstDuration / Math.max(1, secondDuration)
        };
      } catch (error) {
        results.tests.caching = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
    
    // Update total duration at the end
    results.totalDuration = Date.now() - startTime;
    return results;
  }
} 

// Export a singleton instance for use throughout the application
export const calculationService = new CalculationService();

// Export a factory function for creating custom instances
export function createCalculationService(options: Partial<CalculationOptions> = {}): CalculationService {
  return new CalculationService(options);
}

export default CalculationService;