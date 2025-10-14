import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ClientsList from "./pages/clients/ClientsList";
import ClientCreate from "./pages/clients/ClientCreate";
import ContractCreate from "./pages/contracts/ContractCreate";
import CnCreate from "./pages/consignments/CnCreate";
import CnDashboard from "./pages/consignments/CnDashboard";
import CnDetail from "./pages/consignments/CnDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
// import ClientDashboard from "./pages/client/ClientDashboard";
import FieldDashboard from "./pages/field/FieldDashboard";
import UsersPage from "./pages/admin/UsersPage";
import { RequireRole } from "./components/auth/RequireRole";
import ClientDashboard from "./pages/client/Dashboard";
import ClientCNList from "./pages/client/ConsignmentsList";
import ClientCNView from "./pages/client/ConsignmentView";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="client" element={<ClientDashboard />} />

        <Route
          path="/client"
          element={
            <RequireRole roles={["CLIENT"]}>
              <ClientDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/client/consignments"
          element={
            <RequireRole roles={["CLIENT"]}>
              <ClientCNList />
            </RequireRole>
          }
        />
        <Route
          path="/client/consignments/:id"
          element={
            <RequireRole roles={["CLIENT"]}>
              <ClientCNView />
            </RequireRole>
          }
        />

        <Route path="field" element={<FieldDashboard />} />
        <Route path="clients" element={<ClientsList />} />
        <Route path="clients/create" element={<ClientCreate />} />
        <Route path="contracts/create" element={<ContractCreate />} />
        <Route path="cn" element={<CnDashboard />} />
        <Route path="cn/create" element={<CnCreate />} />
        <Route path="cn/:cnNumber" element={<CnDetail />} />
        <Route
          path="/admin/users"
          element={
            <RequireRole roles={["ADMIN", "OPS"]}>
              <UsersPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
