const config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        foreground: '#e0e0e0',
        card: '#12121a',
        muted: '#1c1c2e',
        'muted-fg': '#6b7280',
        accent: '#00ff88',
        'accent-secondary': '#ff00ff',
        'accent-tertiary': '#00d4ff',
        border: '#2a2a3a',
        input: '#12121a',
        ring: '#00ff88',
        destructive: '#ff3366',
      },
      fontFamily: {
        heading: ['var(--font-orbitron)', 'monospace'],
        body: ['var(--font-jetbrains)', 'monospace'],
        label: ['var(--font-share-tech)', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 5px #00ff88, 0 0 10px #00ff8840',
        'neon-sm': '0 0 3px #00ff88, 0 0 6px #00ff8830',
      },
    },
  },
  plugins: [],
};

export default config;
