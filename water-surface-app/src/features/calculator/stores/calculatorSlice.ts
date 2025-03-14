import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define types for our state
export interface ChannelParameters {
  channelType: 'rectangular' | 'trapezoidal' | 'triangular' | 'circular';
  bottomWidth: number;
  sideSlope?: number;
  diameter?: number;
  manningN: number;
  channelSlope: number;
  discharge: number;
  length: number;
  upstreamDepth?: number;
  downstreamDepth?: number;
  criticalDepth?: number;
  normalDepth?: number;
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

interface CalculatorState {
  channelType: 'rectangular' | 'trapezoidal' | 'triangular' | 'circular';
  channelParameters: ChannelParameters;
  results: CalculationResult[];
  isCalculating: boolean;
  error: string | null;
}

const initialState: CalculatorState = {
  channelType: 'trapezoidal',
  channelParameters: {
    channelType: 'trapezoidal', // Make sure this matches the state channelType
    bottomWidth: 10,
    sideSlope: 2, // Horizontal:Vertical
    manningN: 0.03,
    channelSlope: 0.001,
    discharge: 100,
    length: 1000
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
      state.channelType = action.payload;
      
      // Update channel parameters based on type
      switch (action.payload) {
        case 'rectangular':
          state.channelParameters = {
            ...state.channelParameters,
            channelType: action.payload, // Update this too
            bottomWidth: state.channelParameters.bottomWidth || 10,
            sideSlope: undefined,
            diameter: undefined
          };
          break;
        case 'trapezoidal':
          state.channelParameters = {
            ...state.channelParameters,
            channelType: action.payload, // Update this too
            bottomWidth: state.channelParameters.bottomWidth || 10,
            sideSlope: state.channelParameters.sideSlope || 2,
            diameter: undefined
          };
          break;
        case 'triangular':
          state.channelParameters = {
            ...state.channelParameters,
            channelType: action.payload, // Update this too
            bottomWidth: 0,
            sideSlope: state.channelParameters.sideSlope || 1,
            diameter: undefined
          };
          break;
        case 'circular':
          state.channelParameters = {
            ...state.channelParameters,
            channelType: action.payload, // Update this too
            bottomWidth: 0,
            sideSlope: undefined,
            diameter: state.channelParameters.diameter || 1.0
          };
          break;
      }
    },
    updateChannelParameters: (state, action: PayloadAction<Partial<ChannelParameters>>) => {
      state.channelParameters = {
        ...state.channelParameters,
        ...action.payload
      };
    },
    startCalculation: (state) => {
      state.isCalculating = true;
      state.error = null;
    },
    calculationSuccess: (state, action: PayloadAction<CalculationResult[]>) => {
      state.results = action.payload;
      state.isCalculating = false;
      
      // Update channel parameters with calculated critical and normal depths
      if (action.payload.length > 0) {
        const firstResult = action.payload[0];
        state.channelParameters.criticalDepth = firstResult.criticalDepth;
        state.channelParameters.normalDepth = firstResult.normalDepth;
      }
    },
    calculationFailure: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isCalculating = false;
    },
    resetCalculator: (state) => {
      state.results = [];
      state.error = null;
    }
  }
});

export const {
  setChannelType,
  updateChannelParameters,
  startCalculation,
  calculationSuccess,
  calculationFailure,
  resetCalculator
} = calculatorSlice.actions;

export default calculatorSlice.reducer;