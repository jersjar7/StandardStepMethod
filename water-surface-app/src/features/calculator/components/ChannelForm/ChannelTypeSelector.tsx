import React from 'react';

interface ChannelTypeSelectorProps {
  channelType: string;
  onChannelTypeChange: (type: 'rectangular' | 'trapezoidal' | 'triangular' | 'circular') => void;
}

const ChannelTypeSelector: React.FC<ChannelTypeSelectorProps> = ({
  channelType,
  onChannelTypeChange
}) => {
  return (
    <div className="col-span-1 md:col-span-2">
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-1">Channel Type</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Rectangular option */}
          <div className="relative">
            <input
              type="radio"
              id="channel-type-rectangular"
              name="channelType"
              value="rectangular"
              checked={channelType === 'rectangular'}
              onChange={() => onChannelTypeChange('rectangular')}
              className="sr-only" // Visually hidden but accessible
            />
            <label
              htmlFor="channel-type-rectangular"
              className={`cursor-pointer p-4 rounded-lg border-2 block h-full ${
                channelType === 'rectangular' 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="h-16 flex items-center justify-center">
                <svg width="60" height="30" viewBox="0 0 60 30" fill="none" aria-hidden="true">
                  {/* U-shaped rectangular channel with open top */}
                  <path d="M5 5 L5 25 L55 25 L55 5" stroke="currentColor" strokeWidth="2" fill="none" />
                  {/* Water line at the top */}
                  <line x1="5" y1="5" x2="55" y2="5" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2,2" />
                </svg>
              </div>
              <p className="text-center mt-2 text-sm font-medium">Rectangular</p>
            </label>
          </div>
          
          {/* Trapezoidal option - Fixed to show correctly */}
          <div className="relative">
            <input
              type="radio"
              id="channel-type-trapezoidal"
              name="channelType"
              value="trapezoidal"
              checked={channelType === 'trapezoidal'}
              onChange={() => onChannelTypeChange('trapezoidal')}
              className="sr-only" // Visually hidden but accessible
            />
            <label
              htmlFor="channel-type-trapezoidal"
              className={`cursor-pointer p-4 rounded-lg border-2 block h-full ${
                channelType === 'trapezoidal' 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="h-16 flex items-center justify-center">
                <svg width="60" height="30" viewBox="0 0 60 30" fill="none" aria-hidden="true">
                  {/* Corrected trapezoidal channel, oriented correctly */}
                  <path d="M10 5 L20 25 L40 25 L50 5" stroke="currentColor" strokeWidth="2" fill="none" />
                  {/* Water line at the top */}
                  <line x1="10" y1="5" x2="50" y2="5" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2,2" />
                </svg>
              </div>
              <p className="text-center mt-2 text-sm font-medium">Trapezoidal</p>
            </label>
          </div>
          
          {/* Triangular option - Fixed to show correctly */}
          <div className="relative">
            <input
              type="radio"
              id="channel-type-triangular"
              name="channelType"
              value="triangular"
              checked={channelType === 'triangular'}
              onChange={() => onChannelTypeChange('triangular')}
              className="sr-only" // Visually hidden but accessible
            />
            <label
              htmlFor="channel-type-triangular"
              className={`cursor-pointer p-4 rounded-lg border-2 block h-full ${
                channelType === 'triangular' 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="h-16 flex items-center justify-center">
                <svg width="60" height="30" viewBox="0 0 60 30" fill="none" aria-hidden="true">
                  {/* Corrected triangular channel, oriented correctly */}
                  <path d="M5 5 L30 25 L55 5" stroke="currentColor" strokeWidth="2" fill="none" />
                  {/* Water line at the top */}
                  <line x1="5" y1="5" x2="55" y2="5" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2,2" />
                </svg>
              </div>
              <p className="text-center mt-2 text-sm font-medium">Triangular</p>
            </label>
          </div>
          
          {/* Circular option - Updated to add water line */}
          <div className="relative">
            <input
              type="radio"
              id="channel-type-circular"
              name="channelType"
              value="circular"
              checked={channelType === 'circular'}
              onChange={() => onChannelTypeChange('circular')}
              className="sr-only" // Visually hidden but accessible
            />
            <label
              htmlFor="channel-type-circular"
              className={`cursor-pointer p-4 rounded-lg border-2 block h-full ${
                channelType === 'circular' 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="h-16 flex items-center justify-center">
                <svg width="60" height="30" viewBox="0 0 60 30" fill="none" aria-hidden="true">
                  <circle cx="30" cy="15" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                  {/* Water line through the middle */}
                  <line x1="20" y1="15" x2="40" y2="15" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2,2" />
                </svg>
              </div>
              <p className="text-center mt-2 text-sm font-medium">Circular</p>
            </label>
          </div>
        </div>
      </fieldset>
    </div>
  );
};

export default ChannelTypeSelector;