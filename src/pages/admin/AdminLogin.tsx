import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { BookOpen, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, signIn, signUp } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();

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
    if (!authLoading && user && isAdmin) {
      navigate('/admin/dashboard');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.success('Account created!', {
          description: 'Please check your email to confirm your account, then contact an admin to grant you access.',
        });
        setIsSignUp(false);
      } else {
        await signIn(email, password);
        toast.success('Login successful', {
          description: 'Checking admin permissions...',
        });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(isSignUp ? 'Sign up failed' : 'Login failed', {
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

  return (
    <>
      <Helmet>
        <title>Admin {isSignUp ? 'Sign Up' : 'Login'} | Safal Online Academy</title>
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
                Admin {isSignUp ? 'Sign Up' : 'Login'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isSignUp 
                  ? 'Create a new admin account' 
                  : 'Sign in with your admin account'}
              </p>
            </div>

            {/* Form */}
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
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </Button>
            </form>

            {/* Toggle Sign In / Sign Up - Only show if signup is enabled */}
            {signupEnabled && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-primary hover:underline"
                >
                  {isSignUp 
                    ? 'Already have an account? Sign In' 
                    : "Don't have an account? Sign Up"}
                </button>
              </div>
            )}

            {/* Info */}
            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground text-center">
                {isSignUp ? (
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
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default AdminLogin;
