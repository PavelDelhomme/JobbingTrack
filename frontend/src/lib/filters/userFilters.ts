import type { UserStatusFilter, UserTestFilter } from "./userFilterOptions";

export type UserListFilters = {
  query: string;
  role: string;
  testFilter: UserTestFilter;
  statusFilter: UserStatusFilter;
};

export type FilterableUser = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  isActive?: boolean;
};

export function filterUsers<T extends FilterableUser>(
  users: T[],
  filters: Pick<UserListFilters, "query" | "role" | "statusFilter">,
): T[] {
  const query = filters.query.trim().toLowerCase();
  const role = filters.role.trim();
  const status = filters.statusFilter;

  return users.filter((user) => {
    if (status === "active" && user.isActive !== true) return false;
    if (status === "inactive" && user.isActive !== false) return false;
    if (role && user.role !== role) return false;

    if (!query) return true;
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`
      .trim()
      .toLowerCase();
    return (
      String(user.email || "")
        .toLowerCase()
        .includes(query) || fullName.includes(query)
    );
  });
}
