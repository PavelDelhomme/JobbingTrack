const mdToPdf = require('md-to-pdf');
const fs = require('fs');
const path = require('path');

const docsDir = __dirname;
const pdfsDir = path.join(docsDir, 'pdfs');

// Créer le dossier pdfs s'il n'existe pas
if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
  console.log('📁 Dossier pdfs créé');
}

// Liste des fichiers markdown pour la documentation complète (nouvelle structure)
const documentationCompleteFiles = [
  // Index principal et navigation
  'README.md',
  'navigation.md',

  // Architecture et infrastructure
  'core/architecture.md',
  'core/services.md',
  'core/database.md',

  // API et intégration
  'api/api-reference.md',
  'api/endpoints.md',

  // Déploiement
  'deployment/getting-started.md',
  'deployment/production.md',
  'deployment/security.md',

  // Développement
  'development/setup.md',
  'development/workflow.md',
  'development/testing.md',

  // Guides spécialisés
  'frontend/guide.md',
  'mobile/guide.md',
  'administration/guide.md',
  'troubleshooting/guide.md',
  'performance/guide.md',
  'security/guide.md'
];

// Liste des anciens fichiers pour conversion (backward compatibility)
const legacyMarkdownFiles = [
  'environment-variables.md',
  'environment-variables-secure.md'
];

// Fonction pour générer un PDF unique avec toute la documentation
async function generateCompleteDocumentationPDF() {
  console.log('📚 Génération du PDF de documentation complète...\n');

  try {
    const { mdToPdf } = require('md-to-pdf');

    // Créer le contenu complet avec table des matières
    let completeContent = `# 📚 Documentation Complète JobbingTrack v4.1

## 🎯 Vue d'ensemble

Documentation exhaustive du système JobbingTrack incluant architecture, APIs, déploiement, développement et guides pratiques.

## 📋 Table des matières

`;

    // Générer la table des matières
    const tocEntries = [];
    let pageNumber = 1;

    for (const file of documentationCompleteFiles) {
      const filePath = path.join(docsDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : path.basename(file, '.md');

        completeContent += `- [${title}](#${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')})\n`;
        tocEntries.push({ title, file, page: pageNumber });
        pageNumber += Math.ceil(content.length / 2000); // Estimation du nombre de pages
      }
    }

    completeContent += `\n---\n\n`;

    // Ajouter le contenu de chaque fichier
    for (const file of documentationCompleteFiles) {
      const filePath = path.join(docsDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : path.basename(file, '.md');

        completeContent += `\n\n<div style="page-break-before: always;"></div>\n\n`;
        completeContent += `# ${title}\n\n`;
        completeContent += `*Source: ${file}*\n\n`;
        completeContent += content.replace(/^#\s+.+$/m, ''); // Supprimer le titre principal
        completeContent += `\n\n---\n\n`;
      }
    }

    // Écrire le fichier temporaire
    const tempMdPath = path.join(docsDir, 'temp-documentation-complete.md');
    fs.writeFileSync(tempMdPath, completeContent);

    // Générer le PDF
    const pdfPath = path.join(pdfsDir, 'documentation-complete.pdf');

    // S'assurer que le dossier pdfs existe
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }

    await mdToPdf(
      { path: tempMdPath },
      {
        dest: pdfPath,
        pdf_options: {
          format: 'A4',
          margin: '1cm',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%;">JobbingTrack Documentation Complète v4.1</div>',
          footerTemplate: '<div style="font-size: 8px; text-align: center; width: 100%;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
        },
        stylesheet: [path.join(docsDir, 'pdf-style.css')],
        body_class: 'markdown-body',
        css: `
          .markdown-body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #24292e;
          }
          .markdown-body h1 {
            color: #1f2328;
            border-bottom: 2px solid #d0d7de;
            padding-bottom: 0.3em;
            page-break-after: avoid;
          }
          .markdown-body h2 {
            border-bottom: 1px solid #d0d7de;
            padding-bottom: 0.2em;
            page-break-after: avoid;
          }
          .markdown-body code {
            background-color: #f6f8fa;
            padding: 0.2em 0.4em;
            border-radius: 6px;
          }
          .markdown-body pre {
            background-color: #f6f8fa;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            padding: 16px;
            page-break-inside: avoid;
          }
          .markdown-body table {
            border-collapse: collapse;
            width: 100%;
          }
          .markdown-body th, .markdown-body td {
            border: 1px solid #d0d7de;
            padding: 6px 13px;
          }
          .markdown-body th {
            background-color: #f6f8fa;
            font-weight: 600;
          }
        `
      }
    );

    // Nettoyer le fichier temporaire
    fs.unlinkSync(tempMdPath);

    console.log(`✅ PDF de documentation complète généré: ${pdfPath}`);
    console.log(`📄 Nombre de pages estimé: ${pageNumber}`);

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF complet:', error.message);
    return false;
  }
}

async function generatePDF(markdownPath, pdfPath) {
  try {
    // Importer md-to-pdf correctement
    const { mdToPdf } = require('md-to-pdf');

    // Créer le dossier parent si nécessaire
    const parentDir = path.dirname(pdfPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
      console.log(`📁 Dossier créé: ${parentDir}`);
    }

    await mdToPdf(
      { path: markdownPath },
      {
        dest: pdfPath,
        pdf_options: {
          format: 'A4',
          margin: '1cm',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%;">JobbingTrack Documentation</div>',
          footerTemplate: '<div style="font-size: 8px; text-align: center; width: 100%;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
        },
        stylesheet: [path.join(docsDir, 'pdf-style.css')],
        body_class: 'markdown-body',
        css: `
          .markdown-body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #24292e;
          }
          .markdown-body h1 {
            color: #1f2328;
            border-bottom: 2px solid #d0d7de;
            padding-bottom: 0.3em;
          }
          .markdown-body h2 {
            border-bottom: 1px solid #d0d7de;
            padding-bottom: 0.2em;
          }
          .markdown-body code {
            background-color: #f6f8fa;
            padding: 0.2em 0.4em;
            border-radius: 6px;
          }
          .markdown-body pre {
            background-color: #f6f8fa;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            padding: 16px;
          }
          .markdown-body table {
            border-collapse: collapse;
            width: 100%;
          }
          .markdown-body th, .markdown-body td {
            border: 1px solid #d0d7de;
            padding: 6px 13px;
          }
          .markdown-body th {
            background-color: #f6f8fa;
            font-weight: 600;
          }
        `
      }
    ).catch(console.error);

    console.log(`✅ PDF généré: ${path.basename(pdfPath)}`);
    return true;

  } catch (error) {
    console.error(`❌ Erreur lors de la conversion:`, error.message);
    return false;
  }
}

async function generatePDFs() {
  console.log('🚀 Début de la génération des PDFs...\n');

  let successCount = 0;
  let errorCount = 0;

  // 1. Générer le PDF de documentation complète
  console.log('📚 Étape 1: Génération du PDF de documentation complète...\n');
  const completePDFSuccess = await generateCompleteDocumentationPDF();
  if (completePDFSuccess) {
    successCount++;
  } else {
    errorCount++;
  }

  // 2. Générer les PDFs individuels (nouveaux fichiers)
  console.log('\n📋 Étape 2: Génération des PDFs individuels (nouvelle structure)...\n');
  for (const file of documentationCompleteFiles) {
    const markdownPath = path.join(docsDir, file);
    const pdfPath = path.join(pdfsDir, file.replace('.md', '.pdf'));

    // Vérifier si le fichier markdown existe
    if (!fs.existsSync(markdownPath)) {
      console.log(`⚠️  Fichier non trouvé: ${file}`);
      errorCount++;
      continue;
    }

    // Skip README.md (inclus dans le PDF complet)
    if (file === 'README.md') {
      console.log(`⏭️  Fichier inclus dans le PDF complet: ${file}`);
      continue;
    }

    console.log(`📄 Conversion de ${file}...`);
    const success = await generatePDF(markdownPath, pdfPath);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  // 3. Générer les PDFs des anciens fichiers (backward compatibility)
  console.log('\n📋 Étape 3: Génération des PDFs legacy (compatibilité)...\n');
  for (const file of legacyMarkdownFiles) {
    const markdownPath = path.join(docsDir, file);
    const pdfPath = path.join(pdfsDir, file.replace('.md', '.pdf'));

    // Vérifier si le fichier markdown existe
    if (!fs.existsSync(markdownPath)) {
      console.log(`⚠️  Fichier non trouvé: ${file}`);
      errorCount++;
      continue;
    }

    // Vérifier si c'est un fichier de la nouvelle structure (déjà traité)
    if (documentationCompleteFiles.includes(file)) {
      console.log(`⏭️  Fichier déjà traité dans la nouvelle structure: ${file}`);
      continue;
    }

    console.log(`📄 Conversion legacy de ${file}...`);
    const success = await generatePDF(markdownPath, pdfPath);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  console.log(`\n🎉 Génération des PDFs terminée !`);
  console.log(`📊 Résultats: ${successCount} succès, ${errorCount} erreurs`);
  console.log(`📁 PDFs générés dans: ${pdfsDir}`);

  // Lister les PDFs générés
  if (fs.existsSync(pdfsDir)) {
    const pdfFiles = fs.readdirSync(pdfsDir).filter(file => file.endsWith('.pdf'));
    console.log(`\n📄 Fichiers PDF générés (${pdfFiles.length}):`);
    pdfFiles.forEach(file => console.log(`   - ${file}`));

    // Mettre en évidence le PDF complet
    if (pdfFiles.includes('documentation-complete.pdf')) {
      console.log(`\n🌟 PDF PRINCIPAL: documentation-complete.pdf`);
      console.log(`   📚 Documentation complète avec table des matières`);
      console.log(`   📄 Contient tous les guides dans un seul fichier`);
    }
  }
}

// Vérifier que le fichier CSS de style existe
if (!fs.existsSync(path.join(docsDir, 'pdf-style.css'))) {
  console.log('🎨 Création du fichier CSS de style...');
  const cssContent = `
  body {
    font-family: 'Helvetica', 'Arial', sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #333;
    margin: 20px;
  }

  h1, h2, h3, h4, h5, h6 {
    color: #2c3e50;
    font-weight: bold;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    page-break-after: avoid;
  }

  h1 {
    font-size: 18pt;
    border-bottom: 2px solid #3498db;
    padding-bottom: 0.3em;
    color: #2980b9;
  }

  h2 {
    font-size: 16pt;
    border-bottom: 1px solid #bdc3c7;
    padding-bottom: 0.2em;
  }

  h3 {
    font-size: 14pt;
  }

  h4 {
    font-size: 12pt;
  }

  code {
    background-color: #f8f9fa;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    border: 1px solid #e9ecef;
  }

  pre {
    background-color: #f8f9fa;
    padding: 1em;
    border-radius: 5px;
    border-left: 4px solid #3498db;
    overflow-x: auto;
    page-break-inside: avoid;
    margin: 1em 0;
  }

  blockquote {
    border-left: 4px solid #bdc3c7;
    padding-left: 1em;
    margin-left: 0;
    color: #7f8c8d;
    background-color: #f8f9fa;
    padding: 1em;
    border-radius: 5px;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    page-break-inside: avoid;
  }

  th, td {
    border: 1px solid #bdc3c7;
    padding: 0.5em;
    text-align: left;
  }

  th {
    background-color: #f8f9fa;
    font-weight: bold;
    color: #2c3e50;
  }

  tr:nth-child(even) {
    background-color: #f8f9fa;
  }

  a {
    color: #3498db;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .toc {
    background-color: #f8f9fa;
    padding: 1em;
    border-radius: 5px;
    margin: 1em 0;
    border: 1px solid #dee2e6;
  }

  .navigation {
    background-color: #e8f4f8;
    padding: 1em;
    border-radius: 5px;
    margin: 1em 0;
    border: 1px solid #bee5eb;
  }

  .highlight {
    background-color: #fff3cd;
    padding: 1em;
    border-radius: 5px;
    border-left: 4px solid #ffc107;
    margin: 1em 0;
  }

  .warning {
    background-color: #f8d7da;
    padding: 1em;
    border-radius: 5px;
    border-left: 4px solid #dc3545;
    margin: 1em 0;
  }

  .info {
    background-color: #d1ecf1;
    padding: 1em;
    border-radius: 5px;
    border-left: 4px solid #17a2b8;
    margin: 1em 0;
  }

  .success {
    background-color: #d4edda;
    padding: 1em;
    border-radius: 5px;
    border-left: 4px solid #28a745;
    margin: 1em 0;
  }

  img {
    max-width: 100%;
    height: auto;
    margin: 1em 0;
  }

  .page-break {
    page-break-before: always;
  }

  .no-break {
    page-break-inside: avoid;
  }

  ul, ol {
    padding-left: 2em;
  }

  li {
    margin: 0.5em 0;
  }

  hr {
    border: none;
    border-top: 2px solid #dee2e6;
    margin: 2em 0;
  }
  `;

  fs.writeFileSync(path.join(docsDir, 'pdf-style.css'), cssContent);
  console.log('🎨 Fichier CSS de style créé');
}

// Générer les PDFs
generatePDFs().catch(console.error);
