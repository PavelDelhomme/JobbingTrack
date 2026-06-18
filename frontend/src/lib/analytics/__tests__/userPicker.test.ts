import {
  formatAnalyticsUserLabel,
  analyticsUserSuggestions,
} from "../userPicker";

describe("formatAnalyticsUserLabel", () => {
  it("affiche nom, email et rôle", () => {
    expect(
      formatAnalyticsUserLabel({
        id: "1",
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean@test.com",
        role: "USER",
      }),
    ).toBe("Jean Dupont · jean@test.com (USER)");
  });

  it("retombe sur email si nom absent", () => {
    expect(
      formatAnalyticsUserLabel({
        id: "2",
        firstName: "",
        lastName: "",
        email: "admin@test.com",
        role: "ADMIN",
      }),
    ).toBe("admin@test.com (ADMIN)");
  });
});

describe("analyticsUserSuggestions", () => {
  it("mappe id → label", () => {
    const rows = analyticsUserSuggestions([
      {
        id: "abc",
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        role: "USER",
      },
    ]);
    expect(rows).toEqual([{ value: "abc", label: "A B · a@b.com (USER)" }]);
  });
});
