function normalizedOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProtocol);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolvePublicOrigin(req: Request): string {
  const configured =
    normalizedOrigin(process.env.PUBLIC_APP_URL) ||
    normalizedOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;

  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwarded = normalizedOrigin(
    forwardedHost ? `${forwardedProto === "http" ? "http" : "https"}://${forwardedHost}` : null,
  );
  if (forwarded) return forwarded;

  const railwayDomain = normalizedOrigin(process.env.RAILWAY_PUBLIC_DOMAIN);
  return railwayDomain || new URL(req.url).origin;
}
