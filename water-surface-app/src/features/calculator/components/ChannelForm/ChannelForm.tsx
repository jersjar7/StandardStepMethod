import React, { useState } from 'react';
import { ChannelParams } from '../../types';
import ChannelTypeSelector from './ChannelTypeSelector';
import GeometryInputs from './GeometryInputs';
import FlowInputs from './FlowInputs';
import BoundaryConditions from './BoundaryConditions';

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
          <ChannelTypeSelector 
            channelType={channelParams.channelType} 
            onChannelTypeChange={onChannelTypeChange} 
          />
          
          {/* Channel Geometry Parameters */}
          <GeometryInputs 
            channelType={channelParams.channelType}
            formValues={formValues}
            onInputChange={handleInputChange}
          />
          
          {/* Flow Parameters */}
          <FlowInputs 
            formValues={formValues}
            onInputChange={handleInputChange}
          />
          
          {/* Boundary Conditions */}
          <BoundaryConditions 
            channelParams={channelParams}
            formValues={formValues}
            onInputChange={handleInputChange}
            onBoundaryConditionChange={handleBoundaryConditionChange}
          />
          
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