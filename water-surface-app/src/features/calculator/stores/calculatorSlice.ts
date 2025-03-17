import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Import types from central type definitions
import { 
  ChannelParams, 
  WaterSurfaceProfileResults,
  CalculationResult, 
  HydraulicJump, 
  ChannelType,
  ProfileType,
  FlowRegime,
} from '../types';

// Import helper functions from type files
import { getUpdatedChannelParams } from './types/channelTypes';

/**
 * Enhanced Calculator State interface to include standardized results
 */
export interface CalculatorState {
  // Original state properties
  channelParams: ChannelParams;
  results: CalculationResult[];
  hydraulicJump?: HydraulicJump;
  isCalculating: boolean;
  error: string | null;
  selectedResultIndex?: number;
  profileType?: ProfileType;
  flowRegime?: FlowRegime;
  
  // Enhanced properties for standardized results
  detailedResults?: WaterSurfaceProfileResults; // Store the complete water surface profile results
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
      // Reset all calculation-related state
      state.results = [];
      state.hydraulicJump = undefined;
      state.profileType = undefined;
      state.flowRegime = undefined;
      state.detailedResults = undefined;
      state.error = null;
    },
    
    setSelectedResultIndex: (state, action: PayloadAction<number>) => {
      // If need to track a selected result for visualization
      state.selectedResultIndex = action.payload;
    },

    // New reset results action
    resetResults: (state) => {
      // Reset to initial state for results-related properties
      state.detailedResults = undefined;
      state.results = [];
      state.hydraulicJump = undefined;
      state.profileType = undefined;
      state.flowRegime = undefined;
      state.error = null;
    },
    
    /**
     * Sets the water surface profile results using the standardized format
     * Also populates legacy results for backward compatibility
     */
    setWaterSurfaceResults: (state, action: PayloadAction<WaterSurfaceProfileResults>) => {
      // Store the complete water surface profile results
      state.detailedResults = action.payload;
      
      // Extract key properties for convenience
      const { flowProfile, hydraulicJump, profileType } = action.payload;
      
      // Set hydraulic jump and profile type
      state.hydraulicJump = hydraulicJump;
      state.profileType = profileType as ProfileType;
      
      // Determine flow regime based on Froude numbers
      if (flowProfile && flowProfile.length > 0) {
        let subcriticalCount = 0;
        let supercriticalCount = 0;
        
        flowProfile.forEach(point => {
          if (point.froudeNumber < 1) subcriticalCount++;
          else supercriticalCount++;
        });
        
        state.flowRegime = subcriticalCount > supercriticalCount ? 
          FlowRegime.SUBCRITICAL : FlowRegime.SUPERCRITICAL;
      }
      
      // Convert flow points to standard calculation results for backward compatibility
      if (flowProfile && flowProfile.length > 0) {
        state.results = flowProfile.map(point => {
          // Create a basic version of the calculation result
          const result: CalculationResult = {
            station: point.x,
            depth: point.y,
            velocity: point.velocity,
            froudeNumber: point.froudeNumber,
            energy: point.specificEnergy,
            
            // These values need proper calculation based on the channel geometry
            // For now, we'll use placeholder values that would be replaced
            // with actual calculations in a real implementation
            area: 0, 
            topWidth: 0,
            wetPerimeter: 0,
            hydraulicRadius: 0,
            
            // Reference values
            criticalDepth: point.criticalDepth,
            normalDepth: point.normalDepth
          };
          
          return result;
        });
        
        // Update channel parameters with critical and normal depths
        if (flowProfile.length > 0) {
          const firstPoint = flowProfile[0];
          state.channelParams.criticalDepth = firstPoint.criticalDepth;
          state.channelParams.normalDepth = firstPoint.normalDepth;
        }
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
  calculationSuccess,
  calculationFailure,
  resetCalculator,
  setSelectedResultIndex,
  resetResults,
  setWaterSurfaceResults,
} = calculatorSlice.actions;

// Export reducer
export default calculatorSlice.reducer;