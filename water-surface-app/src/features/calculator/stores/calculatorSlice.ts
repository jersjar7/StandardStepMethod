import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Import types from central type definitions
import { 
  ChannelParams, 
  WaterSurfaceProfileResults,
  CalculationResult, 
  HydraulicJump, 
  CalculatorState,
  ChannelType,
  ProfileType,
  FlowRegime
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
      hydraulicJump?: HydraulicJump,
      profileType?: ProfileType,
      flowRegime?: FlowRegime
    }>) => {
      state.results = action.payload.results;
      state.hydraulicJump = action.payload.hydraulicJump;
      state.profileType = action.payload.profileType;
      state.flowRegime = action.payload.flowRegime;
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
      state.profileType = undefined;
      state.flowRegime = undefined;
      state.error = null;
    },
    
    setSelectedResultIndex: (state, action: PayloadAction<number>) => {
      // If need to track a selected result for visualization
      state.selectedResultIndex = action.payload;
    },
    
    setWaterSurfaceResults: (state, action: PayloadAction<WaterSurfaceProfileResults>) => {
      // Store complete water surface profile results and extract relevant data
      const { flowProfile, hydraulicJump, profileType } = action.payload;
      
      // Convert flow points to standard calculation results if needed
      // This would require a conversion function in a real implementation
      // For now we'll just assign directly (assuming compatible structures)
      state.detailedResults = action.payload;
      
      // Extract key components for backward compatibility
      if (flowProfile) {
        // Convert flowProfile to results array if needed
        // This is a simplified example - real implementation would need proper conversion
        state.results = flowProfile.map(point => ({
          station: point.x,
          depth: point.y,
          velocity: point.velocity,
          froudeNumber: point.froudeNumber,
          energy: point.specificEnergy,
          area: 0, // These would need proper calculation based on parameters
          topWidth: 0,
          wetPerimeter: 0,
          hydraulicRadius: 0,
          criticalDepth: point.criticalDepth,
          normalDepth: point.normalDepth
        }));
      }
      
      state.hydraulicJump = hydraulicJump;
      state.profileType = profileType as ProfileType;
      state.isCalculating = false;
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
  setSelectedResultIndex,
  setWaterSurfaceResults
} = calculatorSlice.actions;

// Export reducer
export default calculatorSlice.reducer;