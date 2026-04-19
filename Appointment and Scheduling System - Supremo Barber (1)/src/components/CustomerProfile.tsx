import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PasswordInput, ConfirmPasswordInput } from "./ui/PasswordInput";
import { Label } from "./ui/label";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar";
import {
  User,
  Mail,
  Phone,
  Save,
  Calendar,
  Award,
  Loader2,
  AlertTriangle,
  Camera,
  Upload,
  Shield,
  ShieldOff,
  MonitorSmartphone,
  CheckCircle2,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { FaPesoSign } from "react-icons/fa6";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import type { User as UserType } from "../App";
import API from "../services/api.service";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import {
  logPasswordChange,
  logProfileUpdate,
  logAvatarUpload,
  logSignOutAllDevices,
} from "../services/audit-notification.service";
import { validatePassword } from "@/utils/passwordValidator";

interface CustomerProfileProps {
  user: UserType;
  onUserUpdate?: (updatedUser: UserType) => void;
}

export function CustomerProfile({
  user,
  onUserUpdate,
}: CustomerProfileProps) {
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    avatarUrl: user.avatarUrl || "",
  });

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] =
    useState(false);
  const [showProfileConfirm, setShowProfileConfirm] =
    useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] =
    useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Password for profile changes (used when email changes)
  const [profilePassword, setProfilePassword] = useState("");

  // Security & Devices state
  const [signOutAllLoading, setSignOutAllLoading] =
    useState(false);
  const [showSignOutAllConfirm, setShowSignOutAllConfirm] =
    useState(false);

  // Derive current device trusted status from localStorage
  const trustedKey = `trusted_device_${user.email.toLowerCase()}`;
  const [isCurrentDeviceTrusted, setIsCurrentDeviceTrusted] =
    useState(() => {
      const ts = localStorage.getItem(`${trustedKey}_ts`);
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      return (
        localStorage.getItem(trustedKey) === "true" &&
        !!ts &&
        Date.now() - parseInt(ts, 10) < THIRTY_DAYS
      );
    });
  const [deviceTrustedSince, setDeviceTrustedSince] = useState<
    string | null
  >(() => {
    const ts = localStorage.getItem(`${trustedKey}_ts`);
    if (!ts) return null;
    return new Date(parseInt(ts, 10)).toLocaleDateString(
      "en-PH",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    );
  });

  const handleSignOutAllDevices = async () => {
    setShowSignOutAllConfirm(false);
    setSignOutAllLoading(true);
    try {
      // 1. Persist the revocation timestamp on the server so other devices
      //    are blocked on their next login (checked against response.user.deviceRevocationTs).
      await API.users.update(user.id, {
        deviceRevocationTs: new Date().toISOString(),
      } as any);

      // 2. Clear the trusted-device entry for the current device
      localStorage.removeItem(trustedKey);
      localStorage.removeItem(`${trustedKey}_ts`);
      setIsCurrentDeviceTrusted(false);
      setDeviceTrustedSince(null);

      // 3. Audit log + in-app notification
      await logSignOutAllDevices(
        user.id,
        user.name,
        user.email,
      );

      toast.success("Signed out from all devices", {
        description:
          "All trusted devices have been revoked. 2FA will be required on the next login from any device.",
        duration: 6000,
      });
    } catch (error) {
      console.error("Error revoking all devices:", error);
      toast.error("Failed to sign out from all devices", {
        description: "Please try again later.",
      });
    } finally {
      setSignOutAllLoading(false);
    }
  };

  const handleRemoveCurrentDeviceTrust = () => {
    localStorage.removeItem(trustedKey);
    localStorage.removeItem(`${trustedKey}_ts`);
    setIsCurrentDeviceTrusted(false);
    setDeviceTrustedSince(null);
    toast.success("This device is no longer trusted", {
      description:
        "You will be asked to complete 2FA on your next login.",
    });
  };

  // Update profile state when user prop changes (e.g., after avatar upload or page reload)
  useEffect(() => {
    setProfile((prev) => ({
      ...prev,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      avatarUrl: user.avatarUrl || "",
    }));
  }, [user.name, user.email, user.phone, user.avatarUrl]); // Only update when specific fields change

  const handleSaveProfile = async () => {
    setShowProfileConfirm(false);
    setLoading(true);

    try {


      // First, verify the user exists in the database
      try {

        const existingUser = await API.users.getById(user.id);

      } catch (verifyError: any) {
        console.error('❌ DEBUG - User verification failed:', verifyError);
        console.error('❌ DEBUG - Error details:', {
          message: verifyError.message,
          status: verifyError.status,
          stack: verifyError.stack
        });

        // If user doesn't exist, show helpful error
        if (verifyError.message?.includes('User not found') || verifyError.message?.includes('404')) {
          toast.error('Account sync issue detected', {
            description: `Your account (ID: ${user.id.substring(0, 8)}...) needs to be re-synced. Please log out and log back in.`,
            duration: 10000
          });
          setLoading(false);
          setProfilePassword("");
          return;
        }

        // Re-throw other errors
        throw verifyError;
      }

      const emailChanged = profile.email.toLowerCase() !== user.email.toLowerCase();

      // If email changed, use changeEmail API with password
      if (emailChanged) {
        if (!profilePassword) {
          toast.error("Password required", {
            description: "Please enter your password to change your email address."
          });
          setLoading(false);
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(profile.email)) {
          toast.error("Invalid email format");
          setLoading(false);
          setProfilePassword("");
          return;
        }

        // TEMPORARY WORKAROUND: Try changeEmail first, if it fails use regular update
        try {
          // Call change email API
          const result = await API.users.changeEmail(user.id, {
            newEmail: profile.email,
            password: profilePassword,
          });

          // Update other fields separately if they changed
          if (profile.name !== user.name || profile.phone !== user.phone) {
            try {
              await API.users.update(user.id, {
                name: profile.name,
                phone: profile.phone,
              });
            } catch (updateError) {
              console.error("Error updating name/phone:", updateError);
              // Continue anyway, email was changed successfully
            }
          }

          toast.success("Profile updated successfully!", {
            description: `Your email has been changed to ${result.newEmail}`
          });

          // Log the changes (don't fail if logging fails)
          const changes = [];
          if (emailChanged) changes.push("email");
          if (profile.name !== user.name) changes.push("name");
          if (profile.phone !== user.phone) changes.push("phone");

          if (changes.length > 0) {
            try {
              await logProfileUpdate(
                user.id,
                user.role as "customer",
                user.name,
                user.email,
                changes
              );
            } catch (logError) {
              console.error("Error logging profile update:", logError);
              // Don't fail the whole operation if logging fails
            }
          }

          if (onUserUpdate) {
            onUserUpdate({
              ...user,
              name: profile.name,
              email: result.newEmail,
              phone: profile.phone,
            });
          }

          // Clear password
          setProfilePassword("");

        } catch (emailChangeError: any) {
          console.error("Change email API failed, trying regular update:", emailChangeError);

          // Check for duplicate email error
          if (emailChangeError.message?.includes('duplicate key') ||
            emailChangeError.message?.includes('users_email_key') ||
            emailChangeError.message?.includes('already registered') ||
            emailChangeError.message?.includes('email is already in use')) {
            toast.error("Email already in use", {
              description: "This email address is already registered to another account. Please use a different email."
            });
            setLoading(false);
            setProfilePassword("");
            return;
          }



          await API.users.update(user.id, {
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
          });

          const changes = [];
          if (emailChanged) changes.push("email");
          if (profile.name !== user.name) changes.push("name");
          if (profile.phone !== user.phone) changes.push("phone");

          if (changes.length > 0) {
            try {
              await logProfileUpdate(
                user.id,
                user.role as "customer",
                user.name,
                user.email,
                changes
              );
            } catch (logError) {
              console.error("Error logging profile update:", logError);
            }
          }

          toast.success("Profile updated successfully!", {
            description: "Your personal information has been saved."
          });

          if (onUserUpdate) {
            onUserUpdate({
              ...user,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
            });
          }

          setProfilePassword("");
        }

      } else {
        // No email change, use regular update
        await API.users.update(user.id, {
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
        });

        const changes = [];
        if (profile.name !== user.name) changes.push("name");
        if (profile.phone !== user.phone) changes.push("phone");

        if (changes.length > 0) {
          try {
            await logProfileUpdate(
              user.id,
              user.role as "customer",
              user.name,
              user.email,
              changes
            );
          } catch (logError) {
            console.error("Error logging profile update:", logError);
            // Don't fail the whole operation if logging fails
          }
        }

        toast.success("Profile updated successfully!", {
          description: "Your personal information has been saved."
        });

        if (onUserUpdate) {
          onUserUpdate({
            ...user,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
          });
        }
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile", {
        description: error.message || "Please try again later."
      });
      setProfilePassword(""); // Clear password on error too
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (
      passwordData.newPassword !== passwordData.confirmPassword
    ) {
      toast.error("New passwords do not match");
      return;
    }

    // Comprehensive password validation
    const passwordValidation = validatePassword(passwordData.newPassword, user.name);
    if (!passwordValidation.isValid) {
      toast.error("Password does not meet security requirements", {
        description: passwordValidation.issues[0] || "Please create a stronger password"
      });
      return;
    }

    setShowPasswordConfirm(false);
    setPasswordLoading(true);
    try {
      // Call API to change password
      await API.users.changePassword(user.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      // Log password change to audit logs
      await logPasswordChange(
        user.id,
        user.role as "customer",
        user.name,
        user.email,
        false,
      );

      toast.success("Password changed successfully!", {
        description: "Your new password is now active.",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password", {
        description:
          error.message ||
          "Please check your current password and try again.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Forgot password handlers
  const handleForgotPasswordSendOTP = async () => {
    setForgotLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ email: user.email.toLowerCase() }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) { toast.error(data.error || "Failed to send reset code"); return; }
      if (data.token) sessionStorage.setItem('forgot_password_token', data.token);
      toast.success("Reset code sent!", { description: `Check ${user.email} inbox` });
      setForgotStep(2);
    } catch { toast.error("Network error. Please try again."); } finally { setForgotLoading(false); }
  };

  const handleForgotPasswordVerifyOTP = async () => {
    if (!forgotOtp || forgotOtp.length !== 6) { toast.error("Please enter the 6-digit code"); return; }
    setForgotLoading(true);
    try {
      const token = sessionStorage.getItem('forgot_password_token');
      if (!token) { toast.error("Session expired. Please try again."); setForgotStep(1); return; }
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/verify-reset-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ email: user.email.toLowerCase(), otp: forgotOtp, token }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) { toast.error(data.error || "Invalid code"); return; }
      toast.success("Code verified! Set your new password.");
      setForgotStep(3);
    } catch { toast.error("Failed to verify code."); } finally { setForgotLoading(false); }
  };

  const handleForgotPasswordReset = async () => {
    if (forgotNewPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (forgotNewPassword !== forgotConfirmPassword) { toast.error("Passwords do not match"); return; }
    setForgotLoading(true);
    try {
      const token = sessionStorage.getItem('forgot_password_token');
      if (!token) { toast.error("Session expired. Please start over."); setForgotStep(1); return; }
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ email: user.email.toLowerCase(), newPassword: forgotNewPassword, token }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) { toast.error(data.error || "Failed to reset password"); return; }
      sessionStorage.removeItem('forgot_password_token');
      toast.success("Password reset successfully!");
      setShowForgotPassword(false);
      setForgotStep(1);
      setForgotOtp(""); setForgotNewPassword(""); setForgotConfirmPassword("");
    } catch { toast.error("Failed to reset password."); } finally { setForgotLoading(false); }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

    // Upload to Cloudflare R2 immediately
    try {
      setIsUploadingAvatar(true);
      toast.loading("Uploading avatar to Cloudflare R2...", {
        id: "avatar-upload",
      });

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("type", "avatar"); // Specify upload type for proper folder organization

      const response = await API.uploadImage(uploadFormData);

      // Validate response
      if (!response || !response.url) {
        console.error(
          "❌ Invalid response from upload API:",
          response,
        );
        throw new Error(
          "Upload failed: No URL returned from server",
        );
      }

      // Set the R2 URL in profile data
      setProfile({ ...profile, avatarUrl: response.url });

      const updatedUser = await API.users.update(user.id, {
        avatarUrl: response.url,
      });

      // Update localStorage
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.avatarUrl = response.url;
        localStorage.setItem(
          "currentUser",
          JSON.stringify(parsedUser),
        );
      }

      // Update parent component's user state
      if (onUserUpdate) {
        onUserUpdate({ ...user, avatarUrl: response.url });
      }

      // Log avatar upload to audit logs
      await logAvatarUpload(
        user.id,
        user.role as "customer",
        user.name,
        user.email,
        response.url,
      );

      toast.success("Avatar uploaded successfully!", {
        id: "avatar-upload",
      });
    } catch (error) {
      console.error("❌ Avatar upload error:", error);
      toast.error("Failed to upload avatar", {
        id: "avatar-upload",
      });

      // Clear the file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[#5C4A3A] mb-2">My Profile</h1>
        <p className="text-[#87765E]">
          Manage your personal information and account settings
        </p>
      </div>

      {/* Profile Overview */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <CardTitle className="text-[#5C4A3A]">
            Profile Information
          </CardTitle>
          <CardDescription className="text-[#87765E]">
            Update your personal details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-20 h-20 bg-[#DB9D47] text-white">
                <AvatarImage
                  src={
                    profile.avatarUrl || user.avatarUrl || ""
                  }
                  alt={profile.name}
                />
                <AvatarFallback className="text-2xl bg-[#DB9D47] text-white">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleUploadClick}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 bg-[#DB9D47] hover:bg-[#C88B3A] text-white rounded-full p-1.5 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Change profile picture"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <h3 className="text-[#5C4A3A]">{profile.name}</h3>
              <p className="text-sm text-[#87765E]">
                {profile.email}
              </p>
              <span className="text-xs text-[#87765E] mt-2 block">
                Customer since{" "}
                {new Date(
                  user.createdAt || Date.now(),
                ).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#5C4A3A]">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      name: e.target.value,
                    })
                  }
                  className="pl-9 border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#5C4A3A]">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      email: e.target.value,
                    })
                  }
                  className="pl-9 border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#5C4A3A]">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      phone: e.target.value,
                    })
                  }
                  placeholder="09XXXXXXXXX"
                  className="pl-9 border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={() => setShowProfileConfirm(true)}
            disabled={loading}
            className="bg-[#DB9D47] hover:bg-[#C88B3A] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <CardTitle className="text-[#5C4A3A]">
            Change Password
          </CardTitle>
          <CardDescription className="text-[#87765E]">
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showForgotPassword ? (
            <>
              <PasswordInput
                label="Current Password"
                id="currentPassword"
                value={passwordData.currentPassword}
                onChange={(value) =>
                  setPasswordData({ ...passwordData, currentPassword: value })
                }
                placeholder="••••••••"
                showStrength={false}
                className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
              />

              <PasswordInput
                label="New Password"
                id="newPassword"
                value={passwordData.newPassword}
                onChange={(value) =>
                  setPasswordData({ ...passwordData, newPassword: value })
                }
                placeholder="••••••••"
                showStrength={true}
                userName={user.name}
                className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
              />

              <ConfirmPasswordInput
                label="Confirm New Password"
                id="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={(value) =>
                  setPasswordData({ ...passwordData, confirmPassword: value })
                }
                password={passwordData.newPassword}
                placeholder="••••••••"
                className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm text-[#DB9D47] hover:text-[#C88A35] hover:underline transition-colors"
                  onClick={() => { setShowForgotPassword(true); setForgotStep(1); }}
                >
                  Forgot Password?
                </button>
                <Button
                  onClick={() => {
                    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
                      toast.error("Please fill in all password fields");
                      return;
                    }
                    if (passwordData.newPassword !== passwordData.confirmPassword) {
                      toast.error("New passwords do not match");
                      return;
                    }
                    const passwordValidation = validatePassword(passwordData.newPassword, user.name);
                    if (!passwordValidation.isValid) {
                      toast.error("Password does not meet security requirements", {
                        description: passwordValidation.issues[0] || "Please create a stronger password"
                      });
                      return;
                    }
                    setShowPasswordConfirm(true);
                  }}
                  disabled={passwordLoading}
                  className="bg-[#D98555] hover:bg-[#C77545] text-white"
                >
                  {passwordLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-[#5C4A3A]">Reset Password via Email</h4>
                <button
                  type="button"
                  className="text-xs text-[#87765E] hover:text-[#5C4A3A] hover:underline"
                  onClick={() => {
                    setShowForgotPassword(false); setForgotStep(1);
                    setForgotOtp(""); setForgotNewPassword(""); setForgotConfirmPassword("");
                  }}
                >
                  ← Back to Change Password
                </button>
              </div>

              {forgotStep === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-[#87765E]">
                    We'll send a 6-digit verification code to <strong className="text-[#5C4A3A]">{user.email}</strong>
                  </p>
                  <Button className="w-full bg-[#DB9D47] hover:bg-[#C88A35] text-white" onClick={handleForgotPasswordSendOTP} disabled={forgotLoading}>
                    {forgotLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : "Send Verification Code"}
                  </Button>
                </div>
              )}

              {forgotStep === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-[#87765E]">
                    Enter the 6-digit code sent to <strong className="text-[#5C4A3A]">{user.email}</strong>
                  </p>
                  <Input
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="border-[#E8DCC8] text-center text-xl tracking-[0.5em] font-mono"
                    maxLength={6}
                  />
                  <Button className="w-full bg-[#DB9D47] hover:bg-[#C88A35] text-white" onClick={handleForgotPasswordVerifyOTP} disabled={forgotLoading || forgotOtp.length !== 6}>
                    {forgotLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : "Verify Code"}
                  </Button>
                  <button type="button" className="text-xs text-[#DB9D47] hover:underline w-full text-center" onClick={handleForgotPasswordSendOTP} disabled={forgotLoading}>
                    Resend code
                  </button>
                </div>
              )}

              {forgotStep === 3 && (
                <div className="space-y-3">
                  <PasswordInput
                    label="New Password"
                    id="forgotNewPassword"
                    value={forgotNewPassword}
                    onChange={(value) => setForgotNewPassword(value)}
                    placeholder="Enter new password"
                    showStrength={true}
                    userName={user.name}
                    className="border-[#E8DCC8]"
                  />
                  <ConfirmPasswordInput
                    label="Confirm New Password"
                    id="forgotConfirmPassword"
                    value={forgotConfirmPassword}
                    onChange={(value) => setForgotConfirmPassword(value)}
                    password={forgotNewPassword}
                    placeholder="Confirm new password"
                    className="border-[#E8DCC8]"
                  />
                  <Button className="w-full bg-[#DB9D47] hover:bg-[#C88A35] text-white" onClick={handleForgotPasswordReset} disabled={forgotLoading}>
                    {forgotLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resetting...</> : "Reset Password"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>



      {/* Security & Devices */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <CardTitle className="text-[#5C4A3A] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#DB9D47]" />
            Security &amp; Devices
          </CardTitle>
          <CardDescription className="text-[#87765E]">
            Manage trusted devices and active sessions for your
            account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Current device trust status */}
          <div className="p-4 rounded-lg border border-[#E8DCC8] bg-[#FBF7EF]">
            <div className="flex items-start gap-3">
              <MonitorSmartphone className="w-5 h-5 text-[#DB9D47] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#5C4A3A]">
                  This Device
                </p>
                <p className="text-xs text-[#87765E] mt-0.5 break-words">
                  {navigator.userAgent.slice(0, 80)}
                  {navigator.userAgent.length > 80 ? "…" : ""}
                </p>
              </div>
              {isCurrentDeviceTrusted ? (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full  shrink-0"></span>
              ) : (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">
                  <Shield className="w-3 h-3" />
                  Unverified
                </span>
              )}
            </div>

            {isCurrentDeviceTrusted && deviceTrustedSince && (
              <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-[#87765E] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Trusted since {deviceTrustedSince} · expires
                  in 30 days
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveCurrentDeviceTrust}
                  className="text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Remove Trust
                </Button>
              </div>
            )}

            {!isCurrentDeviceTrusted && (
              <p className="mt-2 text-xs text-[#87765E]">
                Complete a 2FA verification on login to mark
                this device as trusted and skip future 2FA
                prompts.
              </p>
            )}
          </div>

          {/* Sign out all devices */}
          <div className="pt-1">
            <Button
              onClick={() => setShowSignOutAllConfirm(true)}
              disabled={signOutAllLoading}
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            >
              {signOutAllLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revoking all devices…
                </>
              ) : (
                <>
                  <ShieldOff className="w-4 h-4 mr-2" />
                  Sign Out From All Devices
                </>
              )}
            </Button>
            <p className="text-xs text-[#87765E] mt-2 text-center">
              This will revoke all trusted devices. Every device
              will need to complete 2FA on the next login.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out All Devices Confirmation */}
      <AlertDialog
        open={showSignOutAllConfirm}
        onOpenChange={setShowSignOutAllConfirm}
      >
        <AlertDialogContent className="border-[#E8DCC8]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <ShieldOff className="w-5 h-5" />
              Sign Out From All Devices?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#87765E] space-y-2">
              <p>
                This will{" "}
                <span className="font-medium text-[#5C4A3A]">
                  revoke all trusted devices
                </span>{" "}
                linked to your account, including this one.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                <li>
                  Every device will need to complete 2FA on the
                  next login
                </li>
                <li>
                  Any active sessions on other devices will be
                  invalidated on their next login
                </li>
                <li>
                  You will remain logged in on this device for
                  now
                </li>
              </ul>
              <p className="mt-2">Do you want to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOutAllDevices}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Sign Out All Devices
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Profile Confirmation Dialog */}
      <AlertDialog
        open={showProfileConfirm}
        onOpenChange={(open) => {
          setShowProfileConfirm(open);
          if (!open) setProfilePassword(""); // Clear password when closing
        }}
      >
        <AlertDialogContent className="border-[#E8DCC8]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#5C4A3A] flex items-center gap-2">
              <Save className="w-5 h-5 text-[#DB9D47]" />
              Confirm Profile Changes
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#87765E] space-y-3">
              {profile.email.toLowerCase() !== user.email.toLowerCase() ? (
                <>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start gap-2">

                      <div className="text-sm text-amber-900">

                        <p>
                          <span className="font-medium">Current:</span> {user.email}
                        </p>
                        <p>
                          <span className="font-medium">New:</span> {profile.email}
                        </p>

                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">

                    <PasswordInput
                      id="profilePassword"
                      value={profilePassword}
                      onChange={(value) => setProfilePassword(value)}
                      placeholder="Enter your password"
                      showStrength={false}
                      className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
                    />
                  </div>
                </>
              ) : (
                <p>Are you sure you want to save these changes to your profile? This will update your personal information.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveProfile}
              className="bg-[#DB9D47] hover:bg-[#C88B3A] text-white"
            >
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Confirmation Dialog */}
      <AlertDialog
        open={showPasswordConfirm}
        onOpenChange={setShowPasswordConfirm}
      >
        <AlertDialogContent className="border-[#E8DCC8]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#D98555] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Password Change
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#87765E] space-y-2">
              <p className="font-medium">
                ⚠️ Important Security Update
              </p>
              <p>
                You are about to change your account password.
                After this change:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  You will need to use the new password to log
                  in
                </li>
                <li>
                  All active sessions will remain logged in
                </li>
                <li>Make sure to remember your new password</li>
              </ul>
              <p className="mt-3">
                Do you want to proceed with changing your
                password?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleChangePassword}
              className="bg-[#D98555] hover:bg-[#C77545] text-white"
            >
              Yes, Change Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}