import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Copy,
  Download,
  Loader2,
  ShieldOff,
  Send,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export default function MailingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState([]);
  const [filter, setFilter] = useState("");

  // Composer state (preview / draft only — sending via Gmail requires OAuth in Phase 5)
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const loadEmails = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/mailing/emails");
      setEmails(data.emails || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;
    loadEmails();
  }, [user, loadEmails]);

  if (user?.role !== "admin") {
    return (
      <div className="p-10 flex flex-col items-center text-center text-zinc-500">
        <ShieldOff className="w-10 h-10 mb-4 text-yellow-400" />
        <h2 className="font-display text-xl font-bold text-white">Acceso restringido</h2>
        <p className="text-sm mt-2">Solo el administrador puede usar Mailing.</p>
      </div>
    );
  }

  const filtered = emails.filter((e) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return e.email.includes(f) || (e.nombre || "").toLowerCase().includes(f);
  });

  const joinedEmails = filtered.map((e) => e.email).join(", ");
  const lineEmails = filtered.map((e) => e.email).join("\n");

  const copy = async (text, msg) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
  };

  const downloadCsv = () => {
    const csv =
      "email,nombre,telefono,fidelizacion_num\n" +
      filtered
        .map((e) =>
          [e.email, e.nombre, e.telefono, e.fidelizacion_num]
            .map((v) => `"${(v || "").replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "emails_clientes_fabian_arenas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openInMail = () => {
    if (!filtered.length) return;
    // mailto: with BCC mass-mailing (opens default mail client)
    const bcc = filtered.map((e) => e.email).join(",");
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    const qs = params.toString();
    const href = `mailto:?bcc=${encodeURIComponent(bcc)}${qs ? "&" + qs : ""}`;
    window.location.href = href;
  };

  return (
    <div className="p-6 md:p-10">
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400 mb-3">
        Admin / Comunicación
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight text-white">
        Mailing
      </h1>
      <p className="text-sm text-zinc-500 mt-1">
        Reúne los emails de tus clientes y prepara campañas. Copia, exporta o lanza una composición masiva (BCC).
      </p>

      {/* Stats + actions */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border border-yellow-400/40 bg-yellow-400/5 p-5">
          <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-yellow-400">
            Emails únicos disponibles
          </div>
          <div className="font-mono text-4xl font-black text-yellow-400 mt-2" data-testid="emails-total">
            {emails.length}
          </div>
          <div className="text-xs text-zinc-500 mt-1 font-mono">
            {filtered.length !== emails.length && `${filtered.length} tras filtro`}
          </div>
        </div>

        <div className="lg:col-span-2 border border-zinc-900 bg-zinc-950 p-5 flex flex-col gap-3">
          <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-400">
            Acciones rápidas
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => copy(joinedEmails, `${filtered.length} emails copiados (separador ",")`)}
              disabled={filtered.length === 0}
              data-testid="copy-emails-comma"
              className="rounded-none bg-yellow-400 hover:bg-yellow-300 text-black uppercase tracking-wider text-xs font-bold h-10"
            >
              <Copy className="w-4 h-4 mr-2" /> Copiar todos (coma)
            </Button>
            <Button
              variant="outline"
              onClick={() => copy(lineEmails, `${filtered.length} emails copiados (uno por línea)`)}
              disabled={filtered.length === 0}
              data-testid="copy-emails-newline"
              className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 hover:border-yellow-400 hover:text-yellow-400 text-white uppercase tracking-wider text-xs h-10"
            >
              <Copy className="w-4 h-4 mr-2" /> Uno por línea
            </Button>
            <Button
              variant="outline"
              onClick={downloadCsv}
              disabled={filtered.length === 0}
              data-testid="download-emails-csv"
              className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 hover:border-yellow-400 hover:text-yellow-400 text-white uppercase tracking-wider text-xs h-10"
            >
              <Download className="w-4 h-4 mr-2" /> Descargar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Composer */}
      <section className="mt-8 border border-zinc-900 bg-zinc-950">
        <div className="px-5 py-4 border-b border-zinc-900 bg-black flex items-center gap-2">
          <Mail className="w-4 h-4 text-yellow-400" />
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
            Componer y enviar mailing
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Asunto
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Novedades, ofertas o campaña — ejemplo: Revisión de invierno con 4% descuento"
              data-testid="mailing-subject"
              className="mt-2 rounded-none bg-black border-zinc-800 text-white h-10 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-0"
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Cuerpo del mensaje
            </Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hola {nombre}, te informamos que..."
              rows={10}
              data-testid="mailing-body"
              className="mt-2 rounded-none bg-black border-zinc-800 text-white focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-0 font-mono text-sm"
            />
          </div>
          <div className="border border-blue-900/40 bg-blue-950/20 px-4 py-3 flex gap-3">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-300 leading-relaxed">
              <p className="text-white font-semibold mb-1">Envío masivo</p>
              Al pulsar <span className="text-yellow-400 font-bold">Abrir en mi correo</span> se abrirá
              tu cliente de email predeterminado con todos los destinatarios en <span className="font-mono">BCC</span>{" "}
              (oculto entre destinatarios) y el cuerpo prerellenado. Desde ahí podrás revisar, añadir adjuntos y
              enviar desde tu cuenta — incluyendo Gmail/Google Workspace.
              <br />
              <span className="text-zinc-500">
                Integración nativa con Gmail (OAuth) y envío en segundo plano con seguimiento de entregas: disponible en la
                próxima fase.
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={openInMail}
              disabled={filtered.length === 0}
              data-testid="open-in-mail"
              className="rounded-none bg-yellow-400 hover:bg-yellow-300 text-black uppercase tracking-[0.2em] text-xs font-bold h-11 px-6"
            >
              <Send className="w-4 h-4 mr-2" /> Abrir en mi correo ({filtered.length})
            </Button>
          </div>
        </div>
      </section>

      {/* Recipients list */}
      <section className="mt-8 border border-zinc-900 bg-zinc-950">
        <div className="px-5 py-4 border-b border-zinc-900 bg-black flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
            Destinatarios
          </h2>
          <span className="font-mono text-xs text-zinc-500">{filtered.length}</span>
          <div className="ml-auto">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por email o nombre..."
              data-testid="mailing-filter"
              className="w-80 max-w-full h-9 rounded-none bg-black border-zinc-800 text-white focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        {(() => {
          if (loading) {
            return (
              <div className="p-8 text-center text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin inline" />
              </div>
            );
          }
          if (filtered.length === 0) {
            return (
              <div className="p-10 text-center text-zinc-600 text-sm">
                No hay emails que coincidan.
              </div>
            );
          }
          return (
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-900 sticky top-0 bg-black">
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Nombre</th>
                  <th className="text-left px-5 py-3">Teléfono</th>
                  <th className="text-left px-5 py-3">Nº Fid.</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {filtered.map((e) => (
                  <tr key={e.email} className="border-b border-zinc-900 hover:bg-black">
                    <td className="px-5 py-2.5 text-white font-bold">{e.email}</td>
                    <td className="px-5 py-2.5 text-zinc-300 font-body">{e.nombre || "—"}</td>
                    <td className="px-5 py-2.5 text-zinc-400">{e.telefono || "—"}</td>
                    <td className="px-5 py-2.5 text-zinc-500">{e.fidelizacion_num || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          );
        })()}
      </section>
    </div>
  );
}
