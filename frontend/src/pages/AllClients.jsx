import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, Receipt, Pencil, Trash2, Wallet, Save, FileDown, Printer, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ClientForm, { INITIAL_CLIENT, normalizeMatriculas } from "@/components/ClientForm";
import { downloadFidelityPdf, printFidelityPdf } from "@/lib/fidelityPdf";
import { toast } from "sonner";
import { useDialogState } from "@/hooks/useDialogState";

const TIPO_LABEL = {
  ninguno: "Sin saldo",
  acumular_2: "+2% saldo",
  acumular_4: "+4% saldo",
  gastar_saldo: "Pagado con saldo",
};

export default function AllClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [invLoading, setInvLoading] = useState(false);

  const detailDlg = useDialogState();
  const editDlg = useDialogState();
  const deleteDlg = useDialogState();
  const bulkDeleteDlg = useDialogState();
  const [editSaving, setEditSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/clients");
      setClients(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (c) => {
    detailDlg.open(c);
    setInvLoading(true);
    try {
      const { data } = await api.get(`/clients/${c.id}/invoices`);
      setInvoices(data);
    } finally {
      setInvLoading(false);
    }
  };

  const filtered = clients.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const mats = (c.matriculas || []).join(" ").toLowerCase();
    return (
      c.nombre_apellidos?.toLowerCase().includes(q) ||
      c.dni?.toLowerCase().includes(q) ||
      c.fidelizacion_num?.toLowerCase().includes(q) ||
      mats.includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const onEditSave = async () => {
    const target = editDlg.payload;
    if (!target) return;
    setEditSaving(true);
    try {
      const { data } = await api.put(`/clients/${target.id}`, target);
      editDlg.close();
      setTimeout(() => {
        setClients((p) => p.map((c) => (c.id === data.id ? data : c)));
        toast.success("Cliente actualizado");
      }, 260);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error al guardar");
    } finally {
      setEditSaving(false);
    }
  };

  const onDelete = async () => {
    const target = deleteDlg.payload;
    if (!target) return;
    try {
      await api.delete(`/clients/${target.id}`);
      deleteDlg.close();
      toast.success("Cliente eliminado");
      setTimeout(() => {
        setClients((p) => p.filter((c) => c.id !== target.id));
        setSelectedIds((prev) => {
          if (!prev.has(target.id)) return prev;
          const next = new Set(prev);
          next.delete(target.id);
          return next;
        });
        if (detailDlg.payload?.id === target.id) detailDlg.close();
      }, 260);
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  const toggleRow = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredIds = useMemo(() => filtered.map((c) => c.id), [filtered]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someFilteredSelected =
    !allFilteredSelected && filteredIds.some((id) => selectedIds.has(id));

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = filteredIds.length > 0 && filteredIds.every((id) => next.has(id));
      if (allSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [filteredIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const onBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const { data } = await api.post("/clients/bulk-delete", { ids });
      bulkDeleteDlg.close();
      toast.success(`${data.deleted} ${data.deleted === 1 ? "cliente eliminado" : "clientes eliminados"}`);
      setTimeout(() => {
        const removed = new Set(ids);
        setClients((p) => p.filter((c) => !removed.has(c.id)));
        setSelectedIds(new Set());
        if (detailDlg.payload && removed.has(detailDlg.payload.id)) detailDlg.close();
      }, 260);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "No se pudo eliminar");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400 mb-3">
        CRM / Directorio
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight text-white">
            Todos Los Clientes
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            <span className="font-mono">{clients.length}</span> {clients.length === 1 ? "cliente registrado" : "clientes registrados"}.
          </p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input
            placeholder="Buscar por nombre, DNI, matrícula..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="search-clients"
            className="pl-10 h-11 rounded-none bg-black border-zinc-800 text-white focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      <div className="border border-zinc-900">
        {isAdmin && selectedIds.size > 0 && (
          <div
            className="flex flex-wrap items-center gap-3 bg-yellow-400/10 border-b border-yellow-400/40 px-4 py-3"
            data-testid="bulk-action-bar"
          >
            <span className="text-yellow-400 text-xs font-bold uppercase tracking-[0.2em]">
              <span className="font-mono text-sm">{selectedIds.size}</span>{" "}
              {selectedIds.size === 1 ? "cliente seleccionado" : "clientes seleccionados"}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                onClick={clearSelection}
                data-testid="bulk-clear"
                className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300 uppercase tracking-wider text-[10px] h-9"
              >
                <X className="w-3.5 h-3.5 mr-1.5" /> Limpiar
              </Button>
              <Button
                onClick={() => bulkDeleteDlg.open({ count: selectedIds.size })}
                data-testid="bulk-delete-btn"
                className="rounded-none bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-[0.2em] text-[10px] h-9"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar seleccionados
              </Button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 border-b border-zinc-900">
              <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                {isAdmin && (
                  <th className="w-10 px-3 py-3">
                    <Checkbox
                      checked={allFilteredSelected || (someFilteredSelected ? "indeterminate" : false)}
                      onCheckedChange={toggleSelectAllFiltered}
                      data-testid="select-all-checkbox"
                      aria-label="Seleccionar todos"
                      className="border-zinc-700 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400 data-[state=checked]:text-black"
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3">Nº Fid.</th>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">DNI</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="text-left px-4 py-3">Vehículos</th>
                <th className="text-right px-4 py-3">Saldo</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {loading && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-zinc-500">
                    <Loader2 className="w-5 h-5 animate-spin inline" /> Cargando...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="text-center py-16 text-zinc-600 font-body">
                    No hay clientes que coincidan.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((c) => {
                  const mats = normalizeMatriculas(c);
                  const checked = selectedIds.has(c.id);
                  return (
                  <tr
                    key={c.id}
                    className={`border-b border-zinc-900 hover:bg-zinc-950 transition-colors ${checked ? "bg-yellow-400/5" : ""}`}
                    data-testid={`client-row-${c.id}`}
                  >
                    {isAdmin && (
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleRow(c.id)}
                          data-testid={`select-client-${c.id}`}
                          aria-label={`Seleccionar ${c.nombre_apellidos}`}
                          className="border-zinc-700 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400 data-[state=checked]:text-black"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-bold text-white cursor-pointer" onClick={() => openDetail(c)}>
                      {c.fidelizacion_num}
                    </td>
                    <td className="px-4 py-3 font-body text-zinc-100 cursor-pointer" onClick={() => openDetail(c)}>
                      {c.nombre_apellidos}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{c.dni}</td>
                    <td className="px-4 py-3 text-zinc-400">{c.telefono || "—"}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {mats.length === 0 && <span className="text-zinc-600">—</span>}
                      {mats.length > 0 && (
                        <div className="space-y-0.5">
                          {mats.slice(0, 2).map((v) => (
                            <div key={v.matricula} className="text-xs">
                              <span className="text-white font-bold uppercase">{v.matricula}</span>
                              {v.modelo && (
                                <span className="text-zinc-500 font-body ml-2">{v.modelo}</span>
                              )}
                            </div>
                          ))}
                          {mats.length > 2 && (
                            <div className="text-[10px] text-yellow-400 font-body">
                              + {mats.length - 2} más
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-yellow-400">
                      {(c.saldo || 0).toFixed(2)} €
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => downloadFidelityPdf(c)}
                          className="p-2 hover:bg-zinc-900 hover:text-yellow-400 text-zinc-500"
                          data-testid={`pdf-client-${c.id}`}
                          aria-label="Descargar condiciones PDF"
                          title="Descargar condiciones PDF"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => editDlg.open({ ...INITIAL_CLIENT, ...c, matriculas: normalizeMatriculas(c) })}
                          className="p-2 hover:bg-zinc-900 hover:text-yellow-400 text-zinc-500"
                          data-testid={`edit-client-${c.id}`}
                          aria-label="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteDlg.open(c)}
                          className="p-2 hover:bg-red-950/40 hover:text-red-400 text-zinc-500"
                          data-testid={`delete-client-${c.id}`}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail */}
      <Dialog open={detailDlg.isOpen} onOpenChange={detailDlg.onOpenChange}>
        <DialogContent className="max-w-3xl rounded-none bg-zinc-950 border-zinc-900 text-zinc-100" data-testid="client-detail-dialog">
          <DialogHeader>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">
              <span>Cliente · Nº {detailDlg.payload?.fidelizacion_num || ""}</span>
            </DialogDescription>
            <DialogTitle className="font-display text-2xl font-black tracking-tight text-white">
              <span>{detailDlg.payload?.nombre_apellidos || ""}</span>
            </DialogTitle>
          </DialogHeader>
          {detailDlg.payload && (
            <ClientDetailBody selected={detailDlg.payload} invoices={invoices} invLoading={invLoading} />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editDlg.isOpen} onOpenChange={editDlg.onOpenChange}>
        <DialogContent className="max-w-4xl rounded-none bg-zinc-950 border-zinc-900 text-zinc-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">
              <span>Editar</span>
            </DialogDescription>
            <DialogTitle className="font-display text-2xl font-black tracking-tight text-white">
              <span>{editDlg.payload?.nombre_apellidos || "Cliente"}</span>
            </DialogTitle>
          </DialogHeader>
          {editDlg.payload && (
            <div className="pt-2">
              <ClientForm value={editDlg.payload} onChange={editDlg.setPayload} idPrefix="edit" />
            </div>
          )}
          <DialogFooter className="border-t border-zinc-900 pt-4 mt-2">
            <Button
              variant="outline"
              onClick={editDlg.close}
              className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300 uppercase tracking-wider text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={onEditSave}
              disabled={editSaving}
              data-testid="save-edit-client"
              className="rounded-none bg-yellow-400 hover:bg-yellow-300 text-black font-bold uppercase tracking-[0.2em] text-xs"
            >
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Guardar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteDlg.isOpen} onOpenChange={deleteDlg.onOpenChange}>
        <AlertDialogContent className="rounded-none bg-zinc-950 border-zinc-900 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-tight">
              <span>¿Eliminar cliente?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              <span>
                Se eliminará <span className="text-yellow-400 font-bold">{deleteDlg.payload?.nombre_apellidos || ""}</span> y todas sus facturas asociadas. Esta acción no se puede deshacer.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              data-testid="confirm-delete-client"
              className="rounded-none bg-red-600 hover:bg-red-500 text-white uppercase tracking-wider text-xs font-bold"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteDlg.isOpen} onOpenChange={bulkDeleteDlg.onOpenChange}>
        <AlertDialogContent className="rounded-none bg-zinc-950 border-zinc-900 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-tight">
              <span>¿Eliminar clientes seleccionados?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              <span>
                Se eliminarán{" "}
                <span className="text-yellow-400 font-bold font-mono">{bulkDeleteDlg.payload?.count || 0}</span>{" "}
                clientes y todas sus facturas asociadas. Esta acción no se puede deshacer.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onBulkDelete}
              disabled={bulkDeleting}
              data-testid="confirm-bulk-delete"
              className="rounded-none bg-red-600 hover:bg-red-500 text-white uppercase tracking-wider text-xs font-bold"
            >
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar todos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClientDetailBody({ selected, invoices, invLoading }) {
  const mats = normalizeMatriculas(selected);
  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between bg-black border border-yellow-400/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-yellow-400" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">
              Saldo del monedero
            </div>
            <div className="font-mono text-xs text-zinc-500">Crédito disponible</div>
          </div>
        </div>
        <div className="font-mono text-2xl font-black text-yellow-400">
          {(selected.saldo || 0).toFixed(2)} €
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <Field label="DNI" value={selected.dni} />
        <Field label="Email" value={selected.email} />
        <Field label="Teléfono" value={selected.telefono} />
        <Field label="Calle" value={selected.calle} />
        <Field label="Número" value={selected.numero} />
        <Field label="CP" value={selected.codigo_postal} />
        <Field label="Localidad" value={selected.localidad} />
      </div>

      {/* Vehicles list */}
      <div>
        <div className="flex items-center gap-2 border-b border-zinc-900 pb-2 mb-3">
          <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
            Vehículos
          </h3>
          <span className="font-mono text-xs text-zinc-600 ml-auto">{mats.length}</span>
        </div>
        {mats.length === 0 ? (
          <div className="text-sm text-zinc-600 font-mono">Sin vehículos registrados.</div>
        ) : (
          <div className="border border-zinc-900">
            <table className="w-full text-sm font-mono">
              <thead className="bg-black border-b border-zinc-900">
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="text-left px-3 py-2">Matrícula</th>
                  <th className="text-left px-3 py-2">Modelo</th>
                </tr>
              </thead>
              <tbody>
                {mats.map((v) => (
                  <tr key={v.matricula} className="border-b border-zinc-900 last:border-b-0">
                    <td className="px-3 py-2 font-bold text-white uppercase">{v.matricula}</td>
                    <td className="px-3 py-2 text-zinc-300 font-body">{v.modelo || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF actions */}
      <div className="flex flex-wrap gap-2 border-t border-zinc-900 pt-4">
        <Button
          type="button"
          onClick={() => downloadFidelityPdf(selected)}
          data-testid="detail-pdf-download"
          className="rounded-none bg-yellow-400 hover:bg-yellow-300 text-black uppercase tracking-[0.2em] text-xs font-bold h-10 px-5"
        >
          <FileDown className="w-4 h-4 mr-2" /> Descargar condiciones PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => printFidelityPdf(selected)}
          data-testid="detail-pdf-print"
          className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 hover:border-yellow-400 hover:text-yellow-400 text-white uppercase tracking-wider text-xs h-10"
        >
          <Printer className="w-4 h-4 mr-2" /> Imprimir
        </Button>
      </div>

      <InvoicesSection invoices={invoices} invLoading={invLoading} />
    </div>
  );
}

function InvoicesSection({ invoices, invLoading }) {
  let body;
  if (invLoading) {
    body = (
      <div className="py-6 text-center text-zinc-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin inline" /> Cargando...
      </div>
    );
  } else if (invoices.length === 0) {
    body = (
      <div className="py-6 text-center text-zinc-600 text-sm">
        Aún no hay facturas registradas para este cliente.
      </div>
    );
  } else {
    body = (
      <div className="border border-zinc-900 overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead className="bg-black border-b border-zinc-900">
            <tr className="text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="text-left px-3 py-2">Nº Factura</th>
              <th className="text-right px-3 py-2">Sin IVA</th>
              <th className="text-right px-3 py-2">Con IVA</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-right px-3 py-2">+Saldo</th>
              <th className="text-right px-3 py-2">−Saldo</th>
              <th className="text-right px-3 py-2">Pagar</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-zinc-900">
                <td className="px-3 py-2 font-bold text-white">{inv.numero_factura}</td>
                <td className="px-3 py-2 text-right text-zinc-300">{inv.importe_sin_iva.toFixed(2)} €</td>
                <td className="px-3 py-2 text-right text-zinc-300">{inv.importe_con_iva.toFixed(2)} €</td>
                <td className="px-3 py-2 text-zinc-400 font-body text-xs">{TIPO_LABEL[inv.tipo] || inv.tipo}</td>
                <td className="px-3 py-2 text-right text-green-400">
                  {inv.saldo_acumulado ? `+${inv.saldo_acumulado.toFixed(2)} €` : "—"}
                </td>
                <td className="px-3 py-2 text-right text-red-400">
                  {inv.saldo_gastado ? `−${inv.saldo_gastado.toFixed(2)} €` : "—"}
                </td>
                <td className="px-3 py-2 text-right text-yellow-400 font-bold">
                  {inv.importe_final.toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-zinc-900 pb-2 mb-3">
        <Receipt className="w-4 h-4 text-yellow-400" />
        <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
          Historial de Facturas
        </h3>
        <span className="font-mono text-xs text-zinc-600 ml-auto">{invoices.length}</span>
      </div>
      {body}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">{label}</div>
      <div className="text-sm text-white font-mono break-all">{value || "—"}</div>
    </div>
  );
}
