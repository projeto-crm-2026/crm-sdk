/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        widget: ["'TASA Orbiter'", 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        'bounce-dot': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-5px)' },
        },
        'msg-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'bounce-dot': 'bounce-dot 1.2s ease infinite',
        'bounce-dot-2': 'bounce-dot 1.2s 0.2s ease infinite',
        'bounce-dot-3': 'bounce-dot 1.2s 0.4s ease infinite',
        'msg-in': 'msg-in 0.2s ease',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
};
