import React, { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { 
  WaterSurfaceProfileResults, 
  UnitSystem,
  FlowRegime,
  ProfileType,
  HydraulicJump,
  FlowDepthPoint
} from '../types';
import { 
  PROFILE_TYPE_DESCRIPTIONS, 
  CHANNEL_SLOPE_DESCRIPTIONS
} from '../stores/types/resultTypes';
import { formatWithUnit, getParameterLabels } from '../../../utils/formatters';
import { simplifyProfile } from '../utils/hydraulics/standardStep/profileUtils';

// Define types for the detailed results that may include stats
interface ProfileStats {
  minDepth: number;
  maxDepth: number;
  avgDepth?: number;
  minVelocity?: number;
  maxVelocity?: number;
  avgVelocity?: number;
  minFroude: number;
  maxFroude: number;
  avgFroude?: number;
  minEnergy?: number;
  maxEnergy?: number;
  avgEnergy?: number;
  length: number;
  numPoints: number;
  predominantFlowRegime: string;
}

// Extended results interface for results that include stats
interface DetailedResults extends WaterSurfaceProfileResults {
  stats?: ProfileStats;
  profileDescription?: string;
}

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
  results: WaterSurfaceProfileResults | DetailedResults;
  unitSystem?: UnitSystem;
  onPointSelect?: (station: number) => void;
}

// Type guard to check if a hydraulic jump occurs
function isOccurringJump(jump: HydraulicJump | undefined): jump is HydraulicJump & { occurs: true } {
  return jump !== undefined && 
         typeof jump === 'object' && 
         'occurs' in jump && 
         jump.occurs === true;
}

// Type guard to check if results have detailed stats
function hasDetailedStats(results: WaterSurfaceProfileResults | DetailedResults): results is DetailedResults {
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
        // Calculate channel bottom (default to 0 for flat channel)
        const channelSlope = results.channelType === 'steep' ? 0.01 : 0;
        
        return {
          station: point.x,
          waterSurface: point.y,
          channelBottom: point.x * channelSlope,
          criticalDepth: point.criticalDepth,
          normalDepth: point.normalDepth,
          energy: point.specificEnergy,
        };
      });
      
      setChartData(formattedData);
    }
  }, [optimizedProfile, results.channelType]);
  
  // Get profile type description
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
  
  // Additional profile details if available - handle type safely
  const profileDetails = 'profileDescription' in results && typeof results.profileDescription === 'string'
    ? results.profileDescription 
    : "";
  
  // Get flow regime info
  const flowRegime = useMemo(() => {
    if ('flowRegime' in results && results.flowRegime) {
      return results.flowRegime;
    }
    // Calculate from profile data if not provided
    if (optimizedProfile.length === 0) return FlowRegime.SUBCRITICAL;
    
    const subcriticalCount = optimizedProfile.filter(p => p.froudeNumber < 1).length;
    const supercriticalCount = optimizedProfile.filter(p => p.froudeNumber > 1).length;
    
    if (subcriticalCount > supercriticalCount) {
      return FlowRegime.SUBCRITICAL;
    } else if (supercriticalCount > subcriticalCount) {
      return FlowRegime.SUPERCRITICAL;
    } else {
      return FlowRegime.CRITICAL;
    }
  }, [results, optimizedProfile]);
  
  // Handle chart click for point selection
  const handleChartClick = (data: any) => {
    if (data && data.activeLabel !== undefined && onPointSelect) {
      onPointSelect(data.activeLabel);
    }
  };
  
  // Check if hydraulic jump occurs
  const hasHydraulicJump = isOccurringJump(results.hydraulicJump);
  
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
            onClick={handleChartClick}
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
            
            {/* Mark hydraulic jump if present */}
            {hasHydraulicJump && (
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
        {hasHydraulicJump && (
          <div className="mt-3 pt-3 border-t border-yellow-200 bg-yellow-50 p-3 rounded">
            <h5 className="text-sm font-medium text-yellow-800 mb-1">Hydraulic Jump Details</h5>
            <p className="text-xs text-yellow-700">
              A hydraulic jump occurs at station {formatWithUnit(results.hydraulicJump.station || 0, 'station', unitSystem, 2)}, 
              where the flow transitions from supercritical (Fr &gt; 1) to subcritical (Fr &lt; 1).
              The water depth increases from {formatWithUnit(results.hydraulicJump.upstreamDepth || 0, 'depth', unitSystem, 3)} to {' '}
              {formatWithUnit(results.hydraulicJump.downstreamDepth || 0, 'depth', unitSystem, 3)}.
              {typeof results.hydraulicJump.energyLoss === 'number' && (
                <span> Energy loss at jump: {formatWithUnit(results.hydraulicJump.energyLoss, 'energy', unitSystem, 3)}.</span>
              )}
            </p>
          </div>
        )}
        
        {/* Display additional details from results if available */}
        {hasDetailedStats(results) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-900 mb-1">Profile Statistics</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-700">
              <div>
                <span className="font-medium">Depth Range:</span> {formatWithUnit(results.stats.minDepth, 'depth', unitSystem, 2)} - {formatWithUnit(results.stats.maxDepth, 'depth', unitSystem, 2)}
              </div>
              <div>
                <span className="font-medium">Froude Range:</span> {results.stats.minFroude.toFixed(2)} - {results.stats.maxFroude.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Flow Regime:</span> {results.stats.predominantFlowRegime}
              </div>
              <div>
                <span className="font-medium">Length:</span> {formatWithUnit(results.stats.length, 'length', unitSystem, 0)}
              </div>
              
              {/* Additional statistics if available */}
              {results.stats.avgVelocity !== undefined && (
                <div>
                  <span className="font-medium">Avg Velocity:</span> {formatWithUnit(results.stats.avgVelocity, 'velocity', unitSystem, 2)}
                </div>
              )}
              {results.stats.avgDepth !== undefined && (
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