import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RequestsInbox from "./pages/RequestsInbox";
import RequestDetail from "./pages/RequestDetail";
import EvidencePack from "./pages/EvidencePack";
import NotFound from "./pages/NotFound";

// AI Ops Studio Pages
import AIStudioLayout from "./pages/studio/AIStudioLayout";
import SetupWizard from "./pages/studio/SetupWizard";
import DocumentLibrary from "./pages/studio/DocumentLibrary";
import TemplatesMessages from "./pages/studio/TemplatesMessages";
import WorkflowBuilder from "./pages/studio/WorkflowBuilder";
import DocumentCatalog from "./pages/studio/DocumentCatalog";
import ExtractionSchema from "./pages/studio/ExtractionSchema";
import AIInstructions from "./pages/studio/AIInstructions";
import ChecklistBuilder from "./pages/studio/ChecklistBuilder";
import EmailTemplates from "./pages/studio/EmailTemplates";
import StudioSettings from "./pages/studio/StudioSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Default landing: Requests Inbox */}
          <Route path="/" element={<Navigate to="/requests" replace />} />
          <Route path="/requests" element={<RequestsInbox />} />
          <Route path="/request/:requestId" element={<RequestDetail />} />
          <Route path="/evidence-pack" element={<EvidencePack />} />
          
          {/* AI Ops Studio - Admin Only */}
          <Route path="/studio" element={<AIStudioLayout />}>
            {/* Simple Mode (default) */}
            <Route index element={<Navigate to="/studio/setup" replace />} />
            <Route path="setup" element={<SetupWizard />} />
            <Route path="library" element={<DocumentLibrary />} />
            <Route path="templates" element={<TemplatesMessages />} />
            
            {/* Advanced Mode (legacy modules preserved) */}
            <Route path="workflow" element={<WorkflowBuilder />} />
            <Route path="documents" element={<DocumentCatalog />} />
            <Route path="extraction" element={<ExtractionSchema />} />
            <Route path="ai-instructions" element={<AIInstructions />} />
            <Route path="checklists" element={<ChecklistBuilder />} />
            <Route path="emails" element={<EmailTemplates />} />
            
            {/* Shared */}
            <Route path="settings" element={<StudioSettings />} />
          </Route>
          
          {/* Legacy route redirect */}
          <Route path="/case" element={<Navigate to="/requests" replace />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
