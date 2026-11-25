/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './app.js', './markdown.js'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Barlow', 'system-ui', 'sans-serif'],
                mono: ['Fira Code', 'monospace'],
            },
            colors: {
                surface: {
                    0: '#0f0f12',
                    1: '#18181c',
                    2: '#222228',
                    3: '#2d2d35',
                    4: '#3a3a44',
                },
                accent: {
                    DEFAULT: '#34d399',
                    dim: '#065f46',
                    bright: '#6ee7b7',
                },
                warn: '#fbbf24',
                danger: '#f87171',
                text: {
                    primary: '#f0eff4',
                    secondary: '#9b99a8',
                    muted: '#6b697a',
                }
            }
        }
    },
    plugins: [],
};
