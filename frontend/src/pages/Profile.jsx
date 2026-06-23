import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, ShieldCheck, UserCircle } from "lucide-react";
import { toast } from "sonner";

const inputCls =
  "mt-2 rounded-none bg-black border-zinc-800 text-white h-10 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-0 focus-visible:border-yellow-400";

export default function ProfilePage() {
  const { user } = useAuth();
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [nw2, setNw2] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (nw !== nw2) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/change-password", { current_password: cur, new_password: nw });
      toast.success("Contraseña actualizada correctamente");
      setCur("");
      setNw("");
      setNw2("");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400 mb-3">
        Cuenta
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight text-white">
        Mi Perfil
      </h1>
      <p className="text-sm text-zinc-500 mt-1">
        Gestiona tu sesión y cambia tu contraseña.
      </p>

      <section className="mt-8 border border-zinc-900 bg-zinc-950">
        <div className="px-5 py-4 border-b border-zinc-900 bg-black flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-yellow-400" />
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
            Datos de la cuenta
          </h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Info label="Email" value={user?.email} />
          <Info label="Nombre" value={user?.name || "—"} />
          <Info
            label="Rol"
            value={
              <span className="inline-flex items-center gap-1.5">
                {user?.role === "admin" && <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />}
                <span className="capitalize">{user?.role}</span>
              </span>
            }
          />
        </div>
      </section>

      <form onSubmit={onSubmit} className="mt-6 border border-zinc-900 bg-zinc-950" data-testid="profile-change-password-form">
        <div className="px-5 py-4 border-b border-zinc-900 bg-black flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-yellow-400" />
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
            Cambiar contraseña
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Contraseña actual
            </Label>
            <Input
              type="password"
              required
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              className={inputCls}
              data-testid="profile-current-password"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Nueva contraseña
              </Label>
              <Input
                type="password"
                required
                minLength={6}
                value={nw}
                onChange={(e) => setNw(e.target.value)}
                className={inputCls}
                data-testid="profile-new-password"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Repetir nueva contraseña
              </Label>
              <Input
                type="password"
                required
                minLength={6}
                value={nw2}
                onChange={(e) => setNw2(e.target.value)}
                className={inputCls}
                data-testid="profile-new-password-2"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="rounded-none bg-yellow-400 hover:bg-yellow-300 text-black uppercase tracking-[0.2em] text-xs font-bold h-11 px-8"
            data-testid="profile-submit"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Actualizar contraseña"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">{label}</div>
      <div className="text-sm text-white font-mono break-all">{value || "—"}</div>
    </div>
  );
}
