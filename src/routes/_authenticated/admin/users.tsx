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
  adminResendInvite,
  adminCreateUser,
  adminDeleteUser,
} from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, UserPlus, Send, KeyRound } from "lucide-react";

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
  const resend = useServerFn(adminResendInvite);
  const createUser = useServerFn(adminCreateUser);
  const del = useServerFn(adminDeleteUser);

  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => list(),
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("reader");
  const [invitePassword, setInvitePassword] = useState("");
  const [withPassword, setWithPassword] = useState(false);
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
  const pendingCount = users.filter((u) => !u.last_sign_in_at).length;

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;

  const inviteMut = useMutation({
    mutationFn: () =>
      withPassword
        ? createUser({
            data: { email: inviteEmail, password: invitePassword, role: inviteRole },
          })
        : invite({ data: { email: inviteEmail, role: inviteRole, redirectTo } }),
    onSuccess: (res: { message?: string }) => {
      toast.success(res?.message ?? "Invite sent");
      setInviteEmail("");
      setInvitePassword("");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const resendMut = useMutation({
    mutationFn: (email: string) => resend({ data: { email, redirectTo } }),
    onSuccess: (res: { message?: string }) => toast.success(res?.message ?? "Invite re-sent"),
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
          {users.length} account{users.length === 1 ? "" : "s"} · {adminCount} admin
          {adminCount === 1 ? "" : "s"} · {pendingCount} pending invite
          {pendingCount === 1 ? "" : "s"}. Roles: admin, editor, moderator, guest_author, reader.
        </p>
      </div>

      <div className="rounded border border-white/10 bg-white/[0.04] p-4">
        <Label htmlFor="invite-email">Add someone</Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="person@example.com"
            className="border-white/15 bg-black/40"
          />
          {withPassword && (
            <Input
              type="text"
              value={invitePassword}
              onChange={(e) => setInvitePassword(e.target.value)}
              placeholder="temporary password (min 8)"
              aria-label="Temporary password"
              className="border-white/15 bg-black/40 sm:max-w-[16rem]"
            />
          )}
          <Button
            className="h-11 sm:h-9"
            onClick={() => inviteMut.mutate()}
            disabled={
              !inviteEmail ||
              inviteMut.isPending ||
              (withPassword && invitePassword.length < 8)
            }
          >
            {withPassword ? (
              <>
                <KeyRound className="mr-1 h-4 w-4" /> Create
              </>
            ) : (
              <>
                <UserPlus className="mr-1 h-4 w-4" /> Invite
              </>
            )}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
            Role
          </span>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setInviteRole(r)}
              aria-pressed={inviteRole === r}
              className={`rounded border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                inviteRole === r
                  ? "border-kraft bg-kraft text-ink-dark"
                  : "border-white/20 text-white/60 hover:border-white hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs text-white/55">
          <input
            type="checkbox"
            checked={withPassword}
            onChange={(e) => setWithPassword(e.target.checked)}
            className="h-4 w-4 accent-[var(--kraft,#c8a26a)]"
          />
          Create the account directly with a temporary password (use if invite emails aren’t
          arriving).
        </label>
      </div>


      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email or name…"
          aria-label="Search users"
          className="border-white/15 bg-black/40 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...ROLES] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              aria-pressed={roleFilter === r}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                roleFilter === r
                  ? "border-kraft bg-kraft text-ink-dark"
                  : "border-white/15 text-white/55 hover:border-white/40 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-white/40">Loading…</p>
      ) : (
        <div className="space-y-2">
          {visible.map((u) => {
            const isMe = u.id === meId;
            const pending = !u.last_sign_in_at;
            return (
              <div key={u.id} className="rounded border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm">
                      {u.email ?? "(no email)"}
                      {isMe && (
                        <span className="ml-2 rounded bg-kraft/20 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-kraft">
                          You
                        </span>
                      )}
                      {pending && !isMe && (
                        <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white/60">
                          Pending
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                      {u.display_name || "—"} · joined {new Date(u.created_at).toLocaleDateString()}
                      {u.last_sign_in_at
                        ? ` · last seen ${new Date(u.last_sign_in_at).toLocaleDateString()}`
                        : " · never signed in"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {pending && u.email && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Resend invite email"
                        disabled={resendMut.isPending}
                        onClick={() => resendMut.mutate(u.email!)}
                      >
                        <Send className="h-3 w-3" />
                        <span className="ml-1 font-mono text-[10px] uppercase">Resend</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isMe}
                      title={isMe ? "You can't delete your own account here" : "Delete user"}
                      onClick={() => confirm(`Delete ${u.email}?`) && delMut.mutate(u.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {ROLES.map((role) => {
                    const has = u.roles.includes(role);
                    const locked = has && role === "admin" && (isMe || adminCount <= 1);
                    return (
                      <button
                        key={role}
                        type="button"
                        disabled={locked}
                        title={locked ? "At least one admin must remain" : undefined}
                        onClick={() =>
                          has
                            ? revokeMut.mutate({ userId: u.id, role })
                            : grantMut.mutate({ userId: u.id, role })
                        }
                        className={`rounded border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          has
                            ? "border-kraft bg-kraft text-ink-dark"
                            : "border-white/20 text-white/60 hover:border-white hover:text-white"
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {visible.length === 0 && (
            <p className="text-white/40">
              {users.length === 0 ? "No users yet." : "No users match that search."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
