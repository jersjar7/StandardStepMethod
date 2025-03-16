import React from 'react';
import { ChannelParams } from '../../stores/calculatorSlice';

interface BoundaryConditionsProps {
  channelParams: ChannelParams;
  formValues: ChannelParams;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBoundaryConditionChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const BoundaryConditions: React.FC<BoundaryConditionsProps> = ({
  channelParams,
  formValues,
  onInputChange,
  onBoundaryConditionChange
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Boundary Condition Type
          </label>
          <select
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upstream Depth (m)
            </label>
            <input
              type="number"
              name="upstreamDepth"
              value={formValues.upstreamDepth || ''}
              onChange={onInputChange}
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
              onChange={onInputChange}
              min="0.01"
              step="0.01"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BoundaryConditions;