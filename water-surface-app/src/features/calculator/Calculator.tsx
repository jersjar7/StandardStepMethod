import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateChannelParams,
  setChannelType,
  setSelectedTab
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

// Import the new standardized hook
import { useStandardCalculation } from './hooks/useStandardCalculation';

const Calculator: React.FC = () => {
  const dispatch = useDispatch();
  const {
    channelParams,
    selectedTab
  } = useSelector((state: RootState) => state.calculator);

  // Use the new standardized hook instead of direct calculation utilities
  const {
    calculateWaterSurfaceProfile,
    resetCalculation,
    isCalculating,
    error,
    results,
    progress
  } = useStandardCalculation({
    useRedux: true,
    calculationOptions: {
      useWorker: true,
      useCache: true,
      showProgress: true
    }
  });
  
  const [selectedStation, setSelectedStation] = useState<number>(0);
  
  // Flag to check if we have results
  const hasResults = !!results && results.flowProfile.length > 0;
  
  // Handle tab changes based on results
  useEffect(() => {
    // If results are available and we're on the input tab, switch to results
    if (hasResults && selectedTab === 'input' && !isCalculating) {
      dispatch(setSelectedTab('results'));
    }
    
    // If no results are available and we're not on input tab, switch to input
    if (!hasResults && selectedTab !== 'input' && !isCalculating) {
      dispatch(setSelectedTab('input'));
    }
  }, [hasResults, isCalculating, selectedTab, dispatch]);
  
  // Handle calculation
  const handleCalculate = async () => {
    try {
      // Use the standardized hook for calculation
      await calculateWaterSurfaceProfile(channelParams);
    } catch (error) {
      console.error('Calculation error:', error);
    }
  };
  
  // Handle reset
  const handleReset = () => {
    resetCalculation();
    dispatch(setSelectedTab('input'));
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
    if (!results?.flowProfile || results.flowProfile.length === 0) {
      return null;
    }
    
    // Find the closest point to the selected station
    return results.flowProfile.reduce((closest, current) => {
      const currentDistance = Math.abs(current.x - selectedStation);
      const closestDistance = Math.abs(closest.x - selectedStation);
      return currentDistance < closestDistance ? current : closest;
    }, results.flowProfile[0]);
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">Water Surface Profile Calculator</h1>
      
      {/* Tabs navigation */}
      <CalculatorTabs 
        activeTab={selectedTab as TabType} 
        setActiveTab={(tab) => dispatch(setSelectedTab(tab))} 
        hasResults={hasResults}
      />
      
      {/* Progress indicator when calculating */}
      {isCalculating && (
        <div className="mb-6">
          <div className="bg-blue-100 border-l-4 border-blue-500 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Calculating water surface profile... {progress > 0 ? `${Math.round(progress)}%` : ''}
                </p>
                {progress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
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
        {selectedTab === 'input' && (
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
        
        {selectedTab === 'results' && hasResults && (
          <div id="results-section">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">Calculation Results</h2>
              <ExportMenu 
                results={results.flowProfile} 
                channelParams={channelParams} 
              />
            </div>
            
            <ResultsTable 
              results={results}
              onSelectPoint={(point) => setSelectedStation(point.x)}
            />
            
            {results.hydraulicJump?.occurs && (
              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
                <h3 className="text-lg font-medium text-yellow-800">Hydraulic Jump Detected</h3>
                <p className="mt-2 text-sm text-yellow-700">
                  A hydraulic jump occurs at station {results.hydraulicJump.station?.toFixed(2)} m.
                  The water depth changes from {results.hydraulicJump.upstreamDepth?.toFixed(3)} m to {results.hydraulicJump.downstreamDepth?.toFixed(3)} m.
                </p>
              </div>
            )}
          </div>
        )}
        
        {selectedTab === 'profile' && hasResults && (
          <WaterSurfaceProfileVisualization 
            results={results}
          />
        )}
        
        {selectedTab === 'cross-section' && hasResults && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Station:
              </label>
              <input
                type="range"
                min={results.flowProfile[0].x}
                max={results.flowProfile[results.flowProfile.length - 1].x}
                value={selectedStation}
                onChange={(e) => setSelectedStation(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                step={(results.flowProfile[results.flowProfile.length - 1].x - results.flowProfile[0].x) / 100}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{results.flowProfile[0].x.toFixed(0)} m</span>
                <span>{results.flowProfile[Math.floor(results.flowProfile.length / 2)].x.toFixed(0)} m</span>
                <span>{results.flowProfile[results.flowProfile.length - 1].x.toFixed(0)} m</span>
              </div>
            </div>
            
            <CrossSectionView
              selectedFlowPoint={getResultAtStation() || undefined}
              channelType={channelParams.channelType}
              results={results}
            />
          </div>
        )}
        
        {selectedTab === 'water-surface' && hasResults && (
          <WaterSurfaceProfileVisualization 
            results={results}
          />
        )}
      </div>
    </div>
  );
};

export default Calculator;