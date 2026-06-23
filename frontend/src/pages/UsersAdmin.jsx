import { useCallback, useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldOff,
  Loader2,
  UserPlus,
  KeyRound,
  Users as UsersIcon,
  ShieldCheck,
  Pencil,
  Trash2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
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
import { useDialogState } from "@/hooks/useDialogState";

const inputCls =
  "mt-2 rounded-none bg-black border-zinc-800 text-white h-10 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-0 focus-visible:border-yellow-400";

const SEED_EMAILS = [
  "lidiafernandez@fabianarenas.es",
  "taller@fabianarenas.es",
  "marketing@fabianarenas.es",
  "info@fabianarenas.es",
];

const PRIMARY_ADMIN_EMAIL = "marketing@fabianarenas.es";

function getDeleteTitle(isSelf, isSeed) {
  if (isSelf) return "No puedes eliminar tu propia cuenta";
  if (isSeed) return "Usuario base del sistema";
  return "Eliminar usuario";
}

function UserActionsCell({ user, currentUserId, onEdit, onReset, onDelete }) {
  const isSeed = SEED_EMAILS.includes(user.email);
  const isSelf = user.id === currentUserId;
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => onEdit(user)}
        className="p-2 hover:bg-zinc-900 hover:text-yellow-400 text-zinc-500"
        data-testid={`edit-user-${user.id}`}
        title="Editar usuario"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onReset(user)}
        disabled={isSelf}
        title={isSelf ? "Usa Mi Perfil para tu propia contraseña" : "Restablecer contraseña"}
        className="p-2 hover:bg-zinc-900 hover:text-yellow-400 text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed"
        data-testid={`reset-pw-${user.id}`}
      >
        <KeyRound className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDelete(user)}
        disabled={isSeed || isSelf}
        title={getDeleteTitle(isSelf, isSeed)}
        className="p-2 hover:bg-red-950/40 hover:text-red-400 text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed"
        data-testid={`delete-user-${user.id}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function UsersTable({ users, currentUserId, onEdit, onReset, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-900">
          <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
            <th className="text-left px-5 py-3">Email</th>
            <th className="text-left px-5 py-3">Nombre</th>
            <th className="text-left px-5 py-3">Rol</th>
            <th className="text-right px-5 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {users.map((u) => (
            <tr key={u.id} className="border-b border-zinc-900 hover:bg-black" data-testid={`user-row-${u.id}`}>
              <td className="px-5 py-3 font-bold text-white">{u.email}</td>
              <td className="px-5 py-3 text-zinc-300 font-body">{u.name || "—"}</td>
              <td className="px-5 py-3">
                {u.role === "admin" ? (
                  <span className="inline-flex items-center gap-1 text-yellow-400 text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" /> Admin
                  </span>
                ) : (
                  <span className="text-zinc-500 text-xs uppercase tracking-wider">user</span>
                )}
              </td>
              <td className="px-5 py-3">
                <UserActionsCell
                  user={u}
                  currentUserId={currentUserId}
                  onEdit={onEdit}
                  onReset={onReset}
                  onDelete={onDelete}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateUserForm({ onCreated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/admin/users", {
        email: email.trim().toLowerCase(),
        password,
        name: name.trim() || undefined,
        role: "user",
      });
      onCreated(data);
      toast.success(`Usuario ${data.email} creado`);
      setEmail("");
      setPassword("");
      setName("");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 border border-zinc-900 p-6 bg-zinc-950" data-testid="create-user-form">
      <div className="flex items-center gap-2 border-b border-zinc-900 pb-3 mb-5">
        <UserPlus className="w-4 h-4 text-yellow-400" />
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
          Crear nuevo usuario
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Email</Label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            data-testid="new-user-email"
          />
        </div>
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Nombre</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} data-testid="new-user-name" />
        </div>
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Contraseña</Label>
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            data-testid="new-user-password"
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="mt-6 rounded-none bg-yellow-400 hover:bg-yellow-300 text-black uppercase tracking-[0.2em] text-xs font-bold h-11 px-8"
        data-testid="submit-create-user"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear usuario"}
      </Button>
    </form>
  );
}

function ResetPasswordDialog({ dlg, onSubmit, submitting, password, setPassword }) {
  const target = dlg.payload;
  return (
    <Dialog open={dlg.isOpen} onOpenChange={dlg.onOpenChange}>
      <DialogContent className="rounded-none bg-zinc-950 border-zinc-900 text-zinc-100">
        <DialogHeader>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">
            <span>Restablecer contraseña</span>
          </DialogDescription>
          <DialogTitle className="font-display text-2xl font-black tracking-tight text-white">
            <span>{target?.email || ""}</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-2" data-testid="reset-pw-form">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Nueva contraseña
            </Label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              data-testid="reset-pw-input"
              autoFocus
            />
            <p className="text-[10px] text-zinc-600 mt-2">
              Comunica la nueva contraseña al usuario para que pueda iniciar sesión y cambiarla desde su perfil.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={dlg.close}
              className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300 uppercase tracking-wider text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-none bg-yellow-400 hover:bg-yellow-300 text-black uppercase tracking-[0.2em] text-xs font-bold"
              data-testid="reset-pw-submit"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Establecer contraseña"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ dlg, onSave, saving, currentUserId }) {
  const target = dlg.payload;
  const isSeedEmail = target ? SEED_EMAILS.includes(target.email) : false;

  return (
    <Dialog open={dlg.isOpen} onOpenChange={dlg.onOpenChange}>
      <DialogContent className="rounded-none bg-zinc-950 border-zinc-900 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">
            <span>Editar usuario</span>
          </DialogDescription>
          <DialogTitle className="font-display text-2xl font-black tracking-tight text-white">
            <span>{target?.email || ""}</span>
          </DialogTitle>
        </DialogHeader>
        {target && (
          <div className="space-y-4 pt-2" data-testid="edit-user-form">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Email</Label>
              <Input
                type="email"
                value={target.email}
                onChange={(e) => dlg.setPayload({ ...target, email: e.target.value })}
                disabled={isSeedEmail}
                className={`${inputCls} disabled:opacity-60`}
                data-testid="edit-user-email"
              />
              {isSeedEmail && (
                <p className="text-[10px] text-zinc-600 mt-1.5">
                  Los usuarios base del sistema no pueden cambiar el email.
                </p>
              )}
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Nombre</Label>
              <Input
                value={target.name || ""}
                onChange={(e) => dlg.setPayload({ ...target, name: e.target.value })}
                className={inputCls}
                data-testid="edit-user-name"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Rol</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["user", "admin"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => dlg.setPayload({ ...target, role: r })}
                    disabled={
                      (target.email === PRIMARY_ADMIN_EMAIL && r === "user") ||
                      (target.id === currentUserId && r === "user")
                    }
                    data-testid={`edit-user-role-${r}`}
                    className={`h-10 border text-xs uppercase tracking-wider font-bold ${
                      target.role === r
                        ? "bg-yellow-400 border-yellow-400 text-black"
                        : "bg-black border-zinc-800 text-zinc-300 hover:border-yellow-400 hover:text-yellow-400"
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="border-t border-zinc-900 pt-4 mt-2">
          <Button
            variant="outline"
            onClick={dlg.close}
            className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300 uppercase tracking-wider text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={saving}
            data-testid="save-edit-user"
            className="rounded-none bg-yellow-400 hover:bg-yellow-300 text-black uppercase tracking-[0.2em] text-xs font-bold"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Guardar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ dlg, onConfirm }) {
  const target = dlg.payload;
  return (
    <AlertDialog open={dlg.isOpen} onOpenChange={dlg.onOpenChange}>
      <AlertDialogContent className="rounded-none bg-zinc-950 border-zinc-900 text-zinc-100">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display tracking-tight">
            <span>¿Eliminar usuario?</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            <span>
              Se eliminará{" "}
              <span className="text-yellow-400 font-bold">{target?.email || ""}</span> y perderá el
              acceso a la plataforma. Esta acción no se puede deshacer.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            data-testid="confirm-delete-user"
            className="rounded-none bg-red-600 hover:bg-red-500 text-white uppercase tracking-wider text-xs font-bold"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function UsersAdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const resetDlg = useDialogState();
  const editDlg = useDialogState();
  const deleteDlg = useDialogState();
  const [resetPw, setResetPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") loadUsers();
  }, [user, loadUsers]);

  if (user?.role !== "admin") {
    return (
      <div className="p-10 flex flex-col items-center text-center text-zinc-500">
        <ShieldOff className="w-10 h-10 mb-4 text-yellow-400" />
        <h2 className="font-display text-xl font-bold text-white">Acceso restringido</h2>
        <p className="text-sm mt-2">Solo el usuario administrador puede gestionar usuarios.</p>
      </div>
    );
  }

  const handleCreated = (data) => setUsers((p) => [data, ...p]);

  const openReset = (u) => {
    setResetPw("");
    resetDlg.open(u);
  };

  const onResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetDlg.payload) return;
    setResetting(true);
    try {
      await api.post(`/admin/users/${resetDlg.payload.id}/reset-password`, {
        new_password: resetPw,
      });
      const email = resetDlg.payload.email;
      resetDlg.close();
      setResetPw("");
      toast.success(`Contraseña restablecida para ${email}`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error");
    } finally {
      setResetting(false);
    }
  };

  const onEditSave = async () => {
    const target = editDlg.payload;
    if (!target) return;
    setEditing(true);
    try {
      const { data } = await api.put(`/admin/users/${target.id}`, {
        email: target.email,
        name: target.name,
        role: target.role,
      });
      editDlg.close();
      // Defer list update so dialog finishes its close animation cleanly
      setTimeout(() => {
        setUsers((p) => p.map((u) => (u.id === data.id ? data : u)));
        toast.success("Usuario actualizado");
      }, 260);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error");
    } finally {
      setEditing(false);
    }
  };

  const onDeleteConfirm = async () => {
    const target = deleteDlg.payload;
    if (!target) return;
    try {
      await api.delete(`/admin/users/${target.id}`);
      deleteDlg.close();
      toast.success("Usuario eliminado");
      setTimeout(() => {
        setUsers((p) => p.filter((u) => u.id !== target.id));
      }, 260);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400 mb-3">
        Admin / Gestión
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight text-white">
        Usuarios
      </h1>
      <p className="text-sm text-zinc-500 mt-1">
        Crea nuevos accesos, edita datos de usuarios y restablece contraseñas cuando un usuario las olvide.
      </p>

      <CreateUserForm onCreated={handleCreated} />

      <section className="mt-8 border border-zinc-900 bg-zinc-950">
        <div className="px-5 py-4 border-b border-zinc-900 bg-black flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-yellow-400" />
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
            Usuarios del sistema
          </h2>
          <span className="ml-auto font-mono text-xs text-zinc-500">{users.length}</span>
        </div>
        {loadingUsers ? (
          <div className="p-8 text-center text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin inline" />
          </div>
        ) : (
          <UsersTable
            users={users}
            currentUserId={user.id}
            onEdit={(u) => editDlg.open({ ...u })}
            onReset={openReset}
            onDelete={(u) => deleteDlg.open(u)}
          />
        )}
      </section>

      <ResetPasswordDialog
        dlg={resetDlg}
        onSubmit={onResetSubmit}
        submitting={resetting}
        password={resetPw}
        setPassword={setResetPw}
      />
      <EditUserDialog dlg={editDlg} onSave={onEditSave} saving={editing} currentUserId={user.id} />
      <DeleteUserDialog dlg={deleteDlg} onConfirm={onDeleteConfirm} />
    </div>
  );
}
