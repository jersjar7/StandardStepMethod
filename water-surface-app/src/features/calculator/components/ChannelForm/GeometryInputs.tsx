import React from 'react';
import { ChannelParams, UnitSystem } from '../../types';
import { getUnitLabel } from '../../utils/unitConversion';

interface GeometryInputsProps {
  channelType: string;
  formValues: ChannelParams;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors?: Record<string, string>;
  unitSystem?: UnitSystem;
}

const GeometryInputs: React.FC<GeometryInputsProps> = ({
  channelType,
  formValues,
  onInputChange,
  errors = {},
  unitSystem = 'metric'
}) => {
  const getLabelWithUnit = (paramName: string, label: string): string => {
    const unitStr = getUnitLabel(paramName, unitSystem);
    return unitStr ? `${label} (${unitStr})` : label;
  };

  return (
    <div className="col-span-1 md:col-span-2">
      <h3 className="text-lg font-medium mb-3">Geometry Parameters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Bottom Width - for rectangular and trapezoidal */}
        {(channelType === 'rectangular' || channelType === 'trapezoidal') && (
          <div>
            <label htmlFor="bottom-width" className="block text-sm font-medium text-gray-700 mb-1">
              {getLabelWithUnit('bottomWidth', 'Bottom Width')}
            </label>
            <input
              type="number"
              id="bottom-width"
              name="bottomWidth"
              value={formValues.bottomWidth}
              onChange={onInputChange}
              min="0.1"
              step="0.1"
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                errors.bottomWidth 
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300'
              }`}
            />
            {errors.bottomWidth && (
              <p className="mt-2 text-sm text-red-600">{errors.bottomWidth}</p>
            )}
          </div>
        )}
        
        {/* Side Slope - for trapezoidal and triangular */}
        {(channelType === 'trapezoidal' || channelType === 'triangular') && (
          <div>
            <label htmlFor="side-slope" className="block text-sm font-medium text-gray-700 mb-1">
              Side Slope (H:V)
            </label>
            <input
              type="number"
              id="side-slope"
              name="sideSlope"
              value={formValues.sideSlope || 1}
              onChange={onInputChange}
              min="0.1"
              step="0.1"
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                errors.sideSlope 
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300'
              }`}
            />
            {errors.sideSlope && (
              <p className="mt-2 text-sm text-red-600">{errors.sideSlope}</p>
            )}
          </div>
        )}
        
        {/* Diameter - for circular */}
        {channelType === 'circular' && (
          <div>
            <label htmlFor="diameter" className="block text-sm font-medium text-gray-700 mb-1">
              {getLabelWithUnit('diameter', 'Diameter')}
            </label>
            <input
              type="number"
              id="diameter"
              name="diameter"
              value={formValues.diameter || 1.0}
              onChange={onInputChange}
              min="0.1"
              step="0.1"
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                errors.diameter 
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300'
              }`}
            />
            {errors.diameter && (
              <p className="mt-2 text-sm text-red-600">{errors.diameter}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GeometryInputs;