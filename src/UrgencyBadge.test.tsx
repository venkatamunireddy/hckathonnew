import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { UrgencyBadge } from './App';

describe('UrgencyBadge Component', () => {
  it('renders correctly with level 1', () => {
    render(<UrgencyBadge level={1} />);
    expect(screen.getByText(/Level 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Urgency Level 1/i)).toBeInTheDocument();
  });

  it('renders correctly with level 5', () => {
    render(<UrgencyBadge level={5} />);
    expect(screen.getByText(/Level 5/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Urgency Level 5/i)).toBeInTheDocument();
  });
});
