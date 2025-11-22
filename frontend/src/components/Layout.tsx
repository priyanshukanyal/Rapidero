// src/components/Layout.tsx
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function Layout() {
  const { user, logout } = useAuth();

  const roles = user?.roles || [];
  const isAdminOrOps = roles.includes("ADMIN") || roles.includes("OPS");
  const isClient = roles.includes("CLIENT");
  const isField = roles.includes("FIELD_EXEC");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="h-12 flex items-center justify-between px-6 border-b bg-white">
        <div className="font-semibold text-lg">Rapidero Portal</div>

        <nav className="flex items-center gap-4 text-sm">
          {/* -------- ADMIN / OPS NAV -------- */}
          {isAdminOrOps && (
            <>
              <NavLink
                to="/cn"
                className={({ isActive }) =>
                  isActive ? "font-semibold text-brand" : "text-gray-700"
                }
              >
                CN Dashboard
              </NavLink>
              <NavLink
                to="/cn/create"
                className={({ isActive }) =>
                  isActive ? "font-semibold text-brand" : "text-gray-700"
                }
              >
                Create CN
              </NavLink>
              <NavLink
                to="/clients"
                className={({ isActive }) =>
                  isActive ? "font-semibold text-brand" : "text-gray-700"
                }
              >
                Clients
              </NavLink>
              <NavLink
                to="/contracts/create"
                className={({ isActive }) =>
                  isActive ? "font-semibold text-brand" : "text-gray-700"
                }
              >
                Create Contract
              </NavLink>
            </>
          )}

          {/* -------- CLIENT NAV -------- */}
          {isClient && (
            <>
              <NavLink
                to="/client"
                end
                className={({ isActive }) =>
                  isActive ? "font-semibold text-brand" : "text-gray-700"
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/client/consignments"
                className={({ isActive }) =>
                  isActive ? "font-semibold text-brand" : "text-gray-700"
                }
              >
                My Consignments
              </NavLink>
              <NavLink
                to="/client/contracts"
                className={({ isActive }) =>
                  isActive ? "font-semibold text-brand" : "text-gray-700"
                }
              >
                My Contracts
              </NavLink>
            </>
          )}

          {/* -------- FIELD EXEC NAV (optional) -------- */}
          {isField && (
            <NavLink
              to="/field"
              className={({ isActive }) =>
                isActive ? "font-semibold text-brand" : "text-gray-700"
              }
            >
              Field Dashboard
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {user && (
            <span className="text-gray-600">
              {user.name || user.email}{" "}
              {roles.length > 0 && (
                <span className="text-gray-400">({roles.join(", ")})</span>
              )}
            </span>
          )}
          <button
            onClick={logout}
            className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-xs"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
