import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Plus, Car } from "lucide-react";

const FIELDS = [
  { name: "fidelizacion_num", label: "Nº de Fidelización", required: true, group: "id" },
  { name: "dni", label: "DNI", required: true, group: "id" },
  { name: "nombre_apellidos", label: "Nombre y Apellidos", required: true, group: "id", colSpan: 2 },
  { name: "email", label: "Email", type: "email", group: "contact" },
  { name: "telefono", label: "Teléfono", group: "contact" },
  { name: "calle", label: "Calle", group: "address", colSpan: 2 },
  { name: "numero", label: "Número", group: "address" },
  { name: "codigo_postal", label: "Código Postal", group: "address" },
  { name: "localidad", label: "Localidad", group: "address", colSpan: 2 },
];

const GROUPS = { id: "Identificación", contact: "Contacto", address: "Dirección" };

const inputCls =
  "mt-2 rounded-none bg-black border-zinc-800 text-white focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-0 focus-visible:border-yellow-400 h-10";

export default function ClientForm({ value, onChange, idPrefix = "field" }) {
  const [matInput, setMatInput] = useState("");
  const [modInput, setModInput] = useState("");

  const set = (k, v) => onChange({ ...value, [k]: v });

  const matriculas = Array.isArray(value.matriculas) ? value.matriculas : [];

  const addPair = () => {
    const m = matInput.trim().toUpperCase();
    if (!m) return;
    const list = matriculas;
    if (list.some((x) => x.matricula === m)) {
      setMatInput("");
      setModInput("");
      return;
    }
    onChange({
      ...value,
      matriculas: [...list, { matricula: m, modelo: modInput.trim() }],
    });
    setMatInput("");
    setModInput("");
  };

  const removeMat = (mat) => {
    onChange({
      ...value,
      matriculas: matriculas.filter((x) => x.matricula !== mat),
    });
  };

  const updateModel = (mat, modelo) => {
    onChange({
      ...value,
      matriculas: matriculas.map((x) => (x.matricula === mat ? { ...x, modelo } : x)),
    });
  };

  return (
    <div className="space-y-8">
      {Object.keys(GROUPS).map((g) => {
        const fields = FIELDS.filter((f) => f.group === g);
        if (fields.length === 0) return null;
        return (
          <section key={g}>
            <div className="flex items-baseline justify-between border-b border-zinc-900 pb-2 mb-4">
              <h3 className="font-display text-xs font-bold tracking-[0.2em] text-yellow-400 uppercase">
                {GROUPS[g]}
              </h3>
              <span className="font-mono text-xs text-zinc-600">
                {fields.length} {fields.length === 1 ? "campo" : "campos"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fields.map((f) => (
                <div key={f.name} className={f.colSpan === 2 ? "md:col-span-2" : ""}>
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    {f.label}
                    {f.required && <span className="text-yellow-400 ml-1">*</span>}
                  </Label>
                  <Input
                    type={f.type || "text"}
                    value={value[f.name] || ""}
                    onChange={(e) => set(f.name, e.target.value)}
                    required={f.required}
                    data-testid={`${idPrefix}-${f.name}`}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Vehículos: matrícula + modelo */}
      <section>
        <div className="flex items-baseline justify-between border-b border-zinc-900 pb-2 mb-4">
          <h3 className="font-display text-xs font-bold tracking-[0.2em] text-yellow-400 uppercase flex items-center gap-2">
            <Car className="w-3.5 h-3.5" /> Vehículos
          </h3>
          <span className="font-mono text-xs text-zinc-600">{matriculas.length}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-2">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Matrícula
            </Label>
            <Input
              value={matInput}
              onChange={(e) => setMatInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPair();
                }
              }}
              placeholder="1234ABC"
              data-testid={`${idPrefix}-matricula-input`}
              className={`${inputCls} mt-2 uppercase font-mono`}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Modelo del vehículo
            </Label>
            <Input
              value={modInput}
              onChange={(e) => setModInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPair();
                }
              }}
              placeholder="Ej. Seat León 1.6 TDI"
              data-testid={`${idPrefix}-modelo-input`}
              className={`${inputCls} mt-2`}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={addPair}
              data-testid={`${idPrefix}-matricula-add`}
              className="rounded-none bg-yellow-400 hover:bg-yellow-300 text-black uppercase tracking-wider text-xs font-bold h-10 px-4 w-full md:w-auto"
            >
              <Plus className="w-4 h-4 mr-1" /> Añadir
            </Button>
          </div>
        </div>

        {matriculas.length > 0 && (
          <div className="mt-4 border border-zinc-900" data-testid={`${idPrefix}-matriculas-list`}>
            <div className="grid grid-cols-[1fr,1.5fr,auto] gap-0 bg-black border-b border-zinc-900">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-3 py-2">
                Matrícula
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-3 py-2">
                Modelo
              </div>
              <div className="w-12"></div>
            </div>
            {matriculas.map((v) => (
              <div
                key={v.matricula}
                className="grid grid-cols-[1fr,1.5fr,auto] gap-0 items-center border-b border-zinc-900 last:border-b-0"
              >
                <div className="px-3 py-2 font-mono text-sm text-white font-bold">{v.matricula}</div>
                <div className="px-2 py-1">
                  <Input
                    value={v.modelo || ""}
                    onChange={(e) => updateModel(v.matricula, e.target.value)}
                    placeholder="Modelo"
                    className="rounded-none bg-black border-zinc-800 text-zinc-200 h-8 text-sm focus-visible:ring-1 focus-visible:ring-yellow-400 focus-visible:ring-offset-0"
                    data-testid={`${idPrefix}-modelo-${v.matricula}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeMat(v.matricula)}
                  data-testid={`${idPrefix}-matricula-remove-${v.matricula}`}
                  className="px-3 py-2 text-zinc-500 hover:text-red-400"
                  aria-label={`Eliminar ${v.matricula}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-zinc-600 mt-2">
          Cada matrícula puede tener su propio modelo. Sin límite de vehículos por cliente.
        </p>
      </section>
    </div>
  );
}

export const INITIAL_CLIENT = {
  fidelizacion_num: "",
  dni: "",
  nombre_apellidos: "",
  email: "",
  telefono: "",
  calle: "",
  numero: "",
  codigo_postal: "",
  localidad: "",
  matriculas: [],
};

/** Helper for legacy data: returns array of {matricula, modelo} */
export function normalizeMatriculas(client) {
  const arr = client?.matriculas;
  if (!Array.isArray(arr)) return [];
  return arr.map((x) =>
    typeof x === "string"
      ? { matricula: x, modelo: client?.modelo || "" }
      : { matricula: x.matricula || "", modelo: x.modelo || "" }
  );
}
