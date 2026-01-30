import { useState } from 'react';
import { useLogin } from '../hooks/useAuth';

type AuthUser = {
  username?: string;
};

type AuthPayload = {
  token: string;
  expiresAt?: string;
  user?: AuthUser;
};

type LoginNotice = {
  tone?: 'warning' | 'info' | 'success' | 'error';
  message: string;
};

type LoginPanelProps = {
  onSuccess: (payload: AuthPayload) => void;
  notice?: LoginNotice | null;
};

const LoginPanel = ({ onSuccess, notice }: LoginPanelProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username || !password) {
      return;
    }

    try {
      const result = await loginMutation.mutateAsync({ username, password });
      onSuccess(result);
    } catch (error) {
      // error handled via mutation state
    }
  };

  return (
    <section className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
      <h2>Administrator Sign In</h2>
      <p className="helper" style={{ marginBottom: '1rem' }}>
        Use your administrative account to manage the product catalog and media assets.
      </p>
      {notice?.message && (
        <div
          id="session-message"
          className={`alert ${notice.tone === 'warning' ? 'warning' : 'info'}`}
          role="status"
        >
          <span>{notice.message}</span>
        </div>
      )}
      <form id="login-form" className="stack" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {loginMutation.isError && (
          <div className="alert error" id="login-error" role="alert">
            <span>{loginMutation.error?.message || 'Invalid username or password.'}</span>
          </div>
        )}
        <button id="login-button" className="button" type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  );
};

export default LoginPanel;
