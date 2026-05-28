import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import RequestsInbox from "./pages/RequestsInbox";
import RequestSummary from "./pages/RequestSummary";
import RequestDetail from "./pages/RequestDetail";
import EvidencePack from "./pages/EvidencePack";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import LoginPage from "./pages/LoginPage";
import BrokerPortal from "./pages/BrokerPortal";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { CommandPalette } from "./components/CommandPalette";

// AI Ops Studio Pages
import AIStudioLayout from "./pages/studio/AIStudioLayout";
import StudioOverview from "./pages/studio/StudioOverview";
import SetupWizard from "./pages/studio/SetupWizard";
import WorkflowBuilder from "./pages/studio/WorkflowBuilder";
import DocumentCatalog from "./pages/studio/DocumentCatalog";
import ChecklistBuilder from "./pages/studio/ChecklistBuilder";
import EmailTemplates from "./pages/studio/EmailTemplates";
import StudioIntegrations from "./pages/studio/StudioIntegrations";
import StudioInboundEmail from "./pages/studio/StudioInboundEmail";
import StudioInboundJobs from "./pages/studio/StudioInboundJobs";
import StudioSettings from "./pages/studio/StudioSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CommandPalette />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal/:token" element={<BrokerPortal />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/requests" element={<RequestsInbox />} />
            <Route path="/request/:requestId" element={<RequestSummary />} />
            <Route path="/request/:requestId/workbench" element={<RequestDetail />} />
            <Route path="/request/:requestId/evidence-pack" element={<EvidencePack />} />
            <Route path="/evidence-pack" element={<Navigate to="/requests" replace />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />

            {/* AI Ops Studio */}
            <Route path="/studio" element={<AIStudioLayout />}>
              {/* New primary nav */}
              <Route index element={<StudioOverview />} />
              <Route path="workflows" element={<WorkflowBuilder />} />
              <Route path="documents" element={<DocumentCatalog />} />
              <Route path="checks" element={<ChecklistBuilder />} />
              <Route path="integrations" element={<StudioIntegrations />} />
              <Route path="inbound" element={<StudioInboundEmail />} />
              <Route path="jobs" element={<StudioInboundJobs />} />
              <Route path="messages" element={<EmailTemplates />} />
              <Route path="settings" element={<StudioSettings />} />

              {/* Wizard kept as a deep-link target (used from Overview) */}
              <Route path="setup" element={<SetupWizard />} />

              {/* Legacy path redirects — keep bookmarks alive */}
              <Route path="workflow" element={<Navigate to="/studio/workflows" replace />} />
              <Route path="library" element={<Navigate to="/studio/documents" replace />} />
              <Route path="catalog" element={<Navigate to="/studio/documents" replace />} />
              <Route path="extraction" element={<Navigate to="/studio/documents" replace />} />
              <Route path="ai-instructions" element={<Navigate to="/studio/documents" replace />} />
              <Route path="cv-rules" element={<Navigate to="/studio/documents" replace />} />
              <Route path="checklists" element={<Navigate to="/studio/checks" replace />} />
              <Route path="emails" element={<Navigate to="/studio/messages" replace />} />
              <Route path="templates" element={<Navigate to="/studio/messages" replace />} />
            </Route>

            {/* Legacy route redirect */}
            <Route path="/case" element={<Navigate to="/requests" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
