"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { loginAction } from "@/lib/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit((values) => {
    setServerMessage(null);
    startTransition(async () => {
      startLoading("Signing you into MedFlow...");
      try {
        const result = await loginAction(values);
        setServerMessage(result.message);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success(result.message);
        router.push(result.redirectTo ?? "/dashboard");
      } finally {
        stopLoading();
      }
    });
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-ink" htmlFor="email">Work email</label>
        <Input aria-label="Work email" id="email" placeholder="ops@medflow.health" type="email" {...register("email")} />
        {errors.email ? <p className="text-sm text-alert">{errors.email.message}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-ink" htmlFor="password">Password</label>
        <Input aria-label="Password" id="password" placeholder="Enter your password" type="password" {...register("password")} />
        {errors.password ? <p className="text-sm text-alert">{errors.password.message}</p> : null}
      </div>
      {serverMessage ? <p className="text-sm text-muted">{serverMessage}</p> : null}
      <Button aria-label="Sign in" className="w-full" loading={isPending} loadingText="Signing in..." type="submit">Sign in</Button>
    </form>
  );
}

