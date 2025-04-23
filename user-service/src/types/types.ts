export interface EventUser {
  email: string;
  username: string;
  bio?: string;
}

export interface User extends EventUser {
  avatar: string;
}
