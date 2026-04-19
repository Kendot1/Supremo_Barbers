import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar as CalendarIcon,
  User,
  Scissors,
  Eye,
  Image as ImageIcon,
  AlertCircle,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Download,
} from "lucide-react";
import { FaPesoSign } from "react-icons/fa6";
import { toast } from "sonner";
import type { Appointment } from "../App";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  createNotification,
  type Notification,
} from "./NotificationCenter";
import {
  exportToCSV,
  formatDateForExport,
  formatCurrencyForExport,
} from "./utils/exportUtils";
import API from "../services/api.service";
import { logPaymentVerification } from "../services/audit-notification.service";
import { Pagination } from "./ui/pagination";

// Utility function to parse date string without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Payment record interface matching database schema
interface PaymentRecord {
  id: string;
  appointment_id: string;
  amount: number;
  payment_method: string;
  payment_type: "downpayment" | "full" | "remaining";
  created_at: string;
  proof_url?: string;
}

// Extended appointment with payment data
interface AppointmentWithPayment extends Appointment {
  payment?: PaymentRecord;
  paymentAmount?: number;
  paymentReference?: string;
  paymentMethod?: string;
  paymentType?: string;
}

interface PaymentVerificationProps {
  appointments: Appointment[];
  onUpdateAppointment: (
    appointmentId: string,
    updates: Partial<Appointment>,
  ) => void;
  userRole: "admin" | "barber";
  onAddNotification?: (notification: Notification) => void;
  onRefreshAppointments?: () => Promise<void>;
  currentUser?: { id: string; name: string; email: string };
}

export function PaymentVerification({
  appointments,
  onUpdateAppointment,
  userRole,
  onAddNotification,
  onRefreshAppointments,
  currentUser,
}: PaymentVerificationProps) {
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithPayment | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] =
    useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] =
    useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] =
    useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "verified" | "rejected"
  >("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBarber, setFilterBarber] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Database state
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [services, setServices] = useState<any[]>([]);

  // Fetch payments from database
  const fetchPayments = async (
    showRefreshIndicator = false,
  ) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      }

      const paymentsData = await API.payments.getAll();
      setPayments(paymentsData || []);

      // Also fetch services to get real prices
      const servicesData = await API.services.getAll();
      setServices(servicesData || []);
    } catch (error) {
      console.error("❌ Error fetching payments:", error);
      toast.error("Failed to load payment data");
    } finally {
      setIsLoading(false);
      if (showRefreshIndicator) {
        setIsRefreshing(false);
      }
    }
  };

  // Fetch on mount and set up auto-refresh
  useEffect(() => {
    fetchPayments();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchPayments(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Join appointments with payment records
  const appointmentsWithPaymentData: AppointmentWithPayment[] =
    appointments.map((apt) => {
      const payment = payments.find(
        (p) => p.appointment_id === apt.id,
      );
      const service = services.find(
        (s) => s.id === apt.serviceId || s.name === apt.service,
      );

      return {
        ...apt,
        payment,
        paymentAmount: payment?.amount,
        paymentMethod: payment?.payment_method,
        paymentType: payment?.payment_type,
        // Check both appointment paymentProof and payment record proof_url
        paymentProof: apt.paymentProof || (payment as any)?.proof_url || undefined,
        // Use real service price if available
        price: service?.price || apt.price,
      };
    });

  // Auto-cancel appointments with pending payments that have passed their date
  useEffect(() => {
    const autoCancelExpiredAppointments = async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      for (const apt of appointmentsWithPaymentData) {
        // Only auto-cancel if:
        // 1. Payment status is still pending
        // 2. Appointment status is not already cancelled/completed
        // 3. Appointment date has passed
        if (
          apt.paymentStatus === 'pending' &&
          apt.status !== 'cancelled' &&
          apt.status !== 'completed' &&
          apt.paymentProof // Has submitted payment proof but not verified
        ) {
          const aptDate = parseLocalDate(apt.date);

          // If appointment date has passed
          if (aptDate < today) {


            try {
              // Update appointment to cancelled
              await API.appointments.update(apt.id, {
                status: 'cancelled',
                notes: `Auto-cancelled: Payment not verified before appointment date (${apt.date})`,
                cancellation_reason: 'Payment not verified before appointment date',
              });

              // Update local state
              onUpdateAppointment(apt.id, {
                status: 'cancelled',
                cancellationReason: 'Payment not verified before appointment date',
                cancelledBy: 'System',
                cancelledAt: new Date().toISOString(),
              });

              // Send notification to customer
              if (currentUser) {
                try {
                  await API.notifications.create({
                    userId: apt.userId || apt.customer_id || '',
                    userRole: 'customer', // Required field for database
                    title: 'Appointment Auto-Cancelled',
                    message: `Your appointment for ${apt.service} on ${parseLocalDate(apt.date).toLocaleDateString()} was automatically cancelled due to unverified payment.`,
                    type: 'booking',
                    appointmentId: apt.id,
                    isRead: false,
                    actionUrl: `/appointments?highlight=${apt.id}`, // Highlight the cancelled appointment
                    actionLabel: 'View Appointments',
                  });
                } catch (error) {
                  console.error('Failed to send auto-cancel notification:', error);
                }
              }

              toast.error(
                `Auto-cancelled appointment for ${apt.customerName} - payment not verified in time`
              );
            } catch (error) {
              console.error('Failed to auto-cancel appointment:', error);
            }
          }
        }
      }
    };

    // Run on mount and whenever appointments change
    if (appointmentsWithPaymentData.length > 0) {
      autoCancelExpiredAppointments();
    }

    // Check every hour for expired appointments
    const interval = setInterval(() => {
      autoCancelExpiredAppointments();
    }, 3600000); // 1 hour

    return () => clearInterval(interval);
  }, [appointmentsWithPaymentData, currentUser, onUpdateAppointment]);

  // Get unique barbers for filter
  const barbers = Array.from(
    new Set(appointments.map((apt) => apt.barber)),
  );

  // Filter appointments with payment proofs
  const appointmentsWithPayment =
    appointmentsWithPaymentData.filter((apt) => {
      // Show appointments that:
      // 1. Have payment records in database, OR
      // 2. Have uploaded payment proof, OR
      // 3. Have payment_status = 'pending' and need to upload proof
      const hasPayment = apt.payment || apt.paymentProof || apt.paymentStatus === 'pending';

      const matchesStatus =
        filterStatus === "all" ||
        apt.paymentStatus === filterStatus;

      // Format date for better search experience
      const formattedDate = parseLocalDate(
        apt.date,
      ).toLocaleDateString();

      const matchesSearch =
        apt.id
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        apt.customerName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        apt.service
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        apt.barber
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        apt.date.includes(searchTerm) ||
        formattedDate
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        apt.time
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        apt.price.toString().includes(searchTerm) ||
        apt.paymentReference
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesBarber =
        filterBarber === "all" || apt.barber === filterBarber;

      return (
        hasPayment &&
        matchesStatus &&
        matchesSearch &&
        matchesBarber
      );
    });

  const pendingCount = appointmentsWithPaymentData.filter(
    (apt) =>
      (apt.payment || apt.paymentProof || apt.paymentStatus === 'pending') &&
      apt.paymentStatus === "pending",
  ).length;

  const verifiedCount = appointmentsWithPaymentData.filter(
    (apt) =>
      (apt.payment || apt.paymentProof) &&
      apt.paymentStatus === "verified",
  ).length;

  const rejectedCount = appointmentsWithPaymentData.filter(
    (apt) =>
      (apt.payment || apt.paymentProof) &&
      apt.paymentStatus === "rejected",
  ).length;

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPayments = appointmentsWithPayment.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(appointmentsWithPayment.length / itemsPerPage);

  const handleViewProof = (
    appointment: AppointmentWithPayment,
  ) => {
    setSelectedAppointment(appointment);
    setIsViewDialogOpen(true);
  };

  const handleApproveClick = (
    appointment: AppointmentWithPayment,
  ) => {
    setSelectedAppointment(appointment);
    setIsApproveDialogOpen(true);
  };

  const handleRejectClick = (
    appointment: AppointmentWithPayment,
  ) => {
    setSelectedAppointment(appointment);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedAppointment) return;

    try {
      // Update appointment payment status AND appointment status in database
      // Use "paid" for payment_status - database only allows: pending, partial, paid, refunded
      // Set appointment status to "verified" when payment is approved
      const updatePayload = {
        payment_status: "paid",
        status: "verified", // Set to "verified" when payment is approved
      };



      const updatedAppointment = await API.appointments.update(
        selectedAppointment.id,
        updatePayload,
      );


      // Update payment record if it exists - only update verified_by and verified_at
      if (selectedAppointment.payment?.id) {
        try {
          await API.payments.update(
            selectedAppointment.payment.id,
            {
              verified_by:
                userRole === "admin" ? "Admin" : "Barber",
              verified_at: new Date().toISOString(),
            },
          );
        } catch (error) {
          console.warn("⚠️ Payment record update (not critical):", error);
        }
      }

      // Send direct notification to customer FIRST

      const customerId = selectedAppointment.userId || selectedAppointment.customer_id || '';


      if (customerId && currentUser) {
        try {
          const notificationPayload = {
            userId: customerId,
            userRole: 'customer', // Required field for database
            title: '✅ Payment Verified!',
            message: `Great news! Your payment of ₱${(selectedAppointment.paymentAmount || selectedAppointment.price / 2).toFixed(2)} for ${selectedAppointment.service} on ${parseLocalDate(selectedAppointment.date).toLocaleDateString()} has been verified and approved. Your booking is confirmed!`,
            type: 'booking',
            appointmentId: selectedAppointment.id,
            isRead: false,
            actionUrl: '/appointments',
            actionLabel: 'View Appointment',
          };

          const createdNotification = await API.notifications.create(notificationPayload);

        } catch (error) {
          console.error('❌ Failed to send direct approval notification:', error);
          console.error('❌ Error type:', typeof error);
          console.error('❌ Error message:', error?.message);
          console.error('❌ Error stack:', error?.stack);
          console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        }
      } else {
        console.warn('⚠️ Could not send notification - missing customerId or currentUser');
        console.warn('⚠️ customerId:', customerId);
        console.warn('⚠️ currentUser:', currentUser);
      }

      // Update local state with "verified" for UI display (mapped from "paid")
      onUpdateAppointment(selectedAppointment.id, {
        paymentStatus: "verified",
        status: "verified", // Match database status
        paymentVerifiedAt: new Date().toISOString(),
        paymentVerifiedBy:
          userRole === "admin" ? "Admin" : "Barber",
      });

      toast.success(
        `Payment approved for ${selectedAppointment.customerName}'s appointment`,
        {
          description:
            "Appointment verified. Customer will be notified.",
        },
      );

      // Create audit log and notification for customer using the new audit service

      if (currentUser) {
        await logPaymentVerification(
          currentUser.id,
          currentUser.name,
          currentUser.email,
          selectedAppointment.id,
          "approved",
          {
            customerId:
              selectedAppointment.userId ||
              selectedAppointment.customer_id ||
              "",
            customerName: selectedAppointment.customerName || "",
            service: selectedAppointment.service,
            barber: selectedAppointment.barber,
            barberId:
              selectedAppointment.barberId ||
              selectedAppointment.barber_id ||
              "",
            date: selectedAppointment.date,
            time: selectedAppointment.time,
            amount:
              selectedAppointment.paymentAmount ||
              selectedAppointment.price / 2,
          }
        );

      }

      // Trigger appointment refresh in parent component FIRST and wait for it
      if (onRefreshAppointments) {
        await onRefreshAppointments();
      }

      // Then refresh local payment data
      await fetchPayments(true);

      setIsApproveDialogOpen(false);
      setIsViewDialogOpen(false);
      setSelectedAppointment(null);
    } catch (error: any) {
      console.error("❌ Error approving payment:", error);
      console.error(
        "❌ Error details:",
        error.message || error,
      );
      console.error(
        "❌ Full error object:",
        JSON.stringify(error, null, 2),
      );
      toast.error(
        `Failed to approve payment: ${error.message || "Unknown error"}`,
      );
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedAppointment || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      // Update appointment with rejection - set status to "rejected" and payment_status to "pending"
      // This allows customer to see it was rejected but can resubmit payment
      const updatedAppointment = await API.appointments.update(
        selectedAppointment.id,
        {
          status: "rejected", // Change appointment status to rejected
          payment_status: "pending", // Reset payment status so they can resubmit
          notes: `Payment rejected: ${rejectionReason}`,
        },
      );



      // Update payment record if it exists
      if (selectedAppointment.payment?.id) {
        try {
          await API.payments.update(
            selectedAppointment.payment.id,
            {
              verified_by:
                userRole === "admin" ? "Admin" : "Barber",
              verified_at: new Date().toISOString(),
              notes: rejectionReason,
            },
          );
        } catch (error) {
          console.warn(
            "⚠ Payment record update failed (not critical):",
            error,
          );
        }
      }

      // Send direct notification to customer FIRST

      const customerId = selectedAppointment.userId || selectedAppointment.customer_id || '';
      if (customerId && currentUser) {
        try {
          const notificationPayload = {
            userId: customerId,
            userRole: 'customer', // Required field for database
            title: '❌ Payment Rejected',
            message: `Your payment proof for ${selectedAppointment.service} on ${parseLocalDate(selectedAppointment.date).toLocaleDateString()} was rejected. Reason: ${rejectionReason}. Please upload a new payment proof to confirm your booking.`,
            type: 'booking',
            appointmentId: selectedAppointment.id,
            isRead: false,
            actionUrl: '/appointments',
            actionLabel: 'View Appointment',
          };

          await API.notifications.create(notificationPayload);

        } catch (error) {
          console.error('❌ Failed to send direct rejection notification:', error);
        }
      } else {
        console.warn('⚠️ Could not send notification - missing customerId or currentUser');
      }

      // Update local state - show as rejected
      onUpdateAppointment(selectedAppointment.id, {
        status: "rejected", // Update appointment status to rejected
        paymentStatus: "rejected", // Also mark payment as rejected for UI
        paymentVerifiedAt: new Date().toISOString(),
        paymentVerifiedBy:
          userRole === "admin" ? "Admin" : "Barber",
        rejectionReason: rejectionReason,
      });

      toast.error(
        `Payment rejected for ${selectedAppointment.customerName}'s appointment`,
        {
          description:
            "Customer will be notified to resubmit payment proof",
        },
      );

      // Create audit log and notification for customer using the new audit service

      if (currentUser) {
        await logPaymentVerification(
          currentUser.id,
          currentUser.name,
          currentUser.email,
          selectedAppointment.id,
          "rejected",
          {
            customerId:
              selectedAppointment.userId ||
              selectedAppointment.customer_id ||
              "",
            customerName: selectedAppointment.customerName || "",
            service: selectedAppointment.service,
            barber: selectedAppointment.barber,
            barberId:
              selectedAppointment.barberId ||
              selectedAppointment.barber_id ||
              "",
            date: selectedAppointment.date,
            time: selectedAppointment.time,
            amount:
              selectedAppointment.paymentAmount ||
              selectedAppointment.price / 2,
          },
          rejectionReason
        );

      }

      // Trigger appointment refresh in parent component FIRST and wait for it
      if (onRefreshAppointments) {
        await onRefreshAppointments();
      }

      // Then refresh local payment data
      await fetchPayments(true);

      setIsRejectDialogOpen(false);
      setIsViewDialogOpen(false);
      setSelectedAppointment(null);
    } catch (error: any) {
      console.error("❌ Error rejecting payment:", error);
      console.error(
        "❌ Error details:",
        error.message || error,
      );
      toast.error(
        `Failed to reject payment: ${error.message || "Unknown error"}`,
      );
    }
  };

  const handleExportPayments = () => {
    if (appointmentsWithPayment.length === 0) {
      toast.error("No payment data to export");
      return;
    }

    const exportData = appointmentsWithPayment.map((apt) => ({
      "Appointment ID": apt.id.substring(0, 8),
      Customer: apt.customerName || "Unknown",
      Service: apt.service,
      Barber: apt.barber,
      Date: formatDateForExport(apt.date),
      Time: apt.time,
      "Payment Amount": formatCurrencyForExport(
        apt.paymentAmount || apt.price / 2
      ),
      "Total Price": formatCurrencyForExport(apt.price),
      "Payment Method": apt.paymentMethod || "N/A",
      "Payment Type": apt.paymentType || "downpayment",
      "Payment Status": apt.paymentStatus || "pending",
      Reference: apt.paymentReference || "N/A",
    }));

    exportToCSV(
      exportData,
      [
        "Appointment ID",
        "Customer",
        "Service",
        "Barber",
        "Date",
        "Time",
        "Payment Amount",
        "Total Price",
        "Payment Method",
        "Payment Type",
        "Payment Status",
        "Reference",
      ],
      "supremo-barber-payments"
    );

    toast.success(
      `Exported ${appointmentsWithPayment.length} payment records successfully!`
    );
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: {
        label: "Pending",
        className:
          "bg-yellow-100 text-yellow-700 border-yellow-300",
        icon: Clock,
      },
      verified: {
        label: "Verified",
        className:
          "bg-green-100 text-green-700 border-green-300",
        icon: CheckCircle2,
      },
      rejected: {
        label: "Rejected",
        className: "bg-red-100 text-red-700 border-red-300",
        icon: XCircle,
      },
    };

    const statusConfig = config[status as keyof typeof config];
    const Icon = statusConfig?.icon || Clock;

    return (
      <Badge
        variant="outline"
        className={statusConfig?.className || ""}
      >
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig?.label || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#DB9D47]" />
        <span className="ml-3 text-[#5C4A3A]">
          Loading payment data...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-[#DB9D47] bg-[#FBF7EF]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-[#87765E]">
                  All
                </p>
                <p className="text-2xl md:text-3xl text-[#5C4A3A]">
                  {pendingCount + verifiedCount + rejectedCount}
                </p>
              </div>
              <FileText className="w-8 h-8 md:w-10 md:h-10 text-[#DB9D47]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-yellow-700">
                  Pending
                </p>
                <p className="text-2xl md:text-3xl text-yellow-900">
                  {pendingCount}
                </p>
              </div>
              <Clock className="w-8 h-8 md:w-10 md:h-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-green-700">
                  Verified
                </p>
                <p className="text-2xl md:text-3xl text-green-900">
                  {verifiedCount}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-red-700">
                  Rejected
                </p>
                <p className="text-2xl md:text-3xl text-red-900">
                  {rejectedCount}
                </p>
              </div>
              <XCircle className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
            <div>
              <CardTitle className="text-[#5C4A3A] text-base md:text-lg flex items-center gap-2">
                Payment Verification
                {isRefreshing && (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#DB9D47]" />
                )}
              </CardTitle>
              <CardDescription className="text-[#87765E] text-xs md:text-sm">
                Review and verify customer payment proofs from
                database
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPayments(true)}
                disabled={isRefreshing}
                className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span className="ml-2 hidden sm:inline">
                  Refresh
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPayments}
                className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white"
              >
                <Download className="w-4 h-4" />
                <span className="ml-2 hidden sm:inline">
                  Export CSV
                </span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Filter Tabs */}
          <Tabs
            value={filterStatus}
            onValueChange={(value: any) =>
              setFilterStatus(value)
            }
            className="mb-4 md:mb-6"
          >
            <TabsList className="grid w-full grid-cols-4 bg-[#FBF7EF]">
              <TabsTrigger
                value="all"
                className="text-xs md:text-sm"
              >
                All (
                {
                  appointmentsWithPaymentData.filter(
                    (apt) => apt.payment || apt.paymentProof,
                  ).length
                }
                )
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="text-xs md:text-sm"
              >
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger
                value="verified"
                className="text-xs md:text-sm"
              >
                Verified ({verifiedCount})
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="text-xs md:text-sm"
              >
                Rejected ({rejectedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search and Filter Row */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#87765E] w-4 h-4" />
              <Input
                placeholder="Search payments by customer, service, reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#E8DCC8] text-sm"
              />
            </div>
            <Select
              value={filterBarber}
              onValueChange={setFilterBarber}
            >
              <SelectTrigger className="w-full md:w-48 border-[#E8DCC8] text-sm">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by barber" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Barbers</SelectItem>
                {barbers.map((barber) => (
                  <SelectItem key={barber} value={barber}>
                    {barber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Count */}
          <div className="mb-4 md:mb-6 text-sm text-[#87765E]">
            Showing: {appointmentsWithPayment.length} payment
            {appointmentsWithPayment.length !== 1 ? "s" : ""}
          </div>

          {/* Table */}
          {appointmentsWithPayment.length === 0 ? (
            <div className="text-center py-12 bg-[#FBF7EF] rounded-lg">
              <FileText className="w-16 h-16 text-[#87765E] mx-auto mb-4" />
              <p className="text-[#5C4A3A] mb-2">
                No payment proofs to review
              </p>
              <p className="text-sm text-[#87765E]">
                {filterStatus === "pending"
                  ? "All pending payments have been processed"
                  : `No ${filterStatus} payments found`}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-[#E8DCC8] overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FBF7EF]">
                    <TableHead className="text-[#5C4A3A] text-xs md:text-sm">
                      Customer
                    </TableHead>
                    <TableHead className="text-[#5C4A3A] text-xs md:text-sm hidden lg:table-cell">
                      Service
                    </TableHead>
                    <TableHead className="text-[#5C4A3A] text-xs md:text-sm hidden md:table-cell">
                      Barber
                    </TableHead>
                    <TableHead className="text-[#5C4A3A] text-xs md:text-sm">
                      Date
                    </TableHead>
                    <TableHead className="text-[#5C4A3A] text-xs md:text-sm hidden sm:table-cell">
                      Balance
                    </TableHead>
                    <TableHead className="text-[#5C4A3A] text-xs md:text-sm hidden xl:table-cell">
                      Total Price
                    </TableHead>
                    <TableHead className="text-[#5C4A3A] text-xs md:text-sm">
                      Status
                    </TableHead>
                    <TableHead className="text-[#5C4A3A] text-xs md:text-sm">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPayments.map(
                    (appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div className="flex items-center gap-1 md:gap-2">
                            <User className="w-3 h-3 md:w-4 md:h-4 text-[#87765E] hidden sm:block" />
                            <span className="text-[#5C4A3A] text-xs md:text-sm truncate max-w-[100px] md:max-w-none">
                              {appointment.customerName ||
                                "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <Scissors className="w-4 h-4 text-[#87765E]" />
                            <span className="text-[#5C4A3A] text-sm">
                              {appointment.service}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#5C4A3A] text-xs hidden md:table-cell">
                          {appointment.barber}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs md:text-sm whitespace-nowrap">
                            <div className="text-[#5C4A3A]">
                              {parseLocalDate(
                                appointment.date,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                            <div className="text-[#87765E] text-[10px] md:text-xs">
                              {appointment.time}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="text-xs md:text-sm">
                            <div className="text-[#5C4A3A]">
                              ₱
                              {appointment.paymentAmount?.toFixed(
                                2,
                              ) ||
                                (appointment.price / 2).toFixed(
                                  2,
                                )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="text-xs text-[#5C4A3A]">
                            ₱
                            {appointment.price?.toFixed(2) ||
                              "0.00"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(
                            appointment.paymentStatus ||
                            "pending",
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleViewProof(appointment)
                              }
                              className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white h-7 md:h-8 px-1.5 md:px-2"
                            >
                              <Eye className="w-3 h-3 md:w-4 md:h-4" />
                              <span className="hidden lg:inline ml-1 text-xs">
                                View
                              </span>
                            </Button>
                            {appointment.paymentStatus ===
                              "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleApproveClick(
                                        appointment,
                                      )
                                    }
                                    className="bg-green-600 hover:bg-green-700 text-white h-7 md:h-8 px-1.5 md:px-2"
                                  >
                                    <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="hidden lg:inline ml-1 text-xs">
                                      Approve
                                    </span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleRejectClick(
                                        appointment,
                                      )
                                    }
                                    className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white h-7 md:h-8 px-1.5 md:px-2"
                                  >
                                    <XCircle className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="hidden lg:inline ml-1 text-xs">
                                      Reject
                                    </span>
                                  </Button>
                                </>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Payment Proof Dialog */}
      <Dialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-[#5C4A3A]">
              Payment Proof Details
            </DialogTitle>
            <DialogDescription className="text-[#87765E]">
              Review the payment proof and appointment details
              from database
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6">
              {/* Appointment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#FBF7EF] rounded-lg">
                <div>
                  <p className="text-sm text-[#87765E]">
                    Customer
                  </p>
                  <p className="text-[#5C4A3A]">
                    {selectedAppointment.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#87765E]">
                    Service
                  </p>
                  <p className="text-[#5C4A3A]">
                    {selectedAppointment.service}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#87765E]">
                    Barber
                  </p>
                  <p className="text-[#5C4A3A]">
                    {selectedAppointment.barber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#87765E]">
                    Date & Time
                  </p>
                  <p className="text-[#5C4A3A]">
                    {parseLocalDate(
                      selectedAppointment.date,
                    ).toLocaleDateString()}{" "}
                    at {selectedAppointment.time}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#87765E]">
                    Total Service Price
                  </p>
                  <p className="text-[#5C4A3A]">
                    ₱{selectedAppointment.price.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#87765E]">
                    Payment Amount
                  </p>
                  <p className="text-[#5C4A3A] font-bold">
                    ₱
                    {(
                      selectedAppointment.paymentAmount ||
                      selectedAppointment.price / 2
                    ).toFixed(2)}
                  </p>
                  <p className="text-xs text-[#87765E]">
                    {selectedAppointment.paymentType === "full"
                      ? "Full Payment"
                      : selectedAppointment.paymentType ===
                        "remaining"
                        ? "Remaining Balance"
                        : "50% Down Payment"}
                  </p>
                </div>
                {selectedAppointment.paymentReference && (
                  <div>
                    <p className="text-sm text-[#87765E]">
                      Reference Number
                    </p>
                    <p className="text-[#5C4A3A] font-mono text-sm">
                      {selectedAppointment.paymentReference}
                    </p>
                  </div>
                )}
                {selectedAppointment.paymentMethod && (
                  <div>
                    <p className="text-sm text-[#87765E]">
                      Payment Method
                    </p>
                    <p className="text-[#5C4A3A] uppercase">
                      {selectedAppointment.paymentMethod}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-[#87765E]">
                    Payment Status
                  </p>
                  {getStatusBadge(
                    selectedAppointment.paymentStatus ||
                    "pending",
                  )}
                </div>
                {selectedAppointment.payment?.verified_by && (
                  <div>
                    <p className="text-sm text-[#87765E]">
                      Verified By
                    </p>
                    <p className="text-[#5C4A3A]">
                      {selectedAppointment.payment.verified_by}
                    </p>
                    {selectedAppointment.payment
                      .verified_at && (
                        <p className="text-xs text-[#87765E]">
                          {new Date(
                            selectedAppointment.payment.verified_at,
                          ).toLocaleString()}
                        </p>
                      )}
                  </div>
                )}
              </div>

              {/* Payment Proof Image */}
              <div>
                <p className="text-sm text-[#87765E] mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Payment Proof from Cloudflare R2
                </p>
                {selectedAppointment.paymentProof ? (
                  <div className="border border-[#E8DCC8] rounded-lg overflow-hidden">
                    <img
                      src={selectedAppointment.paymentProof}
                      alt="Payment Proof"
                      className="w-full h-auto max-h-[400px] object-contain bg-gray-50"
                      onError={(e) => {
                        console.error(
                          "Failed to load image:",
                          selectedAppointment.paymentProof,
                        );
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center border border-[#E8DCC8] rounded-lg bg-[#FBF7EF]">
                    <AlertCircle className="w-12 h-12 text-[#87765E] mx-auto mb-2" />
                    <p className="text-[#87765E]">
                      No payment proof uploaded
                    </p>
                  </div>
                )}
              </div>

              {/* Rejection Notes */}
              {selectedAppointment.paymentStatus ===
                "rejected" &&
                (selectedAppointment.payment?.notes ||
                  selectedAppointment.rejectionReason) && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 font-medium mb-1">
                      Rejection Reason:
                    </p>
                    <p className="text-sm text-red-600">
                      {selectedAppointment.payment?.notes ||
                        selectedAppointment.rejectionReason}
                    </p>
                  </div>
                )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                {selectedAppointment.paymentStatus ===
                  "pending" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsViewDialogOpen(false)}
                      className="border-[#E8DCC8] text-[#5C4A3A]"
                    >
                      Close
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        handleRejectClick(selectedAppointment);
                      }}
                      className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        handleApproveClick(selectedAppointment);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                    className="border-[#E8DCC8] text-[#5C4A3A]"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#5C4A3A]">
              Approve Payment?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#87765E]">
              Are you sure you want to approve this payment? The
              customer will be notified and their booking will
              be confirmed.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedAppointment && (
            <div className="mt-4 p-3 bg-[#FBF7EF] rounded-lg space-y-1 text-sm">
              <p className="text-[#5C4A3A]">
                <span className="text-[#87765E]">
                  Customer:
                </span>{" "}
                {selectedAppointment.customerName}
              </p>
              <p className="text-[#5C4A3A]">
                <span className="text-[#87765E]">Service:</span>{" "}
                {selectedAppointment.service}
              </p>
              <p className="text-[#5C4A3A]">
                <span className="text-[#87765E]">Amount:</span>{" "}
                ₱
                {(
                  selectedAppointment.paymentAmount ||
                  selectedAppointment.price / 2
                ).toFixed(2)}
              </p>
              {selectedAppointment.paymentReference && (
                <p className="text-[#5C4A3A]">
                  <span className="text-[#87765E]">
                    Reference:
                  </span>{" "}
                  {selectedAppointment.paymentReference}
                </p>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E8DCC8] text-[#5C4A3A]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmApprove}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#5C4A3A]">
              Reject Payment?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#87765E]">
              Please provide a reason for rejecting this
              payment. The customer will be notified and asked
              to resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="rejection-reason"
                className="text-[#5C4A3A]"
              >
                Rejection Reason *
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., Payment proof is blurry, wrong amount, incorrect reference number, etc."
                value={rejectionReason}
                onChange={(e) =>
                  setRejectionReason(e.target.value)
                }
                className="mt-2 border-[#E8DCC8]"
                rows={4}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E8DCC8] text-[#5C4A3A]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination */}
      {appointmentsWithPayment.length > 0 && (
        <Pagination
          totalItems={appointmentsWithPayment.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newSize) => {
            setItemsPerPage(newSize);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
}