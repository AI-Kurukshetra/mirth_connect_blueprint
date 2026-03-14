import { loginSchema, signupSchema } from "./auth";

describe("auth schemas", () => {
  it("accepts valid login payloads", () => {
    expect(loginSchema.safeParse({ email: "ops@medflow.health", password: "strongpass123" }).success).toBe(true);
  });

  it("rejects mismatched signup passwords", () => {
    expect(signupSchema.safeParse({
      fullName: "Casey Morgan",
      email: "casey@medflow.health",
      password: "strongpass123",
      confirmPassword: "differentpass123",
    }).success).toBe(false);
  });
});

