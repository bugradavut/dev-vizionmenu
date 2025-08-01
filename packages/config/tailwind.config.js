const createTailwindConfig = (contentPaths = []) => {
  return {
    content: contentPaths,
    theme: {
      extend: {
        colors: {
          background: "var(--background)",
          foreground: "var(--foreground)",
          card: {
            DEFAULT: "var(--card)",
            foreground: "var(--card-foreground)",
          },
          popover: {
            DEFAULT: "var(--popover)",
            foreground: "var(--popover-foreground)",
          },
          primary: {
            DEFAULT: "var(--primary)",
            foreground: "var(--primary-foreground)",
          },
          secondary: {
            DEFAULT: "var(--secondary)",
            foreground: "var(--secondary-foreground)",
          },
          muted: {
            DEFAULT: "var(--muted)",
            foreground: "var(--muted-foreground)",
          },
          accent: {
            DEFAULT: "var(--accent)",
            foreground: "var(--accent-foreground)",
          },
          destructive: {
            DEFAULT: "var(--destructive)",
            foreground: "var(--destructive-foreground)",
          },
          border: "var(--border)",
          input: "var(--input)",
          ring: "var(--ring)",
          sidebar: {
            DEFAULT: "var(--sidebar)",
            foreground: "var(--sidebar-foreground)",
            primary: "var(--sidebar-primary)",
            "primary-foreground": "var(--sidebar-primary-foreground)",
            accent: "var(--sidebar-accent)",
            "accent-foreground": "var(--sidebar-accent-foreground)",
            border: "var(--sidebar-border)",
            ring: "var(--sidebar-ring)",
          },
        },
        borderRadius: {
          lg: "var(--radius)",
          md: "calc(var(--radius) - 2px)",
          sm: "calc(var(--radius) - 4px)",
        },
        fontFamily: {
          sans: ["Euclid Circular A", "system-ui", "sans-serif"],
          mono: ["var(--font-geist-mono)"],
        },
      },
    },
    plugins: [],
  };
};

module.exports = { createTailwindConfig };
