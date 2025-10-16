// import { FormEvent, useState } from "react";
// import api from "../../lib/api";
// import { useNavigate } from "react-router-dom";

// export default function ClientCreate() {
//   const nav = useNavigate();
//   const [payload, setPayload] = useState({
//     client_name: "",
//     email: "",
//     phone: "",
//     gstin: "",
//     pan: "",
//     website: "",
//   });
//   const [saving, setSaving] = useState(false);

//   const onSubmit = async (e: FormEvent) => {
//     e.preventDefault();
//     setSaving(true);
//     try {
//       await api.post("/clients", payload);
//       nav("/clients");
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <form
//       onSubmit={onSubmit}
//       className="bg-white p-6 rounded-xl shadow max-w-2xl"
//     >
//       <h1 className="text-xl font-semibold mb-4">Create Client</h1>
//       <div className="grid md:grid-cols-2 gap-4">
//         {Object.entries(payload).map(([k, v]) => (
//           <div key={k}>
//             <label className="block text-sm mb-1 capitalize">
//               {k.replace(/_/g, " ")}
//             </label>
//             <input
//               className="w-full border rounded-md px-3 py-2"
//               value={v}
//               onChange={(e) =>
//                 setPayload((p) => ({ ...p, [k]: e.target.value }))
//               }
//             />
//           </div>
//         ))}
//       </div>
//       <div className="mt-4 flex gap-2">
//         <button
//           disabled={saving}
//           className="px-4 py-2 rounded-md bg-brand text-white"
//         >
//           {saving ? "Saving..." : "Save"}
//         </button>
//         <button
//           type="button"
//           onClick={() => nav(-1)}
//           className="px-4 py-2 rounded-md bg-gray-100"
//         >
//           Cancel
//         </button>
//       </div>
//     </form>
//   );
// }
import { FormEvent, useState } from "react";
import api from "../../lib/api";
import { useNavigate } from "react-router-dom";

export default function ClientCreate() {
  const nav = useNavigate();

  // Client fields
  const [payload, setPayload] = useState({
    client_name: "",
    email: "",
    phone: "",
    gstin: "",
    pan: "",
    website: "",
  });

  // Invite portal user?
  const [invite, setInvite] = useState(true);
  const [portalName, setPortalName] = useState("");
  const [portalEmail, setPortalEmail] = useState("");
  const [portalPassword, setPortalPassword] = useState(""); // optional

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      // 1) Create client
      const { data: created } = await api.post("/clients", payload);
      const clientId: string | undefined = created?.id;

      // 2) Optionally invite their portal user (backend will send email)
      if (invite) {
        if (!portalName || !portalEmail) {
          throw new Error(
            "Portal user name & email are required when inviting"
          );
        }
        await api.post("/users/invite", {
          email: portalEmail,
          name: portalName,
          password: portalPassword || undefined, // backend auto-generates if omitted
          roles: ["CLIENT"],
          client_id: clientId,
        });
        setOk("Client created and portal access email sent.");
      } else {
        setOk("Client created.");
      }

      // Navigate back to list after a short pause
      setTimeout(() => nav("/clients"), 500);
    } catch (e: any) {
      setErr(
        e?.response?.data?.error || e?.message || "Failed to create client"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white p-6 rounded-xl shadow max-w-2xl"
    >
      <h1 className="text-xl font-semibold mb-4">Create Client</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Client Name *</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={payload.client_name}
            onChange={(e) =>
              setPayload((p) => ({ ...p, client_name: e.target.value }))
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Company Email</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={payload.email}
            onChange={(e) =>
              setPayload((p) => ({ ...p, email: e.target.value }))
            }
            type="email"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={payload.phone}
            onChange={(e) =>
              setPayload((p) => ({ ...p, phone: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="block text-sm mb-1">GSTIN</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={payload.gstin}
            onChange={(e) =>
              setPayload((p) => ({ ...p, gstin: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="block text-sm mb-1">PAN</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={payload.pan}
            onChange={(e) => setPayload((p) => ({ ...p, pan: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Website</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={payload.website}
            onChange={(e) =>
              setPayload((p) => ({ ...p, website: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="mt-6">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={invite}
            onChange={(e) => setInvite(e.target.checked)}
          />
          <span className="text-sm">
            Send portal access to client now (via email)
          </span>
        </label>
      </div>

      {invite && (
        <div className="grid md:grid-cols-2 gap-4 border rounded p-4 bg-gray-50 mt-3">
          <div>
            <label className="block text-sm mb-1">Portal User Name *</label>
            <input
              className="w-full border rounded-md px-3 py-2"
              value={portalName}
              onChange={(e) => setPortalName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Portal Email *</label>
            <input
              className="w-full border rounded-md px-3 py-2"
              type="email"
              value={portalEmail}
              onChange={(e) => setPortalEmail(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">
              Temporary Password (optional)
            </label>
            <input
              className="w-full border rounded-md px-3 py-2"
              type="text"
              placeholder="Leave blank to auto-generate"
              value={portalPassword}
              onChange={(e) => setPortalPassword(e.target.value)}
            />
          </div>
        </div>
      )}

      {err && <div className="text-red-600 text-sm mt-3">{err}</div>}
      {ok && <div className="text-green-700 text-sm mt-3">{ok}</div>}

      <div className="mt-4 flex gap-2">
        <button
          disabled={saving}
          className="px-4 py-2 rounded-md bg-brand text-white"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => nav(-1)}
          className="px-4 py-2 rounded-md bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
