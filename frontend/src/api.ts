// Simple API helper that scans the backend ports (3000-3005) the NestJS server may bind to.
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  city: string | null;
  region: string | null;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  currentDestination: string | null;
}

let cachedPort: number | null = null;

async function request(path: string, body: unknown): Promise<AuthUser> {
  const ports = cachedPort ? [cachedPort] : [3000, 3001, 3002, 3003, 3004, 3005];
  let lastError = 'Не вдалося з’єднатися із сервером';

  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      cachedPort = port;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Помилка запиту');
      }
      return data.user as AuthUser;
    } catch (e: any) {
      // A thrown Error with a message means the server responded with an error — surface it.
      if (e instanceof Error && e.message && e.message !== 'Failed to fetch') {
        lastError = e.message;
        if (cachedPort === port) throw new Error(lastError);
      }
      // otherwise: connection failed, try next port
    }
  }
  throw new Error(lastError);
}

export function registerUser(payload: {
  username: string;
  email: string;
  password: string;
  region: string;
  city: string;
}) {
  return request('/api/auth/register', payload);
}

export function loginUser(payload: { email: string; password: string }) {
  return request('/api/auth/login', payload);
}
