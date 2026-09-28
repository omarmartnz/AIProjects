export type CloudSecurityMode = 'strict' | 'compat';

function normalizeMode(rawMode?: string | null): CloudSecurityMode {
  const clean = (rawMode || '').trim().toLowerCase();
  return clean === 'strict' ? 'strict' : 'compat';
}

export function resolveCloudSecurityMode(rawMode?: string | null, isProd: boolean = import.meta.env.PROD): CloudSecurityMode {
  const requestedMode = normalizeMode(rawMode ?? import.meta.env.VITE_CLOUD_SECURITY_MODE);
  if (isProd) return 'strict';
  return requestedMode;
}

export const cloudSecurityMode: CloudSecurityMode = resolveCloudSecurityMode();
export const isCloudSecurityStrict = cloudSecurityMode === 'strict';
