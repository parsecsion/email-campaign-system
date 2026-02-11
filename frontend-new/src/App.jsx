import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import api from './utils/api';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import SenderView from './components/SenderView';
import Scheduler from './components/Scheduler';
import AgentPage from './pages/AgentPage';

import Settings from './components/Settings';
import CandidateManager from './components/CandidateManager';
import { AgentProvider } from './context/AgentContext';
import { CampaignProvider } from './context/CampaignContext';
import { AgentOverlay } from './components/agent/AgentOverlay';
import Loader from './components/ui/Loader';

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Auth & Config
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Global Data (Still kept here as it might be shared or loaded initially)
  const [companyEmails, setCompanyEmails] = useState([
    'career@example.com',
    'onboarding@example.com',
    'hr@example.com'
  ]);
  const [senderEmail, setSenderEmail] = useState('career@example.com');

  // Scheduler State (Kept in App or could be moved to SchedulerContext later)
  const [schedulerInterviews, setSchedulerInterviews] = useState([]);
  const [calendarView, setCalendarView] = useState({});
  const [scheduleSummary, setScheduleSummary] = useState({});

  // --- Initialization & Auth ---
  useEffect(() => {
    checkAuthStatus();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/api/settings');
      const s = res.data.settings;
      if (s) {
        // Prefer authorized_senders (objects) -> map to emails
        // Check for EXISTENCE of the key (even if empty array) to avoid fallback
        if (s.authorized_senders && Array.isArray(s.authorized_senders)) {
          const emails = s.authorized_senders.map(sender => sender.email);
          setCompanyEmails(emails);

          if (emails.length > 0) {
            // If current sender not in list, default to first
            setSenderEmail(prev => emails.includes(prev) ? prev : emails[0]);
          } else {
            setSenderEmail('');
          }
        }
        // Fallback to legacy company_emails ONLY if authorized_senders is MISSING/undefined
        else if (s.company_emails && Array.isArray(s.company_emails) && s.company_emails.length > 0) {
          setCompanyEmails(s.company_emails);
          setSenderEmail(prev => s.company_emails.includes(prev) ? prev : s.company_emails[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
      toast.error("Failed to load settings");
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/api/auth-status');
      setAuthenticated(response.data.authenticated);
      if (response.data.authenticated) {
        // loadInitialData(); // Templates now loaded in CampaignContext
      } else if (location.pathname !== '/login') {
        navigate('/login');
      }
    } catch {
      console.error('Auth check failed');
      setAuthenticated(false);
      if (location.pathname !== '/login') navigate('/login');
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLoginSuccess = () => {
    setAuthenticated(true);
    navigate('/');
  };

  const logout = async () => {
    try {
      localStorage.removeItem('access_token');
      setAuthenticated(false);
      navigate('/login');
    } catch {
      setAuthenticated(false);
      navigate('/login');
    }
  };

  const loadScheduleData = useCallback(async (start, end) => {
    try {
      let startDateStr, endDateStr;

      if (start && end) {
        startDateStr = start.toISOString().split('T')[0];
        endDateStr = end.toISOString().split('T')[0];
      } else {
        const s = new Date();
        s.setDate(s.getDate() - 60);
        startDateStr = s.toISOString().split('T')[0];

        const e = new Date();
        e.setDate(e.getDate() + 90);
        endDateStr = e.toISOString().split('T')[0];
      }

      const q = `?start_date=${startDateStr}&end_date=${endDateStr}`;
      const calRes = await api.get(`/api/schedule/calendar${q}`);
      setCalendarView(calRes.data.calendar || {});

      const sumRes = await api.get(`/api/schedule/summary${q}`);
      setScheduleSummary(sumRes.data.summary || {});

      const intRes = await api.get(`/api/interviews${q}`);
      setSchedulerInterviews(intRes.data.interviews || []);

    } catch (error) {
      console.error("FAILED to load schedule:", error);
      toast.error("Failed to load schedule data");
    }
  }, []);

  // --- Routing ---
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader />
      </div>
    );
  }

  const getCurrentPage = () => {
    if (location.pathname === '/') return 'sender';
    if (location.pathname === '/scheduler') return 'scheduler';
    if (location.pathname === '/candidates') return 'candidates';
    if (location.pathname === '/us-candidates') return 'us-candidates';
    if (location.pathname === '/uk-candidates') return 'uk-candidates';
    if (location.pathname === '/agent') return 'agent';
    if (location.pathname === '/settings') return 'settings';
    return 'sender';
  };

  if (!authenticated) {
    return <Routes><Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} /></Routes>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      <Toaster position="top-right" richColors />

      <div className="fixed inset-y-0 left-0 z-50 w-14 bg-black text-white transform transition-transform duration-300 ease-in-out">
        <Sidebar
          currentPage={getCurrentPage()}
          setCurrentPage={(page) => {
            const map = {
              'sender': '/',
              'scheduler': '/scheduler',
              'candidates': '/candidates',
              'settings': '/settings',
              'agent': '/agent'
            };
            navigate(map[page]);
          }}
          logout={logout}
        />
      </div>

      <main className="flex-1 ml-14 p-8 transition-all duration-300">
        <Routes>
          <Route path="/" element={
            <CampaignProvider
              companyEmails={companyEmails}
              senderEmail={senderEmail}
              setSenderEmail={setSenderEmail}
            >
              <SenderView />
            </CampaignProvider>
          } />

          <Route path="/scheduler" element={
            <Scheduler
              interviews={schedulerInterviews}
              setInterviews={setSchedulerInterviews}
              calendarView={calendarView}
              setCalendarView={setCalendarView}
              summary={scheduleSummary}
              loadScheduleData={loadScheduleData}
            />
          } />

          <Route path="/candidates" element={
            <div className="max-w-[1600px] mx-auto">
              <CandidateManager />
            </div>
          } />

          <Route path="/us-candidates" element={<Navigate to="/candidates" />} />
          <Route path="/uk-candidates" element={<Navigate to="/candidates" />} />

          <Route path="/agent" element={<AgentPage />} />

          <Route path="/settings" element={
            <Settings
              companyEmails={companyEmails}
              setCompanyEmails={setCompanyEmails}
              senderEmail={senderEmail}
              setSenderEmail={setSenderEmail}
            />
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Global Agent Chat Overlay */}
      <AgentOverlay />
    </div>
  );
};

const App = () => (
  <Router>
    <AgentProvider>
      <AppContent />
    </AgentProvider>
  </Router>
);

export default App;
