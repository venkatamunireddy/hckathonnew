import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { IncidentData } from '../services/gemini';

/**
 * Represents an incident record stored in the database.
 */
export interface IncidentRecord extends IncidentData {
  /** Firestore document ID */
  id: string;
  /** Timestamp of creation */
  createdAt: Timestamp;
  /** The original unstructured input */
  raw_input: string;
  /** The UID of the user who created the record */
  uid: string;
}

/**
 * Custom hook to manage fetching and storing incidents in Firestore.
 * 
 * @param user - The current authenticated user.
 * @returns An object containing the list of incidents, error state, and methods to add incidents.
 */
export function useIncidents(user: User | null) {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIncidents([]);
      return;
    }

    const q = query(
      collection(db, 'incidents'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as IncidentRecord[];
      setIncidents(records);
    }, (err) => {
      console.error("Firestore error:", err);
      setError("Failed to fetch records. Check security rules.");
    });

    return () => unsubscribe();
  }, [user]);

  const addIncident = useCallback(async (data: IncidentData, rawInput: string) => {
    if (!user) throw new Error("User must be authenticated to add an incident.");
    
    const record = {
      ...data,
      raw_input: rawInput,
      uid: user.uid,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'incidents'), record);
    return { id: docRef.id, ...record } as IncidentRecord;
  }, [user]);

  return { incidents, error, addIncident };
}
