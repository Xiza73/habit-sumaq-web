export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
