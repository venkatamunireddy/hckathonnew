import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import App from './App';
import * as useAuthHook from './hooks/useAuth';
import * as useIncidentsHook from './hooks/useIncidents';
import * as useSpeechRecognitionHook from './hooks/useSpeechRecognition';

// Mock the hooks
vi.mock('./hooks/useAuth');
vi.mock('./hooks/useIncidents');
vi.mock('./hooks/useSpeechRecognition');

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login screen when not authenticated', () => {
    (useAuthHook.useAuth as any).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });
    (useIncidentsHook.useIncidents as any).mockReturnValue({
      incidents: [],
      addIncident: vi.fn(),
      error: null
    });
    (useSpeechRecognitionHook.useSpeechRecognition as any).mockReturnValue({
      isListening: false,
      toggleListening: vi.fn(),
      error: null
    });

    render(<App />);
    expect(screen.getByText(/HumanHelpBridge/i)).toBeDefined();
    expect(screen.getByText(/Authenticate with Google/i)).toBeDefined();
  });

  it('renders the main dashboard when authenticated', () => {
    (useAuthHook.useAuth as any).mockReturnValue({
      user: { uid: '123', email: 'test@example.com' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      error: null
    });
    (useIncidentsHook.useIncidents as any).mockReturnValue({
      incidents: [],
      addIncident: vi.fn(),
      error: null
    });
    (useSpeechRecognitionHook.useSpeechRecognition as any).mockReturnValue({
      isListening: false,
      toggleListening: vi.fn(),
      error: null
    });

    render(<App />);
    expect(screen.getByText(/Bridge Chaos/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter chaotic human input/i)).toBeDefined();
  });
});
