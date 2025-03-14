import { configureStore } from '@reduxjs/toolkit';
import calculatorReducer from './slice/calculatorSlice';

export const store = configureStore({
  reducer: {
    calculator: calculatorReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;