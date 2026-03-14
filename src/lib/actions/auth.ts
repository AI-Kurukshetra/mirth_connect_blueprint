"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from "@/lib/validations/auth";

export interface ActionState {
  success: boolean;
  message: string;
  redirectTo?: string;
  fieldErrors?: Record<string, string[]>;
}

function invalid(fieldErrors: Record<string, string[]>) {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors,
  } satisfies ActionState;
}

export async function loginAction(input: LoginInput): Promise<ActionState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Welcome back to MedFlow.", redirectTo: "/dashboard" };
}

export async function signupAction(input: SignupInput): Promise<ActionState> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Account created. Check your inbox for the confirmation link.", redirectTo: "/login" };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

