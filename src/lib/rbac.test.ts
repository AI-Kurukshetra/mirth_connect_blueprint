import { describe, expect, it } from "vitest";

import { canAccessPath, getPermissions, normalizeRole } from "./rbac";

describe("rbac helpers", () => {
  it("normalizes unknown roles to viewer", () => {
    expect(normalizeRole("member")).toBe("viewer");
    expect(normalizeRole(undefined)).toBe("viewer");
  });

  it("grants engineers write access but not delete access", () => {
    expect(getPermissions("engineer")).toMatchObject({
      canCreate: true,
      canEdit: true,
      canDelete: false,
    });
  });

  it("keeps viewers out of engineer routes", () => {
    expect(canAccessPath("viewer", "/channels/add")).toBe(false);
    expect(canAccessPath("viewer", "/channels/CH-001/edit")).toBe(false);
    expect(canAccessPath("viewer", "/channels/CH-001")).toBe(true);
  });

  it("keeps engineers out of admin routes", () => {
    expect(canAccessPath("engineer", "/users")).toBe(false);
    expect(canAccessPath("admin", "/users")).toBe(true);
  });
});
