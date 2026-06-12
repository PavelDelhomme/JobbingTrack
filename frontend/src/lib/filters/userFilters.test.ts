import { filterUsers } from "./userFilters";

const users = [
  {
    email: "admin@jobbingtrack.test",
    firstName: "Alice",
    lastName: "Admin",
    role: "ADMIN",
  },
  {
    email: "paul@example.com",
    firstName: "Paul",
    lastName: "User",
    role: "USER",
  },
  {
    email: "guest@example.com",
    firstName: "Guest",
    lastName: "Demo",
    role: "GUEST",
  },
];

describe("filterUsers", () => {
  it("filtre par email ou nom", () => {
    expect(filterUsers(users, { query: "paul", role: "" })).toHaveLength(1);
    expect(filterUsers(users, { query: "alice admin", role: "" })).toHaveLength(
      1,
    );
  });

  it("filtre par rôle", () => {
    const result = filterUsers(users, { query: "", role: "ADMIN" });
    expect(result).toHaveLength(1);
    expect(result[0]?.email).toBe("admin@jobbingtrack.test");
  });

  it("combine recherche et rôle", () => {
    expect(filterUsers(users, { query: "example", role: "USER" })).toHaveLength(
      1,
    );
    expect(filterUsers(users, { query: "example", role: "ADMIN" })).toHaveLength(
      0,
    );
  });
});
