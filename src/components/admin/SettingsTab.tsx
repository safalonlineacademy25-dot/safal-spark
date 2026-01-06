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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
}

interface DeliverySettings {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
}

interface PaymentSettings {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  testMode: boolean;
}

const SettingsTab = () => {
  // Admin Users State
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);
  const [adminToRemove, setAdminToRemove] = useState<AdminUser | null>(null);

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
  });
  const [savingDelivery, setSavingDelivery] = useState(false);

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
      toast.error('Failed to load admin users');
    } finally {
      setLoadingAdmins(false);
    }
  };

  const loadSettings = () => {
    // Load from localStorage (in production, you'd load from database)
    const savedPayment = localStorage.getItem('admin_payment_settings');
    const savedDelivery = localStorage.getItem('admin_delivery_settings');

    if (savedPayment) {
      try {
        setPaymentSettings(JSON.parse(savedPayment));
      } catch (e) {
        console.error('Failed to parse payment settings');
      }
    }

    if (savedDelivery) {
      try {
        setDeliverySettings(JSON.parse(savedDelivery));
      } catch (e) {
        console.error('Failed to parse delivery settings');
      }
    }
  };

  const handleAddAdmin = async () => {
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
      // First, check if user exists by trying to find them
      // Note: In production, you'd need an edge function for this
      // For now, we'll create an invite flow

      // Create an invite or show instructions
      toast.info(
        'Admin Invite Process',
        {
          description: `To add ${newAdminEmail} as admin: 1) Have them sign up first, 2) Get their user ID from auth.users, 3) Add role manually in user_roles table`,
          duration: 10000,
        }
      );

      // For demonstration, we'll show a simulated success
      // In production, you'd use an edge function with service role key
      toast.success(
        'Admin invite noted',
        {
          description: 'The user must sign up first, then you can assign admin role via database.',
        }
      );

      setNewAdminEmail('');
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

  const handleSavePaymentSettings = async () => {
    setSavingPayment(true);
    try {
      // In production, you'd save these as Supabase secrets via edge function
      // For now, save to localStorage (NOT RECOMMENDED for production)
      localStorage.setItem('admin_payment_settings', JSON.stringify(paymentSettings));
      
      toast.success('Payment settings saved', {
        description: 'Note: For production, configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET as Supabase secrets.',
      });
    } catch (error: any) {
      toast.error('Failed to save payment settings');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSaveDeliverySettings = async () => {
    setSavingDelivery(true);
    try {
      localStorage.setItem('admin_delivery_settings', JSON.stringify(deliverySettings));
      toast.success('Delivery preferences saved');
    } catch (error: any) {
      toast.error('Failed to save delivery settings');
    } finally {
      setSavingDelivery(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
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
          {/* Add new admin */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter email address to add as admin"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
              />
            </div>
            <Button onClick={handleAddAdmin} disabled={addingAdmin}>
              {addingAdmin ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-2">Add Admin</span>
            </Button>
          </div>

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
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {admin.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAdminToRemove(admin)}
                    disabled={removingAdminId === admin.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {removingAdminId === admin.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              To add a new admin: The user must first sign up, then their role can be assigned.
              Currently showing user IDs. In production, use an edge function to fetch user emails.
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
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 text-sm">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-yellow-700 dark:text-yellow-500">
              <strong>Important:</strong> For production, configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET as Supabase Edge Function secrets instead of saving here.
            </p>
          </div>

          <Button onClick={handleSavePaymentSettings} disabled={savingPayment}>
            {savingPayment ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Payment Settings
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
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <MessageCircle className="h-5 w-5 text-green-600" />
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
              />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              When both are enabled, customers who opt-in to WhatsApp will receive links on both channels. Others will receive email only.
            </p>
          </div>

          <Button onClick={handleSaveDeliverySettings} disabled={savingDelivery}>
            {savingDelivery ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Delivery Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Confirm Remove Admin Dialog */}
      <AlertDialog open={!!adminToRemove} onOpenChange={() => setAdminToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove admin access for this user? They will no longer be able to access the admin dashboard.
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
    </motion.div>
  );
};

export default SettingsTab;
