import React, { useState, useEffect, useCallback } from 'react';
import { ChannelParams, ChannelType } from '../../types';
import { validateAllInputs } from '../../validators/inputValidators';
import { getUpdatedChannelParams } from '../../stores/types/channelTypes';
import ChannelTypeSelector from './ChannelTypeSelector';
import GeometryInputs from './GeometryInputs';
import FlowInputs from './FlowInputs';
import BoundaryConditions from './BoundaryConditions';

interface ChannelFormProps {
  channelParams: ChannelParams;
  isCalculating: boolean;
  onChannelTypeChange: (type: ChannelType) => void;
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
  
  // State to track validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Validate inputs whenever form values change
  useEffect(() => {
    const validationResult = validateAllInputs(formValues);
    setValidationErrors(validationResult.errors);
  }, [formValues]);
  
  // Handle input changes for numeric inputs
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    
    // Only update if it's a valid number or empty string
    if (!isNaN(numValue) || value === '') {
      const updatedValues = {
        ...formValues,
        [name]: value === '' ? undefined : numValue
      };
      
      setFormValues(updatedValues);
      
      // Immediately update parent state to keep in sync
      onParamsChange({ [name]: value === '' ? undefined : numValue });
    }
  }, [formValues, onParamsChange]);
  
  // Handle boundary condition selection
  const handleBoundaryConditionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    
    // Get critical and normal depths for reference
    const criticalDepth = channelParams.criticalDepth || 0;
    const normalDepth = channelParams.normalDepth || 0;
    
    let updatedParams: Partial<ChannelParams> = {};
    
    if (value === 'critical-downstream') {
      // Critical depth at downstream
      updatedParams = { 
        upstreamDepth: undefined,
        downstreamDepth: criticalDepth > 0 ? criticalDepth : undefined 
      };
    } else if (value === 'normal-upstream') {
      // Normal depth at upstream
      updatedParams = { 
        upstreamDepth: normalDepth > 0 ? normalDepth : undefined,
        downstreamDepth: undefined 
      };
    } else if (value === 'custom') {
      // Custom boundary conditions
      updatedParams = {
        upstreamDepth: formValues.upstreamDepth || normalDepth || 1.0,
        downstreamDepth: formValues.downstreamDepth || criticalDepth || 0.5
      };
    }
    
    // Update form values and parent state
    setFormValues(prev => ({ ...prev, ...updatedParams }));
    onParamsChange(updatedParams);
  }, [channelParams, formValues, onParamsChange]);
  
  // Handle channel type changes
  const handleChannelTypeChange = useCallback((type: ChannelType) => {
    // Use the helper function to get updated parameters consistent with the new channel type
    const updatedParams = getUpdatedChannelParams(type, formValues);
    
    // Update form values and trigger parent state change
    setFormValues(updatedParams);
    onChannelTypeChange(type);
    onParamsChange(updatedParams);
  }, [formValues, onChannelTypeChange, onParamsChange]);
  
  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation before calculation
    const { isValid } = validateAllInputs(formValues);
    
    if (isValid) {
      onCalculate();
    } else {
      // Trigger validation display
      const { errors } = validateAllInputs(formValues);
      setValidationErrors(errors);
    }
  }, [formValues, onCalculate]);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Channel Parameters</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Channel Type Selection */}
          <ChannelTypeSelector 
            channelType={formValues.channelType} 
            onChannelTypeChange={handleChannelTypeChange} 
          />
          
          {/* Channel Geometry Parameters */}
          <GeometryInputs 
            channelType={formValues.channelType}
            formValues={formValues}
            onInputChange={handleInputChange}
            errors={validationErrors}
          />
          
          {/* Flow Parameters */}
          <FlowInputs 
            formValues={formValues}
            onInputChange={handleInputChange}
            errors={validationErrors}
          />
          
          {/* Boundary Conditions */}
          <BoundaryConditions 
            channelParams={channelParams}
            formValues={formValues}
            onInputChange={handleInputChange}
            onBoundaryConditionChange={handleBoundaryConditionChange}
            errors={validationErrors}
          />
          
          {/* Validation Error Summary */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="col-span-1 md:col-span-2 bg-red-50 border-l-4 border-red-400 p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">Input Validation Errors</h3>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {Object.entries(validationErrors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="col-span-1 md:col-span-2 mt-6">
            <div className="flex flex-wrap gap-4">
              <button
                type="submit"
                disabled={isCalculating || Object.keys(validationErrors).length > 0}
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
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChannelForm;