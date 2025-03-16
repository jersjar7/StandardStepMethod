import { FlowDepthPoint } from '../types';

/**
 * Interpolates profile at specific stations
 * @param profile Existing water surface profile
 * @param stations Array of stations to interpolate
 * @returns Array of interpolated flow depth points
 */
export function interpolateProfileAtStations(
  profile: FlowDepthPoint[],
  stations: number[]
): FlowDepthPoint[] {
  // Sort profile by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Check if profile has at least two points
  if (sortedProfile.length < 2) {
    throw new Error("Profile must have at least two points for interpolation");
  }
  
  // Get min and max stations in the profile
  const minStation = sortedProfile[0].x;
  const maxStation = sortedProfile[sortedProfile.length - 1].x;
  
  // Filter stations to those within the profile range
  const validStations = stations.filter(s => s >= minStation && s <= maxStation);
  
  // Interpolate results
  const results: FlowDepthPoint[] = [];
  
  for (const station of validStations) {
    // Find the two points that bracket the station
    let i = 0;
    while (i < sortedProfile.length - 1 && sortedProfile[i + 1].x < station) {
      i++;
    }
    
    // If station matches an existing point exactly, use that point
    if (sortedProfile[i].x === station) {
      results.push({ ...sortedProfile[i] });
      continue;
    }
    
    // Check if we're at the last point
    if (i === sortedProfile.length - 1) {
      results.push({ ...sortedProfile[i] });
      continue;
    }
    
    // Otherwise, interpolate between the two bracketing points
    const p1 = sortedProfile[i];
    const p2 = sortedProfile[i + 1];
    
    // Calculate interpolation factor
    const t = (station - p1.x) / (p2.x - p1.x);
    
    // Interpolate all properties
    const interpolatedPoint: FlowDepthPoint = {
      x: station,
      y: p1.y + t * (p2.y - p1.y),
      velocity: p1.velocity + t * (p2.velocity - p1.velocity),
      froudeNumber: p1.froudeNumber + t * (p2.froudeNumber - p1.froudeNumber),
      specificEnergy: p1.specificEnergy + t * (p2.specificEnergy - p1.specificEnergy),
      criticalDepth: p1.criticalDepth,
      normalDepth: p1.normalDepth
    };
    
    results.push(interpolatedPoint);
  }
  
  return results;
}

/**
 * Creates a uniformly spaced profile by interpolation
 * @param profile Original water surface profile
 * @param numPoints Desired number of points
 * @returns Uniformly spaced profile
 */
export function createUniformProfile(
  profile: FlowDepthPoint[],
  numPoints: number = 100
): FlowDepthPoint[] {
  // Sort profile by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Get min and max stations
  const minStation = sortedProfile[0].x;
  const maxStation = sortedProfile[sortedProfile.length - 1].x;
  
  // Create uniformly spaced stations
  const step = (maxStation - minStation) / (numPoints - 1);
  const stations: number[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    stations.push(minStation + i * step);
  }
  
  // Interpolate at the new stations
  return interpolateProfileAtStations(sortedProfile, stations);
}

/**
 * Resamples the profile to reduce the number of points while preserving important features
 * @param profile Original water surface profile
 * @param maxPoints Maximum number of points in the resampled profile
 * @returns Resampled profile
 */
export function resampleProfile(
  profile: FlowDepthPoint[],
  maxPoints: number = 50
): FlowDepthPoint[] {
  if (profile.length <= maxPoints) {
    return [...profile]; // No need to resample
  }
  
  // Sort by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Calculate the error if we skip a point
  const calculateError = (p1: FlowDepthPoint, p2: FlowDepthPoint, p3: FlowDepthPoint): number => {
    // Linear interpolation between p1 and p3
    const t = (p2.x - p1.x) / (p3.x - p1.x);
    const interpolatedY = p1.y + t * (p3.y - p1.y);
    
    // Error is the difference between the actual and interpolated values
    return Math.abs(p2.y - interpolatedY);
  };
  
  // Calculate error for each internal point
  const errors: Array<{ index: number; error: number }> = [];
  for (let i = 1; i < sortedProfile.length - 1; i++) {
    const error = calculateError(
      sortedProfile[i - 1], 
      sortedProfile[i], 
      sortedProfile[i + 1]
    );
    errors.push({ index: i, error });
  }
  
  // Sort points by error (ascending)
  errors.sort((a, b) => a.error - b.error);
  
  // Keep track of which points to remove
  const pointsToRemove = new Set<number>();
  
  // Remove points with the lowest error until we reach the desired count
  // Never remove first or last points
  let i = 0;
  while (sortedProfile.length - pointsToRemove.size > maxPoints && i < errors.length) {
    pointsToRemove.add(errors[i].index);
    i++;
  }
  
  // Create the resampled profile
  const result: FlowDepthPoint[] = [];
  for (let i = 0; i < sortedProfile.length; i++) {
    if (!pointsToRemove.has(i)) {
      result.push(sortedProfile[i]);
    }
  }
  
  return result;
}

/**
 * Extracts a segment of the profile between specified stations
 * @param profile Original water surface profile
 * @param startStation Starting station
 * @param endStation Ending station
 * @returns Profile segment
 */
export function extractProfileSegment(
  profile: FlowDepthPoint[],
  startStation: number,
  endStation: number
): FlowDepthPoint[] {
  // Sort profile by station
  const sortedProfile = [...profile].sort((a, b) => a.x - b.x);
  
  // Filter points within the specified range
  const segmentPoints = sortedProfile.filter(
    point => point.x >= startStation && point.x <= endStation
  );
  
  // If no points are within the range, interpolate at the boundaries
  if (segmentPoints.length === 0) {
    const startPoint = interpolateProfileAtStations(sortedProfile, [startStation])[0];
    const endPoint = interpolateProfileAtStations(sortedProfile, [endStation])[0];
    return [startPoint, endPoint];
  }
  
  // If the segment doesn't include the exact boundaries, add interpolated points
  if (segmentPoints[0].x > startStation) {
    const startPoint = interpolateProfileAtStations(sortedProfile, [startStation])[0];
    segmentPoints.unshift(startPoint);
  }
  
  if (segmentPoints[segmentPoints.length - 1].x < endStation) {
    const endPoint = interpolateProfileAtStations(sortedProfile, [endStation])[0];
    segmentPoints.push(endPoint);
  }
  
  return segmentPoints;
}