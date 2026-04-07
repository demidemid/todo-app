import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { Todo, TodoInput } from '../types/todo';

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(Boolean(auth.currentUser));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      return;
    }

    const q = query(collection(db, 'todos'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextTodos = snapshot.docs.map((item) => ({
          ...(item.data() as Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>),
          id: item.id,
          createdAt: (item.data().createdAt as Timestamp).toDate(),
          updatedAt: (item.data().updatedAt as Timestamp).toDate(),
        }));

        setTodos(nextTodos);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addTodo = async (todo: Omit<TodoInput, 'userId'>) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated');

    const docRef = await addDoc(collection(db, 'todos'), {
      ...todo,
      userId: user.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    const todoRef = doc(db, 'todos', id);

    await updateDoc(todoRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  };

  const deleteTodo = async (id: string) => {
    await deleteDoc(doc(db, 'todos', id));
  };

  return { todos, loading, error, addTodo, updateTodo, deleteTodo };
};
