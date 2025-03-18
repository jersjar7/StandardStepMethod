import React, { useState, useRef, useEffect } from 'react';
import { ChannelParams } from '../types';
import { FlowDepthPoint } from '../types';
import { ExportService } from '../../../services/exportService';

interface ExportMenuProps {
  results: FlowDepthPoint[];
  channelParams: ChannelParams;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ results, channelParams }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Export handlers
  const handleExportCSV = () => {
    if (!results || results.length === 0) return;
    const csvContent = ExportService.exportToCSV(results, channelParams);
    ExportService.downloadCSV(csvContent);
    setIsOpen(false);
  };

  const handleExportJSON = () => {
    if (!results || results.length === 0) return;
    const jsonContent = ExportService.exportToJSON(results, channelParams);
    ExportService.downloadJSON(jsonContent);
    setIsOpen(false);
  };

  const handleGenerateReport = () => {
    if (!results || results.length === 0) return;
    const htmlContent = ExportService.generateReport(results, channelParams);
    ExportService.downloadReport(htmlContent);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Export Results
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
          <div className="py-1">
            <button
              onClick={handleExportCSV}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Export as CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Export as JSON
            </button>
            <button
              onClick={handleGenerateReport}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Generate Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;