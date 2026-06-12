/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html'],
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        surface: '#1e293b',
        'surface-alt': '#334155',
        accent: '#38bdf8',
        'accent-dark': '#0ea5e9',
        muted: '#64748b',
        text: '#f1f5f9',
        heading: '#e0e7ef',
        border: '#334155',
        badge: {
          bg: '#0ea5e9',
          text: '#f1f5f9'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.5rem',
        '2xl': '2rem',
        '3xl': '2.5rem',
        '4xl': '3rem'
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px'
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '12px'
      },
      boxShadow: {
        DEFAULT: '0 4px 24px rgba(15, 23, 42, 0.10)',
        card: '0 4px 24px rgba(15, 23, 42, 0.10)',
        glow: '0 18px 60px rgba(56, 189, 248, 0.16)'
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
        'hero-radial': 'radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 34rem)'
      }
    }
  },
  plugins: []
};


---

## Branch: Create tailwind.css
