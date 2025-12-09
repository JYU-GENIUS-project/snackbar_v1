import { useEffect, useMemo, useState } from 'react';
import LoginPanel from './components/LoginPanel.jsx';
import ProductManager from './components/ProductManager.jsx';
import { useLogout } from './hooks/useAuth.js';
import { apiRequest } from './services/apiClient.js';

const STORAGE_KEY = 'snackbar-admin-auth';
const SESSION_STATE_KEY = 'snackbar-admin-session-state';

const readStoredAuth = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.token) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to read stored auth payload', error);
    return null;
  }
};

const readSessionState = () => {
  try {
    return window.sessionStorage.getItem(SESSION_STATE_KEY);
  } catch (error) {
    console.warn('Failed to read session state hint', error);
    return null;
  }
};

const writeSessionState = (value) => {
  try {
    if (value) {
      window.sessionStorage.setItem(SESSION_STATE_KEY, value);
    } else {
      window.sessionStorage.removeItem(SESSION_STATE_KEY);
    }
  } catch (error) {
    console.warn('Failed to persist session state hint', error);
  }
};

const App = () => {
  const [auth, setAuth] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [authNotice, setAuthNotice] = useState(null);
  const { mutateAsync: logoutAsync, isPending: isLogoutPending } = useLogout();

  useEffect(() => {
    if (auth?.token) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [auth]);

  useEffect(() => {
    let isActive = true;

    const bootstrapSession = async () => {
      const storedAuth = readStoredAuth();
      const priorSessionState = readSessionState();
      const params = new URLSearchParams(window.location.search);
      const shouldForceLogout = params.get('logout') === '1';

      let nextAuth = storedAuth;
      let nextNotice = null;

      if (shouldForceLogout && storedAuth?.token) {
        try {
          await logoutAsync({ token: storedAuth.token });
        } catch (error) {
          console.warn('Forced logout failed, clearing locally', error);
        }
        writeSessionState('expired');
        nextAuth = null;
        nextNotice = {
          tone: 'warning',
          message: 'Your session expired due to inactivity. Please sign in again.'
        };
      }

      if (shouldForceLogout) {
        params.delete('logout');
        const newSearch = params.toString();
        const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
        window.history.replaceState(null, document.title, newUrl);
      }

      if (nextAuth?.token) {
        try {
          const response = await apiRequest({
            path: '/auth/me',
            method: 'GET',
            token: nextAuth.token
          });

          nextAuth = {
            token: nextAuth.token,
            expiresAt: nextAuth.expiresAt,
            user: response.data || nextAuth.user
          };
        } catch (error) {
          console.warn('Stored session invalid, clearing local auth', error);
          nextAuth = null;
          if (error.status === 401 || error.status === 403) {
            writeSessionState('expired');
            nextNotice = {
              tone: 'warning',
              message: 'Your session has ended. Please sign in again.'
            };
          }
        }
      } else if (priorSessionState === 'active') {
        writeSessionState('expired');
        nextNotice = {
          tone: 'warning',
          message: 'Your session expired due to inactivity. Please sign in again.'
        };
      }

      if (isActive) {
        setAuth(nextAuth);
        setAuthNotice(nextNotice);
        setIsBootstrapping(false);
      }
    };

    bootstrapSession();

    return () => {
      isActive = false;
    };
  }, [logoutAsync]);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    if (auth?.token) {
      window.location.hash = '#/dashboard';
    } else {
      window.location.hash = '#/login';
    }
  }, [auth?.token, isBootstrapping]);

  const handleLogin = (payload) => {
    writeSessionState('active');
    setAuth({
      token: payload.token,
      expiresAt: payload.expiresAt,
      user: payload.user
    });
    setAuthNotice(null);
  };

  const handleLogout = async () => {
    if (!auth?.token) {
      setAuth(null);
      writeSessionState('manual');
      return;
    }

    try {
      await logoutAsync({ token: auth.token });
    } catch (error) {
      console.warn('Logout failed, clearing local auth anyway', error);
    } finally {
      writeSessionState('manual');
      setAuth(null);
      setAuthNotice(null);
    }
  };

  const expiresInMinutes = useMemo(() => {
    if (!auth?.expiresAt) {
      return null;
    }
    const expiresAt = new Date(auth.expiresAt).getTime();
    const diffMs = expiresAt - Date.now();
    return Math.max(Math.round(diffMs / 60000), 0);
  }, [auth]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <strong>Snackbar Admin Portal</strong>
          {auth?.user?.username ? (
            <span style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af' }}>
              Signed in as {auth.user.username}
              {typeof expiresInMinutes === 'number' ? ` · Session expires in ~${expiresInMinutes} min` : ''}
            </span>
          ) : (
            <span style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af' }}>
              Sign in to manage product catalog
            </span>
          )}
        </div>
        {auth?.token && (
          <button
            id="logout-button"
            className="button secondary"
            type="button"
            onClick={handleLogout}
            disabled={isLogoutPending}
          >
            {isLogoutPending ? 'Signing out…' : 'Sign out'}
          </button>
        )}
      </header>
      <main className="app-content">
        {isBootstrapping ? (
          <section className="card" id="auth-loading" role="status" aria-live="polite">
            <p>Checking your session…</p>
          </section>
        ) : auth?.token ? (
          <div id="admin-dashboard" className="stack">
            {typeof expiresInMinutes === 'number' && expiresInMinutes <= 1 && (
              <div id="session-message" className="alert warning">
                <span>Your session is about to expire. Any activity will extend it.</span>
              </div>
            )}
            <ProductManager auth={auth} />
          </div>
        ) : (
          <LoginPanel onSuccess={handleLogin} notice={authNotice} />
        )}
      </main>
    </div>
  );
};

export default App;
