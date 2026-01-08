import { useState } from 'react';
import { Send, Loader2, Users, Megaphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PRODUCT_CATEGORIES = [
  'Pune University Notes',
  'Engineering Notes',
  'IIT Notes',
  'Competitive Exam Notes',
  'Others',
];

interface WhatsAppBroadcastDialogProps {
  trigger?: React.ReactNode;
}

export default function WhatsAppBroadcastDialog({ trigger }: WhatsAppBroadcastDialogProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [category, setCategory] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [templateName, setTemplateName] = useState('new_product_alert');

  const handleBroadcast = async () => {
    if (!category) {
      toast.error('Please select a category');
      return;
    }
    if (!productName.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    if (!templateName.trim()) {
      toast.error('Please enter the template name');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('broadcast-whatsapp', {
        body: {
          category,
          productName: productName.trim(),
          productDescription: productDescription.trim() || undefined,
          templateName: templateName.trim(),
        },
      });

      if (error) throw error;

      if (data.sent === 0 && data.failed === 0) {
        toast.info('No eligible customers found', {
          description: `No customers have purchased from "${category}" with WhatsApp opt-in.`,
        });
      } else {
        toast.success('Broadcast complete!', {
          description: `Sent: ${data.sent}, Failed: ${data.failed}`,
        });
      }

      if (data.errors && data.errors.length > 0) {
        console.error('Broadcast errors:', data.errors);
      }

      setOpen(false);
      setCategory('');
      setProductName('');
      setProductDescription('');
    } catch (error: any) {
      console.error('Broadcast error:', error);
      toast.error('Broadcast failed', {
        description: error.message || 'Please try again',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Broadcast
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            WhatsApp Broadcast
          </DialogTitle>
          <DialogDescription>
            Send a new product announcement to customers who purchased from a specific category.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Target Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Customers who purchased from this category will receive the message.
            </p>
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="product-name">New Product Name</Label>
            <Input
              id="product-name"
              placeholder="e.g., Advanced Physics Notes 2025"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>

          {/* Product Description */}
          <div className="space-y-2">
            <Label htmlFor="product-description">Short Description (Optional)</Label>
            <Textarea
              id="product-description"
              placeholder="e.g., Complete syllabus coverage with solved examples"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">WhatsApp Template Name</Label>
            <Input
              id="template-name"
              placeholder="new_product_alert"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Must be approved in Meta Business Manager. Template should have 4 body parameters:
              {' '}customer_name, product_name, category, description.
            </p>
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <p className="font-medium">Who will receive this?</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Only customers who have purchased products from the selected category 
                  AND opted in for WhatsApp notifications will receive this message.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleBroadcast} disabled={sending} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Broadcast
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
