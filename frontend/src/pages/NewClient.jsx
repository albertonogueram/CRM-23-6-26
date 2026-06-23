import { useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Upload, FileDown, Printer, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import ClientForm, { INITIAL_CLIENT } from "@/components/ClientForm";
import ImportClientsDialog from "@/components/ImportClientsDialog";
import { downloadFidelityPdf, printFidelityPdf } from "@/lib/fidelityPdf";

export default function NewClientPage() {
  const [form, setForm] = useState(INITIAL_CLIENT);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [createdClient, setCreatedClient] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/clients", form);
      // Update both states together (React batches), then defer the toast so
      // Sonner mounts its portal AFTER the layout commit is fully done.
      setCreatedClient(data);
      setForm(INITIAL_CLIENT);
      setTimeout(() => toast.success("Cliente creado correctamente"), 0);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error al crear cliente");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400 mb-3">
            CRM / Alta
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight text-white">
            Nuevos Clientes
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Da de alta un cliente. Cada matrícula con su propio modelo de vehículo.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setImportOpen(true)}
          data-testid="open-import-clients"
          className="rounded-none bg-black border border-zinc-800 hover:border-yellow-400 hover:text-yellow-400 text-white uppercase tracking-wider text-xs h-10"
        >
          <Upload className="w-4 h-4 mr-2" /> Importar CSV
        </Button>
      </div>

      {/* Post-create success block */}
      {createdClient && (
        <div className="mt-6 border border-yellow-400/40 bg-yellow-400/5 p-5" data-testid="post-create-block">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400 mb-1">
                Cliente creado · Nº {createdClient.fidelizacion_num}
              </div>
              <h3 className="font-display text-xl font-black tracking-tight text-white">
                {createdClient.nombre_apellidos}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                Imprime o descarga la hoja de condiciones y firma para que el cliente la firme.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => downloadFidelityPdf(createdClient)}
                data-testid="download-fidelity-pdf"
                className="rounded-none bg-yellow-400 hover:bg-yellow-300 text-black uppercase tracking-[0.2em] text-xs font-bold h-10 px-5"
              >
                <FileDown className="w-4 h-4 mr-2" /> Descargar PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => printFidelityPdf(createdClient)}
                data-testid="print-fidelity-pdf"
                className="rounded-none border-zinc-800 bg-black hover:bg-zinc-900 hover:border-yellow-400 hover:text-yellow-400 text-white uppercase tracking-wider text-xs h-10"
              >
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreatedClient(null)}
                className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-400 uppercase tracking-wider text-xs h-10"
                data-testid="dismiss-post-create"
              >
                <PlusCircle className="w-4 h-4 mr-2" /> Crear otro
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} data-testid="new-client-form" className="mt-8">
        <ClientForm value={form} onChange={setForm} idPrefix="field" />

        <div className="flex items-center gap-3 pt-6 mt-8 border-t border-zinc-900">
          <Button
            type="submit"
            disabled={submitting}
            data-testid="submit-new-client"
            className="rounded-none bg-yellow-400 hover:bg-yellow-300 text-black font-bold uppercase tracking-[0.2em] text-xs h-11 px-8"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" /> Crear Cliente
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setForm(INITIAL_CLIENT)}
            className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300 uppercase tracking-wider text-xs h-11"
            data-testid="reset-new-client"
          >
            Limpiar
          </Button>
        </div>
      </form>

      <ImportClientsDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
