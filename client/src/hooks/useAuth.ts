import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';

type AuthUser = {
  username?: string;
};

type AuthPayload = {
  token: string;
  expiresAt?: string;
  user?: AuthUser;
};

type LoginInput = {
  username: string;
  password: string;
};

type LogoutInput = {
  token?: string;
};

type ApiResponse<T> = {
  data: T;
};

export const useLogin = () => {
  return useMutation<AuthPayload, Error, LoginInput>({
    mutationFn: async ({ username, password }) => {
      const response = (await apiRequest({
        path: '/auth/login',
        method: 'POST',
        body: { username, password }
      })) as ApiResponse<AuthPayload>;

      return response.data;
    }
  });
};

export const useLogout = () => {
  return useMutation<null, Error, LogoutInput>({
    mutationFn: async ({ token } = {}) => {
      if (!token) {
        return null;
      }

      await apiRequest({
        path: '/auth/logout',
        method: 'POST',
        token
      });
      return null;
    }
  });
};
