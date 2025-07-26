import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { LanguageProvider } from "@/contexts/language-context";

export const metadata: Metadata = {
  title: "Vizion Menu",
  description: "Vizion Menu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.cdnfonts.com/css/euclid-circular-a" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('vizion-menu-theme') || 'system';
                const isValidTheme = ['dark', 'light', 'system'].includes(stored);
                const theme = isValidTheme ? stored : 'system';
                
                let resolvedTheme;
                if (theme === 'system') {
                  resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                } else {
                  resolvedTheme = theme;
                }
                
                document.documentElement.classList.add(resolvedTheme);
                document.documentElement.style.setProperty('color-scheme', resolvedTheme);
              } catch (e) {
                // Fallback to light theme if localStorage is not available
                document.documentElement.classList.add('light');
                document.documentElement.style.setProperty('color-scheme', 'light');
              }
            `,
          }}
        />
      </head>
      <body
        className="antialiased bg-background text-foreground"
      >
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
