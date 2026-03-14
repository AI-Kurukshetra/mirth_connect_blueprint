import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid work email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  confirmPassword: z.string().min(8, "Confirm your password."),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (password !== confirmPassword) {
    ctx.addIssue({ code: "custom", message: "Passwords must match.", path: ["confirmPassword"] });
  }
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

