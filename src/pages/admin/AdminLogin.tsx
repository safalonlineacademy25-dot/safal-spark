import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { BookOpen, Lock, Mail, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, signIn, signUp } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  // Check for password reset token in URL
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    if (type === 'recovery') {
      setAuthMode('reset');
    }
  }, []);

  // Load signup setting
  useEffect(() => {
    const loadSignupSetting = async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_setting', {
          setting_key: 'admin_signup_enabled'
        });
        if (!error && data !== null) {
          setSignupEnabled(data === 'true');
        }
      } catch (err) {
        console.error('Error loading signup setting:', err);
      } finally {
        setLoadingSettings(false);
      }
    };
    loadSignupSetting();
  }, []);

  useEffect(() => {
    if (!authLoading && user && isAdmin && authMode !== 'reset') {
      navigate('/admin/dashboard');
    }
  }, [user, isAdmin, authLoading, navigate, authMode]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin`,
      });
      
      if (error) throw error;
      
      toast.success('Password reset email sent!', {
        description: 'Check your inbox for a link to reset your password.',
      });
      setAuthMode('login');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error('Failed to send reset email', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      toast.success('Password updated successfully!', {
        description: 'You can now sign in with your new password.',
      });
      setPassword('');
      setConfirmPassword('');
      setAuthMode('login');
      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname);
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error('Failed to update password', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        await signUp(email, password);
        toast.success('Account created!', {
          description: 'Please check your email to confirm your account, then contact an admin to grant you access.',
        });
        setAuthMode('login');
      } else {
        await signIn(email, password);
        toast.success('Login successful', {
          description: 'Checking admin permissions...',
        });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(authMode === 'signup' ? 'Sign up failed' : 'Login failed', {
        description: error.message || 'An error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getTitle = () => {
    switch (authMode) {
      case 'signup': return 'Admin Sign Up';
      case 'forgot': return 'Reset Password';
      case 'reset': return 'Set New Password';
      default: return 'Admin Login';
    }
  };

  const getSubtitle = () => {
    switch (authMode) {
      case 'signup': return 'Create a new admin account';
      case 'forgot': return 'Enter your email to receive a reset link';
      case 'reset': return 'Enter your new password';
      default: return 'Sign in with your admin account';
    }
  };

  return (
    <>
      <Helmet>
        <title>{getTitle()} | Safal Online Academy</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl hero-gradient mb-4">
                <BookOpen className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {getTitle()}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {getSubtitle()}
              </p>
            </div>

            {/* Forgot Password Form */}
            {authMode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="flex items-center justify-center gap-2 w-full text-sm text-primary hover:underline mt-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </button>
              </form>
            )}

            {/* Reset Password Form */}
            {authMode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-12 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-12 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            )}

            {/* Login / Signup Form */}
            {(authMode === 'login' || authMode === 'signup') && (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@example.com"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-12 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {authMode === 'signup' ? 'Creating account...' : 'Signing in...'}
                      </>
                    ) : (
                      authMode === 'signup' ? 'Create Account' : 'Sign In'
                    )}
                  </Button>
                </form>

                {/* Toggle Sign In / Sign Up - Only show if signup is enabled */}
                {signupEnabled && (
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
                      className="text-sm text-primary hover:underline"
                    >
                      {authMode === 'signup' 
                        ? 'Already have an account? Sign In' 
                        : "Don't have an account? Sign Up"}
                    </button>
                  </div>
                )}

                {/* Info */}
                <div className="mt-4 p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground text-center">
                    {authMode === 'signup' ? (
                      <>
                        <strong>Note:</strong> After signing up, an admin must add your account to the admin role before you can access the dashboard.
                      </>
                    ) : signupEnabled ? (
                      <>
                        <strong>Note:</strong> You must have admin role in the user_roles table to access the dashboard.
                      </>
                    ) : (
                      <>
                        <strong>Note:</strong> Sign up is currently disabled. Contact an administrator for access.
                      </>
                    )}
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default AdminLogin;
