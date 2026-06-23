import { useRef, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ImportClientsDialog({ open, onOpenChange, onImported }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const csv =
      "Nº Fidelización;DNI;Nombre y Apellidos;Email;Teléfono;Calle;Número;Código Postal;Localidad;Matrícula 1;Modelo 1;Matrícula 2;Modelo 2;Matrícula 3;Modelo 3\n" +
      "F-001;12345678A;Juan Pérez Ruiz;juan@example.com;600000001;Calle Mayor;1;28013;Madrid;1234ABC;Seat León;5678XYZ;Renault Clio;;\n" +
      "F-002;87654321B;Ana López;ana@example.com;600000002;Avda Sol;15;46001;Valencia;9999ZZZ;Audi A4;;;;\n" +
      "F-003;11223344C;Empresa Coches SL;flota@example.com;600000003;Pol. Industrial;3;18320;Santa Fe;0001AAA;Ford Transit;0002BBB;Mercedes Vito;0003CCC;Iveco Daily\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_clientes_fabian_arenas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSubmit = async () => {
    if (!file) {
      toast.error("Selecciona un archivo CSV");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/clients/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      if (data.created > 0) {
        toast.success(`${data.created} cliente(s) importado(s)`);
        onImported?.();
      } else {
        toast.warning("No se importó ningún cliente");
      }
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error al importar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          // Defer reset to next tick to avoid Radix portal race
          setTimeout(reset, 250);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl rounded-none bg-zinc-950 border-zinc-900 text-zinc-100">
        <DialogHeader>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">
            CRM / Importar
          </DialogDescription>
          <DialogTitle className="font-display text-2xl font-black tracking-tight text-white">
            Importar clientes desde CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2" data-testid="import-clients-dialog">
          <div className="border border-zinc-900 bg-black p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-400 leading-relaxed">
                <p className="text-white font-semibold mb-1">Formato esperado</p>
                Sube un <span className="font-mono text-zinc-300">.csv</span> con cabeceras (separador
                <span className="font-mono"> ,</span> o <span className="font-mono">;</span>).
                Columnas mínimas:{" "}
                <span className="font-mono text-yellow-400">Nº Fidelización</span>,{" "}
                <span className="font-mono text-yellow-400">DNI</span>,{" "}
                <span className="font-mono text-yellow-400">Nombre y Apellidos</span>.
                <br />
                Para varios vehículos por cliente usa columnas pareadas:{" "}
                <span className="font-mono text-zinc-300">Matrícula 1 / Modelo 1, Matrícula 2 / Modelo 2 …</span>
                . No hay límite — soporta importaciones masivas (2.000+ clientes).
                <button
                  type="button"
                  onClick={downloadTemplate}
                  data-testid="download-template"
                  className="block mt-3 text-yellow-400 hover:text-yellow-300 underline font-bold uppercase tracking-wider text-[10px]"
                >
                  Descargar plantilla CSV →
                </button>
              </div>
            </div>
          </div>

          <div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              data-testid="import-file-input"
              className="block w-full text-sm text-zinc-300 font-mono
                file:mr-4 file:py-3 file:px-5
                file:border-0 file:rounded-none
                file:bg-yellow-400 file:text-black
                file:font-bold file:uppercase file:tracking-[0.2em] file:text-xs
                hover:file:bg-yellow-300
                cursor-pointer
                bg-black border border-zinc-800 p-0"
            />
            {file && (
              <div className="mt-2 text-xs text-zinc-500 font-mono">
                Archivo: <span className="text-white">{file.name}</span> ·{" "}
                {(file.size / 1024).toFixed(1)} KB
              </div>
            )}
          </div>

          {result && (
            <div className="space-y-3">
              <div className="border border-green-900/60 bg-green-950/20 px-4 py-3 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
                    Importados
                  </div>
                  <div className="font-mono text-2xl font-black text-green-400" data-testid="import-result-created">
                    {result.created}
                  </div>
                </div>
              </div>
              {result.skipped?.length > 0 && (
                <div className="border border-red-900/60 bg-red-950/20 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-red-400">
                      Filas saltadas: {result.skipped.length}
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs font-mono text-zinc-400 max-h-40 overflow-y-auto">
                    {result.skipped.slice(0, 20).map((s) => (
                      <li key={`${s.row}-${s.reason}`}>
                        Fila <span className="text-white">{s.row}</span>: {s.reason}
                      </li>
                    ))}
                    {result.skipped.length > 20 && (
                      <li className="text-zinc-600">... y {result.skipped.length - 20} más</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-zinc-900 pt-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300 uppercase tracking-wider text-xs"
          >
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={submitting || !file}
            data-testid="import-submit"
            className="rounded-none bg-yellow-400 hover:bg-yellow-300 text-black uppercase tracking-[0.2em] text-xs font-bold disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" /> Importar ahora
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
