import React from 'react';
import { UnitSystem } from '../../types';

interface UnitSystemSelectorProps {
  unitSystem: UnitSystem;
  onUnitSystemChange: (unitSystem: UnitSystem) => void;
  disabled?: boolean;
}

const UnitSystemSelector: React.FC<UnitSystemSelectorProps> = ({
  unitSystem,
  onUnitSystemChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700">Units:</span>
      <div className="relative inline-flex rounded-md shadow-sm">
        <button
          type="button"
          className={`${
            unitSystem === 'metric'
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          } relative inline-flex items-center px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-l-md focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          onClick={() => !disabled && onUnitSystemChange('metric')}
          disabled={disabled}
        >
          Metric (m)
        </button>
        <button
          type="button"
          className={`${
            unitSystem === 'imperial'
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          } relative inline-flex items-center px-3 py-1.5 text-sm font-medium border border-gray-300 border-l-0 rounded-r-md focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          onClick={() => !disabled && onUnitSystemChange('imperial')}
          disabled={disabled}
        >
          Imperial (ft)
        </button>
      </div>
    </div>
  );
};

export default UnitSystemSelector;