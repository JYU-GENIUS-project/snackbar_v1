import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';

export const useLogin = () => {
  return useMutation({
    mutationFn: async ({ username, password }) => {
      const response = await apiRequest({
        path: '/auth/login',
        method: 'POST',
        body: { username, password }
      });

      return response.data;
    }
  });
};

export const useLogout = () => {
  return useMutation({
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
