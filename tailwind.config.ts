import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}','./lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f5f3ee', ink: '#0d0d0d', turq: '#00d4c8',
        kgold: '#c9a000', ksilver: '#7a8fa0', kbronze: '#a0622a',
      },
    },
  },
  plugins: [],
}
export default config
