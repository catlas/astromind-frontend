import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Balance from './pages/Balance';
import GenerateReport from './pages/GenerateReport';
import Profiles from './pages/Profiles';
import History from './pages/History';
import Settings from './pages/Settings';
import { ResetPassword, VerifyEmail } from './pages/AuthLinkPages';
import Admin from './pages/Admin';
import Welcome from './pages/Welcome';
import Legal from './pages/Legal';

// Старият адрес /buy-coins (линкове, запазени страници, връщане от плащане) води към новата страница, с параметрите
const BuyCoinsRedirect = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/balance', search }} replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/balance" element={<Balance />} />
        <Route path="/buy-coins" element={<BuyCoinsRedirect />} />
        <Route path="/generate-report" element={<GenerateReport />} />
        <Route path="/profiles" element={<Profiles />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/legal/:doc" element={<Legal />} />
      </Routes>
    </Router>
  );
}

export default App;
