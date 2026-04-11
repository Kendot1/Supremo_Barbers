import { useState, useEffect } from "react";
import { 
  Eye, 
  EyeOff, 
  User, 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  LogIn,
  Info,
  Shield,
  UserPlus,
  Key,
  AlertCircle
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { toast } from "sonner@2.0.3";
import API from "../services/api.service";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { 
  ValidationError, 
  validateLoginForm, 
  validateRegistrationForm,
  getFieldError 
} from "../utils/validation";
import { validatePassword, getPasswordFeedback } from "../utils/passwordValidator";
import { logNewDeviceLogin, logUserRegistration, logUserLogin, logFailedLogin } from "../services/audit-notification.service";

interface LoginPageProps {
  onLogin: (user: any) => void;
  onBack?: () => void;
}

// Default tab (can be 'login' or 'register')
const defaultTab = "login";

// Password input component
function PasswordInput({ className, ...props }: React.ComponentPropsWithoutRef<typeof Input>) {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="relative">
      <Input
        {...props}
        type={showPassword ? "text" : "password"}
        className={className}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

export function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot Password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1 = email, 2 = OTP, 3 = new password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotDisplayEmail, setForgotDisplayEmail] = useState(""); // Email to display in UI
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotResendCooldown, setForgotResendCooldown] = useState(0);
  const [forgotCanResend, setForgotCanResend] = useState(false);

  // Login 2FA state
  const [loginStep, setLoginStep] = useState(1); // 1 = credentials, 2 = OTP verification
  const [loginOtp, setLoginOtp] = useState("");
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginResendCooldown, setLoginResendCooldown] = useState(0);
  const [loginCanResend, setLoginCanResend] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState<any>(null);

  // Registration steps state
  const [registrationStep, setRegistrationStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  
  // Email duplicate checking state
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  
  // Username duplicate checking state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameExists, setUsernameExists] = useState(false);
  
  // Password strength validation state
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof validatePassword> | null>(null);
  const [resetPasswordStrength, setResetPasswordStrength] = useState<ReturnType<typeof validatePassword> | null>(null);
  
  // OTP Resend Timer (2 minutes = 120 seconds)
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer effect for OTP resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendCooldown === 0 && otpSent) {
      setCanResend(true);
    }
  }, [resendCooldown, otpSent]);

  // Countdown timer effect for Login OTP resend
  useEffect(() => {
    if (loginResendCooldown > 0) {
      const timer = setTimeout(() => {
        setLoginResendCooldown(loginResendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (loginResendCooldown === 0 && loginOtpSent) {
      setLoginCanResend(true);
    }
  }, [loginResendCooldown, loginOtpSent]);

  // Countdown timer effect for Forgot Password OTP resend
  useEffect(() => {
    if (forgotResendCooldown > 0) {
      const timer = setTimeout(() => {
        setForgotResendCooldown(forgotResendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (forgotResendCooldown === 0 && forgotPasswordStep === 2) {
      setForgotCanResend(true);
    }
  }, [forgotResendCooldown, forgotPasswordStep]);

  // Remember Me: Load saved credentials on component mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    const savedPassword = localStorage.getItem('rememberedPassword');
    
    if (savedUsername && savedPassword) {
      setUsername(savedUsername);
      setPassword(savedPassword);
      setRememberMe(true);
    }

    // Test backend connectivity
    const testBackend = async () => {
      try {
        console.log('🔍 Testing backend connectivity...');
        console.log('📍 Project ID:', projectId);
        console.log('🔑 Anon Key:', publicAnonKey?.substring(0, 20) + '...');
        
        // Test health endpoint
        const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/health`;
        console.log('🌐 Testing:', healthUrl);
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        });
        
        const data = await response.json();
        console.log('✅ Backend health check:', response.status, data);
      } catch (error) {
        console.error('❌ Backend health check failed:', error);
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    };
    testBackend();
  }, []);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors([]);

    // Validate username and password
    if (!username.trim()) {
      setErrors([{ field: "username", message: "Username is required" }]);
      toast.error("Please enter your username");
      return;
    }

    if (!password) {
      setErrors([{ field: "password", message: "Password is required" }]);
      toast.error("Please enter your password");
      return;
    }

    setIsLoading(true);

    try {
      // Call API to login with username (verify credentials first)
      const response = await API.auth.loginWithUsername(username, password);

      // Check if response is valid
      if (!response || !response.user || !response.token) {
        throw new Error("Invalid response from server");
      }

      // Store login data temporarily
      setPendingLoginData(response);

      // CRITICAL FIX: Store user's actual email for OTP sending
      // When login is username-based, the email state variable is empty
      // We must set it to the user's actual email from the response
      if (response.user.email) {
        setEmail(response.user.email);
      }

      // Check if user is a barber - skip OTP for barbers
      if (response.user.role === 'barber') {
        // Barbers login directly without OTP
        // Store auth data in localStorage
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        localStorage.setItem('loginTime', Date.now().toString());

        // Save to Remember Me if enabled (save username, not email)
        if (rememberMe) {
          localStorage.setItem('rememberedUsername', username);
          localStorage.setItem('rememberedPassword', password);
        }

        // Log barber login to audit logs
        await logUserLogin(
          response.user.id,
          'barber',
          response.user.name,
          response.user.email,
          'password'
        );

        // Show success message and trigger login immediately
        toast.success(`Welcome back, ${response.user.name}!`);
        onLogin(response.user);
        return;
      }

      // --- TRUSTED DEVICE CHECK (customers only) ---
      // Customers who previously completed 2FA on this device skip it next time.
      // Admins ALWAYS go through 2FA — no device trust for admin accounts.
      if (response.user.role === 'customer') {
        const trustedKey = `trusted_device_${response.user.email.toLowerCase()}`;
        const trustedTs  = localStorage.getItem(`${trustedKey}_ts`);
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

        // Also check server-side revocation timestamp (set when "Sign Out All Devices" is used).
        // response.user.deviceRevocationTs is set by the backend when the customer revokes all devices.
        const revocationTs = response.user.deviceRevocationTs
          ? new Date(response.user.deviceRevocationTs).getTime()
          : 0;
        const trustTimestamp = trustedTs ? parseInt(trustedTs, 10) : 0;

        const isValid = localStorage.getItem(trustedKey) === 'true'
          && !!trustedTs
          && (Date.now() - trustTimestamp) < THIRTY_DAYS
          && trustTimestamp > revocationTs; // Must be trusted AFTER the last revocation

        if (isValid) {
          // Trusted device — skip 2FA and log in immediately
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('loginTime', Date.now().toString());
          if (rememberMe) {
            localStorage.setItem('rememberedUsername', username);
            localStorage.setItem('rememberedPassword', password);
          } else {
            localStorage.removeItem('rememberedUsername');
            localStorage.removeItem('rememberedPassword');
          }
          // Log trusted device login to audit logs
          await logUserLogin(
            response.user.id,
            response.user.role as 'customer' | 'admin',
            response.user.name,
            response.user.email,
            'trusted_device'
          );

          toast.success(`Welcome back, ${response.user.name}!`, {
            description: 'Trusted device recognised — 2FA skipped.'
          });
          onLogin(response.user);
          return;
        }

        // Expired, revoked, or missing — clean up stale trust keys
        localStorage.removeItem(trustedKey);
        localStorage.removeItem(`${trustedKey}_ts`);

        // Fire-and-forget: notify the customer about a new-device login (non-blocking)
        // DISABLED: Notification removed per user request
        /*
        logNewDeviceLogin(
          response.user.id,
          response.user.name,
          response.user.email.toLowerCase(),
          {
            userAgent: navigator.userAgent.slice(0, 150),
            time: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
          }
        ).catch(() => {}); // swallow silently — never block the login flow
        */
      }

      // For admin (always) or customers on an untrusted / revoked device — require 2FA
      // Send OTP
      const otpResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: response.user.email.toLowerCase(), // Use email from response, not state
            purpose: 'login'
          })
        }
      );

      const otpData = await otpResponse.json();

      if (!otpResponse.ok || !otpData.success) {
        toast.error(otpData.error || "Failed to send verification code");
        setIsLoading(false);
        return;
      }

      // Store OTP token for verification
      if (otpData.token) {
        sessionStorage.setItem('otp_token', otpData.token);
        console.log('✅ OTP token stored in sessionStorage');
      } else {
        console.error('❌ No token received from server!', otpData);
      }

      setLoginOtpSent(true);
      toast.success(`Verification code sent to ${response.user.email}!`, {
        description: "Check your email inbox and spam folder"
      });

      // Start 2-minute cooldown timer (120 seconds)
      setLoginResendCooldown(120);
      setLoginCanResend(false);

      // Move to OTP verification step
      setLoginStep(2);
    } catch (error: any) {
      console.error("Login error:", error);

      // Handle different error types
      let errorMessage = "Invalid username or password";
      let errorDuration = 5000;

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Parse error response for structured error info
      if (error?.code) {
        if (error.code === "account_locked") {
          errorMessage = error.message || "Your account is temporarily locked due to multiple failed login attempts.";
          errorDuration = 10000; // Show longer for important security message
          
          // Show remaining time if available
          if (error.locked_until) {
            const lockedUntil = new Date(error.locked_until);
            const now = new Date();
            const minutesRemaining = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
            
            if (minutesRemaining > 0) {
              errorMessage = `🔒 Account locked for ${minutesRemaining} minute(s). Too many failed attempts.`;
            }
          }
        } else if (error.code === "invalid_credentials") {
          // Show remaining attempts if provided
          if (error.remaining_attempts !== undefined) {
            const attempts = error.remaining_attempts;
            if (attempts === 0) {
              errorMessage = "Invalid username or password. This is your last attempt before account lockout.";
            } else if (attempts === 1) {
              errorMessage = `Invalid username or password. You have 1 attempt remaining.`;
            } else {
              errorMessage = `Invalid username or password. You have ${attempts} attempts remaining.`;
            }
            errorDuration = 7000; // Show longer to ensure user sees warning
          } else {
            errorMessage = "Invalid username or password. Please check your credentials and try again.";
          }
        } else if (error.code === "user_not_found") {
          errorMessage = "No account found with this username. Please register first.";
        } else if (errorMessage.includes("inactive")) {
          errorMessage = "Your account is inactive. Please contact the administrator.";
        }
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("fetch")
      ) {
        errorMessage = "Network error. Please check your connection and try again.";
      }

      // Log failed login attempt
      logFailedLogin(email || username, errorMessage).catch(err => 
        console.error('Failed to log failed login:', err)
      );

      toast.error(errorMessage, {
        duration: errorDuration,
      });

      // Clear password field on error
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  // Login OTP Verification
  const handleLoginOtpVerify = async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      // Get stored OTP token
      const otpToken = sessionStorage.getItem('otp_token');
      if (!otpToken) {
        toast.error("Session expired. Please request a new code.");
        setLoginStep(1);
        setIsLoading(false);
        return;
      }

      // Verify OTP via backend API
      const verifyResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            otp: loginOtp,
            token: otpToken
          })
        }
      );

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.success) {
        setErrors([
          { field: "loginOtp", message: verifyData.error || "Invalid verification code" },
        ]);
        toast.error(verifyData.error || "Invalid verification code");
        setIsLoading(false);
        return;
      }

      // OTP verified - complete login IMMEDIATELY
      if (pendingLoginData) {
        // Store auth data in localStorage (synchronous - instant)
        localStorage.setItem("currentUser", JSON.stringify(pendingLoginData.user));
        localStorage.setItem("authToken", pendingLoginData.token);
        localStorage.setItem("loginTime", Date.now().toString());

        // Mark device as trusted for customers (admins are NEVER trusted)
        if (pendingLoginData.user.role === 'customer') {
          const trustedKey = `trusted_device_${pendingLoginData.user.email.toLowerCase()}`;
          localStorage.setItem(trustedKey, 'true');
          localStorage.setItem(`${trustedKey}_ts`, Date.now().toString());
          // toast.info('This device is now trusted — you won\'t need 2FA next time.', {
          //   duration: 4000,
          // }); // Removed - redundant notification
        }

        // Handle Remember Me (synchronous)
        if (rememberMe) {
          localStorage.setItem('rememberedUsername', username);
          localStorage.setItem('rememberedPassword', password);
        } else {
          localStorage.removeItem('rememberedUsername');
          localStorage.removeItem('rememberedPassword');
        }

        // Clear OTP token (synchronous)
        sessionStorage.removeItem('otp_token');

        // Log OTP login to audit logs (non-blocking)
        logUserLogin(
          pendingLoginData.user.id,
          pendingLoginData.user.role as 'customer' | 'admin',
          pendingLoginData.user.name,
          pendingLoginData.user.email,
          'otp'
        ).catch(err => console.error('Failed to log login:', err));

        // Show success message and trigger login IMMEDIATELY
        // toast.success(`Welcome back, ${pendingLoginData.user.name}!`); // Removed per user request
        
        // Call onLogin immediately - don't wait for anything
        onLogin(pendingLoginData.user);
        
        // Note: setIsLoading(false) is in finally block, but UI already changed
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error("Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Login OTP
  const handleResendLoginOTP = async () => {
    setIsLoading(true);
    
    try {
      // Get email from pendingLoginData (set during login)
      const userEmail = pendingLoginData?.user?.email || email;
      
      if (!userEmail) {
        toast.error("Email not found. Please try logging in again.");
        setIsLoading(false);
        return;
      }
      
      // Resend OTP via backend API
      const otpResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: userEmail.toLowerCase(),
            purpose: 'login'
          })
        }
      );

      const otpData = await otpResponse.json();

      if (!otpResponse.ok || !otpData.success) {
        toast.error(otpData.error || "Failed to resend code");
        return;
      }

      // Update stored OTP token
      if (otpData.token) {
        sessionStorage.setItem('otp_token', otpData.token);
      }

      setLoginOtp(""); // Clear the current OTP input
      toast.success("New verification code sent!", {
        description: "Check your email for the new code"
      });
      
      // Restart 2-minute cooldown timer (120 seconds)
      setLoginResendCooldown(120);
      setLoginCanResend(false);
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== FORGOT PASSWORD HANDLERS ====================
  
  // Step 1: Send OTP to email or username
  const handleForgotPasswordSendOTP = async () => {
    setIsLoading(true);
    setErrors([]);

    // Validate input (can be email or username)
    if (!forgotEmail || forgotEmail.trim().length === 0) {
      setErrors([{ field: "forgotEmail", message: "Please enter your username or email address" }]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('📧 Sending forgot password request for:', forgotEmail);
      console.log('🌐 Full URL:', `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/forgot-password`);
      
      // Detect if input is email or username
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail);
      const requestBody = isEmail 
        ? { email: forgotEmail.toLowerCase() }
        : { username: forgotEmail.toLowerCase() };
      
      console.log('📝 Request body:', requestBody);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(requestBody)
        }
      );

      console.log('📨 Response status:', response.status);
      console.log('📨 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        console.log('📨 Response data:', data);
      } else {
        const text = await response.text();
        console.log('📨 Response text:', text);
        throw new Error(`Backend returned non-JSON response: ${text.substring(0, 200)}`);
      }

      if (!response.ok || !data.success) {
        console.error('❌ Failed to send reset code:', data.error);
        toast.error(data.error || "Failed to send reset code");
        setIsLoading(false);
        return;
      }

      // Store OTP token
      if (data.token) {
        sessionStorage.setItem('forgot_password_token', data.token);
        console.log('✅ Token stored in sessionStorage');
      }

      // Store the display email from backend response
      if (data.displayEmail) {
        setForgotDisplayEmail(data.displayEmail);
        console.log('✅ Display email set:', data.displayEmail);
      } else {
        // Fallback to input if backend doesn't return displayEmail
        setForgotDisplayEmail(forgotEmail);
      }

      // Show warning if email failed but OTP was generated
      if (data.emailWarning) {
        toast.warning("Reset code generated but email failed. Please check server logs.", {
          description: "You may need to configure email service"
        });
      } else {
        toast.success("Reset code sent to your email!", {
          description: "Check your inbox and spam folder"
        });
      }

      setForgotPasswordStep(2);
      setForgotResendCooldown(120);
      setForgotCanResend(false);
    } catch (error) {
      console.error("❌ Forgot password error:", error);
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleForgotPasswordVerifyOTP = async () => {
    setIsLoading(true);
    setErrors([]);

    if (!forgotOtp || forgotOtp.length !== 6) {
      setErrors([{ field: "forgotOtp", message: "Please enter the 6-digit code" }]);
      setIsLoading(false);
      return;
    }

    try {
      const token = sessionStorage.getItem('forgot_password_token');
      if (!token) {
        toast.error("Session expired. Please request a new code.");
        setForgotPasswordStep(1);
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/verify-reset-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: (forgotDisplayEmail || forgotEmail).toLowerCase(),
            otp: forgotOtp,
            token
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrors([{ field: "forgotOtp", message: data.error || "Invalid code" }]);
        toast.error(data.error || "Invalid verification code");
        setIsLoading(false);
        return;
      }

      toast.success("Code verified! Set your new password.");
      setForgotPasswordStep(3);
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error("Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async () => {
    setIsLoading(true);
    setErrors([]);

    // Validate password strength (use email as name since we don't have the user's name)
    const passwordValidation = validatePassword(newPassword, forgotEmail.split('@')[0]);
    if (!passwordValidation.isValid) {
      setErrors([
        {
          field: "newPassword",
          message: passwordValidation.issues[0] || "Password does not meet security requirements",
        },
      ]);
      toast.error(passwordValidation.issues[0] || "Please create a stronger password");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrors([{ field: "confirmNewPassword", message: "Passwords do not match" }]);
      setIsLoading(false);
      return;
    }

    try {
      const token = sessionStorage.getItem('forgot_password_token');
      if (!token) {
        toast.error("Session expired. Please start over.");
        setForgotPasswordStep(1);
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: forgotEmail.toLowerCase(),
            newPassword,
            token
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || "Failed to reset password");
        setIsLoading(false);
        return;
      }

      // Clear session and close dialog
      sessionStorage.removeItem('forgot_password_token');
      toast.success("Password reset successful! Please login with your new password.");
      
      // Reset form and close dialog
      setShowForgotPassword(false);
      setForgotPasswordStep(1);
      setForgotEmail("");
      setForgotOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend forgot password OTP
  const handleResendForgotPasswordOTP = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email: forgotEmail.toLowerCase() })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || "Failed to resend code");
        return;
      }

      if (data.token) {
        sessionStorage.setItem('forgot_password_token', data.token);
      }

      setForgotOtp("");
      toast.success("New code sent!", {
        description: "Check your email for the new code"
      });

      setForgotResendCooldown(120);
      setForgotCanResend(false);
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if email already exists in database
  const checkEmailExists = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) {
      return;
    }

    setIsCheckingEmail(true);
    
    try {
      const response = await API.auth.checkEmailExists(emailToCheck.toLowerCase());
      
      if (response.exists) {
        setEmailExists(true);
        setErrors([
          {
            field: "email",
            message: "This email is already registered. Please login instead.",
          },
        ]);
      } else {
        setEmailExists(false);
        // Clear email error if it was previously set
        setErrors(errors.filter((e) => e.field !== "email"));
      }
    } catch (error) {
      console.error("Error checking email:", error);
      // Don't block registration if check fails
      setEmailExists(false);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Check if username already exists in database
  const checkUsernameExists = async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      return;
    }

    setIsCheckingUsername(true);
    
    try {
      const response = await API.auth.checkUsernameExists(usernameToCheck.toLowerCase());
      
      if (response.exists) {
        setUsernameExists(true);
        setErrors([
          {
            field: "username",
            message: "This username is already taken. Please choose another.",
          },
        ]);
      } else {
        setUsernameExists(false);
        // Clear username error if it was previously set
        setErrors(errors.filter((e) => e.field !== "username"));
      }
    } catch (error) {
      console.error("Error checking username:", error);
      // Don't block registration if check fails
      setUsernameExists(false);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Step 1: Basic Information Validation
  const handleStep1Next = async () => {
    // Clear previous errors
    setErrors([]);

    // Validate name (must have at least first and last name)
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setErrors([
        {
          field: "name",
          message:
            "Please enter your full name (first and last name)",
        },
      ]);
      toast.error("Please enter both first and last name");
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password, name);
    if (!passwordValidation.isValid) {
      setErrors([
        {
          field: "password",
          message: passwordValidation.issues[0] || "Password does not meet security requirements",
        },
      ]);
      toast.error(passwordValidation.issues[0] || "Please create a stronger password");
      return;
    }

    // Validate form
    const validation = validateRegistrationForm(
      name,
      email,
      phone,
      password,
      confirmPassword,
    );
    setErrors(validation.errors);

    if (!validation.isValid) {
      toast.error("Please fix the errors in the form");
      return;
    }

    // Check if email already exists
    setIsLoading(true);
    setIsCheckingEmail(true);
    
    try {
      const emailCheckResponse = await API.auth.checkEmailExists(email.toLowerCase());
      
      if (emailCheckResponse.exists) {
        setEmailExists(true);
        setErrors([
          {
            field: "email",
            message: "This email is already registered. Please login instead.",
          },
        ]);
        toast.error("This email is already registered. Please login instead.");
        setIsLoading(false);
        setIsCheckingEmail(false);
        return;
      }
      
      setEmailExists(false);
    } catch (error) {
      console.error("Error checking email:", error);
      toast.error("Failed to verify email. Please try again.");
      setIsLoading(false);
      setIsCheckingEmail(false);
      return;
    }
    
    setIsCheckingEmail(false);

    // Check if username is valid and not taken
    if (!username || username.length < 3) {
      setErrors([
        {
          field: "username",
          message: "Username must be at least 3 characters",
        },
      ]);
      toast.error("Username must be at least 3 characters");
      setIsLoading(false);
      return;
    }

    // Check if username already exists
    setIsCheckingUsername(true);
    
    try {
      const usernameCheckResponse = await API.auth.checkUsernameExists(username.toLowerCase());
      
      if (usernameCheckResponse.exists) {
        setUsernameExists(true);
        setErrors([
          {
            field: "username",
            message: "This username is already taken. Please choose another.",
          },
        ]);
        toast.error("This username is already taken. Please choose another.");
        setIsLoading(false);
        setIsCheckingUsername(false);
        return;
      }
      
      setUsernameExists(false);
    } catch (error) {
      console.error("Error checking username:", error);
      toast.error("Failed to verify username. Please try again.");
      setIsLoading(false);
      setIsCheckingUsername(false);
      return;
    }
    
    setIsCheckingUsername(false);

    try {
      // Send OTP via backend API
      const otpResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            purpose: 'signup'
          })
        }
      );

      const otpData = await otpResponse.json();

      if (!otpResponse.ok || !otpData.success) {
        setErrors([
          {
            field: "email",
            message: otpData.error || "Failed to send verification code",
          },
        ]);
        toast.error(otpData.error || "Failed to send verification code");
        setIsLoading(false);
        return;
      }

      // Store OTP token for verification
      if (otpData.token) {
        sessionStorage.setItem('otp_token', otpData.token);
        console.log('✅ OTP token stored in sessionStorage');
      } else {
        console.error('❌ No token received from server!', otpData);
      }

      setOtpSent(true);
      toast.success(`Verification code sent to ${email}!`, {
        description: "Check your email inbox and spam folder"
      });

      // Start 2-minute cooldown timer (120 seconds)
      setResendCooldown(120);
      setCanResend(false);

      // Move to step 2
      setRegistrationStep(2);
    } catch (error) {
      console.error("Email check error:", error);

      let errorMessage = "Failed to verify email";
      if (error instanceof Error) {
        errorMessage = error.message;

        if (
          errorMessage.includes("network") ||
          errorMessage.includes("fetch")
        ) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: OTP Verification
  const handleStep2Next = async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      // Get stored OTP token
      const otpToken = sessionStorage.getItem('otp_token');
      if (!otpToken) {
        console.error('❌ No OTP token found in sessionStorage');
        toast.error("Session expired. Please request a new code.");
        setRegistrationStep(1);
        setIsLoading(false);
        return;
      }

      console.log('🔐 Verifying OTP with token:', { email: email.toLowerCase(), otp, hasToken: !!otpToken });

      // Verify OTP via backend API
      const verifyResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            otp: otp,
            token: otpToken
          })
        }
      );

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.success) {
        setErrors([
          { field: "otp", message: verifyData.error || "Invalid verification code" },
        ]);
        toast.error(verifyData.error || "Invalid verification code");
        setIsLoading(false);
        return;
      }

      setErrors([]);
      toast.success("Email verified successfully!");
      
      // Clear OTP token from session storage after successful verification
      sessionStorage.removeItem('otp_token');
      
      setRegistrationStep(3);
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error("Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Terms & Conditions and Registration
  const handleFinalRegistration = async () => {
    if (!agreedToTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    setIsLoading(true);

    try {
      // Call API to register
      const response = await API.auth.register({
        name,
        email,
        username,
        password,
        phone,
        role: "customer",
      });

      // Store user and token in localStorage
      localStorage.setItem(
        "currentUser",
        JSON.stringify(response.user),
      );
      localStorage.setItem("authToken", response.token);

      // Log user registration to audit logs
      await logUserRegistration(
        response.user.id,
        response.user.role as 'customer' | 'admin',
        response.user.name,
        response.user.email
      );

      // Show role-specific success message
      const isFirstUser = response.user.role === "admin";
      if (isFirstUser) {
        toast.success(
          "🎉 Registration successful! You are now the ADMIN!",
          { duration: 5000 },
        );
      } else {
        toast.success("✅ Registration successful! Welcome!");
      }

      onLogin(response.user);
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Registration failed";

      // Check if it's a duplicate email error
      if (
        errorMessage.includes("already been registered") ||
        errorMessage.includes("already exists")
      ) {
        toast.error(
          "This email is already registered. Please login instead.",
          { duration: 5000 },
        );
        // Reset to step 1 to allow user to try different email or switch to login
        setRegistrationStep(1);
        setErrors([
          {
            field: "email",
            message:
              "This email is already registered. Please login or use a different email.",
          },
        ]);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    
    try {
      // Resend OTP via backend API
      const otpResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/auth/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            purpose: 'signup'
          })
        }
      );

      const otpData = await otpResponse.json();

      if (!otpResponse.ok || !otpData.success) {
        toast.error(otpData.error || "Failed to resend code");
        return;
      }

      // Update stored OTP token
      if (otpData.token) {
        sessionStorage.setItem('otp_token', otpData.token);
      }

      setOtp(""); // Clear the current OTP input
      toast.success("New verification code sent!", {
        description: "Check your email for the new code"
      });
      
      // Restart 2-minute cooldown timer (120 seconds)
      setResendCooldown(120);
      setCanResend(false);
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        )}
        
        <div className="text-center mb-4 sm:mb-8">
          <div className="inline-flex items-center justify-center mb-2 sm:mb-4">
            <img
              src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
              alt="Supremo Barber Logo"
              className="h-14 w-14 sm:h-20 sm:w-20"
            />
          </div>
          <h1 className="text-slate-900">Supremo Barber</h1>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>
                  {loginStep === 1 && "Sign in to your account to continue"}
                  {loginStep === 2 && "Verify your identity"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loginStep === 1 ? (
                  <form
                    onSubmit={handleLogin}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="your_username"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setErrors(
                            errors.filter(
                              (e) => e.field !== "username",
                            ),
                          );
                        }}
                        className={
                          getFieldError(errors, "username")
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {getFieldError(errors, "username") && (
                        <p className="text-sm text-red-500">
                          {getFieldError(errors, "username")}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs text-[#DB9D47] hover:text-[#C08A3C]"
                          onClick={() => {
                            console.log('🔐 Opening Forgot Password dialog');
                            setShowForgotPassword(true);
                            setForgotPasswordStep(1);
                            setForgotEmail(email);
                          }}
                        >
                          Forgot Password?
                        </Button>
                      </div>
                      <PasswordInput
                        id="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrors(
                            errors.filter(
                              (e) => e.field !== "password",
                            ),
                          );
                        }}
                        className={
                          getFieldError(errors, "password")
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {getFieldError(errors, "password") && (
                        <p className="text-sm text-red-500">
                          {getFieldError(errors, "password")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) =>
                          setRememberMe(!!checked)
                        }
                      />
                      <Label
                        htmlFor="remember"
                        className="text-sm cursor-pointer"
                      >
                        Remember me
                      </Label>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4 mr-2" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="text-center mb-4 sm:mb-6">
                      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#DB9D47]/10 mb-2 sm:mb-4">
                        <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-[#DB9D47]" />
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600">
                        We&apos;ve sent a 6-digit verification code to
                      </p>
                      <p className="text-sm sm:text-base font-medium text-gray-900 break-all px-2">
                        {email}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Code expires in <span className="font-semibold text-[#DB9D47]">10 minutes</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-otp" className="text-sm">
                        Verification Code
                      </Label>
                      <Input
                        id="login-otp"
                        type="text"
                        placeholder="000000"
                        value={loginOtp}
                        onChange={(e) => {
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setLoginOtp(value);
                          setErrors(
                            errors.filter(
                              (e) => e.field !== "loginOtp",
                            ),
                          );
                        }}
                        maxLength={6}
                        className={`text-center text-lg sm:text-xl tracking-widest ${getFieldError(errors, "loginOtp") ? "border-red-500" : ""}`}
                      />
                      {getFieldError(errors, "loginOtp") && (
                        <p className="text-sm text-red-500 text-center">
                          {getFieldError(errors, "loginOtp")}
                        </p>
                      )}
                    </div>

                    <div className="text-center">
                      {loginResendCooldown > 0 ? (
                        <p className="text-xs sm:text-sm text-gray-500 p-2">
                          Resend code in <span className="font-semibold text-[#DB9D47]">{formatTime(loginResendCooldown)}</span>
                        </p>
                      ) : (
                        <Button
                          variant="link"
                          type="button"
                          onClick={handleResendLoginOTP}
                          disabled={!loginCanResend || isLoading}
                          className="text-xs sm:text-sm h-auto p-2"
                        >
                          {isLoading ? "Sending..." : "Didn't receive the code? Resend"}
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setLoginStep(1);
                          setLoginOtp("");
                          setLoginOtpSent(false);
                          setPendingLoginData(null);
                        }}
                      >
                        <ChevronLeft className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">
                          Back
                        </span>
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={handleLoginOtpVerify}
                        disabled={loginOtp.length !== 6 || isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <span className="hidden sm:inline">
                              Verifying...
                            </span>
                            <span className="sm:hidden">
                              Verifying...
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline">
                              Verify & Login
                            </span>
                            <span className="sm:hidden">
                              Verify
                            </span>
                            <Shield className="w-4 h-4 sm:ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-2xl">
                  Create Account
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {registrationStep === 1 &&
                    "Step 1 of 3: Basic Information"}
                  {registrationStep === 2 &&
                    "Step 2 of 3: Email Verification"}
                  {registrationStep === 3 &&
                    "Step 3 of 3: Terms & Conditions"}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {/* Step Progress Indicator */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base ${registrationStep >= 1 ? "bg-[#DB9D47] text-white" : "bg-gray-200 text-gray-500"}`}
                  >
                    {registrationStep > 1 ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      "1"
                    )}
                  </div>
                  <div
                    className={`flex-1 h-1 mx-1 sm:mx-2 ${registrationStep >= 2 ? "bg-[#DB9D47]" : "bg-gray-200"}`}
                  />
                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base ${registrationStep >= 2 ? "bg-[#DB9D47] text-white" : "bg-gray-200 text-gray-500"}`}
                  >
                    {registrationStep > 2 ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      "2"
                    )}
                  </div>
                  <div
                    className={`flex-1 h-1 mx-1 sm:mx-2 ${registrationStep >= 3 ? "bg-[#DB9D47]" : "bg-gray-200"}`}
                  />
                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base ${registrationStep >= 3 ? "bg-[#DB9D47] text-white" : "bg-gray-200 text-gray-500"}`}
                  >
                    3
                  </div>
                </div>

                {/* Step 1: Basic Information */}
                {registrationStep === 1 && (
                  <TooltipProvider>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="reg-name">
                            Full Name
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                Please enter both first and last
                                name
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="reg-name"
                          type="text"
                          placeholder="John Doe"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            setErrors(
                              errors.filter(
                                (e) => e.field !== "name",
                              ),
                            );
                          }}
                          className={
                            getFieldError(errors, "name")
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {getFieldError(errors, "name") && (
                          <p className="text-sm text-red-500">
                            {getFieldError(errors, "name")}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="reg-email">
                            Email
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                Enter a valid email address
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="relative">
                          <Input
                            id="reg-email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setEmailExists(false);
                              setErrors(
                                errors.filter(
                                  (e) => e.field !== "email",
                                ),
                              );
                            }}
                            onBlur={(e) => {
                              if (e.target.value.trim()) {
                                checkEmailExists(e.target.value.trim());
                              }
                            }}
                            className={
                              getFieldError(errors, "email")
                                ? "border-red-500"
                                : ""
                            }
                            disabled={isCheckingEmail}
                          />
                          {isCheckingEmail && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            </div>
                          )}
                        </div>
                        {isCheckingEmail && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Checking if email is available...
                          </p>
                        )}
                        {getFieldError(errors, "email") && (
                          <p className="text-sm text-red-500">
                            {getFieldError(errors, "email")}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="reg-username">
                            Username
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                3-20 characters, letters, numbers, underscore, and hyphen only
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="relative">
                          <Input
                            id="reg-username"
                            type="text"
                            placeholder="your_username"
                            value={username}
                            onChange={(e) => {
                              const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                              setUsername(value);
                              setUsernameExists(false);
                              setErrors(
                                errors.filter(
                                  (e) => e.field !== "username",
                                ),
                              );
                            }}
                            onBlur={(e) => {
                              if (e.target.value.trim() && e.target.value.length >= 3) {
                                checkUsernameExists(e.target.value.trim());
                              }
                            }}
                            maxLength={20}
                            className={
                              getFieldError(errors, "username")
                                ? "border-red-500"
                                : ""
                            }
                            disabled={isCheckingUsername}
                          />
                          {isCheckingUsername && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            </div>
                          )}
                        </div>
                        {isCheckingUsername && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Checking if username is available...
                          </p>
                        )}
                        {getFieldError(errors, "username") && (
                          <p className="text-sm text-red-500">
                            {getFieldError(errors, "username")}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="reg-phone">
                            Phone Number
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                11 digits starting with 09
                                (Philippine format)
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="reg-phone"
                          type="tel"
                          placeholder="09171234567"
                          value={phone}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 11);
                            setPhone(value);
                            setErrors(
                              errors.filter(
                                (e) => e.field !== "phone",
                              ),
                            );
                          }}
                          maxLength={11}
                          className={
                            getFieldError(errors, "phone")
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {getFieldError(errors, "phone") && (
                          <p className="text-sm text-red-500">
                            {getFieldError(errors, "phone")}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="reg-password">
                            Password
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">
                                Must be at least 8 characters
                                with uppercase, lowercase,
                                digit, and special character
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <PasswordInput
                          id="reg-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => {
                            const newPassword = e.target.value;
                            setPassword(newPassword);
                            
                            // Real-time password validation
                            if (newPassword) {
                              const validation = validatePassword(newPassword, name);
                              setPasswordStrength(validation);
                            } else {
                              setPasswordStrength(null);
                            }
                            
                            setErrors(
                              errors.filter(
                                (e) => e.field !== "password",
                              ),
                            );
                          }}
                          className={
                            getFieldError(errors, "password")
                              ? "border-red-500"
                              : ""
                          }
                        />
                        
                        {/* Password Strength Indicator */}
                        {password && passwordStrength && (
                          <div className="space-y-2">
                            {/* Strength Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-gray-600">
                                  Password Strength
                                </span>
                                <span className={`text-xs font-semibold ${
                                  passwordStrength.strength === 'strong' ? 'text-green-600' :
                                  passwordStrength.strength === 'medium' ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {passwordStrength.strength === 'strong' ? '✓ Strong' :
                                   passwordStrength.strength === 'medium' ? '○ Medium' :
                                   '✗ Weak'}
                                </span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    passwordStrength.strength === 'strong' ? 'bg-green-500' :
                                    passwordStrength.strength === 'medium' ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${passwordStrength.score}%` }}
                                />
                              </div>
                            </div>
                            
                            {/* Issues Only - Critical feedback */}
                            {passwordStrength.issues.length > 0 && (
                              <div className="space-y-1">
                                {passwordStrength.issues.map((issue, idx) => (
                                  <p key={idx} className="text-xs text-red-700 flex items-start gap-1">
                                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    <span>{issue}</span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {getFieldError(errors, "password") && (
                          <p className="text-sm text-red-500">
                            {getFieldError(errors, "password")}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="reg-confirm-password">
                            Confirm Password
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                Re-enter your password to
                                confirm
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <PasswordInput
                          id="reg-confirm-password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setErrors(
                              errors.filter(
                                (e) =>
                                  e.field !== "confirmPassword",
                              ),
                            );
                          }}
                          className={
                            getFieldError(
                              errors,
                              "confirmPassword",
                            )
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {getFieldError(
                          errors,
                          "confirmPassword",
                        ) && (
                          <p className="text-sm text-red-500">
                            {getFieldError(
                              errors,
                              "confirmPassword",
                            )}
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        className="w-full"
                        disabled={isLoading || isCheckingEmail || emailExists}
                        onClick={handleStep1Next}
                      >
                        {isLoading || isCheckingEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {isCheckingEmail ? "Checking email..." : "Verifying..."}
                          </>
                        ) : (
                          <>
                            Next
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </TooltipProvider>
                )}

                {/* Step 2: OTP Verification */}
                {registrationStep === 2 && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="text-center mb-4 sm:mb-6">
                      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#DB9D47]/10 mb-2 sm:mb-4">
                        <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-[#DB9D47]" />
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600">
                        We&apos;ve sent a 6-digit verification
                        code to
                      </p>
                      <p className="text-sm sm:text-base font-medium text-gray-900 break-all px-2">
                        {email}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Code expires in <span className="font-semibold text-[#DB9D47]">10 minutes</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-sm">
                        Verification Code
                      </Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => {
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setOtp(value);
                          setErrors(
                            errors.filter(
                              (e) => e.field !== "otp",
                            ),
                          );
                        }}
                        maxLength={6}
                        className={`text-center text-lg sm:text-xl tracking-widest ${getFieldError(errors, "otp") ? "border-red-500" : ""}`}
                      />
                      {getFieldError(errors, "otp") && (
                        <p className="text-sm text-red-500 text-center">
                          {getFieldError(errors, "otp")}
                        </p>
                      )}
                    </div>

                    <div className="text-center">
                      {resendCooldown > 0 ? (
                        <p className="text-xs sm:text-sm text-gray-500 p-2">
                          Resend code in <span className="font-semibold text-[#DB9D47]">{formatTime(resendCooldown)}</span>
                        </p>
                      ) : (
                        <Button
                          variant="link"
                          type="button"
                          onClick={handleResendOTP}
                          disabled={!canResend || isLoading}
                          className="text-xs sm:text-sm h-auto p-2"
                        >
                          {isLoading ? "Sending..." : "Didn't receive the code? Resend"}
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setRegistrationStep(1)}
                      >
                        <ChevronLeft className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">
                          Back
                        </span>
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={handleStep2Next}
                        disabled={otp.length !== 6 || isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <span className="hidden sm:inline">
                              Verifying...
                            </span>
                            <span className="sm:hidden">
                              Verifying...
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline">
                              Verify & Continue
                            </span>
                            <span className="sm:hidden">
                              Verify
                            </span>
                            <ChevronRight className="w-4 h-4 sm:ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Terms & Conditions and Privacy Policy */}
                {registrationStep === 3 && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="text-center mb-4 sm:mb-6">
                      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#DB9D47]/10 mb-2 sm:mb-4">
                        <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-[#DB9D47]" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        Terms & Conditions and Privacy Policy
                      </h3>
                      <p className="text-xs text-gray-600 mt-2">
                        Please review both documents before creating your account
                      </p>
                    </div>

                    <Tabs defaultValue="terms" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-3">
                        <TabsTrigger value="terms" className="text-xs sm:text-sm">
                          Terms & Conditions
                        </TabsTrigger>
                        <TabsTrigger value="privacy" className="text-xs sm:text-sm">
                          Privacy Policy
                        </TabsTrigger>
                      </TabsList>

                      {/* Terms & Conditions Tab */}
                      <TabsContent value="terms">
                        <div className="border rounded-lg p-3 sm:p-4 max-h-48 sm:max-h-64 overflow-y-auto bg-gray-50 space-y-2 sm:space-y-3">
                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              1. Account Registration & Use
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              You must provide a valid email address, full name (as it appears on official documents), working phone number, and secure password (minimum 8 characters). You are responsible for maintaining account security and all activities under your account. Users must be at least 13 years old (under 18 requires parental consent).
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              2. Booking Appointments
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              Select service, barber, date & time from real-time availability. Booking is confirmed only after paying 50% down payment via GCash and uploading clear payment proof screenshot. Our team verifies payments within 1-24 hours. You'll receive email/SMS confirmation once verified, plus a reminder 24 hours before your appointment.
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              3. Payment Terms & Conditions
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              50% down payment (GCash only) required online to secure booking. Remaining 50% paid at shop after service completion (cash or GCash accepted). All payments are final. Down payments are non-refundable for late cancellations (less than 24 hours notice) or no-shows.
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              4. Cancellation & Rescheduling
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              Free cancellation with full refund if done 24+ hours before appointment via your dashboard or by contacting us. One free reschedule allowed with 24+ hours notice. Late cancellations (less than 24 hours) forfeit down payment. No-shows forfeit down payment and may result in booking restrictions.
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              5. User Conduct
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              Provide accurate information and treat staff with respect. Supremo Barber reserves the right to refuse service or terminate accounts for violations including: harassment, fraudulent payments, multiple no-shows, or abusive behavior. Accounts may be suspended or terminated at our discretion.
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              6. Limitation of Liability
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              Supremo Barber is not liable for service delays, technical issues affecting booking system, or outcomes of services. We strive for quality but cannot guarantee specific results. Our maximum liability is limited to the service fee paid for the specific appointment.
                            </p>
                          </div>

                          <div className="text-xs text-gray-500 pt-2 border-t">
                            <p><strong>Effective Date:</strong> March 1, 2026</p>
                            <p className="mt-1"><strong>Last Updated:</strong> March 1, 2026</p>
                            <p className="mt-1">For full terms, contact info@supremobarber.com</p>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Privacy Policy Tab */}
                      <TabsContent value="privacy">
                        <div className="border rounded-lg p-3 sm:p-4 max-h-48 sm:max-h-64 overflow-y-auto bg-gray-50 space-y-2 sm:space-y-3">
                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              1. Information We Collect
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              We collect personal information you provide during account registration (name, email, phone, password), booking information (service selections, appointment dates/times, special requests), and payment information (GCash transaction details). We also automatically collect technical data like IP address, browser type, and device information to improve service quality and security.
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              2. How We Use Your Information
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              Your data is used to provide booking services, send appointment confirmations and reminders, process payments, verify your identity, improve our platform, communicate important updates, and ensure security. We use Supabase for secure data storage with encryption and never sell your personal information to third parties.
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              3. Data Sharing & Third Parties
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              We share your information only with essential service providers: Supabase (database hosting), Resend (email notifications), and GCash (payment processing). Your barber receives only information necessary for your appointment. We never sell your data. Information may be disclosed if required by law or to protect rights and safety.
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              4. Data Security
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              We protect your data with industry-standard encryption (passwords are hashed and never stored in plain text), secure HTTPS connections, regular security audits, access controls limiting who can view your data, and automatic session timeouts. While we implement strong security measures, no system is 100% secure.
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              5. Your Privacy Rights
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              You have the right to access your personal data, correct inaccurate information, request data deletion (after completing all appointments), export your data (data portability), opt-out of marketing communications, and withdraw consent. Contact info@supremobarber.com to exercise these rights. We respond within 30 days.
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              6. Data Retention
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              We retain your account information as long as your account is active. Booking history is kept for 3 years for business records and dispute resolution. Payment records are retained for 5 years as required by Philippine law. After account deletion, personal data is removed within 30 days except what's legally required to retain.
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-xs sm:text-sm text-[#6E5A48]">
                              7. Cookies & Tracking
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              We use essential cookies for authentication and session management, which are required for the platform to function. We don't use advertising or third-party tracking cookies. You can control cookies through your browser settings, though disabling essential cookies will prevent you from using our booking system.
                            </p>
                          </div>

                          <div className="text-xs text-gray-500 pt-2 border-t">
                            <p><strong>Effective Date:</strong> March 1, 2026</p>
                            <p className="mt-1"><strong>Last Updated:</strong> March 1, 2026</p>
                            <p className="mt-1">For privacy questions, contact info@supremobarber.com</p>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <Checkbox
                        id="terms"
                        checked={agreedToTerms}
                        onCheckedChange={(checked) =>
                          setAgreedToTerms(!!checked)
                        }
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="terms"
                        className="text-xs sm:text-sm cursor-pointer leading-tight"
                      >
                        I have read and agree to the Terms &
                        Conditions and Privacy Policy of Supremo
                        Barber
                      </Label>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setRegistrationStep(2)}
                      >
                        <ChevronLeft className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">
                          Back
                        </span>
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        disabled={!agreedToTerms || isLoading}
                        onClick={handleFinalRegistration}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                            <span className="hidden sm:inline">
                              Creating Account...
                            </span>
                            <span className="sm:hidden">
                              Creating...
                            </span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">
                              Create Account
                            </span>
                            <span className="sm:hidden">
                              Create
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={(open) => {
        setShowForgotPassword(open);
        if (!open) {
          // Reset form when closing
          setForgotPasswordStep(1);
          setForgotEmail("");
          setForgotOtp("");
          setNewPassword("");
          setConfirmNewPassword("");
          setErrors([]);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-[#DB9D47]" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              {forgotPasswordStep === 1 && "Enter your email to receive a reset code"}
              {forgotPasswordStep === 2 && "Enter the verification code sent to your email"}
              {forgotPasswordStep === 3 && "Create a new password for your account"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Step 1: Username or Email Input */}
            {forgotPasswordStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Username or Email Address</Label>
                  <Input
                    id="forgot-email"
                    type="text"
                    placeholder="username or email@example.com"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      setErrors(errors.filter(e => e.field !== "forgotEmail"));
                    }}
                    className={getFieldError(errors, "forgotEmail") ? "border-red-500" : ""}
                  />
                  {getFieldError(errors, "forgotEmail") && (
                    <p className="text-sm text-red-500">
                      {getFieldError(errors, "forgotEmail")}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleForgotPasswordSendOTP}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Reset Code
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {forgotPasswordStep === 2 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#DB9D47]/10 mb-3">
                    <Shield className="w-6 h-6 text-[#DB9D47]" />
                  </div>
                  <p className="text-sm text-gray-600">
                    We've sent a 6-digit code to
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-all px-2">
                    {forgotDisplayEmail || forgotEmail}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Code expires in <span className="font-semibold text-[#DB9D47]">10 minutes</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forgot-otp">Verification Code</Label>
                  <Input
                    id="forgot-otp"
                    type="text"
                    placeholder="000000"
                    value={forgotOtp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setForgotOtp(value);
                      setErrors(errors.filter(e => e.field !== "forgotOtp"));
                    }}
                    maxLength={6}
                    className={`text-center text-xl tracking-widest ${getFieldError(errors, "forgotOtp") ? "border-red-500" : ""}`}
                  />
                  {getFieldError(errors, "forgotOtp") && (
                    <p className="text-sm text-red-500 text-center">
                      {getFieldError(errors, "forgotOtp")}
                    </p>
                  )}
                </div>

                <div className="text-center">
                  {forgotResendCooldown > 0 ? (
                    <p className="text-sm text-gray-500">
                      Resend code in <span className="font-semibold text-[#DB9D47]">{formatTime(forgotResendCooldown)}</span>
                    </p>
                  ) : (
                    <Button
                      variant="link"
                      type="button"
                      onClick={handleResendForgotPasswordOTP}
                      disabled={!forgotCanResend || isLoading}
                      className="text-sm"
                    >
                      Resend Code
                    </Button>
                  )}
                </div>

                <Button
                  onClick={handleForgotPasswordVerifyOTP}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Verify Code
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 3: New Password */}
            {forgotPasswordStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <PasswordInput
                    id="new-password"
                    placeholder="•••••••���"
                    value={newPassword}
                    onChange={(e) => {
                      const newPasswordValue = e.target.value;
                      setNewPassword(newPasswordValue);
                      
                      // Real-time password validation
                      if (newPasswordValue) {
                        const validation = validatePassword(newPasswordValue, forgotEmail.split('@')[0]);
                        setResetPasswordStrength(validation);
                      } else {
                        setResetPasswordStrength(null);
                      }
                      
                      setErrors(errors.filter(e => e.field !== "newPassword"));
                    }}
                    className={getFieldError(errors, "newPassword") ? "border-red-500" : ""}
                  />
                  
                  {/* Password Strength Indicator */}
                  {newPassword && resetPasswordStrength && (
                    <div className="space-y-2">
                      {/* Strength Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-600">
                            Password Strength
                          </span>
                          <span className={`text-xs font-semibold ${
                            resetPasswordStrength.strength === 'strong' ? 'text-green-600' :
                            resetPasswordStrength.strength === 'medium' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {resetPasswordStrength.strength === 'strong' ? '✓ Strong' :
                             resetPasswordStrength.strength === 'medium' ? '○ Medium' :
                             '✗ Weak'}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              resetPasswordStrength.strength === 'strong' ? 'bg-green-500' :
                              resetPasswordStrength.strength === 'medium' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${resetPasswordStrength.score}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Issues Only - Critical feedback */}
                      {resetPasswordStrength.issues.length > 0 && (
                        <div className="space-y-1">
                          {resetPasswordStrength.issues.map((issue, idx) => (
                            <p key={idx} className="text-xs text-red-700 flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{issue}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {getFieldError(errors, "newPassword") && (
                    <p className="text-sm text-red-500">
                      {getFieldError(errors, "newPassword")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <PasswordInput
                    id="confirm-new-password"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      setErrors(errors.filter(e => e.field !== "confirmNewPassword"));
                    }}
                    className={getFieldError(errors, "confirmNewPassword") ? "border-red-500" : ""}
                  />
                  {getFieldError(errors, "confirmNewPassword") && (
                    <p className="text-sm text-red-500">
                      {getFieldError(errors, "confirmNewPassword")}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleResetPassword}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add default export for lazy loading in App.tsx
export default LoginPage;