import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  updateChannelParameters, 
  startCalculation, 
  calculationSuccess, 
  calculationFailure,
  setChannelType,
  resetCalculator
} from '../../../stores/slices/calculatorSlice';
import { RootState } from '../../../stores';
import { runCalculations } from '../utils/hydraulicCalculations';
import ChannelForm from './ChannelForm';
import ResultsTable from './ResultsTable';
import ProfileVisualization from './ProfileVisualization';

const Calculator: React.FC = () => {
  const dispatch = useDispatch();
  const { 
    channelType, 
    channelParameters, 
    results, 
    isCalculating, 
    error 
  } = useSelector((state: RootState) => state.calculator);
  
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  
  const handleCalculate = () => {
    dispatch(startCalculation());
    
    try {
      const { results, hydraulicJump } = runCalculations(channelParameters);
      dispatch(calculationSuccess(results));
      
      // Navigate to results tab after calculation
      setActiveTab('results');
    } catch (err) {
      dispatch(calculationFailure(err instanceof Error ? err.message : 'An unknown error occurred'));
    }
  };
  
  const handleReset = () => {
    dispatch(resetCalculator());
    setActiveTab('input');
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-center mb-6">Water Surface Profile Calculator</h1>
      
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
              disabled={results.length === 0}
            >
              Calculation Results
            </button>
            <button
              onClick={() => setActiveTab('visualization')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm 
                ${activeTab === 'visualization' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
              disabled={results.length === 0}
            >
              Visualization
            </button>
          </nav>
        </div>
      </div>
      
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
      
      <div>
        {activeTab === 'input' && (
          <div>
            <ChannelForm 
              channelType={channelType}
              channelParameters={channelParameters}
              isCalculating={isCalculating}
              onChannelTypeChange={(type) => dispatch(setChannelType(type))}
              onParametersChange={(params) => dispatch(updateChannelParameters(params))}
              onCalculate={handleCalculate}
              onReset={handleReset}
            />
          </div>
        )}
        
        {activeTab === 'results' && results.length > 0 && (
          <div>
            <ResultsTable results={results} />
          </div>
        )}
        
        {activeTab === 'visualization' && results.length > 0 && (
          <div>
            <ProfileVisualization results={results} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Calculator;