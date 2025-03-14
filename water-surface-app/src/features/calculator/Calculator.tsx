import React, { useState, useEffect} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  updateChannelParams, 
  setChannelType,
  startCalculation, 
  calculationSuccess, 
  calculationFailure,
  resetCalculator,
  CalculationResult,
  ChannelParams
} from './stores/calculatorSlice';
import { RootState } from '../../stores';

// Import components
import ChannelForm from './components/ChannelForm';
import ResultsTable from './components/ResultsTable';
import ProfileVisualization from './components/ProfileVisualization';
import CrossSectionView from './components/CrossSectionView';

// Import hooks
import { useChannelCalculations } from './hooks/useChannelCalculations';

// Import services
import { ExportService } from '../../services/exportService';

// Lazy load worker to avoid URL constructor issues
const getWorker = () => {
  if (typeof Worker !== 'undefined') {
    try {
      return new Worker(new URL('../../services/webWorkers/standardStepWorker.ts', import.meta.url), { type: 'module' });
    } catch (error) {
      console.error('Error initializing worker:', error);
      return null;
    }
  }
  console.warn('Web Workers not supported in this browser. Calculation will run in main thread.');
  return null;
};

const Calculator: React.FC = () => {
  const dispatch = useDispatch();
  const { 
    channelParams, 
    results, 
    isCalculating, 
    error 
  } = useSelector((state: RootState) => state.calculator);
  
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const [selectedResult, setSelectedResult] = useState<CalculationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'profile' | 'cross-section'>('input');
  const [showExportOptions, setShowExportOptions] = useState<boolean>(false);
  const [worker, setWorker] = useState<Worker | null>(null);
  const { calculateWaterSurfaceProfile } = useChannelCalculations();
  
  // Initialize worker
  useEffect(() => {
    const standardStepWorker = getWorker();
    if (standardStepWorker) {
      setWorker(standardStepWorker);
    }
    
    return () => {
      if (standardStepWorker) {
        standardStepWorker.terminate();
      }
    };
  }, []);
  
  // Set up listener for worker messages
  useEffect(() => {
    if (!worker) return;
    
    const handleWorkerMessage = (event: MessageEvent) => {
      const { status, data, error: workerError } = event.data;
      
      if (status === 'success') {
        dispatch(calculationSuccess({
          results: data.results,
          hydraulicJump: data.hydraulicJump
        }));
        setActiveTab('results');
      } else {
        dispatch(calculationFailure(workerError || 'Calculation failed'));
      }
    };
    
    worker.addEventListener('message', handleWorkerMessage);
    
    // Clean up the worker listener when component unmounts
    return () => {
      worker.removeEventListener('message', handleWorkerMessage);
    };
  }, [worker, dispatch]);
  
  // Update selected result when results change
  useEffect(() => {
    if (results && results.length > 0) {
      setSelectedResult(results[selectedResultIndex]);
    } else {
      setSelectedResult(null);
    }
  }, [results, selectedResultIndex]);
  
  // Handle calculation
  const handleCalculate = async () => {
    dispatch(startCalculation());
    
    try {
      // Use web worker for intensive calculations if available
      if (worker) {
        worker.postMessage({
          params: channelParams
        });
        
        // Fallback with timeout in case worker doesn't respond
        const timeoutId = setTimeout(() => {
          if (isCalculating) {
            console.log('Worker taking too long, falling back to main thread calculation');
            performMainThreadCalculation();
          }
        }, 5000); // 5 second timeout
        
        // Clear timeout if component unmounts
        return () => clearTimeout(timeoutId);
      } else {
        // No worker available, calculate on main thread
        performMainThreadCalculation();
      }
    } catch (err) {
      dispatch(calculationFailure(err instanceof Error ? err.message : 'An unknown error occurred'));
    }
  };
  
  // Perform calculation on main thread as fallback
  const performMainThreadCalculation = async () => {
    try {
      const { results, hydraulicJump } = await calculateWaterSurfaceProfile(channelParams);
      dispatch(calculationSuccess({ results, hydraulicJump }));
      setActiveTab('results');
    } catch (err) {
      dispatch(calculationFailure(err instanceof Error ? err.message : 'An unknown error occurred'));
    }
  };
  
  // Handle reset
  const handleReset = () => {
    dispatch(resetCalculator());
    setActiveTab('input');
    setSelectedResultIndex(0);
    setSelectedResult(null);
  };
  
  // Handle export
  const handleExport = (format: 'csv' | 'json' | 'report') => {
    if (!results || results.length === 0) return;
    
    switch (format) {
      case 'csv':
        const csvContent = ExportService.exportToCSV(results, channelParams);
        ExportService.downloadCSV(csvContent);
        break;
      case 'json':
        const jsonContent = ExportService.exportToJSON(results, channelParams);
        ExportService.downloadJSON(jsonContent);
        break;
      case 'report':
        const reportContent = ExportService.generateReport(results, channelParams);
        ExportService.downloadReport(reportContent);
        break;
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
      <h1 className="text-3xl font-bold text-center mb-6">Water Surface Profile Calculator</h1>
      
      {/* Tabs navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('input')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm 
                ${activeTab === 'input' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Channel Input
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm 
                ${activeTab === 'results' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
              disabled={!results || results.length === 0}
            >
              Calculation Results
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm 
                ${activeTab === 'profile' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
              disabled={!results || results.length === 0}
            >
              Profile Visualization
            </button>
            <button
              onClick={() => setActiveTab('cross-section')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm 
                ${activeTab === 'cross-section' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
              disabled={!results || results.length === 0}
            >
              Cross Section
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
      </div>
    </div>
  );
};

export default Calculator;