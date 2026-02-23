import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./web.css";

interface FontMeta {
  family: string;
  variants: string[];
  subsets: string[];
  category: string;
  version: string;
}

const VARIANT_LABELS: Record<string, string> = {
  "100": "Thin 100",
  "100italic": "Thin 100 Italic",
  "200": "ExtraLight 200",
  "200italic": "ExtraLight 200 Italic",
  "300": "Light 300",
  "300italic": "Light 300 Italic",
  regular: "Regular 400",
  italic: "Regular 400 Italic",
  "500": "Medium 500",
  "500italic": "Medium 500 Italic",
  "600": "SemiBold 600",
  "600italic": "SemiBold 600 Italic",
  "700": "Bold 700",
  "700italic": "Bold 700 Italic",
  "800": "ExtraBold 800",
  "800italic": "ExtraBold 800 Italic",
  "900": "Black 900",
  "900italic": "Black 900 Italic",
};

const CATEGORY_COLORS: Record<string, string> = {
  "sans-serif": "bg-blue-50 text-blue-700",
  serif: "bg-amber-50 text-amber-700",
  display: "bg-purple-50 text-purple-700",
  handwriting: "bg-pink-50 text-pink-700",
  monospace: "bg-emerald-50 text-emerald-700",
};

function variantToWeight(v: string): number {
  if (v === "regular" || v === "italic") return 400;
  const num = parseInt(v);
  return isNaN(num) ? 400 : num;
}

function variantIsItalic(v: string): boolean {
  return v === "italic" || v.includes("italic");
}

function googleFontsLink(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap`;
}

const loadedFonts = new Set<string>();
function ensureFontLoaded(family: string) {
  if (loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = googleFontsLink(family);
  document.head.appendChild(link);
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function App() {
  const [catalog, setCatalog] = useState<FontMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FontMeta[]>([]);
  const [selected, setSelected] = useState<FontMeta | null>(null);
  const [sampleText, setSampleText] = useState("The quick brown fox jumps over the lazy dog");
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState("");
  const [fontSize, setFontSize] = useState(32);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((data: FontMeta[]) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const doSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (!q.trim()) {
        setResults([]);
        return;
      }
      const lower = q.toLowerCase();
      const matched = catalog.filter((f) => f.family.toLowerCase().includes(lower));
      setResults(matched.slice(0, 100));
    },
    [catalog]
  );

  const doInstall = async (font: FontMeta, variants?: string[]) => {
    setInstalling(true);
    setInstallResult("");
    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family: font.family, variants }),
      });
      const data = await res.json();
      setInstallResult(data.result || data.error || "Unknown result");
    } catch (e: any) {
      setInstallResult(`Error: ${e.message}`);
    } finally {
      setInstalling(false);
    }
  };

  useEffect(() => {
    for (const font of results) {
      ensureFontLoaded(font.family);
    }
  }, [results]);

  useEffect(() => {
    if (selected) ensureFontLoaded(selected.family);
  }, [selected]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-stone-200 border-t-stone-800 mx-auto mb-4"></div>
          <p className="text-stone-500">Loading Google Fonts catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 mb-1">
          Google Font Installer
        </h1>
        <p className="text-stone-400 text-sm">{catalog.length.toLocaleString()} fonts available for macOS</p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => doSearch(e.target.value)}
            placeholder="Search fonts..."
            className="w-full bg-white border border-stone-200 rounded-xl pl-11 pr-4 py-3 text-base
                       shadow-sm
                       focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100
                       placeholder:text-stone-400 transition-all"
            autoFocus
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-600"
            >
              <XIcon />
            </button>
          )}
        </div>
        {query && (
          <p className="text-stone-400 text-xs mt-2 ml-1">{results.length} result{results.length !== 1 ? "s" : ""}</p>
        )}
      </div>

      {/* Selected font detail panel */}
      {selected && (
        <div className="mb-8 bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden fade-in">
          {/* Detail header */}
          <div className="px-6 py-5 border-b border-stone-100">
            <div className="flex items-start justify-between">
              <div>
                <h2
                  className="text-3xl font-bold tracking-tight"
                  style={{ fontFamily: `"${selected.family}", sans-serif` }}
                >
                  {selected.family}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${CATEGORY_COLORS[selected.category] || "bg-stone-100 text-stone-600"}`}>
                    {selected.category}
                  </span>
                  <span className="text-stone-400 text-xs">
                    {selected.variants.length} variant{selected.variants.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-stone-300">&middot;</span>
                  <span className="text-stone-400 text-xs">
                    {selected.subsets.join(", ")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => doInstall(selected)}
                  disabled={installing}
                  className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300
                             text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <DownloadIcon />
                  {installing ? "Installing..." : "Install"}
                </button>
                <button
                  onClick={() => { setSelected(null); setInstallResult(""); }}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg
                             text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  <XIcon />
                </button>
              </div>
            </div>
          </div>

          {installResult && (
            <div className={`mx-6 mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${
              installResult.startsWith("Error")
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}>
              {!installResult.startsWith("Error") && <CheckIcon />}
              {installResult}
            </div>
          )}

          {/* Sample text controls */}
          <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-4">
            <input
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-100
                         placeholder:text-stone-400"
              placeholder="Type sample text..."
            />
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-stone-400 text-xs font-medium">{fontSize}px</span>
              <input
                type="range"
                min="14"
                max="80"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-28"
              />
            </div>
          </div>

          {/* Variant previews */}
          <div className="divide-y divide-stone-100 max-h-[420px] overflow-y-auto">
            {selected.variants.map((v) => (
              <div key={v} className="flex items-baseline gap-6 px-6 py-4 hover:bg-stone-50 transition-colors">
                <span className="text-stone-400 text-xs font-medium w-32 shrink-0 tabular-nums">
                  {VARIANT_LABELS[v] || v}
                </span>
                <p
                  className="flex-1 leading-snug text-stone-800"
                  style={{
                    fontFamily: `"${selected.family}", sans-serif`,
                    fontWeight: variantToWeight(v),
                    fontStyle: variantIsItalic(v) ? "italic" : "normal",
                    fontSize: `${fontSize}px`,
                  }}
                >
                  {sampleText}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!query && !selected && (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stone-100 mb-4">
            <span className="text-2xl">Aa</span>
          </div>
          <p className="text-stone-400 text-sm">Start typing to search fonts</p>
        </div>
      )}

      {/* Results grid */}
      {query && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {results.map((font) => (
            <button
              key={font.family}
              onClick={() => { setSelected(font); setInstallResult(""); }}
              className={`group text-left bg-white border rounded-xl p-5 transition-all cursor-pointer
                         ${selected?.family === font.family
                           ? "border-stone-900 ring-1 ring-stone-900"
                           : "border-stone-200 hover:border-stone-300 hover:shadow-sm"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-stone-900 text-sm font-medium">{font.family}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[font.category] || "bg-stone-100 text-stone-500"}`}>
                  {font.category}
                </span>
              </div>
              <p
                className="text-xl text-stone-700 mb-3 overflow-hidden whitespace-nowrap text-ellipsis"
                style={{ fontFamily: `"${font.family}", sans-serif`, lineHeight: 1.6 }}
              >
                {sampleText}
              </p>
              <p className="text-stone-400 text-xs">
                {font.variants.length} variant{font.variants.length !== 1 ? "s" : ""}
              </p>
            </button>
          ))}
        </div>
      )}

      {query && results.length === 0 && (
        <div className="text-center py-20">
          <p className="text-stone-400 text-sm">No fonts found for "{query}"</p>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
