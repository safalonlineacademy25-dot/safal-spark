import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Mail,
  Loader2,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface WhatsAppSettings {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  resendApiKey: string;
  resendWebhookSecret: string;
  wasimpleApiKey: string;
  wasimplePhoneId: string;
  downloadTemplateName: string;
  orderTemplateName: string;
  failureTemplateName: string;
  broadcastTemplateName: string;
  promotionTemplateName: string;
  downloadMediaUrl: string;
}

const WhatsAppSettingsTab = () => {
  const { isSuperAdmin } = useAuth();
  const [settings, setSettings] = useState<WhatsAppSettings>({
    emailEnabled: true,
    whatsappEnabled: true,
    resendApiKey: '',
    resendWebhookSecret: '',
    wasimpleApiKey: '',
    wasimplePhoneId: '',
    downloadTemplateName: '',
    orderTemplateName: '',
    failureTemplateName: '',
    broadcastTemplateName: '',
    promotionTemplateName: '',
    downloadMediaUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);
  const [showResendWebhookSecret, setShowResendWebhookSecret] = useState(false);
  const [showWasimpleApiKey, setShowWasimpleApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('key, value');
      if (error) return;
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s: { key: string; value: string | null }) => {
          if (s.value) map[s.key] = s.value;
        });
        setSettings({
          emailEnabled: map['email_enabled'] !== 'false',
          whatsappEnabled: map['whatsapp_enabled'] !== 'false',
          resendApiKey: map['resend_api_key'] || '',
          resendWebhookSecret: map['resend_webhook_secret'] || '',
          wasimpleApiKey: map['wasimple_api_key'] || '',
          wasimplePhoneId: map['wasimple_phone_id'] || '',
          downloadTemplateName: map['whatsapp_download_template_name'] || '',
          orderTemplateName: map['whatsapp_order_template_name'] || '',
          failureTemplateName: map['whatsapp_failure_template_name'] || '',
          broadcastTemplateName: map['whatsapp_broadcast_template_name'] || '',
          promotionTemplateName: map['whatsapp_promotion_template_name'] || '',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const upsertSetting = async (key: string, value: string) => {
    const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
    if (error) throw error;
  };

  const handleSave = async () => {
    if (!isSuperAdmin) {
      toast.error('Permission denied', { description: 'Only Super Admins can modify settings.' });
      return;
    }
    setSaving(true);
    try {
      const settingsToSave = [
        { key: 'email_enabled', value: settings.emailEnabled.toString() },
        { key: 'whatsapp_enabled', value: settings.whatsappEnabled.toString() },
        { key: 'resend_api_key', value: settings.resendApiKey },
        { key: 'resend_webhook_secret', value: settings.resendWebhookSecret },
        { key: 'wasimple_api_key', value: settings.wasimpleApiKey },
        { key: 'wasimple_phone_id', value: settings.wasimplePhoneId },
        { key: 'whatsapp_download_template_name', value: settings.downloadTemplateName },
        { key: 'whatsapp_order_template_name', value: settings.orderTemplateName },
        { key: 'whatsapp_failure_template_name', value: settings.failureTemplateName },
        { key: 'whatsapp_broadcast_template_name', value: settings.broadcastTemplateName },
        { key: 'whatsapp_promotion_template_name', value: settings.promotionTemplateName },
      ];
      for (const s of settingsToSave) {
        await upsertSetting(s.key, s.value);
      }
      toast.success('WhatsApp & Email delivery settings saved');
    } catch (error: any) {
      toast.error('Failed to save settings', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
                  <p className="text-xs text-muted-foreground">Send download links via email (using Resend)</p>
                </div>
              </div>
              <Switch checked={settings.emailEnabled} onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailEnabled: checked }))} disabled={!isSuperAdmin} />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <MessageCircle className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">WhatsApp Delivery</p>
                  <p className="text-xs text-muted-foreground">Send template messages via WaSimple API (for opted-in customers)</p>
                </div>
              </div>
              <Switch checked={settings.whatsappEnabled} onCheckedChange={(checked) => setSettings(prev => ({ ...prev, whatsappEnabled: checked }))} disabled={!isSuperAdmin} />
            </div>
          </div>

          {/* Email Settings */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="resend-api-key">Resend API Key</Label>
            <div className="relative">
              <Input id="resend-api-key" type={showResendKey ? 'text' : 'password'} placeholder="re_xxxxxxxxxxxx" value={settings.resendApiKey} onChange={(e) => setSettings(prev => ({ ...prev, resendApiKey: e.target.value }))} disabled={!isSuperAdmin} />
              <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowResendKey(!showResendKey)}>
                {showResendKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Resend Dashboard</a></p>
          </div>

          {/* Resend Webhook Secret */}
          <div className="space-y-2">
            <Label htmlFor="resend-webhook-secret">Resend Webhook Secret</Label>
            <div className="relative">
              <Input id="resend-webhook-secret" type={showResendWebhookSecret ? 'text' : 'password'} placeholder="whsec_xxxxxxxxxxxx" value={settings.resendWebhookSecret} onChange={(e) => setSettings(prev => ({ ...prev, resendWebhookSecret: e.target.value }))} disabled={!isSuperAdmin} />
              <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowResendWebhookSecret(!showResendWebhookSecret)}>
                {showResendWebhookSecret ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Get your webhook signing secret from <a href="https://resend.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Resend Webhooks</a></p>
          </div>

          {/* WaSimple API Settings */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="wasimple-api-key">WaSimple API Key</Label>
            <div className="relative">
              <Input id="wasimple-api-key" type={showWasimpleApiKey ? 'text' : 'password'} placeholder="Your WaSimple API Key" value={settings.wasimpleApiKey} onChange={(e) => setSettings(prev => ({ ...prev, wasimpleApiKey: e.target.value }))} disabled={!isSuperAdmin} />
              <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowWasimpleApiKey(!showWasimpleApiKey)}>
                {showWasimpleApiKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Get your API key from <a href="https://app.wasimple.in" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WaSimple Dashboard</a></p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wasimple-phone-id">WaSimple Phone ID</Label>
            <Input id="wasimple-phone-id" placeholder="Your WaSimple Phone ID" value={settings.wasimplePhoneId} onChange={(e) => setSettings(prev => ({ ...prev, wasimplePhoneId: e.target.value }))} disabled={!isSuperAdmin} />
            <p className="text-xs text-muted-foreground">Phone ID from your WaSimple account for accounts with multiple numbers.</p>
          </div>

          {/* WhatsApp Template Names */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">WhatsApp Message Templates</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Enter the approved template names from your WaSimple/Meta Business account. Each template receives two parameters: <strong>{"{{1}}"} = Customer Name</strong> and <strong>{"{{2}}"} = Email</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="download-template">Download Confirmation Template</Label>
                <Input id="download-template" placeholder="e.g. download_confirmation" value={settings.downloadTemplateName} onChange={(e) => setSettings(prev => ({ ...prev, downloadTemplateName: e.target.value }))} disabled={!isSuperAdmin} />
                <p className="text-xs text-muted-foreground">Sent after successful purchase & email delivery</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order-template">Order/Payment Template</Label>
                <Input id="order-template" placeholder="e.g. order_payment_link" value={settings.orderTemplateName} onChange={(e) => setSettings(prev => ({ ...prev, orderTemplateName: e.target.value }))} disabled={!isSuperAdmin} />
                <p className="text-xs text-muted-foreground">Sent with payment link for WhatsApp orders</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="failure-template">Delivery Failure Template</Label>
                <Input id="failure-template" placeholder="e.g. delivery_failure_notice" value={settings.failureTemplateName} onChange={(e) => setSettings(prev => ({ ...prev, failureTemplateName: e.target.value }))} disabled={!isSuperAdmin} />
                <p className="text-xs text-muted-foreground">Sent when email delivery fails</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="broadcast-template">Broadcast Template</Label>
                <Input id="broadcast-template" placeholder="e.g. product_broadcast" value={settings.broadcastTemplateName} onChange={(e) => setSettings(prev => ({ ...prev, broadcastTemplateName: e.target.value }))} disabled={!isSuperAdmin} />
                <p className="text-xs text-muted-foreground">Used for product broadcast messages</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promotion-template">Promotion Template</Label>
                <Input id="promotion-template" placeholder="e.g. promotional_offer" value={settings.promotionTemplateName} onChange={(e) => setSettings(prev => ({ ...prev, promotionTemplateName: e.target.value }))} disabled={!isSuperAdmin} />
                <p className="text-xs text-muted-foreground">Used for promotional broadcasts</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">All WhatsApp messages are sent as approved templates via the WhatsApp Business API. Each template receives two parameters: customer name and email address.</p>
          </div>

          <Button onClick={handleSave} disabled={saving || !isSuperAdmin}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isSuperAdmin ? 'Save Delivery Settings' : 'View Only'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default WhatsAppSettingsTab;
