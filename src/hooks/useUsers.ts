import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatarId?: string;
}

const parseEmail = (value: unknown): string => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const parseName = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const parseAvatarId = (value: unknown): string | undefined => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined);

const parseTimestamp = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  return new Date(0);
};

export const useUsers = (currentUserId: string | null) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) return;

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
              name: parseName(data.name),
              avatarId: parseAvatarId(data.avatarId),
              updatedAt: parseTimestamp(data.updatedAt),
            };
          })
          .filter((user) => user.id !== currentUserId && user.email.length > 0)
          .sort((a, b) => {
            const byEmail = a.email.localeCompare(b.email);
            if (byEmail !== 0) return byEmail;
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          })
          .map(({ id, email, name, avatarId }) => ({ id, email, name, avatarId }));

        setUsers(parsedUsers);
        setError(null);
        setResolvedUserId(currentUserId);
      },
      (snapshotError) => {
        setError(snapshotError.message || 'Failed to load users');
        setUsers([]);
        setResolvedUserId(currentUserId);
      }
    );

    return () => unsub();
  }, [currentUserId]);

  if (!currentUserId) {
    return { users: [], loading: false, error: null };
  }

  const resolved = resolvedUserId === currentUserId;

  return {
    users: resolved ? users : [],
    loading: !resolved,
    error: resolved ? error : null,
  };
};
