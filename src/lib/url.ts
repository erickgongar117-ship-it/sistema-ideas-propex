export function appBaseUrl() {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function baseUrlFromRequest(origin?: string | null) {
  if (origin && isPrivateOrLocalUrl(origin)) return origin.replace(/\/$/, "");
  if (process.env.APP_BASE_URL && !isPrivateOrLocalUrl(process.env.APP_BASE_URL)) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (origin) return origin.replace(/\/$/, "");
  return appBaseUrl();
}

export function isPrivateOrLocalUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "::1" || hostname.endsWith(".local")) return true;
    if (/^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
    const private172 = hostname.match(/^172\.(\d+)\./);
    return private172 ? Number(private172[1]) >= 16 && Number(private172[1]) <= 31 : false;
  } catch {
    return true;
  }
}
