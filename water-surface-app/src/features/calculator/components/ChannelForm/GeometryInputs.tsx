import React from 'react';
import { ChannelParams } from '../../types';

interface GeometryInputsProps {
  channelType: string;
  formValues: ChannelParams;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const GeometryInputs: React.FC<GeometryInputsProps> = ({
  channelType,
  formValues,
  onInputChange
}) => {
  return (
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
              value={formValues.bottomWidth}
              onChange={onInputChange}
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
              value={formValues.sideSlope || 1}
              onChange={onInputChange}
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
              value={formValues.diameter || 1.0}
              onChange={onInputChange}
              min="0.1"
              step="0.1"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GeometryInputs;