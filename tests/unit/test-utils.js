/**
 * Tests unitaires - Utilitaires
 * Tests des fonctions utilitaires et helpers
 */

const path = require('path');
const fs = require('fs');

// Tests des utilitaires de formatage
describe('Utils - Formatage', () => {
  test('formatDate devrait formater correctement les dates', () => {
    const formatDate = (date) => {
      return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(date));
    };

    expect(formatDate('2024-01-15')).toBe('15 janvier 2024');
    expect(formatDate('2024-12-31')).toBe('31 décembre 2024');
  });

  test('formatCurrency devrait formater les montants', () => {
    const formatCurrency = (amount, currency = 'EUR') => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency
      }).format(amount);
    };

    expect(formatCurrency(1234.56)).toBe('1 234,56 €');
    expect(formatCurrency(0)).toBe('0,00 €');
    expect(formatCurrency(1000000, 'USD')).toBe('1 000 000,00 $');
  });

  test('truncateText devrait tronquer le texte', () => {
    const truncateText = (text, maxLength = 50) => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    };

    expect(truncateText('Court')).toBe('Court');
    expect(truncateText('Un texte très long qui dépasse la limite')).toBe('Un texte très long qui dépasse la limite...');
    expect(truncateText('Exactement 50 caractères pour ce test', 50)).toBe('Exactement 50 caractères pour ce test');
  });
});

// Tests des utilitaires de validation
describe('Utils - Validation', () => {
  test('validateEmail devrait valider les emails', () => {
    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    expect(validateEmail('redacted@example.invalid')).toBe(true);
    expect(validateEmail('redacted@example.invalid')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
  });

  test('validatePassword devrait valider les mots de passe', () => {
    const validatePassword = (password) => {
      // Au moins 8 caractères, une majuscule, une minuscule, un chiffre
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
      return passwordRegex.test(password);
    };

    expect(validatePassword('Password123')).toBe(true);
    expect(validatePassword('MySecurePass1')).toBe(true);
    expect(validatePassword('weak')).toBe(false);
    expect(validatePassword('onlylowercase123')).toBe(false);
    expect(validatePassword('ONLYUPPERCASE123')).toBe(false);
    expect(validatePassword('NoNumbers')).toBe(false);
  });

  test('validateURL devrait valider les URLs', () => {
    const validateURL = (url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    expect(validateURL('https://example.com')).toBe(true);
    expect(validateURL('http://localhost:3000')).toBe(true);
    expect(validateURL('ftp://example.com')).toBe(true);
    expect(validateURL('invalid-url')).toBe(false);
    expect(validateURL('example.com')).toBe(false);
  });
});

// Tests des utilitaires de calcul
describe('Utils - Calculs', () => {
  test('calculatePercentage devrait calculer les pourcentages', () => {
    const calculatePercentage = (value, total) => {
      if (total === 0) return 0;
      return Math.round((value / total) * 100);
    };

    expect(calculatePercentage(50, 100)).toBe(50);
    expect(calculatePercentage(25, 50)).toBe(50);
    expect(calculatePercentage(0, 100)).toBe(0);
    expect(calculatePercentage(33, 100)).toBe(33);
  });

  test('calculateGrowth devrait calculer la croissance', () => {
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    expect(calculateGrowth(150, 100)).toBe(50);
    expect(calculateGrowth(50, 100)).toBe(-50);
    expect(calculateGrowth(100, 0)).toBe(100);
    expect(calculateGrowth(0, 100)).toBe(-100);
  });

  test('formatFileSize devrait formater les tailles de fichiers', () => {
    const formatFileSize = (bytes) => {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let unitIndex = 0;

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }

      return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
    };

    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });
});

// Tests des utilitaires de fichiers
describe('Utils - Fichiers', () => {
  test('getFileExtension devrait extraire l\'extension', () => {
    const getFileExtension = (filename) => {
      return path.extname(filename).toLowerCase();
    };

    expect(getFileExtension('document.pdf')).toBe('.pdf');
    expect(getFileExtension('image.jpg')).toBe('.jpg');
    expect(getFileExtension('script.js')).toBe('.js');
    expect(getFileExtension('no-extension')).toBe('');
  });

  test('sanitizeFilename devrait nettoyer les noms de fichiers', () => {
    const sanitizeFilename = (filename) => {
      return filename
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_')
        .replace(/\.+/g, '.')
        .substring(0, 255);
    };

    expect(sanitizeFilename('normal-file.pdf')).toBe('normal-file.pdf');
    expect(sanitizeFilename('file with spaces.pdf')).toBe('file_with_spaces.pdf');
    expect(sanitizeFilename('file<>:"/\\|?*.txt')).toBe('file.txt');
    expect(sanitizeFilename('a'.repeat(300))).toBe('a'.repeat(255));
  });
});

// Tests des utilitaires de dates
describe('Utils - Dates', () => {
  test('getRelativeTime devrait retourner le temps relatif', () => {
    const getRelativeTime = (date) => {
      const now = new Date();
      const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

      if (diffInSeconds < 60) return 'à l\'instant';
      if (diffInSeconds < 3600) return `il y a ${Math.floor(diffInSeconds / 60)} min`;
      if (diffInSeconds < 86400) return `il y a ${Math.floor(diffInSeconds / 3600)} h`;
      if (diffInSeconds < 2592000) return `il y a ${Math.floor(diffInSeconds / 86400)} j`;

      return new Date(date).toLocaleDateString('fr-FR');
    };

    expect(getRelativeTime(new Date())).toBe('à l\'instant');
    expect(getRelativeTime(new Date(Date.now() - 300000))).toBe('il y a 5 min'); // 5 minutes ago
    expect(getRelativeTime(new Date(Date.now() - 7200000))).toBe('il y a 2 h'); // 2 hours ago
    expect(getRelativeTime(new Date(Date.now() - 172800000))).toBe('il y a 2 j'); // 2 days ago
  });

  test('isWeekend devrait détecter les weekends', () => {
    const isWeekend = (date) => {
      const day = new Date(date).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    };

    expect(isWeekend('2024-01-13')).toBe(true); // Saturday
    expect(isWeekend('2024-01-14')).toBe(true); // Sunday
    expect(isWeekend('2024-01-15')).toBe(false); // Monday
    expect(isWeekend('2024-01-16')).toBe(false); // Tuesday
  });
});

// Tests des utilitaires de chaînes
describe('Utils - Chaînes', () => {
  test('capitalize devrait capitaliser les chaînes', () => {
    const capitalize = (str) => {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('WORLD')).toBe('World');
    expect(capitalize('tEsT')).toBe('Test');
    expect(capitalize('')).toBe('');
    expect(capitalize('a')).toBe('A');
  });

  test('slugify devrait créer des slugs', () => {
    const slugify = (str) => {
      return str
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
    };

    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Test with 123 numbers')).toBe('test-with-123-numbers');
    expect(slugify('Special @#$% characters')).toBe('special-characters');
    expect(slugify('  Multiple   spaces  ')).toBe('multiple-spaces');
  });

  test('generateRandomId devrait générer des IDs uniques', () => {
    const generateRandomId = (length = 8) => {
      return Math.random().toString(36).substring(2, length + 2);
    };

    const id1 = generateRandomId();
    const id2 = generateRandomId();

    expect(id1).toHaveLength(8);
    expect(id2).toHaveLength(8);
    expect(id1).not.toBe(id2);
    expect(/^[a-z0-9]+$/.test(id1)).toBe(true);
    expect(/^[a-z0-9]+$/.test(id2)).toBe(true);
  });
});

// Tests des utilitaires d'objets
describe('Utils - Objets', () => {
  test('deepClone devrait cloner profondément les objets', () => {
    const deepClone = (obj) => {
      return JSON.parse(JSON.stringify(obj));
    };

    const original = {
      name: 'test',
      nested: {
        value: 123,
        array: [1, 2, 3]
      }
    };

    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.nested).not.toBe(original.nested);
    expect(cloned.nested.array).not.toBe(original.nested.array);
  });

  test('omit devrait exclure des propriétés', () => {
    const omit = (obj, keys) => {
      const result = { ...obj };
      keys.forEach(key => delete result[key]);
      return result;
    };

    const obj = { a: 1, b: 2, c: 3, d: 4 };
    expect(omit(obj, ['b', 'd'])).toEqual({ a: 1, c: 3 });
    expect(omit(obj, [])).toEqual(obj);
    expect(omit(obj, ['a', 'b', 'c', 'd'])).toEqual({});
  });

  test('pick devrait sélectionner des propriétés', () => {
    const pick = (obj, keys) => {
      const result = {};
      keys.forEach(key => {
        if (obj.hasOwnProperty(key)) {
          result[key] = obj[key];
        }
      });
      return result;
    };

    const obj = { a: 1, b: 2, c: 3, d: 4 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    expect(pick(obj, ['b'])).toEqual({ b: 2 });
    expect(pick(obj, [])).toEqual({});
  });
});

// Tests d'intégration avec le système de fichiers
describe('Utils - Intégration', () => {
  test('createDirectory devrait créer des dossiers', () => {
    const testDir = path.join(__dirname, 'temp-test-dir');

    // Nettoyer si existe déjà
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    const createDirectory = (dirPath) => {
      fs.mkdirSync(dirPath, { recursive: true });
      return fs.existsSync(dirPath);
    };

    expect(createDirectory(testDir)).toBe(true);
    expect(fs.existsSync(testDir)).toBe(true);

    // Nettoyer
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('readWriteFile devrait lire et écrire des fichiers', () => {
    const testFile = path.join(__dirname, 'temp-test.txt');
    const testContent = 'Test content for file operations';

    // Nettoyer si existe déjà
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    const writeFile = (filePath, content) => {
      fs.writeFileSync(filePath, content);
      return fs.existsSync(filePath);
    };

    const readFile = (filePath) => {
      return fs.readFileSync(filePath, 'utf8');
    };

    expect(writeFile(testFile, testContent)).toBe(true);
    expect(readFile(testFile)).toBe(testContent);

    // Nettoyer
    fs.unlinkSync(testFile);
  });
});
