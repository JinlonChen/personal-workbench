export function getEmailRedirectTo(location: URL): string | undefined {
  if (location.hostname.endsWith(".github.io")) return undefined;
  return location.href;
}
