import React, { useEffect, useState } from 'react';
import { CalculationResult } from '../stores/calculatorSlice';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProfileVisualizationProps {
  results: CalculationResult[];
}

const ProfileVisualization: React.FC<ProfileVisualizationProps> = ({ results }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [profileType, setProfileType] = useState<string>('');
  const [showChannelBottom, setShowChannelBottom] = useState<boolean>(true);
  const [showCriticalDepth, setShowCriticalDepth] = useState<boolean>(true);
  const [showNormalDepth, setShowNormalDepth] = useState<boolean>(true);
  
  useEffect(() => {
    if (results.length > 0) {
      // Prepare data for the chart
      const formattedData = results.map(result => ({
        station: result.station,
        waterSurface: result.depth,
        channelBottom: 0, // Assuming a flat channel bottom for simplicity
        criticalDepth: result.criticalDepth,
        normalDepth: result.normalDepth,
        energy: result.energy,
      }));
      
      setChartData(formattedData);
      
      // Determine profile type
      const normalDepth = results[0].normalDepth || 0;
      const criticalDepth = results[0].criticalDepth || 0;
      const averageDepth = results.reduce((sum, r) => sum + r.depth, 0) / results.length;
      
      if (normalDepth > criticalDepth) {
        // Mild slope
        if (averageDepth > normalDepth) {
          setProfileType('M1 - Backwater Profile (Mild Slope)');
        } else if (averageDepth < normalDepth && averageDepth > criticalDepth) {
          setProfileType('M2 - Drawdown Profile (Mild Slope)');
        } else {
          setProfileType('M3 - Rapidly Varied Profile (Mild Slope)');
        }
      } else if (normalDepth < criticalDepth) {
        // Steep slope
        if (averageDepth > criticalDepth) {
          setProfileType('S1 - Backwater Profile (Steep Slope)');
        } else if (averageDepth < criticalDepth && averageDepth > normalDepth) {
          setProfileType('S2 - Drawdown Profile (Steep Slope)');
        } else {
          setProfileType('S3 - Rapidly Varied Profile (Steep Slope)');
        }
      } else {
        setProfileType('Critical Slope Profile');
      }
    }
  }, [results]);
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 shadow-lg rounded-lg">
          <p className="text-sm font-medium text-gray-900">Station: {label} m</p>
          <p className="text-sm text-blue-600">Water Surface: {payload[0].value.toFixed(3)} m</p>
          {payload[1] && <p className="text-sm text-gray-600">Channel Bottom: {payload[1].value.toFixed(3)} m</p>}
          {payload[2] && <p className="text-sm text-red-600">Critical Depth: {payload[2].value.toFixed(3)} m</p>}
          {payload[3] && <p className="text-sm text-green-600">Normal Depth: {payload[3].value.toFixed(3)} m</p>}
          {payload[4] && <p className="text-sm text-purple-600">Energy Grade Line: {payload[4].value.toFixed(3)} m</p>}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Water Surface Profile Visualization</h3>
        <p className="mt-1 text-sm text-gray-600">
          {profileType}
        </p>
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
              label={{ value: 'Station (m)', position: 'insideBottomRight', offset: -10 }} 
            />
            <YAxis 
              label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }}
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
            
            <Line
              type="monotone"
              dataKey="energy"
              name="Energy Grade Line"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
            />
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
    </div>
  );
};

export default ProfileVisualization;