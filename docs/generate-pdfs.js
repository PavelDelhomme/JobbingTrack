const { mdToPdf } = require('md-to-pdf');
const fs = require('fs');
const path = require('path');

const docsDir = __dirname;
const pdfsDir = path.join(docsDir, 'pdfs');

// Créer le dossier pdfs s'il n'existe pas
if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
  console.log('📁 Dossier pdfs créé');
}

// Ordre logique des sections pour le PDF complet
const documentStructure = [
  // 1. Introduction
  { section: '📖 Introduction', files: [
    'README.md',
    'navigation.md'
  ]},
  
  // 2. Architecture et Infrastructure
  { section: '🏗️ Architecture et Infrastructure', files: [
    'core/architecture/README.md',
    'core/services/README.md',
    'architecture/metrics/README.md',
    'architecture/metrics/troubleshooting/README.md'
  ]},
  
  // 3. Base de Données
  { section: '💾 Base de Données', files: [
    'database/README.md',
    'database/analysis/README.md',
    'database/analysis/comprehensive-project-audit/README.md',
    'database/analysis/data-structure-analysis/README.md',
    'database/analysis/data-structure-comparison/README.md',
    'database/architecture/database/README.md'
  ]},
  
  // 4. API et Intégration
  { section: '📡 API et Intégration', files: [
    'api/api-reference/README.md',
    'api/endpoints/README.md'
  ]},
  
  // 5. Déploiement
  { section: '🚀 Déploiement', files: [
    'deployment/getting-started/README.md',
    'deployment/production/README.md',
    'deployment/security/README.md',
    'deployment/portainer/README.md'
  ]},
  
  // 6. Développement
  { section: '💻 Développement', files: [
    'development/setup/README.md',
    'development/workflow/README.md',
    'development/makefile/README.md',
    'development/testing/README.md'
  ]},
  
  // 7. Applications
  { section: '📱 Applications', files: [
    'frontend/README.md',
    'mobile/README.md'
  ]},
  
  // 8. Guides Spécialisés
  { section: '📚 Guides Spécialisés', files: [
    'administration/README.md',
    'security/README.md',
    'performance/README.md',
    'troubleshooting/README.md'
  ]},
  
  // 9. Scripts et Tests
  { section: '🔧 Scripts et Tests', files: [
    'scripts/README.md',
    'scripts/deployment/README.md',
    'tests/README.md'
  ]},
  
  // 10. Monitoring
  { section: '📊 Monitoring', files: [
    'monitoring/README.md'
  ]},
  
  // 11. Variables d'Environnement
  { section: '⚙️ Configuration', files: [
    'environment-variables.md',
    'environment-variables-secure.md'
  ]}
];

/**
 * Convertit les liens markdown relatifs en ancres internes au PDF
 * @param {string} content - Contenu markdown
 * @param {Map} anchorMap - Map des fichiers vers leurs ancres
 * @returns {string} - Contenu avec liens convertis
 */
function convertLinksForPDF(content, anchorMap) {
  // Convertir les liens relatifs vers d'autres fichiers README.md
  // Format: [texte](chemin/vers/README.md) -> [texte](#section-ancre)
  
  // Regex pour capturer les liens markdown
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  return content.replace(linkRegex, (match, linkText, linkPath) => {
    // Ignorer les liens externes (http://, https://, mailto:)
    if (linkPath.match(/^(https?:\/\/|mailto:)/)) {
      return match; // Garder le lien tel quel
    }
    
    // Ignorer les ancres locales (#section)
    if (linkPath.startsWith('#')) {
      return match;
    }
    
    // Nettoyer le chemin
    let cleanPath = linkPath.replace(/^\.\.\//, '').replace(/^\.\//, '');
    
    // Si c'est un lien vers un fichier dans la doc
    if (anchorMap.has(cleanPath)) {
      const anchor = anchorMap.get(cleanPath);
      return `[${linkText}](#${anchor})`;
    }
    
    // Si le lien pointe vers un dossier, essayer avec README.md
    if (!cleanPath.endsWith('.md')) {
      const readmePath = cleanPath.endsWith('/') 
        ? `${cleanPath}README.md` 
        : `${cleanPath}/README.md`;
      
      if (anchorMap.has(readmePath)) {
        const anchor = anchorMap.get(readmePath);
        return `[${linkText}](#${anchor})`;
      }
    }
    
    // Pour les liens de navigation au début des fichiers, les retirer
    if (linkText.match(/^(←|🏠|📚|🧭)/)) {
      return ''; // Retirer les liens de navigation
    }
    
    // Sinon garder le texte du lien sans lien (pour éviter les liens cassés)
    return `**${linkText}**`;
  });
}

/**
 * Crée une ancre unique pour un titre
 * @param {string} title - Titre
 * @param {string} filePath - Chemin du fichier
 * @returns {string} - Ancre unique
 */
function createAnchor(title, filePath) {
  const fileAnchor = filePath
    .replace(/README\.md$/, '')
    .replace(/\.md$/, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase();
  
  const titleAnchor = title
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  
  return `${fileAnchor}${titleAnchor}`.replace(/^-+|-+$/g, '');
}

/**
 * Extrait le titre principal d'un fichier markdown
 * @param {string} content - Contenu du fichier
 * @returns {string} - Titre
 */
function extractTitle(content) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].replace(/[📚🎯🏗️💾📡🚀💻📱🔧📊⚙️🧪🔐⚡🐛📋🧭]/g, '').trim() : 'Sans titre';
}

/**
 * Génère le PDF complet de la documentation
 */
async function generateCompleteDocumentationPDF() {
  console.log('📚 Génération du PDF de documentation complète...\n');
  
  try {
    // Map pour stocker les fichiers et leurs ancres
    const anchorMap = new Map();
    const fileContents = [];
    
    // 1. Construire la map des ancres
    console.log('📋 Analyse de la structure des fichiers...\n');
    for (const { section, files } of documentStructure) {
      for (const file of files) {
        const filePath = path.join(docsDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const title = extractTitle(content);
          const anchor = createAnchor(title, file);
          anchorMap.set(file, anchor);
          fileContents.push({ file, title, content, section, anchor });
          console.log(`   ✓ ${file} -> #${anchor}`);
        } else {
          console.log(`   ⚠️  Fichier non trouvé: ${file}`);
        }
      }
    }
    
    // 2. Créer le contenu du PDF avec table des matières
    console.log('\n📝 Génération du contenu du PDF...\n');
    
    let pdfContent = `# 📚 Documentation Complète JobbingTrack v4.1

> Documentation exhaustive du système de suivi de candidatures JobbingTrack

**Version**: 4.1  
**Date de génération**: ${new Date().toLocaleDateString('fr-FR', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

---

## 📋 Table des Matières

`;

    // Générer la table des matières par section
    for (const { section, files } of documentStructure) {
      // Vérifier si au moins un fichier de la section existe
      const sectionFiles = fileContents.filter(f => f.section === section);
      if (sectionFiles.length === 0) continue;
      
      pdfContent += `\n### ${section}\n\n`;
      
      for (const { file, title, anchor } of sectionFiles) {
        pdfContent += `- [${title}](#${anchor})\n`;
      }
    }
    
    pdfContent += `\n---\n\n`;
    
    // 3. Ajouter le contenu de chaque fichier
    console.log('📄 Ajout du contenu des fichiers...\n');
    
    for (const { file, title, content, section, anchor } of fileContents) {
      console.log(`   → ${file}`);
      
      // Saut de page avant chaque nouvelle section majeure
      pdfContent += `\n<div style="page-break-before: always;"></div>\n\n`;
      
      // Titre avec ancre
      pdfContent += `<a name="${anchor}"></a>\n\n`;
      pdfContent += `# ${title}\n\n`;
      pdfContent += `*${section} • Source: \`${file}\`*\n\n`;
      pdfContent += `---\n\n`;
      
      // Contenu du fichier sans le titre principal et sans les liens de navigation
      let fileContent = content
        .replace(/^#\s+.+$/m, '') // Retirer titre principal
        .replace(/^\[.*?\]\(.*?\)(\s*\|)?/gm, '') // Retirer liens navigation
        .trim();
      
      // Convertir les liens pour le PDF
      fileContent = convertLinksForPDF(fileContent, anchorMap);
      
      pdfContent += fileContent;
      pdfContent += `\n\n`;
    }
    
    // 4. Écrire le fichier temporaire
    console.log('\n💾 Écriture du fichier temporaire...\n');
    const tempMdPath = path.join(docsDir, 'temp-documentation-complete.md');
    fs.writeFileSync(tempMdPath, pdfContent);
    console.log(`   ✓ Fichier temporaire créé: ${tempMdPath}`);
    
    // 5. Générer le PDF
    console.log('\n🎨 Génération du PDF...\n');
    const pdfPath = path.join(pdfsDir, 'documentation-complete.pdf');
    
    await mdToPdf(
      { path: tempMdPath },
      {
        dest: pdfPath,
        pdf_options: {
          format: 'A4',
          margin: {
            top: '2cm',
            right: '1.5cm',
            bottom: '2cm',
            left: '1.5cm'
          },
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: `
            <div style="font-size: 9px; text-align: center; width: 100%; color: #666; padding-top: 10px;">
              <span>JobbingTrack Documentation v4.1</span>
            </div>
          `,
          footerTemplate: `
            <div style="font-size: 8px; text-align: center; width: 100%; color: #666; padding-bottom: 10px;">
              <span class="pageNumber"></span> / <span class="totalPages"></span>
            </div>
          `
        },
        stylesheet: [path.join(docsDir, 'pdf-style.css')],
        body_class: 'markdown-body',
        css: `
          .markdown-body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
            font-size: 10pt;
            line-height: 1.6;
            color: #24292e;
          }
          .markdown-body h1 {
            color: #1f2328;
            border-bottom: 3px solid #0969da;
            padding-bottom: 0.3em;
            margin-top: 24px;
            margin-bottom: 16px;
            font-size: 22pt;
            page-break-after: avoid;
          }
          .markdown-body h2 {
            border-bottom: 1px solid #d0d7de;
            padding-bottom: 0.2em;
            margin-top: 18px;
            margin-bottom: 12px;
            font-size: 18pt;
            page-break-after: avoid;
          }
          .markdown-body h3 {
            margin-top: 14px;
            margin-bottom: 10px;
            font-size: 14pt;
            page-break-after: avoid;
          }
          .markdown-body h4 {
            margin-top: 12px;
            margin-bottom: 8px;
            font-size: 12pt;
          }
          .markdown-body code {
            background-color: #f6f8fa;
            padding: 0.2em 0.4em;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 9pt;
            border: 1px solid #d0d7de;
          }
          .markdown-body pre {
            background-color: #f6f8fa;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            padding: 12px;
            page-break-inside: avoid;
            overflow-x: auto;
            font-size: 8.5pt;
          }
          .markdown-body pre code {
            background: transparent;
            border: none;
            padding: 0;
          }
          .markdown-body table {
            border-collapse: collapse;
            width: 100%;
            font-size: 9pt;
            page-break-inside: avoid;
          }
          .markdown-body th, .markdown-body td {
            border: 1px solid #d0d7de;
            padding: 6px 10px;
          }
          .markdown-body th {
            background-color: #f6f8fa;
            font-weight: 600;
          }
          .markdown-body tr:nth-child(even) {
            background-color: #f6f8fa;
          }
          .markdown-body blockquote {
            border-left: 4px solid #d0d7de;
            padding-left: 16px;
            color: #656d76;
            margin: 0 0 16px 0;
          }
          .markdown-body ul, .markdown-body ol {
            padding-left: 2em;
          }
          .markdown-body li {
            margin: 0.4em 0;
          }
          .markdown-body a {
            color: #0969da;
            text-decoration: none;
          }
          .markdown-body a:hover {
            text-decoration: underline;
          }
          .markdown-body hr {
            border: none;
            border-top: 1px solid #d8dee4;
            margin: 24px 0;
          }
          .markdown-body img {
            max-width: 100%;
            height: auto;
          }
        `
      }
    );
    
    // 6. Nettoyer le fichier temporaire
    fs.unlinkSync(tempMdPath);
    console.log('   ✓ Fichier temporaire supprimé');
    
    // 7. Afficher les statistiques
    const stats = fs.statSync(pdfPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PDF DE DOCUMENTATION COMPLÈTE GÉNÉRÉ');
    console.log('='.repeat(60));
    console.log(`📁 Emplacement: ${pdfPath}`);
    console.log(`📊 Nombre de sections: ${documentStructure.length}`);
    console.log(`📄 Nombre de fichiers inclus: ${fileContents.length}`);
    console.log(`💾 Taille du fichier: ${sizeInMB} MB`);
    console.log('='.repeat(60));
    
    return true;
  } catch (error) {
    console.error('\n❌ Erreur lors de la génération du PDF:', error.message);
    console.error(error.stack);
    return false;
  }
}

/**
 * Génère un PDF individuel pour un fichier markdown
 */
async function generateIndividualPDF(markdownPath, pdfPath) {
  try {
    const parentDir = path.dirname(pdfPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await mdToPdf(
      { path: markdownPath },
      {
        dest: pdfPath,
        pdf_options: {
          format: 'A4',
          margin: '1.5cm',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<div style="font-size: 9px; text-align: center; width: 100%; color: #666;">JobbingTrack Documentation</div>',
          footerTemplate: '<div style="font-size: 8px; text-align: center; width: 100%; color: #666;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
        },
        stylesheet: [path.join(docsDir, 'pdf-style.css')],
        body_class: 'markdown-body'
      }
    );

    return true;
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return false;
  }
}

/**
 * Génère tous les PDFs (complet + individuels)
 */
async function generateAllPDFs() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 GÉNÉRATION DE LA DOCUMENTATION PDF');
  console.log('='.repeat(60) + '\n');
  
  // Générer le PDF complet
  const success = await generateCompleteDocumentationPDF();
  
  if (success) {
    console.log('\n✨ Documentation PDF générée avec succès!');
    console.log('\n💡 Pour générer des PDFs individuels, utilisez:');
    console.log('   node generate-pdfs.js <chemin/vers/fichier.md>');
  } else {
    console.log('\n❌ Échec de la génération du PDF');
    process.exit(1);
  }
}

// Point d'entrée du script
if (require.main === module) {
  // Si un argument est fourni, générer un PDF individuel
  if (process.argv[2]) {
    const mdFile = process.argv[2];
    const pdfFile = mdFile.replace('.md', '.pdf').replace(/^docs\//, 'docs/pdfs/');
    console.log(`📄 Génération du PDF individuel: ${mdFile}`);
    generateIndividualPDF(mdFile, pdfFile).then(success => {
      if (success) {
        console.log(`✅ PDF généré: ${pdfFile}`);
      }
      process.exit(success ? 0 : 1);
    });
  } else {
    // Sinon, générer le PDF complet
    generateAllPDFs();
  }
}

module.exports = { generateCompleteDocumentationPDF, generateIndividualPDF };
