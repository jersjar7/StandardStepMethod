import { ChannelParams } from '../../../stores/calculatorSlice';
import { WaterSurfaceProfileResults } from './types';
import { calculateCriticalDepth } from '../criticalFlow';
import { calculateNormalDepth } from '../normalFlow';

/**
 * Interface for cached calculation results
 */
export interface CachedResult<T> {
  result: T;
  timestamp: number;
  params: any;
}

/**
 * Configuration options for the calculation cache
 */
export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;  // Time-to-live in milliseconds
  precision: number; // Decimal precision for parameter comparison
}

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  enabled: true,
  maxSize: 100,
  ttl: 10 * 60 * 1000, // 10 minutes
  precision: 4
};

/**
 * Cache for standard step calculations
 * Provides caching functionality for expensive hydraulic calculations
 */
export class CalculationCache {
  private profileCache: Map<string, CachedResult<WaterSurfaceProfileResults>>;
  private criticalDepthCache: Map<string, CachedResult<number>>;
  private normalDepthCache: Map<string, CachedResult<number>>;
  private config: CacheConfig;
  
  /**
   * Create a new calculation cache
   * @param config Cache configuration
   */
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.profileCache = new Map();
    this.criticalDepthCache = new Map();
    this.normalDepthCache = new Map();
  }
  
  /**
   * Generate a cache key for channel parameters
   * @param params Channel parameters
   * @returns Cache key string
   */
  private generateKey(params: any): string {
    // Create a simplified version of params for consistent key generation
    const simplifiedParams: Record<string, any> = {};
    
    // Round numeric values to the specified precision for consistent keys
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'number') {
        simplifiedParams[key] = Number(value.toFixed(this.config.precision));
      } else if (value !== undefined && value !== null) {
        simplifiedParams[key] = value;
      }
    }
    
    // Generate deterministic key by sorting properties
    return JSON.stringify(simplifiedParams, Object.keys(simplifiedParams).sort());
  }
  
  /**
   * Check if a cache entry is valid (not expired)
   * @param cachedResult Cached result to check
   * @returns Whether the cache entry is still valid
   */
  private isValid<T>(cachedResult: CachedResult<T>): boolean {
    if (!this.config.enabled) return false;
    
    const now = Date.now();
    return now - cachedResult.timestamp < this.config.ttl;
  }
  
  /**
   * Enforce the maximum cache size
   * @param cache Cache to enforce size limit on
   */
  private enforceCacheSize<T>(cache: Map<string, CachedResult<T>>): void {
    if (cache.size <= this.config.maxSize) return;
    
    // Remove oldest entries
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, entries.length - this.config.maxSize);
    for (const [key] of toRemove) {
      cache.delete(key);
    }
  }
  
  /**
   * Get a cached water surface profile
   * @param params Channel parameters
   * @returns Cached profile or undefined if not found
   */
  getWaterSurfaceProfile(params: ChannelParams): WaterSurfaceProfileResults | undefined {
    if (!this.config.enabled) return undefined;
    
    const key = this.generateKey(params);
    const cachedResult = this.profileCache.get(key);
    
    if (cachedResult && this.isValid(cachedResult)) {
      return cachedResult.result;
    }
    
    return undefined;
  }
  
  /**
   * Cache a water surface profile
   * @param params Channel parameters
   * @param result Water surface profile results
   */
  cacheWaterSurfaceProfile(params: ChannelParams, result: WaterSurfaceProfileResults): void {
    if (!this.config.enabled) return;
    
    const key = this.generateKey(params);
    this.profileCache.set(key, {
      result,
      timestamp: Date.now(),
      params
    });
    
    this.enforceCacheSize(this.profileCache);
  }
  
  /**
   * Get a cached critical depth
   * @param params Channel parameters
   * @returns Cached critical depth or undefined if not found
   */
  getCriticalDepth(params: ChannelParams): number | undefined {
    if (!this.config.enabled) return undefined;
    
    // Extract only the parameters relevant to critical depth calculation
    const relevantParams = {
      channelType: params.channelType,
      bottomWidth: params.bottomWidth,
      sideSlope: params.sideSlope,
      diameter: params.diameter,
      discharge: params.discharge,
      units: params.units
    };
    
    const key = this.generateKey(relevantParams);
    const cachedResult = this.criticalDepthCache.get(key);
    
    if (cachedResult && this.isValid(cachedResult)) {
      return cachedResult.result;
    }
    
    return undefined;
  }
  
  /**
   * Cache a critical depth calculation
   * @param params Channel parameters
   * @param depth Critical depth
   */
  cacheCriticalDepth(params: ChannelParams, depth: number): void {
    if (!this.config.enabled) return;
    
    // Extract only the parameters relevant to critical depth calculation
    const relevantParams = {
      channelType: params.channelType,
      bottomWidth: params.bottomWidth,
      sideSlope: params.sideSlope,
      diameter: params.diameter,
      discharge: params.discharge,
      units: params.units
    };
    
    const key = this.generateKey(relevantParams);
    this.criticalDepthCache.set(key, {
      result: depth,
      timestamp: Date.now(),
      params: relevantParams
    });
    
    this.enforceCacheSize(this.criticalDepthCache);
  }
  
  /**
   * Get a cached normal depth
   * @param params Channel parameters
   * @returns Cached normal depth or undefined if not found
   */
  getNormalDepth(params: ChannelParams): number | undefined {
    if (!this.config.enabled) return undefined;
    
    // Extract only the parameters relevant to normal depth calculation
    const relevantParams = {
      channelType: params.channelType,
      bottomWidth: params.bottomWidth,
      sideSlope: params.sideSlope,
      diameter: params.diameter,
      discharge: params.discharge,
      channelSlope: params.channelSlope,
      manningN: params.manningN,
      units: params.units
    };
    
    const key = this.generateKey(relevantParams);
    const cachedResult = this.normalDepthCache.get(key);
    
    if (cachedResult && this.isValid(cachedResult)) {
      return cachedResult.result;
    }
    
    return undefined;
  }
  
  /**
   * Cache a normal depth calculation
   * @param params Channel parameters
   * @param depth Normal depth
   */
  cacheNormalDepth(params: ChannelParams, depth: number): void {
    if (!this.config.enabled) return;
    
    // Extract only the parameters relevant to normal depth calculation
    const relevantParams = {
      channelType: params.channelType,
      bottomWidth: params.bottomWidth,
      sideSlope: params.sideSlope,
      diameter: params.diameter,
      discharge: params.discharge,
      channelSlope: params.channelSlope,
      manningN: params.manningN,
      units: params.units
    };
    
    const key = this.generateKey(relevantParams);
    this.normalDepthCache.set(key, {
      result: depth,
      timestamp: Date.now(),
      params: relevantParams
    });
    
    this.enforceCacheSize(this.normalDepthCache);
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    this.profileCache.clear();
    this.criticalDepthCache.clear();
    this.normalDepthCache.clear();
  }
  
  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): Record<string, any> {
    return {
      enabled: this.config.enabled,
      profileCacheSize: this.profileCache.size,
      criticalDepthCacheSize: this.criticalDepthCache.size,
      normalDepthCacheSize: this.normalDepthCache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl
    };
  }
  
  /**
   * Update cache configuration
   * @param config New cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Global cache instance for simplified access
 */
const globalCache = new CalculationCache();

/**
 * Get the global calculation cache instance
 * @returns Global cache instance
 */
export function getCalculationCache(): CalculationCache {
  return globalCache;
}

/**
 * Wrapper for calculating water surface profile with caching
 * @param params Channel parameters
 * @param calculateFunc Function to calculate profile if not cached
 * @returns Water surface profile results
 */
export function cachedWaterSurfaceProfile(
  params: ChannelParams,
  calculateFunc: (params: ChannelParams) => WaterSurfaceProfileResults
): WaterSurfaceProfileResults {
  const cache = getCalculationCache();
  
  // Try to get from cache
  const cachedResult = cache.getWaterSurfaceProfile(params);
  if (cachedResult) {
    return cachedResult;
  }
  
  // Calculate and cache result
  const result = calculateFunc(params);
  cache.cacheWaterSurfaceProfile(params, result);
  
  return result;
}

/**
 * Wrapper for calculating critical depth with caching
 * @param params Channel parameters
 * @returns Critical depth
 */
export function cachedCriticalDepth(params: ChannelParams): number {
  const cache = getCalculationCache();
  
  // Try to get from cache
  const cachedDepth = cache.getCriticalDepth(params);
  if (cachedDepth !== undefined) {
    return cachedDepth;
  }
  
  // Calculate and cache result
  const depth = calculateCriticalDepth(params);
  cache.cacheCriticalDepth(params, depth);
  
  return depth;
}

/**
 * Wrapper for calculating normal depth with caching
 * @param params Channel parameters
 * @returns Normal depth
 */
export function cachedNormalDepth(params: ChannelParams): number {
  const cache = getCalculationCache();
  
  // Try to get from cache
  const cachedDepth = cache.getNormalDepth(params);
  if (cachedDepth !== undefined) {
    return cachedDepth;
  }
  
  // Calculate and cache result
  const depth = calculateNormalDepth(params);
  cache.cacheNormalDepth(params, depth);
  
  return depth;
}

/**
 * Configure the global calculation cache
 * @param config Cache configuration
 */
export function configureCache(config: Partial<CacheConfig>): void {
  getCalculationCache().updateConfig(config);
}

/**
 * Determine if caching should be used based on parameters
 * @param params Channel parameters
 * @returns Whether caching is recommended
 */
export function shouldUseCache(params: ChannelParams): boolean {
  // Caching is most beneficial for:
  // 1. Standard channel configurations
  // 2. Common flow rates
  // 3. Non-specialized boundary conditions
  
  // If boundary conditions are set, caching might be less effective
  const hasCustomBoundaryConditions = 
    params.upstreamDepth !== undefined || 
    params.downstreamDepth !== undefined;
  
  // Very long channels or unusual parameters might have unique solutions
  const isStandardLength = params.length < 5000; // Less than 5km
  
  return isStandardLength && !hasCustomBoundaryConditions;
}