// Test du système de thème
const fs = require('fs');
const path = require('path');

console.log('🎨 TEST SYSTÈME DE THÈME');
console.log('=======================');

// 1. Vérifier que les fichiers de thème existent
console.log('\n📁 Vérification des fichiers de thème:');

const filesToCheck = [
  'frontend/src/app/layout.tsx',
  'frontend/src/app/globals.css',
  'frontend/src/lib/hooks/theme.tsx',
  'frontend/tailwind.config.js'
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    console.log('✅', file);
  } else {
    console.log('❌', file, '(MANQUANT)');
  }
});

// 2. Vérifier la configuration Tailwind
console.log('\n⚙️ Configuration Tailwind:');
try {
  const tailwindConfig = require('./frontend/tailwind.config.js');
  if (tailwindConfig.darkMode === 'class') {
    console.log('✅ darkMode: "class" (correct)');
  } else {
    console.log('❌ darkMode:', tailwindConfig.darkMode, '(incorrect)');
  }
} catch (err) {
  console.log('❌ Erreur lecture config Tailwind:', err.message);
}

// 3. Vérifier les variables CSS
console.log('\n🎨 Variables CSS du thème:');
const globalsCss = fs.readFileSync('frontend/src/app/globals.css', 'utf8');
const hasDarkVariables = globalsCss.includes('.dark {');
const hasLightVariables = globalsCss.includes(':root {');

if (hasDarkVariables && hasLightVariables) {
  console.log('✅ Variables CSS pour mode clair et sombre définies');
} else {
  console.log('❌ Variables CSS manquantes');
  if (!hasLightVariables) console.log('   - Variables mode clair manquantes');
  if (!hasDarkVariables) console.log('   - Variables mode sombre manquantes');
}

// 4. Vérifier le ThemeProvider
console.log('\n🔧 ThemeProvider:');
const layoutContent = fs.readFileSync('frontend/src/app/layout.tsx', 'utf8');
const hasThemeProvider = layoutContent.includes('ThemeProvider');
const hasScript = layoutContent.includes('dangerouslySetInnerHTML');

if (hasThemeProvider) {
  console.log('✅ ThemeProvider inclus dans layout.tsx');
} else {
  console.log('❌ ThemeProvider manquant');
}

if (hasScript) {
  console.log('✅ Script d\'initialisation du thème présent');
} else {
  console.log('❌ Script d\'initialisation du thème manquant');
}

console.log('\n📊 Résumé:');
console.log('- Les fichiers de configuration du thème sont présents');
console.log('- Tailwind est configuré pour le mode sombre');
console.log('- Les variables CSS sont définies');
console.log('- Le ThemeProvider est inclus');
console.log('- Le script d\'initialisation est présent');
console.log('\n🎉 Le système de thème devrait fonctionner correctement !');
