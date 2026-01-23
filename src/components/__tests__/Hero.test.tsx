import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Hero } from '../Hero';

describe('Hero', () => {
  beforeEach(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders the hero section', () => {
    render(<Hero />);
    const section = document.getElementById('hero');
    expect(section).toBeInTheDocument();
  });

  it('displays the name with gradient styling', () => {
    render(<Hero />);
    const name = screen.getByText('Trystan Bates-Maricle');
    expect(name).toBeInTheDocument();
  });

  it('displays the title', () => {
    render(<Hero />);
    const title = screen.getByText(/AI\/ML Engineer \| Full-Stack Developer \| Cloud Infrastructure/i);
    expect(title).toBeInTheDocument();
  });

  it('displays the tagline', () => {
    render(<Hero />);
    const tagline = screen.getByText('Building intelligent systems that scale');
    expect(tagline).toBeInTheDocument();
  });

  it('renders "View Experience" button', () => {
    render(<Hero />);
    const button = screen.getByRole('button', { name: /navigate to experience section/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('View Experience');
  });

  it('renders "Let\'s Connect" button', () => {
    render(<Hero />);
    const button = screen.getByRole('button', { name: /navigate to contact section/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Let's Connect");
  });

  it('scrolls to experience section when "View Experience" is clicked', async () => {
    const user = userEvent.setup();
    
    // Create a mock element for the experience section
    const experienceSection = document.createElement('div');
    experienceSection.id = 'experience';
    document.body.appendChild(experienceSection);
    
    render(<Hero />);
    const button = screen.getByRole('button', { name: /navigate to experience section/i });
    
    await user.click(button);
    
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    
    document.body.removeChild(experienceSection);
  });

  it('scrolls to contact section when "Let\'s Connect" is clicked', async () => {
    const user = userEvent.setup();
    
    // Create a mock element for the contact section
    const contactSection = document.createElement('div');
    contactSection.id = 'contact';
    document.body.appendChild(contactSection);
    
    render(<Hero />);
    const button = screen.getByRole('button', { name: /navigate to contact section/i });
    
    await user.click(button);
    
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    
    document.body.removeChild(contactSection);
  });

  it('handles missing section gracefully', async () => {
    const user = userEvent.setup();
    render(<Hero />);
    const button = screen.getByRole('button', { name: /navigate to experience section/i });
    
    // Should not throw when section doesn't exist
    await user.click(button);
    
    // scrollIntoView should not be called if element doesn't exist
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
