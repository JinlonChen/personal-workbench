export function getEmailRedirectTo(location: URL): string | undefined {
  if (location.protocol === "https:") return undefined;
  return location.href;
}
