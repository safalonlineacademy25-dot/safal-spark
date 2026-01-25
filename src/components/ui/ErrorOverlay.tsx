import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Clipboard, RefreshCw } from 'lucide-react';

type ErrorOverlayProps = {
  title?: string;
  message?: string;
  stack?: string | null;
  onClose?: () => void;
  onRetry?: () => void;
};

export default function ErrorOverlay({
  title = 'Error',
  message,
  stack,
  onClose,
  onRetry,
}: ErrorOverlayProps) {
  const copyStack = async () => {
    try {
      await navigator.clipboard.writeText(`${message || ''}\n\n${stack || ''}`);
      // no toast infra here - keep lightweight
      console.debug('[ErrorOverlay] copied stack to clipboard');
    } catch (err) {
      console.warn('[ErrorOverlay] failed to copy', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl bg-card rounded-lg border border-border shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{title}</h3>
            {message && <span className="text-sm text-muted-foreground">{message}</span>}
          </div>
          <div className="flex items-center gap-2">
            {onRetry && (
              <Button size="sm" variant="ghost" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={copyStack}>
              <Clipboard className="h-4 w-4 mr-2" /> Copy
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="p-4 max-h-[60vh] overflow-auto bg-muted/5">
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{stack || 'No stack available'}</pre>
        </div>
      </div>
    </div>
  );
}
