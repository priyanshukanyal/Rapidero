import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import { assignRoles, listClients, type ClientLite } from "../../api/users";

const ALL_ROLES = ["ADMIN", "OPS", "CLIENT", "FIELD_EXEC"] as const;

export default function RoleEditor({
  open,
  onClose,
  userId,
  currentRoles,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentRoles: string[];
  onDone: () => void;
}) {
  const [roles, setRoles] = useState<string[]>(currentRoles || []);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRoles(currentRoles || []);
  }, [currentRoles, open]);
  useEffect(() => {
    if (open)
      listClients()
        .then(setClients)
        .catch(() => {});
  }, [open]);

  const needsClient = useMemo(
    () => roles.includes("CLIENT") || roles.includes("FIELD_EXEC"),
    [roles]
  );

  const toggleRole = (r: string) =>
    setRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );

  const submit = async () => {
    if (!roles.length) return alert("Select at least one role");
    if (needsClient && !clientId)
      return alert("Select a client for CLIENT/FIELD_EXEC");
    setSaving(true);
    try {
      await assignRoles(userId, {
        roles,
        mode: "replace",
        client_id: needsClient ? clientId : undefined,
      });
      onDone();
      onClose();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to update roles");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Roles"
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
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-3">
          {ALL_ROLES.map((r) => (
            <label key={r} className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={roles.includes(r)}
                onChange={() => toggleRole(r)}
              />{" "}
              {r}
            </label>
          ))}
        </div>
        {needsClient && (
          <div>
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
