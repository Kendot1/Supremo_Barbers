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
  }, [user]);

  const handleSaveProfile = async () => {
    setShowProfileConfirm(false);
    setLoading(true);
    try {
      // Update user in database
      await API.users.update(user.id, {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
      });

      // Log profile update to audit logs
      const changes = [];
      if (profile.name !== user.name) changes.push("name");
      if (profile.email !== user.email) changes.push("email");
      if (profile.phone !== user.phone) changes.push("phone");

      if (changes.length > 0) {
        await logProfileUpdate(
          user.id,
          user.role as "customer",
          user.name,
          user.email,
          changes,
        );
      }

      toast.success("Profile updated successfully!", {
        description:
          "Your personal information has been saved.",
      });
      if (onUserUpdate) {
        onUserUpdate({
          ...user,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile", {
        description: "Please try again later.",
      });
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
                  disabled
                  className="pl-9 border-[#E8DCC8] bg-gray-50 cursor-not-allowed opacity-60"
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
          <PasswordInput
            label="Current Password"
            id="currentPassword"
            value={passwordData.currentPassword}
            onChange={(value) =>
              setPasswordData({
                ...passwordData,
                currentPassword: value,
              })
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
              setPasswordData({
                ...passwordData,
                newPassword: value,
              })
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
              setPasswordData({
                ...passwordData,
                confirmPassword: value,
              })
            }
            password={passwordData.newPassword}
            placeholder="••••••••"
            className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
          />

          <Button
            onClick={() => {
              // Validate first before showing confirmation
              if (
                !passwordData.currentPassword ||
                !passwordData.newPassword ||
                !passwordData.confirmPassword
              ) {
                toast.error(
                  "Please fill in all password fields",
                );
                return;
              }
              if (
                passwordData.newPassword !==
                passwordData.confirmPassword
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
              
              setShowPasswordConfirm(true);
            }}
            disabled={passwordLoading}
            className="bg-[#D98555] hover:bg-[#C77545] text-white"
          >
            {passwordLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
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
        onOpenChange={setShowProfileConfirm}
      >
        <AlertDialogContent className="border-[#E8DCC8]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#5C4A3A] flex items-center gap-2">
              <Save className="w-5 h-5 text-[#DB9D47]" />
              Confirm Profile Changes
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#87765E]">
              Are you sure you want to save these changes to
              your profile? This will update your personal
              information.
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