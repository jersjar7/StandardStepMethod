import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  CalculationResult, 
  ProfileType, 
  UnitSystem, 
  WaterSurfaceProfileResults,
  FlowDepthPoint,
  FlowRegime
} from '../types';
import { PROFILE_TYPE_DESCRIPTIONS, CHANNEL_SLOPE_DESCRIPTIONS } from '../stores/types/resultTypes';
import { formatWithUnit, getParameterLabels } from '../../../utils/formatters';

interface ProfileVisualizationProps {
  // Support both legacy and standardized results
  results: CalculationResult[];
  standardResults?: WaterSurfaceProfileResults;
  profileType?: ProfileType;
  channelSlope?: 'mild' | 'critical' | 'steep';
  unitSystem?: UnitSystem;
}

interface ChartDataPoint {
  station: number;
  waterSurface: number;
  channelBottom: number;
  criticalDepth?: number;
  normalDepth?: number;
  energy?: number;
}

const ProfileVisualization: React.FC<ProfileVisualizationProps> = ({ 
  results,
  standardResults,
  profileType = ProfileType.UNKNOWN,
  channelSlope = 'mild',
  unitSystem = 'metric'
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [showChannelBottom, setShowChannelBottom] = useState<boolean>(true);
  const [showCriticalDepth, setShowCriticalDepth] = useState<boolean>(true);
  const [showNormalDepth, setShowNormalDepth] = useState<boolean>(true);
  const [showEnergyLine, setShowEnergyLine] = useState<boolean>(true);
  
  // Get parameter labels with correct units
  const labels = getParameterLabels(unitSystem);
  
  useEffect(() => {
    // Prepare data for the chart, prioritizing standardized results if available
    if (standardResults?.flowProfile && standardResults.flowProfile.length > 0) {
      // Use the new standardized format
      const formattedData = standardResults.flowProfile.map(point => ({
        station: point.x,
        waterSurface: point.y,
        channelBottom: 0, // Assuming a flat channel bottom for simplicity
        criticalDepth: point.criticalDepth,
        normalDepth: point.normalDepth,
        energy: point.specificEnergy,
      }));
      
      setChartData(formattedData);
    } else if (results.length > 0) {
      // Fall back to legacy format
      const formattedData = results.map(result => ({
        station: result.station,
        waterSurface: result.depth,
        channelBottom: 0, // Assuming a flat channel bottom for simplicity
        criticalDepth: result.criticalDepth,
        normalDepth: result.normalDepth,
        energy: result.energy,
      }));
      
      setChartData(formattedData);
    }
  }, [results, standardResults]);
  
  // Get profile type description - prioritize standardized results if available
  const displayProfileType = standardResults?.profileType || profileType || 
    (results.length > 0 ? determineProfileType(results) : ProfileType.UNKNOWN);
  
  const profileDescription = typeof displayProfileType === 'string' 
    ? displayProfileType 
    : PROFILE_TYPE_DESCRIPTIONS[displayProfileType] || "Water Surface Profile";
  
  // Get slope description - prioritize standardized results if available
  const channelSlopeValue = standardResults?.channelType || channelSlope;
  const channelSlopeDescription = 
    // Safe access to channel slope description
    channelSlopeValue && 
    typeof channelSlopeValue === 'string' && 
    (channelSlopeValue === 'mild' || channelSlopeValue === 'critical' || channelSlopeValue === 'steep') 
      ? CHANNEL_SLOPE_DESCRIPTIONS[channelSlopeValue]
      : "Channel Classification";
  
  // Additional profile details if available from standardized results
  const profileDetails = standardResults && 'profileDescription' in standardResults 
    ? standardResults.profileDescription 
    : "";
  
  // Custom tooltip component
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
            let color = entry.color;
            let label = entry.name;
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
  if ((results.length === 0) && (!standardResults?.flowProfile || standardResults.flowProfile.length === 0)) {
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
          {profileDetails && (
            <p className="text-sm text-gray-600 mt-1">
              {profileDetails}
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
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="station" 
              label={{ value: labels.station, position: 'insideBottomRight', offset: -10 }} 
            />
            <YAxis 
              label={{ value: labels.depth, angle: -90, position: 'insideLeft' }}
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
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
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-2">Legend Guide</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            <span className="inline-block w-4 h-4 bg-blue-500 mr-2"></span>
            <span><strong>Water Surface:</strong> The calculated water surface elevation along the channel.</span>
          </li>
          <li>
            <span className="inline-block w-4 h-4 bg-gray-500 mr-2"></span>
            <span><strong>Channel Bottom:</strong> The bottom elevation of the channel.</span>
          </li>
          <li>
            <span className="inline-block w-4 h-4 bg-red-500 mr-2"></span>
            <span><strong>Critical Depth:</strong> The depth at which specific energy is minimized.</span>
          </li>
          <li>
            <span className="inline-block w-4 h-4 bg-green-500 mr-2"></span>
            <span><strong>Normal Depth:</strong> The depth of flow in a uniform channel for the given discharge.</span>
          </li>
          <li>
            <span className="inline-block w-4 h-4 bg-purple-500 mr-2"></span>
            <span><strong>Energy Grade Line:</strong> The total energy (elevation + pressure + velocity) at each point.</span>
          </li>
        </ul>
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
        
        {/* Display additional details from standardized results if available */}
        {standardResults && 'stats' in standardResults && standardResults.stats && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-900 mb-1">Profile Statistics</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-700">
              <div>
                <span className="font-medium">Depth Range:</span> {formatWithUnit(standardResults.stats.minDepth, 'depth', unitSystem, 2)} - {formatWithUnit(standardResults.stats.maxDepth, 'depth', unitSystem, 2)}
              </div>
              <div>
                <span className="font-medium">Froude Range:</span> {standardResults.stats.minFroude.toFixed(2)} - {standardResults.stats.maxFroude.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Flow Regime:</span> {standardResults.stats.predominantFlowRegime}
              </div>
              <div>
                <span className="font-medium">Length:</span> {formatWithUnit(standardResults.stats.length, 'length', unitSystem, 0)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Determine profile type from legacy results
 * @param results Calculation results
 * @returns Profile type
 */
function determineProfileType(results: CalculationResult[]): ProfileType {
  if (results.length === 0) return ProfileType.UNKNOWN;
  
  // Get first result which contains critical and normal depths
  const firstResult = results[0];
  const criticalDepth = firstResult.criticalDepth || 0;
  const normalDepth = firstResult.normalDepth || 0;
  
  // Get average depth
  const averageDepth = results.reduce((sum, r) => sum + r.depth, 0) / results.length;
  
  // Determine profile type
  if (normalDepth > criticalDepth) {
    // Mild slope
    if (averageDepth > normalDepth) {
      return ProfileType.M1;
    } else if (averageDepth < normalDepth && averageDepth > criticalDepth) {
      return ProfileType.M2;
    } else {
      return ProfileType.M3;
    }
  } else if (normalDepth < criticalDepth) {
    // Steep slope
    if (averageDepth > criticalDepth) {
      return ProfileType.S1;
    } else if (averageDepth < criticalDepth && averageDepth > normalDepth) {
      return ProfileType.S2;
    } else {
      return ProfileType.S3;
    }
  } else {
    // Critical slope
    return ProfileType.C2;
  }
}

export default ProfileVisualization;