import { useEffect, useMemo, useState } from "react";
import { deleteUser, listUsers, type UserRow } from "../../api/users";
import UserInviteModal from "../../components/users/UserInviteModal";
import RoleBadges from "../../components/users/RoleBadges";
import RoleEditor from "../../components/users/RoleEditor";

const ROLE_OPTIONS = ["ALL", "ADMIN", "OPS", "CLIENT", "FIELD_EXEC"] as const;

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("ALL");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listUsers({
        q: query || undefined,
        role: role !== "ALL" ? role : undefined,
      });
      setRows(data);
    } catch (e) {
      console.warn(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // initial
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [query, role]); // debounce

  const filtered = useMemo(() => rows, [rows]);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    try {
      await deleteUser(id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <button
          className="px-4 py-2 rounded bg-brand text-white"
          onClick={() => setInviteOpen(true)}
        >
          Invite User
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email…"
          className="border rounded px-3 py-2 w-72"
        />
        <select
          className="border rounded px-3 py-2"
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button onClick={load} className="px-3 py-2 rounded border">
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Roles</th>
              <th className="text-left p-3">Active</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(u.created_at || "").toLocaleString() || ""}
                    </div>
                  </td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <RoleBadges roles={u.roles || []} />
                  </td>
                  <td className="p-3">{u.is_active ? "Yes" : "No"}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 rounded border"
                        onClick={() => {
                          setEditUser(u);
                          setEditOpen(true);
                        }}
                      >
                        Edit Roles
                      </button>
                      <button
                        className="px-2 py-1 rounded border text-red-600"
                        onClick={() => onDelete(u.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <UserInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onDone={load}
      />
      {editUser && (
        <RoleEditor
          open={editOpen}
          onClose={() => setEditOpen(false)}
          userId={editUser.id}
          currentRoles={editUser.roles || []}
          onDone={load}
        />
      )}
    </div>
  );
}
