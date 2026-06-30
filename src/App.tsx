import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
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

// Configuration (was "AI Studio") — code-split so day-to-day underwriters
// never download the admin bundle. These load on demand behind the role gate.
const AIStudioLayout = lazy(() => import("./pages/studio/AIStudioLayout"));
const StudioOverview = lazy(() => import("./pages/studio/StudioOverview"));
const SetupWizard = lazy(() => import("./pages/studio/SetupWizard"));
const WorkflowBuilder = lazy(() => import("./pages/studio/WorkflowBuilder"));
const DocumentCatalog = lazy(() => import("./pages/studio/DocumentCatalog"));
const ChecklistBuilder = lazy(() => import("./pages/studio/ChecklistBuilder"));
const CensusRulebooks = lazy(() => import("./pages/studio/CensusRulebooks"));
const EmailTemplates = lazy(() => import("./pages/studio/EmailTemplates"));
const StudioIntegrations = lazy(() => import("./pages/studio/StudioIntegrations"));
const StudioInboundEmail = lazy(() => import("./pages/studio/StudioInboundEmail"));
const StudioInboundJobs = lazy(() => import("./pages/studio/StudioInboundJobs"));
const StudioSettings = lazy(() => import("./pages/studio/StudioSettings"));

// Public marketing/landing page — lazy so its WebGL (three.js) + framer-motion
// payload never lands in the operational app bundle.
const HomePage = lazy(() => import("./pages/HomePage"));

function RouteSpinner() {
    return (
        <div className="flex-1 min-h-0 flex items-center justify-center py-24 text-muted-foreground" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            <span className="sr-only">Loading…</span>
        </div>
    );
}

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
          {/* Public marketing/landing page — manually navigable, NOT the default. */}
          <Route path="/home-page" element={<Suspense fallback={<RouteSpinner />}><HomePage /></Suspense>} />

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

            {/* Configuration (Studio) — admin/operator only, lazy-loaded */}
            <Route
              path="/studio"
              element={
                <ProtectedRoute requiredRole={['admin', 'operator']}>
                  <Suspense fallback={<RouteSpinner />}>
                    <AIStudioLayout />
                  </Suspense>
                </ProtectedRoute>
              }
            >
              {/* New primary nav */}
              <Route index element={<StudioOverview />} />
              <Route path="workflows" element={<WorkflowBuilder />} />
              <Route path="documents" element={<DocumentCatalog />} />
              <Route path="checks" element={<ChecklistBuilder />} />
              <Route path="census-rulebooks" element={<CensusRulebooks />} />
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
