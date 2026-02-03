import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CreditCard,
  MessageCircle,
  Mail,
  Loader2,
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  ShieldCheck,
  Crown,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, UserRole } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}

interface DeliverySettings {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  resendApiKey: string;
  resendWebhookSecret: string;
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappTemplateName: string;
}

interface PaymentSettings {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  testMode: boolean;
}

const SettingsTab = () => {
  const { isSuperAdmin, user } = useAuth();
  
  // Admin Users State
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);
  const [adminToRemove, setAdminToRemove] = useState<AdminUser | null>(null);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [savingSignup, setSavingSignup] = useState(false);
  
  // Password Reset State
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [adminToReset, setAdminToReset] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    razorpayKeyId: '',
    razorpayKeySecret: '',
    testMode: true,
  });
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Delivery Settings State
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    emailEnabled: true,
    whatsappEnabled: true,
    resendApiKey: '',
    resendWebhookSecret: '',
    whatsappAccessToken: '',
    whatsappPhoneNumberId: '',
    whatsappTemplateName: '',
  });
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);
  const [showResendWebhookSecret, setShowResendWebhookSecret] = useState(false);
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);

  // Load admin users
  useEffect(() => {
    fetchAdminUsers();
    loadSettings();
  }, []);

  const fetchAdminUsers = async () => {
    setLoadingAdmins(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('get-admin-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setAdminUsers(data.adminUsers || []);
    } catch (error: any) {
      console.error('Error fetching admin users:', error);

      // Show a more specific message for permission errors
      if (error?.message?.includes('Admin access') || error?.status === 403) {
        toast.error('You do not have permission to view admin users');
      } else if (error?.message === 'Not authenticated') {
        toast.error('Session expired. Please sign in again.');
      } else {
        toast.error('Failed to load admin users');
      }
    } finally {
      setLoadingAdmins(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error) {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        const settingsMap: Record<string, string> = {};
        data.forEach((s: { key: string; value: string | null }) => {
          if (s.value) settingsMap[s.key] = s.value;
        });

        // Load payment settings
        setPaymentSettings({
          razorpayKeyId: settingsMap['razorpay_key_id'] || '',
          razorpayKeySecret: settingsMap['razorpay_key_secret'] || '',
          testMode: settingsMap['razorpay_test_mode'] === 'true',
        });

        // Load delivery settings
        setDeliverySettings({
          emailEnabled: settingsMap['email_enabled'] !== 'false',
          whatsappEnabled: settingsMap['whatsapp_enabled'] !== 'false',
          resendApiKey: settingsMap['resend_api_key'] || '',
          resendWebhookSecret: settingsMap['resend_webhook_secret'] || '',
          whatsappAccessToken: settingsMap['whatsapp_access_token'] || '',
          whatsappPhoneNumberId: settingsMap['whatsapp_phone_number_id'] || '',
          whatsappTemplateName: settingsMap['whatsapp_template_name'] || '',
        });

        // Load signup setting
        setSignupEnabled(settingsMap['admin_signup_enabled'] !== 'false');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleAddAdmin = async () => {
    if (!isSuperAdmin) {
      toast.error('Permission denied', {
        description: 'Only Super Admins can add new admin users.',
      });
      return;
    }

    if (!newAdminEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAdminEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setAddingAdmin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('add-admin-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          email: newAdminEmail,
          password: newAdminPassword || undefined,
          role: newAdminRole,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(data.message || 'Admin user added successfully');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminRole('admin');
      fetchAdminUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error adding admin:', error);
      toast.error('Failed to add admin', {
        description: error.message,
      });
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!adminToRemove) return;

    if (!isSuperAdmin) {
      toast.error('Permission denied', {
        description: 'Only Super Admins can remove admin users.',
      });
      setAdminToRemove(null);
      return;
    }

    // Prevent removing yourself
    if (adminToRemove.user_id === user?.id) {
      toast.error('Cannot remove yourself', {
        description: 'You cannot remove your own admin access.',
      });
      setAdminToRemove(null);
      return;
    }

    setRemovingAdminId(adminToRemove.id);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', adminToRemove.id);

      if (error) throw error;

      setAdminUsers((prev) => prev.filter((a) => a.id !== adminToRemove.id));
      toast.success('Admin removed successfully');
    } catch (error: any) {
      console.error('Error removing admin:', error);
      toast.error('Failed to remove admin', {
        description: error.message,
      });
    } finally {
      setRemovingAdminId(null);
      setAdminToRemove(null);
    }
  };

  const handleResetPassword = async () => {
    if (!adminToReset) return;

    if (!isSuperAdmin) {
      toast.error('Permission denied', {
        description: 'Only Super Admins can reset passwords.',
      });
      setResetPasswordDialog(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('reset-admin-password', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          userId: adminToReset.user_id,
          newPassword,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success('Password reset successfully', {
        description: `Password for ${adminToReset.email} has been updated.`,
      });
      setResetPasswordDialog(false);
      setAdminToReset(null);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password', {
        description: error.message,
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const upsertSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });
    
    if (error) throw error;
  };

  const handleSavePaymentSettings = async () => {
    if (!isSuperAdmin) {
      toast.error('Permission denied', {
        description: 'Only Super Admins can modify settings.',
      });
      return;
    }

    setSavingPayment(true);
    try {
      await Promise.all([
        upsertSetting('razorpay_key_id', paymentSettings.razorpayKeyId),
        upsertSetting('razorpay_key_secret', paymentSettings.razorpayKeySecret),
        upsertSetting('razorpay_test_mode', paymentSettings.testMode.toString()),
      ]);
      
      toast.success('Payment settings saved to database');
    } catch (error: any) {
      console.error('Error saving payment settings:', error);
      toast.error('Failed to save payment settings', {
        description: error.message,
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSaveDeliverySettings = async () => {
    if (!isSuperAdmin) {
      toast.error('Permission denied', {
        description: 'Only Super Admins can modify settings.',
      });
      return;
    }

    setSavingDelivery(true);
    try {
      await Promise.all([
        upsertSetting('email_enabled', deliverySettings.emailEnabled.toString()),
        upsertSetting('whatsapp_enabled', deliverySettings.whatsappEnabled.toString()),
        upsertSetting('resend_api_key', deliverySettings.resendApiKey),
        upsertSetting('resend_webhook_secret', deliverySettings.resendWebhookSecret),
        upsertSetting('whatsapp_access_token', deliverySettings.whatsappAccessToken),
        upsertSetting('whatsapp_phone_number_id', deliverySettings.whatsappPhoneNumberId),
        upsertSetting('whatsapp_template_name', deliverySettings.whatsappTemplateName),
      ]);
      
      toast.success('Delivery settings saved to database');
    } catch (error: any) {
      console.error('Error saving delivery settings:', error);
      toast.error('Failed to save delivery settings', {
        description: error.message,
      });
    } finally {
      setSavingDelivery(false);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'super_admin') {
      return (
        <Badge variant="default" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
          <Crown className="h-3 w-3 mr-1" />
          Super Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Role Info Banner */}
      <Card className={isSuperAdmin ? 'border-amber-500/30 bg-amber-500/5' : 'border-primary/30 bg-primary/5'}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            {isSuperAdmin ? (
              <Crown className="h-5 w-5 text-amber-500" />
            ) : (
              <Shield className="h-5 w-5 text-primary" />
            )}
            <div>
              <p className="font-medium text-foreground">
                You are logged in as {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSuperAdmin 
                  ? 'You have full access to add/modify/delete products and manage users.'
                  : 'You can view all admin tabs but cannot delete items or modify settings.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage admin users who can access this dashboard</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new admin - Only for Super Admins */}
          {isSuperAdmin ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Email</Label>
                  <Input
                    placeholder="admin@example.com"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                  />
                </div>
                <div className="md:col-span-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Password</Label>
                  <Input
                    placeholder="Min 6 characters"
                    type="password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                  />
                </div>
                <div className="md:col-span-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Role</Label>
                  <Select value={newAdminRole} onValueChange={(value: 'admin' | 'super_admin') => setNewAdminRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="super_admin">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4" />
                          Super Admin
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1 flex items-end">
                  <Button onClick={handleAddAdmin} disabled={addingAdmin} className="w-full">
                    {addingAdmin ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span className="ml-2">Add User</span>
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Super Admin:</strong> Full access - add/modify/delete products, manage users, change settings.
                <br />
                <strong>Admin:</strong> View only - can view all tabs but cannot delete or modify anything.
                <br />
                <strong>Tip:</strong> Enter email + password to create a new user, or just email to assign role to existing user.
              </p>
              
              {/* Signup Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mt-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Allow Admin Sign Up</p>
                    <p className="text-xs text-muted-foreground">
                      When enabled, new users can create accounts at /admin
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {savingSignup && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Switch
                    checked={signupEnabled}
                    onCheckedChange={async (checked) => {
                      setSavingSignup(true);
                      try {
                        await upsertSetting('admin_signup_enabled', checked.toString());
                        setSignupEnabled(checked);
                        toast.success(checked ? 'Sign up enabled' : 'Sign up disabled');
                      } catch (error: any) {
                        toast.error('Failed to update setting');
                      } finally {
                        setSavingSignup(false);
                      }
                    }}
                    disabled={savingSignup}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-muted-foreground">
                Only Super Admins can add or remove admin users.
              </p>
            </div>
          )}

          {/* Admin list */}
          <div className="border border-border rounded-lg divide-y divide-border">
            {loadingAdmins ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : adminUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No admin users found
              </div>
            ) : (
              adminUsers.map((admin) => (
                <div
                  key={admin.id}
                  className="p-4 flex items-center justify-between hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {admin.email}
                        </p>
                        {admin.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {getRoleBadge(admin.role)}
                        <span className="text-xs text-muted-foreground">
                          Added {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isSuperAdmin && admin.user_id !== user?.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAdminToReset(admin);
                          setResetPasswordDialog(true);
                        }}
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                        title="Reset Password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAdminToRemove(admin)}
                        disabled={removingAdminId === admin.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Remove Admin"
                      >
                        {removingAdminId === admin.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              Users must sign up first before they can be assigned an admin role.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10">
              <CreditCard className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Configure Razorpay payment gateway credentials</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="razorpay-key-id">Razorpay Key ID</Label>
              <Input
                id="razorpay-key-id"
                placeholder="rzp_test_xxxxxxxxxxxxx"
                value={paymentSettings.razorpayKeyId}
                onChange={(e) =>
                  setPaymentSettings((prev) => ({ ...prev, razorpayKeyId: e.target.value }))
                }
                disabled={!isSuperAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="razorpay-key-secret">Razorpay Key Secret</Label>
              <div className="relative">
                <Input
                  id="razorpay-key-secret"
                  type={showSecretKey ? 'text' : 'password'}
                  placeholder="••••••••••••••••••••"
                  value={paymentSettings.razorpayKeySecret}
                  onChange={(e) =>
                    setPaymentSettings((prev) => ({ ...prev, razorpayKeySecret: e.target.value }))
                  }
                  disabled={!isSuperAdmin}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                >
                  {showSecretKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Test Mode</p>
              <p className="text-xs text-muted-foreground">
                Enable test mode for development (use test API keys)
              </p>
            </div>
            <Switch
              checked={paymentSettings.testMode}
              onCheckedChange={(checked) =>
                setPaymentSettings((prev) => ({ ...prev, testMode: checked }))
              }
              disabled={!isSuperAdmin}
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-sm">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-foreground">
              <strong>Note:</strong> Settings are securely stored in the database and used by edge functions for payment processing.
            </p>
          </div>

          <Button onClick={handleSavePaymentSettings} disabled={savingPayment || !isSuperAdmin}>
            {savingPayment ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSuperAdmin ? 'Save Payment Settings' : 'View Only'}
          </Button>
        </CardContent>
      </Card>

      {/* Delivery Preferences Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Delivery Preferences</CardTitle>
              <CardDescription>Choose how customers receive their download links</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Email Delivery</p>
                  <p className="text-xs text-muted-foreground">
                    Send download links via email (using Resend)
                  </p>
                </div>
              </div>
              <Switch
                checked={deliverySettings.emailEnabled}
                onCheckedChange={(checked) =>
                  setDeliverySettings((prev) => ({ ...prev, emailEnabled: checked }))
                }
                disabled={!isSuperAdmin}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <MessageCircle className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">WhatsApp Delivery</p>
                  <p className="text-xs text-muted-foreground">
                    Send download links via WhatsApp (for opted-in customers)
                  </p>
                </div>
              </div>
              <Switch
                checked={deliverySettings.whatsappEnabled}
                onCheckedChange={(checked) =>
                  setDeliverySettings((prev) => ({ ...prev, whatsappEnabled: checked }))
                }
                disabled={!isSuperAdmin}
              />
            </div>
          </div>

          {/* Email Settings */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="resend-api-key">Resend API Key</Label>
            <div className="relative">
              <Input
                id="resend-api-key"
                type={showResendKey ? 'text' : 'password'}
                placeholder="re_xxxxxxxxxxxx"
                value={deliverySettings.resendApiKey}
                onChange={(e) =>
                  setDeliverySettings((prev) => ({ ...prev, resendApiKey: e.target.value }))
                }
                disabled={!isSuperAdmin}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowResendKey(!showResendKey)}
              >
                {showResendKey ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{' '}
              <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Resend Dashboard
              </a>
            </p>
          </div>

          {/* Resend Webhook Secret */}
          <div className="space-y-2">
            <Label htmlFor="resend-webhook-secret">Resend Webhook Secret</Label>
            <div className="relative">
              <Input
                id="resend-webhook-secret"
                type={showResendWebhookSecret ? 'text' : 'password'}
                placeholder="whsec_xxxxxxxxxxxx"
                value={deliverySettings.resendWebhookSecret}
                onChange={(e) =>
                  setDeliverySettings((prev) => ({ ...prev, resendWebhookSecret: e.target.value }))
                }
                disabled={!isSuperAdmin}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowResendWebhookSecret(!showResendWebhookSecret)}
              >
                {showResendWebhookSecret ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your webhook signing secret from{' '}
              <a href="https://resend.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Resend Webhooks
              </a>
              {' '}after setting up the webhook endpoint
            </p>
          </div>

          {/* WhatsApp Settings */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="whatsapp-access-token">WhatsApp Access Token</Label>
            <div className="relative">
              <Input
                id="whatsapp-access-token"
                type={showWhatsappToken ? 'text' : 'password'}
                placeholder="EAAxxxxxxx..."
                value={deliverySettings.whatsappAccessToken}
                onChange={(e) =>
                  setDeliverySettings((prev) => ({ ...prev, whatsappAccessToken: e.target.value }))
                }
                disabled={!isSuperAdmin}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowWhatsappToken(!showWhatsappToken)}
              >
                {showWhatsappToken ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-phone-number-id">WhatsApp Phone Number ID</Label>
            <Input
              id="whatsapp-phone-number-id"
              placeholder="1234567890"
              value={deliverySettings.whatsappPhoneNumberId}
              onChange={(e) =>
                setDeliverySettings((prev) => ({ ...prev, whatsappPhoneNumberId: e.target.value }))
              }
              disabled={!isSuperAdmin}
            />
          </div>

          {/* WhatsApp Template Name */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp-template-name">WhatsApp Template Name</Label>
            <Input
              id="whatsapp-template-name"
              placeholder="soa_download_ready"
              value={deliverySettings.whatsappTemplateName}
              onChange={(e) =>
                setDeliverySettings((prev) => ({ ...prev, whatsappTemplateName: e.target.value }))
              }
              disabled={!isSuperAdmin}
            />
            <p className="text-xs text-muted-foreground">
              The approved message template name from Meta Business Manager. Required for business-initiated messages.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Get these from your{' '}
            <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Meta for Developers
            </a>{' '}
            WhatsApp Business API settings.
          </p>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              When both are enabled, customers who opt-in to WhatsApp will receive links on both channels. Others will receive email only.
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-sm">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-foreground">
              <strong>Note:</strong> Settings are securely stored in the database and used by edge functions for email and WhatsApp delivery.
            </p>
          </div>

          <Button onClick={handleSaveDeliverySettings} disabled={savingDelivery || !isSuperAdmin}>
            {savingDelivery ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSuperAdmin ? 'Save Delivery Settings' : 'View Only'}
          </Button>
        </CardContent>
      </Card>

      {/* Confirm Remove Admin Dialog */}
      <AlertDialog open={!!adminToRemove} onOpenChange={() => setAdminToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove admin access for <strong>{adminToRemove?.email}</strong>? 
              They will no longer be able to access the admin dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Reset Dialog */}
      <Dialog open={resetPasswordDialog} onOpenChange={(open) => {
        setResetPasswordDialog(open);
        if (!open) {
          setAdminToReset(null);
          setNewPassword('');
          setConfirmNewPassword('');
          setShowNewPassword(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{adminToReset?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordDialog(false);
                setAdminToReset(null);
                setNewPassword('');
                setConfirmNewPassword('');
              }}
              disabled={resettingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resettingPassword || !newPassword || !confirmNewPassword}
            >
              {resettingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SettingsTab;