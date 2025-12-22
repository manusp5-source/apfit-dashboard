/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0a0e27",
                card: "#1a1f3a",
                cardBorder: "#2d3250",
                textMain: "#e5e7eb",
                alertRed: "#ff4757",
                successGreen: "#2ed573",
                accentBlue: "#00d4ff",
                accentGreen: "#00ff88",
            },
        },
    },
    plugins: [],
}
