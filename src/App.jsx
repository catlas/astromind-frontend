import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import BuyCoins from './pages/BuyCoins';
import GenerateReport from './pages/GenerateReport';
import Profiles from './pages/Profiles';
import History from './pages/History';
import Settings from './pages/Settings';
import { ResetPassword, VerifyEmail } from './pages/AuthLinkPages';
import Admin from './pages/Admin';
import Welcome from './pages/Welcome';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/buy-coins" element={<BuyCoins />} />
        <Route path="/generate-report" element={<GenerateReport />} />
        <Route path="/profiles" element={<Profiles />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/welcome" element={<Welcome />} />
      </Routes>
    </Router>
  );
}

export default App;
