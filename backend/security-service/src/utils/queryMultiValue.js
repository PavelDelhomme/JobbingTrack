function parseQueryMultiValue(value) {
  if (value == null || value === '') return [];
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  const parts = raw.split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
  const seen = new Set();
  const result = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(part);
  }
  return result;
}

function buildUpperInFilter(values) {
  if (!values.length) return undefined;
  const normalized = values.map((value) => String(value).toUpperCase());
  if (normalized.length === 1) return normalized[0];
  return { in: normalized };
}

function buildInsensitiveContainsFilter(values) {
  if (!values.length) return undefined;
  if (values.length === 1) {
    return { contains: values[0], mode: 'insensitive' };
  }
  return {
    OR: values.map((value) => ({
      contains: value,
      mode: 'insensitive',
    })),
  };
}

function buildIntInFilter(values) {
  const ints = values
    .map((value) => parseInt(value, 10))
    .filter((value) => Number.isInteger(value));
  if (!ints.length) return undefined;
  if (ints.length === 1) return ints[0];
  return { in: ints };
}

module.exports = {
  parseQueryMultiValue,
  buildUpperInFilter,
  buildInsensitiveContainsFilter,
  buildIntInFilter,
};
