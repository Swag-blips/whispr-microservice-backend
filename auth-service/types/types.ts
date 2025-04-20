export interface AuthPayload {
  username: string;
  email: string;
  password: string;
  isVerified: boolean;
  avatar: string | null;
}
