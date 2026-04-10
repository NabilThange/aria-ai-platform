'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import CherryBlossomQRCode from './CherryBlossomQRCode';

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRCodeModal({ open, onOpenChange }: QRCodeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <DialogTitle className="sr-only">ARIA Dashboard QR Code</DialogTitle>
        <CherryBlossomQRCode />
      </DialogContent>
    </Dialog>
  );
}
