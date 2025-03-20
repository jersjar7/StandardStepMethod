import React from 'react';
import { ChannelParams } from '../../types';

interface BoundaryConditionsProps {
  channelParams: ChannelParams;
  formValues: ChannelParams;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBoundaryConditionChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  errors?: Record<string, string>;
}

const BoundaryConditions: React.FC<BoundaryConditionsProps> = ({
  channelParams,
  formValues,
  onInputChange,
  onBoundaryConditionChange,
  errors = {}
}) => {
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
  
  return (
    <div className="col-span-1 md:col-span-2">
      <h3 className="text-lg font-medium mb-3">Boundary Conditions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="boundary-condition-type" className="block text-sm font-medium text-gray-700 mb-1">
            Boundary Condition Type
          </label>
          <select
            id="boundary-condition-type"
            name="boundaryConditionType"
            value={getBoundaryConditionType()}
            onChange={onBoundaryConditionChange}
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
            <label htmlFor="upstream-depth" className="block text-sm font-medium text-gray-700 mb-1">
              Upstream Depth (m)
            </label>
            <input
              type="number"
              id="upstream-depth"
              name="upstreamDepth"
              value={formValues.upstreamDepth || ''}
              onChange={onInputChange}
              min="0.01"
              step="0.01"
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                errors.upstreamDepth 
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300'
              }`}
            />
            {errors.upstreamDepth && (
              <p className="mt-2 text-sm text-red-600">{errors.upstreamDepth}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="downstream-depth" className="block text-sm font-medium text-gray-700 mb-1">
              Downstream Depth (m)
            </label>
            <input
              type="number"
              id="downstream-depth"
              name="downstreamDepth"
              value={formValues.downstreamDepth || ''}
              onChange={onInputChange}
              min="0.01"
              step="0.01"
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                errors.downstreamDepth 
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300'
              }`}
            />
            {errors.downstreamDepth && (
              <p className="mt-2 text-sm text-red-600">{errors.downstreamDepth}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoundaryConditions;