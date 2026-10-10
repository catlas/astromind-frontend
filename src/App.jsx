import { Suspense, lazy } from 'react';
import Home from './pages/Home';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Първата страница се зарежда веднага, останалите екрани по заявка: по-малък първи пакет, по-бърз старт на телефон
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Balance = lazy(() => import('./pages/Balance'));
const GenerateReport = lazy(() => import('./pages/GenerateReport'));
const Profiles = lazy(() => import('./pages/Profiles'));
const History = lazy(() => import('./pages/History'));
const Settings = lazy(() => import('./pages/Settings'));
const ResetPassword = lazy(() => import('./pages/AuthLinkPages').then((m) => ({ default: m.ResetPassword })));
const VerifyEmail = lazy(() => import('./pages/AuthLinkPages').then((m) => ({ default: m.VerifyEmail })));
const Admin = lazy(() => import('./pages/Admin'));
const Welcome = lazy(() => import('./pages/Welcome'));
const Legal = lazy(() => import('./pages/Legal'));

// Старият адрес /buy-coins (линкове, запазени страници, връщане от плащане) води към новата страница, с параметрите
const BuyCoinsRedirect = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/balance', search }} replace />;
};

function App() {
  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen bg-[#0B0616] flex items-center justify-center text-slate-400 text-sm">Зареждане…</div>}>
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
      </Suspense>
    </Router>
  );
}

export default App;
