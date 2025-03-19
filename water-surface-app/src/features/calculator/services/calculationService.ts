// src/features/calculator/services/calculationService.ts

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
  fallbackToDirectCalculation: true // Fall back to direct calculation if worker fails
};

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: number) => void;

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
  private workerAvailable: boolean | null = null; // Null means not tested yet

  /**
   * Create a new calculation service
   * @param options Service configuration options
   */
  constructor(options: Partial<CalculationOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
    this.workerManager = new WorkerManager();
    this.cache = new Map();
    
    // Test worker availability
    this.testWorkerAvailability();
  }

  /**
   * Test if workers are available and functioning
   */
  private async testWorkerAvailability(): Promise<void> {
    // Skip testing if workers are disabled
    if (!this.options.useWorker) {
      this.workerAvailable = false;
      return;
    }
    
    try {
      // Check if worker manager reports worker support
      if (!this.workerManager.isWorkerSupported()) {
        console.log('Web Workers not supported in this browser');
        this.workerAvailable = false;
        return;
      }
      
      // Perform a simple calculation to test if workers are working properly
      const testParams: ChannelParams = {
        channelType: 'rectangular',
        bottomWidth: 10,
        manningN: 0.03,
        channelSlope: 0.001,
        discharge: 50,
        length: 100,
        units: 'metric'
      };
      
      await this.workerManager.calculateCriticalDepth(testParams);
      
      console.log('Worker test successful');
      this.workerAvailable = true;
    } catch (error) {
      console.warn('Worker test failed, falling back to direct calculations:', error);
      this.workerAvailable = false;
      
      // Reset worker manager
      this.workerManager.reset();
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
 * Determine if we should use a worker for calculation
 * @returns Whether to use a worker
 */
private shouldUseWorker(): boolean {
  // If worker availability hasn't been tested yet, default to false
  if (this.workerAvailable === null) {
    return false;
  }
  
  // Use nullish coalescing operator to handle potentially undefined options
  return (this.options.useWorker ?? false) && this.workerAvailable;
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
    
    try {
      let result: WaterSurfaceProfileResults;
      
      // Determine calculation method
      if (this.shouldUseWorker()) {
        try {
          // Use Web Worker for calculation
          result = await this.workerManager.calculateWaterSurfaceProfile(params, {
            highResolution: this.options.highResolution,
            timeout: this.options.timeout,
            onProgress: this.options.showProgress ? onProgress : undefined
          });
        } catch (workerError) {
          // If worker calculation fails and fallback is enabled, try direct calculation
          if (this.options.fallbackToDirectCalculation) {
            console.warn('Worker calculation failed, falling back to direct calculation:', workerError);
            
            // Report progress at 0% for direct calculation
            if (onProgress && this.options.showProgress) {
              onProgress(0);
            }
            
            result = directCalculateWaterSurfaceProfile(params);
            
            // Report progress at 100% after direct calculation
            if (onProgress && this.options.showProgress) {
              onProgress(100);
            }
          } else {
            // If fallback is disabled, re-throw the error
            throw workerError;
          }
        }
      } else {
        // Use direct calculation on main thread
        // Report progress at 0% before calculation
        if (onProgress && this.options.showProgress) {
          onProgress(0);
        }
        
        result = directCalculateWaterSurfaceProfile(params);
        
        // Report progress at 100% after calculation
        if (onProgress && this.options.showProgress) {
          onProgress(100);
        }
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
    
    try {
      let result: DetailedWaterSurfaceResults;
      
      // Determine calculation method
      if (this.shouldUseWorker()) {
        try {
          // Use Web Worker for calculation
          result = await this.workerManager.calculateDetailedProfile(params, {
            highResolution: this.options.highResolution,
            timeout: this.options.timeout,
            onProgress: this.options.showProgress ? onProgress : undefined
          });
        } catch (workerError) {
          // If worker calculation fails and fallback is enabled, try direct calculation
          if (this.options.fallbackToDirectCalculation) {
            console.warn('Worker calculation failed, falling back to direct calculation:', workerError);
            
            // Report progress at 0% for direct calculation
            if (onProgress && this.options.showProgress) {
              onProgress(0);
            }
            
            const directResult = directCalculateDetailedProfile(params);
            
            // Report progress at 100% after direct calculation
            if (onProgress && this.options.showProgress) {
              onProgress(100);
            }
            
            if (directResult.error) {
              return directResult;
            }
            
            result = directResult.results as DetailedWaterSurfaceResults;
          } else {
            // If fallback is disabled, re-throw the error
            throw workerError;
          }
        }
      } else {
        // Use direct calculation on main thread
        // Report progress at 0% before calculation
        if (onProgress && this.options.showProgress) {
          onProgress(0);
        }
        
        const directResult = directCalculateDetailedProfile(params);
        
        // Report progress at 100% after calculation
        if (onProgress && this.options.showProgress) {
          onProgress(100);
        }
        
        if (directResult.error) {
          return directResult;
        }
        
        result = directResult.results as DetailedWaterSurfaceResults;
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
    // If worker availability hasn't been tested yet, test it now
    if (this.workerAvailable === null) {
      this.workerAvailable = this.workerManager.isWorkerSupported();
    }
    
    return this.workerAvailable;
  }

  /**
   * Clear calculation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update calculation options
   * @param options New calculation options
   */
  updateOptions(options: Partial<CalculationOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Re-test worker availability if useWorker option changed
    if ('useWorker' in options) {
      this.testWorkerAvailability();
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
    workerSupported: this.workerManager.isWorkerSupported(),
    workerAvailable: this.workerAvailable,
    moduleWorkerSupported: this.workerManager.isModuleWorkerSupported(),
    cacheEnabled: this.options.useCache,
    cacheSize: this.cache.size,
    workerRunning: this.workerManager.hasWorker(),
    workerPendingRequests: this.workerManager.getPendingRequestCount(),
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
  if (results.workerSupported && results.workerAvailable) {
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