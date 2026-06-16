#!/usr/bin/env node

const http = require("node:http");

const FRONTEND_BASE = (process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5003").replace(
  /\/$/,
  "",
);

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("Usage: smoke-backoffice-page-urls.cjs /backoffice/... [...]");
  process.exit(1);
}

function checkPath(pathname) {
  return new Promise((resolve, reject) => {
    const url = `${FRONTEND_BASE}${pathname}`;
    const req = http.get(url, { timeout: 20000 }, (res) => {
      res.resume();
      resolve({ url, status: res.statusCode });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error(`Timeout ${pathname}`));
    });
  });
}

async function main() {
  for (const pathname of paths) {
    const result = await checkPath(pathname);
    console.log(result.url, result.status);
    if (result.status !== 200 && result.status !== 307) {
      throw new Error(`Unexpected HTTP ${result.status} for ${pathname}`);
    }
  }
}

main().catch((error) => {
  console.error("[smoke-backoffice-page-urls]", error.message);
  process.exit(1);
});
