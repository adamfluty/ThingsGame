/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  safelist: [
    { pattern: /(btn|badge|input|textarea|select)-(primary|secondary|accent|neutral|info|success|warning|error)/ },
    { pattern: /(btn|badge)-(ghost|outline|circle|square)/ },
    { pattern: /btn-(xs|sm|md|lg)/ },
    { pattern: /badge-(xs|sm|md|lg)/ },
    { pattern: /input-(xs|sm|md|lg|bordered|ghost|primary|secondary|accent|info|success|warning|error)/ },
  ],
  theme: { extend: {} },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        light: {
          "base-100": "oklch(98% 0.022 95.277)",
          "base-200": "oklch(96% 0.059 95.617)",
        },
      },
      'dark',
    ],
  }
}


