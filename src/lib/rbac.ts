export type UserRole = "admin" | "engineer" | "viewer";

const protectedRoutePrefixes = [
  "/dashboard",
  "/channels",
  "/messages",
  "/connectors",
  "/monitoring",
  "/alerts",
  "/errors",
  "/audit",
  "/simulator",
  "/transformations",
  "/validation-rules",
  "/routing-rules",
];

const authOnlyRoutes = new Set(["/login", "/signup"]);
const adminRoutePrefixes = ["/users", "/organizations", "/security", "/configurations"];
const engineerRoutePrefixes = ["/channels/add", "/simulator", "/transformations/add", "/validation-rules/add", "/routing-rules/add", "/connectors/add", "/alerts/add"];
const engineerRoutePatterns = [
  /^\/channels\/[^/]+\/edit$/,
  /^\/channels\/[^/]+\/designer$/,
  /^\/transformations\/[^/]+\/edit$/,
  /^\/validation-rules\/[^/]+\/edit$/,
  /^\/routing-rules\/[^/]+\/edit$/,
  /^\/connectors\/[^/]+\/edit$/,
  /^\/alerts\/[^/]+\/edit$/,
];

export function normalizeRole(role: string | null | undefined): UserRole {
  if (role === "admin" || role === "engineer" || role === "viewer") {
    return role;
  }

  return "viewer";
}

export function canCreate(role: UserRole) {
  return role === "admin" || role === "engineer";
}

export function canEdit(role: UserRole) {
  return role === "admin" || role === "engineer";
}

export function canDelete(role: UserRole) {
  return role === "admin";
}

export function canManageUsers(role: UserRole) {
  return role === "admin";
}

export function canManageSecurity(role: UserRole) {
  return role === "admin";
}

export function canViewOnly(role: UserRole) {
  return role === "viewer";
}

export function getPermissions(role: UserRole) {
  return {
    canCreate: canCreate(role),
    canEdit: canEdit(role),
    canDelete: canDelete(role),
    canManageUsers: canManageUsers(role),
    canManageSecurity: canManageSecurity(role),
    canViewOnly: canViewOnly(role),
  };
}

export function isProtectedAppRoute(path: string) {
  return protectedRoutePrefixes.some((prefix) => path.startsWith(prefix));
}

export function isAuthOnlyRoute(path: string) {
  return authOnlyRoutes.has(path);
}

export function isAdminRoute(path: string) {
  return adminRoutePrefixes.some((prefix) => path.startsWith(prefix));
}

export function isEngineerRoute(path: string) {
  return engineerRoutePrefixes.some((prefix) => path.startsWith(prefix))
    || engineerRoutePatterns.some((pattern) => pattern.test(path));
}

export function canAccessPath(role: UserRole, path: string) {
  if (isAdminRoute(path)) {
    return role === "admin";
  }

  if (isEngineerRoute(path)) {
    return role !== "viewer";
  }

  return true;
}