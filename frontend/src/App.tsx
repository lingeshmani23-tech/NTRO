import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { UploadPage } from './pages/UploadPage';
import { ProgressPage } from './pages/ProgressPage';
import { OverviewPage } from './pages/OverviewPage';
import { SessionsPage } from './pages/SessionsPage';
import { FindingsPage } from './pages/FindingsPage';
import { AIPage } from './pages/AIPage';
import { ReportsPage } from './pages/ReportsPage';

export const App: React.FC = () => {
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  const handleReset = () => {
    setActiveAnalysisId(null);
  };

  return (
    <BrowserRouter>
      <AppLayout analysisId={activeAnalysisId} onReset={handleReset}>
        <Routes>
          <Route
            path="/"
            element={<UploadPage onAnalysisStarted={(id) => setActiveAnalysisId(id)} />}
          />
          <Route path="/progress/:id" element={<ProgressPage />} />
          <Route path="/overview/:id" element={<OverviewPage />} />
          <Route path="/sessions/:id" element={<SessionsPage />} />
          <Route path="/findings/:id" element={<FindingsPage />} />
          <Route path="/ai/:id" element={<AIPage />} />
          <Route path="/reports/:id" element={<ReportsPage />} />

          {/* Direct route fallbacks */}
          <Route path="/analysis/:id/*" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default App;

