const axios = require('axios');

const IPV4_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function normalizeIp(ip) {
  let s = String(ip || '').trim();
  if (!s) return '';
  if (s.startsWith('::ffff:')) s = s.slice(7);
  if (s.includes(',') && !s.includes(':')) s = s.split(',')[0].trim();
  return s;
}

function isPrivateOrReservedIp(ip) {
  const s = normalizeIp(ip);
  if (!IPV4_REGEX.test(s)) return s === '::1' || s.startsWith('fc') || s.startsWith('fd');
  const parts = s.split('.').map(Number);
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    parts[0] === 0
  );
}

const geoCache = new Map();
const GEO_CACHE_TTL_MS = Number(process.env.GEOIP_CACHE_TTL_MS || 6 * 60 * 60 * 1000);

function readCache(ip) {
  const hit = geoCache.get(ip);
  if (!hit) return null;
  if (Date.now() - hit.at > GEO_CACHE_TTL_MS) {
    geoCache.delete(ip);
    return null;
  }
  return hit.data;
}

function writeCache(ip, data) {
  geoCache.set(ip, { at: Date.now(), data });
}

function privateGeoResult() {
  return {
    private: true,
    country: null,
    city: null,
    region: null,
    timezone: null,
    ll: null,
    asn: null,
    organization: null,
    proxy: null,
    vpn: null,
    tor: null,
    note:
      'IP privée ou réseau Docker/LAN — géolocalisation publique, VPN/Tor/proxy et ASN non applicables'
  };
}

/**
 * Enrichissement GeoIP / réputation (async). IP privées : structure explicite sans appel externe.
 */
async function lookupGeoIp(ip) {
  const normalized = normalizeIp(ip);
  if (!normalized) return null;

  if (isPrivateOrReservedIp(normalized)) {
    return privateGeoResult();
  }

  const cached = readCache(normalized);
  if (cached) return cached;

  if (String(process.env.GEOIP_ENRICHMENT_ENABLED || 'true').toLowerCase() === 'false') {
    return null;
  }

  const providerUrl =
    process.env.GEOIP_PROVIDER_URL ||
    `http://ip-api.com/json/${encodeURIComponent(normalized)}`;

  try {
    const { data } = await axios.get(providerUrl, {
      timeout: Number(process.env.GEOIP_LOOKUP_TIMEOUT_MS || 3500),
      params:
        providerUrl.includes('ip-api.com') && !providerUrl.includes('fields=')
          ? {
              fields:
                'status,message,country,regionName,city,lat,lon,timezone,as,proxy,hosting,mobile,isp,org'
            }
          : undefined,
      validateStatus: (s) => s >= 200 && s < 500
    });

    if (!data || data.status === 'fail') return null;

    const asnMatch = typeof data.as === 'string' ? data.as.match(/^(AS\d+)/i) : null;
    const result = {
      private: false,
      country: data.country || data.country_name || null,
      city: data.city || null,
      region: data.regionName || data.region || null,
      timezone: data.timezone || null,
      ll:
        data.lat != null && data.lon != null
          ? [Number(data.lat), Number(data.lon)]
          : null,
      asn: asnMatch ? asnMatch[1] : data.asn || null,
      organization: data.org || data.isp || data.as || null,
      proxy: typeof data.proxy === 'boolean' ? data.proxy : null,
      vpn: typeof data.hosting === 'boolean' ? data.hosting : null,
      tor: typeof data.tor === 'boolean' ? data.tor : null
    };
    writeCache(normalized, result);
    return result;
  } catch {
    return null;
  }
}

module.exports = {
  lookupGeoIp,
  isPrivateOrReservedIp,
  normalizeIp
};
