import { useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../stores';
import { CalculationResult, HydraulicJump, ProfileType } from '../types';
import { ExportService } from '../../../services/exportService';

/**
 * Hook for managing and manipulating calculation results
 * 
 * This hook provides utilities for filtering, sorting, exporting, and analyzing
 * the water surface profile calculation results.
 */
export const useResults = () => {
  const { results, hydraulicJump, channelParams } = useSelector((state: RootState) => state.calculator);
  
  // State for selected result (for detailed view or cross-section analysis)
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  
  // Get the currently selected result
  const selectedResult = useMemo(() => {
    if (!results || results.length === 0) return null;
    return results[Math.min(selectedResultIndex, results.length - 1)];
  }, [results, selectedResultIndex]);
  
  /**
   * Select a specific calculation result by index
   * @param index Result index to select
   */
  const selectResult = useCallback((index: number) => {
    if (results && index >= 0 && index < results.length) {
      setSelectedResultIndex(index);
    }
  }, [results]);
  
  /**
   * Select a specific calculation result by station
   * @param station Station value to find
   */
  const selectResultByStation = useCallback((station: number) => {
    if (!results || results.length === 0) return;
    
    // Find the result closest to the requested station
    let closestIndex = 0;
    let minDistance = Math.abs(results[0].station - station);
    
    for (let i = 1; i < results.length; i++) {
      const distance = Math.abs(results[i].station - station);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    setSelectedResultIndex(closestIndex);
  }, [results]);
  
  /**
   * Get results summary statistics
   */
  const getResultsSummary = useMemo(() => {
    if (!results || results.length === 0) {
      return null;
    }
    
    // Calculate min, max, and average values for key parameters
    const summary = {
      minDepth: Math.min(...results.map(r => r.depth)),
      maxDepth: Math.max(...results.map(r => r.depth)),
      avgDepth: results.reduce((sum, r) => sum + r.depth, 0) / results.length,
      
      minVelocity: Math.min(...results.map(r => r.velocity)),
      maxVelocity: Math.max(...results.map(r => r.velocity)),
      avgVelocity: results.reduce((sum, r) => sum + r.velocity, 0) / results.length,
      
      minFroude: Math.min(...results.map(r => r.froudeNumber)),
      maxFroude: Math.max(...results.map(r => r.froudeNumber)),
      avgFroude: results.reduce((sum, r) => sum + r.froudeNumber, 0) / results.length,
      
      channelLength: results[results.length - 1].station - results[0].station,
      criticalDepth: results[0]?.criticalDepth || 0,
      normalDepth: results[0]?.normalDepth || 0
    };
    
    return summary;
  }, [results]);
  
  /**
   * Get the profile type based on depth, critical depth, and normal depth
   */
  const getProfileType = useMemo((): ProfileType => {
    if (!results || results.length === 0 || !channelParams) {
      return ProfileType.UNKNOWN;
    }
    
    const { criticalDepth, normalDepth } = channelParams;
    if (!criticalDepth || !normalDepth) return ProfileType.UNKNOWN;
    
    // Calculate average depth for classification
    const avgDepth = results.reduce((sum, r) => sum + r.depth, 0) / results.length;
    
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
  }, [results, channelParams]);
  
  /**
   * Determine if the flow is subcritical, critical, or supercritical
   */
  const getFlowRegime = useMemo(() => {
    if (!results || results.length === 0) {
      return 'unknown';
    }
    
    // Check if all points are subcritical, all supercritical, or mixed
    const hasSubcritical = results.some(r => r.froudeNumber < 0.95);
    const hasSupercritical = results.some(r => r.froudeNumber > 1.05);
    
    if (hasSubcritical && !hasSupercritical) return 'subcritical';
    if (hasSupercritical && !hasSubcritical) return 'supercritical';
    if (hasSubcritical && hasSupercritical) return 'mixed';
    return 'critical';
  }, [results]);
  
  /**
   * Export calculation results to CSV
   */
  const exportToCsv = useCallback(() => {
    if (!results || results.length === 0 || !channelParams) return;
    
    const csvContent = ExportService.exportToCSV(results, channelParams);
    ExportService.downloadCSV(csvContent);
  }, [results, channelParams]);
  
  /**
   * Export calculation results to JSON
   */
  const exportToJson = useCallback(() => {
    if (!results || results.length === 0 || !channelParams) return;
    
    const jsonContent = ExportService.exportToJSON(results, channelParams);
    ExportService.downloadJSON(jsonContent);
  }, [results, channelParams]);
  
  /**
   * Generate and download a report
   */
  const generateReport = useCallback(() => {
    if (!results || results.length === 0 || !channelParams) return;
    
    const reportContent = ExportService.generateReport(results, channelParams);
    ExportService.downloadReport(reportContent);
  }, [results, channelParams]);
  
  /**
   * Get results filtered for visualization
   * Reduces the number of points for smoother rendering
   */
  const getFilteredResults = useCallback((maxPoints: number = 100): CalculationResult[] => {
    if (!results || results.length === 0) return [];
    if (results.length <= maxPoints) return results;
    
    // Sample the results to reduce the number of points
    const step = Math.ceil(results.length / maxPoints);
    return results.filter((_, index) => index % step === 0);
  }, [results]);
  
  /**
   * Get hydraulic jump information with additional details
   */
  const getHydraulicJumpDetails = useMemo(() => {
    if (!hydraulicJump || !hydraulicJump.occurs || !results) {
      return null;
    }
    
    // Get Froude number at the jump
    const jump = hydraulicJump as Required<HydraulicJump>;
    const upstream = results.find(r => Math.abs(r.station - jump.station) < 0.01);
    
    if (!upstream) return hydraulicJump;
    
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
      ...hydraulicJump,
      jumpType,
      energyLoss,
      froudeNumber: fr
    };
  }, [hydraulicJump, results]);
  
  return {
    results,
    selectedResult,
    selectResult,
    selectResultByStation,
    getResultsSummary,
    getProfileType,
    getFlowRegime,
    exportToCsv,
    exportToJson,
    generateReport,
    getFilteredResults,
    getHydraulicJumpDetails
  };
};

export default useResults;