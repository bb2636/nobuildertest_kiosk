/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'sans-serif'],
      },
      colors: {
        // 키오스크 (모바일) - 노란/주황 강조
        kiosk: {
          primary: '#FFB800',
          primaryHover: '#E5A600',
          bg: '#FFFFFF',
          surface: '#FFF9E9',
          text: '#131313',
          textSecondary: '#717171',
          border: '#E1E6EF',
          error: '#FC5555',
        },
        // 백오피스 (웹) - 녹색 강조
        admin: {
          primary: '#16A34A',
          primaryHover: '#15803D',
          primaryLight: '#DCFCE7',
          bg: '#FFFFFF',
          surface: '#F9F9F9',
          text: '#505050',
          textSecondary: '#999999',
          border: '#E1E6EF',
          error: '#DC2626',
        },
      },
      maxWidth: {
        kiosk: '430px',
        admin: '1280px',
      },
    },
  },
  plugins: [],
};
