import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateChannelParams,
  setChannelType,
  startCalculation,
  calculationSuccess,
  calculationFailure,
  resetCalculator
} from './stores/calculatorSlice';
import { RootState } from '../../stores';

// Import components
import ChannelForm from './components/ChannelForm';
import ResultsTable from './components/ResultsTable';
import ProfileVisualization from './components/ProfileVisualization';
import CrossSectionView from './components/CrossSectionView';
import WaterSurfaceVisualization from './components/WaterSurfaceVisualization';

// Import hydraulics utilities
import {
  calculateWaterSurfaceProfile,
  calculateArea,
  calculateTopWidth,
  calculateWetPerimeter,
  calculateHydraulicRadius
} from './utils/hydraulics';

// Interface for hydraulic jump
interface HydraulicJump {
  occurs: boolean;
  station?: number;
  upstreamDepth?: number;
  downstreamDepth?: number;
}

const Calculator: React.FC = () => {
  const dispatch = useDispatch();
  const {
    channelParams,
    results,
    isCalculating,
    error
  } = useSelector((state: RootState) => state.calculator);
  
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'profile' | 'cross-section' | 'water-surface'>('input');
  const [showExportOptions, setShowExportOptions] = useState<boolean>(false);
  
  // Update selected result when results change
  useEffect(() => {
    if (results && results.length > 0) {
      if (selectedResultIndex >= results.length) {
        setSelectedResultIndex(0);
      }
      setSelectedResult(results[selectedResultIndex]);
    } else {
      setSelectedResult(null);
    }
  }, [results, selectedResultIndex]);
  
  // Handle calculation
  const handleCalculate = async () => {
    dispatch(startCalculation());
    
    try {
      // Calculate water surface profile using the hydraulics utility
      const output = calculateWaterSurfaceProfile(channelParams);
      
      // Format results for the Redux store
      const formattedResults = output.flowProfile.map(point => ({
        station: point.x,
        depth: point.y,
        velocity: point.velocity,
        area: calculateArea(point.y, channelParams),
        topWidth: calculateTopWidth(point.y, channelParams),
        wetPerimeter: calculateWetPerimeter(point.y, channelParams),
        hydraulicRadius: calculateHydraulicRadius(point.y, channelParams),
        energy: point.specificEnergy,
        froudeNumber: point.froudeNumber,
        criticalDepth: point.criticalDepth,
        normalDepth: point.normalDepth
      }));
      
      // Format hydraulic jump data
      const hydraulicJump: HydraulicJump = output.hydraulicJump ? {
        occurs: true,
        station: output.hydraulicJump.position,
        upstreamDepth: output.hydraulicJump.depth1,
        downstreamDepth: output.hydraulicJump.depth2
      } : { occurs: false };
      
      // Dispatch successful calculation
      dispatch(calculationSuccess({ 
        results: formattedResults, 
        hydraulicJump 
      }));
      
      // Switch to results tab
      setActiveTab('results');
    } catch (err) {
      // Handle calculation errors
      dispatch(calculationFailure(err instanceof Error ? err.message : 'An unknown error occurred'));
    }
  };
  
  // Handle reset
  const handleReset = () => {
    dispatch(resetCalculator());
    setActiveTab('input');
  };
  
  // Handle export
  const handleExport = (format: 'csv' | 'json' | 'report') => {
    if (!results || results.length === 0) return;
    
    if (format === 'csv') {
      // Create CSV content
      const headers = ['Station (m)', 'Depth (m)', 'Velocity (m/s)', 'Area (m²)', 'Froude Number', 'Energy (m)'];
      let csvContent = headers.join(',') + '\n';
      
      results.forEach(result => {
        const row = [
          result.station.toFixed(2),
          result.depth.toFixed(3),
          result.velocity.toFixed(3),
          result.area.toFixed(3),
          result.froudeNumber.toFixed(3),
          result.energy.toFixed(3)
        ];
        csvContent += row.join(',') + '\n';
      });
      
      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'water_surface_profile.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'json') {
      // Create JSON content
      const jsonContent = JSON.stringify({
        channelParams,
        results
      }, null, 2);
      
      // Create download
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'water_surface_profile.json');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'report') {
      // Create a simple HTML report
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Water Surface Profile Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { color: #0284c7; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; }
          .summary-item { flex: 1; min-width: 200px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Water Surface Profile Calculation Report</h1>
        
        <h2>Channel Parameters</h2>
        <table>
          <tr><th>Parameter</th><th>Value</th></tr>
          <tr><td>Channel Type</td><td>${channelParams.channelType}</td></tr>
          <tr><td>Bottom Width</td><td>${channelParams.bottomWidth} m</td></tr>
          ${channelParams.sideSlope ? `<tr><td>Side Slope</td><td>${channelParams.sideSlope}</td></tr>` : ''}
          ${channelParams.diameter ? `<tr><td>Diameter</td><td>${channelParams.diameter} m</td></tr>` : ''}
          <tr><td>Manning's n</td><td>${channelParams.manningN}</td></tr>
          <tr><td>Channel Slope</td><td>${channelParams.channelSlope}</td></tr>
          <tr><td>Discharge</td><td>${channelParams.discharge} m³/s</td></tr>
          <tr><td>Channel Length</td><td>${channelParams.length} m</td></tr>
        </table>
        
        <h2>Results Summary</h2>
        <div class="summary">
          <div class="summary-item">
            <div><strong>Normal Depth:</strong> ${results[0]?.normalDepth?.toFixed(3) ?? 'N/A'} m</div>
          </div>
          <div class="summary-item">
            <div><strong>Critical Depth:</strong> ${results[0]?.criticalDepth?.toFixed(3) ?? 'N/A'} m</div>
          </div>
          <div class="summary-item">
            <div><strong>Flow Regime:</strong> ${results[0]?.froudeNumber < 1 ? 'Subcritical' : 'Supercritical'}</div>
          </div>
        </div>
        
        <h2>Water Surface Profile</h2>
        <table>
          <tr>
            <th>Station (m)</th>
            <th>Depth (m)</th>
            <th>Velocity (m/s)</th>
            <th>Area (m²)</th>
            <th>Froude Number</th>
            <th>Energy (m)</th>
          </tr>
          ${results.map(result => `
            <tr>
              <td>${result.station.toFixed(2)}</td>
              <td>${result.depth.toFixed(3)}</td>
              <td>${result.velocity.toFixed(3)}</td>
              <td>${result.area.toFixed(3)}</td>
              <td>${result.froudeNumber.toFixed(3)}</td>
              <td>${result.energy.toFixed(3)}</td>
            </tr>
          `).join('')}
        </table>
        
        <p><em>Report generated on ${new Date().toLocaleString()}</em></p>
      </body>
      </html>
      `;
      
      // Create download
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'water_surface_profile_report.html');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    setShowExportOptions(false);
  };
  
  // Handle selecting a specific result for cross-section view
  const handleResultSelect = (index: number) => {
    if (results && index >= 0 && index < results.length) {
      setSelectedResultIndex(index);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">Water Surface Profile Calculator</h1>
      
      {/* Tabs navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('input')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'input' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Channel Input
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              disabled={!results || results.length === 0}
            >
              Results Table
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              disabled={!results || results.length === 0}
            >
              Profile Visualization
            </button>
            <button
              onClick={() => setActiveTab('cross-section')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cross-section' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              disabled={!results || results.length === 0}
            >
              Cross Section
            </button>
            <button
              onClick={() => setActiveTab('water-surface')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'water-surface' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              disabled={!results || results.length === 0}
            >
              Water Surface
            </button>
          </nav>
        </div>
      </div>
      
      {/* Error alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tab content */}
      <div>
        {activeTab === 'input' && (
          <ChannelForm 
            channelParams={channelParams}
            isCalculating={isCalculating}
            onChannelTypeChange={(type) => dispatch(setChannelType(type))}
            onParamsChange={(params) => dispatch(updateChannelParams(params))}
            onCalculate={handleCalculate}
            onReset={handleReset}
          />
        )}
        
        {activeTab === 'results' && results && results.length > 0 && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">Calculation Results</h2>
              <div className="relative">
                <button
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Export Results
                </button>
                
                {showExportOptions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={() => handleExport('csv')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Export as CSV
                      </button>
                      <button
                        onClick={() => handleExport('json')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Export as JSON
                      </button>
                      <button
                        onClick={() => handleExport('report')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Generate Report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <ResultsTable 
              results={results} 
            />
          </div>
        )}
        
        {activeTab === 'profile' && results && results.length > 0 && (
          <ProfileVisualization 
            results={results} 
          />
        )}
        
        {activeTab === 'cross-section' && results && results.length > 0 && selectedResult && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Station:
              </label>
              <input
                type="range"
                min={0}
                max={results.length - 1}
                value={selectedResultIndex}
                onChange={(e) => handleResultSelect(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{results[0].station.toFixed(0)} m</span>
                <span>{results[Math.floor(results.length / 2)].station.toFixed(0)} m</span>
                <span>{results[results.length - 1].station.toFixed(0)} m</span>
              </div>
            </div>
            
            <CrossSectionView
              selectedResult={selectedResult}
              channelType={channelParams.channelType}
            />
          </div>
        )}
        
        {activeTab === 'water-surface' && results && results.length > 0 && (
          <WaterSurfaceVisualization 
            results={results} 
          />
        )}
      </div>
    </div>
  );
};

export default Calculator;