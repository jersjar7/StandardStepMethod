import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateChannelParams,
  setChannelType,
  setWaterSurfaceResults
} from './stores/calculatorSlice';
import { RootState } from '../../stores';
import { 
  ProfileType, 
  ChannelType, 
  WaterSurfaceProfileResults,
  FlowRegime,
  CalculationResult,
  HydraulicJump
} from './types';

// Import components
import ChannelForm from './components/ChannelForm/ChannelForm';
import ResultsTable from './components/ResultsTable';
import ProfileVisualization from './components/ProfileVisualization';
import CrossSectionView from './components/CrossSectionView';
import WaterSurfaceVisualization from './components/WaterSurfaceVisualization';
import CalculatorTabs, { TabType } from './components/CalculatorTabs';
import CalculationControls from './components/CalculationControls';
import ExportMenu from './components/ExportMenu';

// Import hydraulics utilities and hooks
import { useCalculation } from './hooks/useCalculation';
import { useResults } from './hooks/useResults';
import { useChannelCalculations } from './hooks/useChannelCalculations';

const Calculator: React.FC = () => {
  const dispatch = useDispatch();
  const {
    channelParams,
    results,
    detailedResults,
    isCalculating,
    error,
    hydraulicJump,
    profileType,
    flowRegime
  } = useSelector((state: RootState) => state.calculator);
  
  const [activeTab, setActiveTab] = useState<TabType>('input');
  
  // Use the channel calculations hook for detailed calculations
  const { runDetailedCalculation } = useChannelCalculations();
  
  // Use custom hooks for calculations and results handling
  const { 
    runCalculation, 
    resetCalculation, 
    getChannelClassification 
  } = useCalculation();
  
  const { 
    selectedResult, 
    selectResultByStation,
    getProfileType,
    getFilteredResults
  } = useResults();
  
  // Handle tab changes based on results
  useEffect(() => {
    // If results are available and we're on the input tab, switch to results
    if (results.length > 0 && activeTab === 'input' && !isCalculating) {
      setActiveTab('results');
    }
    
    // If no results are available and we're not on input tab, switch to input
    if (results.length === 0 && activeTab !== 'input' && !isCalculating) {
      setActiveTab('input');
    }
  }, [results, isCalculating, activeTab]);
  
  // Handle calculation - calculate both legacy and standardized results
  const handleCalculate = async () => {
    // Run standard calculation for backward compatibility
    const legacyResults = await runCalculation(channelParams);
    
    // Run the detailed calculation for standardized results
    try {
      const standardResults = await runDetailedCalculation(channelParams);
      if (standardResults) {
        dispatch(setWaterSurfaceResults(standardResults));
      }
    } catch (error) {
      console.error('Detailed calculation error:', error);
      // Error is already handled by runCalculation
    }
  };
  
  // Handle reset
  const handleReset = () => {
    resetCalculation();
    setActiveTab('input');
  };
  
  // Determine profile type - use stored value if available, otherwise calculate
  const displayProfileType = profileType || (results.length > 0 ? getProfileType : ProfileType.UNKNOWN);
  
  // Determine channel slope classification with type assertion
  const channelSlope = getChannelClassification() as 'mild' | 'critical' | 'steep';
  
  // Handle channel type change
  const handleChannelTypeChange = (type: ChannelType) => {
    dispatch(setChannelType(type));
  };
  
  // Handle channel parameter changes
  const handleChannelParamsChange = (params: Partial<typeof channelParams>) => {
    dispatch(updateChannelParams(params));
  };
  
  // Handle station selection for cross-section view
  const handleStationSelect = (station: number) => {
    selectResultByStation(station);
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
        
        {activeTab === 'results' && results.length > 0 && (
          <div id="results-section">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">Calculation Results</h2>
              {/* Modified to match ExportMenu props interface */}
              <ExportMenu 
                results={results} 
                channelParams={channelParams} 
              />
            </div>
            
            <ResultsTable 
              results={results} 
              hydraulicJump={hydraulicJump}
              onSelectResult={handleStationSelect}
            />
            
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
          <ProfileVisualization 
            results={getFilteredResults(100)}
            profileType={displayProfileType}
            channelSlope={channelSlope}
            standardResults={detailedResults}
          />
        )}
        
        {activeTab === 'cross-section' && results.length > 0 && selectedResult && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Station:
              </label>
              <input
                type="range"
                min={results[0].station}
                max={results[results.length - 1].station}
                value={selectedResult.station}
                onChange={(e) => handleStationSelect(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                step={(results[results.length - 1].station - results[0].station) / 100}
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
          <WaterSurfaceVisualization 
            results={getFilteredResults(200)} 
          />
        )}
      </div>
    </div>
  );
};

export default Calculator;