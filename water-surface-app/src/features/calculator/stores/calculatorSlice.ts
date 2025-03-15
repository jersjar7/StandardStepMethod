import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define types for our state
export interface ChannelParams {
  channelType: 'rectangular' | 'trapezoidal' | 'triangular' | 'circular';
  bottomWidth: number;        // For rectangular and trapezoidal
  sideSlope?: number;         // For trapezoidal and triangular
  diameter?: number;          // For circular
  manningN: number;           // Manning's roughness coefficient
  channelSlope: number;       // Channel bed slope
  discharge: number;          // Flow rate
  length: number;             // Channel length
  upstreamDepth?: number;     // Optional boundary condition
  downstreamDepth?: number;   // Optional boundary condition
  criticalDepth?: number;
  normalDepth?: number;
  units?: 'metric' | 'imperial'; // Unit system
}

export interface CalculationResult {
  station: number;
  depth: number;
  velocity: number;
  area: number;
  topWidth: number;
  wetPerimeter: number;
  hydraulicRadius: number;
  energy: number;
  froudeNumber: number;
  criticalDepth?: number;
  normalDepth?: number;
}

export interface HydraulicJump {
  occurs: boolean;
  station?: number;
  upstreamDepth?: number;
  downstreamDepth?: number;
}

interface CalculatorState {
  channelParams: ChannelParams;
  results: CalculationResult[];
  hydraulicJump?: HydraulicJump;
  isCalculating: boolean;
  error: string | null;
}

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

export const calculatorSlice = createSlice({
  name: 'calculator',
  initialState,
  reducers: {
    setChannelType: (state, action: PayloadAction<'rectangular' | 'trapezoidal' | 'triangular' | 'circular'>) => {
      // Update channel parameters based on type
      switch (action.payload) {
        case 'rectangular':
          state.channelParams = {
            ...state.channelParams,
            channelType: action.payload,
            bottomWidth: state.channelParams.bottomWidth || 10,
            sideSlope: undefined,
            diameter: undefined
          };
          break;
        case 'trapezoidal':
          state.channelParams = {
            ...state.channelParams,
            channelType: action.payload,
            bottomWidth: state.channelParams.bottomWidth || 10,
            sideSlope: state.channelParams.sideSlope || 2,
            diameter: undefined
          };
          break;
        case 'triangular':
          state.channelParams = {
            ...state.channelParams,
            channelType: action.payload,
            bottomWidth: 0,
            sideSlope: state.channelParams.sideSlope || 1,
            diameter: undefined
          };
          break;
        case 'circular':
          state.channelParams = {
            ...state.channelParams,
            channelType: action.payload,
            bottomWidth: 0,
            sideSlope: undefined,
            diameter: state.channelParams.diameter || 1.0
          };
          break;
      }
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
    }
  }
});

export const {
  setChannelType,
  updateChannelParams,
  startCalculation,
  calculationSuccess,
  calculationFailure,
  resetCalculator
} = calculatorSlice.actions;

export default calculatorSlice.reducer;