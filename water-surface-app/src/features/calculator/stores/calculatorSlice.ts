import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Import types from central type definitions
import { 
  ChannelParams, 
  CalculationResult, 
  HydraulicJump, 
  CalculatorState,
  ChannelType
} from '../types';

// Import helper functions from type files
import { getUpdatedChannelParams } from './types/channelTypes';

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
  results: [],
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
    
    calculationSuccess: (state, action: PayloadAction<{
      results: CalculationResult[], 
      hydraulicJump?: HydraulicJump
    }>) => {
      state.results = action.payload.results;
      state.hydraulicJump = action.payload.hydraulicJump;
      state.isCalculating = false;
      
      // Update channel parameters with calculated critical and normal depths
      if (action.payload.results.length > 0) {
        const firstResult = action.payload.results[0];
        state.channelParams.criticalDepth = firstResult.criticalDepth;
        state.channelParams.normalDepth = firstResult.normalDepth;
      }
    },
    
    calculationFailure: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isCalculating = false;
    },
    
    resetCalculator: (state) => {
      state.results = [];
      state.hydraulicJump = undefined;
      state.error = null;
    },
    
    setSelectedResultIndex: (state, action: PayloadAction<number>) => {
      // If need to track a selected result for visualization
      state.selectedResultIndex = action.payload;
    }
  }
});

// Export actions
export const {
  setChannelType,
  updateChannelParams,
  startCalculation,
  calculationSuccess,
  calculationFailure,
  resetCalculator,
  setSelectedResultIndex
} = calculatorSlice.actions;

// Export types
export type {
  ChannelParams,
  CalculationResult,
  HydraulicJump
};

// Export reducer
export default calculatorSlice.reducer;