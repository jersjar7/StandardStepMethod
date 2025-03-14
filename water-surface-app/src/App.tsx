import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MainLayout from './layouts/MainLayout';
import Calculator from './features/calculator/Calculator';
import calculatorReducer from './features/calculator/store/calculatorSlice';
import './App.css';

// Create root store that combines feature stores
const store = configureStore({
  reducer: {
    calculator: calculatorReducer,
    // Add other feature reducers here as needed
  },
});

// Define RootState type for use with useSelector
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

function App() {
  return (
    <Provider store={store}>
      <MainLayout>
        <Calculator />
      </MainLayout>
    </Provider>
  );
}

export default App;