import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { UserPlus, Users, Award, LogOut, ShieldCheck, UserCircle, Mail } from "lucide-react";
import { LOGO_URL, APP_NAME } from "@/lib/branding";

const NAV = [
  { to: "/nuevos-clientes", label: "Nuevos Clientes", icon: UserPlus, testid: "nav-new-clients" },
  { to: "/todos-clientes", label: "Todos Los Clientes", icon: Users, testid: "nav-all-clients" },
  { to: "/fidelizacion", label: "Fidelización", icon: Award, testid: "nav-fidelizacion" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-black font-body text-zinc-100">
      <aside className="hidden md:flex md:flex-col w-64 bg-black border-r border-zinc-900">
        <div className="px-6 py-6 border-b border-zinc-900">
          <img src={LOGO_URL} alt="Fabián Arenas" className="h-12 object-contain" />
          <div className="text-[9px] uppercase tracking-[0.3em] text-yellow-400 mt-3 font-bold">
            {APP_NAME}
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV.map(({ to, label, icon: Icon, testid }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-yellow-400 text-black font-bold"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}

          {user?.role === "admin" && (
            <>
              <NavLink
                to="/mailing"
                data-testid="nav-mailing"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-yellow-400 text-black font-bold"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`
                }
              >
                <Mail className="w-4 h-4" />
                Mailing
              </NavLink>
              <NavLink
                to="/usuarios"
                data-testid="nav-users"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-yellow-400 text-black font-bold"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`
                }
              >
                <ShieldCheck className="w-4 h-4" />
                Usuarios (Admin)
              </NavLink>
            </>
          )}

          <NavLink
            to="/perfil"
            data-testid="nav-profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-yellow-400 text-black font-bold"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`
            }
          >
            <UserCircle className="w-4 h-4" />
            Mi Perfil
          </NavLink>
        </nav>

        <div className="border-t border-zinc-900 p-4">
          <div className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 mb-1">Sesión</div>
          <div className="text-sm font-semibold truncate text-white" data-testid="current-user-email">
            {user?.email}
          </div>
          <div className="text-xs text-zinc-500 capitalize">{user?.role}</div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 border border-zinc-800 hover:border-yellow-400 hover:text-yellow-400 text-xs uppercase tracking-wider font-bold transition-colors text-zinc-400"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      </aside>

      {/* Mobile bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-20 bg-black flex items-center justify-between px-4 h-14 border-b border-zinc-900">
        <img src={LOGO_URL} alt="" className="h-7 object-contain" />
        <button onClick={handleLogout} className="text-xs uppercase tracking-wider text-zinc-400" data-testid="mobile-logout">
          Salir
        </button>
      </div>

      <main className="flex-1 min-w-0 md:pt-0 pt-14 bg-[#525354]">
        <div className="md:hidden flex overflow-x-auto border-b border-zinc-900 bg-[#3f4041] sticky top-14 z-10">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap border-b-2 ${
                  isActive ? "border-yellow-400 text-white font-bold" : "border-transparent text-zinc-500"
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
