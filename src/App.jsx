import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AddPage from './pages/AddPage';
import HistoryPage from './pages/HistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import BottomNav from './components/BottomNav';
import AIAdvisorWidget from './components/AIAdvisorWidget';
import { Toaster } from './components/ui/Toast';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/add" element={<AddPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
        <BottomNav />
        <AIAdvisorWidget />
        <Toaster />
      </div>
    </Router>
  );
}

export default App;