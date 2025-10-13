import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../store/auth";
import RoleGate from "./RoleGate";

export default function NavBar() {
  const { user, logout } = useAuth();
  const active = ({ isActive }: any) =>
    "px-3 py-2 rounded-md text-sm font-medium " +
    (isActive ? "bg-brand text-white" : "text-gray-700 hover:bg-gray-100");

  return (
    <header className="w-full bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg">
          Rapidero Portal
        </Link>
        <nav className="flex gap-2">
          <RoleGate allow={["ADMIN", "OPS", "CLIENT"]}>
            <NavLink to="/cn" className={active}>
              CN Dashboard
            </NavLink>
          </RoleGate>
          <RoleGate allow={["ADMIN", "OPS", "CLIENT"]}>
            <NavLink to="/cn/create" className={active}>
              Create CN
            </NavLink>
          </RoleGate>
          <RoleGate allow={["ADMIN", "OPS"]}>
            <NavLink to="/clients" className={active}>
              Clients
            </NavLink>
            <NavLink to="/contracts/create" className={active}>
              Contracts
            </NavLink>
          </RoleGate>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="text-sm text-gray-600">
                {user.name}{" "}
                <span className="text-gray-400">({user.roles.join(", ")})</span>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className="px-3 py-1.5 rounded-md bg-brand text-white text-sm"
            >
              Login
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
