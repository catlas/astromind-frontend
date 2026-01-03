import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import BuyCoins from './pages/BuyCoins';
import GenerateReport from './pages/GenerateReport';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/buy-coins" element={<BuyCoins />} />
        <Route path="/generate-report" element={<GenerateReport />} />
        {/* Тук по-късно ще добавим другите страници */}
      </Routes>
    </Router>
  );
}

export default App;
