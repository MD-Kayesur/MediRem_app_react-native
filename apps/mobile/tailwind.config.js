/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#208AEF',
          50: '#F0F7FF',
          100: '#E6F4FE',
          500: '#208AEF',
          600: '#1769B2',
          700: '#12528D',
        },
        success: {
          DEFAULT: '#10B981',
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#10B981',
          600: '#059669',
        },
        brand: {
          blue: '#208AEF',
          lightBlue: '#E6F4FE',
          green: '#10B981',
          lightGreen: '#DCFCE7',
          dark: '#0F172A',
          card: '#F8FAFC',
          muted: '#64748B',
          border: '#E2E8F0',
        },
      },
    },
  },
  plugins: [],
};

