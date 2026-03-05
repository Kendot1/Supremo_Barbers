import { useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Upload, QrCode, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Appointment } from '../App';
import API from '../services/api.service';

// Utility function to parse date string without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface PaymentProofUploadProps {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitProof: (appointmentId: string, proofUrl: string) => void;
}

export function PaymentProofUpload({
  appointment,
  open,
  onOpenChange,
  onSubmitProof,
}: PaymentProofUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setUploadedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!uploadedFile || !previewUrl) {
      toast.error('Please upload a payment proof image');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('appointmentId', appointment.id);
      formData.append('customerId', appointment.userId);
      formData.append('type', 'payment-proof');

      const result = await API.uploadImage(formData);
      const imageUrl = result?.url || result;

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('Upload failed: invalid URL');
      }

      onSubmitProof(appointment.id, imageUrl);
      toast.success('Payment proof submitted successfully! Waiting for admin verification.');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err?.message || 'Failed to upload image');
      return;
    } finally {
      setIsUploading(false);
      setUploadedFile(null);
      setPreviewUrl(null);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    onOpenChange(false);
  };

  const remainingBalance = appointment.price * 0.5; // 50% remaining after down payment

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#5C4A3A] text-base sm:text-lg">Complete Your Payment</DialogTitle>
          <DialogDescription className="text-[#87765E] text-xs sm:text-sm">
            Scan the QR code to pay the remaining balance and upload proof of payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-6 py-2 sm:py-4">
          {/* Appointment Summary */}
          <Card className="border-[#E8DCC8] bg-[#FBF7EF]">
            <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4">
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-[#87765E]">Service:</span>
                  <span className="text-[#5C4A3A]">{appointment.service}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-[#87765E]">Date & Time:</span>
                  <span className="text-[#5C4A3A]">
                    {parseLocalDate(appointment.date).toLocaleDateString()} at {appointment.time}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-[#87765E]">Barber:</span>
                  <span className="text-[#5C4A3A]">{appointment.barber}</span>
                </div>
                <div className="border-t border-[#E8DCC8] pt-1.5 sm:pt-2 mt-1.5 sm:mt-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-[#87765E]">Total Amount:</span>
                    <span className="text-[#5C4A3A]">₱{appointment.price}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-[#87765E]">Down Payment (50%):</span>
                    <span className="text-green-600">Paid ✓</span>
                  </div>
                  <div className="flex justify-between mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-[#E8DCC8] text-xs sm:text-sm">
                    <span className="text-[#5C4A3A]">Remaining Balance:</span>
                    <span className="text-[#DB9D47]">₱{remainingBalance.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Section */}
          <div className="flex flex-col items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-4 rounded-lg border-2 border-[#E8DCC8] bg-white">
              {/* In a real app, generate actual QR code with payment details */}
              <div className="w-32 h-32 sm:w-48 sm:h-48 flex items-center justify-center bg-[#FBF7EF]">
                <QrCode className="w-20 h-20 sm:w-32 sm:h-32 text-[#5C4A3A]" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-[#5C4A3A] mb-0.5 sm:mb-1">Scan to Pay</p>
              <p className="text-[10px] sm:text-xs text-[#87765E]">
                Use GCash, PayMaya, or Bank Transfer
              </p>
            </div>

            {/* Payment Info */}
            <Card className="border-[#DB9D47] border-2 w-full">
              <CardContent className="pt-2 sm:pt-4 pb-2 sm:pb-4">
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                  <p className="text-[#5C4A3A]"><strong>GCash Number:</strong> 0917-XXX-XXXX</p>
                  <p className="text-[#5C4A3A]"><strong>Account Name:</strong> Supremo Barber Shop</p>
                  <p className="text-[#5C4A3A]"><strong>Reference:</strong> {appointment.id}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upload Section */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-[#5C4A3A] text-xs sm:text-sm">Upload Proof of Payment</Label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!previewUrl ? (
              <div
                onClick={handleUploadClick}
                className="border-2 border-dashed border-[#E8DCC8] rounded-lg p-4 sm:p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#DB9D47] transition-colors"
              >
                <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-[#87765E] mb-2 sm:mb-3" />
                <p className="text-[#5C4A3A] mb-0.5 sm:mb-1 text-xs sm:text-sm">Click to upload payment screenshot</p>
                <p className="text-[10px] sm:text-xs text-[#87765E]">PNG, JPG or JPEG (max. 5MB)</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                <div className="relative rounded-lg overflow-hidden border-2 border-[#E8DCC8]">
                  <img
                    src={previewUrl}
                    alt="Payment proof preview"
                    className="w-full h-48 sm:h-64 object-contain bg-[#FBF7EF]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleUploadClick}
                    className="flex-1 border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white text-xs sm:text-sm py-1.5 sm:py-2"
                  >
                    Change Image
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="border-[#E57373] text-[#E57373] hover:bg-[#E57373] hover:text-white text-xs sm:text-sm py-1.5 sm:py-2"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Info Alert */}
          <Card className="border-[#DB9D47] bg-orange-50">
            <CardContent className="pt-2 sm:pt-4 pb-2 sm:pb-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-[#5C4A3A] space-y-0.5 sm:space-y-1">
                  <p><strong>Important:</strong></p>
                  <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs">
                    <li>Please complete payment before your appointment</li>
                    <li>Your booking will be confirmed after admin verification</li>
                    <li>Verification typically takes 5-10 minutes during business hours</li>
                    <li>Keep your transaction reference for your records</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="border-[#E8DCC8] text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!uploadedFile || isUploading}
            className="bg-[#DB9D47] hover:bg-[#C88A35] text-white text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2"
          >
            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Submit Proof'}</span>
            <span className="sm:hidden">{isUploading ? 'Uploading…' : 'Submit'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Payment Status Badge Component
export function PaymentStatusBadge({ status }: { status: 'pending' | 'verified' | 'rejected' }) {
  const config = {
    pending: {
      label: 'Pending Verification',
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
    verified: {
      label: 'Payment Verified',
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-700 border-green-200',
    },
    rejected: {
      label: 'Payment Rejected',
      icon: AlertCircle,
      className: 'bg-red-100 text-red-700 border-red-200',
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

