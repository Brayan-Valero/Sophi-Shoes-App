/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Sophi Shoes Brand Colors based on the logo
                // Primary: Deep Purple/Violet from "ophi" and "shoes"
                primary: {
                    50: '#f5f3ff', // Soft lavender
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6',
                    600: '#5D3A76', // Brand Primary (Deep Purple) - Extracted from Logo
                    700: '#4C2A65', // Darker variant
                    800: '#3D2152',
                    900: '#2E183E',
                    950: '#1F102A',
                },
                // Secondary: Warm Pink/Rose to complement the palette
                secondary: {
                    50: '#fff1f2',
                    100: '#ffe4e6',
                    200: '#fecdd3',
                    300: '#fda4af',
                    400: '#fb7185',
                    500: '#f43f5e',
                    600: '#e11d48',
                    700: '#be123c',
                    800: '#9f1239',
                    900: '#881337',
                    950: '#4c0519',
                },
                // Brand Backgrounds from Logos
                brand: {
                    peach: '#FDF0ED', // From logo 2
                    lavender: '#F2F0FF', // From logo 3
                    light: '#FFCDD2',
                    dark: '#F06292',
                },
                // Status colors
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                info: '#3b82f6',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                serif: ['Merriweather', 'serif'], // Added for "Sophi" style text if needed
            },
        },
    },
    plugins: [],
}
