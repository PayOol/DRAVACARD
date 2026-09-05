export type CatalogSection = "cards" | "tiktok";

// Only a public section identifier is navigable; no customer or payment data.
export function readCatalogSection(hash: string): CatalogSection {
  return hash === "#tiktok" ? "tiktok" : "cards";
}

export function catalogSectionHash(section: CatalogSection): string {
  return section === "tiktok" ? "#tiktok" : "";
}
