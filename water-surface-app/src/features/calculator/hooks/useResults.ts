import { useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../stores';
import { ProfileType, FlowDepthPoint, FlowRegime } from '../types';
import { ExportService } from '../../../services/exportService';

/**
 * Hook for managing and manipulating calculation results
 * 
 * This hook provides utilities for filtering, sorting, exporting, and analyzing
 * the water surface profile calculation results.
 */
export const useResults = () => {
  const { detailedResults, channelParams } = useSelector((state: RootState) => state.calculator);
  
  // State for selected result (for detailed view or cross-section analysis)
  const [selectedPointIndex, setSelectedPointIndex] = useState<number>(0);
  
  // Get the currently selected point
  const selectedPoint = useMemo(() => {
    if (!detailedResults?.flowProfile || detailedResults.flowProfile.length === 0) return null;
    return detailedResults.flowProfile[Math.min(selectedPointIndex, detailedResults.flowProfile.length - 1)];
  }, [detailedResults, selectedPointIndex]);
  
  /**
   * Select a specific flow point by index
   * @param index Point index to select
   */
  const selectPoint = useCallback((index: number) => {
    if (detailedResults?.flowProfile && index >= 0 && index < detailedResults.flowProfile.length) {
      setSelectedPointIndex(index);
    }
  }, [detailedResults]);
  
  /**
   * Select a specific flow point by station
   * @param station Station value to find
   */
  const selectPointByStation = useCallback((station: number) => {
    if (!detailedResults?.flowProfile || detailedResults.flowProfile.length === 0) return;
    
    // Find the point closest to the requested station
    let closestIndex = 0;
    let minDistance = Math.abs(detailedResults.flowProfile[0].x - station);
    
    for (let i = 1; i < detailedResults.flowProfile.length; i++) {
      const distance = Math.abs(detailedResults.flowProfile[i].x - station);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    setSelectedPointIndex(closestIndex);
  }, [detailedResults]);
  
  /**
   * Get results summary statistics
   */
  const getResultsSummary = useMemo(() => {
    if (!detailedResults?.flowProfile || detailedResults.flowProfile.length === 0) {
      return null;
    }
    
    const flowProfile = detailedResults.flowProfile;
    
    // Calculate min, max, and average values for key parameters
    const summary = {
      minDepth: Math.min(...flowProfile.map(p => p.y)),
      maxDepth: Math.max(...flowProfile.map(p => p.y)),
      avgDepth: flowProfile.reduce((sum, p) => sum + p.y, 0) / flowProfile.length,
      
      minVelocity: Math.min(...flowProfile.map(p => p.velocity)),
      maxVelocity: Math.max(...flowProfile.map(p => p.velocity)),
      avgVelocity: flowProfile.reduce((sum, p) => sum + p.velocity, 0) / flowProfile.length,
      
      minFroude: Math.min(...flowProfile.map(p => p.froudeNumber)),
      maxFroude: Math.max(...flowProfile.map(p => p.froudeNumber)),
      avgFroude: flowProfile.reduce((sum, p) => sum + p.froudeNumber, 0) / flowProfile.length,
      
      channelLength: flowProfile[flowProfile.length - 1].x - flowProfile[0].x,
      criticalDepth: detailedResults.criticalDepth || flowProfile[0].criticalDepth,
      normalDepth: detailedResults.normalDepth || flowProfile[0].normalDepth
    };
    
    return summary;
  }, [detailedResults]);
  
  /**
   * Get the profile type based on depth, critical depth, and normal depth
   */
  const getProfileType = useMemo((): ProfileType => {
    if (!detailedResults?.flowProfile || detailedResults.flowProfile.length === 0 || !channelParams) {
      return ProfileType.UNKNOWN;
    }
    
    // First check if we already have a profile type in the results
    if (detailedResults.profileType) {
      return detailedResults.profileType;
    }
    
    // If not, determine it based on depths
    const { criticalDepth, normalDepth } = channelParams;
    if (!criticalDepth || !normalDepth) return ProfileType.UNKNOWN;
    
    // Calculate average depth for classification
    const flowProfile = detailedResults.flowProfile;
    const avgDepth = flowProfile.reduce((sum, p) => sum + p.y, 0) / flowProfile.length;
    
    // Classify based on depth relationships
    if (normalDepth > criticalDepth) {
      // Mild slope
      if (avgDepth > normalDepth) return ProfileType.M1;
      if (avgDepth < normalDepth && avgDepth > criticalDepth) return ProfileType.M2;
      return ProfileType.M3;
    } else if (normalDepth < criticalDepth) {
      // Steep slope
      if (avgDepth > criticalDepth) return ProfileType.S1;
      if (avgDepth < criticalDepth && avgDepth > normalDepth) return ProfileType.S2;
      return ProfileType.S3;
    } else {
      // Critical slope
      if (avgDepth > criticalDepth) return ProfileType.C1;
      if (avgDepth < criticalDepth) return ProfileType.C3;
      return ProfileType.C2;
    }
  }, [detailedResults, channelParams]);
  
  /**
   * Determine if the flow is subcritical, critical, or supercritical
   */
  const getFlowRegime = useMemo((): FlowRegime | 'mixed' | 'unknown' => {
    if (!detailedResults?.flowProfile || detailedResults.flowProfile.length === 0) {
      return 'unknown';
    }
    
    // Check if we already have flow regime in the results
    if ('flowRegime' in detailedResults && detailedResults.flowRegime !== undefined) {
      // Use type assertion to tell TypeScript this is a FlowRegime
      return detailedResults.flowRegime as FlowRegime;
    }
    
    // Check if all points are subcritical, all supercritical, or mixed
    const flowProfile = detailedResults.flowProfile;
    const hasSubcritical = flowProfile.some(p => p.froudeNumber < 0.95);
    const hasSupercritical = flowProfile.some(p => p.froudeNumber > 1.05);
    
    if (hasSubcritical && !hasSupercritical) return FlowRegime.SUBCRITICAL;
    if (hasSupercritical && !hasSubcritical) return FlowRegime.SUPERCRITICAL;
    if (hasSubcritical && hasSupercritical) return 'mixed';
    return FlowRegime.CRITICAL;
  }, [detailedResults]);
  
  /**
   * Export calculation results to CSV
   */
  const exportToCsv = useCallback(() => {
    if (!detailedResults?.flowProfile || detailedResults.flowProfile.length === 0 || !channelParams) return;
    
    const csvContent = ExportService.exportToCSV(detailedResults.flowProfile, channelParams);
    ExportService.downloadCSV(csvContent);
  }, [detailedResults, channelParams]);
  
  /**
   * Export calculation results to JSON
   */
  const exportToJson = useCallback(() => {
    if (!detailedResults?.flowProfile || detailedResults.flowProfile.length === 0 || !channelParams) return;
    
    const jsonContent = ExportService.exportToJSON(detailedResults.flowProfile, channelParams);
    ExportService.downloadJSON(jsonContent);
  }, [detailedResults, channelParams]);
  
  /**
   * Generate and download a report
   */
  const generateReport = useCallback(() => {
    if (!detailedResults?.flowProfile || detailedResults.flowProfile.length === 0 || !channelParams) return;
    
    const reportContent = ExportService.generateReport(detailedResults.flowProfile, channelParams);
    ExportService.downloadReport(reportContent);
  }, [detailedResults, channelParams]);
  
  /**
   * Get results filtered for visualization
   * Reduces the number of points for smoother rendering
   */
  const getFilteredResults = useCallback((maxPoints: number = 100): FlowDepthPoint[] => {
    if (!detailedResults?.flowProfile || detailedResults.flowProfile.length === 0) return [];
    
    const flowProfile = detailedResults.flowProfile;
    if (flowProfile.length <= maxPoints) return flowProfile;
    
    // Sample the results to reduce the number of points
    const step = Math.ceil(flowProfile.length / maxPoints);
    return flowProfile.filter((_, index) => index % step === 0);
  }, [detailedResults]);
  
  /**
   * Get hydraulic jump information with additional details
   */
  const getHydraulicJumpDetails = useMemo(() => {
    if (!detailedResults?.hydraulicJump || 
        !detailedResults.hydraulicJump.occurs || 
        !detailedResults.flowProfile) {
      return null;
    }
    
    // Get Froude number at the jump
    const jump = detailedResults.hydraulicJump;
    const upstream = detailedResults.flowProfile.find(p => 
      Math.abs(p.x - (jump.station || 0)) < 0.01
    );
    
    if (!upstream) return jump;
    
    // Classify hydraulic jump type based on upstream Froude number
    let jumpType = 'Unknown';
    const fr = upstream.froudeNumber;
    
    if (fr < 1.7) jumpType = 'Undular Jump';
    else if (fr < 2.5) jumpType = 'Weak Jump';
    else if (fr < 4.5) jumpType = 'Oscillating Jump';
    else if (fr < 9.0) jumpType = 'Steady Jump';
    else jumpType = 'Strong Jump';
    
    // Estimate energy loss
    const energyLoss = jump.downstreamDepth && jump.upstreamDepth 
      ? (Math.pow(jump.downstreamDepth - jump.upstreamDepth, 3)) / (4 * jump.upstreamDepth * jump.downstreamDepth)
      : 0;
    
    // Return enhanced hydraulic jump info
    return {
      ...jump,
      jumpType,
      energyLoss,
      froudeNumber: fr
    };
  }, [detailedResults]);
  
  return {
    results: detailedResults?.flowProfile || [],
    selectedPoint,
    selectPoint,
    selectPointByStation,
    getResultsSummary,
    getProfileType,
    getFlowRegime,
    exportToCsv,
    exportToJson,
    generateReport,
    getFilteredResults,
    getHydraulicJumpDetails,
    hydraulicJump: detailedResults?.hydraulicJump
  };
};

export default useResults;