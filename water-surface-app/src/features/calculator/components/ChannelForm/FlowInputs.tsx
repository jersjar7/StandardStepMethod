import React from 'react';
import { ChannelParams } from '../../stores/calculatorSlice';

interface FlowInputsProps {
  formValues: ChannelParams;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FlowInputs: React.FC<FlowInputsProps> = ({
  formValues,
  onInputChange
}) => {
  return (
    <div className="col-span-1 md:col-span-2">
      <h3 className="text-lg font-medium mb-3">Flow Parameters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Manning's Roughness (n)
          </label>
          <input
            type="number"
            name="manningN"
            value={formValues.manningN}
            onChange={onInputChange}
            min="0.001"
            step="0.001"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Channel Slope (m/m)
          </label>
          <input
            type="number"
            name="channelSlope"
            value={formValues.channelSlope}
            onChange={onInputChange}
            min="0.0001"
            step="0.0001"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Discharge (m³/s)
          </label>
          <input
            type="number"
            name="discharge"
            value={formValues.discharge}
            onChange={onInputChange}
            min="0.1"
            step="0.1"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Channel Length (m)
          </label>
          <input
            type="number"
            name="length"
            value={formValues.length}
            onChange={onInputChange}
            min="10"
            step="10"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default FlowInputs;