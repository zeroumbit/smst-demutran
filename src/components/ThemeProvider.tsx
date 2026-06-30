import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, type ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      if (
        event.message?.includes("Failed to execute 'removeChild' on 'Node'")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
