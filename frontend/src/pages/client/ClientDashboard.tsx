export default function ClientDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Client Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <a href="/cn/create" className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
          <div className="font-medium">Create CN</div>
          <div className="text-sm text-gray-500">Book a consignment</div>
        </a>
        <a href="/cn" className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
          <div className="font-medium">CN Dashboard</div>
          <div className="text-sm text-gray-500">Search / track</div>
        </a>
      </div>
    </div>
  );
}
