import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { LanguageProvider } from "@/contexts/language-context";
import { Toaster } from "@/components/ui/toaster";
import { InactivityWarningDialog } from "@/components/inactivity-warning-dialog";
import { OfflineIndicator } from "@/components/offline-indicator";

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
                // Check if this is a customer-facing page
                const isCustomerPage = window.location.pathname.startsWith('/order') || 
                                      window.location.pathname.startsWith('/review') ||
                                      window.location.pathname.startsWith('/confirmation') ||
                                      window.location.pathname.startsWith('/track');
                
                if (isCustomerPage) {
                  // Force light theme for customer pages
                  document.documentElement.classList.add('light');
                  document.documentElement.style.setProperty('color-scheme', 'light');
                } else {
                  // Dashboard pages: use stored theme preference
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
                }
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
              <InactivityWarningDialog />
              <OfflineIndicator />
            </AuthProvider>
          </LanguageProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
