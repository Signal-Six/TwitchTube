/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        twitch: {
          purple: '#9146FF',
          dark: '#0e0e10',
          gray: '#18181b',
          light: '#efeff1',
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 0 2px #ef4444, 0 0 20px rgba(239, 68, 68, 0.4)' 
          },
          '50%': { 
            boxShadow: '0 0 0 3px #ef4444, 0 0 35px rgba(239, 68, 68, 0.6)' 
          },
        },
      },
    },
  },
  plugins: [],
};
