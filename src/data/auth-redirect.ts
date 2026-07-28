const productionRedirectUrl = "https://jinlongchen.github.io/personal-workbench/";

export function getEmailRedirectTo(location: URL): string | undefined {
  if (location.protocol === "https:") return productionRedirectUrl;
  return location.href;
}
