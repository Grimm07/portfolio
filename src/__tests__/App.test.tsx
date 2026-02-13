import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../App';

// Mock Turnstile to avoid timeout issues
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: () => <div data-testid="turnstile-mock" />,
}));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders the main app structure', async () => {
    render(<App />);
    const main = await screen.findByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('renders skip to content link', () => {
    render(<App />);
    const skipLink = screen.getByText(/skip to main content/i);
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renders ThemeToggle component', () => {
    render(<App />);
    const themeToggle = screen.getByRole('button', { name: /switch to/i });
    expect(themeToggle).toBeInTheDocument();
  });

  it('renders Hero component', () => {
    render(<App />);
    const heroSection = document.getElementById('hero');
    expect(heroSection).toBeInTheDocument();
  });

  it('renders Footer component', () => {
    render(<App />);
    // Footer typically contains copyright or links
    const footer = document.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });

});
