import { Provider } from 'react-redux';
import { store } from './stores';
import MainLayout from './layouts/MainLayout';
import Calculator from './features/calculator/Calculator';
import './App.css';

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