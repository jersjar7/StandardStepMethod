import React from 'react';
import { ChannelParams, UnitSystem } from '../../types';
import { getUnitLabel } from '../../utils/unitConversion';

interface FlowInputsProps {
  formValues: ChannelParams;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors?: Record<string, string>;
  unitSystem?: UnitSystem;
}

const FlowInputs: React.FC<FlowInputsProps> = ({
  formValues,
  onInputChange,
  errors = {},
  unitSystem = 'imperial'
}) => {
  const getLabelWithUnit = (paramName: string, label: string): string => {
    const unitStr = getUnitLabel(paramName, unitSystem);
    return unitStr ? `${label} (${unitStr})` : label;
  };

  return (
    <div className="col-span-1 md:col-span-2">
      <h3 className="text-lg font-medium mb-3">Flow Parameters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label htmlFor="manning-n" className="block text-sm font-medium text-gray-700 mb-1">
            Manning's Roughness (n)
          </label>
          <input
            type="number"
            id="manning-n"
            name="manningN"
            value={formValues.manningN}
            onChange={onInputChange}
            min="0.001"
            step="0.001"
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
              errors.manningN 
                ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300'
            }`}
          />
          {errors.manningN && (
            <p className="mt-2 text-sm text-red-600">{errors.manningN}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="channel-slope" className="block text-sm font-medium text-gray-700 mb-1">
            {getLabelWithUnit('channelSlope', 'Channel Slope')}
          </label>
          <input
            type="number"
            id="channel-slope"
            name="channelSlope"
            value={formValues.channelSlope}
            onChange={onInputChange}
            min="0.0001"
            step="0.0001"
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
              errors.channelSlope 
                ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300'
            }`}
          />
          {errors.channelSlope && (
            <p className="mt-2 text-sm text-red-600">{errors.channelSlope}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="discharge" className="block text-sm font-medium text-gray-700 mb-1">
            {getLabelWithUnit('discharge', 'Discharge')}
          </label>
          <input
            type="number"
            id="discharge"
            name="discharge"
            value={formValues.discharge}
            onChange={onInputChange}
            min="0.1"
            step="0.1"
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
              errors.discharge 
                ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300'
            }`}
          />
          {errors.discharge && (
            <p className="mt-2 text-sm text-red-600">{errors.discharge}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="channel-length" className="block text-sm font-medium text-gray-700 mb-1">
            {getLabelWithUnit('length', 'Channel Length')}
          </label>
          <input
            type="number"
            id="channel-length"
            name="length"
            value={formValues.length}
            onChange={onInputChange}
            min="10"
            step="10"
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
              errors.length 
                ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300'
            }`}
          />
          {errors.length && (
            <p className="mt-2 text-sm text-red-600">{errors.length}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlowInputs;