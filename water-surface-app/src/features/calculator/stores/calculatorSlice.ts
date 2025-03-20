import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Import types from central type definitions
import { 
  ChannelParams, 
  WaterSurfaceProfileResults,
  DetailedWaterSurfaceResults,
  ChannelType,
} from '../types';
import { CalculationResultWithError } from '../../calculator/types/resultTypes';

// Import helper functions from type files
import { getUpdatedChannelParams } from './types/channelTypes';

/**
 * Standardized Calculator State interface
 */
export interface CalculatorState {
  // Channel parameters
  channelParams: ChannelParams;
  
  // Calculation status
  isCalculating: boolean;
  calculationProgress: number;
  error: string | null;
  
  // Calculation results
  detailedResults?: WaterSurfaceProfileResults;
  
  // UI state
  selectedPointIndex?: number;
  selectedTab?: string;
  
  // Calculation settings
  calculationSettings: {
    useWorker: boolean;
    useCache: boolean;
    highResolution: boolean;
  };
}

// Define initial state
const initialState: CalculatorState = {
  // Default channel parameters
  channelParams: {
    channelType: 'trapezoidal',
    bottomWidth: 10,
    sideSlope: 2,
    manningN: 0.03,
    channelSlope: 0.001,
    discharge: 100,
    length: 1000,
    units: 'imperial'
  },
  
  // Initial calculation status
  isCalculating: false,
  calculationProgress: 0,
  error: null,
  
  // Initial UI state
  selectedTab: 'input',
  
  // Default calculation settings
  calculationSettings: {
    useWorker: true,
    useCache: true,
    highResolution: false
  }
};

// Create calculator slice with standardized actions
export const calculatorSlice = createSlice({
  name: 'calculator',
  initialState,
  reducers: {
    /**
     * Update channel parameters
     */
    updateChannelParams: (state, action: PayloadAction<Partial<ChannelParams>>) => {
      state.channelParams = {
        ...state.channelParams,
        ...action.payload
      };
    },
    
    /**
     * Set channel type and update relevant parameters
     */
    setChannelType: (state, action: PayloadAction<ChannelType>) => {
      state.channelParams = getUpdatedChannelParams(
        action.payload,
        state.channelParams
      );
    },
    
    /**
     * Start a calculation
     */
    startCalculation: (state) => {
      state.isCalculating = true;
      state.calculationProgress = 0;
      state.error = null;
    },
    
    /**
     * Update calculation progress
     */
    updateCalculationProgress: (state, action: PayloadAction<number>) => {
      state.calculationProgress = action.payload;
    },
    
    /**
     * Set calculation results
     */
    setWaterSurfaceResults: (
      state, 
      action: PayloadAction<WaterSurfaceProfileResults>
    ) => {
      state.detailedResults = action.payload;
      
      // Update channel parameters with critical and normal depths
      if (action.payload.criticalDepth && action.payload.normalDepth) {
        state.channelParams.criticalDepth = action.payload.criticalDepth;
        state.channelParams.normalDepth = action.payload.normalDepth;
      }
      
      // Mark calculation as complete
      state.isCalculating = false;
      state.calculationProgress = 100;
      
      // If on input tab, switch to results
      if (state.selectedTab === 'input') {
        state.selectedTab = 'results';
      }
    },
    
    /**
     * Set detailed calculation results
     */
    setDetailedResults: (
      state, 
      action: PayloadAction<DetailedWaterSurfaceResults>
    ) => {
      state.detailedResults = action.payload;
      
      // Update channel parameters with critical and normal depths
      if (action.payload.criticalDepth && action.payload.normalDepth) {
        state.channelParams.criticalDepth = action.payload.criticalDepth;
        state.channelParams.normalDepth = action.payload.normalDepth;
      }
      
      // Mark calculation as complete
      state.isCalculating = false;
      state.calculationProgress = 100;
      
      // If on input tab, switch to results
      if (state.selectedTab === 'input') {
        state.selectedTab = 'results';
      }
    },
    
    /**
     * Handle calculation error
     */
    calculationFailure: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isCalculating = false;
      state.calculationProgress = 0;
    },
    
    /**
     * Handle calculation result with possible error
     */
    setCalculationResult: (state, action: PayloadAction<CalculationResultWithError>) => {
      if (action.payload.error) {
        // Handle error
        state.error = action.payload.error;
        state.isCalculating = false;
        state.calculationProgress = 0;
      } else if (action.payload.results) {
        // Set results
        state.detailedResults = action.payload.results;
        
        // Update channel parameters with critical and normal depths
        if (action.payload.results.criticalDepth && action.payload.results.normalDepth) {
          state.channelParams.criticalDepth = action.payload.results.criticalDepth;
          state.channelParams.normalDepth = action.payload.results.normalDepth;
        }
        
        // Mark calculation as complete
        state.isCalculating = false;
        state.calculationProgress = 100;
        
        // If on input tab, switch to results
        if (state.selectedTab === 'input') {
          state.selectedTab = 'results';
        }
      }
    },
    
    /**
     * Reset calculation results
     */
    resetResults: (state) => {
      state.detailedResults = undefined;
      state.error = null;
      state.calculationProgress = 0;
      state.selectedTab = 'input';
    },
    
    /**
     * Reset all calculator state
     */
    resetCalculator: (state) => {
      // Reset all calculation-related state
      state.detailedResults = undefined;
      state.error = null;
      state.calculationProgress = 0;
      state.selectedTab = 'input';
      
      // Keep channel parameters - user may want to keep their inputs
    },
    
    /**
     * Set selected flow point index
     */
    setSelectedPointIndex: (state, action: PayloadAction<number>) => {
      state.selectedPointIndex = action.payload;
    },
    
    /**
     * Set selected tab
     */
    setSelectedTab: (state, action: PayloadAction<string>) => {
      state.selectedTab = action.payload;
    },
    
    /**
     * Update calculation settings
     */
    updateCalculationSettings: (
      state, 
      action: PayloadAction<Partial<CalculatorState['calculationSettings']>>
    ) => {
      state.calculationSettings = {
        ...state.calculationSettings,
        ...action.payload
      };
    }
  }
});

// Export actions
export const {
  updateChannelParams,
  setChannelType,
  startCalculation,
  updateCalculationProgress,
  setWaterSurfaceResults,
  setDetailedResults,
  calculationFailure,
  setCalculationResult,
  resetResults,
  resetCalculator,
  setSelectedPointIndex,
  setSelectedTab,
  updateCalculationSettings
} = calculatorSlice.actions;

// Export reducer
export default calculatorSlice.reducer;

/**
 * Action creators for async operations (for use with thunks or sagas)
 */

/**
 * Create an action to handle a calculation result or error
 * @param result Calculation result with possible error
 * @returns Redux action
 */
export const handleCalculationResult = (
  result: CalculationResultWithError
) => {
  return result.error
    ? calculationFailure(result.error)
    : setWaterSurfaceResults(result.results!);
};

/**
 * Create an action to handle detailed calculation result or error
 * @param result Detailed calculation result with possible error
 * @returns Redux action
 */
export const handleDetailedCalculationResult = (
  result: { results?: DetailedWaterSurfaceResults; error?: string }
) => {
  return result.error
    ? calculationFailure(result.error)
    : setDetailedResults(result.results!);
};