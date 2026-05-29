import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface UserProfile {
  id: string;
  email: string;
}

const parseEmail = (value: unknown): string => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const parseTimestamp = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  return new Date(0);
};

export const useUsers = (currentUserId: string | null) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      setUsers([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const parsedUsers = snapshot.docs
          .map((item) => {
            const data = item.data();
            return {
              id: item.id,
              email: parseEmail(data.email),
              updatedAt: parseTimestamp(data.updatedAt),
            };
          })
          .filter((user) => user.id !== currentUserId && user.email.length > 0)
          .sort((a, b) => {
            const byEmail = a.email.localeCompare(b.email);
            if (byEmail !== 0) return byEmail;
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          })
          .map(({ id, email }) => ({ id, email }));

        setUsers(parsedUsers);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message || 'Failed to load users');
        setUsers([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUserId]);

  return { users, loading, error };
};
