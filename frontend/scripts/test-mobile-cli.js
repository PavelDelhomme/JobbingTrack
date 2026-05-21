#!/usr/bin/env node

/**
 * Interface CLI Interactive pour Tests Mobile Playwright
 * JobbingTrack - Tests E2E Mobile avec interface en ligne de commande
 */

const { execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

// Couleurs ANSI
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// Configuration
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5003";
const API_URL = process.env.API_GATEWAY_URL || "http://localhost:5002";
const TEST_DIR = path.join(__dirname, "../tests/e2e/mobile");

// Interface readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Menu principal
const menu = {
  title: "📱 TESTS MOBILE INTERACTIFS - JobbingTrack",
  options: [
    { id: "1", label: "🧪 Tous les tests mobile (complet)", command: "all" },
    { id: "2", label: "🔐 Tests Authentification", command: "auth" },
    { id: "3", label: "📋 Tests Candidatures", command: "applications" },
    { id: "4", label: "👥 Tests Contacts", command: "contacts" },
    { id: "5", label: "📞 Tests Appels", command: "calls" },
    { id: "6", label: "📅 Tests Entretiens", command: "interviews" },
    { id: "7", label: "🔔 Tests Relances", command: "followups" },
    { id: "8", label: "🔔 Tests Notifications", command: "notifications" },
    { id: "9", label: "📊 Tests Dashboard mobile", command: "dashboard" },
    { id: "10", label: "🎨 Tests UX/UI mobile", command: "ux" },
    { id: "11", label: "⚡ Tests Performance", command: "performance" },
    {
      id: "12",
      label: "📱 Tests sur différents appareils",
      command: "devices",
    },
    { id: "13", label: "🎬 Mode UI interactif (Playwright UI)", command: "ui" },
    { id: "14", label: "🐛 Mode Debug (step by step)", command: "debug" },
    {
      id: "15",
      label: "📸 Captures d'écran uniquement",
      command: "screenshots",
    },
    { id: "16", label: "📊 Voir le rapport HTML", command: "report" },
    { id: "0", label: "❌ Quitter", command: "exit" },
  ],
};

// Appareils disponibles
const devices = [
  { name: "iPhone 13 Pro", value: "iPhone 13 Pro" },
  { name: "iPhone SE", value: "iPhone SE" },
  { name: "iPhone 12 Pro Max", value: "iPhone 12 Pro Max" },
  { name: "Pixel 5 (Android)", value: "Pixel 5" },
  { name: "Galaxy S21 (Android)", value: "Galaxy S21" },
];

// Afficher le menu
function displayMenu() {
  console.clear();
  console.log(
    colorize(
      "╔════════════════════════════════════════════════════════╗",
      "cyan",
    ),
  );
  console.log(
    colorize(
      "║  📱 TESTS MOBILE INTERACTIFS - JobbingTrack            ║",
      "cyan",
    ),
  );
  console.log(
    colorize(
      "╚════════════════════════════════════════════════════════╝",
      "cyan",
    ),
  );
  console.log();
  console.log(
    colorize(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "blue",
    ),
  );
  console.log(colorize("📱 MENU PRINCIPAL - Tests Mobile", "yellow"));
  console.log(
    colorize(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "blue",
    ),
  );
  console.log();

  menu.options.forEach((option) => {
    console.log(`${colorize(option.id, "green")}. ${option.label}`);
  });

  console.log();
  console.log(
    colorize(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "blue",
    ),
  );
}

// Vérifier les services
function checkServices() {
  console.log(colorize("🔍 Vérification des services...", "blue"));

  try {
    execSync(`curl -s ${FRONTEND_URL} > /dev/null 2>&1`, { stdio: "ignore" });
    console.log(colorize("✅ Frontend accessible", "green"));
  } catch (error) {
    console.log(colorize("❌ Frontend non accessible", "red"));
    return false;
  }

  try {
    execSync(`curl -s ${API_URL}/health > /dev/null 2>&1`, { stdio: "ignore" });
    console.log(colorize("✅ API Gateway accessible", "green"));
  } catch (error) {
    console.log(colorize("❌ API Gateway non accessible", "red"));
    return false;
  }

  return true;
}

// Exécuter les tests
function runTests(testFile, device, mode = "normal") {
  const testPath = path.join(TEST_DIR, testFile);

  if (!fs.existsSync(testPath)) {
    console.log(colorize(`❌ Fichier de test non trouvé: ${testPath}`, "red"));
    return;
  }

  console.log(colorize("🚀 Lancement des tests...", "cyan"));
  console.log(colorize(`Fichier: ${testFile}`, "blue"));
  if (device) {
    console.log(colorize(`Appareil: ${device}`, "blue"));
  }
  console.log();

  let command = `cd ${path.join(__dirname, "..")} && npx playwright test ${testFile} --config=playwright.mobile.config.ts`;

  if (device) {
    command += ` --project="${device}"`;
  }

  switch (mode) {
    case "ui":
      command += " --ui";
      break;
    case "debug":
      command += " --debug";
      break;
    case "headed":
      command += " --headed";
      break;
    case "screenshots":
      command += " --screenshot=on";
      break;
  }

  try {
    execSync(command, { stdio: "inherit", cwd: path.join(__dirname, "..") });
    console.log();
    console.log(colorize("✅ Tests terminés !", "green"));
  } catch (error) {
    console.log();
    console.log(colorize("❌ Erreur lors de l'exécution des tests", "red"));
  }
}

// Menu de sélection d'appareil
function selectDevice() {
  return new Promise((resolve) => {
    console.log();
    console.log(colorize("📱 Sélectionnez un appareil:", "yellow"));
    devices.forEach((device, index) => {
      console.log(`${index + 1}. ${device.name}`);
    });

    rl.question(colorize("\nChoix [1-5]: ", "yellow"), (answer) => {
      const choice = parseInt(answer);
      if (choice >= 1 && choice <= devices.length) {
        resolve(devices[choice - 1].value);
      } else {
        resolve(devices[0].value); // iPhone 13 Pro par défaut
      }
    });
  });
}

// Gérer le choix
function handleChoice(choice) {
  const option = menu.options.find((opt) => opt.id === choice);
  if (!option) {
    console.log(colorize("❌ Choix invalide", "red"));
    return;
  }

  switch (option.command) {
    case "all":
      runTests("mobile-complete-journey.spec.ts");
      break;
    case "auth":
      runTests("mobile-auth.spec.ts");
      break;
    case "applications":
      runTests("mobile-applications.spec.ts");
      break;
    case "contacts":
      runTests("mobile-contacts.spec.ts");
      break;
    case "calls":
      runTests("mobile-calls.spec.ts");
      break;
    case "interviews":
      runTests("mobile-interviews.spec.ts");
      break;
    case "followups":
      runTests("mobile-followups.spec.ts");
      break;
    case "notifications":
      runTests("mobile-notifications.spec.ts");
      break;
    case "dashboard":
      runTests("mobile-complete-journey.spec.ts", null, null, '-g "11. 📊"');
      break;
    case "ux":
      runTests(
        "mobile-complete-journey.spec.ts",
        null,
        null,
        '-g "12. 🎨|13. 📱"',
      );
      break;
    case "performance":
      runTests(
        "mobile-complete-journey.spec.ts",
        null,
        null,
        '-g "Performance"',
      );
      break;
    case "devices":
      selectDevice().then((device) => {
        runTests("mobile-complete-journey.spec.ts", device);
        askContinue();
      });
      return;
    case "ui":
      runTests("mobile-complete-journey.spec.ts", null, "ui");
      break;
    case "debug":
      runTests("mobile-complete-journey.spec.ts", null, "debug");
      break;
    case "screenshots":
      runTests(
        "mobile-complete-journey.spec.ts",
        null,
        "screenshots",
        '-g "15. 📸"',
      );
      break;
    case "report":
      console.log(colorize("📊 Ouverture du rapport HTML...", "green"));
      execSync(
        "cd frontend && npx playwright show-report playwright-report-mobile",
        { stdio: "inherit" },
      );
      askContinue();
      return;
    case "exit":
      console.log(colorize("👋 Au revoir !", "green"));
      process.exit(0);
      break;
  }

  askContinue();
}

// Demander de continuer
function askContinue() {
  rl.question(
    colorize("\nAppuyez sur Entrée pour continuer...", "yellow"),
    () => {
      main();
    },
  );
}

// Fonction principale
function main() {
  displayMenu();

  if (!checkServices()) {
    console.log();
    console.log(colorize("💡 Démarrez les services avec: make up", "yellow"));
    console.log(
      colorize("💡 Ou le frontend avec: cd frontend && npm run dev", "yellow"),
    );
    console.log();
    rl.question(
      colorize("Appuyez sur Entrée pour continuer...", "yellow"),
      () => {
        main();
      },
    );
    return;
  }

  console.log();
  rl.question(colorize("Votre choix [0-16]: ", "yellow"), (answer) => {
    handleChoice(answer);
  });
}

// Point d'entrée
console.log(colorize("🚀 Démarrage de l'interface de tests mobile...", "cyan"));
main();
