/* colors pull from the CSS vars in index.css, so retheming only needs one file */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--bg) / <alpha-value>)',
        steel: 'rgb(var(--panel) / <alpha-value>)',
        steelLight: 'rgb(var(--panel-light) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        mist: 'rgb(var(--text) / <alpha-value>)',
        slate: 'rgb(var(--text-muted) / <alpha-value>)',
        copper: 'rgb(var(--accent) / <alpha-value>)',
        copperLight: 'rgb(var(--accent-light) / <alpha-value>)',
        tierA: 'rgb(var(--tier-a) / <alpha-value>)',
        tierB: 'rgb(var(--tier-b) / <alpha-value>)',
        tierC: 'rgb(var(--tier-c) / <alpha-value>)'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    }
  },
  plugins: []
};
