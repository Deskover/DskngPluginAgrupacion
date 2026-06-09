type ScopedVarValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | {
      value?: unknown;
      text?: unknown;
    }
  | unknown[];

type ResolveJwtTokenArgs = {
  scopedVars?: Record<string, ScopedVarValue>;
  search?: string;
};

const JWT_KEYS = ['jwtToken', 'var-jwtToken'] as const;

const normalizeTokenValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeTokenValue(item);
      if (normalized) {
        return normalized;
      }
    }
    return undefined;
  }

  if (value && typeof value === 'object') {
    const asRecord = value as { value?: unknown; text?: unknown };
    return normalizeTokenValue(asRecord.value) ?? normalizeTokenValue(asRecord.text);
  }

  return undefined;
};

export const resolveJwtToken = ({ scopedVars, search }: ResolveJwtTokenArgs): string | undefined => {
  if (search) {
    try {
      const params = new URLSearchParams(search);
      for (const key of JWT_KEYS) {
        const token = normalizeTokenValue(params.get(key));
        if (token) {
          return token;
        }
      }
    } catch {
      // Ignoramos URLs mal formadas y seguimos con scopedVars.
    }
  }

  if (scopedVars) {
    for (const key of JWT_KEYS) {
      const token = normalizeTokenValue(scopedVars[key]);
      if (token) {
        return token;
      }
    }
  }

  return undefined;
};

export const withAuthTokenHeader = (
  headers?: Record<string, string>,
  jwtToken?: string
): Record<string, string> | undefined => {
  const nextHeaders = headers ? { ...headers } : {};

  Object.keys(nextHeaders).forEach((key) => {
    if (key.toLowerCase() === 'auth-token') {
      delete nextHeaders[key];
    }
  });

  if (jwtToken) {
    nextHeaders['auth-token'] = jwtToken;
  }

  return Object.keys(nextHeaders).length > 0 ? nextHeaders : undefined;
};
