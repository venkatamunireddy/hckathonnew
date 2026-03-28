import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { UrgencyBadge } from './App';

describe('UrgencyBadge Component', () => {
  [1, 2, 3, 4, 5].forEach(level => {
    it(`renders correctly with level ${level}`, () => {
      render(<UrgencyBadge level={level} />);
      expect(screen.getByText(new RegExp(`Level ${level}`, 'i'))).toBeDefined();
      expect(screen.getByLabelText(new RegExp(`Urgency Level ${level}`, 'i'))).toBeDefined();
    });
  });
});
