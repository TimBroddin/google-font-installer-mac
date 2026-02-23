#!/usr/bin/env bun
import type { FontMeta } from "./lib.ts";

const args = process.argv.slice(2);

if (args[0] === "web") {
  await import("./web.tsx");
} else {
  const React = await import("react");
  const { useState, useEffect, useCallback } = React;
  const { render, Box, Text, useApp, useInput } = await import("ink");
  const { default: TextInput } = await import("ink-text-input");
  const { default: Spinner } = await import("ink-spinner");
  const { fetchCatalog, installFont } = await import("./lib.ts");

  type Screen = "search" | "results" | "installing" | "done";

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
}
