const axios = require('axios');
const dns = require('node:dns').promises;

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

function isDocumentationIp(ip) {
  const s = normalizeIp(ip);
  return (
    s.startsWith('192.0.2.') ||
    s.startsWith('198.51.100.') ||
    s.startsWith('203.0.113.')
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
    reverseDns: [],
    rdap: null,
    sources: ['local-classification'],
    confidence: 'high',
    enrichedAt: new Date().toISOString(),
    note:
      'IP privée ou réseau Docker/LAN — géolocalisation publique, VPN/Tor/proxy et ASN non applicables'
  };
}

function documentationGeoResult(ip) {
  const s = normalizeIp(ip);
  const profile =
    s.startsWith('203.0.113.')
      ? {
          asn: 'AS64513',
          organization: 'JobbingTrack Lab Datacenter / Proxy',
          proxy: true,
          vpn: true,
          tor: false,
          note: 'IP RFC5737 lab — profil datacenter/proxy déterministe'
        }
      : s.startsWith('192.0.2.')
        ? {
            asn: 'AS64512',
            organization: 'JobbingTrack Lab Tor Exit',
            proxy: true,
            vpn: false,
            tor: true,
            note: 'IP RFC5737 lab — profil Tor déterministe'
          }
        : {
            asn: 'AS64514',
            organization: 'JobbingTrack Lab Public Source',
            proxy: false,
            vpn: false,
            tor: false,
            note: 'IP RFC5737 lab — profil public de démonstration'
          };

  return {
    private: false,
    country: 'Documentation',
    city: 'Lab',
    region: 'RFC5737',
    timezone: 'UTC',
    ll: null,
    reverseDns: [`${s.replace(/\./g, '-')}.rfc5737.jobbingtrack.test`],
    rdap: {
      handle: 'RFC5737-JOBBINGTRACK-LAB',
      name: 'JobbingTrack reserved documentation range',
      type: 'ALLOCATED',
      country: 'ZZ',
      startAddress: s.split('.').slice(0, 3).join('.') + '.0',
      endAddress: s.split('.').slice(0, 3).join('.') + '.255',
      entities: ['JobbingTrack Security Lab']
    },
    sources: ['rfc5737-lab-fixture'],
    confidence: 'high',
    enrichedAt: new Date().toISOString(),
    ...profile
  };
}

async function lookupReverseDns(ip) {
  if (String(process.env.SECURITY_IP_REVERSE_DNS_ENABLED || 'true').toLowerCase() === 'false') {
    return [];
  }
  try {
    const names = await Promise.race([
      dns.reverse(ip),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('reverse dns timeout')),
          Number(process.env.SECURITY_IP_REVERSE_DNS_TIMEOUT_MS || 1800)
        )
      )
    ]);
    return Array.isArray(names) ? names.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function normalizeRdap(data) {
  if (!data || typeof data !== 'object') return null;
  const entityNames = Array.isArray(data.entities)
    ? data.entities
        .map((entity) => {
          const vcard = Array.isArray(entity.vcardArray) ? entity.vcardArray[1] : null;
          const fn = Array.isArray(vcard)
            ? vcard.find((row) => Array.isArray(row) && row[0] === 'fn')
            : null;
          return fn?.[3] || entity.handle || null;
        })
        .filter(Boolean)
        .slice(0, 4)
    : [];
  return {
    handle: data.handle || null,
    name: data.name || null,
    type: data.type || null,
    country: data.country || null,
    startAddress: data.startAddress || null,
    endAddress: data.endAddress || null,
    entities: entityNames,
  };
}

async function lookupRdap(ip) {
  if (String(process.env.SECURITY_IP_RDAP_ENABLED || 'true').toLowerCase() === 'false') {
    return null;
  }
  try {
    const base = (process.env.SECURITY_IP_RDAP_URL || 'https://rdap.org/ip').replace(/\/$/, '');
    const { data } = await axios.get(`${base}/${encodeURIComponent(ip)}`, {
      timeout: Number(process.env.SECURITY_IP_RDAP_TIMEOUT_MS || 3000),
      validateStatus: (s) => s >= 200 && s < 500
    });
    return normalizeRdap(data);
  } catch {
    return null;
  }
}

/**
 * Enrichissement GeoIP / réputation (async). IP privées : structure explicite sans appel externe.
 */
async function lookupGeoIp(ip) {
  const normalized = normalizeIp(ip);
  if (!normalized) return null;

  if (isDocumentationIp(normalized)) {
    return documentationGeoResult(normalized);
  }

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
    const [{ data }, reverseDnsResult, rdapResult] = await Promise.all([
      axios.get(providerUrl, {
      timeout: Number(process.env.GEOIP_LOOKUP_TIMEOUT_MS || 3500),
      params:
        providerUrl.includes('ip-api.com') && !providerUrl.includes('fields=')
          ? {
              fields:
                'status,message,country,regionName,city,lat,lon,timezone,as,proxy,hosting,mobile,isp,org'
            }
          : undefined,
      validateStatus: (s) => s >= 200 && s < 500
      }),
      lookupReverseDns(normalized).then((value) => ({ status: 'fulfilled', value })).catch(() => ({ status: 'rejected', value: [] })),
      lookupRdap(normalized).then((value) => ({ status: 'fulfilled', value })).catch(() => ({ status: 'rejected', value: null }))
    ]);

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
      tor: typeof data.tor === 'boolean' ? data.tor : null,
      reverseDns: reverseDnsResult.status === 'fulfilled' ? reverseDnsResult.value : [],
      rdap: rdapResult.status === 'fulfilled' ? rdapResult.value : null,
      sources: [
        providerUrl.includes('ip-api.com') ? 'ip-api.com' : 'geoip-provider',
        ...(reverseDnsResult.value?.length ? ['reverse-dns'] : []),
        ...(rdapResult.value ? ['rdap'] : [])
      ],
      confidence: rdapResult.value || reverseDnsResult.value?.length ? 'medium' : 'low',
      enrichedAt: new Date().toISOString()
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
  isDocumentationIp,
  normalizeIp
};
