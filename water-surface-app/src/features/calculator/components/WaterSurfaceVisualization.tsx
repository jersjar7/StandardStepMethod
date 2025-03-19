import React, { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { 
  WaterSurfaceProfileResults, 
  DetailedWaterSurfaceResults,
  UnitSystem,
  FlowDepthPoint
} from '../types';
import { 
  PROFILE_TYPE_DESCRIPTIONS, 
  CHANNEL_SLOPE_DESCRIPTIONS
} from '../stores/types/resultTypes';
import { formatWithUnit, getParameterLabels } from '../../../utils/formatters';
import { simplifyProfile } from '../utils/hydraulics/standardStep/profileUtils';

// Chart data point structure
interface ChartDataPoint {
  station: number;
  waterSurface: number;
  channelBottom: number;
  criticalDepth?: number;
  normalDepth?: number;
  energy?: number;
}

// Component props
interface ProfileVisualizationProps {
  results: WaterSurfaceProfileResults;
  unitSystem?: UnitSystem;
  onPointSelect?: (station: number) => void;
}

/**
 * Type guards for property checking
 */
function hasProfileDescription(results: WaterSurfaceProfileResults): 
  results is WaterSurfaceProfileResults & { profileDescription: string } {
  return 'profileDescription' in results && typeof results.profileDescription === 'string';
}

/**
 * Type guard to check if results have detailed statistics
 */
function hasDetailedStats(results: WaterSurfaceProfileResults): 
  results is DetailedWaterSurfaceResults & { stats: any } {
  return 'stats' in results && 
         results.stats !== undefined &&
         typeof results.stats === 'object';
}

const ProfileVisualization: React.FC<ProfileVisualizationProps> = ({ 
  results,
  unitSystem = 'metric',
  onPointSelect
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [showChannelBottom, setShowChannelBottom] = useState<boolean>(true);
  const [showCriticalDepth, setShowCriticalDepth] = useState<boolean>(true);
  const [showNormalDepth, setShowNormalDepth] = useState<boolean>(true);
  const [showEnergyLine, setShowEnergyLine] = useState<boolean>(true);
  
  // Get parameter labels with correct units
  const labels = getParameterLabels(unitSystem);
  
  // Simplified profile data for better visualization performance
  const optimizedProfile = useMemo(() => {
    if (!results.flowProfile || results.flowProfile.length === 0) return [];
    
    // Use the standardized simplifyProfile utility to optimize the data
    // for charts - reducing points while preserving important features
    return results.flowProfile.length > 200 
      ? simplifyProfile(results.flowProfile, 200)
      : results.flowProfile;
  }, [results.flowProfile]);
  
  useEffect(() => {
    // Prepare data for the chart
    if (optimizedProfile.length > 0) {
      const formattedData = optimizedProfile.map((point: FlowDepthPoint) => {
        // Calculate channel bottom
        // Use actual channel slope from the results, defaulting to 0.001 if not available
        const channelSlope = typeof results.channelType === 'string' ? 
          (results.channelType === 'steep' ? 0.01 : 0.001) : 0.001;
        
        return {
          station: point.x,
          waterSurface: point.y,
          channelBottom: point.x * channelSlope, // Simple representation for visualization
          criticalDepth: point.criticalDepth,
          normalDepth: point.normalDepth,
          energy: point.specificEnergy,
        };
      });
      
      setChartData(formattedData);
    }
  }, [optimizedProfile, results.channelType]);
  
  // Determine profile type and description
  const profileDescription = typeof results.profileType === 'string' 
    ? results.profileType 
    : (results.profileType && PROFILE_TYPE_DESCRIPTIONS[results.profileType]) || "Water Surface Profile";
  
  // Get slope description
  const channelSlopeValue = results.channelType;
  const channelSlopeDescription = 
    channelSlopeValue && 
    typeof channelSlopeValue === 'string' && 
    (channelSlopeValue === 'mild' || channelSlopeValue === 'critical' || channelSlopeValue === 'steep') 
      ? CHANNEL_SLOPE_DESCRIPTIONS[channelSlopeValue]
      : "Channel Classification";
  
  // Handle chart click for point selection
  const handleChartClick = (data: any) => {
    if (data && data.activeLabel !== undefined && onPointSelect) {
      onPointSelect(data.activeLabel);
    }
  };
  
  // Check if hydraulic jump occurs using discriminated union pattern
  const hydraulicJumpOccurs = results.hydraulicJump?.occurs === true;
  
  // Custom tooltip component with formatted values
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 shadow-lg rounded-lg">
          <p className="text-sm font-medium text-gray-900">
            {labels.station}: {formatWithUnit(label, 'station', unitSystem, 2)}
          </p>
          {payload.map((entry: any, index: number) => {
            // Skip if value is undefined or hidden series
            if (entry.value === undefined) return null;
            if (entry.dataKey === 'channelBottom' && !showChannelBottom) return null;
            if (entry.dataKey === 'criticalDepth' && !showCriticalDepth) return null;
            if (entry.dataKey === 'normalDepth' && !showNormalDepth) return null;
            if (entry.dataKey === 'energy' && !showEnergyLine) return null;
            
            // Set color based on dataKey
            const color = entry.color;
            const label = entry.name;
            let paramName: string;
            
            switch (entry.dataKey) {
              case 'waterSurface':
                paramName = 'depth';
                break;
              case 'criticalDepth':
                paramName = 'criticalDepth';
                break;
              case 'normalDepth':
                paramName = 'normalDepth';
                break;
              case 'energy':
                paramName = 'energy';
                break;
              default:
                paramName = entry.dataKey;
            }
            
            return (
              <p 
                key={`tooltip-${index}`} 
                className="text-sm" 
                style={{ color }}
              >
                {label}: {formatWithUnit(entry.value, paramName, unitSystem, 3)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };
  
  // If no results, show empty state
  if (!results.flowProfile || results.flowProfile.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900">Water Surface Profile Visualization</h3>
        <div className="p-4 mt-4 bg-gray-50 rounded-lg flex items-center justify-center h-72">
          <p className="text-gray-500">No data available. Run a calculation to see the water surface profile.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Water Surface Profile Visualization</h3>
        <div className="mt-2">
          <p className="text-sm text-gray-600">
            {profileDescription}
          </p>
          <p className="text-sm text-gray-600">
            {channelSlopeDescription}
          </p>
          {hasProfileDescription(results) && (
            <p className="text-sm text-gray-600 mt-1">
              {results.profileDescription}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 mb-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={showChannelBottom}
            onChange={() => setShowChannelBottom(!showChannelBottom)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Show Channel Bottom</span>
        </label>
        
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={showCriticalDepth}
            onChange={() => setShowCriticalDepth(!showCriticalDepth)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Show Critical Depth</span>
        </label>
        
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={showNormalDepth}
            onChange={() => setShowNormalDepth(!showNormalDepth)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Show Normal Depth</span>
        </label>
        
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={showEnergyLine}
            onChange={() => setShowEnergyLine(!showEnergyLine)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Show Energy Grade Line</span>
        </label>
      </div>
      
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="station" 
              label={{ value: labels.station, position: 'insideBottomRight', offset: -10 }} 
            />
            <YAxis 
              label={{ value: labels.depth, angle: -90, position: 'insideLeft' }}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Line
              type="monotone"
              dataKey="waterSurface"
              name="Water Surface"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            
            {showChannelBottom && (
              <Line
                type="monotone"
                dataKey="channelBottom"
                name="Channel Bottom"
                stroke="#6b7280"
                strokeWidth={2}
                dot={false}
              />
            )}
            
            {showCriticalDepth && (
              <Line
                type="monotone"
                dataKey="criticalDepth"
                name="Critical Depth"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
            
            {showNormalDepth && (
              <Line
                type="monotone"
                dataKey="normalDepth"
                name="Normal Depth"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
            
            {showEnergyLine && (
              <Line
                type="monotone"
                dataKey="energy"
                name="Energy Grade Line"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
            
            {/* Mark hydraulic jump if present */}
            {hydraulicJumpOccurs && results.hydraulicJump && 'station' in results.hydraulicJump && (
              <ReferenceLine 
                x={results.hydraulicJump.station} 
                stroke="#f59e0b"
                strokeWidth={2}
                label={{
                  value: 'Hydraulic Jump',
                  position: 'top',
                  fill: '#f59e0b',
                  fontSize: 12
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Flow regime explanation */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 className="text-md font-medium text-gray-900 mb-2">Flow Regime Information</h4>
        <p className="text-sm text-gray-700">
          The water surface profile shows how water depth changes along the channel. 
          For subcritical flow (Fr &lt; 1), control is from downstream, while for supercritical flow (Fr &gt; 1), 
          control is from upstream. Normal depth represents uniform flow, and critical depth 
          is where specific energy is minimized.
        </p>
        
        {/* Hydraulic jump information */}
        {hydraulicJumpOccurs && results.hydraulicJump && results.hydraulicJump.occurs && (
          <div className="mt-3 pt-3 border-t border-yellow-200 bg-yellow-50 p-3 rounded">
            <h5 className="text-sm font-medium text-yellow-800 mb-1">Hydraulic Jump Details</h5>
            <p className="text-xs text-yellow-700">
              A hydraulic jump occurs at station {formatWithUnit(results.hydraulicJump.station, 'station', unitSystem, 2)}, 
              where the flow transitions from supercritical (Fr &gt; 1) to subcritical (Fr &lt; 1).
              The water depth changes from {formatWithUnit(results.hydraulicJump.upstreamDepth, 'depth', unitSystem, 3)} to {' '}
              {formatWithUnit(results.hydraulicJump.downstreamDepth, 'depth', unitSystem, 3)}.
              {results.hydraulicJump.energyLoss !== undefined && (
                <> Energy loss at jump: {formatWithUnit(results.hydraulicJump.energyLoss, 'energy', unitSystem, 3)}.</>
              )}
            </p>
          </div>
        )}
        
        {/* Display additional details from results if available */}
        {hasDetailedStats(results) && results.stats && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-900 mb-1">Profile Statistics</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-700">
              {'minDepth' in results.stats && 'maxDepth' in results.stats && (
                <div>
                  <span className="font-medium">Depth Range:</span> {formatWithUnit(results.stats.minDepth, 'depth', unitSystem, 2)} - {formatWithUnit(results.stats.maxDepth, 'depth', unitSystem, 2)}
                </div>
              )}
              {'minFroude' in results.stats && 'maxFroude' in results.stats && (
                <div>
                  <span className="font-medium">Froude Range:</span> {results.stats.minFroude.toFixed(2)} - {results.stats.maxFroude.toFixed(2)}
                </div>
              )}
              {'predominantFlowRegime' in results.stats && (
                <div>
                  <span className="font-medium">Flow Regime:</span> {results.stats.predominantFlowRegime}
                </div>
              )}
              {'length' in results.stats && (
                <div>
                  <span className="font-medium">Profile Length:</span> {formatWithUnit(results.stats.length, 'length', unitSystem, 0)}
                </div>
              )}
              
              {/* Additional statistics if available */}
              {'avgVelocity' in results.stats && results.stats.avgVelocity !== undefined && (
                <div>
                  <span className="font-medium">Avg Velocity:</span> {formatWithUnit(results.stats.avgVelocity, 'velocity', unitSystem, 2)}
                </div>
              )}
              {'avgDepth' in results.stats && results.stats.avgDepth !== undefined && (
                <div>
                  <span className="font-medium">Avg Depth:</span> {formatWithUnit(results.stats.avgDepth, 'depth', unitSystem, 2)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileVisualization;