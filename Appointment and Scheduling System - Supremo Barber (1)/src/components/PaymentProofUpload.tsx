import { useState, useRef } from "react";
import qrImage from "figma:asset/9e9607467fe5e63f10eba24035950a8a0e4b1e0f.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Upload,
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Appointment } from "../App";
import API from "../services/api.service";

// Utility function to parse date string without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

interface PaymentProofUploadProps {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitProof: (
    appointmentId: string,
    proofUrl: string,
  ) => void;
}

export function PaymentProofUpload({
  appointment,
  open,
  onOpenChange,
  onSubmitProof,
}: PaymentProofUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
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
      toast.error("Please upload a payment proof image");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("appointmentId", appointment.id);
      formData.append("customerId", appointment.userId);
      formData.append("type", "payment-proof");

      const result = await API.uploadImage(formData);
      const imageUrl = result?.url || result;

      if (!imageUrl || typeof imageUrl !== "string") {
        throw new Error("Upload failed: invalid URL");
      }

      onSubmitProof(appointment.id, imageUrl);
      toast.success(
        "Payment proof submitted successfully! Waiting for admin verification.",
      );
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Failed to upload image");
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
      <DialogContent className="sm:max-w-[520px] max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-[#5C4A3A] text-lg">
            Payment Summary
          </DialogTitle>
          <DialogDescription className="text-[#87765E] text-xs">
            Review your booking details and complete payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* SECTION 1: APPOINTMENT SUMMARY */}
          <div>
            <h3 className="text-sm font-semibold text-[#5C4A3A] mb-2.5 flex items-center gap-2">
              <div className="w-1 h-4 bg-[#DB9D47] rounded-full"></div>
              Appointment Summary
            </h3>
            <Card className="border-[#E8DCC8] bg-[#FBF7EF]">
              <CardContent className="pt-3 pb-3 px-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#87765E]">Service:</span>
                    <span className="text-[#5C4A3A] font-medium">{appointment.service}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#87765E]">Barber:</span>
                    <span className="text-[#5C4A3A]">{appointment.barber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#87765E]">Date:</span>
                    <span className="text-[#5C4A3A]">
                      {parseLocalDate(appointment.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#87765E]">Time:</span>
                    <span className="text-[#5C4A3A]">{appointment.time}</span>
                  </div>
                  <div className="border-t border-[#E8DCC8] pt-2 mt-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#87765E]">Total Amount:</span>
                      <span className="text-[#5C4A3A]">₱{appointment.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#87765E]">Down Payment (50%):</span>
                      <span className="text-green-600 font-medium">Paid ✓</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-[#E8DCC8]">
                      <span className="text-[#5C4A3A] font-semibold">Remaining Balance:</span>
                      <span className="text-[#DB9D47] font-bold text-sm">₱{remainingBalance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 2: COMPLETE PAYMENT */}
          <div>
            <h3 className="text-sm font-semibold text-[#5C4A3A] mb-2.5 flex items-center gap-2">
              <div className="w-1 h-4 bg-[#DB9D47] rounded-full"></div>
              Complete Payment
            </h3>
            
            <div className="space-y-3">
              {/* QR Code & Payment Info */}
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-lg border-2 border-[#E8DCC8] bg-white">
                  <div className="w-36 h-36 flex items-center justify-center bg-[#FBF7EF]">
                    <img
                      src={qrImage}
                      alt="Supremo Barber QR Payment"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <p className="text-xs text-[#5C4A3A] font-medium">Scan to Pay via GCash</p>

                {/* Payment Info */}
                <div className="border border-[#DB9D47] rounded-lg p-2 w-full bg-[#FFF9F0]">
                  <div className="space-y-0.5 text-[10px]">
                    <p className="text-[#5C4A3A]">
                      <strong>GCash Number:</strong> 0920-4XX-XX31
                    </p>
                    <p className="text-[#5C4A3A]">
                      <strong>Account Name:</strong> JOSHUA A.
                    </p>
                    <p className="text-[#5C4A3A]">
                      <strong>User ID:</strong> •••••••••••X2KDAP
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Section */}
              <div className="space-y-2">
                <Label className="text-[#5C4A3A] text-xs font-medium">
                  Upload Proof of Payment
                </Label>

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
                    className="border-2 border-dashed border-[#E8DCC8] rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#DB9D47] transition-colors"
                  >
                    <Upload className="w-8 h-8 text-[#87765E] mb-2" />
                    <p className="text-[#5C4A3A] mb-1 text-xs font-medium">
                      Click to upload payment screenshot
                    </p>
                    <p className="text-[10px] text-[#87765E]">
                      PNG, JPG or JPEG (max. 5MB)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border-2 border-[#E8DCC8]">
                      <img
                        src={previewUrl}
                        alt="Payment proof preview"
                        className="w-full h-36 object-contain bg-[#FBF7EF]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleUploadClick}
                        className="flex-1 border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white text-xs h-8"
                      >
                        Change Image
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUploadedFile(null);
                          setPreviewUrl(null);
                        }}
                        className="border-[#E57373] text-[#E57373] hover:bg-[#E57373] hover:text-white text-xs h-8"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Alert */}
              <Card className="border-[#DB9D47] bg-orange-50">
                <CardContent className="pt-2 pb-2 px-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                    <div className="text-[10px] text-[#5C4A3A] space-y-1">
                      <p className="font-semibold">Important:</p>
                      <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
                        <li>Complete payment before your appointment</li>
                        <li>Booking confirmed after admin verification</li>
                        <li>Verification takes 5-10 minutes</li>
                        <li>Keep transaction reference for records</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-[#E8DCC8] text-sm px-4 h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!uploadedFile || isUploading}
            className="bg-[#DB9D47] hover:bg-[#C88A35] text-white text-sm px-4 h-9"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : "Submit Proof"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Payment Status Badge Component
export function PaymentStatusBadge({
  status,
}: {
  status: "pending" | "verified" | "rejected";
}) {
  const config = {
    pending: {
      label: "Pending Verification",
      icon: Clock,
      className:
        "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
    verified: {
      label: "Payment Verified",
      icon: CheckCircle2,
      className: "bg-green-100 text-green-700 border-green-200",
    },
    rejected: {
      label: "Payment Rejected",
      icon: AlertCircle,
      className: "bg-red-100 text-red-700 border-red-200",
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