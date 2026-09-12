/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                vault: {
                    bg: '#0D1120',
                    bg2: '#1B1042',
                },
                gold: '#E8A94D',
                violet: '#8B7CF6',
                mint: '#6EE7B7',
            },
        },
    },
    plugins: [],
};