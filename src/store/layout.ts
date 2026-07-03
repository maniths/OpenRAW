import { createStore } from 'solid-js/store';

// Intelligently set defaults based on initial window size
const isMobile = window.innerWidth < 768;
const isTablet = window.innerWidth < 1024;

export const [layout, setLayout] = createStore({
  isLhsOpen: !isMobile,
  isRhsOpen: !isTablet,
  isBottomOpen: true,
});

export const toggleLhs = () => setLayout('isLhsOpen', (prev) => !prev);
export const toggleRhs = () => setLayout('isRhsOpen', (prev) => !prev);
export const toggleBottom = () => setLayout('isBottomOpen', (prev) => !prev);
