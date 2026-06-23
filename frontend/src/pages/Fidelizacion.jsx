import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Plus, Receipt, Wallet, Minus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const IVA = 21;
const TIPO_LABEL = {
  ninguno: "Sin saldo",
  acumular_2: "+2% al saldo",
  acumular_4: "+4% al saldo",
  gastar_saldo: "Gastar saldo",
};

const inputCls =
  "rounded-none bg-black border-zinc-800 text-white h-10 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-0 focus-visible:border-yellow-400 font-mono";

function getTipoButtonClass(active, disabled) {
  if (disabled) return "bg-zinc-950 border-zinc-900 text-zinc-700 cursor-not-allowed";
  if (active) return "bg-yellow-400 border-yellow-400 text-black";
  return "bg-black border-zinc-800 text-zinc-300 hover:border-yellow-400 hover:text-yellow-400";
}

export default function FidelizacionPage() {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [numeroFactura, setNumeroFactura] = useState("");
  const [importeSinIva, setImporteSinIva] = useState("");
  const [tipo, setTipo] = useState("ninguno");
  const [invoices, setInvoices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [invLoading, setInvLoading] = useState(false);

  const loadClients = useCallback(async () => {
    const { data } = await api.get("/clients");
    setClients(data);
    return data;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadClients();
        if (data.length > 0) setSelectedId(data[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadClients]);

  const loadInvoices = useCallback(async (clientId) => {
    setInvLoading(true);
    try {
      const { data } = await api.get(`/clients/${clientId}/invoices`);
      setInvoices(data);
    } finally {
      setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadInvoices(selectedId);
  }, [selectedId, loadInvoices]);

  const selected = clients.find((c) => c.id === selectedId);
  const saldoActual = selected?.saldo || 0;

  const filtered = clients.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const mats = (c.matriculas || [])
      .map((m) => (typeof m === "string" ? m : (m.matricula || "") + " " + (m.modelo || "")))
      .join(" ")
      .toLowerCase();
    return (
      c.nombre_apellidos?.toLowerCase().includes(q) ||
      c.dni?.toLowerCase().includes(q) ||
      c.fidelizacion_num?.toLowerCase().includes(q) ||
      mats.includes(q)
    );
  });

  const calc = useMemo(() => {
    const base = parseFloat(importeSinIva);
    if (isNaN(base) || base < 0) {
      return { sin: 0, iva: 0, con: 0, saldoAcum: 0, saldoGast: 0, final: 0, valid: false };
    }
    const sin = +base.toFixed(2);
    const iva = +(sin * (IVA / 100)).toFixed(2);
    const con = +(sin + iva).toFixed(2);
    let saldoAcum = 0;
    let saldoGast = 0;
    let final = con;
    if (tipo === "acumular_2") saldoAcum = +(sin * 0.02).toFixed(2);
    if (tipo === "acumular_4") saldoAcum = +(sin * 0.04).toFixed(2);
    if (tipo === "gastar_saldo") {
      saldoGast = +Math.min(saldoActual, con).toFixed(2);
      final = +(con - saldoGast).toFixed(2);
    }
    return { sin, iva, con, saldoAcum, saldoGast, final, valid: true };
  }, [importeSinIva, tipo, saldoActual]);

  const reset = () => {
    setNumeroFactura("");
    setImporteSinIva("");
    setTipo("ninguno");
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!selectedId) return toast.error("Selecciona un cliente primero");
    if (!numeroFactura.trim() || !calc.valid)
      return toast.error("Introduce Nº de factura e importe válido");
    setSubmitting(true);
    try {
      const { data } = await api.post(`/clients/${selectedId}/invoices`, {
        numero_factura: numeroFactura.trim(),
        importe_sin_iva: calc.sin,
        tipo,
      });
      // Update ONLY the affected client's saldo locally — refetching the entire
      // list (potentially thousands of clients) caused a massive re-render that
      // raced with Sonner's portal insertion and crashed React (removeChild).
      setInvoices((p) => [data, ...p]);
      setClients((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, saldo: data.saldo_resultante } : c))
      );
      reset();
      // Defer the toast so React finishes committing the saldo/invoice changes
      // before Sonner mounts its portal.
      setTimeout(() => toast.success(`Factura ${data.numero_factura} guardada`), 0);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteInvoice = async (inv) => {
    if (!window.confirm(`¿Eliminar factura ${inv.numero_factura}? Se revertirá su efecto sobre el saldo.`)) return;
    try {
      await api.delete(`/clients/${selectedId}/invoices/${inv.id}`);
      // Compute reverted saldo locally instead of refetching everything
      const delta = -(inv.saldo_acumulado || 0) + (inv.saldo_gastado || 0);
      setInvoices((p) => p.filter((i) => i.id !== inv.id));
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedId ? { ...c, saldo: +(((c.saldo || 0) + delta).toFixed(2)) } : c
        )
      );
      setTimeout(() => toast.success("Factura eliminada"), 0);
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  const TIPO_OPTS = [
    { v: "gastar_saldo", lbl: "Gastar Saldo", icon: Minus, disabled: saldoActual <= 0, hint: `Disp. ${saldoActual.toFixed(2)} €` },
    { v: "acumular_2", lbl: "2%", icon: Plus, hint: "Acumular" },
    { v: "acumular_4", lbl: "4%", icon: Plus, hint: "Acumular" },
  ];

  return (
    <div className="p-6 md:p-10">
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400 mb-3">
        CRM / Programa de Lealtad
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight text-white mb-1">
        Fidelización
      </h1>
      <p className="text-sm text-zinc-500 mb-8">
        Registra facturas. El monedero virtual de cada cliente acumula 2% o 4% del importe sin IVA, o se gasta para descontar del total.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        <aside className="border border-zinc-900 bg-zinc-950">
          <div className="p-3 border-b border-zinc-900 bg-black">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <Input
                placeholder="Buscar cliente..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                data-testid="fid-search-clients"
                className="pl-10 h-10 rounded-none bg-black border-zinc-800 text-white focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-0"
              />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loading && (
              <div className="p-6 text-center text-zinc-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin inline" />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-6 text-center text-zinc-600 text-sm">Sin resultados</div>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                data-testid={`fid-client-${c.id}`}
                className={`w-full text-left px-4 py-3 border-b border-zinc-900 transition-colors ${
                  selectedId === c.id
                    ? "bg-yellow-400 text-black"
                    : "hover:bg-zinc-900 text-zinc-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider opacity-80">
                    #{c.fidelizacion_num}
                  </span>
                  <span className={`font-mono text-[10px] font-bold ${selectedId === c.id ? "text-black/80" : "text-yellow-400"}`}>
                    {(c.saldo || 0).toFixed(2)} €
                  </span>
                </div>
                <div className="font-semibold text-sm mt-1 truncate">{c.nombre_apellidos}</div>
                <div className={`text-xs mt-0.5 truncate font-mono uppercase ${selectedId === c.id ? "text-black/70" : "text-zinc-500"}`}>
                  {(c.matriculas || [])
                    .map((m) => (typeof m === "string" ? m : m.matricula))
                    .filter(Boolean)
                    .join(", ") || "—"}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-6 min-w-0">
          {!selected && !loading && (
            <div className="border border-zinc-900 p-12 text-center text-zinc-500 bg-zinc-950">
              Crea un cliente primero en &quot;Nuevos Clientes&quot;.
            </div>
          )}

          {selected && (
            <>
              <div className="border border-zinc-900 p-6 bg-zinc-950 flex items-baseline justify-between flex-wrap gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400 mb-1">
                    Nº {selected.fidelizacion_num}
                  </div>
                  <h2
                    className="font-display text-2xl font-black tracking-tight text-white"
                    data-testid="fid-selected-name"
                  >
                    {selected.nombre_apellidos}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1 font-mono uppercase">
                    {selected.dni} ·{" "}
                    {(selected.matriculas || [])
                      .map((m) => {
                        const mat = typeof m === "string" ? m : m.matricula;
                        const mod = typeof m === "string" ? "" : m.modelo;
                        return mod ? `${mat} (${mod})` : mat;
                      })
                      .filter(Boolean)
                      .join(" · ") || "Sin vehículos"}
                  </p>
                </div>
                <div className="bg-black border border-yellow-400/40 px-5 py-3 flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-yellow-400" />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                      Saldo disponible
                    </div>
                    <div className="font-mono text-2xl font-black text-yellow-400" data-testid="cliente-saldo">
                      {saldoActual.toFixed(2)} €
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculator */}
              <form onSubmit={onSave} className="border border-zinc-900 p-6 bg-zinc-950" data-testid="invoice-form">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-3 mb-5">
                  <Receipt className="w-4 h-4 text-yellow-400" />
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
                    Nueva Factura
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                      Nº Factura
                    </Label>
                    <Input
                      value={numeroFactura}
                      onChange={(e) => setNumeroFactura(e.target.value)}
                      placeholder="ej. F-2026-001"
                      required
                      data-testid="invoice-number-input"
                      className={`mt-2 ${inputCls}`}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                      Importe Sin IVA (€)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={importeSinIva}
                      onChange={(e) => setImporteSinIva(e.target.value)}
                      placeholder="0,00"
                      required
                      data-testid="invoice-base-input"
                      className={`mt-2 ${inputCls}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                  <CalcBox label="Importe Sin IVA" value={calc.sin} testid="calc-sin" />
                  <CalcBox label="IVA 21%" value={calc.iva} testid="calc-iva" />
                  <CalcBox label="Importe Con IVA" value={calc.con} testid="calc-con-iva" highlight />
                </div>

                <div className="mt-6">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    Acción sobre el monedero
                  </Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {TIPO_OPTS.map((opt) => {
                      const Icon = opt.icon;
                      const active = tipo === opt.v;
                      const disabled = opt.disabled;
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => !disabled && setTipo(opt.v)}
                          disabled={disabled}
                          data-testid={`tipo-${opt.v}`}
                          className={`h-14 border text-xs uppercase tracking-wider font-bold transition-colors flex flex-col items-center justify-center gap-0.5 ${getTipoButtonClass(active, disabled)}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5" />
                            {opt.lbl}
                          </div>
                          <span className="text-[9px] font-mono opacity-80 normal-case">{opt.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTipo("ninguno")}
                    data-testid="tipo-ninguno"
                    className={`mt-2 w-full text-[10px] uppercase tracking-[0.2em] py-2 ${
                      tipo === "ninguno" ? "text-yellow-400" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Sin acción de monedero
                  </button>
                </div>

                {/* Saldo movement preview */}
                {(calc.saldoAcum > 0 || calc.saldoGast > 0) && (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="border border-green-900/60 bg-green-950/20 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-400">Acumulado al monedero</div>
                      <div className="font-mono text-lg font-black text-green-400 mt-1" data-testid="calc-saldo-acum">
                        +{calc.saldoAcum.toFixed(2)} €
                      </div>
                    </div>
                    <div className="border border-red-900/60 bg-red-950/20 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">Gastado del monedero</div>
                      <div className="font-mono text-lg font-black text-red-400 mt-1" data-testid="calc-saldo-gast">
                        −{calc.saldoGast.toFixed(2)} €
                      </div>
                    </div>
                  </div>
                )}

                {/* Final */}
                <div className="mt-6 bg-black border border-yellow-400/50 p-5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">
                      Importe Final a cobrar
                    </div>
                    <div className="text-zinc-500 text-xs mt-1 font-mono">
                      {TIPO_LABEL[tipo]}
                    </div>
                  </div>
                  <div className="font-mono text-3xl font-black text-white" data-testid="importe-final">
                    {calc.final.toFixed(2)} €
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={submitting}
                    data-testid="save-invoice-button"
                    className="rounded-none bg-yellow-400 hover:bg-yellow-300 text-black font-bold uppercase tracking-[0.2em] text-xs h-11 px-8"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" /> Guardar Factura
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={reset}
                    className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300 uppercase tracking-wider text-xs h-11"
                  >
                    Limpiar
                  </Button>
                </div>
              </form>

              {/* History */}
              <div className="border border-zinc-900 bg-zinc-950">
                <div className="px-4 py-3 border-b border-zinc-900 bg-black flex items-center justify-between">
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
                    Historial de Facturas
                  </h3>
                  <span className="font-mono text-xs text-zinc-500">
                    {invoices.length}
                  </span>
                </div>
                {(() => {
                  if (invLoading) {
                    return (
                      <div className="p-8 text-center text-zinc-500">
                        <Loader2 className="w-4 h-4 animate-spin inline" />
                      </div>
                    );
                  }
                  if (invoices.length === 0) {
                    return (
                      <div className="p-12 text-center text-zinc-600 text-sm">
                        Aún no hay facturas para este cliente.
                      </div>
                    );
                  }
                  return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm font-mono">
                      <thead className="border-b border-zinc-900">
                        <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-body">
                          <th className="text-left px-4 py-2">Nº Factura</th>
                          <th className="text-left px-4 py-2">Fecha</th>
                          <th className="text-right px-4 py-2">Sin IVA</th>
                          <th className="text-right px-4 py-2">Con IVA</th>
                          <th className="text-left px-4 py-2">Tipo</th>
                          <th className="text-right px-4 py-2">Saldo</th>
                          <th className="text-right px-4 py-2">Cobrado</th>
                          <th className="text-right px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="border-b border-zinc-900 hover:bg-black">
                            <td className="px-4 py-2 font-bold text-white">{inv.numero_factura}</td>
                            <td className="px-4 py-2 text-zinc-500">
                              {new Date(inv.created_at).toLocaleDateString("es-ES")}
                            </td>
                            <td className="px-4 py-2 text-right text-zinc-300">{inv.importe_sin_iva.toFixed(2)} €</td>
                            <td className="px-4 py-2 text-right text-zinc-300">{inv.importe_con_iva.toFixed(2)} €</td>
                            <td className="px-4 py-2 text-zinc-400 font-body text-xs">{TIPO_LABEL[inv.tipo] || inv.tipo}</td>
                            <td className="px-4 py-2 text-right">
                              {inv.saldo_acumulado > 0 && <span className="text-green-400">+{inv.saldo_acumulado.toFixed(2)} €</span>}
                              {inv.saldo_gastado > 0 && <span className="text-red-400">−{inv.saldo_gastado.toFixed(2)} €</span>}
                              {!inv.saldo_acumulado && !inv.saldo_gastado && <span className="text-zinc-700">—</span>}
                            </td>
                            <td className="px-4 py-2 text-right text-yellow-400 font-bold">
                              {inv.importe_final.toFixed(2)} €
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                onClick={() => onDeleteInvoice(inv)}
                                className="text-zinc-600 hover:text-red-400 p-1"
                                data-testid={`delete-invoice-${inv.id}`}
                                aria-label="Eliminar factura"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  );
                })()}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function CalcBox({ label, value, testid, highlight }) {
  return (
    <div
      className={`border p-3 ${highlight ? "border-yellow-400/60 bg-yellow-400/5" : "border-zinc-800 bg-black"}`}
      data-testid={testid}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</div>
      <div className={`font-mono text-lg font-black mt-1 ${highlight ? "text-yellow-400" : "text-white"}`}>
        {(value || 0).toFixed(2)} €
      </div>
    </div>
  );
}
