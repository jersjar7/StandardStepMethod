import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateChannelParams,
  setChannelType,
  startCalculation,
  calculationSuccess,
  calculationFailure,
  resetCalculator,
  HydraulicJump
} from './stores/calculatorSlice';
import { RootState } from '../../stores';

// Import components
import ChannelForm from './components/ChannelForm/ChannelForm';
import ResultsTable from './components/ResultsTable';
import ProfileVisualization from './components/ProfileVisualization';
import CrossSectionView from './components/CrossSectionView';
import WaterSurfaceVisualization from './components/WaterSurfaceVisualization';
import CalculatorTabs, { TabType } from './components/CalculatorTabs';
import ExportMenu from './components/ExportMenu';

// Import hydraulics utilities
import {
  calculateWaterSurfaceProfile,
  calculateArea,
  calculateTopWidth,
  calculateWetPerimeter,
  calculateHydraulicRadius
} from './utils/hydraulics';

const Calculator: React.FC = () => {
  const dispatch = useDispatch();
  const {
    channelParams,
    results,
    isCalculating,
    error,
    hydraulicJump
  } = useSelector((state: RootState) => state.calculator);
  
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('input');
  
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
      const jumpData: HydraulicJump = output.hydraulicJump ? {
        occurs: true,
        station: output.hydraulicJump.position,
        upstreamDepth: output.hydraulicJump.depth1,
        downstreamDepth: output.hydraulicJump.depth2
      } : { occurs: false };
      
      // Dispatch successful calculation
      dispatch(calculationSuccess({ 
        results: formattedResults, 
        hydraulicJump: jumpData 
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
      <CalculatorTabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        hasResults={results.length > 0}
      />
      
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
        
        {activeTab === 'results' && results.length > 0 && (
          <div id="results-section">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">Calculation Results</h2>
              <ExportMenu results={results} channelParams={channelParams} />
            </div>
            
            <ResultsTable results={results} />
            
            {hydraulicJump?.occurs && (
              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
                <h3 className="text-lg font-medium text-yellow-800">Hydraulic Jump Detected</h3>
                <p className="mt-2 text-sm text-yellow-700">
                  A hydraulic jump occurs at station {hydraulicJump.station?.toFixed(2)} m.
                  The water depth changes from {hydraulicJump.upstreamDepth?.toFixed(3)} m to {hydraulicJump.downstreamDepth?.toFixed(3)} m.
                </p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'profile' && results.length > 0 && (
          <ProfileVisualization results={results} />
        )}
        
        {activeTab === 'cross-section' && results.length > 0 && selectedResult && (
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
        
        {activeTab === 'water-surface' && results.length > 0 && (
          <WaterSurfaceVisualization results={results} />
        )}
      </div>
    </div>
  );
};

export default Calculator;