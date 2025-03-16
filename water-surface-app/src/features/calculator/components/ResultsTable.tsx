import React, { useState } from 'react';
import { CalculationResult, HydraulicJump } from '../types';
import { getFlowRegimeDescription } from '../stores/types/resultTypes';

interface ResultsTableProps {
  results: CalculationResult[];
  hydraulicJump?: HydraulicJump;
  onSelectResult?: (index: number) => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ 
  results, 
  hydraulicJump,
  onSelectResult 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 10;
  
  // Calculate the total number of pages
  const totalPages = Math.ceil(results.length / resultsPerPage);
  
  // Get the current page results
  const getCurrentResults = () => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = Math.min(startIndex + resultsPerPage, results.length);
    return results.slice(startIndex, endIndex);
  };
  
  // Handle page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle row selection
  const handleRowClick = (index: number) => {
    if (onSelectResult) {
      // Convert index in the current page to index in the overall results array
      const globalIndex = (currentPage - 1) * resultsPerPage + index;
      onSelectResult(globalIndex);
    }
  };
  
  const currentResults = getCurrentResults();
  
  // Show a message if no results are available
  if (results.length === 0) {
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
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Station (m)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Depth (m)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Velocity (m/s)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Area (m²)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Top Width (m)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hydraulic Radius (m)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Energy (m)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Froude Number
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentResults.map((result, index) => {
              // Determine flow regime class for styling
              const flowRegimeClass = result.froudeNumber > 1 
                ? 'bg-yellow-50' // Supercritical
                : result.froudeNumber < 1 
                  ? 'bg-blue-50' // Subcritical
                  : ''; // Critical
              
              return (
                <tr 
                  key={index}
                  className={`${flowRegimeClass} cursor-pointer hover:bg-gray-50`}
                  onClick={() => handleRowClick(index)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.station.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.depth.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.velocity.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.area.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.topWidth.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.hydraulicRadius.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.energy.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.froudeNumber.toFixed(3)}
                    <span className="ml-2 text-xs text-gray-500">
                      {getFlowRegimeDescription(result.froudeNumber)}
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
              Total Results: {results.length}
            </span>
          </div>
          
          {results.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <span className="text-sm font-medium text-gray-500">
                {results[0].normalDepth && `Normal Depth: ${results[0].normalDepth.toFixed(3)} m`}
              </span>
              <span className="text-sm font-medium text-gray-500">
                {results[0].criticalDepth && `Critical Depth: ${results[0].criticalDepth.toFixed(3)} m`}
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
            A hydraulic jump occurs at station {hydraulicJump.station?.toFixed(2)} m.
            The water depth changes from {hydraulicJump.upstreamDepth?.toFixed(3)} m to {hydraulicJump.downstreamDepth?.toFixed(3)} m.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;