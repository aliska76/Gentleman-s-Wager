import { useState, type FormEvent } from 'react';
import { useLogin } from '../../api/useAuth';
import type { PlayerSession } from '../../context/PlayersContext';
import { Button } from '../common/Button.styles';
import { ErrorText } from '../common/Typography.styles';
import { Form, Label } from './LoginForm.styles';

interface LoginFormProps {
  label: string;
  onSuccess: (session: PlayerSession) => void;
  className?: string;
}

/** A single username-only login field — reused once per player (see PlayersContext). */
export function LoginForm({ label, onSuccess, className }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const loginMutation = useLogin();
  const fieldId = `username-${label.replace(/\s+/g, '-').toLowerCase()}`;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    loginMutation.mutate(trimmed, { onSuccess });
  }

  return (
    <Form onSubmit={handleSubmit} className={className} data-testid="login-form">
      <Label htmlFor={fieldId}>{label}</Label>
      <input
        id={fieldId}
        data-testid="login-username-input"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter a name"
        minLength={2}
        maxLength={24}
        required
      />
      <Button type="submit" data-testid="login-submit" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? 'Signing in…' : 'Continue'}
      </Button>
      {loginMutation.isError && <ErrorText data-testid="login-error">{loginMutation.error.message}</ErrorText>}
    </Form>
  );
}
