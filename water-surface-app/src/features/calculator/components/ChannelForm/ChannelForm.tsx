import React, { useState } from 'react';
import { ChannelParams } from '../stores/calculatorSlice';

interface ChannelFormProps {
  channelParams: ChannelParams;
  isCalculating: boolean;
  onChannelTypeChange: (type: 'rectangular' | 'trapezoidal' | 'triangular' | 'circular') => void;
  onParamsChange: (params: Partial<ChannelParams>) => void;
  onCalculate: () => void;
  onReset: () => void;
}

const ChannelForm: React.FC<ChannelFormProps> = ({
  channelParams,
  isCalculating,
  onChannelTypeChange,
  onParamsChange,
  onCalculate,
  onReset
}) => {
  // Local state to track form values before submitting to parent
  const [formValues, setFormValues] = useState<ChannelParams>(channelParams);
  
  // Handle input changes for numeric inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    
    // Only update if it's a valid number
    if (!isNaN(numValue)) {
      setFormValues({
        ...formValues,
        [name]: numValue
      });
      
      // Immediately update parent state to keep in sync
      onParamsChange({ [name]: numValue });
    }
  };
  
  // Handle boundary condition selection
  const handleBoundaryConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    
    // Get critical and normal depths for reference
    const criticalDepth = channelParams.criticalDepth || 0;
    const normalDepth = channelParams.normalDepth || 0;
    
    if (value === 'critical-downstream') {
      // Critical depth at downstream
      onParamsChange({ 
        upstreamDepth: undefined,
        downstreamDepth: criticalDepth > 0 ? criticalDepth : undefined 
      });
    } else if (value === 'normal-upstream') {
      // Normal depth at upstream
      onParamsChange({ 
        upstreamDepth: normalDepth > 0 ? normalDepth : undefined,
        downstreamDepth: undefined 
      });
    } else if (value === 'custom') {
      // Custom boundary conditions
      onParamsChange({
        upstreamDepth: formValues.upstreamDepth || normalDepth || 1.0,
        downstreamDepth: formValues.downstreamDepth || criticalDepth || 0.5
      });
    }
  };
  
  // Determine the current boundary condition type
  const getBoundaryConditionType = (): 'critical-downstream' | 'normal-upstream' | 'custom' => {
    if (channelParams.downstreamDepth && !channelParams.upstreamDepth) {
      return 'critical-downstream';
    } else if (channelParams.upstreamDepth && !channelParams.downstreamDepth) {
      return 'normal-upstream';
    } else if (channelParams.upstreamDepth && channelParams.downstreamDepth) {
      return 'custom';
    }
    // Default if no boundary conditions set
    return 'critical-downstream';
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate();
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Channel Parameters</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Channel Type Selection */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Channel Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                onClick={() => onChannelTypeChange('rectangular')}
                className={`cursor-pointer p-4 rounded-lg border-2 ${
                  channelParams.channelType === 'rectangular' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="h-16 flex items-center justify-center">
                  <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
                    <rect x="5" y="5" width="50" height="20" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </div>
                <p className="text-center mt-2 text-sm font-medium">Rectangular</p>
              </div>
              
              <div
                onClick={() => onChannelTypeChange('trapezoidal')}
                className={`cursor-pointer p-4 rounded-lg border-2 ${
                  channelParams.channelType === 'trapezoidal' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="h-16 flex items-center justify-center">
                  <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
                    <path d="M10 25 L20 5 L40 5 L50 25 Z" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </div>
                <p className="text-center mt-2 text-sm font-medium">Trapezoidal</p>
              </div>
              
              <div
                onClick={() => onChannelTypeChange('triangular')}
                className={`cursor-pointer p-4 rounded-lg border-2 ${
                  channelParams.channelType === 'triangular' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="h-16 flex items-center justify-center">
                  <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
                    <path d="M5 25 L30 5 L55 25" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </div>
                <p className="text-center mt-2 text-sm font-medium">Triangular</p>
              </div>
              
              <div
                onClick={() => onChannelTypeChange('circular')}
                className={`cursor-pointer p-4 rounded-lg border-2 ${
                  channelParams.channelType === 'circular' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="h-16 flex items-center justify-center">
                  <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
                    <circle cx="30" cy="15" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </div>
                <p className="text-center mt-2 text-sm font-medium">Circular</p>
              </div>
            </div>
          </div>
          
          {/* Channel Geometry Parameters */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-medium mb-3">Geometry Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Bottom Width - for rectangular and trapezoidal */}
              {(channelParams.channelType === 'rectangular' || channelParams.channelType === 'trapezoidal') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bottom Width (m)
                  </label>
                  <input
                    type="number"
                    name="bottomWidth"
                    value={formValues.bottomWidth}
                    onChange={handleInputChange}
                    min="0.1"
                    step="0.1"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              )}
              
              {/* Side Slope - for trapezoidal and triangular */}
              {(channelParams.channelType === 'trapezoidal' || channelParams.channelType === 'triangular') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Side Slope (H:V)
                  </label>
                  <input
                    type="number"
                    name="sideSlope"
                    value={formValues.sideSlope || 1}
                    onChange={handleInputChange}
                    min="0.1"
                    step="0.1"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              )}
              
              {/* Diameter - for circular */}
              {channelParams.channelType === 'circular' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diameter (m)
                  </label>
                  <input
                    type="number"
                    name="diameter"
                    value={formValues.diameter || 1.0}
                    onChange={handleInputChange}
                    min="0.1"
                    step="0.1"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Flow Parameters */}
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  min="10"
                  step="10"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Boundary Conditions */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-medium mb-3">Boundary Conditions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Boundary Condition Type
                </label>
                <select
                  value={getBoundaryConditionType()}
                  onChange={handleBoundaryConditionChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="critical-downstream">Critical Depth at Downstream</option>
                  <option value="normal-upstream">Normal Depth at Upstream</option>
                  <option value="custom">Custom Boundary Conditions</option>
                </select>
              </div>
            </div>
            
            {getBoundaryConditionType() === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upstream Depth (m)
                  </label>
                  <input
                    type="number"
                    name="upstreamDepth"
                    value={formValues.upstreamDepth || ''}
                    onChange={handleInputChange}
                    min="0.01"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Downstream Depth (m)
                  </label>
                  <input
                    type="number"
                    name="downstreamDepth"
                    value={formValues.downstreamDepth || ''}
                    onChange={handleInputChange}
                    min="0.01"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="col-span-1 md:col-span-2 mt-6">
            <div className="flex flex-wrap gap-4">
              <button
                type="submit"
                disabled={isCalculating}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isCalculating ? 'Calculating...' : 'Calculate Water Surface Profile'}
              </button>
              
              <button
                type="button"
                onClick={onReset}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChannelForm;