import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Import types from central type definitions
import { 
  ChannelParams, 
  WaterSurfaceProfileResults,
  ChannelType,
} from '../types';

// Import helper functions from type files
import { getUpdatedChannelParams } from './types/channelTypes';

/**
 * Calculator State interface using standardized results
 */
export interface CalculatorState {
  // Original state properties
  channelParams: ChannelParams;
  isCalculating: boolean;
  error: string | null;
  selectedResultIndex?: number;
  
  // Store only the standardized results
  detailedResults?: WaterSurfaceProfileResults; 
}

// Define initial state
const initialState: CalculatorState = {
  channelParams: {
    channelType: 'trapezoidal',
    bottomWidth: 10,
    sideSlope: 2, // Horizontal:Vertical
    manningN: 0.03,
    channelSlope: 0.001,
    discharge: 100,
    length: 1000,
    units: 'metric'
  },
  isCalculating: false,
  error: null
};

// Create calculator slice
export const calculatorSlice = createSlice({
  name: 'calculator',
  initialState,
  reducers: {
    setChannelType: (state, action: PayloadAction<ChannelType>) => {
      // Update channel parameters based on type using helper function
      state.channelParams = getUpdatedChannelParams(
        action.payload,
        state.channelParams
      );
    },
    
    updateChannelParams: (state, action: PayloadAction<Partial<ChannelParams>>) => {
      state.channelParams = {
        ...state.channelParams,
        ...action.payload
      };
    },
    
    startCalculation: (state) => {
      state.isCalculating = true;
      state.error = null;
    },
    
    calculationFailure: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isCalculating = false;
    },
    
    resetCalculator: (state) => {
      // Reset all calculation-related state
      state.detailedResults = undefined;
      state.error = null;
    },
    
    setSelectedResultIndex: (state, action: PayloadAction<number>) => {
      // If need to track a selected result for visualization
      state.selectedResultIndex = action.payload;
    },

    // Reset results action
    resetResults: (state) => {
      // Reset to initial state for results-related properties
      state.detailedResults = undefined;
      state.error = null;
    },
    
    /**
     * Sets the water surface profile results using the standardized format
     */
    setWaterSurfaceResults: (state, action: PayloadAction<WaterSurfaceProfileResults>) => {
      // Store only the complete water surface profile results
      state.detailedResults = action.payload;
      
      // Update channel parameters with critical and normal depths if available
      if (action.payload.criticalDepth && action.payload.normalDepth) {
        state.channelParams.criticalDepth = action.payload.criticalDepth;
        state.channelParams.normalDepth = action.payload.normalDepth;
      }
      
      // Calculation is complete
      state.isCalculating = false;
    }
  }
});

// Export actions
export const {
  setChannelType,
  updateChannelParams,
  startCalculation,
  calculationFailure,
  resetCalculator,
  setSelectedResultIndex,
  resetResults,
  setWaterSurfaceResults,
} = calculatorSlice.actions;

// Export reducer
export default calculatorSlice.reducer;