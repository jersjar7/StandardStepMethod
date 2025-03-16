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
  );
};

export default ChannelTypeSelector;