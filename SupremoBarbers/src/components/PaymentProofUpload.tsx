import { useState, useRef } from "react";
import qrImage from "asset/qrCode.png";
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
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
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

    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Failed to upload image");
      return;
    } finally {
      setIsUploading(false);
      setUploadedFile(null);
      setPreviewUrl(null);
      setCurrentStep(1);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setCurrentStep(1);
    onOpenChange(false);
  };

  const remainingBalance = appointment.price * 0.5; // 50% remaining after down payment

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setCurrentStep(1);
        setUploadedFile(null);
        setPreviewUrl(null);
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[520px] max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-[#5C4A3A] text-lg">
            Payment Summary
          </DialogTitle>
          <DialogDescription className="text-[#87765E] text-xs">
            Review your booking details and complete payment
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator - matches BookingFlow progress bar pattern */}
        <div className="flex items-center justify-center gap-0 mb-1">
          {[
            { num: 1, label: "Summary" },
            { num: 2, label: "Payment" },
          ].map((s, idx) => (
            <div
              key={s.num}
              className="flex flex-col items-center flex-1"
            >
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div
                    className={`flex-1 h-1 transition-colors ${currentStep > idx
                      ? "bg-[#DB9D47]"
                      : "bg-[#E8DCC8]"
                      }`}
                  />
                )}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm mx-2 text-sm font-medium ${currentStep >= s.num
                    ? "bg-gradient-to-br from-[#DB9D47] to-[#C56E33] text-white"
                    : "bg-[#F8F0E0] text-[#87765E]"
                    }`}
                >
                  {currentStep > s.num ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    s.num
                  )}
                </div>
                {idx < 1 && (
                  <div
                    className={`flex-1 h-1 transition-colors ${currentStep > s.num
                      ? "bg-[#DB9D47]"
                      : "bg-[#E8DCC8]"
                      }`}
                  />
                )}
              </div>
              <span className="text-xs text-[#87765E] mt-1.5">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* ============================================== */}
        {/* STEP 1: APPOINTMENT SUMMARY                   */}
        {/* ============================================== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Appointment Summary - matches BookingFlow summary card */}
            <div>
              <h3 className="text-sm font-semibold text-[#5C4A3A] mb-2.5 flex items-center gap-2">
                <div className="w-1 h-4 bg-[#DB9D47] rounded-full"></div>
                Appointment Summary
              </h3>
              <div className="bg-[#FBF7EF] border border-[#E8DCC8] rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#87765E]">Service:</span>
                  <span className="text-[#5C4A3A] font-medium">{appointment.service}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#87765E]">Barber:</span>
                  <span className="text-[#5C4A3A]">{appointment.barber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#87765E]">Date:</span>
                  <span className="text-[#5C4A3A]">
                    {parseLocalDate(appointment.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#87765E]">Time:</span>
                  <span className="text-[#5C4A3A]">{appointment.time}</span>
                </div>
                <div className="h-px bg-[#E8DCC8] my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-[#87765E]">Total Amount:</span>
                  <span className="text-[#5C4A3A]">₱{appointment.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#87765E]">Down Payment (50%):</span>
                  <span className="text-green-600 font-medium">Paid</span>
                </div>
                <div className="h-px bg-[#E8DCC8] my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-[#5C4A3A] font-semibold">Remaining Balance:</span>
                  <span className="text-xl text-[#DB9D47] font-bold">₱{remainingBalance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* No Refund Policy - matches BookingFlow pattern */}
            <div className="p-3 bg-[#FCF4E8] border border-[#E8C798] rounded-lg">
              <p className="text-sm text-[#6B5845]">
                <strong>⚠️ No Refund Policy:</strong> Please
                note that down payments are non-refundable. Make
                sure to arrive on time for your appointment.
              </p>
            </div>

            {/* Info - Payment method note */}
            <p className="text-sm text-[#87765E]">
              Payment Method:{" "}
              <span className="text-[#5C4A3A]">
                GCash (Remaining Balance)
              </span>
            </p>

            {/* Footer - matches BookingFlow flex gap-4 pattern */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setCurrentStep(2)}
                className="flex-1 bg-[#DB9D47] hover:bg-[#C58A38] text-white"
              >
                Proceed to Payment
              </Button>
            </div>
          </div>
        )}

        {/* ============================================== */}
        {/* STEP 2: COMPLETE PAYMENT                       */}
        {/* ============================================== */}
        {currentStep === 2 && (
          <div className="space-y-3">
            {/* Section Header - matches BookingFlow gold bar pattern */}
            <h3 className="text-sm font-semibold text-[#5C4A3A] mb-2.5 flex items-center gap-2">
              <div className="w-1 h-4 bg-[#DB9D47] rounded-full"></div>
              Complete Payment
            </h3>

            {/* QR Code & Payment Info - matches BookingFlow QR dialog layout */}
            <div className="space-y-3">
              {/* QR Code - centered like BookingFlow */}
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-lg border-2 border-[#E8DCC8] bg-white">
                  <div className="w-48 h-48 flex items-center justify-center bg-[#FBF7EF]">
                    <img
                      src={qrImage}
                      alt="Supremo Barber QR Payment"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <p className="text-xs text-[#5C4A3A] font-medium">
                  Scan to Pay ₱{remainingBalance.toFixed(2)}
                </p>

                {/* Payment Info - matches BookingFlow style */}
                <div className="border border-[#DB9D47] rounded-lg p-3 w-full bg-[#FFF9F0]">
                  <div className="space-y-1 text-sm">
                    <p className="text-[#5C4A3A]">
                      <strong>GCash Number:</strong> 0920-422-9731
                    </p>
                    <p className="text-[#5C4A3A]">
                      <strong>Account Name:</strong> JOSHUA A.
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Section - matches BookingFlow upload pattern */}
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
                    className="border-2 border-dashed border-[#E8DCC8] rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#DB9D47] transition-colors"
                  >
                    <QrCode className="w-8 h-8 text-[#87765E] mb-2" />
                    <p className="text-xs text-[#5C4A3A] mb-0.5 font-medium">
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
                        className="w-full h-40 object-contain bg-[#FBF7EF]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUploadClick}
                        className="flex-1 border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white text-xs h-8"
                      >
                        Change
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
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

              {/* Important Info - matches BookingFlow notice pattern */}
              <div className="border border-[#DB9D47] bg-orange-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[#5C4A3A]">
                    <p className="mb-1 font-semibold">
                      Important:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs">
                      <li>
                        Complete payment to confirm booking
                      </li>
                      <li>Verification takes 5-10 minutes</li>
                      <li>Down payments are non-refundable</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - matches BookingFlow flex gap-4, flex-1 pattern */}
            <div className="flex gap-4 pt-1">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1 border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF]"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!uploadedFile || isUploading}
                className="flex-1 bg-[#DB9D47] hover:bg-[#C58A38] text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading..." : "Submit Proof"}
              </Button>
            </div>
          </div>
        )}
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