import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import App from './App';

// We need to mock the hooks used in App
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    error: null
  })
}));

vi.mock('./hooks/useIncidents', () => ({
  useIncidents: () => ({
    incidents: [],
    addIncident: vi.fn(),
    error: null
  })
}));

vi.mock('./hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: () => ({
    isListening: false,
    toggleListening: vi.fn(),
    error: null
  })
}));

describe('App Component', () => {
  it('renders the login screen when not authenticated', () => {
    render(<App />);
    expect(screen.getByText(/HumanHelpBridge/i)).toBeInTheDocument();
    expect(screen.getByText(/Authenticate with Google/i)).toBeInTheDocument();
  });
});
