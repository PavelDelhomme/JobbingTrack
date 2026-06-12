import {
  filterServiceLogLines,
  lineMatchesKind,
  lineMatchesLevel,
} from "./serviceLogFilters";

const lines = [
  "api-gateway GET /api/v1/users HTTP/1.1 200",
  "auth-service warn token refresh slow",
  "profile-service Prisma query failed SELECT users",
  "worker fatal unhandledRejection timeout",
];

describe("service log filters", () => {
  it("classe les niveaux par heuristique", () => {
    expect(lines.filter((line) => lineMatchesLevel(line, "error"))).toHaveLength(
      1,
    );
    expect(lines.filter((line) => lineMatchesLevel(line, "warn"))).toHaveLength(
      1,
    );
  });

  it("classe les types HTTP et SQL", () => {
    expect(lines.filter((line) => lineMatchesKind(line, "http"))).toHaveLength(
      1,
    );
    expect(lines.filter((line) => lineMatchesKind(line, "sql"))).toHaveLength(
      1,
    );
  });

  it("combine niveau, type et recherche", () => {
    expect(
      filterServiceLogLines(lines, {
        level: "all",
        kind: "sql",
        query: "users",
      }),
    ).toEqual(["profile-service Prisma query failed SELECT users"]);
  });
});
