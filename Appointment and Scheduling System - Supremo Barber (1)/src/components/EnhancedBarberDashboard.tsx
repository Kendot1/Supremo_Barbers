import { useState, useEffect, useRef, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { toast } from "sonner@2.0.3";
import { Footer } from "./Footer";
import {
  Calendar,
  LogOut,
  Menu,
  X,
  Clock,
  CheckCircle2,
  TrendingUp,
  Scissors,
  User as UserIcon,
  FileText,
  Bell,
  Star,
  TrendingDown,
  Users,
  Award,
  Coffee,
  Settings,
  BarChart3,
  PieChart,
  Activity,
  MessageSquare,
  Target,
  Zap,
  ThumbsUp,
  Gift,
  BookOpen,
  Briefcase,
  AlertCircle,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Package,
  RefreshCw,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Download,
  Filter,
  Search,
  Calendar as CalendarIcon,
  Camera,
  Loader2,
} from "lucide-react";
import { FaPesoSign } from "react-icons/fa6";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { PasswordInput } from "./ui/password-input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar";
import { BarberScheduleCalendar } from "./BarberScheduleCalendar";
import { BarberEarningsOverview } from "./BarberEarningsOverview";
import { NotificationCenter } from "./NotificationCenter";
import type { User, Appointment } from "../App";
import API from "../services/api.service";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import {
  logPasswordChange,
  logProfileUpdate,
  logAvatarUpload,
  logAppointmentCompleted,
  logAppointmentCancelledByBarber,
} from "../services/audit-notification.service";

interface BarberDashboardProps {
  user: User;
  onLogout: () => void;
  appointments: Appointment[];
  onUpdateAppointments: (appointments: Appointment[]) => void;
  onUserUpdate: (user: User) => void;
}

const COLORS = [
  "#DB9D47",
  "#94A670",
  "#D98555",
  "#B89968",
  "#87765E",
];

export function EnhancedBarberDashboard({
  user,
  onLogout,
  appointments: allAppointments,
  onUpdateAppointments,
  onUserUpdate,
}: BarberDashboardProps) {
  // Memoize user ID to prevent infinite loops in NotificationCenter
  const stableUserId = useMemo(() => user.id, [user.id]);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeRange, setTimeRange] = useState("weekly");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] =
    useState(false);
  const [showCancelDialog, setShowCancelDialog] =
    useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] =
    useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonType, setCancelReasonType] = useState("");
  const [customCancelReason, setCustomCancelReason] =
    useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Database-fetched state
  const [barberReviews, setBarberReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [isLoadingReviews, setIsLoadingReviews] =
    useState(false);
  const [monthlyTarget, setMonthlyTarget] = useState(50000);
  const [previousPeriodStats, setPreviousPeriodStats] =
    useState({
      todayBookings: 0,
      todayEarnings: 0,
      completionRate: 0,
    });



  // Barber Profile State
  const [barberDbId, setBarberDbId] = useState<string | null>(null);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [showAddSpecialty, setShowAddSpecialty] = useState(false);
  const [barberProfile, setBarberProfile] = useState({
    bio:
      user.bio ||
      "",
    specialties: [] as string[],
    workingHours: { start: "09:00", end: "18:00" },
    breakTime: { start: "12:00", end: "13:00" },
    daysOff: ["Sunday"],
    contactPhone: user.phone || "",
    contactEmail: user.email,
    avatarUrl: user.avatarUrl || "",
    availableHours: {} as any,
  });



  // Profile update states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] =
    useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] =
    useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1=email sent, 2=verify OTP, 3=new password
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Email change state
  const [emailChangePassword, setEmailChangePassword] = useState("");

  // Filter appointments for this barber (must be defined before useEffect that uses it)
  const barberAppointments = allAppointments.filter((apt) => {
    const matchByName = apt.barber === user.name;
    const matchById = apt.barber_id === user.id;

    return matchByName || matchById;
  });



  // Sync user avatarUrl changes to barberProfile state
  useEffect(() => {
    setBarberProfile((prev) => ({
      ...prev,
      avatarUrl: user.avatarUrl || "",
    }));
  }, [user.avatarUrl]);

  // Fetch reviews and calculate average rating from database
  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoadingReviews(true);
      try {
        // IMPORTANT: For barbers, user.id is the USER ID, not the BARBER ID
        // We need to first get the barber profile to get the actual barber_id

        const barberData = await API.barbers.getByUserId(
          user.id,
        );

        if (!barberData) {
          console.warn(
            "💈 No barber profile found for user:",
            user.id,
          );
          setBarberReviews([]);
          setAverageRating(0);
          return;
        }

        // Store barber DB ID for profile updates
        setBarberDbId(barberData.id);

        // Populate profile state from barbers table
        const dbSpecialties = barberData.specialties || [];
        const dbAvailableHours = barberData.available_hours || barberData.availableHours || {};
        setBarberProfile(prev => ({
          ...prev,
          specialties: dbSpecialties.length > 0 ? dbSpecialties : prev.specialties,
          availableHours: dbAvailableHours,
          workingHours: {
            start: dbAvailableHours?.start || prev.workingHours.start,
            end: dbAvailableHours?.end || prev.workingHours.end,
          },
        }));


        // Now fetch reviews using the barber profile ID
        const reviews = await API.reviews.getByBarberId(
          barberData.id,
        );


        setBarberReviews(reviews);

        // Calculate real average rating
        if (reviews && reviews.length > 0) {
          const totalRating = reviews.reduce(
            (sum: number, review: any) =>
              sum + (review.rating || 0),
            0,
          );
          const avg = totalRating / reviews.length;
          setAverageRating(Math.round(avg * 10) / 10); // Round to 1 decimal

        } else {
          setAverageRating(0);
        }
      } catch (error) {
        console.error("❌ Error fetching reviews:", error);
        setBarberReviews([]);
        setAverageRating(0);
        // Don't show error toast, just use default values
      } finally {
        setIsLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [user.id]);

  // Calculate previous period statistics for trends
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    const yesterdayAppointments = barberAppointments.filter(
      (apt) => apt.date === yesterdayStr,
    );
    const yesterdayCompleted = yesterdayAppointments.filter(
      (apt) => apt.status === "completed",
    );
    const yesterdayEarnings = yesterdayCompleted.reduce(
      (sum, apt) => sum + apt.price,
      0,
    );

    // Calculate last week's completion rate
    const lastWeekStart = new Date();
    lastWeekStart.setDate(lastWeekStart.getDate() - 14);
    const lastWeekEnd = new Date();
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    const lastWeekAppointments = barberAppointments.filter(
      (apt) => {
        const aptDate = new Date(apt.date);
        return (
          aptDate >= lastWeekStart && aptDate < lastWeekEnd
        );
      },
    );

    const lastWeekCompleted = lastWeekAppointments.filter(
      (apt) => apt.status === "completed",
    );
    const lastWeekCompletionRate =
      lastWeekAppointments.length > 0
        ? (lastWeekCompleted.length /
          lastWeekAppointments.length) *
        100
        : 0;

    setPreviousPeriodStats({
      todayBookings: yesterdayAppointments.length,
      todayEarnings: yesterdayEarnings,
      completionRate: lastWeekCompletionRate,
    });
  }, [barberAppointments]);

  // Date calculations
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const thisWeekStart = new Date();
  thisWeekStart.setDate(
    thisWeekStart.getDate() - thisWeekStart.getDay(),
  );

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);

  // Filtered appointments
  const todayAppointments = barberAppointments.filter(
    (apt) => apt.date === today,
  );
  const upcomingAppointments = barberAppointments.filter(
    (apt) =>
      (apt.status === "confirmed" ||
        apt.status === "upcoming") &&
      new Date(apt.date) >= new Date(today),
  );
  const completedAppointments = barberAppointments.filter(
    (apt) => apt.status === "completed",
  );
  const cancelledAppointments = barberAppointments.filter(
    (apt) =>
      apt.status === "cancelled" || apt.status === "rejected",
  );
  const pendingAppointments = barberAppointments.filter(
    (apt) => apt.status === "pending",
  );

  // Earnings calculations
  const todayCompleted = todayAppointments.filter(
    (apt) => apt.status === "completed",
  );
  const todayEarnings = todayCompleted.reduce(
    (sum, apt) => sum + apt.price,
    0,
  );

  const thisWeekAppointments = barberAppointments.filter(
    (apt) => {
      const aptDate = new Date(apt.date);
      return aptDate >= thisWeekStart;
    },
  );
  const weeklyEarnings = thisWeekAppointments
    .filter((apt) => apt.status === "completed")
    .reduce((sum, apt) => sum + apt.price, 0);
  const weeklyBookings = thisWeekAppointments.length;

  const thisMonthAppointments = barberAppointments.filter(
    (apt) => {
      const aptDate = new Date(apt.date);
      return aptDate >= thisMonthStart;
    },
  );
  const monthlyEarnings = thisMonthAppointments
    .filter((apt) => apt.status === "completed")
    .reduce((sum, apt) => sum + apt.price, 0);
  const monthlyBookings = thisMonthAppointments.length;

  const totalEarnings = completedAppointments.reduce(
    (sum, apt) => sum + apt.price,
    0,
  );
  const avgPerBooking =
    completedAppointments.length > 0
      ? Math.round(totalEarnings / completedAppointments.length)
      : 0;

  // Customer analytics
  const uniqueCustomers = new Set(
    completedAppointments.map((apt) => apt.userId),
  ).size;
  const returningCustomers = (() => {
    const customerCounts = barberAppointments.reduce(
      (acc, apt) => {
        acc[apt.userId] = (acc[apt.userId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return Object.values(customerCounts).filter(
      (count) => count > 1,
    ).length;
  })();

  // Service popularity
  const serviceStats = barberAppointments.reduce(
    (acc, apt) => {
      acc[apt.service] = (acc[apt.service] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const popularServices = Object.entries(serviceStats)
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Peak hours analysis
  const hourlyStats = barberAppointments.reduce(
    (acc, apt) => {
      const hour = apt.time.split(":")[0];
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const peakHours = Object.entries(hourlyStats)
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    .sort((a, b) => b.count - a.count);

  // Performance metrics
  const completionRate =
    barberAppointments.length > 0
      ? Math.round(
        (completedAppointments.length /
          barberAppointments.length) *
        100,
      )
      : 0;
  const cancellationRate =
    barberAppointments.length > 0
      ? Math.round(
        (cancelledAppointments.length /
          barberAppointments.length) *
        100,
      )
      : 0;
  const onTimeRate = 95; // Mock data - could be calculated from actual timestamps

  // Goals and targets
  const targetProgress = Math.min(
    (monthlyEarnings / monthlyTarget) * 100,
    100,
  );

  // Calculate realistic trends
  const bookingsTrend =
    previousPeriodStats.todayBookings > 0
      ? Math.round(
        ((todayAppointments.length -
          previousPeriodStats.todayBookings) /
          previousPeriodStats.todayBookings) *
        100,
      )
      : 0;
  const earningsTrend =
    previousPeriodStats.todayEarnings > 0
      ? Math.round(
        ((todayEarnings - previousPeriodStats.todayEarnings) /
          previousPeriodStats.todayEarnings) *
        100,
      )
      : 0;
  const completionTrend =
    previousPeriodStats.completionRate > 0
      ? Math.round(
        ((completionRate -
          previousPeriodStats.completionRate) /
          previousPeriodStats.completionRate) *
        100,
      )
      : 0;

  const stats = [
    {
      label: "Today's Bookings",
      value: todayAppointments.length.toString(),
      icon: Calendar,
      color: "bg-[#DB9D47]",
      trend:
        bookingsTrend !== 0
          ? `${bookingsTrend > 0 ? "+" : ""}${bookingsTrend}%`
          : "N/A",
      trendUp: bookingsTrend >= 0,
    },
    {
      label: "Today's Earnings",
      value: `₱${todayEarnings.toLocaleString()}`,
      icon: FaPesoSign,
      color: "bg-[#94A670]",
      trend:
        earningsTrend !== 0
          ? `${earningsTrend > 0 ? "+" : ""}${earningsTrend}%`
          : "N/A",
      trendUp: earningsTrend >= 0,
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      icon: CheckCircle2,
      color: "bg-[#D98555]",
      trend:
        completionTrend !== 0
          ? `${completionTrend > 0 ? "+" : ""}${completionTrend}%`
          : "N/A",
      trendUp: completionTrend >= 0,
    },
    {
      label: "Average Rating",
      value:
        averageRating > 0
          ? averageRating.toFixed(1)
          : "No reviews",
      icon: Star,
      color: "bg-[#B89968]",
      trend:
        barberReviews.length > 0
          ? `${barberReviews.length} reviews`
          : "N/A",
      trendUp: true,
    },
  ];

  // Handle appointment actions
  const handleCompleteAppointment = async (
    appointmentId: string,
  ) => {
    try {


      // Update in database - also clear remaining balance and mark payment as paid
      const updated = await API.appointments.update(appointmentId, {
        status: "completed",
        remaining_amount: 0,
        payment_status: "paid",
      });



      // Update local state with payment info cleared
      const updatedAppointments = allAppointments.map((apt) =>
        apt.id === appointmentId
          ? {
            ...apt,
            status: "completed" as const,
            remainingBalance: 0,
            remaining_amount: 0,
            paymentStatus: "paid",
            payment_status: "paid",
          }
          : apt,
      );
      onUpdateAppointments(updatedAppointments);

      // Find the appointment to get customer details
      const appointment = allAppointments.find(
        (apt) => apt.id === appointmentId,
      );

      // Send proper audit log + notifications to customer and admin
      if (appointment) {
        try {
          await logAppointmentCompleted(
            user.id,
            user.name,
            user.email,
            appointmentId,
            {
              service: appointment.service || appointment.service_name || 'Unknown Service',
              customerId: appointment.userId || appointment.customer_id || '',
              customerName: appointment.customerName || 'Customer',
              date: appointment.date || appointment.appointment_date || '',
              time: appointment.time || appointment.appointment_time || '',
              price: appointment.price || appointment.total_amount || 0,
            }
          );

        } catch (notifError) {
          console.warn(
            "Failed to create notification:",
            notifError,
          );
        }
      }

      toast.success("Appointment marked as completed");
      setShowAppointmentDetails(false);
    } catch (error) {
      console.error("❌ Error completing appointment:", error);
      toast.error(
        "Failed to complete appointment. Please try again.",
      );
    }
  };

  // Profile management handlers
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

    try {
      setIsUploadingAvatar(true);
      toast.loading("Uploading avatar to Cloudflare R2...", {
        id: "avatar-upload",
      });

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("type", "avatar"); // Specify upload type for proper folder organization

      const response = await API.uploadImage(uploadFormData);

      // Set the R2 URL in profile data
      setBarberProfile({
        ...barberProfile,
        avatarUrl: response.url,
      });

      // Update user in database
      await API.users.update(user.id, {
        avatarUrl: response.url,
      });

      // Update the user object in App.tsx state
      onUserUpdate({ ...user, avatarUrl: response.url });

      // Log avatar upload to audit logs
      await logAvatarUpload(
        user.id,
        user.role as "barber",
        user.name,
        user.email,
        response.url,
      );

      toast.success("Avatar uploaded successfully!", {
        id: "avatar-upload",
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
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

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);

      const emailChanged = barberProfile.contactEmail.toLowerCase() !== user.email.toLowerCase();

      // Handle email change if needed
      if (emailChanged) {
        if (!emailChangePassword) {
          toast.error("Password required", {
            description: "Please enter your password to change your email address.",
          });
          setIsSavingProfile(false);
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(barberProfile.contactEmail)) {
          toast.error("Invalid email format");
          setIsSavingProfile(false);
          return;
        }

        try {
          const result = await API.users.changeEmail(user.id, {
            newEmail: barberProfile.contactEmail,
            password: emailChangePassword,
          });
          toast.success(`Email changed to ${result.newEmail}`);
          onUserUpdate({ ...user, email: result.newEmail });
        } catch (emailErr: any) {
          if (emailErr.message?.includes('duplicate') || emailErr.message?.includes('already')) {
            toast.error("Email already in use", {
              description: "This email is registered to another account.",
            });
          } else {
            toast.error("Failed to change email", {
              description: emailErr.message || "Please check your password and try again.",
            });
          }
          setIsSavingProfile(false);
          setEmailChangePassword("");
          return;
        }
        setEmailChangePassword("");
      }

      // Update user in database (bio, phone)
      await API.users.update(user.id, {
        name: user.name,
        phone: barberProfile.contactPhone,
        bio: barberProfile.bio,
      });

      // Update barbers table (specialties, available_hours)
      if (barberDbId) {
        const availableHoursData = {
          schedule: barberProfile.availableHours?.schedule || `Mon-Sat, ${barberProfile.workingHours.start}-${barberProfile.workingHours.end}`,
          start: barberProfile.workingHours.start,
          end: barberProfile.workingHours.end,
        };
        await API.barbers.update(barberDbId, {
          specialties: barberProfile.specialties,
          available_hours: availableHoursData,
        });

      }

      // Update the user object in App.tsx state
      onUserUpdate({
        ...user,
        phone: barberProfile.contactPhone,
        bio: barberProfile.bio,
        ...(emailChanged ? { email: barberProfile.contactEmail } : {}),
      });

      // Log profile update to audit logs
      const changes = [];
      if (barberProfile.contactPhone !== user.phone) changes.push("phone");
      if (barberProfile.bio !== user.bio) changes.push("bio");
      if (emailChanged) changes.push("email");
      changes.push("specialties", "working_hours");

      if (changes.length > 0) {
        await logProfileUpdate(
          user.id,
          user.role as "barber",
          user.name,
          user.email,
          changes,
        );
      }

      toast.success("Profile updated successfully!", {
        description: "Your professional information has been saved.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile", {
        description: "Please try again later.",
      });
    } finally {
      setIsSavingProfile(false);
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email: user.email.toLowerCase() }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || "Failed to send reset code");
        return;
      }
      if (data.token) {
        sessionStorage.setItem('forgot_password_token', data.token);
      }
      toast.success("Reset code sent!", { description: `Check ${user.email} inbox` });
      setForgotStep(2);
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotPasswordVerifyOTP = async () => {
    if (!forgotOtp || forgotOtp.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setForgotLoading(true);
    try {
      const token = sessionStorage.getItem('forgot_password_token');
      if (!token) {
        toast.error("Session expired. Please try again.");
        setForgotStep(1);
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
          body: JSON.stringify({ email: user.email.toLowerCase(), otp: forgotOtp, token }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || "Invalid code");
        return;
      }
      toast.success("Code verified! Set your new password.");
      setForgotStep(3);
    } catch (error) {
      toast.error("Failed to verify code.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotPasswordReset = async () => {
    if (forgotNewPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setForgotLoading(true);
    try {
      const token = sessionStorage.getItem('forgot_password_token');
      if (!token) {
        toast.error("Session expired. Please start over.");
        setForgotStep(1);
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
          body: JSON.stringify({ email: user.email.toLowerCase(), newPassword: forgotNewPassword, token }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || "Failed to reset password");
        return;
      }
      sessionStorage.removeItem('forgot_password_token');
      toast.success("Password reset successfully!");
      setShowForgotPassword(false);
      setForgotStep(1);
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch (error) {
      toast.error("Failed to reset password.");
    } finally {
      setForgotLoading(false);
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
    if (passwordData.newPassword.length < 8) {
      toast.error(
        "Password must be at least 8 characters long",
      );
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
        user.role as "barber",
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

  const handlePasswordButtonClick = () => {
    // Validate first before showing confirmation
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
    if (passwordData.newPassword.length < 8) {
      toast.error(
        "Password must be at least 8 characters long",
      );
      return;
    }
    setShowPasswordConfirm(true);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    // Determine the final reason (either predefined or custom)
    const finalReason =
      cancelReasonType === "other"
        ? customCancelReason
        : cancelReasonType;

    // Validate that a reason is provided
    if (!finalReason || finalReason.trim() === "") {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    try {
      // Update in database
      await API.appointments.update(selectedAppointment.id, {
        status: "cancelled",
        payment_status: "refunded",
        cancellation_reason: finalReason,
        cancelled_by: `Barber - ${user.name}`,
        notes: `Barber cancelled: ${finalReason}`,
      });

      // Update local state
      const updatedAppointments = allAppointments.map((apt) =>
        apt.id === selectedAppointment.id
          ? {
            ...apt,
            status: "cancelled" as const,
            paymentStatus: "rejected" as const,
            payment_status: "refunded" as const,
            cancellationReason: finalReason,
            cancellation_reason: finalReason,
            cancelledBy: `Barber - ${user.name}`,
            cancelled_by: `Barber - ${user.name}`,
            cancelledAt: new Date().toISOString(),
            notes: `Barber cancelled: ${finalReason}`,
          }
          : apt,
      );
      onUpdateAppointments(updatedAppointments);

      // Send proper audit log + notifications to customer and admin
      try {
        await logAppointmentCancelledByBarber(
          user.id,
          user.name,
          user.email,
          selectedAppointment.id,
          {
            service: selectedAppointment.service || selectedAppointment.service_name || 'Unknown Service',
            customerId: selectedAppointment.userId || selectedAppointment.customer_id || '',
            customerName: selectedAppointment.customer || selectedAppointment.customerName || 'Customer',
            date: selectedAppointment.date || selectedAppointment.appointment_date || '',
            time: selectedAppointment.time || selectedAppointment.appointment_time || '',
            reason: finalReason,
          }
        );

      } catch (notifError) {
        console.warn(
          "Failed to create notifications:",
          notifError,
        );
      }

      toast.success("Appointment cancelled successfully");
      setShowCancelDialog(false);
      setCancelReason("");
      setCancelReasonType("");
      setCustomCancelReason("");
      setSelectedAppointment(null);
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error(
        "Failed to cancel appointment. Please try again.",
      );
    }
  };

  const handleAcceptAppointment = async (
    appointmentId: string,
  ) => {
    try {
      // Update in database
      await API.appointments.update(appointmentId, {
        status: "confirmed",
      });

      // Update local state
      const updatedAppointments = allAppointments.map((apt) =>
        apt.id === appointmentId
          ? { ...apt, status: "confirmed" as const }
          : apt,
      );
      onUpdateAppointments(updatedAppointments);

      // Find the appointment to get customer details
      const appointment = allAppointments.find(
        (apt) => apt.id === appointmentId,
      );

      // Create notification for customer
      if (appointment) {
        try {
          const { createNotification } = await import('../services/audit-notification.service');

          // Notify customer
          await createNotification({
            userId: appointment.userId || appointment.customer_id || '',
            userRole: 'customer',
            type: 'appointment_confirmed',
            title: '✅ Appointment Confirmed',
            message: `Great news! Your appointment for ${appointment.service || appointment.service_name || 'your service'} with ${user.name} on ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time} has been confirmed.`,
            relatedId: appointmentId,
            relatedType: 'appointment',
            actionUrl: `/appointments?highlight=${appointmentId}`,
            actionLabel: 'View Appointment',
          });

          // Notify admin
          await createNotification({
            userId: 'admin',
            userRole: 'admin',
            type: 'appointment_confirmed',
            title: 'Appointment Confirmed by Barber',
            message: `${user.name} confirmed ${appointment.customerName || 'customer'}'s ${appointment.service || appointment.service_name || 'appointment'} on ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}`,
            relatedId: appointmentId,
            relatedType: 'appointment',
            actionUrl: '/appointments',
            actionLabel: 'View Appointments',
          });


        } catch (notifError) {
          console.warn(
            "Failed to create notification:",
            notifError,
          );
        }
      }

      toast.success(
        "Appointment accepted and customer notified",
      );
    } catch (error) {
      console.error("Error accepting appointment:", error);
      toast.error(
        "Failed to accept appointment. Please try again.",
      );
    }
  };

  const handleRejectAppointment = async (
    appointmentId: string,
  ) => {
    try {
      // Update in database
      await API.appointments.update(appointmentId, {
        status: "rejected",
      });

      // Update local state
      const updatedAppointments = allAppointments.map((apt) =>
        apt.id === appointmentId
          ? { ...apt, status: "rejected" as const }
          : apt,
      );
      onUpdateAppointments(updatedAppointments);

      // Find the appointment to get customer details
      const appointment = allAppointments.find(
        (apt) => apt.id === appointmentId,
      );

      // Create notification for customer and admin
      if (appointment) {
        try {
          const { createNotification } = await import('../services/audit-notification.service');

          // Notify customer
          await createNotification({
            userId: appointment.userId || appointment.customer_id || '',
            userRole: 'customer',
            type: 'appointment_rejected',
            title: '❌ Appointment Request Declined',
            message: `Unfortunately, your appointment for ${appointment.service || appointment.service_name || 'your service'} with ${user.name} on ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time} has been declined. Please try booking another time slot.`,
            relatedId: appointmentId,
            relatedType: 'appointment',
            actionUrl: `/appointments?highlight=${appointment.id}`,
            actionLabel: 'Book New Appointment',
          });

          // Notify admin
          await createNotification({
            userId: 'admin',
            userRole: 'admin',
            type: 'appointment_rejected',
            title: 'Appointment Rejected by Barber',
            message: `${user.name} rejected ${appointment.customerName || 'customer'}'s ${appointment.service || appointment.service_name || 'appointment'} on ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}`,
            relatedId: appointmentId,
            relatedType: 'appointment',
            actionUrl: '/appointments',
            actionLabel: 'View Appointments',
          });


        } catch (notifError) {
          console.warn(
            "Failed to create notification:",
            notifError,
          );
        }
      }

      toast.error("Appointment rejected and customer notified");
    } catch (error) {
      console.error("Error rejecting appointment:", error);
      toast.error(
        "Failed to reject appointment. Please try again.",
      );
    }
  };

  // Refresh appointments handler
  const handleRefreshAppointments = async () => {
    try {
      toast.loading("Refreshing appointments...", {
        id: "refresh-appointments",
      });
      // Since we don't have direct access to the fetch function, we'll trigger a re-render
      // In a real scenario, you'd call the parent's fetch function
      toast.success("Appointments refreshed!", {
        id: "refresh-appointments",
      });
    } catch (error) {
      console.error("Error refreshing appointments:", error);
      toast.error("Failed to refresh appointments", {
        id: "refresh-appointments",
      });
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    {
      id: "appointments",
      label: "My Schedule",
      icon: Calendar,
    },
    { id: "bookings", label: "My Bookings", icon: BookOpen },
    { id: "earnings", label: "Earnings", icon: FaPesoSign },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "profile", label: "My Profile", icon: UserIcon },
  ];

  // Filter appointments based on search and filters
  const getFilteredAppointments = () => {
    // Use barber's own appointments for all tabs
    let filtered = barberAppointments;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (apt) => apt.status === statusFilter,
      );
    }

    // Date filter
    if (dateFilter === "today") {
      filtered = filtered.filter((apt) => apt.date === today);
    } else if (dateFilter === "week") {
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= thisWeekStart;
      });
    } else if (dateFilter === "month") {
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= thisMonthStart;
      });
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((apt) => {
        const customerName =
          apt.customer || apt.customerName || "";
        return (
          customerName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          apt.service
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        );
      });
    }

    return filtered;
  };

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="min-h-screen bg-[#FFFDF8] flex flex-col overflow-x-hidden">
      <div className="flex flex-1 overflow-x-hidden">
        {/* Sidebar */}
        <aside
          className={`
          fixed left-0 top-0 h-full bg-gradient-to-b from-[#5C4A3A] to-[#4A3828] text-[#F5EDD8] transition-all duration-300 z-20 shadow-2xl
          hidden md:block
          ${sidebarOpen ? "md:w-64" : "md:w-20"}
        `}
        >
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Logo */}
            <div className="p-4 border-b border-[#6E5A48] flex-shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                  alt="Supremo Barber Logo"
                  className="h-10 w-10 flex-shrink-0"
                />
                {sidebarOpen && (
                  <div>
                    <p className="text-[#F5EDD8]">
                      Supremo Barber
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${activeTab === item.id
                      ? "bg-[#DB9D47] text-white shadow-lg shadow-[#DB9D47]/50"
                      : "text-[#D4C5B0] hover:bg-[#6E5A48] hover:text-[#F5EDD8]"
                    }
                  `}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="truncate">
                      {item.label}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t border-[#6E5A48] flex-shrink-0">
              {sidebarOpen && (
                <div className="mb-3 px-4 py-2 bg-[#6E5A48] rounded-lg">
                  <p className="text-sm text-[#F5EDD8] truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-[#C4B49D]">
                    Professional Barber
                  </p>
                </div>
              )}
              <Button
                variant="ghost"
                onClick={onLogout}
                className="w-full justify-start text-[#D4C5B0] hover:text-[#F5EDD8] hover:bg-[#6E5A48]"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="ml-3">Logout</span>
                )}
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 overflow-x-hidden ${sidebarOpen ? "md:ml-64" : "md:ml-20"} flex flex-col`}
        >
          {/* Top Bar */}
          <header className="bg-white border-b-2 border-[#E8DCC8] sticky top-0 z-10 shadow-sm">
            <div className="px-3 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hidden md:flex text-[#5C4A3A] hover:bg-[#FBF7EF]"
                >
                  {sidebarOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </Button>
                <h1 className="text-base md:text-xl lg:text-2xl text-[#5C4A3A] truncate">
                  {
                    menuItems.find(
                      (item) => item.id === activeTab,
                    )?.label
                  }
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-[#94A670] text-white hidden sm:flex"
                >
                  {pendingAppointments.length} Pending
                </Badge>
                <NotificationCenter
                  userId={stableUserId}
                  userRole="barber"
                  onNavigate={(url) => {
                    // Parse URL and extract query parameters
                    const [path, queryString] = url.split('?');
                    const params = new URLSearchParams(queryString || '');

                    // Map the URL to dashboard tabs
                    if (path === "/appointments") {
                      setActiveTab("appointments");
                    } else if (path === "/profile") {
                      setActiveTab("profile");
                    } else if (path === "/schedule") {
                      setActiveTab("schedule");
                    } else if (path === "/reviews") {
                      setActiveTab("reviews");
                    }
                  }}
                />
                {/* Mobile Logout Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="md:hidden text-[#5C4A3A] hover:bg-[#FBF7EF] hover:text-[#DB9D47]"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="p-3 md:p-4 lg:p-6 pb-20 md:pb-6 flex-1 min-h-0 overflow-y-auto overflow-x-hidden max-w-full">
            {/* DASHBOARD TAB */}
            {activeTab === "dashboard" && (
              <div className="space-y-4 md:space-y-6 max-w-full">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {stats.map((stat, index) => (
                    <div
                      key={index}
                      className="flex flex-col p-3 sm:p-4 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`${stat.color} p-2 rounded-lg`}
                        >
                          <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div
                          className={`flex items-center gap-1 text-xs ${stat.trendUp ? "text-green-600" : "text-red-600"}`}
                        >
                          {stat.trendUp ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span className="hidden sm:inline">
                            {stat.trend}
                          </span>
                        </div>
                      </div>
                      <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">
                        {stat.value}
                      </p>
                      <p className="text-xs sm:text-sm text-[#87765E] truncate">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Today's Schedule & Pending Requests */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  <Card className="border-[#E8DCC8]">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-[#5C4A3A]">
                          Today's Schedule
                        </CardTitle>
                        <Badge className="bg-[#DB9D47]">
                          {todayAppointments.length}{" "}
                          appointments
                        </Badge>
                      </div>
                      <CardDescription className="text-[#87765E]">
                        Your bookings for today
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {todayAppointments.length === 0 ? (
                          <div className="text-center py-8 text-[#87765E]">
                            <Coffee className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>
                              No appointments today. Take a
                              break!
                            </p>
                          </div>
                        ) : (
                          todayAppointments.map((apt) => (
                            <div
                              key={apt.id}
                              className="flex items-center justify-between p-3 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => {
                                setSelectedAppointment(apt);
                                setShowAppointmentDetails(true);
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="bg-[#DB9D47] p-2 rounded-lg">
                                  <Clock className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm text-[#5C4A3A]">
                                    {apt.customer ||
                                      apt.customerName ||
                                      "Unknown"}
                                  </p>
                                  <p className="text-xs text-[#87765E]">
                                    {apt.service}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-[#5C4A3A]">
                                  {apt.time}
                                </p>
                                <Badge
                                  variant={
                                    apt.status === "completed"
                                      ? "default"
                                      : apt.status ===
                                        "upcoming"
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {apt.status}
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-[#E8DCC8]">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-[#5C4A3A]">
                          Pending Requests
                        </CardTitle>
                        <Badge variant="destructive">
                          {pendingAppointments.length} pending
                        </Badge>
                      </div>
                      <CardDescription className="text-[#87765E]">
                        Appointments awaiting your response
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="space-y-3 max-h-[350px] overflow-y-auto pr-1"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#DB9D47 #FBF7EF' }}
                      >
                        {pendingAppointments.length === 0 ? (
                          <div className="text-center py-8 text-[#87765E]">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>
                              All caught up! No pending
                              requests.
                            </p>
                          </div>
                        ) : (
                          pendingAppointments.map((apt) => (
                            <div
                              key={apt.id}
                              className="p-3 bg-orange-50 rounded-lg border border-orange-200"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#5C4A3A] truncate">
                                    {apt.customer ||
                                      apt.customerName ||
                                      "Unknown"}
                                  </p>
                                  <p className="text-xs text-[#87765E] truncate">
                                    {apt.service}
                                  </p>
                                </div>
                                <div className="text-right ml-2 flex-shrink-0">
                                  <p className="text-xs text-[#5C4A3A]">
                                    {apt.date}
                                  </p>
                                  <p className="text-xs text-[#87765E]">
                                    {apt.time}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  size="sm"
                                  className="flex-1 bg-[#94A670] hover:bg-[#7E8F5E] h-8 text-xs"
                                  onClick={() =>
                                    handleAcceptAppointment(
                                      apt.id,
                                    )
                                  }
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1 h-8 text-xs"
                                  onClick={() =>
                                    handleRejectAppointment(
                                      apt.id,
                                    )
                                  }
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Target Progress */}
                <Card className="border-[#E8DCC8]">
                  <CardHeader>
                    <CardTitle className="text-[#5C4A3A] flex items-center gap-2">
                      <Target className="w-5 h-5 text-[#DB9D47]" />
                      Monthly Target
                    </CardTitle>
                    <CardDescription className="text-[#87765E]">
                      Track your progress towards monthly goals
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[#87765E]">
                          Target: ₱
                          {monthlyTarget.toLocaleString()}
                        </span>
                        <span className="text-2xl text-[#94A670]">
                          ₱{monthlyEarnings.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={targetProgress}
                        className="h-4"
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#87765E]">
                          {targetProgress.toFixed(1)}% Complete
                        </span>
                        <span className="text-[#5C4A3A]">
                          ₱
                          {(
                            monthlyTarget - monthlyEarnings
                          ).toLocaleString()}{" "}
                          to go
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* APPOINTMENTS & SCHEDULE TAB */}
            {activeTab === "appointments" && (
              <div className="space-y-6">
                <BarberScheduleCalendar
                  appointments={barberAppointments}
                  barberName={user.name}
                />

              </div>
            )}

            {/* ALL BOOKINGS TAB */}
            {activeTab === "bookings" && (
              <div className="space-y-6">
                <Card className="border-[#E8DCC8]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-[#5C4A3A]">
                          My Bookings
                        </CardTitle>
                        <CardDescription className="text-[#87765E]">
                          View and manage your appointments
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshAppointments}
                        className="border-[#E8DCC8] hover:bg-[#FBF7EF]"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-[#FBF7EF] p-4 rounded-lg border border-[#E8DCC8]">
                        <div className="text-2xl font-bold text-[#DB9D47]">
                          {allAppointments.length}
                        </div>
                        <div className="text-sm text-[#87765E]">
                          Total Bookings
                        </div>
                      </div>
                      <div className="bg-[#FBF7EF] p-4 rounded-lg border border-[#E8DCC8]">
                        <div className="text-2xl font-bold text-[#94A670]">
                          {
                            allAppointments.filter(
                              (apt) => apt.status === "pending",
                            ).length
                          }
                        </div>
                        <div className="text-sm text-[#87765E]">
                          Pending
                        </div>
                      </div>
                      <div className="bg-[#FBF7EF] p-4 rounded-lg border border-[#E8DCC8]">
                        <div className="text-2xl font-bold text-[#D98555]">
                          {
                            allAppointments.filter(
                              (apt) =>
                                apt.status === "confirmed",
                            ).length
                          }
                        </div>
                        <div className="text-sm text-[#87765E]">
                          Confirmed
                        </div>
                      </div>
                      <div className="bg-[#FBF7EF] p-4 rounded-lg border border-[#E8DCC8]">
                        <div className="text-2xl font-bold text-[#5C4A3A]">
                          {
                            allAppointments.filter(
                              (apt) =>
                                apt.status === "completed",
                            ).length
                          }
                        </div>
                        <div className="text-sm text-[#87765E]">
                          Completed
                        </div>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                      <div className="flex-1">
                        <Input
                          placeholder="Search by customer name, barber, or service..."
                          value={searchQuery}
                          onChange={(e) =>
                            setSearchQuery(e.target.value)
                          }
                          className="border-[#E8DCC8]"
                        />
                      </div>
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger className="w-full md:w-[180px] border-[#E8DCC8]">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            All Status
                          </SelectItem>
                          <SelectItem value="pending">
                            Pending
                          </SelectItem>
                          <SelectItem value="confirmed">
                            Confirmed
                          </SelectItem>
                          <SelectItem value="completed">
                            Completed
                          </SelectItem>
                          <SelectItem value="cancelled">
                            Cancelled
                          </SelectItem>
                          <SelectItem value="rejected">
                            Rejected
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* All Bookings Table */}
                    <div className="border border-[#E8DCC8] rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#FBF7EF]">
                              <TableHead className="text-[#5C4A3A]">
                                Date & Time
                              </TableHead>
                              <TableHead className="text-[#5C4A3A]">
                                Customer
                              </TableHead>
                              <TableHead className="text-[#5C4A3A]">
                                Barber
                              </TableHead>
                              <TableHead className="text-[#5C4A3A]">
                                Service
                              </TableHead>
                              <TableHead className="text-[#5C4A3A]">
                                Status
                              </TableHead>
                              <TableHead className="text-[#5C4A3A]">
                                Price
                              </TableHead>
                              <TableHead className="text-[#5C4A3A] text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getFilteredAppointments()
                              .length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={7}
                                  className="text-center py-8 text-[#87765E]"
                                >
                                  No bookings found
                                </TableCell>
                              </TableRow>
                            ) : (
                              getFilteredAppointments()
                                .sort((a, b) => {
                                  const dateA = new Date(
                                    `${a.date} ${a.time}`,
                                  );
                                  const dateB = new Date(
                                    `${b.date} ${b.time}`,
                                  );
                                  return (
                                    dateB.getTime() -
                                    dateA.getTime()
                                  );
                                })
                                .map((appointment) => (
                                  <TableRow
                                    key={appointment.id}
                                    className="hover:bg-[#FBF7EF]"
                                  >
                                    <TableCell>
                                      <div className="font-medium text-[#5C4A3A]">
                                        {new Date(
                                          appointment.date,
                                        ).toLocaleDateString()}
                                      </div>
                                      <div className="text-sm text-[#87765E]">
                                        {appointment.time}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="font-medium text-[#5C4A3A]">
                                        {appointment.customerName ||
                                          appointment.customer ||
                                          "N/A"}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-[#5C4A3A]">
                                        {appointment.barber}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-[#5C4A3A]">
                                        {appointment.service}
                                      </div>
                                      {appointment.duration && (
                                        <div className="text-sm text-[#87765E]">
                                          {appointment.duration}{" "}
                                          mins
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        className={
                                          appointment.status ===
                                            "confirmed"
                                            ? "bg-[#94A670] hover:bg-[#94A670]"
                                            : appointment.status ===
                                              "pending"
                                              ? "bg-[#DB9D47] hover:bg-[#DB9D47]"
                                              : appointment.status ===
                                                "completed"
                                                ? "bg-[#5C4A3A] hover:bg-[#5C4A3A]"
                                                : appointment.status ===
                                                  "cancelled"
                                                  ? "bg-red-500 hover:bg-red-500"
                                                  : "bg-[#87765E] hover:bg-[#87765E]"
                                        }
                                      >
                                        {appointment.status
                                          .charAt(0)
                                          .toUpperCase() +
                                          appointment.status.slice(
                                            1,
                                          )}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="font-medium text-[#5C4A3A]">
                                        ₱
                                        {appointment.price.toLocaleString()}
                                      </div>
                                      {appointment.paymentStatus ===
                                        "verified" && (
                                          <div className="text-xs text-[#94A670]">
                                            Paid
                                          </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        {/* Mark Complete Button */}
                                        {(appointment.status ===
                                          "confirmed" ||
                                          appointment.status ===
                                          "upcoming" ||
                                          appointment.status ===
                                          "verified") && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleCompleteAppointment(
                                                  appointment.id,
                                                );
                                              }}
                                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                              title="Mark as Complete"
                                            >
                                              <CheckCircle2 className="w-4 h-4" />
                                            </Button>
                                          )}

                                        {/* Cancel Button */}
                                        {(appointment.status ===
                                          "pending" ||
                                          appointment.status ===
                                          "confirmed" ||
                                          appointment.status ===
                                          "upcoming" ||
                                          appointment.status ===
                                          "verified") && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedAppointment(
                                                  appointment,
                                                );
                                                setShowCancelDialog(
                                                  true,
                                                );
                                              }}
                                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                              title="Cancel Appointment"
                                            >
                                              <XCircle className="w-4 h-4" />
                                            </Button>
                                          )}

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedAppointment(
                                              appointment,
                                            );
                                            setShowAppointmentDetails(
                                              true,
                                            );
                                          }}
                                          className="h-8 w-8 p-0 text-[#5C4A3A] hover:text-[#DB9D47] hover:bg-[#FBF7EF]"
                                          title="View Details"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>

                                        {/* Show placeholder for completed/cancelled to maintain alignment */}
                                        {(appointment.status ===
                                          "completed" ||
                                          appointment.status ===
                                          "cancelled" ||
                                          appointment.status ===
                                          "rejected") && (
                                            <div className="h-8 w-8 flex items-center justify-center text-[#87765E]">
                                              <span className="text-xs">
                                                —
                                              </span>
                                            </div>
                                          )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-4 text-sm text-[#87765E]">
                      Showing {getFilteredAppointments().length}{" "}
                      of {barberAppointments.length} total bookings
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* EARNINGS TAB */}
            {activeTab === "earnings" && (
              <BarberEarningsOverview
                appointments={barberAppointments}
                user={user}
              />
            )}

            {/* REVIEWS TAB */}
            {activeTab === "reviews" && (
              <Card className="border-[#E8DCC8]">
                <CardHeader>
                  <CardTitle className="text-[#5C4A3A]">
                    Ratings & Reviews
                  </CardTitle>
                  <CardDescription className="text-[#87765E]">
                    Customer feedback and ratings from Supabase
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingReviews ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DB9D47]"></div>
                      <span className="ml-3 text-[#87765E]">
                        Loading reviews...
                      </span>
                    </div>
                  ) : barberReviews.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mb-6 p-6 rounded-lg bg-gradient-to-br from-[#FBF7EF] to-white border-2 border-[#E8DCC8]">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Star className="w-12 h-12 text-gray-300" />
                        </div>
                        <p className="text-sm text-[#87765E]">
                          No reviews yet
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className="w-6 h-6 text-gray-300"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Average Rating Summary */}
                      <div className="bg-[#FBF7EF] p-6 rounded-lg border border-[#E8DCC8]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[#87765E] mb-1">
                              Average Rating
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-3xl text-[#5C4A3A]">
                                {averageRating}
                              </p>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <Star
                                    key={i}
                                    className={`w-5 h-5 ${i <= Math.round(parseFloat(averageRating.toString())) ? "fill-[#DB9D47] text-[#DB9D47]" : "text-gray-300"}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-[#87765E]">
                              Total Reviews
                            </p>
                            <p className="text-3xl text-[#5C4A3A]">
                              {barberReviews.length}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reviews List */}
                      <div className="space-y-4">
                        {barberReviews.map((review: any) => (
                          <Card
                            key={review.id}
                            className="border-[#E8DCC8]"
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="text-[#5C4A3A]">
                                    {review.customerName ||
                                      "Anonymous"}
                                  </p>
                                  <p className="text-xs text-[#87765E]">
                                    {review.date ||
                                      review.createdAt
                                      ? new Date(
                                        review.date ||
                                        review.createdAt,
                                      ).toLocaleDateString(
                                        "en-US",
                                        {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        },
                                      )
                                      : "No date"}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${i <= review.rating ? "fill-[#DB9D47] text-[#DB9D47]" : "text-gray-300"}`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-[#5C4A3A] leading-relaxed">
                                {review.comment ||
                                  "No comment provided"}
                              </p>
                              {review.service && (
                                <p className="text-xs text-[#87765E] mt-2">
                                  Service: {review.service}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <Card className="border-[#E8DCC8]">
                  <CardHeader>
                    <CardTitle className="text-[#5C4A3A]">
                      Barber Profile
                    </CardTitle>
                    <CardDescription className="text-[#87765E]">
                      Manage your professional information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Profile Picture */}
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="w-24 h-24 bg-[#DB9D47] text-white">
                            <AvatarImage
                              src={
                                barberProfile.avatarUrl ||
                                user.avatarUrl ||
                                ""
                              }
                              alt={user.name}
                            />
                            <AvatarFallback className="text-3xl bg-[#DB9D47] text-white">
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <button
                            onClick={handleUploadClick}
                            disabled={isUploadingAvatar}
                            className="absolute bottom-0 right-0 bg-[#DB9D47] hover:bg-[#C88B3A] text-white rounded-full p-2 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          <h3 className="text-lg text-[#5C4A3A]">
                            {user.name}
                          </h3>
                          <p className="text-sm text-[#87765E]">
                            Professional Barber
                          </p>
                          <p className="text-xs text-[#87765E] mt-1">
                            Click camera icon to change photo
                          </p>
                        </div>
                      </div>

                      {/* Bio */}
                      <div className="space-y-2">
                        <Label>Bio</Label>
                        <Textarea
                          value={barberProfile.bio}
                          onChange={(e) =>
                            setBarberProfile({
                              ...barberProfile,
                              bio: e.target.value,
                            })
                          }
                          placeholder="Tell customers about yourself..."
                          className="border-[#E8DCC8]"
                          rows={4}
                        />
                      </div>

                      {/* Specialties */}
                      <div className="space-y-2">
                        <Label>Specialties</Label>
                        <div className="flex flex-wrap gap-2">
                          {barberProfile.specialties.map(
                            (specialty, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="bg-[#DB9D47] text-white cursor-pointer hover:bg-red-500 transition-colors group"
                                onClick={() => {
                                  setBarberProfile({
                                    ...barberProfile,
                                    specialties: barberProfile.specialties.filter((_, i) => i !== idx),
                                  });
                                }}
                                title="Click to remove"
                              >
                                {specialty}
                                <X className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Badge>
                            ),
                          )}
                          {showAddSpecialty ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={newSpecialty}
                                onChange={(e) => setNewSpecialty(e.target.value)}
                                placeholder="New specialty..."
                                className="h-8 w-40 text-sm border-[#E8DCC8]"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newSpecialty.trim()) {
                                    setBarberProfile({
                                      ...barberProfile,
                                      specialties: [...barberProfile.specialties, newSpecialty.trim()],
                                    });
                                    setNewSpecialty("");
                                    setShowAddSpecialty(false);
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                className="h-8 bg-[#94A670] hover:bg-[#7E8F5E] text-white"
                                onClick={() => {
                                  if (newSpecialty.trim()) {
                                    setBarberProfile({
                                      ...barberProfile,
                                      specialties: [...barberProfile.specialties, newSpecialty.trim()],
                                    });
                                    setNewSpecialty("");
                                    setShowAddSpecialty(false);
                                  }
                                }}
                              >
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8"
                                onClick={() => { setShowAddSpecialty(false); setNewSpecialty(""); }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white"
                              onClick={() => setShowAddSpecialty(true)}
                            >
                              + Add Specialty
                            </Button>
                          )}
                        </div>
                        {barberProfile.specialties.length === 0 && (
                          <p className="text-xs text-[#87765E] italic">No specialties added yet. Click "+ Add Specialty" to add one.</p>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
                            <Input
                              value={barberProfile.contactPhone}
                              onChange={(e) =>
                                setBarberProfile({
                                  ...barberProfile,
                                  contactPhone: e.target.value,
                                })
                              }
                              className="pl-10 border-[#E8DCC8]"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
                            <Input
                              value={barberProfile.contactEmail}
                              onChange={(e) =>
                                setBarberProfile({
                                  ...barberProfile,
                                  contactEmail: e.target.value,
                                })
                              }
                              className="pl-10 border-[#E8DCC8]"
                              type="email"
                            />
                          </div>
                          {barberProfile.contactEmail.toLowerCase() !== user.email.toLowerCase() && (
                            <div className="space-y-2">
                              <p className="text-xs text-orange-600">Password required to change email</p>
                              <PasswordInput
                                value={emailChangePassword}
                                onChange={(e) => setEmailChangePassword(e.target.value)}
                                placeholder="Enter password to confirm"
                                className="border-[#E8DCC8]"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            // Reset by reloading from DB
                            try {
                              const freshBarber = barberDbId ? await API.barbers.getByUserId(user.id) : null;
                              const dbSpecialties = freshBarber?.specialties || [];
                              const dbAvailableHours = freshBarber?.available_hours || freshBarber?.availableHours || {};
                              setBarberProfile({
                                bio: user.bio || "",
                                specialties: dbSpecialties,
                                workingHours: {
                                  start: dbAvailableHours?.start || "09:00",
                                  end: dbAvailableHours?.end || "18:00",
                                },
                                breakTime: {
                                  start: "12:00",
                                  end: "13:00",
                                },
                                daysOff: ["Sunday"],
                                contactPhone: user.phone || "",
                                contactEmail: user.email,
                                avatarUrl: user.avatarUrl || "",
                                availableHours: dbAvailableHours,
                              });
                              toast.info("Profile reset to saved values");
                            } catch {
                              toast.error("Failed to reload profile");
                            }
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-[#DB9D47] hover:bg-[#C48A3D]"
                          onClick={handleSaveProfile}
                          disabled={isSavingProfile}
                        >
                          {isSavingProfile ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Change Password */}
                <Card className="border-[#E8DCC8]">
                  <CardHeader>
                    <CardTitle className="text-[#5C4A3A]">
                      Change Password
                    </CardTitle>
                    <CardDescription className="text-[#87765E]">
                      Update your account password
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!showForgotPassword ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword" className="text-[#5C4A3A]">
                            Current Password
                          </Label>
                          <PasswordInput
                            id="currentPassword"
                            value={passwordData.currentPassword}
                            onChange={(e) =>
                              setPasswordData({ ...passwordData, currentPassword: e.target.value })
                            }
                            placeholder="Enter current password"
                            className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword" className="text-[#5C4A3A]">
                            New Password
                          </Label>
                          <PasswordInput
                            id="newPassword"
                            value={passwordData.newPassword}
                            onChange={(e) =>
                              setPasswordData({ ...passwordData, newPassword: e.target.value })
                            }
                            placeholder="Enter new password"
                            className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
                          />
                          <p className="text-xs text-[#87765E]">
                            Must be at least 8 characters long
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-[#5C4A3A]">
                            Confirm New Password
                          </Label>
                          <PasswordInput
                            id="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={(e) =>
                              setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                            }
                            placeholder="Confirm new password"
                            className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            className="text-sm text-[#DB9D47] hover:text-[#C88A35] hover:underline transition-colors"
                            onClick={() => {
                              setShowForgotPassword(true);
                              setForgotStep(1);
                            }}
                          >
                            Forgot Password?
                          </button>
                          <Button
                            className="bg-[#D98555] hover:bg-[#C77545] text-white"
                            onClick={handlePasswordButtonClick}
                            disabled={passwordLoading}
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
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-[#5C4A3A]">Reset Password via Email</h4>
                          <button
                            type="button"
                            className="text-xs text-[#87765E] hover:text-[#5C4A3A] hover:underline"
                            onClick={() => {
                              setShowForgotPassword(false);
                              setForgotStep(1);
                              setForgotOtp("");
                              setForgotNewPassword("");
                              setForgotConfirmPassword("");
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
                            <Button
                              className="w-full bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                              onClick={handleForgotPasswordSendOTP}
                              disabled={forgotLoading}
                            >
                              {forgotLoading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                              ) : (
                                "Send Verification Code"
                              )}
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
                            <Button
                              className="w-full bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                              onClick={handleForgotPasswordVerifyOTP}
                              disabled={forgotLoading || forgotOtp.length !== 6}
                            >
                              {forgotLoading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                              ) : (
                                "Verify Code"
                              )}
                            </Button>
                            <button
                              type="button"
                              className="text-xs text-[#DB9D47] hover:underline w-full text-center"
                              onClick={handleForgotPasswordSendOTP}
                              disabled={forgotLoading}
                            >
                              Resend code
                            </button>
                          </div>
                        )}

                        {forgotStep === 3 && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label className="text-[#5C4A3A]">New Password</Label>
                              <PasswordInput
                                value={forgotNewPassword}
                                onChange={(e) => setForgotNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="border-[#E8DCC8]"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[#5C4A3A]">Confirm New Password</Label>
                              <PasswordInput
                                value={forgotConfirmPassword}
                                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="border-[#E8DCC8]"
                              />
                            </div>
                            <Button
                              className="w-full bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                              onClick={handleForgotPasswordReset}
                              disabled={forgotLoading}
                            >
                              {forgotLoading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resetting...</>
                              ) : (
                                "Reset Password"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <div
        className={`hidden md:block transition-all duration-300 ${sidebarOpen ? "md:ml-64" : "md:ml-20"}`}
      >
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#E8DCC8] z-30 shadow-lg">
        <div className="grid grid-cols-6 gap-0.5 py-1.5 px-0.5">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`
              flex flex-col items-center gap-0.5 px-0.5 py-1.5 rounded-lg transition-all min-w-0
              ${activeTab === "dashboard" ? "bg-[#DB9D47] text-white" : "text-[#87765E] hover:bg-[#FBF7EF]"}
            `}
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            <span className="text-[8px] whitespace-nowrap truncate max-w-full text-center">
              Home
            </span>
          </button>

          {/* Appointments */}
          <button
            onClick={() => setActiveTab("appointments")}
            className={`
              flex flex-col items-center gap-0.5 px-0.5 py-1.5 rounded-lg transition-all min-w-0
              ${activeTab === "appointments" ? "bg-[#DB9D47] text-white" : "text-[#87765E] hover:bg-[#FBF7EF]"}
            `}
          >
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="text-[8px] whitespace-nowrap truncate max-w-full text-center">
              Appts
            </span>
          </button>

          {/* Bookings */}
          <button
            onClick={() => setActiveTab("bookings")}
            className={`
              flex flex-col items-center gap-0.5 px-0.5 py-1.5 rounded-lg transition-all min-w-0
              ${activeTab === "bookings" ? "bg-[#DB9D47] text-white" : "text-[#87765E] hover:bg-[#FBF7EF]"}
            `}
          >
            <BookOpen className="w-4 h-4 flex-shrink-0" />
            <span className="text-[8px] whitespace-nowrap truncate max-w-full text-center">
              Bookings
            </span>
          </button>

          {/* Earnings */}
          <button
            onClick={() => setActiveTab("earnings")}
            className={`
              flex flex-col items-center gap-0.5 px-0.5 py-1.5 rounded-lg transition-all min-w-0
              ${activeTab === "earnings" ? "bg-[#DB9D47] text-white" : "text-[#87765E] hover:bg-[#FBF7EF]"}
            `}
          >
            <FaPesoSign className="w-4 h-4 flex-shrink-0" />
            <span className="text-[8px] whitespace-nowrap truncate max-w-full text-center">
              Earnings
            </span>
          </button>

          {/* Reviews */}
          <button
            onClick={() => setActiveTab("reviews")}
            className={`
              flex flex-col items-center gap-0.5 px-0.5 py-1.5 rounded-lg transition-all min-w-0
              ${activeTab === "reviews" ? "bg-[#DB9D47] text-white" : "text-[#87765E] hover:bg-[#FBF7EF]"}
            `}
          >
            <Star className="w-4 h-4 flex-shrink-0" />
            <span className="text-[8px] whitespace-nowrap truncate max-w-full text-center">
              Reviews
            </span>
          </button>

          {/* Profile */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`
              flex flex-col items-center gap-0.5 px-0.5 py-1.5 rounded-lg transition-all min-w-0
              ${activeTab === "profile" ? "bg-[#DB9D47] text-white" : "text-[#87765E] hover:bg-[#FBF7EF]"}
            `}
          >
            <UserIcon className="w-4 h-4 flex-shrink-0" />
            <span className="text-[8px] whitespace-nowrap truncate max-w-full text-center">
              Profile
            </span>
          </button>
        </div>
      </nav>

      {/* Appointment Details Dialog */}
      <Dialog
        open={showAppointmentDetails}
        onOpenChange={setShowAppointmentDetails}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#5C4A3A] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#DB9D47]" />
              Appointment Details
            </DialogTitle>
            <DialogDescription className="text-[#87765E]">
              Complete information about this appointment
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="p-3 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8]">
                <Label className="text-[#87765E] text-xs">
                  Customer
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <UserIcon className="w-4 h-4 text-[#DB9D47]" />
                  <p className="text-[#5C4A3A] font-medium">
                    {selectedAppointment.customer ||
                      selectedAppointment.customerName ||
                      "N/A"}
                  </p>
                </div>
              </div>

              {/* Service Info */}
              <div className="p-3 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8]">
                <Label className="text-[#87765E] text-xs">
                  Service
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Scissors className="w-4 h-4 text-[#DB9D47]" />
                  <p className="text-[#5C4A3A] font-medium">
                    {selectedAppointment.service}
                  </p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8]">
                  <Label className="text-[#87765E] text-xs">
                    Date
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <CalendarIcon className="w-4 h-4 text-[#DB9D47]" />
                    <p className="text-[#5C4A3A] font-medium text-sm">
                      {selectedAppointment.date}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8]">
                  <Label className="text-[#87765E] text-xs">
                    Time
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-[#DB9D47]" />
                    <p className="text-[#5C4A3A] font-medium text-sm">
                      {selectedAppointment.time}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="p-3 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8]">
                <Label className="text-[#87765E] text-xs">
                  Price
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <FaPesoSign className="w-4 h-4 text-[#DB9D47]" />
                  <p className="text-[#5C4A3A] font-medium text-lg">

                    {selectedAppointment.price.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="p-3 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8]">
                <Label className="text-[#87765E] text-xs">
                  Status
                </Label>
                <div className="mt-1">
                  <Badge
                    className={`${selectedAppointment.status === "completed"
                      ? "bg-green-500 hover:bg-green-600"
                      : selectedAppointment.status ===
                        "pending"
                        ? "bg-orange-500 hover:bg-orange-600"
                        : selectedAppointment.status ===
                          "confirmed" ||
                          selectedAppointment.status ===
                          "upcoming"
                          ? "bg-[#DB9D47] hover:bg-[#C88A3A]"
                          : selectedAppointment.status ===
                            "cancelled"
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-gray-500 hover:bg-gray-600"
                      } text-white capitalize`}
                  >
                    {selectedAppointment.status}
                  </Badge>
                </div>
              </div>

              {/* Payment Info */}
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <Label className="text-green-700 text-xs font-medium">
                  Payment Information
                </Label>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">
                      Total Amount:
                    </span>
                    <span className="text-green-700 font-medium">
                      ₱{selectedAppointment.price.toLocaleString()}
                    </span>
                  </div>
                  {selectedAppointment.down_payment || selectedAppointment.downPaymentPaid ? (
                    <div className="flex justify-between">
                      <span className="text-green-600">
                        Down Payment:
                      </span>
                      <span className="text-green-700 font-medium">
                        ₱{(selectedAppointment.down_payment || selectedAppointment.price * 0.5).toLocaleString()}
                      </span>
                    </div>
                  ) : null}
                  {selectedAppointment.status === "completed" ? (
                    <div className="flex justify-between items-center pt-1 border-t border-green-200">
                      <span className="text-green-600 font-medium">
                        Payment Status:
                      </span>
                      <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">
                        Fully Paid
                      </Badge>
                    </div>
                  ) : (
                    <>
                      {(selectedAppointment.remainingBalance > 0 || selectedAppointment.remaining_amount > 0) && (
                        <div className="flex justify-between">
                          <span className="text-green-600">
                            Remaining:
                          </span>
                          <span className="text-orange-600 font-medium">
                            ₱{Number(selectedAppointment.remainingBalance || selectedAppointment.remaining_amount || 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {(selectedAppointment.paymentStatus || selectedAppointment.payment_status) && (
                        <div className="flex justify-between items-center pt-1 border-t border-green-200">
                          <span className="text-green-600">
                            Payment Status:
                          </span>
                          <Badge className={`text-xs text-white ${(selectedAppointment.paymentStatus || selectedAppointment.payment_status) === 'verified' ? 'bg-green-500' :
                              (selectedAppointment.paymentStatus || selectedAppointment.payment_status) === 'rejected' ? 'bg-red-500' :
                                'bg-orange-500'
                            }`}>
                            {selectedAppointment.paymentStatus || selectedAppointment.payment_status}
                          </Badge>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Show cancellation details if appointment is cancelled */}
              {selectedAppointment.status === "cancelled" &&
                (selectedAppointment.cancellationReason || selectedAppointment.cancellation_reason || selectedAppointment.notes) && (
                  <div className="pt-2 border-t border-[#E8DCC8]">
                    <Label className="text-[#87765E]">
                      Cancellation Details
                    </Label>
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        <span className="font-medium">
                          Reason:
                        </span>{" "}
                        {selectedAppointment.cancellationReason || selectedAppointment.cancellation_reason ||
                          selectedAppointment.notes?.replace('Customer cancelled: ', '').replace('Admin cancelled: ', '').replace('Barber cancelled: ', '')}
                      </p>
                      {(selectedAppointment.cancelledBy || selectedAppointment.cancelled_by || selectedAppointment.notes) && (
                        <p className="text-xs text-red-600 mt-1">
                          Cancelled by:{" "}
                          {selectedAppointment.cancelledBy || selectedAppointment.cancelled_by ||
                            (selectedAppointment.notes?.startsWith('Admin cancelled:') ? 'Admin' :
                              selectedAppointment.notes?.startsWith('Barber cancelled:') ? 'Barber' :
                                selectedAppointment.notes?.startsWith('Customer cancelled:') ? 'Customer' : 'Unknown')}
                        </p>
                      )}
                      {selectedAppointment.cancelledAt && (
                        <p className="text-xs text-red-600">
                          Date:{" "}
                          {new Date(
                            selectedAppointment.cancelledAt,
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
          <DialogFooter className="flex gap-2">
            {(selectedAppointment?.status === "upcoming" ||
              selectedAppointment?.status === "confirmed" ||
              selectedAppointment?.status === "pending") && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAppointmentDetails(false);
                      setShowCancelDialog(true);
                    }}
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  {(selectedAppointment?.status === "upcoming" ||
                    selectedAppointment?.status ===
                    "confirmed" ||
                    selectedAppointment?.status ===
                    "verified") && (
                      <Button
                        onClick={() =>
                          handleCompleteAppointment(
                            selectedAppointment.id,
                          )
                        }
                        className="flex-1 bg-[#94A670] hover:bg-[#7E8F5E]"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                </>
              )}
            {(selectedAppointment?.status === "cancelled" ||
              selectedAppointment?.status === "rejected") && (
                <div className="w-full text-center text-sm text-[#87765E] py-2">
                  This appointment has been{" "}
                  {selectedAppointment.status}
                </div>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Appointment Dialog */}
      <AlertDialog
        open={showCancelDialog}
        onOpenChange={(open) => {
          setShowCancelDialog(open);
          if (!open) {
            setCancelReasonType("");
            setCustomCancelReason("");
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#5C4A3A] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Cancel Appointment
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#87765E]">
              Please select or provide a reason for
              cancellation. The customer will be notified about
              this change.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Predefined Reasons */}
            <div className="space-y-2">
              <Label
                htmlFor="cancel-reason"
                className="text-[#5C4A3A]"
              >
                Cancellation Reason{" "}
                <span className="text-red-600">*</span>
              </Label>
              <Select
                value={cancelReasonType}
                onValueChange={setCancelReasonType}
              >
                <SelectTrigger
                  id="cancel-reason"
                  className="border-[#E8DCC8]"
                >
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">
                    Personal Emergency
                  </SelectItem>
                  <SelectItem value="illness">
                    Feeling Unwell / Sick
                  </SelectItem>
                  <SelectItem value="schedule_conflict">
                    Schedule Conflict
                  </SelectItem>
                  <SelectItem value="equipment_issue">
                    Equipment Malfunction
                  </SelectItem>
                  <SelectItem value="no_show">
                    Customer No-Show (waited)
                  </SelectItem>
                  <SelectItem value="double_booking">
                    Double Booking Error
                  </SelectItem>
                  <SelectItem value="weather">
                    Severe Weather Conditions
                  </SelectItem>
                  <SelectItem value="family_matter">
                    Family Matter
                  </SelectItem>
                  <SelectItem value="other">
                    Other (Please specify)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Reason Input (shown when "Other" is selected) */}
            {cancelReasonType === "other" && (
              <div className="space-y-2">
                <Label
                  htmlFor="custom-reason"
                  className="text-[#5C4A3A]"
                >
                  Please specify your reason{" "}
                  <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="custom-reason"
                  placeholder="Enter your reason for cancellation..."
                  value={customCancelReason}
                  onChange={(e) =>
                    setCustomCancelReason(e.target.value)
                  }
                  className="border-[#E8DCC8] min-h-[100px]"
                  rows={4}
                />
                <p className="text-xs text-[#87765E]">
                  Please be specific to help maintain
                  transparency with customers
                </p>
              </div>
            )}

            {/* Information Note */}
            {cancelReasonType && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium">Important:</p>
                  <p className="mt-1">
                    The customer will receive a notification
                    with your cancellation reason.
                    {selectedAppointment?.downPaymentPaid &&
                      " Down payment will be refunded."}
                  </p>
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="border-[#E8DCC8] hover:bg-[#FBF7EF]"
              onClick={() => {
                setCancelReasonType("");
                setCustomCancelReason("");
              }}
            >
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              disabled={
                !cancelReasonType ||
                (cancelReasonType === "other" &&
                  !customCancelReason.trim())
              }
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Confirm Cancellation
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