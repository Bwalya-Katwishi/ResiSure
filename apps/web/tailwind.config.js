/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        brand: ['Montserrat', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Logo palette: primary #0047AB, accent #4DA6FF */
        brand: {
          DEFAULT: '#0047AB',
          primary: '#0047AB',
          accent: '#4DA6FF',
          dark: '#003580',
          50: '#eef4fc',
          100: '#d6e6f9',
          200: '#a8ccf3',
          300: '#4DA6FF',
          400: '#3388e8',
          500: '#1a6fd4',
          600: '#0047AB',
          700: '#003a8c',
          800: '#002d6d',
          900: '#001f4d',
        },
        /* Remap default blue scale to brand colors site-wide */
        blue: {
          50: '#eef4fc',
          100: '#d6e6f9',
          200: '#a8ccf3',
          300: '#4DA6FF',
          400: '#3388e8',
          500: '#1a6fd4',
          600: '#0047AB',
          700: '#003a8c',
          800: '#002d6d',
          900: '#001f4d',
          950: '#001433',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 71, 171, 0.06), 0 8px 24px rgba(0, 71, 171, 0.06)',
        lift: '0 8px 30px rgba(0, 71, 171, 0.12)',
        brand: '0 4px 20px rgba(0, 71, 171, 0.25)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.15rem',
      },
    },
  },
  plugins: [],
};
