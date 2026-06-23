import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import LoginPage from "@/pages/Login";
import DashboardLayout from "@/components/DashboardLayout";
import NewClientPage from "@/pages/NewClient";
import AllClientsPage from "@/pages/AllClients";
import FidelizacionPage from "@/pages/Fidelizacion";
import UsersAdminPage from "@/pages/UsersAdmin";
import ProfilePage from "@/pages/Profile";
import MailingPage from "@/pages/Mailing";
import { Toaster } from "@/components/ui/sonner";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">Cargando...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <Protected>
            <DashboardLayout />
          </Protected>
        }
      >
        <Route path="/" element={<Navigate to="/nuevos-clientes" replace />} />
        <Route path="/nuevos-clientes" element={<NewClientPage />} />
        <Route path="/todos-clientes" element={<AllClientsPage />} />
        <Route path="/fidelizacion" element={<FidelizacionPage />} />
        <Route path="/usuarios" element={<UsersAdminPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/mailing" element={<MailingPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster theme="dark" richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
