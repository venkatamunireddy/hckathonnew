import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { ActionCard } from './App';

describe('ActionCard Component', () => {
  const mockAction = {
    action_type: 'dispatch',
    target_system: '911-dispatch',
    payload_to_send: { location: 'Main St' }
  };

  it('renders action details correctly', () => {
    render(<ActionCard action={mockAction} />);
    expect(screen.getByText(/911-dispatch/i)).toBeDefined();
    expect(screen.getByText(/dispatch/i)).toBeDefined();
    expect(screen.getByText(/location/i)).toBeDefined();
    expect(screen.getByText(/Main St/i)).toBeDefined();
  });
});
