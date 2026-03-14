import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getPermissions, normalizeRole, type UserRole } from "@/lib/rbac";
import type { ProfileRow } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface OperatorSummary {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
}

export interface AuthContext {
  supabase: SupabaseServerClient;
  user: User | null;
  profile: ProfileRow | null;
  role: UserRole;
  permissions: ReturnType<typeof getPermissions>;
  operator: OperatorSummary | null;
}

function toOperator(user: User, profile: ProfileRow | null, role: UserRole): OperatorSummary {
  return {
    id: user.id,
    fullName: profile?.full_name ?? String(user.user_metadata.full_name ?? user.email ?? "Operator"),
    email: profile?.email ?? user.email ?? "unknown@medflow.local",
    avatarUrl: profile?.avatar_url ?? null,
    role,
  };
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      profile: null,
      role: "viewer",
      permissions: getPermissions("viewer"),
      operator: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const role = normalizeRole(profile?.role);

  return {
    supabase,
    user,
    profile,
    role,
    permissions: getPermissions(role),
    operator: toOperator(user, profile, role),
  };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const context = await getAuthContext();

  if (!context.user) {
    return {
      ok: false as const,
      status: 401,
      message: "You need to sign in to continue.",
      ...context,
    };
  }

  if (!allowedRoles.includes(context.role)) {
    return {
      ok: false as const,
      status: 403,
      message: "Your role does not have access to this action.",
      ...context,
    };
  }

  return {
    ok: true as const,
    ...context,
  };
}
