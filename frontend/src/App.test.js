import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the main app heading', () => {
  render(<App />);
  
  const headingElement = screen.getByText(/portfolio tracker/i);
  
  expect(headingElement).toBeInTheDocument();
});