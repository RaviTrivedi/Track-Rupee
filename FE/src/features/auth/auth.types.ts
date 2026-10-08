export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthPayload = AuthTokens & { user: PublicUser };

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};
