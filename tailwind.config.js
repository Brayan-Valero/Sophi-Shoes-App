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
                    600: '#5D3A75', // Brand Primary (Deep Purple) - Adjusted manually
                    700: '#4C2A65', // Darker variant
                    800: '#3D2152',
                    900: '#2E183E',
                    950: '#1F102A',
                },
                // Secondary: Hot Pink/Magenta from "S"
                secondary: {
                    50: '#fdf2f8',
                    100: '#fce7f3',
                    200: '#fbcfe8',
                    300: '#f9a8d4',
                    400: '#f472b6',
                    500: '#ec4899',
                    600: '#E04F80', // Brand Secondary (Hot Pink) - Adjusted manually
                    700: '#be185d',
                    800: '#9d174d',
                    900: '#831843',
                    950: '#500724',
                },
                // Brand Background (Soft Salmon/Pink)
                brand: {
                    bg: '#F8BBD0', // Soft pink background
                    light: '#FFCDD2', // Lighter variant
                    dark: '#F06292', // Darker variant
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
