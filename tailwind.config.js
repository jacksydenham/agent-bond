/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      keyframes: {
        sway: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%':      { transform: 'rotate(2deg)'   },
        },
      },
      animation: {
        sway: 'sway 0.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

