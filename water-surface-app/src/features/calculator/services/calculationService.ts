// src/features/calculator/services/calculationService.ts

import { ChannelParams, WaterSurfaceProfileResults, DetailedWaterSurfaceResults } from '../types';
import { CalculationResultWithError } from '../types/resultTypes';
import WorkerManager from './workerManager';
import {
  calculateWaterSurfaceProfile,
  calculateDetailedProfile,
  calculateCriticalDepth,
  calculateNormalDepth
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
}

/**
 * Default calculation options
 */
const defaultOptions: CalculationOptions = {
  useWorker: true,              // Use Web Worker by default
  useCache: true,               // Use cache by default
  cacheTTL: 10 * 60 * 1000,     // 10 minutes
  highResolution: false,        // Standard resolution by default
  showProgress: false,          // No progress reporting by default
  timeout: 30000                // 30 seconds timeout
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

  /**
   * Create a new calculation service
   * @param options Service configuration options
   */
  constructor(options: Partial<CalculationOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
    this.workerManager = new WorkerManager();
    this.cache = new Map();
  }

  /**
   * Generate a cache key for the given parameters
   * @param params Channel parameters
   * @param calculationType Type of calculation
   * @returns Cache key string
   */
  private generateCacheKey(params: ChannelParams, calculationType: string): string {
    const paramsForKey = {
      ...params,
      _calculationType: calculationType,
      _highResolution: this.options.highResolution
    };
    
    // Sort keys for consistent order
    return JSON.stringify(paramsForKey, Object.keys(paramsForKey).sort());
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
        return { results: cachedResult.result };
      }
    }
    
    try {
      let result: WaterSurfaceProfileResults;
      
      if (this.options.useWorker) {
        // Use Web Worker for calculation
        result = await this.workerManager.calculateWaterSurfaceProfile(params, {
          highResolution: this.options.highResolution,
          timeout: this.options.timeout,
          onProgress: this.options.showProgress ? onProgress : undefined
        });
      } else {
        // Direct calculation on main thread
        result = calculateWaterSurfaceProfile(params);
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
      return { 
        error: error instanceof Error ? error.message : 'Unknown calculation error' 
      };
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
        return { results: cachedResult.result };
      }
    }
    
    try {
      let result: DetailedWaterSurfaceResults;
      
      if (this.options.useWorker) {
        // Use Web Worker for calculation
        result = await this.workerManager.calculateDetailedProfile(params, {
          highResolution: this.options.highResolution,
          timeout: this.options.timeout,
          onProgress: this.options.showProgress ? onProgress : undefined
        });
      } else {
        // Direct calculation on main thread
        const directResult = calculateDetailedProfile(params);
        
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
      return { 
        error: error instanceof Error ? error.message : 'Unknown calculation error' 
      };
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
    
    // Direct calculation on main thread (simple enough to not need a worker)
    const result = calculateCriticalDepth(params);
    
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
    
    // Direct calculation on main thread (simple enough to not need a worker)
    const result = calculateNormalDepth(params);
    
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
   * @returns Whether Web Workers are supported in the current environment
   */
  canUseWorker(): boolean {
    return this.workerManager.isWorkerSupported();
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
}

// Export a singleton instance for use throughout the application
export const calculationService = new CalculationService();

// Export a factory function for creating custom instances
export function createCalculationService(options: Partial<CalculationOptions> = {}): CalculationService {
  return new CalculationService(options);
}

export default CalculationService;