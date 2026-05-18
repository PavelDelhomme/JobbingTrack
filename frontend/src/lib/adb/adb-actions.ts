/**
 * Catalogue d'actions mobiles individuelles reutilisables.
 * Chaque action est parametrable et peut etre utilisee dans les parcours personnalises.
 */
import { AdbClient } from "./adb-client";

export type ActionParamType = "text" | "number" | "select" | "boolean";

export interface ActionParam {
  key: string;
  label: string;
  type: ActionParamType;
  default?: string | number | boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

export interface MobileAction {
  id: string;
  name: string;
  description: string;
  category:
    | "navigation"
    | "saisie"
    | "geste"
    | "verification"
    | "auth"
    | "attente";
  icon: string;
  params: ActionParam[];
}

export const MOBILE_ACTIONS: MobileAction[] = [
  // ─── Auth ──────────────────────────────────────────────────────
  {
    id: "mob_ensure_logged_out",
    name: "Deconnexion si necessaire",
    description: "Detecte l'etat de l'app et se deconnecte si besoin",
    category: "auth",
    icon: "🔓",
    params: [],
  },
  {
    id: "mob_login",
    name: "Connexion complete",
    description: "Saisit email + mot de passe et se connecte",
    category: "auth",
    icon: "🔐",
    params: [
      {
        key: "email",
        label: "Email",
        type: "text",
        default: "admin@jobbingtrack.com",
        placeholder: "Email de connexion",
        required: true,
      },
      {
        key: "password",
        label: "Mot de passe",
        type: "text",
        default: "password123",
        placeholder: "Mot de passe",
        required: true,
      },
    ],
  },
  {
    id: "mob_logout",
    name: "Deconnexion",
    description: "Se deconnecte de l'app",
    category: "auth",
    icon: "🚪",
    params: [],
  },

  // ─── Navigation ────────────────────────────────────────────────
  {
    id: "mob_tap",
    name: "Tap element",
    description: "Tap sur un element par son texte ou label",
    category: "navigation",
    icon: "👆",
    params: [
      {
        key: "text",
        label: "Texte a chercher",
        type: "text",
        placeholder: "Ex: Se connecter",
        required: true,
      },
      {
        key: "index",
        label: "Index (si plusieurs)",
        type: "number",
        default: 0,
      },
    ],
  },
  {
    id: "mob_tap_tab",
    name: "Tap onglet (bottom bar)",
    description: "Tap sur un onglet de la barre de navigation",
    category: "navigation",
    icon: "📑",
    params: [
      {
        key: "tab",
        label: "Numero d'onglet",
        type: "select",
        default: "1",
        required: true,
        options: [
          { value: "1", label: "Onglet 1 (Accueil)" },
          { value: "2", label: "Onglet 2 (Candidatures)" },
          { value: "3", label: "Onglet 3" },
          { value: "4", label: "Onglet 4" },
          { value: "5", label: "Onglet 5 (Profil)" },
          { value: "6", label: "Onglet 6" },
        ],
      },
    ],
  },
  {
    id: "mob_open_drawer",
    name: "Ouvrir menu lateral",
    description: "Swipe pour ouvrir le navigation drawer",
    category: "navigation",
    icon: "☰",
    params: [],
  },
  {
    id: "mob_drawer_item",
    name: "Tap item du drawer",
    description: "Ouvre le drawer et tape sur un item par son texte",
    category: "navigation",
    icon: "📂",
    params: [
      {
        key: "text",
        label: "Texte de l'item",
        type: "text",
        placeholder: "Ex: Relances",
        required: true,
      },
      {
        key: "scroll",
        label: "Scroller avant",
        type: "boolean",
        default: false,
      },
    ],
  },
  {
    id: "mob_back",
    name: "Retour (Back)",
    description: "Appuie sur le bouton Back Android",
    category: "navigation",
    icon: "◀️",
    params: [],
  },
  {
    id: "mob_home",
    name: "Home",
    description: "Appuie sur le bouton Home Android",
    category: "navigation",
    icon: "🏠",
    params: [],
  },

  // ─── Saisie ────────────────────────────────────────────────────
  {
    id: "mob_type_in_field",
    name: "Saisir dans un champ",
    description: "Trouve un champ par son hint et y saisit du texte",
    category: "saisie",
    icon: "⌨️",
    params: [
      {
        key: "hint",
        label: "Hint du champ",
        type: "text",
        placeholder: "Ex: Email",
        required: true,
      },
      {
        key: "value",
        label: "Texte a saisir",
        type: "text",
        placeholder: "Ex: admin@jobbingtrack.com",
        required: true,
      },
    ],
  },
  {
    id: "mob_close_keyboard",
    name: "Fermer clavier",
    description: "Ferme le clavier virtuel (Back)",
    category: "saisie",
    icon: "⬇️",
    params: [],
  },

  // ─── Gestes ────────────────────────────────────────────────────
  {
    id: "mob_scroll_down",
    name: "Scroll vers le bas",
    description: "Scroll vers le bas de l'ecran",
    category: "geste",
    icon: "⬇️",
    params: [
      { key: "amount", label: "Distance (px)", type: "number", default: 800 },
    ],
  },
  {
    id: "mob_scroll_up",
    name: "Scroll vers le haut",
    description: "Scroll vers le haut de l'ecran",
    category: "geste",
    icon: "⬆️",
    params: [
      { key: "amount", label: "Distance (px)", type: "number", default: 800 },
    ],
  },
  {
    id: "mob_swipe",
    name: "Swipe personnalise",
    description: "Swipe d'un point a un autre",
    category: "geste",
    icon: "👉",
    params: [
      {
        key: "x1",
        label: "X depart",
        type: "number",
        default: 540,
        required: true,
      },
      {
        key: "y1",
        label: "Y depart",
        type: "number",
        default: 1600,
        required: true,
      },
      {
        key: "x2",
        label: "X arrivee",
        type: "number",
        default: 540,
        required: true,
      },
      {
        key: "y2",
        label: "Y arrivee",
        type: "number",
        default: 600,
        required: true,
      },
      { key: "duration", label: "Duree (ms)", type: "number", default: 400 },
    ],
  },
  {
    id: "mob_tap_coords",
    name: "Tap coordonnees",
    description: "Tap a des coordonnees precises",
    category: "geste",
    icon: "🎯",
    params: [
      { key: "x", label: "X", type: "number", default: 540, required: true },
      { key: "y", label: "Y", type: "number", default: 1100, required: true },
    ],
  },

  // ─── Verification ──────────────────────────────────────────────
  {
    id: "mob_assert_text",
    name: "Verifier texte present",
    description: "Verifie qu'un texte est affiche a l'ecran",
    category: "verification",
    icon: "✅",
    params: [
      {
        key: "text",
        label: "Texte attendu",
        type: "text",
        placeholder: "Ex: Bonjour",
        required: true,
      },
    ],
  },
  {
    id: "mob_assert_not_text",
    name: "Verifier texte absent",
    description: "Verifie qu'un texte n'est PAS affiche",
    category: "verification",
    icon: "🚫",
    params: [
      {
        key: "text",
        label: "Texte qui ne doit pas etre present",
        type: "text",
        required: true,
      },
    ],
  },
  {
    id: "mob_wait_for",
    name: "Attendre element",
    description: "Attend qu'un texte apparaisse (avec timeout)",
    category: "verification",
    icon: "⏳",
    params: [
      { key: "text", label: "Texte attendu", type: "text", required: true },
      { key: "timeout", label: "Timeout (ms)", type: "number", default: 30000 },
    ],
  },

  // ─── Attente ───────────────────────────────────────────────────
  {
    id: "mob_wait",
    name: "Pause",
    description: "Attendre un certain temps avant la prochaine action",
    category: "attente",
    icon: "⏸️",
    params: [
      {
        key: "ms",
        label: "Duree (ms)",
        type: "number",
        default: 2000,
        required: true,
      },
    ],
  },
];

export const ACTION_CATEGORIES = {
  auth: { label: "Authentification", color: "indigo" },
  navigation: { label: "Navigation", color: "blue" },
  saisie: { label: "Saisie", color: "emerald" },
  geste: { label: "Gestes", color: "amber" },
  verification: { label: "Verification", color: "purple" },
  attente: { label: "Attente", color: "gray" },
} as const;

/**
 * Execute une action mobile individuelle avec ses parametres.
 */
export async function executeMobileAction(
  actionId: string,
  params: Record<string, any>,
  adb: AdbClient,
): Promise<string> {
  switch (actionId) {
    case "mob_ensure_logged_out": {
      const onDash = await adb.uiContains("Bonjour");
      if (onDash) {
        await adb.tap("connexion");
        await adb.wait(4000);
        return "Deconnexion effectuee";
      }
      const hasLogin = await adb.uiContains("Se connecter");
      if (hasLogin) return "Deja sur ecran de connexion";
      for (let i = 0; i < 3; i++) {
        await adb.back();
        await adb.wait(2000);
        if (await adb.uiContains("Se connecter"))
          return "Retour ecran connexion";
        if (await adb.uiContains("Bonjour")) {
          await adb.tap("connexion");
          await adb.wait(4000);
          return "Deconnexion effectuee";
        }
      }
      return "Navigation vers login";
    }

    case "mob_login": {
      const email = params.email || "admin@jobbingtrack.com";
      const password = params.password || "password123";
      await adb.wait(500);
      await adb.typeInField("Email", email);
      await adb.wait(800);
      await adb.typeInField("Mot de passe", password);
      await adb.wait(500);
      await adb.closeKeyboard();
      await adb.wait(800);
      await adb.tap("connecter");
      await adb.wait(4000);
      return `Connecte avec ${email}`;
    }

    case "mob_logout": {
      if (await adb.uiContains("connexion")) {
        await adb.tap("connexion");
        await adb.wait(4000);
        return "Deconnecte";
      }
      try {
        await adb.tapTab(1);
        await adb.wait(2000);
      } catch {}
      await adb.tap("connexion");
      await adb.wait(4000);
      return "Deconnecte";
    }

    case "mob_tap": {
      const text = params.text;
      if (!text) throw new Error('Parametre "text" requis');
      const msg = await adb.tap(text, params.index || 0);
      await adb.wait(1500);
      return msg;
    }

    case "mob_tap_tab": {
      const tab = parseInt(params.tab || "1");
      const tabVisible = await adb.uiContains(`Tab ${tab} of`);
      if (!tabVisible) {
        await adb.back();
        await adb.wait(1500);
      }
      await adb.tapTab(tab);
      await adb.wait(2000);
      return `Onglet ${tab}`;
    }

    case "mob_open_drawer": {
      await adb.openDrawer();
      await adb.wait(1500);
      return "Drawer ouvert";
    }

    case "mob_drawer_item": {
      const text = params.text;
      if (!text) throw new Error('Parametre "text" requis');
      if (params.scroll) {
        await adb.drawerScrollDown();
        await adb.wait(800);
      }
      await adb.tap(text);
      await adb.wait(2500);
      return `Tap "${text}"`;
    }

    case "mob_back": {
      await adb.back();
      await adb.wait(2000);
      return "Retour";
    }

    case "mob_home": {
      await adb.home();
      await adb.wait(1000);
      return "Home";
    }

    case "mob_type_in_field": {
      const hint = params.hint;
      const value = params.value;
      if (!hint || !value)
        throw new Error('Parametres "hint" et "value" requis');
      await adb.typeInField(hint, value);
      await adb.wait(600);
      return `Saisi "${value}" dans "${hint}"`;
    }

    case "mob_close_keyboard": {
      await adb.closeKeyboard();
      await adb.wait(500);
      return "Clavier ferme";
    }

    case "mob_scroll_down": {
      await adb.scrollDown(params.amount || 800);
      await adb.wait(1000);
      return "Scroll bas";
    }

    case "mob_scroll_up": {
      await adb.scrollUp(params.amount || 800);
      await adb.wait(1000);
      return "Scroll haut";
    }

    case "mob_swipe": {
      await adb.swipe(
        params.x1 ?? 540,
        params.y1 ?? 1600,
        params.x2 ?? 540,
        params.y2 ?? 600,
        params.duration ?? 400,
      );
      await adb.wait(1000);
      return `Swipe (${params.x1},${params.y1})->(${params.x2},${params.y2})`;
    }

    case "mob_tap_coords": {
      await adb.tapCoords(params.x ?? 540, params.y ?? 1100);
      await adb.wait(1500);
      return `Tap (${params.x}, ${params.y})`;
    }

    case "mob_assert_text": {
      const found = await adb.uiContains(params.text);
      if (!found)
        throw new Error(`Texte "${params.text}" non trouve a l'ecran`);
      return `"${params.text}" present`;
    }

    case "mob_assert_not_text": {
      const present = await adb.uiContains(params.text);
      if (present)
        throw new Error(
          `Texte "${params.text}" est present alors qu'il ne devrait pas`,
        );
      return `"${params.text}" absent (OK)`;
    }

    case "mob_wait_for": {
      const found = await adb.waitForElement(
        params.text,
        params.timeout || 30000,
      );
      if (!found)
        throw new Error(
          `"${params.text}" non apparu apres ${params.timeout || 30000}ms`,
        );
      return `"${params.text}" apparu`;
    }

    case "mob_wait": {
      await adb.wait(params.ms || 2000);
      return `Pause ${params.ms || 2000}ms`;
    }

    default:
      throw new Error(`Action mobile "${actionId}" inconnue`);
  }
}
