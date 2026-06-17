import { filterUsers } from "./userFilters";

const users = [
  {
    email: "admin@jobbingtrack.test",
    firstName: "Alice",
    lastName: "Admin",
    role: "ADMIN",
    isActive: true,
  },
  {
    email: "paul@example.com",
    firstName: "Paul",
    lastName: "User",
    role: "USER",
    isActive: true,
  },
  {
    email: "guest@example.com",
    firstName: "Guest",
    lastName: "Demo",
    role: "GUEST",
    isActive: false,
  },
];

describe("filterUsers", () => {
  it("filtre par email ou nom", () => {
    expect(
      filterUsers(users, { query: "paul", role: "", statusFilter: "all" }),
    ).toHaveLength(1);
    expect(
      filterUsers(users, { query: "alice admin", role: "", statusFilter: "all" }),
    ).toHaveLength(1);
  });

  it("filtre par rôle", () => {
    const result = filterUsers(users, {
      query: "",
      role: "ADMIN",
      statusFilter: "all",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.email).toBe("admin@jobbingtrack.test");
  });

  it("filtre par statut actif/inactif", () => {
    expect(
      filterUsers(users, { query: "", role: "", statusFilter: "active" }),
    ).toHaveLength(2);
    expect(
      filterUsers(users, { query: "", role: "", statusFilter: "inactive" }),
    ).toHaveLength(1);
    expect(
      filterUsers(users, { query: "", role: "", statusFilter: "inactive" })[0]
        ?.email,
    ).toBe("guest@example.com");
  });

  it("combine recherche et rôle", () => {
    expect(
      filterUsers(users, { query: "example", role: "USER", statusFilter: "all" }),
    ).toHaveLength(1);
    expect(
      filterUsers(users, { query: "example", role: "ADMIN", statusFilter: "all" }),
    ).toHaveLength(0);
  });
});
