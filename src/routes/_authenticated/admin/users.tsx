import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListUsers,
  adminGrantRole,
  adminRevokeRole,
  adminInviteUser,
  adminDeleteUser,
} from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersAdmin,
});

const ROLES = ["admin", "editor", "moderator", "guest_author", "reader"] as const;
type Role = (typeof ROLES)[number];

function UsersAdmin() {
  const list = useServerFn(adminListUsers);
  const grant = useServerFn(adminGrantRole);
  const revoke = useServerFn(adminRevokeRole);
  const invite = useServerFn(adminInviteUser);
  const del = useServerFn(adminDeleteUser);

  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => list(),
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);

  const term = q.trim().toLowerCase();
  const visible = users.filter((u) => {
    const matchesRole = roleFilter === "all" || u.roles.includes(roleFilter);
    const matchesTerm =
      !term ||
      (u.email ?? "").toLowerCase().includes(term) ||
      (u.display_name ?? "").toLowerCase().includes(term);
    return matchesRole && matchesTerm;
  });
  const adminCount = users.filter((u) => u.roles.includes("admin")).length;


  const inviteMut = useMutation({
    mutationFn: (email: string) => invite({ data: { email } }),
    onSuccess: () => {
      toast.success("Invite sent");
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const grantMut = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => grant({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const revokeMut = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => revoke({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const delMut = useMutation({
    mutationFn: (userId: string) => del({ data: { userId } }),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl uppercase">Users</h1>
        <p className="text-sm text-white/50">
          Grant or revoke roles. Roles: admin, editor, moderator, guest_author, reader.
        </p>
      </div>

      <div className="rounded border border-white/10 bg-neutral-900 p-4">
        <Label>Invite by email</Label>
        <div className="mt-2 flex gap-2">
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="person@example.com"
            className="bg-neutral-950 border-neutral-800"
          />
          <Button
            onClick={() => inviteMut.mutate(inviteEmail)}
            disabled={!inviteEmail || inviteMut.isPending}
          >
            <UserPlus className="mr-1 h-4 w-4" /> Invite
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-white/40">Loading…</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="rounded border border-white/10 bg-neutral-900 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm">{u.email ?? "(no email)"}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    {u.display_name || "—"} · joined {new Date(u.created_at).toLocaleDateString()}
                    {u.last_sign_in_at && ` · last seen ${new Date(u.last_sign_in_at).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => confirm(`Delete ${u.email}?`) && delMut.mutate(u.id)}
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {ROLES.map((role) => {
                  const has = u.roles.includes(role);
                  return (
                    <button
                      key={role}
                      onClick={() =>
                        has
                          ? revokeMut.mutate({ userId: u.id, role })
                          : grantMut.mutate({ userId: u.id, role })
                      }
                      className={`rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                        has
                          ? "border-white bg-white text-neutral-950"
                          : "border-white/20 text-white/60 hover:border-white hover:text-white"
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-white/40">No users yet.</p>}
        </div>
      )}
    </div>
  );
}
