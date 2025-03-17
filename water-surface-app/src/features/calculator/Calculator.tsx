import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateChannelParams,
  setChannelType,
  setWaterSurfaceResults,
  resetResults
} from './stores/calculatorSlice';
import { RootState } from '../../stores';
import { 
  ChannelType, 
} from './types';

// Import components
import ChannelForm from './components/ChannelForm/ChannelForm';
import CalculatorTabs, { TabType } from './components/CalculatorTabs';
import ResultsTable from './components/ResultsTable';
import WaterSurfaceProfileVisualization from './components/WaterSurfaceVisualization';
import CrossSectionView from './components/CrossSectionView';
import ExportMenu from './components/ExportMenu';

// Import hydraulics utilities and hooks
import { useChannelCalculations } from './hooks/useChannelCalculations';

const Calculator: React.FC = () => {
  const dispatch = useDispatch();
  const {
    channelParams,
    isCalculating,
    error,
    detailedResults
  } = useSelector((state: RootState) => state.calculator);
  
  const [activeTab, setActiveTab] = useState<TabType>('input');
  const [selectedStation, setSelectedStation] = useState<number>(0);
  
  // Use channel calculations hook for standardized calculations
  const { calculateProfileWithHandling } = useChannelCalculations();
  
  // Flag to check if we have results
  const hasResults = !!detailedResults && detailedResults.flowProfile.length > 0;
  
  // Handle tab changes based on results
  useEffect(() => {
    // If results are available and we're on the input tab, switch to results
    if (hasResults && activeTab === 'input' && !isCalculating) {
      setActiveTab('results');
    }
    
    // If no results are available and we're not on input tab, switch to input
    if (!hasResults && activeTab !== 'input' && !isCalculating) {
      setActiveTab('input');
    }
  }, [hasResults, isCalculating, activeTab]);
  
  // Handle calculation
  const handleCalculate = async () => {
    try {
      // Run the calculation
      const results = await calculateProfileWithHandling(channelParams);
      
      // Store results in Redux if calculation was successful
      if (results) {
        dispatch(setWaterSurfaceResults(results));
        
        // Set initial selected station
        if (results.flowProfile && results.flowProfile.length > 0) {
          setSelectedStation(results.flowProfile[0].x);
        }
      }
    } catch (error) {
      console.error('Calculation error:', error);
    }
  };
  
  // Handle reset
  const handleReset = () => {
    dispatch(resetResults());
    setActiveTab('input');
  };
  
  // Handle channel type change
  const handleChannelTypeChange = (type: ChannelType) => {
    dispatch(setChannelType(type));
  };
  
  // Handle channel parameter changes
  const handleChannelParamsChange = (params: Partial<typeof channelParams>) => {
    dispatch(updateChannelParams(params));
  };
  
  // Find the result at the selected station
  const getResultAtStation = () => {
    if (!detailedResults?.flowProfile || detailedResults.flowProfile.length === 0) {
      return null;
    }
    
    // Find the closest point to the selected station
    return detailedResults.flowProfile.reduce((closest, current) => {
      const currentDistance = Math.abs(current.x - selectedStation);
      const closestDistance = Math.abs(closest.x - selectedStation);
      return currentDistance < closestDistance ? current : closest;
    }, detailedResults.flowProfile[0]);
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">Water Surface Profile Calculator</h1>
      
      {/* Tabs navigation */}
      <CalculatorTabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        hasResults={hasResults}
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
          <div>
            <ChannelForm 
              channelParams={channelParams}
              isCalculating={isCalculating}
              onChannelTypeChange={handleChannelTypeChange}
              onParamsChange={handleChannelParamsChange}
              onCalculate={handleCalculate}
              onReset={handleReset}
            />
          </div>
        )}
        
        {activeTab === 'results' && hasResults && (
          <div id="results-section">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">Calculation Results</h2>
              <ExportMenu 
                results={detailedResults.flowProfile} 
                channelParams={channelParams} 
              />
            </div>
            
            <ResultsTable 
              results={detailedResults}
              onSelectPoint={(point) => setSelectedStation(point.x)}
            />
            
            {detailedResults.hydraulicJump?.occurs && (
              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
                <h3 className="text-lg font-medium text-yellow-800">Hydraulic Jump Detected</h3>
                <p className="mt-2 text-sm text-yellow-700">
                  A hydraulic jump occurs at station {detailedResults.hydraulicJump.station?.toFixed(2)} m.
                  The water depth changes from {detailedResults.hydraulicJump.upstreamDepth?.toFixed(3)} m to {detailedResults.hydraulicJump.downstreamDepth?.toFixed(3)} m.
                </p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'profile' && hasResults && (
          <WaterSurfaceProfileVisualization 
            results={detailedResults}
          />
        )}
        
        {activeTab === 'cross-section' && hasResults && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Station:
              </label>
              <input
                type="range"
                min={detailedResults.flowProfile[0].x}
                max={detailedResults.flowProfile[detailedResults.flowProfile.length - 1].x}
                value={selectedStation}
                onChange={(e) => setSelectedStation(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                step={(detailedResults.flowProfile[detailedResults.flowProfile.length - 1].x - detailedResults.flowProfile[0].x) / 100}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{detailedResults.flowProfile[0].x.toFixed(0)} m</span>
                <span>{detailedResults.flowProfile[Math.floor(detailedResults.flowProfile.length / 2)].x.toFixed(0)} m</span>
                <span>{detailedResults.flowProfile[detailedResults.flowProfile.length - 1].x.toFixed(0)} m</span>
              </div>
            </div>
            
            <CrossSectionView
              selectedFlowPoint={getResultAtStation() || undefined}
              channelType={channelParams.channelType}
              results={detailedResults}
            />
          </div>
        )}
        
        {activeTab === 'water-surface' && hasResults && (
          <WaterSurfaceProfileVisualization 
            results={detailedResults}
          />
        )}
      </div>
    </div>
  );
};

export default Calculator;