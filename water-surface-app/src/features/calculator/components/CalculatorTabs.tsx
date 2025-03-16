import React from 'react';

export type TabType = 'input' | 'results' | 'profile' | 'cross-section' | 'water-surface';

interface CalculatorTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  hasResults: boolean;
}

const CalculatorTabs: React.FC<CalculatorTabsProps> = ({ 
  activeTab, 
  setActiveTab,
  hasResults 
}) => {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'input', label: 'Channel Input' },
    { id: 'results', label: 'Results Table' },
    { id: 'profile', label: 'Profile Visualization' },
    { id: 'cross-section', label: 'Cross Section' },
    { id: 'water-surface', label: 'Water Surface' }
  ];

  return (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.id !== 'input' && !hasResults}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } ${tab.id !== 'input' && !hasResults ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default CalculatorTabs;