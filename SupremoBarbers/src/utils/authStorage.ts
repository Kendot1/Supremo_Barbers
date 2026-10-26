const AUTH_TOKEN_KEY = "authToken";
const CURRENT_USER_KEY = "currentUser";
const LOGIN_TIME_KEY = "loginTime";
const REMEMBERED_USERNAME_KEY = "rememberedUsername";
const LEGACY_REMEMBERED_PASSWORD_KEY = "rememberedPassword";

function read(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function write(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Private browsing and blocked storage should not prevent sign-in.
  }
}

function remove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Storage cleanup is best-effort.
  }
}

function migrateLegacySession(): void {
  if (typeof window === "undefined") return;

  const legacyToken = read(window.localStorage, AUTH_TOKEN_KEY);
  const legacyUser = read(window.localStorage, CURRENT_USER_KEY);
  const legacyLoginTime = read(window.localStorage, LOGIN_TIME_KEY);

  if (legacyToken) write(window.sessionStorage, AUTH_TOKEN_KEY, legacyToken);
  if (legacyUser) write(window.sessionStorage, CURRENT_USER_KEY, legacyUser);
  if (legacyLoginTime) write(window.sessionStorage, LOGIN_TIME_KEY, legacyLoginTime);

  if (legacyToken || legacyUser || legacyLoginTime) {
    remove(window.localStorage, AUTH_TOKEN_KEY);
    remove(window.localStorage, CURRENT_USER_KEY);
    remove(window.localStorage, LOGIN_TIME_KEY);
  }

  // Remove the old plaintext credential if a previous build created it.
  remove(window.localStorage, LEGACY_REMEMBERED_PASSWORD_KEY);
}

export function getAuthSession<TUser = unknown>(): {
  token: string | null;
  user: TUser | null;
  loginTime: string | null;
} {
  if (typeof window === "undefined") {
    return { token: null, user: null, loginTime: null };
  }

  migrateLegacySession();

  const token = read(window.sessionStorage, AUTH_TOKEN_KEY);
  const serializedUser = read(window.sessionStorage, CURRENT_USER_KEY);
  let user: TUser | null = null;

  if (serializedUser) {
    try {
      user = JSON.parse(serializedUser) as TUser;
    } catch {
      remove(window.sessionStorage, CURRENT_USER_KEY);
    }
  }

  return {
    token,
    user,
    loginTime: read(window.sessionStorage, LOGIN_TIME_KEY),
  };
}

export function getStoredAuthToken(): string | null {
  return getAuthSession().token;
}

export function setAuthSession<TUser>(user: TUser, token: string): void {
  if (typeof window === "undefined") return;
  write(window.sessionStorage, CURRENT_USER_KEY, JSON.stringify(user));
  write(window.sessionStorage, AUTH_TOKEN_KEY, token);
  write(window.sessionStorage, LOGIN_TIME_KEY, Date.now().toString());
}

export function setStoredUser<TUser>(user: TUser): void {
  if (typeof window === "undefined") return;
  write(window.sessionStorage, CURRENT_USER_KEY, JSON.stringify(user));
}

export function setLoginTime(timestamp: number): void {
  if (typeof window === "undefined") return;
  write(window.sessionStorage, LOGIN_TIME_KEY, timestamp.toString());
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  remove(window.sessionStorage, AUTH_TOKEN_KEY);
  remove(window.sessionStorage, CURRENT_USER_KEY);
  remove(window.sessionStorage, LOGIN_TIME_KEY);
  remove(window.localStorage, AUTH_TOKEN_KEY);
  remove(window.localStorage, CURRENT_USER_KEY);
  remove(window.localStorage, LOGIN_TIME_KEY);
  remove(window.localStorage, LEGACY_REMEMBERED_PASSWORD_KEY);
}

export function getRememberedUsername(): string | null {
  if (typeof window === "undefined") return null;
  remove(window.localStorage, LEGACY_REMEMBERED_PASSWORD_KEY);
  return read(window.localStorage, REMEMBERED_USERNAME_KEY);
}

export function setRememberedUsername(username: string | null): void {
  if (typeof window === "undefined") return;
  remove(window.localStorage, LEGACY_REMEMBERED_PASSWORD_KEY);

  if (username) {
    write(window.localStorage, REMEMBERED_USERNAME_KEY, username);
  } else {
    remove(window.localStorage, REMEMBERED_USERNAME_KEY);
  }
}
