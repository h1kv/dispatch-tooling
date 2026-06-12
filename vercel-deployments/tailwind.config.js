/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#F9FAFB',
        surface: '#FFFFFF',
        text: {
          primary: '#111827',
          secondary: '#6B7280',
        },
        accent: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
        },
        muted: '#E5E7EB',
        error: '#DC2626',
      },
      boxShadow: {
        card: '0 10px 25px -12px rgba(17, 24, 39, 0.25)',
        'card-hover': '0 18px 35px -16px rgba(17, 24, 39, 0.35)',
      },
    },
  },
  plugins: [],
};
