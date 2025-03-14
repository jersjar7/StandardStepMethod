import { configureStore } from '@reduxjs/toolkit';
import calculatorReducer from '../features/calculator/stores/calculatorSlice';

export const store = configureStore({
  reducer: {
    calculator: calculatorReducer,
    // Add other feature reducers here as needed
  },
});

// Define RootState type for use with useSelector
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;