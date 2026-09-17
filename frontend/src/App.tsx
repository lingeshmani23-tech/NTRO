import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate, useLocation } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { UploadPage } from './pages/UploadPage';
import { ProgressPage } from './pages/ProgressPage';
import { OverviewPage } from './pages/OverviewPage';
import { SessionsPage } from './pages/SessionsPage';
import { FindingsPage } from './pages/FindingsPage';
import { AIPage } from './pages/AIPage';
import { ReportsPage } from './pages/ReportsPage';
import { fetchAnalysisResult } from './services/api';
import type { AnalysisResult } from './types/api';
import { Loader2, AlertCircle } from 'lucide-react';

const AnalysisWrapper: React.FC<{ children: (analysis: AnalysisResult) => React.ReactNode }> = ({
  children,
}) => {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchAnalysisResult(id)
      .then((data) => {
        setAnalysis(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load analysis result');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-sm font-mono text-slate-400">Loading analysis data...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-6 text-center font-mono space-y-3">
          <AlertCircle className="w-8 h-8 text-critical mx-auto" />
          <h3 className="text-base font-bold text-critical">Analysis Load Error</h3>
          <p className="text-xs text-slate-300">{error || 'Analysis result not found'}</p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-line"
          >
            Back to Upload
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopNav analysis={analysis} />
      <main className="pb-12">{children(analysis)}</main>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-ink text-slate-100 font-sans antialiased">
        <Routes>
          {/* Home / Upload */}
          <Route
            path="/"
            element={
              <>
                <TopNav />
                <main className="pb-12">
                  <UploadPage />
                </main>
              </>
            }
          />

          {/* Progress */}
          <Route
            path="/analysis/:id/progress"
            element={
              <>
                <TopNav />
                <main className="pb-12">
                  <ProgressPage />
                </main>
              </>
            }
          />

          {/* Analysis Detail Routes */}
          <Route
            path="/analysis/:id/overview"
            element={
              <AnalysisWrapper>
                {(analysis) => <OverviewPage analysis={analysis} />}
              </AnalysisWrapper>
            }
          />

          <Route
            path="/analysis/:id/sessions"
            element={
              <AnalysisWrapper>
                {(analysis) => (
                  <SessionsPage sessions={analysis.sessions} findings={analysis.findings} />
                )}
              </AnalysisWrapper>
            }
          />

          <Route
            path="/analysis/:id/findings"
            element={
              <AnalysisWrapper>
                {(analysis) => (
                  <FindingsPage findings={analysis.findings} analysisId={analysis.analysis_id} />
                )}
              </AnalysisWrapper>
            }
          />

          <Route
            path="/analysis/:id/ai"
            element={
              <AnalysisWrapper>
                {(analysis) => <AIPage ai={analysis.ai} score={analysis.score} />}
              </AnalysisWrapper>
            }
          />

          <Route
            path="/analysis/:id/reports"
            element={
              <AnalysisWrapper>
                {(analysis) => <ReportsPage analysis={analysis} />}
              </AnalysisWrapper>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
