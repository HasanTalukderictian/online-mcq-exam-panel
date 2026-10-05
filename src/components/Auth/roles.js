// Roles that can open the admin dashboard
export const ADMIN_ROLES = ["admin", "superadmin"];

export const isAdminUser = (user) => !!user && ADMIN_ROLES.includes(user.role);