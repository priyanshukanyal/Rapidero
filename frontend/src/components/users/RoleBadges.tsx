// src/components/RoleBadges.tsx
type Props = { roles: string[] };

const COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  OPS: "bg-blue-100 text-blue-700",
  CLIENT: "bg-green-100 text-green-700",
  FIELD_EXEC: "bg-amber-100 text-amber-700",
};

export default function RoleBadges({ roles }: Props) {
  if (!roles?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span
          key={r}
          className={`px-2 py-0.5 text-xs rounded ${
            COLORS[r] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {r}
        </span>
      ))}
    </div>
  );
}
