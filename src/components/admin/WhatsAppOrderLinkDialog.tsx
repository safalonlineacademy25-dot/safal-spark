import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MessageCircle, Download, Copy, Check, QrCode, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface WhatsAppOrderLinkDialogProps {
  productId: string;
  productName: string;
  productPrice: number;
}

const WhatsAppOrderLinkDialog = ({ productId, productName, productPrice }: WhatsAppOrderLinkDialogProps) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const baseUrl = window.location.origin;
  const orderUrl = `${baseUrl}/order-whatsapp?product=${productId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopied(true);
      toast.success('WhatsApp order link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${productName.replace(/\s+/g, '-').toLowerCase()}-whatsapp-order-qr.png`;
      link.href = pngUrl;
      link.click();
      toast.success('QR code downloaded');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleShareWhatsApp = () => {
    const message = `🛒 *${productName}*\n💰 Price: ₹${productPrice}\n\nOrder now using this link:\n${orderUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="WhatsApp Order Link">
          <MessageCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            WhatsApp Order Link
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-4">
          {/* Product info */}
          <div className="w-full p-3 bg-muted rounded-lg text-center">
            <p className="font-semibold text-foreground">{productName}</p>
            <p className="text-sm text-muted-foreground">₹{productPrice}</p>
          </div>

          {/* QR Code */}
          <div ref={qrRef} className="p-4 bg-white rounded-xl shadow-sm border">
            <QRCodeSVG
              value={orderUrl}
              size={200}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Share this link or QR code with students. They'll see the product pre-selected and just need to fill their details.
          </p>

          {/* URL preview */}
          <div className="w-full p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground font-mono break-all">{orderUrl}</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button variant="outline" onClick={handleCopyLink}>
              {copied ? (
                <><Check className="mr-2 h-4 w-4" /> Copied!</>
              ) : (
                <><Copy className="mr-2 h-4 w-4" /> Copy Link</>
              )}
            </Button>
            <Button variant="outline" onClick={handleDownloadQR}>
              <Download className="mr-2 h-4 w-4" /> Download QR
            </Button>
          </div>

          <Button onClick={handleShareWhatsApp} className="w-full bg-green-600 hover:bg-green-700 text-white">
            <ExternalLink className="mr-2 h-4 w-4" />
            Share via WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppOrderLinkDialog;
