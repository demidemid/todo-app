import { useState } from 'react';
import type { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';

interface LoginProps {
  user: User | null;
}

const getErrorMessage = (error: unknown) => {
  const firebaseError = error as FirebaseError;

  if (firebaseError?.code === 'auth/configuration-not-found') {
    return 'Firebase Authentication is not configured for this project. Open Firebase Console -> Authentication -> Sign-in method and enable Email/Password.';
  }

  if (firebaseError?.code === 'auth/operation-not-allowed') {
    return 'Email/password sign-in is disabled. Enable Email/Password in Firebase Console -> Authentication -> Sign-in method.';
  }

  if (firebaseError?.code === 'auth/invalid-credential') {
    return 'Invalid email or password. Check your credentials, or reset password if you already have an account.';
  }

  if (firebaseError?.code === 'auth/invalid-email') {
    return 'Invalid email format. Please enter a valid email address.';
  }

  if (firebaseError?.code === 'auth/user-not-found') {
    return 'No account found for this email. Use Create account first.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected auth error';
};

export const Login = ({ user }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setError('');
    setInfo('');

    if (!normalizedEmail) {
      setError('Enter your email first, then click Forgot password.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setInfo('Password reset email sent. Check your inbox and spam folder.');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  if (user) {
    return (
      <div className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4">
        <p className="text-sm text-emerald-100">
          Logged in as <strong>{user.email}</strong>
        </p>
        <button
          onClick={handleLogout}
          className="mt-3 rounded-lg border border-rose-300/40 bg-rose-300/10 px-3 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-300/20"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-slate-800/70 p-5 shadow-xl"
      >
        <h2 className="mb-4 text-xl font-semibold text-white">
          {isSignUp ? 'Create account' : 'Sign in'}
        </h2>

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          required
          className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        />

        <label className="mb-2 block text-xs uppercase tracking-wide text-slate-300">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        />

        {error && (
          <p className="mb-4 rounded-lg border border-rose-300/30 bg-rose-400/10 p-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        {info && (
          <p className="mb-4 rounded-lg border border-emerald-300/30 bg-emerald-400/10 p-2 text-sm text-emerald-200">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={() => setIsSignUp((prev) => !prev)}
          className="mt-3 w-full rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
        </button>

        {!isSignUp && (
          <button
            type="button"
            onClick={handleResetPassword}
            className="mt-4 block w-full text-center text-xs font-medium text-cyan-200 underline decoration-cyan-200/70 underline-offset-4 transition hover:text-cyan-100"
          >
            Forgot password?
          </button>
        )}
      </form>
    </div>
  );
};
