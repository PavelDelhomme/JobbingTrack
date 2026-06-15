import type { UserTestFilter } from "./userFilterOptions";

export type UserListFilters = {
  query: string;
  role: string;
  testFilter: UserTestFilter;
};

export type FilterableUser = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
};

export function filterUsers<T extends FilterableUser>(
  users: T[],
  filters: Pick<UserListFilters, "query" | "role">,
): T[] {
  const query = filters.query.trim().toLowerCase();
  const role = filters.role.trim();

  return users.filter((user) => {
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
