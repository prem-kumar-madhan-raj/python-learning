import { useAuth } from "../../context/AuthContext";

export default function Topbar({ title }: { title: string }) {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-8">
      <h1 className="text-lg font-semibold tracking-tight text-neutral-900">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium capitalize text-neutral-600">
          {user?.role}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
          T{user?.tenant_id}
        </div>
      </div>
    </header>
  );
}