import React, { useEffect, useState } from 'react';
import { 
  WaterSurfaceProfileResults, 
  FlowDepthPoint,
  ChannelType, 
  UnitSystem
} from '../types';
import { getFlowRegimeDescription } from '../stores/types/resultTypes';
import { formatWithUnit } from '../../../utils/formatters';

interface CrossSectionViewProps {
  results: WaterSurfaceProfileResults;
  selectedFlowPoint?: FlowDepthPoint;
  channelType: ChannelType;
  unitSystem?: UnitSystem;
}

interface LabelPosition {
  x: number;
  y: number;
  text: string;
}

const CrossSectionView: React.FC<CrossSectionViewProps> = ({ 
  results, 
  selectedFlowPoint,
  channelType,
  unitSystem = 'metric'
}) => {
  const [svgPath, setSvgPath] = useState<string>("");
  const [waterPath, setWaterPath] = useState<string>("");
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [labels, setLabels] = useState<LabelPosition[]>([]);
  
  useEffect(() => {
    // Check if results and flow profile exist
    if (results?.flowProfile && results.flowProfile.length > 0) {
      // If no specific flow point is selected, use the first point
      const flowPoint = selectedFlowPoint || results.flowProfile[0];
      generateCrossSection(flowPoint);
    }
  }, [results, selectedFlowPoint, channelType, unitSystem]);
  
  const generateCrossSection = (
    flowPoint: FlowDepthPoint
  ) => {
    // Clear existing data
    setSvgPath("");
    setWaterPath("");
    setLabels([]);
    
    if (!flowPoint) return;
    
    // Default dimensions
    const width = 400;
    const height = 300;
    const padding = 50; // Padding for labels
    
    // Use flow point data
    const depth = flowPoint.y;
    
    // Estimate top width based on channel type
    let topWidth: number;
    switch (channelType) {
      case 'rectangular':
      case 'trapezoidal':
        topWidth = results.flowProfile[0].topWidth || depth * 2; // Approximate
        break;
      case 'triangular':
        topWidth = depth * 2; // For triangular, width is proportional to depth
        break;
      case 'circular':
        topWidth = results.flowProfile[0].topWidth || depth; // Diameter or approximation
        break;
      default:
        topWidth = depth * 2;
    }
    
    // Scale factors to fit the drawing within SVG
    const scale = Math.min((width - 2 * padding) / (topWidth || 1), (height - 2 * padding) / (depth || 1));
    
    // Center point - reference for positioning
    const centerX = width / 2;
    const bottomY = height - padding;
    
    // Generate SVG paths based on channel type
    let channelPath = "";
    let waterSurfacePath = "";
    let newLabels: LabelPosition[] = [];
    
    switch (channelType) {
      case 'rectangular':
        // Bottom width would be topWidth for a rectangular channel
        const halfWidth = ((topWidth || 1) * scale) / 2;
        
        // Channel outline
        channelPath = `
          M ${centerX - halfWidth} ${bottomY}
          L ${centerX - halfWidth} ${bottomY - depth * scale}
          L ${centerX + halfWidth} ${bottomY - depth * scale}
          L ${centerX + halfWidth} ${bottomY}
          Z
        `;
        
        // Water surface
        waterSurfacePath = `
          M ${centerX - halfWidth} ${bottomY - depth * scale}
          L ${centerX + halfWidth} ${bottomY - depth * scale}
          L ${centerX + halfWidth} ${bottomY}
          L ${centerX - halfWidth} ${bottomY}
          Z
        `;
        
        // Add labels with proper units
        newLabels = [
          { 
            x: centerX, 
            y: bottomY + 20, 
            text: `Bottom Width: ${formatWithUnit(topWidth, 'bottomWidth', unitSystem, 2)}`
          },
          { 
            x: centerX - halfWidth - 20, 
            y: bottomY - depth * scale / 2, 
            text: `Depth: ${formatWithUnit(depth, 'depth', unitSystem, 2)}` 
          },
          { 
            x: centerX, 
            y: bottomY - depth * scale - 20, 
            text: 'Water Surface' 
          }
        ];
        break;
        
      case 'trapezoidal':
        // Estimate side slope
        const sideSlope = 2; 
        const slopeRatio = depth / sideSlope;
        const bottomWidth = Math.max(0.1, (topWidth || 1) - 2 * slopeRatio);
        const halfBottomWidth = (bottomWidth * scale) / 2;
        const halfTopWidth = ((topWidth || 1) * scale) / 2;
        
        // Channel outline
        channelPath = `
          M ${centerX - halfBottomWidth} ${bottomY}
          L ${centerX - halfTopWidth} ${bottomY - depth * scale}
          L ${centerX + halfTopWidth} ${bottomY - depth * scale}
          L ${centerX + halfBottomWidth} ${bottomY}
          Z
        `;
        
        // Water surface
        waterSurfacePath = `
          M ${centerX - halfTopWidth} ${bottomY - depth * scale}
          L ${centerX + halfTopWidth} ${bottomY - depth * scale}
          L ${centerX + halfBottomWidth} ${bottomY}
          L ${centerX - halfBottomWidth} ${bottomY}
          Z
        `;
        
        // Add labels with proper units
        newLabels = [
          { 
            x: centerX, 
            y: bottomY + 20, 
            text: `Bottom Width: ${formatWithUnit(bottomWidth, 'bottomWidth', unitSystem, 2)}`
          },
          { 
            x: centerX, 
            y: bottomY - depth * scale - 20, 
            text: `Top Width: ${formatWithUnit(topWidth, 'topWidth', unitSystem, 2)}`
          },
          { 
            x: centerX - halfTopWidth - 30, 
            y: bottomY - depth * scale / 2, 
            text: `Depth: ${formatWithUnit(depth, 'depth', unitSystem, 2)}`
          },
          { 
            x: centerX + halfTopWidth + 30, 
            y: bottomY - depth * scale / 2, 
            text: `Side Slope: ${sideSlope}:1`
          }
        ];
        break;
        
      case 'triangular':
        // For triangular channels, bottom width is 0
        const halfTriTopWidth = ((topWidth || 1) * scale) / 2;
        
        // Channel outline
        channelPath = `
          M ${centerX - halfTriTopWidth} ${bottomY - depth * scale}
          L ${centerX} ${bottomY}
          L ${centerX + halfTriTopWidth} ${bottomY - depth * scale}
          Z
        `;
        
        // Water surface
        waterSurfacePath = `
          M ${centerX - halfTriTopWidth} ${bottomY - depth * scale}
          L ${centerX + halfTriTopWidth} ${bottomY - depth * scale}
          L ${centerX} ${bottomY}
          Z
        `;
        
        // Add labels with proper units
        newLabels = [
          { 
            x: centerX, 
            y: bottomY - depth * scale - 20, 
            text: `Top Width: ${formatWithUnit(topWidth, 'topWidth', unitSystem, 2)}`
          },
          { 
            x: centerX - halfTriTopWidth - 30, 
            y: bottomY - depth * scale / 2, 
            text: `Depth: ${formatWithUnit(depth, 'depth', unitSystem, 2)}`
          }
        ];
        break;
        
      case 'circular':
        // For circular channels, we need to draw an arc
        const diameter = topWidth || 1; // Approximation based on top width
        const radius = (diameter * scale) / 2;
        
        // Calculate the angle for the water surface
        const theta = Math.acos(1 - 2 * depth / diameter);
        const waterSurfaceWidth = diameter * Math.sin(theta);
        const halfWaterWidth = (waterSurfaceWidth * scale) / 2;
        
        // Channel outline (full circle)
        channelPath = `
          M ${centerX - radius} ${bottomY - radius}
          a ${radius} ${radius} 0 1 0 ${2 * radius} 0
          a ${radius} ${radius} 0 1 0 ${-2 * radius} 0
        `;
        
        // Water surface (partial circle)
        waterSurfacePath = `
          M ${centerX - halfWaterWidth} ${bottomY - depth * scale}
          A ${radius} ${radius} 0 1 0 ${centerX + halfWaterWidth} ${bottomY - depth * scale}
          L ${centerX} ${bottomY}
          Z
        `;
        
        // Add labels with proper units
        newLabels = [
          { 
            x: centerX, 
            y: bottomY - 2 * radius - 20, 
            text: `Diameter: ${formatWithUnit(diameter, 'diameter', unitSystem, 2)}`
          },
          { 
            x: centerX - radius - 30, 
            y: bottomY - radius, 
            text: `Depth: ${formatWithUnit(depth, 'depth', unitSystem, 2)}`
          },
          { 
            x: centerX, 
            y: bottomY - depth * scale - 20, 
            text: `Water Surface Width: ${formatWithUnit(waterSurfaceWidth, 'topWidth', unitSystem, 2)}`
          }
        ];
        break;
    }
    
    setSvgPath(channelPath);
    setWaterPath(waterSurfacePath);
    setDimensions({ width, height });
    setLabels(newLabels);
  };
  
  // If no results, show a placeholder
  if (!results || !results.flowProfile || results.flowProfile.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Channel Cross Section</h3>
        <div className="flex justify-center items-center h-64 bg-gray-100 rounded-md">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }
  
  // Select the flow point to display
  const flowPoint = selectedFlowPoint || results.flowProfile[0];
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Channel Cross Section</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Station: {formatWithUnit(flowPoint.x, 'station', unitSystem, 2)} | 
          Depth: {formatWithUnit(flowPoint.y, 'depth', unitSystem, 3)} | 
          Velocity: {formatWithUnit(flowPoint.velocity, 'velocity', unitSystem, 2)}
        </p>
      </div>
      
      <div className="flex justify-center">
        <svg 
          width={dimensions.width} 
          height={dimensions.height} 
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="border border-gray-200"
        >
          {/* Channel outline */}
          <path
            d={svgPath}
            fill="none"
            stroke="#374151"
            strokeWidth="2"
          />
          
          {/* Water surface */}
          <path
            d={waterPath}
            fill="#93c5fd"
            fillOpacity="0.6"
            stroke="#3b82f6"
            strokeWidth="1"
          />
          
          {/* Labels */}
          {labels.map((label, index) => (
            <g key={index}>
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                fontSize="12"
                fill="#4b5563"
              >
                {label.text}
              </text>
            </g>
          ))}
        </svg>
      </div>
      
      <div className="mt-4">
        <h4 className="text-md font-medium text-gray-900 mb-2">Hydraulic Properties</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-xs text-gray-500">Depth</p>
            <p className="text-lg font-medium">{formatWithUnit(flowPoint.y, 'depth', unitSystem, 3)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-xs text-gray-500">Velocity</p>
            <p className="text-lg font-medium">{formatWithUnit(flowPoint.velocity, 'velocity', unitSystem, 2)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-xs text-gray-500">Froude Number</p>
            <p className="text-lg font-medium">{formatWithUnit(flowPoint.froudeNumber, 'froudeNumber', unitSystem, 3)}</p>
            <p className="text-xs text-gray-500">
              {getFlowRegimeDescription(flowPoint.froudeNumber)}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-xs text-gray-500">Specific Energy</p>
            <p className="text-lg font-medium">{formatWithUnit(flowPoint.specificEnergy, 'energy', unitSystem, 3)}</p>
          </div>
        </div>
      </div>
      
      {/* Profile Information */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Profile Information</h4>
        <p className="text-xs text-gray-700">
          Profile Type: {results.profileType}
        </p>
        <p className="text-xs text-gray-700 mt-1">
          Channel Type: {results.channelType}
        </p>
        
        {/* Hydraulic Jump Information */}
        {results.hydraulicJump?.occurs && (
          <div className="mt-2">
            <p className="text-xs text-gray-700">
              Hydraulic Jump: Occurs at station {formatWithUnit(results.hydraulicJump.station || 0, 'station', unitSystem, 2)}
            </p>
            <p className="text-xs text-gray-700">
              Depth Change: {formatWithUnit(results.hydraulicJump.upstreamDepth || 0, 'depth', unitSystem, 3)} 
              → {formatWithUnit(results.hydraulicJump.downstreamDepth || 0, 'depth', unitSystem, 3)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrossSectionView;