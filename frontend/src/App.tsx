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
import ClientDashboard from "./pages/client/ClientDashboard";
import FieldDashboard from "./pages/field/FieldDashboard";

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
        <Route path="field" element={<FieldDashboard />} />
        <Route path="clients" element={<ClientsList />} />
        <Route path="clients/create" element={<ClientCreate />} />
        <Route path="contracts/create" element={<ContractCreate />} />
        <Route path="cn" element={<CnDashboard />} />
        <Route path="cn/create" element={<CnCreate />} />
        <Route path="cn/:cnNumber" element={<CnDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
