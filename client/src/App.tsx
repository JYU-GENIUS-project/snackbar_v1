import { useEffect, useMemo, useState } from 'react';
import LoginPanel from './components/LoginPanel.js';
import ProductManager from './components/ProductManager.js';
import KioskApp from './components/KioskApp.js';
import { useLogout } from './hooks/useAuth.js';
import { apiRequest } from './services/apiClient.js';

type AuthUser = {
  username?: string;
};

type AuthPayload = {
  token: string;
  expiresAt?: string | undefined;
  user?: AuthUser | undefined;
};

type AuthMeResponse = {
  data?: AuthUser;
};

type AuthNoticeTone = 'warning' | 'info' | 'success' | 'error';

type AuthNotice = {
  tone: AuthNoticeTone;
  message: string;
};

type ApiError = {
  status?: number;
};

const STORAGE_KEY = 'snackbar-admin-auth';
const SESSION_STATE_KEY = 'snackbar-admin-session-state';

const readStoredAuth = (): AuthPayload | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<AuthPayload> | null;
    if (!parsed?.token || typeof parsed.token !== 'string') {
      return null;
    }
    return {
      token: parsed.token,
      ...(typeof parsed.expiresAt === 'string' ? { expiresAt: parsed.expiresAt } : {}),
      ...(parsed.user ? { user: parsed.user } : {})
    };
  } catch (error) {
    console.warn('Failed to read stored auth payload', error);
    return null;
  }
};

const readSessionState = (): string | null => {
  try {
    return window.sessionStorage.getItem(SESSION_STATE_KEY);
  } catch (error) {
    console.warn('Failed to read session state hint', error);
    return null;
  }
};

const writeSessionState = (value: string | null): void => {
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

const isApiError = (error: unknown): error is ApiError => {
  return typeof error === 'object' && error !== null && 'status' in error;
};

const AdminApp = () => {
  const [auth, setAuth] = useState<AuthPayload | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null);
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
      let nextNotice: AuthNotice | null = null;

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
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => {
          controller.abort();
        }, 1000);
        try {
          const response = await apiRequest<AuthMeResponse>({
            path: '/auth/me',
            method: 'GET',
            token: nextAuth.token,
            signal: controller.signal
          });

          const nextUser = (response?.data ?? nextAuth.user) as AuthUser | undefined;

          if (nextAuth) {
            nextAuth = {
              token: nextAuth.token,
              ...(nextAuth.expiresAt ? { expiresAt: nextAuth.expiresAt } : {}),
              ...(nextUser ? { user: nextUser } : {})
            };
          }
        } catch (error) {
          if (isApiError(error) && (error.status === 401 || error.status === 403)) {
            console.warn('Stored session invalid, clearing local auth', error);
            nextAuth = null;
            writeSessionState('expired');
            nextNotice = {
              tone: 'warning',
              message: 'Your session has ended. Please sign in again.'
            };
          } else {
            console.warn('Auth verification unavailable, continuing in offline mode', error);
            if (nextAuth) {
              nextAuth = {
                token: nextAuth.token,
                ...(nextAuth.expiresAt ? { expiresAt: nextAuth.expiresAt } : {}),
                user: nextAuth.user || { username: storedAuth?.user?.username || 'admin@example.com' }
              };
            }
            if (!nextNotice) {
              nextNotice = {
                tone: 'info',
                message: 'Working in offline mode. Some features may be limited.'
              };
            }
            writeSessionState('active');
          }
        } finally {
          window.clearTimeout(timeoutId);
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
      const path = window.location.pathname;
      const wantsProducts = path.startsWith('/admin/products');
      if (path.startsWith('/admin') && path !== '/admin/' && path !== '/admin') {
        window.history.replaceState(null, document.title, '/admin/');
      }
      if (wantsProducts) {
        window.location.hash = '#/products';
        return;
      }
      if (!window.location.hash || window.location.hash === '#/login') {
        window.location.hash = '#/dashboard';
      }
    } else {
      window.location.hash = '#/login';
    }
  }, [auth?.token, isBootstrapping]);

  const handleLogin = (payload: AuthPayload) => {
    writeSessionState('active');
    setAuth({
      token: payload.token,
      ...(payload.expiresAt ? { expiresAt: payload.expiresAt } : {}),
      ...(payload.user ? { user: payload.user } : {})
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

  const expiresInMinutes = useMemo<number | null>(() => {
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

const isAdminRoute = (path: string): boolean => path.startsWith('/admin');

const App = () => {
  const [adminRoute, setAdminRoute] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return isAdminRoute(window.location.pathname);
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => { };
    }

    const handleRouteChange = () => {
      setAdminRoute(isAdminRoute(window.location.pathname));
    };

    const wrapHistoryMethod = <T extends (...args: any[]) => unknown>(method: T) => {
      return function wrappedHistoryMethod(this: History, ...args: Parameters<T>) {
        const result = method.apply(this, args);
        handleRouteChange();
        return result;
      };
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    window.history.pushState = wrapHistoryMethod(originalPushState);
    window.history.replaceState = wrapHistoryMethod(originalReplaceState);

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  if (!adminRoute) {
    return <KioskApp />;
  }

  return <AdminApp />;
};

export default App;
