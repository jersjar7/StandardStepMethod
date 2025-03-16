import React from 'react';

interface CalculationControlsProps {
  isCalculating: boolean;
  onCalculate: () => void;
  onReset: () => void;
  hasResults: boolean;
}

const CalculationControls: React.FC<CalculationControlsProps> = ({
  isCalculating,
  onCalculate,
  onReset,
  hasResults
}) => {
  return (
    <div className="flex flex-wrap gap-4 my-4">
      <button
        type="button"
        onClick={onCalculate}
        disabled={isCalculating}
        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {isCalculating ? 'Calculating...' : 'Calculate Water Surface Profile'}
      </button>
      
      <button
        type="button"
        onClick={onReset}
        disabled={isCalculating}
        className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        Reset
      </button>

      {hasResults && (
        <button
          type="button"
          disabled={isCalculating}
          onClick={() => window.scrollTo({ top: document.getElementById('results-section')?.offsetTop || 0, behavior: 'smooth' })}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          View Results
        </button>
      )}
    </div>
  );
};

export default CalculationControls;