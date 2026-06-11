import {
  BarChart3,
  Calendar,
  Database,
  FileText,
  MailCheck,
  Monitor,
  Play,
  Server,
  Shield,
  Zap,
} from "lucide-react";

/** Catégories lançables depuis le hub (endpoint API run-*) */
export const RUNNABLE_IDS = [
  "api",
  "backend",
  "frontend",
  "backoffice",
  "backoffice-only",
  "database",
  "security",
  "performance",
  "metrics-p1b",
  "email-triage",
  "playwright",
  "emails",
  "emails-mailhog",
] as const;

export const RUN_API: Record<string, string | string[]> = {
  api: "/api/test/run-api",
  backend: "/api/test/run-backend",
  frontend: "/api/test/run-frontend",
  backoffice: "/api/test/run-backoffice",
  "backoffice-only": "/api/test/run-backoffice-only",
  database: "/api/test/run-database",
  security: "/api/test/run-security",
  performance: [
    "/api/test/run-performance-backend",
    "/api/test/run-performance-frontend",
  ],
  "metrics-p1b": "/api/test/run-metrics-p1b",
  "email-triage": "/api/test/run-email-triage",
  playwright: "/api/test/run-playwright",
  emails: "/api/test/run-emails",
  "emails-mailhog": "/api/test/run-playwright-mailhog",
};

export const CATEGORIES = [
  {
    id: "api",
    name: "Tests API",
    description: "Lancer les tests API et consulter les rapports",
    href: "/b4ck0ff1ce/tests-api",
    icon: Server,
    bgClass:
      "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    textClass: "text-blue-700 dark:text-blue-300",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "backend",
    name: "Tests Backend",
    description:
      "Tests des services backend (auth, companies, applications, etc.)",
    href: "/b4ck0ff1ce/tests-backend",
    icon: Server,
    bgClass:
      "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    textClass: "text-purple-700 dark:text-purple-300",
    iconClass: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "frontend",
    name: "Tests Frontend",
    description: "Tests unitaires des composants et du frontend",
    href: "/b4ck0ff1ce/tests-frontend",
    icon: Monitor,
    bgClass:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    textClass: "text-green-700 dark:text-green-300",
    iconClass: "text-green-600 dark:text-green-400",
  },
  {
    id: "backoffice",
    name: "Tests Backoffice",
    description: "Tests E2E de l'interface d'administration",
    href: "/b4ck0ff1ce/tests-backoffice",
    icon: Shield,
    bgClass:
      "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
    textClass: "text-indigo-700 dark:text-indigo-300",
    iconClass: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "backoffice-only",
    name: "Backoffice uniquement",
    description: "Uniquement le spec backoffice.spec.ts (rapide)",
    href: "/b4ck0ff1ce/tests-backoffice",
    icon: Shield,
    bgClass:
      "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
    textClass: "text-indigo-700 dark:text-indigo-300",
    iconClass: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "database",
    name: "Tests BDD",
    description: "Tests base de données (connexion, enums, relations)",
    href: "/b4ck0ff1ce/tests-backend",
    icon: Database,
    bgClass:
      "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800",
    textClass: "text-violet-700 dark:text-violet-300",
    iconClass: "text-violet-600 dark:text-violet-400",
  },
  {
    id: "security",
    name: "Tests Sécurité",
    description: "WAF, authentification, injection, en-têtes",
    href: "/b4ck0ff1ce/tests-security",
    icon: Shield,
    bgClass: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    textClass: "text-red-700 dark:text-red-300",
    iconClass: "text-red-600 dark:text-red-400",
  },
  {
    id: "performance",
    name: "Tests Performance",
    description: "Métriques de charge et temps de réponse",
    href: "/b4ck0ff1ce/performance-tests",
    icon: Zap,
    bgClass:
      "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    textClass: "text-amber-700 dark:text-amber-300",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "metrics-p1b",
    name: "Suite P1B latence",
    description:
      "Jest ciblé : services prioritaires, Postgres santé Docker, panneau latence",
    href: "/b4ck0ff1ce/statistics",
    icon: BarChart3,
    bgClass: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800",
    textClass: "text-sky-700 dark:text-sky-300",
    iconClass: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "email-triage",
    name: "Agent email / triage",
    description:
      "Suite dédiée : classification candidature, digest programmé, expéditeur JobbingTrack",
    href: "/b4ck0ff1ce/test-reports",
    icon: MailCheck,
    bgClass:
      "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800",
    textClass: "text-teal-700 dark:text-teal-300",
    iconClass: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "playwright",
    name: "Tests Playwright",
    description: "Tests E2E Playwright (scénarios complets)",
    href: "/b4ck0ff1ce/playwright-tests",
    icon: Play,
    bgClass:
      "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800",
    textClass: "text-cyan-700 dark:text-cyan-300",
    iconClass: "text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "schedule",
    name: "Programmer tests",
    description: "Planifier l'exécution automatique des tests",
    href: "/b4ck0ff1ce/performance-tests/schedule",
    icon: Calendar,
    bgClass:
      "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700",
    textClass: "text-slate-700 dark:text-slate-300",
    iconClass: "text-slate-600 dark:text-slate-400",
  },
  {
    id: "reports",
    name: "Rapports de tests",
    description:
      "Consulter tous les rapports générés (API, backend, frontend, E2E, etc.)",
    href: "/b4ck0ff1ce/test-reports",
    icon: FileText,
    bgClass:
      "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    textClass: "text-emerald-700 dark:text-emerald-300",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
];
