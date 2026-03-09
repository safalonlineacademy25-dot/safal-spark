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
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappTemplateName: string;
  whatsappBroadcastTemplateName: string;
  whatsappPromotionTemplateName: string;
}

const WhatsAppSettingsTab = () => {
  const { isSuperAdmin } = useAuth();
  const [settings, setSettings] = useState<WhatsAppSettings>({
    emailEnabled: true,
    whatsappEnabled: true,
    resendApiKey: '',
    resendWebhookSecret: '',
    whatsappAccessToken: '',
    whatsappPhoneNumberId: '',
    whatsappTemplateName: '',
    whatsappBroadcastTemplateName: '',
    whatsappPromotionTemplateName: '',
  });
  const [saving, setSaving] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);
  const [showResendWebhookSecret, setShowResendWebhookSecret] = useState(false);
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);

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
          whatsappAccessToken: map['whatsapp_access_token'] || '',
          whatsappPhoneNumberId: map['whatsapp_phone_number_id'] || '',
          whatsappTemplateName: map['whatsapp_template_name'] || '',
          whatsappBroadcastTemplateName: map['whatsapp_broadcast_template_name'] || '',
          whatsappPromotionTemplateName: map['whatsapp_promotion_template_name'] || '',
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
        { key: 'whatsapp_access_token', value: settings.whatsappAccessToken },
        { key: 'whatsapp_phone_number_id', value: settings.whatsappPhoneNumberId },
        { key: 'whatsapp_template_name', value: settings.whatsappTemplateName },
        { key: 'whatsapp_broadcast_template_name', value: settings.whatsappBroadcastTemplateName },
        { key: 'whatsapp_promotion_template_name', value: settings.whatsappPromotionTemplateName },
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
                  <p className="text-xs text-muted-foreground">Send download links via WhatsApp Cloud API (for opted-in customers)</p>
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

          {/* WhatsApp Cloud API Settings */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="whatsapp-access-token">WhatsApp Access Token</Label>
            <div className="relative">
              <Input id="whatsapp-access-token" type={showWhatsappToken ? 'text' : 'password'} placeholder="EAAxxxxxxx..." value={settings.whatsappAccessToken} onChange={(e) => setSettings(prev => ({ ...prev, whatsappAccessToken: e.target.value }))} disabled={!isSuperAdmin} />
              <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowWhatsappToken(!showWhatsappToken)}>
                {showWhatsappToken ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Permanent access token from <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta for Developers</a></p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-phone-number-id">WhatsApp Phone Number ID</Label>
            <Input id="whatsapp-phone-number-id" placeholder="1234567890" value={settings.whatsappPhoneNumberId} onChange={(e) => setSettings(prev => ({ ...prev, whatsappPhoneNumberId: e.target.value }))} disabled={!isSuperAdmin} />
            <p className="text-xs text-muted-foreground">Phone Number ID from your WhatsApp Business API dashboard.</p>
          </div>

          {/* Template Names */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="whatsapp-template-name">WhatsApp Download Template Name</Label>
            <Input id="whatsapp-template-name" placeholder="soa_download_ready" value={settings.whatsappTemplateName} onChange={(e) => setSettings(prev => ({ ...prev, whatsappTemplateName: e.target.value }))} disabled={!isSuperAdmin} />
            <p className="text-xs text-muted-foreground">Template for delivery notifications (parameters: customer_name, order_number, email).</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-broadcast-template-name">WhatsApp Broadcast Template Name</Label>
            <Input id="whatsapp-broadcast-template-name" placeholder="soa_broadcast_template" value={settings.whatsappBroadcastTemplateName} onChange={(e) => setSettings(prev => ({ ...prev, whatsappBroadcastTemplateName: e.target.value }))} disabled={!isSuperAdmin} />
            <p className="text-xs text-muted-foreground">Template used for product broadcast messages.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-promotion-template-name">WhatsApp Promotion Template Name</Label>
            <Input id="whatsapp-promotion-template-name" placeholder="soa_promotion_template" value={settings.whatsappPromotionTemplateName} onChange={(e) => setSettings(prev => ({ ...prev, whatsappPromotionTemplateName: e.target.value }))} disabled={!isSuperAdmin} />
            <p className="text-xs text-muted-foreground">Template used for promotional campaign messages.</p>
          </div>

          <p className="text-xs text-muted-foreground">All WhatsApp templates must be pre-approved in your <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta Business Manager</a>.</p>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">When both are enabled, customers who opt-in to WhatsApp will receive links on both channels. Others will receive email only.</p>
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
