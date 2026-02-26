import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Save, AlertCircle } from 'lucide-react';
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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface TelegramSettings {
  telegramBotToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
}

const TelegramSettingsTab = () => {
  const { isSuperAdmin } = useAuth();
  const [settings, setSettings] = useState<TelegramSettings>({
    telegramBotToken: '',
    telegramChatId: '',
    telegramEnabled: false,
  });
  const [saving, setSaving] = useState(false);

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
          telegramBotToken: map['telegram_bot_token'] || '',
          telegramChatId: map['telegram_chat_id'] || '',
          telegramEnabled: map['telegram_enabled'] === 'true',
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
      await upsertSetting('telegram_enabled', settings.telegramEnabled.toString());
      await upsertSetting('telegram_bot_token', settings.telegramBotToken);
      await upsertSetting('telegram_chat_id', settings.telegramChatId);
      toast.success('Telegram settings saved');
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
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Telegram Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Telegram Notifications</Label>
              <p className="text-xs text-muted-foreground">Receive instant order alerts and daily visit summaries on Telegram.</p>
            </div>
            <Switch checked={settings.telegramEnabled} onCheckedChange={(checked) => setSettings(prev => ({ ...prev, telegramEnabled: checked }))} disabled={!isSuperAdmin} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram-bot-token">Bot Token</Label>
            <Input id="telegram-bot-token" type="password" placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" value={settings.telegramBotToken} onChange={(e) => setSettings(prev => ({ ...prev, telegramBotToken: e.target.value }))} disabled={!isSuperAdmin} />
            <p className="text-xs text-muted-foreground">Get this from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@BotFather</a> on Telegram.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram-chat-id">Chat ID</Label>
            <Input id="telegram-chat-id" placeholder="123456789" value={settings.telegramChatId} onChange={(e) => setSettings(prev => ({ ...prev, telegramChatId: e.target.value }))} disabled={!isSuperAdmin} />
            <p className="text-xs text-muted-foreground">
              Start a chat with your bot, then visit{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>{' '}
              to find your Chat ID.
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">You'll receive instant notifications for new orders and a daily summary of site visits at 9 PM IST.</p>
          </div>

          <Button onClick={handleSave} disabled={saving || !isSuperAdmin}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isSuperAdmin ? 'Save Telegram Settings' : 'View Only'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TelegramSettingsTab;
