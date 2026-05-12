function lookupGeoIp(ip) {
  if (!ip || typeof ip !== 'string') return null;

  // GeoIP/ASN enrichment is intentionally optional: keep request handling free of
  // vulnerable bundled databases and wire a maintained provider behind this API.
  return null;
}

module.exports = {
  lookupGeoIp
};
