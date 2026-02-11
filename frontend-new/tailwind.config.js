import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            borderRadius: {
                lg: '0px',
                md: '0px',
                sm: '0px',
                DEFAULT: '0px',
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: '#ffffff', // Force white for popover/dropdowns
                    foreground: '#000000'
                },
                primary: {
                    DEFAULT: '#000000', // Black primary
                    foreground: '#ffffff'
                },
                secondary: {
                    DEFAULT: '#f3f4f6', // Gray-100
                    foreground: '#111827'
                },
                muted: {
                    DEFAULT: '#f3f4f6',
                    foreground: '#6b7280'
                },
                accent: {
                    DEFAULT: '#f3f4f6', // Hover state background (light gray)
                    foreground: '#000000' // Hover state text (black)
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: '#e5e7eb',
                input: '#e5e7eb',
                ring: '#000000', // Black focus ring
                brand: {
                    DEFAULT: '#00ffcb',
                    foreground: '#000000'
                },
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
                },
            },
            boxShadow: {
                toast: "0px 32px 64px -16px rgba(0,0,0,0.30), 0px 16px 32px -8px rgba(0,0,0,0.30), 0px 8px 16px -4px rgba(0,0,0,0.24), 0px 4px 8px -2px rgba(0,0,0,0.24), 0px -8px 16px -1px rgba(0,0,0,0.16), 0px 2px 4px -1px rgba(0,0,0,0.24), 0px 0px 0px 1px rgba(0,0,0,1.00), inset 0px 0px 0px 1px rgba(255,255,255,0.08), inset 0px 1px 0px 0px rgba(255,255,255,0.20)"
            }
        }
    },
    plugins: [tailwindcssAnimate],
}
