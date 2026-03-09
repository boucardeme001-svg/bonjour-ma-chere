import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthPage from "./pages/AuthPage";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import PlanComptable from "./pages/PlanComptable";
import Journaux from "./pages/Journaux";
import SaisieEcritures from "./pages/SaisieEcritures";
import GrandLivre from "./pages/GrandLivre";
import Balance from "./pages/Balance";
import Exercices from "./pages/Exercices";
import Bilan from "./pages/Bilan";
import CompteResultat from "./pages/CompteResultat";
import Tafire from "./pages/Tafire";
import Employes from "./pages/Employes";
import BulletinsPaie from "./pages/BulletinsPaie";
import EtatsPaie from "./pages/EtatsPaie";
import MonProfil from "./pages/MonProfil";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="text-muted-foreground">Chargement...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="text-muted-foreground">Chargement...</div></div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="plan-comptable" element={<PlanComptable />} />
              <Route path="journaux" element={<Journaux />} />
              <Route path="ecritures" element={<SaisieEcritures />} />
              <Route path="grand-livre" element={<GrandLivre />} />
              <Route path="balance" element={<Balance />} />
              <Route path="exercices" element={<Exercices />} />
              <Route path="bilan" element={<Bilan />} />
              <Route path="compte-resultat" element={<CompteResultat />} />
              <Route path="tafire" element={<Tafire />} />
              <Route path="employes" element={<Employes />} />
              <Route path="bulletins-paie" element={<BulletinsPaie />} />
              <Route path="profil" element={<MonProfil />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
