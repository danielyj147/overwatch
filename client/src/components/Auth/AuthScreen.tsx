import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { clsx } from 'clsx';

type AuthMode = 'login' | 'signup' | 'admin';

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminSecret, setShowAdminSecret] = useState(false);

  const { login, signup, adminRegister, isLoading, error, signupMessage, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'login') {
      await login(email, password);
    } else if (mode === 'signup') {
      await signup(email, password, name);
    } else if (mode === 'admin') {
      await adminRegister(email, password, name, adminSecret);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center glow-box"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <div className="w-5 h-5 rounded-full border-2 border-white" />
            </div>
            <span
              className="text-3xl font-bold glow-text"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Overwatch
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)' }}>Real-time collaborative mapping</p>
          <p
            className="text-sm mt-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Built by <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Daniel Jeong</span>
          </p>
        </div>

        {/* Auth Card */}
        <div
          className="rounded-lg p-6 corner-accents glow-border"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            {mode === 'admin' && (
              <Shield size={24} style={{ color: 'var(--color-accent)' }} />
            )}
            <h2
              className="text-xl font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {mode === 'login' && 'Welcome back'}
              {mode === 'signup' && 'Create an account'}
              {mode === 'admin' && 'Admin Registration'}
            </h2>
          </div>

          {mode === 'login' && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <p className="font-medium mb-1" style={{ color: 'var(--color-accent)' }}>
                Demo Credentials:
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Email: test2@overwatch.danielyj.com
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Password: testtest
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(mode === 'signup' || mode === 'admin') && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Display Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="input-futuristic w-full"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input-futuristic w-full"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="input-futuristic w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'admin' && (
              <div>
                <label
                  htmlFor="adminSecret"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Admin Secret Key
                </label>
                <div className="relative">
                  <input
                    id="adminSecret"
                    type={showAdminSecret ? 'text' : 'password'}
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                    placeholder="••••••••••••••••"
                    required
                    className="input-futuristic w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminSecret(!showAdminSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {showAdminSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: 'var(--color-error)',
                }}
              >
                {error}
              </div>
            )}

            {signupMessage && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.5)',
                  color: '#22c55e',
                }}
              >
                {signupMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={clsx(
                'w-full py-2.5 font-medium transition-all flex items-center justify-center gap-2 btn-primary',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
              style={{ borderRadius: 'var(--border-radius)' }}
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {mode === 'login' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'admin' && 'Register as Admin'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm transition-colors block w-full"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <span style={{ color: 'var(--color-accent)' }}>Sign up</span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span style={{ color: 'var(--color-accent)' }}>Sign in</span>
                </>
              )}
            </button>
            {mode !== 'admin' && (
              <button
                onClick={() => switchMode('admin')}
                className="text-xs transition-colors flex items-center justify-center gap-1 mx-auto"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Shield size={14} />
                <span>Register as Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            © 2025 Daniel Jeong. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
