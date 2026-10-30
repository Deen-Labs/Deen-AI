/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: '#0f1718',
        panel: '#0b2527',
        surface: '#0c3033',
        card: '#f8f7f1',
        ink: '#0d1a1b',
        muted: '#4b6465',
        accent: {
          DEFAULT: '#e2a23b',
          soft: '#ffdda8',
        },
        edge: 'rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        grotesk: ['Space Grotesk', 'sans-serif'],
        sans: ['DM Sans', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        lg: '20px',
        md: '14px',
        sm: '10px',
      },
    },
  },
  plugins: [],
};
