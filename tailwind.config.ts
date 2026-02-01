import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'background-primary': '#0A0A0F',
        'background-secondary': '#12121A',
        'background-card': '#16161F',
        'background-input': '#1A1A24',
        'border-subtle': '#2A2A3C',
        'accent-purple': '#583AF6',
        'accent-purple-hover': '#6B4FF7',
        'accent-purple-glow': 'rgba(88, 58, 246, 0.15)',
        'accent-green': '#10B981',
        'accent-green-glow': 'rgba(16, 185, 129, 0.15)',
        'accent-blue': '#3B82F6',
        'accent-blue-glow': 'rgba(59, 130, 246, 0.15)',
        'accent-amber': '#F59E0B',
        'accent-amber-glow': 'rgba(245, 158, 11, 0.15)',
        'accent-red': '#EF4444',
        'accent-red-glow': 'rgba(239, 68, 68, 0.15)',
      },
    },
  },
  plugins: [],
}
export default config
