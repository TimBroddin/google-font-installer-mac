#!/usr/bin/env bun
import React, { useState, useEffect, useCallback } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { existsSync } from "node:fs";
import { join } from "node:path";

const CATALOG_URL =
  "https://raw.githubusercontent.com/fontsource/google-font-metadata/main/data/api-response.json";
const FONT_DIR = join(process.env.HOME!, "Library", "Fonts");

interface FontMeta {
  family: string;
  variants: string[];
  subsets: string[];
  category: string;
  version: string;
}

// ── Data fetching ──────────────────────────────────────────

async function fetchCatalog(): Promise<FontMeta[]> {
  const res = await fetch(CATALOG_URL);
  if (!res.ok) throw new Error(`Failed to fetch catalog: ${res.statusText}`);
  return res.json() as Promise<FontMeta[]>;
}

const weightMap: Record<string, number> = {
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

async function getFontFiles(
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
      // Use a simple Safari UA to get .ttf files (Chrome UA returns .woff2 which macOS Font Book can't use)
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

async function installFont(
  font: FontMeta,
  onProgress: (msg: string) => void
): Promise<string> {
  onProgress(`Fetching download URLs...`);
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

    onProgress(`Downloading ${filename}...`);
    const res = await fetch(url);
    if (!res.ok) continue;
    await Bun.write(dest, res);
    installed++;
  }

  return `Installed ${installed} file(s), skipped ${skipped} already installed. (${FONT_DIR})`;
}

// ── Types ──────────────────────────────────────────────────

type Screen = "search" | "results" | "installing" | "done";

// ── Components ─────────────────────────────────────────────

function App() {
  const { exit } = useApp();
  const [catalog, setCatalog] = useState<FontMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FontMeta[]>([]);
  const [cursor, setCursor] = useState(0);
  const [installMsg, setInstallMsg] = useState("");
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCatalog()
      .then((fonts) => {
        setCatalog(fonts);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const doSearch = useCallback(
    (q: string) => {
      const lower = q.toLowerCase().trim();
      if (!lower) {
        setResults([]);
        return;
      }
      const matched = catalog.filter((f) => f.family.toLowerCase().includes(lower));
      setResults(matched.slice(0, 50));
      setCursor(0);
      setScreen("results");
    },
    [catalog]
  );

  const doInstall = useCallback(
    async (font: FontMeta) => {
      setScreen("installing");
      setProgressMsg("Starting...");
      try {
        const msg = await installFont(font, setProgressMsg);
        setInstallMsg(msg);
        setScreen("done");
      } catch (err: any) {
        setInstallMsg(`Error: ${err.message}`);
        setScreen("done");
      }
    },
    []
  );

  useInput(
    (input, key) => {
      if (key.escape || (input === "c" && key.ctrl)) {
        exit();
        return;
      }

      if (screen === "results") {
        if (key.upArrow) {
          setCursor((c) => Math.max(0, c - 1));
        } else if (key.downArrow) {
          setCursor((c) => Math.min(results.length - 1, c + 1));
        } else if (key.return && results.length > 0) {
          doInstall(results[cursor]!);
        } else if (input === "b" || key.leftArrow) {
          setScreen("search");
          setQuery("");
        }
      }

      if (screen === "done") {
        if (key.return || input === "b") {
          setScreen("search");
          setQuery("");
          setInstallMsg("");
        }
      }
    },
  );

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="green">
          <Spinner type="dots" />
        </Text>
        <Text> Loading Google Fonts catalog...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Google Font Installer
      </Text>
      <Text dimColor>{catalog.length} fonts available</Text>
      <Text> </Text>

      {screen === "search" && (
        <Box flexDirection="column">
          <Box>
            <Text bold>Search: </Text>
            <TextInput
              value={query}
              onChange={setQuery}
              onSubmit={doSearch}
              placeholder="Type a font name and press Enter..."
            />
          </Box>
          <Text> </Text>
          <Text dimColor>Press Enter to search, Esc to quit</Text>
        </Box>
      )}

      {screen === "results" && (
        <Box flexDirection="column">
          <Text dimColor>
            {results.length} result(s) for "{query}" — arrows to select, Enter to install, b to go back
          </Text>
          <Text> </Text>
          {results.length === 0 ? (
            <Text color="yellow">No fonts found. Press b to search again.</Text>
          ) : (
            (() => {
              const PAGE = 15;
              const start = Math.max(0, cursor - Math.floor(PAGE / 2));
              const end = Math.min(results.length, start + PAGE);
              const visible = results.slice(start, end);
              return (
                <>
                  {start > 0 && <Text dimColor>  ... {start} more above</Text>}
                  {visible.map((f, vi) => {
                    const i = start + vi;
                    return (
                      <Box key={f.family}>
                        <Text color={i === cursor ? "green" : undefined} bold={i === cursor}>
                          {i === cursor ? " > " : "   "}
                          {f.family}
                        </Text>
                        <Text dimColor>
                          {" "}({f.category}, {f.variants.length} variants)
                        </Text>
                      </Box>
                    );
                  })}
                  {end < results.length && <Text dimColor>  ... {results.length - end} more below</Text>}
                </>
              );
            })()
          )}
        </Box>
      )}

      {screen === "installing" && (
        <Box>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          <Text> {progressMsg}</Text>
        </Box>
      )}

      {screen === "done" && (
        <Box flexDirection="column">
          <Text color="green">{installMsg}</Text>
          <Text> </Text>
          <Text dimColor>Press Enter to search again, Esc to quit</Text>
        </Box>
      )}
    </Box>
  );
}

render(<App />);
