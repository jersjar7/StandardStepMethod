import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define types for our state
export interface ChannelParameters {
  bottomWidth: number;
  sideSlope: number;
  manningN: number;
  channelSlope: number;
  discharge: number;
  length: number;
  upstreamDepth?: number;
  downstreamDepth?: number;
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