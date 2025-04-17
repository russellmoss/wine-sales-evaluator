/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        emerald: {
          600: '#059669',
        },
        green: {
          600: '#16a34a',
        },
        yellow: {
          600: '#ca8a04',
        },
        orange: {
          600: '#ea580c',
        },
        red: {
          600: '#dc2626',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
  // Exclude node_modules from content scanning
  future: {
    hoverOnlyWhenSupported: true,
  },
  // Add safelist for dynamically generated color classes
  safelist: [
    'bg-emerald-600',
    'bg-green-600',
    'bg-yellow-600',
    'bg-orange-600',
    'bg-red-600',
    'text-emerald-600',
    'text-green-600',
    'text-yellow-600',
    'text-orange-600',
    'text-red-600'
  ],
}; 