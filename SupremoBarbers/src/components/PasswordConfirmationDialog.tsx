import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PasswordInput } from "./ui/password-input";
import { Label } from "./ui/label";
import { AlertCircle, Lock } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import API from "../services/api.service";

interface PasswordConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  actionType?: "edit" | "delete" | "action";
}

export const PasswordConfirmationDialog: React.FC<
  PasswordConfirmationDialogProps
> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionType = "action",
}) => {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    const handleConfirm = async () => {
      setError("");
      setIsVerifying(true);

      try {
        // Verify password with backend

        const result = await API.auth.verifyPassword(password);

        if (result.verified) {

          setIsVerifying(false);
          setPassword("");
          onConfirm();
          onClose();
        } else {

          setIsVerifying(false);
          setError("Incorrect password. Please try again.");
        }
      } catch (error: any) {
        console.error("❌ Password verification error:", error);
        setIsVerifying(false);

        // Handle specific error messages
        if (error.message?.includes("Incorrect password")) {
          setError("Incorrect password. Please try again.");
        } else if (
          error.message?.includes("Unauthorized") ||
          error.message?.includes("Invalid or expired token")
        ) {
          setError("Your session has expired. Please log in again.");
        } else {
          setError("Failed to verify password. Please try again.");
        }
      }
    };

    const handleClose = () => {
      setPassword("");
      setError("");
      onClose();
    };

    const getActionColor = () => {
      switch (actionType) {
        case "delete":
          return "text-red-600";
        case "edit":
          return "text-[#DB9D47]";
        default:
          return "text-[#DB9D47]";
      }
    };

    const getActionText = () => {
      switch (actionType) {
        case "delete":
          return "Delete";
        case "edit":
          return "Edit";
        default:
          return "Proceed";
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-[#FFFDF8] to-[#FFF8E8]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#DB9D47] to-[#C88A3C] flex items-center justify-center shadow-lg">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {title || "Confirm Your Identity"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#8B7355] mt-1">
                  {description ||
                    "Enter your password to confirm this action"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#5C4A3A]">
                Password
              </Label>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password) {
                    handleConfirm();
                  }
                }}
                className="border-[#D4C5B0] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
                autoFocus
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Security Notice:</strong> This verification ensures that
                only authorized users can perform {actionType} operations.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-[#D4C5B0] text-[#5C4A3A] hover:bg-[#F5EDD8]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!password || isVerifying}
              className={`${actionType === "delete"
                  ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  : "bg-gradient-to-r from-[#DB9D47] to-[#C88A3C] hover:from-[#C88A3C] hover:to-[#B87A2E]"
                } text-white shadow-lg`}
            >
              {isVerifying ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  {getActionText()}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };