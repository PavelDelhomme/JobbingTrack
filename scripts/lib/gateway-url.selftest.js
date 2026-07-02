#!/usr/bin/env node
'use strict';

const assert = require('assert');
const g = require('./gateway-url');

process.env.API_GATEWAY_URL = 'http://api-gateway:3000';
process.env.API_GATEWAY_PORT = '5002';
assert.strictEqual(
  g.resolveGatewayUrl({ perspective: 'host' }),
  'http://127.0.0.1:5002',
);
assert.strictEqual(
  g.resolveGatewayUrl({ perspective: 'internal' }),
  'http://api-gateway:3000',
);

process.env.API_GATEWAY_URL = 'http://localhost:3000';
process.env.API_GATEWAY_INTERNAL_PORT = '3000';
assert.strictEqual(
  g.normalizeUrlForHost('http://localhost:3000'),
  'http://127.0.0.1:5002',
);

console.log('gateway-url.selftest OK');
