import { useState, useEffect } from 'react';
import { Loader2, Send, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PromotionBroadcastDialogProps {
  onBroadcastSent?: () => void;
}

export default function PromotionBroadcastDialog({ onBroadcastSent }: PromotionBroadcastDialogProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Form state
  const [promotionTitle, setPromotionTitle] = useState('');
  const [promotionMessage, setPromotionMessage] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [templateName, setTemplateName] = useState('promotional_message');

  // Fetch recipient count when dialog opens
  useEffect(() => {
    if (open) {
      fetchRecipientCount();
    }
  }, [open]);

  const fetchRecipientCount = async () => {
    setLoadingCount(true);
    try {
      // Get unique customers who opted in for WhatsApp from customers table
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('whatsapp_optin', true);

      if (error) throw error;
      setRecipientCount(count || 0);
    } catch (err) {
      console.error('Error fetching recipient count:', err);
      setRecipientCount(0);
    } finally {
      setLoadingCount(false);
    }
  };

  const resetForm = () => {
    setPromotionTitle('');
    setPromotionMessage('');
    setCtaLink('');
    setTemplateName('promotional_message');
  };

  const handleSend = async () => {
    if (!promotionTitle.trim()) {
      toast.error('Please enter a promotion title');
      return;
    }

    if (!promotionMessage.trim()) {
      toast.error('Please enter a promotion message');
      return;
    }

    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (recipientCount === 0) {
      toast.error('No customers available to receive this promotion');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-promotion', {
        body: {
          promotionTitle: promotionTitle.trim(),
          promotionMessage: promotionMessage.trim(),
          ctaLink: ctaLink.trim() || null,
          templateName: templateName.trim(),
        },
      });

      if (error) throw error;

      const res = data as { success: boolean; error?: string; sent?: number; failed?: number };

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Promotion sent! ${res.sent} delivered, ${res.failed} failed`);
        setOpen(false);
        resetForm();
        onBroadcastSent?.();
      }
    } catch (err: any) {
      console.error('Error sending promotion:', err);
      toast.error(err.message || 'Failed to send promotion');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          Send Promotion
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Send Promotional Message
          </DialogTitle>
          <DialogDescription>
            Send promotional updates about new products or features to all opted-in customers.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Promotion Title */}
            <div className="space-y-2">
              <Label htmlFor="promotionTitle">Promotion Title *</Label>
              <Input
                id="promotionTitle"
                placeholder="e.g., New Excel Templates Available!"
                value={promotionTitle}
                onChange={(e) => setPromotionTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A catchy headline for your promotion
              </p>
            </div>

            {/* Promotion Message */}
            <div className="space-y-2">
              <Label htmlFor="promotionMessage">Message *</Label>
              <Textarea
                id="promotionMessage"
                placeholder="Describe the new products, features, or special offers..."
                value={promotionMessage}
                onChange={(e) => setPromotionMessage(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Details about new products, features, or special offers
              </p>
            </div>

            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                placeholder="e.g., promotional_message"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The exact name of your approved Meta WhatsApp template
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* CTA Link */}
            <div className="space-y-2">
              <Label htmlFor="ctaLink">Call-to-Action Link (optional)</Label>
              <Input
                id="ctaLink"
                placeholder="https://example.com/products"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Link to your products page or specific offer
              </p>
            </div>

            {/* Recipient Count */}
            <div className={`rounded-lg p-3 text-sm ${recipientCount !== null && recipientCount > 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted'}`}>
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Recipients</p>
                  {loadingCount ? (
                    <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Counting recipients...
                    </p>
                  ) : recipientCount !== null ? (
                    <p className={`text-xs mt-1 ${recipientCount > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-amber-600 dark:text-amber-400'}`}>
                      {recipientCount > 0 
                        ? `${recipientCount} customer${recipientCount !== 1 ? 's' : ''} will receive this promotion`
                        : 'No eligible customers found'}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs mt-1">
                      All customers who opted in for WhatsApp updates
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Template Info */}
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Template Requirements:</p>
              <p>Make sure the template <strong>{templateName || 'your template'}</strong> is approved in your Meta Business account before sending.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sending || recipientCount === 0 || loadingCount}
            className="gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Promotion
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
