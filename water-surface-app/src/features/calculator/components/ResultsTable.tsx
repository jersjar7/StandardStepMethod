import React, { useState } from 'react';
import { 
  WaterSurfaceProfileResults, 
  FlowDepthPoint,
  UnitSystem,
  FlowRegime
} from '../types';
import { getFlowRegimeDescription } from '../stores/types/resultTypes';
import { formatWithUnit, getParameterLabels } from '../../../utils/formatters';

interface ResultsTableProps {
  results: WaterSurfaceProfileResults;
  unitSystem?: UnitSystem;
  onSelectPoint?: (point: FlowDepthPoint) => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ 
  results, 
  unitSystem = 'metric',
  onSelectPoint 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 10;
  
  // Get parameter labels with proper units
  const labels = getParameterLabels(unitSystem);
  
  // Get the flow profile from the results
  const { flowProfile, hydraulicJump } = results;
  
  // Calculate the total number of pages
  const totalPages = Math.ceil(flowProfile.length / resultsPerPage);
  
  // Get the current page results
  const getCurrentResults = () => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = Math.min(startIndex + resultsPerPage, flowProfile.length);
    return flowProfile.slice(startIndex, endIndex);
  };
  
  // Handle page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle row selection
  const handleRowClick = (point: FlowDepthPoint) => {
    if (onSelectPoint) {
      onSelectPoint(point);
    }
  };
  
  const currentResults = getCurrentResults();
  
  // Show a message if no results are available
  if (flowProfile.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500">No calculation results available. Please run a calculation first.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-4 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Calculation Results</h3>
        <p className="mt-1 text-sm text-gray-600">
          Water surface profile calculation results showing station, depth, velocity, and other hydraulic parameters.
          {results.profileType && (
            <span className="ml-2 font-medium">{results.profileType}</span>
          )}
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {labels.station}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {labels.depth}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {labels.velocity}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {labels.froudeNumber}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {labels.energy}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Flow Regime
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentResults.map((point, index) => {
              // Determine flow regime class for styling
              const flowRegimeClass = point.froudeNumber > 1 
                ? 'bg-yellow-50' // Supercritical
                : point.froudeNumber < 1 
                  ? 'bg-blue-50' // Subcritical
                  : ''; // Critical
              
              return (
                <tr 
                  key={index}
                  className={`${flowRegimeClass} cursor-pointer hover:bg-gray-50`}
                  onClick={() => handleRowClick(point)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatWithUnit(point.x, 'station', unitSystem, 2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatWithUnit(point.y, 'depth', unitSystem, 3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatWithUnit(point.velocity, 'velocity', unitSystem, 3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatWithUnit(point.froudeNumber, 'froudeNumber', unitSystem, 3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatWithUnit(point.specificEnergy, 'energy', unitSystem, 3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="text-xs text-gray-500">
                      {getFlowRegimeDescription(point.froudeNumber)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between items-center">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      {/* Summary information */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <span className="text-sm font-medium text-gray-500">
              Total Results: {flowProfile.length}
            </span>
            {results.profileType && (
              <span className="ml-4 text-sm font-medium text-gray-500">
                Profile Type: {results.profileType}
              </span>
            )}
          </div>
          
          {flowProfile.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <span className="text-sm font-medium text-gray-500">
                Normal Depth: {formatWithUnit(results.normalDepth, 'normalDepth', unitSystem, 3)}
              </span>
              <span className="text-sm font-medium text-gray-500">
                Critical Depth: {formatWithUnit(results.criticalDepth, 'criticalDepth', unitSystem, 3)}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Hydraulic Jump Information */}
      {hydraulicJump?.occurs && (
        <div className="px-6 py-4 bg-yellow-50 border-t border-yellow-200">
          <h4 className="text-sm font-medium text-yellow-800">Hydraulic Jump Detected</h4>
          <p className="mt-1 text-sm text-yellow-700">
            A hydraulic jump occurs at station {formatWithUnit(hydraulicJump.station, 'station', unitSystem, 2)}.
            The water depth changes from {formatWithUnit(hydraulicJump.upstreamDepth, 'depth', unitSystem, 3)} to {formatWithUnit(hydraulicJump.downstreamDepth, 'depth', unitSystem, 3)}.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;