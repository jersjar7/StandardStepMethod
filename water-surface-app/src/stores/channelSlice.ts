import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChannelParams, ChannelType, CalculationResults } from '../types';

interface ChannelState {
  params: ChannelParams;
  results: CalculationResults | null;
  calculating: boolean;
  error: string | null;
}

const initialState: ChannelState = {
  params: {
    type: ChannelType.RECTANGULAR,
    bottomWidth: 10,
    roughness: 0.013,
    slope: 0.001,
    discharge: 100,
    length: 1000,
    units: 'metric'
  },
  results: null,
  calculating: false,
  error: null
};

export const channelSlice = createSlice({
  name: 'channel',
  initialState,
  reducers: {
    updateParams: (state, action: PayloadAction<Partial<ChannelParams>>) => {
      state.params = { ...state.params, ...action.payload };
      // Clear previous results when parameters change
      state.results = null;
      state.error = null;
    },
    setChannelType: (state, action: PayloadAction<ChannelType>) => {
      state.params.type = action.payload;
      
      // Reset properties not applicable to the new channel type
      if (action.payload === ChannelType.CIRCULAR) {
        state.params.bottomWidth = undefined;
        state.params.sideSlope = undefined;
        if (!state.params.diameter) state.params.diameter = 2; // Default value
      }
      else if (action.payload === ChannelType.TRIANGULAR) {
        state.params.bottomWidth = undefined;
        state.params.diameter = undefined;
        if (!state.params.sideSlope) state.params.sideSlope = 1; // Default value
      }
      else if (action.payload === ChannelType.RECTANGULAR) {
        state.params.sideSlope = undefined;
        state.params.diameter = undefined;
        if (!state.params.bottomWidth) state.params.bottomWidth = 10; // Default value
      }
      else if (action.payload === ChannelType.TRAPEZOIDAL) {
        state.params.diameter = undefined;
        if (!state.params.bottomWidth) state.params.bottomWidth = 10; // Default value
        if (!state.params.sideSlope) state.params.sideSlope = 1; // Default value
      }
      
      // Clear previous results when channel type changes
      state.results = null;
      state.error = null;
    },
    setCalculating: (state, action: PayloadAction<boolean>) => {
      state.calculating = action.payload;
    },
    setResults: (state, action: PayloadAction<CalculationResults>) => {
      state.results = action.payload;
      state.calculating = false;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.calculating = false;
    },
    resetResults: (state) => {
      state.results = null;
      state.error = null;
    }
  }
});

export const { 
  updateParams, 
  setChannelType, 
  setCalculating, 
  setResults, 
  setError,
  resetResults
} = channelSlice.actions;

export default channelSlice.reducer;