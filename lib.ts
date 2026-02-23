import { existsSync } from "node:fs";
import { join } from "node:path";

export const CATALOG_URL =
  "https://raw.githubusercontent.com/fontsource/google-font-metadata/main/data/api-response.json";
export const FONT_DIR = join(process.env.HOME!, "Library", "Fonts");

export interface FontMeta {
  family: string;
  variants: string[];
  subsets: string[];
  category: string;
  version: string;
}

export async function fetchCatalog(): Promise<FontMeta[]> {
  const res = await fetch(CATALOG_URL);
  if (!res.ok) throw new Error(`Failed to fetch catalog: ${res.statusText}`);
  return res.json() as Promise<FontMeta[]>;
}

export const weightMap: Record<string, number> = {
  "100": 100, "100italic": 100,
  "200": 200, "200italic": 200,
  "300": 300, "300italic": 300,
  regular: 400, italic: 400,
  "500": 500, "500italic": 500,
  "600": 600, "600italic": 600,
  "700": 700, "700italic": 700,
  "800": 800, "800italic": 800,
  "900": 900, "900italic": 900,
};

export async function getFontFiles(
  family: string,
  variants: string[]
): Promise<{ variant: string; url: string }[]> {
  const italicVariants = variants.filter((v) => v.includes("italic"));
  const regularVariants = variants.filter((v) => !v.includes("italic"));
  const tuples: string[] = [];

  for (const v of variants) {
    const weight = weightMap[v] ?? 400;
    const ital = v.includes("italic") ? 1 : 0;
    tuples.push(`${ital},${weight}`);
  }

  const encodedFamily = family.replace(/ /g, "+");
  let url: string;

  if (italicVariants.length > 0) {
    const sorted = tuples.sort();
    url = `https://fonts.googleapis.com/css2?family=${encodedFamily}:ital,wght@${sorted.join(";")}`;
  } else {
    const weights = regularVariants.map((v) => weightMap[v] ?? 400).sort((a, b) => a - b);
    url = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weights.join(";")}`;
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Safari/537.36",
    },
  });

  if (!res.ok) throw new Error(`CSS API failed for "${family}": ${res.statusText}`);
  const css = await res.text();

  const files: { variant: string; url: string }[] = [];
  for (const block of css.split("@font-face")) {
    const urlMatch = block.match(/url\((https:\/\/[^)]+)\)/);
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    const styleMatch = block.match(/font-style:\s*(\w+)/);
    if (!urlMatch) continue;

    const weight = weightMatch?.[1] ?? "400";
    const style = styleMatch?.[1] ?? "normal";

    let variant: string;
    if (weight === "400" && style === "normal") variant = "regular";
    else if (weight === "400" && style === "italic") variant = "italic";
    else if (style === "italic") variant = `${weight}italic`;
    else variant = weight;

    files.push({ variant, url: urlMatch[1]! });
  }

  if (files.length > 0 && !files[0]!.url.includes(".ttf")) {
    throw new Error(
      `Google Fonts returned non-TTF files (got ${files[0]!.url.split(".").pop()}). macOS Font Book requires .ttf files.`
    );
  }

  return files;
}

export async function installFont(
  font: FontMeta,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.("Fetching download URLs...");
  const files = await getFontFiles(font.family, font.variants);

  if (files.length === 0) return "No downloadable files found.";

  let installed = 0;
  let skipped = 0;

  for (const { variant, url } of files) {
    const ext = url.includes(".woff2") ? ".woff2" : ".ttf";
    const filename = `${font.family.replace(/\s+/g, "")}-${variant}${ext}`;
    const dest = join(FONT_DIR, filename);

    if (existsSync(dest)) {
      skipped++;
      continue;
    }

    onProgress?.(`Downloading ${filename}...`);
    const res = await fetch(url);
    if (!res.ok) continue;
    await Bun.write(dest, res);
    installed++;
  }

  return `Installed ${installed} file(s), skipped ${skipped} already installed. (${FONT_DIR})`;
}
