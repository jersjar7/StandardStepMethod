import React from 'react';
import { ChannelParameters } from '../../../stores/slices/calculatorSlice';

interface ChannelFormProps {
  channelType: 'rectangular' | 'trapezoidal' | 'triangular' | 'circular';
  channelParameters: ChannelParameters;
  isCalculating: boolean;
  onChannelTypeChange: (type: 'rectangular' | 'trapezoidal' | 'triangular' | 'circular') => void;
  onParametersChange: (params: Partial<ChannelParameters>) => void;
  onCalculate: () => void;
  onReset: () => void;
}

const ChannelForm: React.FC<ChannelFormProps> = ({
  channelType,
  channelParameters,
  isCalculating,
  onChannelTypeChange,
  onParametersChange,
  onCalculate,
  onReset
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onParametersChange({ [name]: parseFloat(value) });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Channel Parameters</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700">Channel Type</label>
        <select
          value={channelType}
          onChange={(e) => onChannelTypeChange(e.target.value as any)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
        >
          <option value="rectangular">Rectangular</option>
          <option value="trapezoidal">Trapezoidal</option>
          <option value="triangular">Triangular</option>
          <option value="circular">Circular</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(channelType === 'rectangular' || channelType === 'trapezoidal') && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Bottom Width (m)</label>
            <input
              type="number"
              name="bottomWidth"
              value={channelParameters.bottomWidth}
              onChange={handleInputChange}
              min="0.1"
              step="0.1"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        )}
        
        {(channelType === 'trapezoidal' || channelType === 'triangular') && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Side Slope (H:V)</label>
            <input
              type="number"
              name="sideSlope"
              value={channelParameters.sideSlope}
              onChange={handleInputChange}
              min="0"
              step="0.1"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div