import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for expected errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test child</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Test child')).toBeDefined();
  });

  it('should render fallback UI when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('System Breach Detected')).toBeDefined();
    expect(screen.getByText('Test error')).toBeDefined();
  });

  it('should handle reset', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    const resetButton = screen.getByText('Re-establish Connection');
    fireEvent.click(resetButton);

    // After reset, it should try to render children again
    rerender(
      <ErrorBoundary>
        <div>Recovered</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Recovered')).toBeDefined();
  });
});
