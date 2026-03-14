"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { signupAction } from "@/lib/actions/auth";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignupForm() {
  const router = useRouter();
  const startLoading = useUiStore((state) => state.startLoading);
  const stopLoading = useUiStore((state) => state.stopLoading);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  const onSubmit = handleSubmit((values) => {
    setServerMessage(null);
    startTransition(async () => {
      startLoading("Creating your MedFlow workspace...");
      try {
        const result = await signupAction(values);
        setServerMessage(result.message);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success(result.message);
        router.push(result.redirectTo ?? "/login");
      } finally {
        stopLoading();
      }
    });
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-ink" htmlFor="fullName">Full name</label>
        <Input aria-label="Full name" id="fullName" placeholder="Casey Morgan" {...register("fullName")} />
        {errors.fullName ? <p className="text-sm text-alert">{errors.fullName.message}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-ink" htmlFor="signupEmail">Work email</label>
        <Input aria-label="Work email" id="signupEmail" placeholder="casey@medflow.health" type="email" {...register("email")} />
        {errors.email ? <p className="text-sm text-alert">{errors.email.message}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="signupPassword">Password</label>
          <Input aria-label="Password" id="signupPassword" type="password" {...register("password")} />
          {errors.password ? <p className="text-sm text-alert">{errors.password.message}</p> : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink" htmlFor="confirmPassword">Confirm password</label>
          <Input aria-label="Confirm password" id="confirmPassword" type="password" {...register("confirmPassword")} />
          {errors.confirmPassword ? <p className="text-sm text-alert">{errors.confirmPassword.message}</p> : null}
        </div>
      </div>
      {serverMessage ? <p className="text-sm text-muted">{serverMessage}</p> : null}
      <Button aria-label="Create account" className="w-full" loading={isPending} loadingText="Creating account..." type="submit">Create account</Button>
    </form>
  );
}

