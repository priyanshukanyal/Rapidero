import { FormEvent, useState } from "react";
import api from "../../lib/api";
import { useNavigate } from "react-router-dom";

export default function ClientCreate() {
  const nav = useNavigate();
  const [payload, setPayload] = useState({
    client_code: "CL001",
    client_name: "ABC Corporation",
    email: "client.admin@abc.com",
    phone: "9876543210",
    gstin: "27AAECS1234F1Z5",
    pan: "AAECS1234F",
    website: "https://abc.example.com"
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await api.post("/clients", payload); nav("/clients"); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-xl shadow max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">Create Client</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(payload).map(([k,v]) => (
          <div key={k}>
            <label className="block text-sm mb-1 capitalize">{k.replace(/_/g," ")}</label>
            <input className="w-full border rounded-md px-3 py-2"
                   value={v} onChange={e=>setPayload(p=>({ ...p, [k]: e.target.value }))}/>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button disabled={saving} className="px-4 py-2 rounded-md bg-brand text-white">{saving ? "Saving..." : "Save"}</button>
        <button type="button" onClick={()=>nav(-1)} className="px-4 py-2 rounded-md bg-gray-100">Cancel</button>
      </div>
    </form>
  );
}
