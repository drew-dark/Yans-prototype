import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "editor", "moderator", "guest_author", "reader"] as const;
type Role = (typeof ROLES)[number];

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (usersErr) throw new Error(usersErr.message);
    const users = usersData.users;
    const ids = users.map((u) => u.id);
    const [{ data: roles }, { data: profs }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("profiles" as never).select("user_id, display_name, avatar_url").in("user_id", ids),
    ]);
    const roleMap = new Map<string, string[]>();
    for (const r of (roles ?? []) as Array<{ user_id: string; role: string }>) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    const profMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    for (const p of ((profs ?? []) as unknown as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>)) {
      profMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url });
    }
    return users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      roles: roleMap.get(u.id) ?? [],
      display_name: profMap.get(u.id)?.display_name ?? null,
      avatar_url: profMap.get(u.id)?.avatar_url ?? null,
    }));
  });

export const adminGrantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: Role }) =>
    z.object({ userId: z.string().uuid(), role: z.enum(ROLES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRevokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: Role }) =>
    z.object({ userId: z.string().uuid(), role: z.enum(ROLES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.userId === context.userId && data.role === "admin") {
      throw new Error("You can't remove your own admin role.");
    }
    if (data.role === "admin") {
      const { count, error: countErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countErr) throw new Error(countErr.message);
      if ((count ?? 0) <= 1) throw new Error("At least one admin must remain.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const inviteInput = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  role: z.enum(ROLES).default("reader"),
  redirectTo: z.string().url().optional(),
});

export const adminInviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; role?: Role; redirectTo?: string }) =>
    inviteInput.parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Does an account already exist for this email?
    const { data: existingList } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const existing = existingList?.users.find(
      (u) => (u.email ?? "").toLowerCase() === data.email,
    );

    if (existing) {
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: existing.id, role: data.role }, { onConflict: "user_id,role" });
      if (roleErr) throw new Error(roleErr.message);
      return {
        ok: true,
        status: existing.last_sign_in_at ? ("existing" as const) : ("pending" as const),
        userId: existing.id,
        message: existing.last_sign_in_at
          ? `${data.email} already has an account — role “${data.role}” granted.`
          : `${data.email} was already invited — role “${data.role}” granted. Use Resend to send the link again.`,
      };
    }

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);

    if (invited?.user && data.role !== "reader") {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: invited.user.id, role: data.role }, { onConflict: "user_id,role" });
    }
    return {
      ok: true,
      status: "invited" as const,
      userId: invited?.user?.id ?? null,
      message: `Invite email sent to ${data.email} (${data.role}).`,
    };
  });

export const adminResendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; redirectTo?: string }) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email(),
        redirectTo: z.string().url().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);
    return { ok: true, message: `Invite re-sent to ${data.email}.` };
  });

/** Create an account directly with a password — useful when invite email delivery isn't set up. */
export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; role?: Role; displayName?: string }) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        password: z.string().min(8).max(72),
        role: z.enum(ROLES).default("reader"),
        displayName: z.string().trim().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: data.displayName ? { display_name: data.displayName } : undefined,
    });
    if (error) throw new Error(error.message);
    if (created.user && data.role !== "reader") {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: created.user.id, role: data.role }, { onConflict: "user_id,role" });
    }
    return { ok: true, message: `Account created for ${data.email} (${data.role}).` };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("You can't delete your own account here.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: { role: string }) => r.role);
  });
