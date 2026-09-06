import { useMutation } from '@tanstack/react-query';
import { login } from './auth';

/** The response-handling wrapper for the auth entry point: loading/error/success via React Query. */
export function useLogin() {
  return useMutation({ mutationFn: (username: string) => login(username) });
}
