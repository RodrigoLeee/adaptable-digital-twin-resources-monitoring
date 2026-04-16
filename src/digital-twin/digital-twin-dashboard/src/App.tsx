import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { useSSE } from './hooks/useSSE';

import ExecutiveBoard from './pages/ExecutiveBoard';
import AdminFinBoard from './pages/AdminFinBoard';
import OperationBoard from './pages/OperationBoard';
import CybersecBoard from './pages/CybersecBoard';
import ChangeAnalysisBoard from './pages/ChangeAnalysisBoard';
import PredictionBoard from './pages/PredictionBoard';
import ReactionBoard from './pages/ReactionBoard';
import AlertsBoard from './pages/AlertsBoard';
import QoSBoard from './pages/QoSBoard';
import MttrMtbfBoard from './pages/MttrMtbfBoard';
import IncidentsMap from './pages/IncidentsMap';
import SendRecommendation from './pages/SendRecommendation';

const COLLECTOR_URL = import.meta.env.VITE_COLLECTOR_URL ?? 'http://localhost:3001';

function AppInner() {
  useSSE(`${COLLECTOR_URL}/events`);

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<ExecutiveBoard />} />
            <Route path="/admin-fin" element={<AdminFinBoard />} />
            <Route path="/operation" element={<OperationBoard />} />
            <Route path="/cybersec" element={<CybersecBoard />} />
            <Route path="/change-analysis" element={<ChangeAnalysisBoard />} />
            <Route path="/prediction" element={<PredictionBoard />} />
            <Route path="/reaction" element={<ReactionBoard />} />
            <Route path="/alerts" element={<AlertsBoard />} />
            <Route path="/qos" element={<QoSBoard />} />
            <Route path="/mttr-mtbf" element={<MttrMtbfBoard />} />
            <Route path="/incidents" element={<IncidentsMap />} />
            <Route path="/send" element={<SendRecommendation />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
