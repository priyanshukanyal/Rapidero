export default function FieldDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Field Executive Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <a href="/cn" className="bg-white p-4 rounded-xl shadow hover:shadow-md transition">
          <div className="font-medium">Find CN</div>
          <div className="text-sm text-gray-500">Locate consignments for pickup/delivery</div>
        </a>
      </div>
    </div>
  );
}
