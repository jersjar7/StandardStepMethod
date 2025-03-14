import React from 'react';
import { ChannelParameters } from '../store/calculatorSlice';

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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onParametersChange({ [name]: parseFloat(value) });
  };

  const handleBoundaryConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    
    // Safe access to critical/normal depth with fallbacks
    const criticalDepth = channelParameters.criticalDepth || 0;
    const normalDepth = channelParameters.normalDepth || 0;
    
    if (value === 'critical-downstream') {
      onParametersChange({ 
        upstreamDepth: undefined,
        downstreamDepth: criticalDepth > 0 ? criticalDepth : undefined 
      });
    } else if (value === 'normal-upstream') {
      onParametersChange({ 
        upstreamDepth: normalDepth > 0 ? normalDepth : undefined,
        downstreamDepth: undefined 
      });
    } else if (value === 'custom') {
      // Keep existing values if they exist, otherwise initialize with reasonable defaults
      onParametersChange({
        upstreamDepth: channelParameters.upstreamDepth || normalDepth || 1.0,
        downstreamDepth: channelParameters.downstreamDepth || criticalDepth || 0.5
      });
    }
  };

  // Determine the current boundary condition type
  const getBoundaryConditionType = () => {
    if (channelParameters.downstreamDepth && !channelParameters.upstreamDepth) {
      return 'critical-downstream';
    } else if (channelParameters.upstreamDepth && !channelParameters.downstreamDepth) {
      return 'normal-upstream';
    } else if (channelParameters.upstreamDepth && channelParameters.downstreamDepth) {
      return 'custom';
    }
    // Default if no boundary conditions set
    return 'critical-downstream';
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Channel Parameters</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Channel Type Selection */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Channel Type</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              onClick={() => onChannelTypeChange('rectangular')}
              className={`cursor-pointer p-4 rounded-lg border-2 ${
                channelType === 'rectangular' 
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
                channelType === 'trapezoidal' 
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
                channelType === 'triangular' 
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
                channelType === 'circular' 
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
            {(channelType === 'rectangular' || channelType === 'trapezoidal') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bottom Width (m)
                </label>
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
            
            {/* Side Slope - for trapezoidal and triangular */}
            {(channelType === 'trapezoidal' || channelType === 'triangular') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Side Slope (H:V)
                </label>
                <input
                  type="number"
                  name="sideSlope"
                  value={channelParameters.sideSlope || 1}
                  onChange={handleInputChange}
                  min="0.1"
                  step="0.1"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            )}
            
            {/* Diameter - for circular */}
            {channelType === 'circular' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diameter (m)
                </label>
                <input
                  type="number"
                  name="diameter"
                  value={channelParameters.diameter || 1.0}
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
                value={channelParameters.manningN}
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
                value={channelParameters.channelSlope}
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
                value={channelParameters.discharge}
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
                value={channelParameters.length}
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
                  value={channelParameters.upstreamDepth || ''}
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
                  value={channelParameters.downstreamDepth || ''}
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
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelForm;