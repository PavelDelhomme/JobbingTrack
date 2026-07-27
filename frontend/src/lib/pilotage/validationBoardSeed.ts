import type {
  ValidationBoardFile,
  ValidationTask,
} from "@/lib/pilotage/validationBoardTypes";

function task(
  partial: Omit<ValidationTask, "porteurNote" | "history"> &
    Partial<Pick<ValidationTask, "porteurNote" | "history">>,
): ValidationTask {
  return {
    porteurNote: "",
    history: [],
    ...partial,
  };
}

/** Seed phase B2 active — checklists + cycles. */
export function buildSeedValidationBoard(): ValidationBoardFile {
  const tasks: ValidationTask[] = [
    task({
      id: "MOB-ENT-01",
      cycleId: "correctifs-2207",
      section: "Correctifs session 22/07",
      label:
        "Onglet Entreprises : voir OVHcloud, Capgemini, etc. ; ouvrir détail",
      description:
        "Sur Samsung (app mobile/), onglet Entreprises doit lister les mêmes noms d’entreprises que les candidatures (ex. OVHcloud, Capgemini).",
      expected:
        "Liste non vide alignée candidatures ; détail entreprise = candidatures + contacts liés.",
      status: "open",
      order: 10,
      checklist: [
        {
          id: "list-names",
          label:
            "Liste affiche OVHcloud, Capgemini, etc. (mêmes noms que candidatures)",
          done: false,
        },
        {
          id: "detail-apps",
          label: "Ouvrir une entreprise → candidatures liées visibles",
          done: false,
        },
        {
          id: "detail-contacts",
          label: "Contacts liés visibles / cohérents",
          done: false,
        },
      ],
    }),
    task({
      id: "WEB-LOGIN-01",
      cycleId: "correctifs-2207",
      section: "Correctifs session 22/07",
      label: "Login backoffice : bandeau rouge FR sans overlay Next.js",
      description:
        "Sur /login (ou backoffice), saisir un mauvais mot de passe avec un email connu.",
      expected:
        "Bandeau d’erreur en français ; pas d’overlay Next.js rouge ; pas de « Invalid email or password » en Console Error.",
      status: "open",
      order: 20,
      checklist: [
        {
          id: "banner-fr",
          label: "Message d’erreur FR visible dans la page",
          done: false,
        },
        {
          id: "no-next-overlay",
          label: "Pas d’overlay erreur Next.js rouge",
          done: false,
        },
        {
          id: "no-console-error",
          label: "Console : pas d’Error « Invalid email or password »",
          done: false,
        },
      ],
    }),
    task({
      id: "EMU-LIVE-01",
      cycleId: "correctifs-2207",
      section: "Correctifs session 22/07",
      label: "Aperçu live ADB dans /backoffice/mobile-emulator",
      description:
        "Connecter le Samsung (ou AVD), ouvrir mobile-emulator, activer Aperçu live.",
      expected:
        "Flux live visible (MJPEG) ; scrcpy PC reste le plus fluide mais l’aperçu backoffice fonctionne.",
      status: "open",
      order: 30,
      checklist: [
        {
          id: "device-listed",
          label: "Device ADB listé et sélectionnable",
          done: false,
        },
        {
          id: "live-preview",
          label: "Case Aperçu live → écran téléphone en direct",
          done: false,
        },
      ],
    }),
    task({
      id: "PILOTAGE-UI-04",
      cycleId: "correctifs-2207",
      section: "Correctifs session 22/07",
      label: "Tableau de suivi pilotage OK/KO + écriture md",
      description:
        "Dans /backoffice/pilotage (SUPER_ADMIN, dev/préprod), utiliser le tableau et les fiches détail.",
      expected:
        "Items à valider visibles ; OK/KO/PARTIEL/PLUS TARD écrivent dans les .md ; détail + checklist utilisables.",
      status: "open",
      order: 40,
      checklist: [
        {
          id: "board-list",
          label: "Liste / cycles affichés avec où j’en suis",
          done: false,
        },
        {
          id: "detail-sheet",
          label: "Fiche détail avec sous-critères",
          done: false,
        },
        {
          id: "write-md",
          label: "Une action écrit bien TODOS_A_VALIDER (dev)",
          done: false,
        },
      ],
    }),
    task({
      id: "PILOTAGE-UI-05",
      cycleId: "correctifs-2207",
      section: "Correctifs session 22/07",
      label: "Fiche détail + PARTIEL / Plus tard / cycles",
      description:
        "Dans /backoffice/pilotage : ouvrir une fiche, cocher des sous-critères, tester PARTIEL, Plus tard, et la vue Cycles (FAB).",
      expected:
        "Détail lisible mobile+desktop ; report et partiel visibles ; progression cycle FAB à jour.",
      status: "open",
      order: 45,
      checklist: [
        {
          id: "open-detail",
          label: "Ouvrir fiche détail (desktop ou mobile)",
          done: false,
        },
        {
          id: "partial-or-later",
          label: "Tester PARTIEL ou Plus tard sur une tâche",
          done: false,
        },
        {
          id: "cycle-fab",
          label: "Vue Cycles → FAB mobile affiche la progression",
          done: false,
        },
      ],
    }),
    task({
      id: "A.1–A.2c",
      cycleId: "shell-b2",
      section: "B2 — Navigation + FAB + admin",
      label: "Navigation retour",
      description: "Parcourir les onglets et vérifier le retour arrière.",
      expected: "Navigation retour stable sans crash.",
      status: "ok",
      order: 100,
      checklist: [
        { id: "nav-back", label: "Retour navigation OK", done: true },
      ],
    }),
    task({
      id: "B.3",
      cycleId: "shell-b2",
      section: "B2 — Navigation + FAB + admin",
      label: "USER drawer sans Administration",
      description:
        "Compte USER : menu drawer ne doit pas exposer Administration.",
      expected: "Pas d’entrée Administration pour USER.",
      status: "ok",
      order: 110,
      checklist: [
        {
          id: "no-admin",
          label: "Drawer USER sans Administration",
          done: true,
        },
      ],
    }),
    task({
      id: "B.4",
      cycleId: "shell-b2",
      section: "B2 — Navigation + FAB + admin",
      label: "ADMIN impersonnaliser → hub",
      description:
        "Impersonnaliser puis désimpersonnaliser vers le hub admin.",
      expected: "Retour hub admin correct.",
      status: "ok",
      order: 120,
      checklist: [
        {
          id: "impersonate",
          label: "Impersonnaliser → Désimpersonnaliser → hub",
          done: true,
        },
      ],
    }),
    task({
      id: "C.5",
      cycleId: "shell-b2",
      section: "B2 — Navigation + FAB + admin",
      label: "Liste Relances sans crash",
      description: "Ouvrir la liste Relances.",
      expected: "Pas de crash setState (fix 1.0.31+).",
      status: "ok",
      order: 130,
      checklist: [
        { id: "relances", label: "Liste Relances stable", done: true },
      ],
    }),
    task({
      id: "D.6",
      cycleId: "fab-mobile",
      section: "B2 — FAB",
      label: "FAB → Relance",
      description:
        "APK ≥ 1.0.34. Depuis une candidature : FAB → Relance → créer / modifier / corbeille. Les snackbars doivent s’effacer seules (AppSnack).",
      expected:
        "Relance créée ; snack « Relance créée » / « mise à jour » / « corbeille » auto-dismiss (~2–3 s) sans barre collée ; Voir détail OK.",
      status: "open",
      order: 25,
      checklist: [
        { id: "apk-134", label: "APK ≥ 1.0.34 installé (rebuild si besoin)", done: false },
        { id: "open-app", label: "Ouvrir une candidature", done: false },
        {
          id: "fab-relance",
          label: "FAB → Relance → formulaire (date J+3 09:00)",
          done: false,
        },
        {
          id: "create-snack",
          label: "Créer → snack auto-dismiss (pas collée)",
          done: false,
        },
        {
          id: "edit-trash",
          label: "Modifier + corbeille → snack OK, liste rafraîchie",
          done: false,
        },
      ],
    }),
    task({
      id: "APK-BUILD-01",
      cycleId: "correctifs-2207",
      section: "Correctifs session 22/07",
      label: "Rebuild APK debug sans Zip kernel_blob",
      description:
        "Backoffice Mobile → Rebuild APK. Le script clean-flutter-apk-build.sh doit éviter compressDebugAssets / kernel_blob.bin.jar.",
      expected:
        "Build vert ; APK sur disque ; téléphone réinstallé avec version = pubspec.",
      status: "open",
      order: 5,
      checklist: [
        {
          id: "rebuild-ok",
          label: "Rebuild APK réussit (pas d’erreur Zip)",
          done: false,
        },
        {
          id: "version-match",
          label: "Version téléphone = APK compilé après install",
          done: false,
        },
      ],
    }),
    task({
      id: "MOB-SNACK-01",
      cycleId: "correctifs-2207",
      section: "Correctifs session 22/07",
      label: "Snackbars relance auto-dismiss (AppSnack)",
      description:
        "Après create/edit/trash relance, la barre disparaît seule ; les messages suivants s’affichent.",
      expected: "Plus de barre collée bloquant « Relance créée / supprimée ».",
      status: "open",
      order: 22,
      checklist: [
        {
          id: "create-dismiss",
          label: "Création → snack disparaît ~2–3 s",
          done: false,
        },
        {
          id: "trash-dismiss",
          label: "Corbeille → snack visible puis dismiss",
          done: false,
        },
      ],
    }),
    task({
      id: "D.7",
      cycleId: "fab-mobile",
      section: "B2 — FAB",
      label: "FAB → Appel",
      description: "Après D.6 OK. Depuis une candidature : FAB → Appel → créer.",
      expected: "Appel créé sans crash ; snack auto-dismiss.",
      status: "deferred",
      order: 210,
      checklist: [
        { id: "fab-appel", label: "FAB → Appel → créer", done: false },
        { id: "feedback", label: "Feedback / détail OK", done: false },
      ],
    }),
    task({
      id: "D.8",
      cycleId: "fab-mobile",
      section: "B2 — FAB",
      label: "FAB → Entretien",
      description: "Après D.7 OK. FAB → Entretien → créer.",
      expected: "Entretien créé ; snack auto-dismiss.",
      status: "deferred",
      order: 220,
      checklist: [
        {
          id: "fab-entretien",
          label: "FAB → Entretien → créer",
          done: false,
        },
        { id: "feedback", label: "Feedback / détail OK", done: false },
      ],
    }),
    task({
      id: "D.9",
      cycleId: "fab-mobile",
      section: "B2 — FAB",
      label: "FAB → Contact",
      description: "Après D.8 OK. FAB → Contact → créer.",
      expected: "Contact créé ; snack auto-dismiss.",
      status: "deferred",
      order: 230,
      checklist: [
        { id: "fab-contact", label: "FAB → Contact → créer", done: false },
        { id: "feedback", label: "Feedback / détail OK", done: false },
      ],
    }),
    task({
      id: "E.10",
      cycleId: "shell-b2",
      section: "B2 — Shell",
      label: "Re-tap Candidatures",
      description: "Après FAB D.6–D.9. Re-taper l’onglet Candidatures.",
      expected: "Comportement shell attendu sans crash.",
      status: "deferred",
      order: 300,
      checklist: [
        { id: "retap", label: "Re-tap Candidatures OK", done: false },
      ],
    }),
    task({
      id: "E.11",
      cycleId: "shell-b2",
      section: "B2 — Shell",
      label: "Contacts → FAB +",
      description: "Après E.10. Depuis l’onglet Contacts, FAB +.",
      expected: "FAB accessible et création possible.",
      status: "deferred",
      order: 310,
      checklist: [
        {
          id: "contacts-fab",
          label: "Contacts → FAB + fonctionne",
          done: false,
        },
      ],
    }),
    task({
      id: "F.12",
      cycleId: "shell-b2",
      section: "B2 — Shell",
      label: "Accueil double retour",
      description: "Après E. Depuis Accueil, double retour système.",
      expected:
        "Comportement double retour conforme (pas de crash / sortie contrôlée).",
      status: "deferred",
      order: 320,
      checklist: [
        { id: "double-back", label: "Double retour Accueil OK", done: false },
      ],
    }),
  ];

  const map: Record<string, ValidationTask> = {};
  for (const t of tasks) map[t.id] = t;

  // Colonnes Kanban ADHD (pas tout « en cours »)
  const setCol = (
    id: string,
    column: NonNullable<ValidationTask["column"]>,
    status?: ValidationTask["status"],
  ) => {
    if (!map[id]) return;
    map[id].column = column;
    if (status) map[id].status = status;
    map[id].kind = map[id].kind || "task";
  };
  setCol("APK-BUILD-01", "doing", "open");
  setCol("MOB-ENT-01", "rework", "rework");
  setCol("MOB-SNACK-01", "backlog", "open");
  setCol("D.6", "backlog", "open");
  setCol("WEB-LOGIN-01", "done", "ok");
  setCol("EMU-LIVE-01", "done", "ok");
  setCol("PILOTAGE-UI-04", "a_valider", "open");
  setCol("PILOTAGE-UI-05", "a_valider", "open");
  for (const id of ["D.7", "D.8", "D.9", "E.10", "E.11", "F.12"]) {
    setCol(id, "later", "deferred");
  }
  for (const id of ["A.1–A.2c", "B.3", "B.4", "C.5"]) {
    setCol(id, "done", "ok");
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    focusTaskId: "APK-BUILD-01",
    cycles: [
      {
        id: "correctifs-2207",
        label: "Correctifs + rebuild",
        description: "MOB-ENT, login, émulateur, pilotage UI, APK, snacks",
        itemIds: [
          "APK-BUILD-01",
          "MOB-ENT-01",
          "MOB-SNACK-01",
          "WEB-LOGIN-01",
          "EMU-LIVE-01",
          "PILOTAGE-UI-04",
          "PILOTAGE-UI-05",
        ],
      },
      {
        id: "fab-mobile",
        label: "FAB mobile (B2 D.6→D.9)",
        description: "Ordre strict : Relance → Appel → Entretien → Contact",
        itemIds: ["D.6", "D.7", "D.8", "D.9"],
      },
      {
        id: "shell-b2",
        label: "Shell B2 (nav / admin / shell)",
        description: "Déjà OK partiel ; E/F après FAB",
        itemIds: [
          "A.1–A.2c",
          "B.3",
          "B.4",
          "C.5",
          "E.10",
          "E.11",
          "F.12",
        ],
      },
    ],
    tasks: map,
  };
}
