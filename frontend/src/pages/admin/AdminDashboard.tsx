export default function AdminDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin / Ops Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <a href="/clients" className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
          <div className="font-medium">Clients</div>
          <div className="text-sm text-gray-500">List & create clients</div>
        </a>
        <a href="/contracts/create" className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
          <div className="font-medium">Contracts</div>
          <div className="text-sm text-gray-500">Create a contract</div>
        </a>
        <a href="/cn" className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
          <div className="font-medium">CN Dashboard</div>
          <div className="text-sm text-gray-500">Search & track consignments</div>
        </a>
      </div>
    </div>
  );
}
