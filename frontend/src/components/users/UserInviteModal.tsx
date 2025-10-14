import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import { inviteUser, listClients, type ClientLite } from "../../api/users";

const ALL_ROLES = ["ADMIN", "OPS", "CLIENT", "FIELD_EXEC"] as const;

export default function UserInviteModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open)
      listClients()
        .then(setClients)
        .catch(() => setClients([]));
  }, [open]);

  const needsClient = useMemo(
    () => roles.includes("CLIENT") || roles.includes("FIELD_EXEC"),
    [roles]
  );

  const toggleRole = (r: string) =>
    setRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );

  const reset = () => {
    setEmail("");
    setName("");
    setPassword("");
    setRoles([]);
    setClientId("");
  };

  const submit = async () => {
    if (!email || !name || roles.length === 0)
      return alert("Email, name, roles are required");
    if (needsClient && !clientId)
      return alert("Select a client for CLIENT/FIELD_EXEC");
    setSaving(true);
    try {
      await inviteUser({
        email,
        name,
        password: password || undefined,
        roles,
        client_id: needsClient ? clientId : undefined,
      });
      reset();
      onDone();
      onClose();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to invite user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite User"
      footer={
        <>
          <button className="px-4 py-2 rounded border" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={saving}
            className="px-4 py-2 rounded bg-brand text-white"
            onClick={submit}
          >
            {saving ? "Inviting..." : "Invite"}
          </button>
        </>
      }
    >
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Email *</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Name *</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Temp Password (optional)</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Roles *</label>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={roles.includes(r)}
                  onChange={() => toggleRole(r)}
                />{" "}
                {r}
              </label>
            ))}
          </div>
        </div>
        {needsClient && (
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Client *</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.client_name} ({c.client_code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Modal>
  );
}
