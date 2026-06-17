export const USER_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actifs uniquement" },
  { value: "inactive", label: "Inactifs uniquement" },
] as const;

export type UserStatusFilter =
  (typeof USER_STATUS_FILTER_OPTIONS)[number]["value"];

export const USER_ROLE_FILTER_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Administrateurs" },
  { value: "ADMIN", label: "Administrateurs" },
  { value: "USER", label: "Utilisateurs" },
  { value: "GUEST", label: "Invités" },
] as const;

export const USER_TEST_FILTER_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "test", label: "Utilisateurs de test uniquement" },
  { value: "nottest", label: "Hors test" },
] as const;

export type UserTestFilter = (typeof USER_TEST_FILTER_OPTIONS)[number]["value"];
