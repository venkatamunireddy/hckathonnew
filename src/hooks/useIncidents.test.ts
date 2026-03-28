import { renderHook, act } from '@testing-library/react';
import { useIncidents } from './useIncidents';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() }))
  }
}));

describe('useIncidents', () => {
  const mockUser = { uid: 'user123' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty incidents and null error', () => {
    (onSnapshot as any).mockReturnValue(vi.fn());
    const { result } = renderHook(() => useIncidents(mockUser as any));
    expect(result.current.incidents).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle adding an incident', async () => {
    const mockData = {
      incident_id: 'inc123',
      domain: 'medical',
      urgency_level: 5,
      verified_summary: 'Test summary',
      structured_actions: []
    };
    const mockDocRef = { id: 'doc123' };
    (addDoc as any).mockResolvedValue(mockDocRef);

    const { result } = renderHook(() => useIncidents(mockUser as any));
    
    let added;
    await act(async () => {
      added = await result.current.addIncident(mockData as any, 'raw input');
    });

    expect(addDoc).toHaveBeenCalled();
    expect(added.id).toBe('doc123');
  });

  it('should handle fetch error', () => {
    const mockError = new Error('Fetch failed');
    (onSnapshot as any).mockImplementation((_q: any, _callback: any, errorCallback: any) => {
      errorCallback(mockError);
      return vi.fn();
    });

    const { result } = renderHook(() => useIncidents(mockUser as any));
    expect(result.current.error).toContain('Failed to fetch');
  });
});
