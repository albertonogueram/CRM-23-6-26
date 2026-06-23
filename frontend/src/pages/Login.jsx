import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { LOGO_URL, APP_NAME } from "@/lib/branding";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await login(email.trim().toLowerCase(), password);
    if (!res.ok) setError(res.error);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full bg-black text-zinc-100 flex items-center justify-center px-6 py-10 relative overflow-hidden">
      {/* subtle background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(250,204,21,0.06),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(250,204,21,0.04),transparent_50%)]" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-10">
          <img
            src={LOGO_URL}
            alt="Fabián Arenas"
            className="h-24 md:h-28 object-contain"
            data-testid="login-logo"
          />
        </div>

        <div className="text-center mb-8">
          <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400 mb-2">
            Acceso restringido
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-black tracking-tight text-white" data-testid="app-name-login">
            {APP_NAME}
          </h1>
          <p className="text-sm text-zinc-500 mt-3">
            Plataforma de fidelización privada del taller.
          </p>
        </div>

        <div className="border border-zinc-900 bg-zinc-950/60 backdrop-blur-sm p-7 md:p-8">
          <form onSubmit={onSubmit} className="space-y-5" data-testid="login-form">
            <div>
              <Label
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400"
                htmlFor="email"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@fabianarenas.es"
                required
                className="mt-2 rounded-none bg-black border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-0 focus-visible:border-yellow-400 h-11"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400"
                htmlFor="password"
              >
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 rounded-none bg-black border-zinc-800 text-white focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-0 focus-visible:border-yellow-400 h-11"
                data-testid="login-password-input"
              />
            </div>

            {error && (
              <div
                className="text-sm text-red-400 bg-red-950/40 border border-red-900 px-3 py-2"
                data-testid="login-error"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-none bg-yellow-400 hover:bg-yellow-300 text-black font-bold uppercase tracking-[0.2em] text-xs"
              data-testid="login-submit-button"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6 text-[10px] uppercase tracking-[0.3em] text-zinc-700 font-mono">
          v1.1 · fidelity engine
        </div>
      </div>
    </div>
  );
}
