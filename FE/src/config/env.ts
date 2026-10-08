/**
 * EXPO_PUBLIC_* values are compiled into the client bundle and are visible to
 * app users. Only public configuration, such as the API origin, belongs here.
 */
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '') ?? '';

export const env = {
  apiBaseUrl,
} as const;
