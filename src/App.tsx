import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import WelcomeGate from "@/components/WelcomeGate";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Analiza from "./pages/Analiza";
import Profil from "./pages/Profil";
import Categories from "./pages/Categories";
import ScanReceipt from "./pages/ScanReceipt";
import ExpenseEntry from "./pages/ExpenseEntry";
import IncomeEntry from "./pages/IncomeEntry";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
        <Sonner position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            element={
              <WelcomeGate>
                <AppLayout />
              </WelcomeGate>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/analiza" element={<Analiza />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/profil/kategorije" element={<Categories />} />
            <Route path="/scan" element={<ScanReceipt />} />
            <Route path="/expense" element={<ExpenseEntry />} />
            <Route path="/income" element={<IncomeEntry />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
