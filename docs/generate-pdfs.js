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

// Liste des fichiers markdown à convertir (fichiers principaux mis à jour)
const markdownFiles = [
  'ARCHITECTURE.md',
  'API.md',
  'SERVICES.md',
  'DEVELOPMENT.md'
];

// Liste complète des fichiers pour la documentation complète
const allMarkdownFiles = [
  'README.md',
  'ARCHITECTURE.md',
  'API.md',
  'SERVICES.md',
  'DEVELOPMENT.md',
  'MAKEFILE.md',
  'TESTING-GUIDE.md',
  'TROUBLESHOOTING.md',
  'deployment-guide.md',
  'deployment-production.md',
  'deployment-security-guide.md',
  'security-guide.md',
  'environment-variables.md',
  'environment-variables-secure.md',
  'getting-started.md',
  'makefile-guide.md',
  'frontend-guide.md',
  'database-guide.md',
  'administration-guide.md',
  'api-guide.md',
  'architecture-guide.md',
  'CI-CD-PIPELINE.md',
  'DEVELOPMENT-WORKFLOW.md',
  'DOCKER_DETECTION_GUIDE.md',
  'METRICS_SYSTEM_README.md',
  'navigation-links.md',
  'performance-guide.md',
  'PORTABILITY_GUIDE.md',
  'portainer-guide.md',
  'postgresql-configuration.md',
  'production-guide.md',
  'STRUCTURE_FINALE.md',
  'version-history.md'
];

async function generatePDF(markdownPath, pdfPath) {
  try {
    // Importer md-to-pdf correctement
    const { mdToPdf } = require('md-to-pdf');

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
  console.log('📋 Génération des fichiers principaux mis à jour...\n');

  let successCount = 0;
  let errorCount = 0;

  // Générer les PDFs pour les fichiers principaux mis à jour
  for (const file of markdownFiles) {
    const markdownPath = path.join(docsDir, file);
    const pdfPath = path.join(pdfsDir, file.replace('.md', '.pdf'));

    // Vérifier si le fichier markdown existe
    if (!fs.existsSync(markdownPath)) {
      console.log(`⚠️  Fichier non trouvé: ${file}`);
      errorCount++;
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

  console.log(`\n📋 Génération des fichiers de documentation complets...\n`);

  // Générer les PDFs pour tous les fichiers de documentation (sauf les principaux déjà traités)
  for (const file of allMarkdownFiles) {
    const markdownPath = path.join(docsDir, file);
    const pdfPath = path.join(pdfsDir, file.replace('.md', '.pdf'));

    // Vérifier si le fichier markdown existe
    if (!fs.existsSync(markdownPath)) {
      console.log(`⚠️  Fichier non trouvé: ${file}`);
      errorCount++;
      continue;
    }

    // Vérifier si c'est un fichier principal (déjà traité)
    if (markdownFiles.includes(file)) {
      console.log(`⏭️  Fichier déjà traité: ${file}`);
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

  console.log(`\n🎉 Génération des PDFs terminée !`);
  console.log(`📊 Résultats: ${successCount} succès, ${errorCount} erreurs`);
  console.log(`📁 PDFs générés dans: ${pdfsDir}`);

  // Lister les PDFs générés
  if (fs.existsSync(pdfsDir)) {
    const pdfFiles = fs.readdirSync(pdfsDir).filter(file => file.endsWith('.pdf'));
    console.log(`\n📄 Fichiers PDF générés (${pdfFiles.length}):`);
    pdfFiles.forEach(file => console.log(`   - ${file}`));
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
