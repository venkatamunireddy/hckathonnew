import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { auth } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../firebase', () => ({
  auth: {
    currentUser: null
  }
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GoogleAuthProvider: vi.fn()
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null user and loading true', () => {
    (onAuthStateChanged as any).mockImplementation((_auth: any, callback: any) => {
      // Don't call callback yet
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('should update user when auth state changes', () => {
    const mockUser = { uid: '123', email: 'test@example.com' };
    (onAuthStateChanged as any).mockImplementation((_auth: any, callback: any) => {
      callback(mockUser);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.loading).toBe(false);
  });

  it('should handle login', async () => {
    const mockUser = { uid: '123' };
    (signInWithPopup as any).mockResolvedValue({ user: mockUser });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login();
    });

    expect(signInWithPopup).toHaveBeenCalled();
  });

  it('should handle logout', async () => {
    (signOut as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.logout();
    });

    expect(signOut).toHaveBeenCalled();
  });
});
