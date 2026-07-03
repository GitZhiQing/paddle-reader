import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Theme provider built on next-themes. Applies the theme by toggling the
 * `dark` class on <html> (matches globals.css `@custom-variant dark`).
 * Defaults to dark to match the Tauri desktop app's look; system preference
 * is ignored so the user's choice is stable.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
