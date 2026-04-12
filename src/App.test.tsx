import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders Upload Page at root route', () => {
    render(<App />);
    expect(screen.getByText('GST Statement Processor')).toBeInTheDocument();
  });
});
