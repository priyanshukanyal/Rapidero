// src/App.tsx
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
import FieldDashboard from "./pages/field/FieldDashboard";
import UsersPage from "./pages/admin/UsersPage";

import { RequireRole } from "./components/auth/RequireRole";

import ClientDashboard from "./pages/client/Dashboard";
import ClientContracts from "./pages/client/Contracts";
import ClientCNList from "./pages/client/ConsignmentsList";
import ClientCNView from "./pages/client/ConsignmentView";

// ⬇️ NEW: invoices pages
import AdminInvoicesPage from "./pages/admin/InvoicesPage";
import ClientInvoicesPage from "./pages/client/Invoices";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected layer */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Generic home */}
        <Route index element={<Dashboard />} />

        {/* --------------------- ADMIN + OPS AREA --------------------- */}
        <Route element={<RequireRole roles={["ADMIN", "OPS"]} />}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/users" element={<UsersPage />} />

          {/* Admin client management */}
          <Route path="clients" element={<ClientsList />} />
          <Route path="clients/create" element={<ClientCreate />} />

          {/* Admin contract creation */}
          <Route path="contracts/create" element={<ContractCreate />} />

          {/* Internal CN area */}
          <Route path="cn" element={<CnDashboard />} />
          <Route path="cn/create" element={<CnCreate />} />
          <Route path="cn/:cnNumber" element={<CnDetail />} />

          {/* ⬇️ NEW: Admin/OPS invoices list */}
          <Route path="invoices" element={<AdminInvoicesPage />} />
        </Route>

        {/* --------------------- FIELD EXEC AREA --------------------- */}
        <Route element={<RequireRole roles={["FIELD_EXEC"]} />}>
          <Route path="field" element={<FieldDashboard />} />
        </Route>

        {/* ----------------------- CLIENT AREA ------------------------ */}
        <Route element={<RequireRole roles={["CLIENT"]} />}>
          <Route path="client" element={<ClientDashboard />} />
          <Route path="client/dashboard" element={<ClientDashboard />} />
          <Route path="client/contracts" element={<ClientContracts />} />
          <Route path="client/consignments" element={<ClientCNList />} />
          <Route path="client/consignments/:id" element={<ClientCNView />} />

          {/* ⬇️ NEW: client’s own invoices */}
          <Route path="client/invoices" element={<ClientInvoicesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
