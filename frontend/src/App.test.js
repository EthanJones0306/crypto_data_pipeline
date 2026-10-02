import { render, screen } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider } from './contexts/AppContext';

jest.mock('recharts', () => ({}));

beforeEach(() => {
  window.matchMedia =
    window.matchMedia ||
    (() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
});

test('renders the app shell with navigation', () => {
  render(
    <ThemeProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </ThemeProvider>
  );

  expect(screen.getAllByText(/portfolio tracker/i).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /trade/i }).length).toBeGreaterThan(0);
});
