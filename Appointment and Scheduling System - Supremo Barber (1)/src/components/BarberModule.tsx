import { useState, useEffect } from "react";
import API from "../services/api.service";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Calendar } from "./ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Scissors, Star, Award, TrendingUp, Search, Edit, Trash2, Calendar as CalendarIcon, Filter, Download, UserCog, Key, Eye, EyeOff } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { toast } from "sonner";
import type { Appointment } from "../App";
import { exportToCSV } from "./utils/exportUtils";
import { PasswordConfirmationDialog } from "./PasswordConfirmationDialog";
import { PasswordInput as StrongPasswordInput, ConfirmPasswordInput } from "./ui/PasswordInput";
import type { PasswordStrength } from "@/utils/passwordValidator";
import { Pagination } from "./ui/pagination";

interface Barber {
  id: string;
  name: string;
  specialty: string;
  totalBookings: number;
  rating: number;
  status: "active" | "on-leave" | "inactive";
  email?: string;
  phone?: string;
  password?: string;
}

interface BarberModuleProps {
  appointments: Appointment[];
}

export function BarberModule({ appointments }: BarberModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [newBarber, setNewBarber] = useState({ name: "", email: "", phone: "", specialty: "" });
  const [addFormErrors, setAddFormErrors] = useState<{ name?: string; email?: string; phone?: string; specialty?: string }>({});
  const [expandedBarberId, setExpandedBarberId] = useState<string | null>(null);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [resetPasswordBarber, setResetPasswordBarber] = useState<Barber | null>(null);
  const [newPassword, setNewPassword] = useState("SupremoBarber2024");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordConfirmation, setPasswordConfirmation] = useState<{
    isOpen: boolean;
    action: 'delete' | 'edit' | 'reset-password' | null;
    barberId: string | null;
    barberName: string | null;
  }>({
    isOpen: false,
    action: null,
    barberId: null,
    barberName: null,
  });
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch barbers from database
  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        setIsLoading(true);
        const barbersData = await API.barbers.getAll();

        // Transform barbers data to match UI format and calculate stats from appointments
        const transformedBarbers: Barber[] = barbersData.map(barber => {
          const barberAppointments = appointments.filter(apt => apt.barber === barber.name);
          const completedAppointments = barberAppointments.filter(apt => apt.status === 'completed');

          // Extract specialty from specialties array (first item or default)
          const specialty = Array.isArray(barber.specialties) && barber.specialties.length > 0
            ? barber.specialties[0]
            : 'Barber Specialist';


          // Calculate average rating from reviews or use default
          const rating = barber.rating || 5.0;

          return {
            id: barber.user_id,
            name: barber.name,
            email: barber.email,
            phone: barber.phone,
            specialty: specialty,
            totalBookings: barberAppointments.length,
            rating: rating,
            status: 'active',
          };
        });

        setBarbers(transformedBarbers);
      } catch (error) {
        console.error('Error fetching barbers:', error);
        setBarbers([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBarbers();
  }, [appointments]);

  // Calculate analytics from real barber data
  const mostBookedBarber = barbers.length > 0
    ? barbers.reduce((max, barber) => barber.totalBookings > max.totalBookings ? barber : max, barbers[0])
    : null;

  const analytics = {
    mostBookedBarber: mostBookedBarber?.name || 'N/A',
    totalBookings: barbers.reduce((sum, b) => sum + b.totalBookings, 0),
    averageRating: barbers.length > 0
      ? barbers.reduce((sum, b) => sum + b.rating, 0) / barbers.length
      : 0,
    activeBarbers: barbers.filter(b => b.status === 'active').length,
  };

  const filteredBarbers = barbers.filter((barber) => {
    const matchesSearch =
      (barber.id?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (barber.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (barber.specialty?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (barber.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (barber.totalBookings?.toString() || '').includes(searchQuery) ||
      (barber.rating?.toString() || '').includes(searchQuery);
    const matchesStatus = filterStatus === "all" || barber.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "on-leave":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "inactive":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Generate simple credentials from barber name
  const generateCredentials = () => {
    const rawFirst = newBarber.name.trim().split(/\s+/)[0]?.toLowerCase() || 'barber';
    const firstName = rawFirst.replace(/[^a-z0-9_-]/g, ''); // Only allowed chars
    const idNumber = String(barbers.length + 1).padStart(3, '0');
    const username = `${firstName}_barber${idNumber}`;
    const password = `Supremo${idNumber}`;
    return { username, password, idNumber };
  };

  // Validate a single field
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'email': {
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email';
        return '';
      }
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!/^\+?[0-9\s]{7,15}$/.test(value.replace(/[\s]/g, ''))) return 'Enter a valid phone number (digits only)';
        return '';
      case 'specialty':
        if (!value.trim()) return 'Specialty is required';
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (field: keyof typeof newBarber, value: string) => {
    setNewBarber(prev => ({ ...prev, [field]: value }));
    // Clear error on change (validate on blur)
    if (addFormErrors[field]) {
      setAddFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFieldBlur = (field: keyof typeof newBarber) => {
    const error = validateField(field, newBarber[field]);
    setAddFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleAddBarber = async () => {
    // Validate all fields
    const errors: typeof addFormErrors = {
      name: validateField('name', newBarber.name),
      email: validateField('email', newBarber.email),
      phone: validateField('phone', newBarber.phone),
      specialty: validateField('specialty', newBarber.specialty),
    };
    setAddFormErrors(errors);

    if (Object.values(errors).some(e => e)) {
      toast.error('Please fix the errors above');
      return;
    }

    const { username, password } = generateCredentials();

    try {
      // Step 1: Create user account with role 'barber'
      const userResponse = await API.auth.register({
        name: newBarber.name,
        email: newBarber.email,
        username,
        password,
        phone: newBarber.phone,
        role: 'barber',
      });

      // Step 2: Create barber profile linked to the user
      await API.barbers.create({
        user_id: userResponse.user.id,
        specialties: [newBarber.specialty],
        rating: 5.0,
        available_hours: {},
      });

      // Step 3: Send in-app notification with credentials
      try {
        await API.notifications.create({
          userId: userResponse.user.id,
          userRole: 'barber',
          title: '🎉 Welcome to Supremo Barbers!',
          message: `Your barber account has been created.\n\nUsername: ${username}\nPassword: ${password}\n\nPlease change your password after your first login.`,
          type: 'system',
          isRead: false,
        });
      } catch (notifError) {
        console.warn('Could not send in-app notification:', notifError);
      }

      // Step 4: Send credentials email to barber
      try {
        const SUPABASE_URL = `https://${projectId}.supabase.co`;
        fetch(`${SUPABASE_URL}/functions/v1/make-server-70e1fc66/api/email/send-security-alert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey,
          },
          body: JSON.stringify({
            to: newBarber.email,
            name: newBarber.name,
            type: 'welcome_barber',
            details: { username, password, timestamp: new Date().toISOString() },
          }),
        }).catch((err) => console.warn('Email send failed:', err));
      } catch {}

      toast.success(
        `Barber ${newBarber.name} added successfully!`,
        {
          description: `Username: ${username} | Password: ${password}\nCredentials sent to barber's notification inbox.`,
          duration: 15000,
        }
      );
      setNewBarber({ name: "", email: "", phone: "", specialty: "" });
      setAddFormErrors({});
      setIsAddDialogOpen(false);

      // Refetch barbers
      const users = await API.barbers.getAll();
      const transformedBarbers: Barber[] = users.map(user => {
        const barberAppointments = appointments.filter(apt => apt.barber === user.name);
        const specialty = Array.isArray(user.specialties) && user.specialties.length > 0
          ? user.specialties[0]
          : 'Barber Specialist';

        return {
          id: user.user_id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          specialty: specialty,
          totalBookings: barberAppointments.length,
          rating: user.rating || 5.0,
          status: 'active',
        };
      });
      setBarbers(transformedBarbers);
    } catch (error) {
      console.error('Error adding barber:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add barber';
      if (errorMessage.includes('already been registered') || errorMessage.includes('already exists')) {
        toast.error('A user with this email already exists. Please use a different email.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleEditBarber = (barberId: string) => {
    const barber = barbers.find(b => b.id === barberId);
    if (barber) {
      setPasswordConfirmation({
        isOpen: true,
        action: 'edit',
        barberId: barber.id,
        barberName: barber.name,
      });
    }
  };

  const confirmEditBarber = () => {
    if (passwordConfirmation.barberId) {
      const barber = barbers.find(b => b.id === passwordConfirmation.barberId);
      if (barber) {
        setEditingBarber(barber);
        setIsEditDialogOpen(true);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingBarber) return;

    if (!editingBarber.name || !editingBarber.specialty) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Update user name in users table
      await API.users.update(editingBarber.id, {
        name: editingBarber.name,
      });

      // Update barber-specific fields in barbers table
      // Note: We need to find the barber record ID, not the user ID
      const barbersData = await API.barbers.getAll();
      const barberRecord = barbersData.find(b => b.user_id === editingBarber.id);

      if (barberRecord) {
        await API.barbers.update(barberRecord.id, {
          specialties: [editingBarber.specialty],
          available_hours: {},
        });
      }

      toast.success(`Barber ${editingBarber.name} updated in database!`);
      setEditingBarber(null);
      setIsEditDialogOpen(false);

      // Refetch barbers
      const users = await API.barbers.getAll();
      const transformedBarbers: Barber[] = users.map(user => {
        const barberAppointments = appointments.filter(apt => apt.barber === user.name);
        const specialty = Array.isArray(user.specialties) && user.specialties.length > 0
          ? user.specialties[0]
          : 'Barber Specialist';

        return {
          id: user.user_id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          specialty: specialty,
          totalBookings: barberAppointments.length,
          rating: user.rating || 5.0,
          status: 'active',
        };
      });
      setBarbers(transformedBarbers);
    } catch (error) {
      console.error('Error updating barber:', error);
      toast.error('Failed to update barber in database');
    }
  };

  const handleDeleteBarber = (barberId: string, barberName: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'delete',
      barberId,
      barberName,
    });
  };

  const confirmDeleteBarber = async () => {
    if (passwordConfirmation.barberId && passwordConfirmation.barberName) {
      try {
        // Find the barber record to get the actual barber table ID
        const barbersData = await API.barbers.getAll();
        const barberRecord = barbersData.find(b => b.user_id === passwordConfirmation.barberId);

        if (barberRecord) {
          // Delete barber record
          await API.barbers.delete(barberRecord.id);
        }

        // Also delete user account
        await API.users.delete(passwordConfirmation.barberId);

        toast.success(`Deleted Successfully!`);

        // Refetch barbers
        const users = await API.barbers.getAll();
        const transformedBarbers: Barber[] = users.map(user => {
          const barberAppointments = appointments.filter(apt => apt.barber === user.name);
          const specialty = Array.isArray(user.specialties) && user.specialties.length > 0
            ? user.specialties[0]
            : 'Barber Specialist';

          return {
            id: user.user_id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            specialty: specialty,
            totalBookings: barberAppointments.length,
            rating: user.rating || 5.0,
            status: 'active',
          };
        });
        setBarbers(transformedBarbers);
      } catch (error) {
        console.error('Error deleting barber:', error);
        toast.error('Failed to delete barber from database');
      }
    }
  };

  const handleResetPassword = (barberId: string, barberName: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'reset-password',
      barberId,
      barberName,
    });
  };

  const confirmResetPassword = () => {
    if (passwordConfirmation.barberId) {
      const barber = barbers.find(b => b.id === passwordConfirmation.barberId);
      if (barber) {
        setResetPasswordBarber(barber);
        setNewPassword("SupremoBarber2024");
        setIsResetPasswordDialogOpen(true);
      }
    }
  };

  const handleSaveNewPassword = () => {
    if (!resetPasswordBarber || !newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setBarbers(prev => prev.map(b =>
      b.id === resetPasswordBarber.id ? { ...b, password: newPassword } : b
    ));

    toast.success(`Password reset successfully for ${resetPasswordBarber.name}`);
    setResetPasswordBarber(null);
    setNewPassword("SupremoBarber2024");
    setShowPassword(false);
    setIsResetPasswordDialogOpen(false);
  };

  const handleExportBarbers = () => {
    if (filteredBarbers.length === 0) {
      toast.error("No barbers to export");
      return;
    }

    const exportData = filteredBarbers.map(barber => ({
      'Barber ID': barber.id,
      'Name': barber.name,
      'Specialty': barber.specialty,
      'Email': barber.email || 'N/A',
      'Total Bookings': barber.totalBookings.toString(),
      'Rating': barber.rating.toFixed(1),
      'Status': barber.status.charAt(0).toUpperCase() + barber.status.slice(1).replace('-', ' '),
    }));

    const headers = ['Barber ID', 'Name', 'Specialty', 'Schedule', 'Total Bookings', 'Rating', 'Status'];

    exportToCSV(exportData, headers, 'supremo-barber-staff');
    toast.success(`Exported ${filteredBarbers.length} barbers successfully!`);
  };

  const totalPages = Math.ceil(filteredBarbers.length / itemsPerPage);
  const currentBarbers = filteredBarbers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#DB9D47] p-2 sm:p-2.5 rounded-lg">
              <UserCog className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{barbers.length}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Total Barbers</p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#94A670] p-2 sm:p-2.5 rounded-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{analytics.activeBarbers}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Active Barbers</p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#D98555] p-2 sm:p-2.5 rounded-lg">
              <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{analytics.totalBookings}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Total Bookings</p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#F59E0B] p-2 sm:p-2.5 rounded-lg">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{analytics.averageRating.toFixed(1)}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Average Rating</p>
        </div>
      </div>

      {/* Tabs for Table and Calendar View */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-[#5C4A3A] text-base md:text-lg">Barber Management</CardTitle>
              <CardDescription className="text-[#87765E] text-xs md:text-sm">
                Manage barbers and availability
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#DB9D47] hover:bg-[#C88A35] text-white text-xs md:text-sm px-2 md:px-4">
                    <UserCog className="w-4 h-4 mr-1.5" />
                    <span>Add Barber</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Barber</DialogTitle>
                    <DialogDescription>
                      Add a new barber to the team. Username and password are auto-generated.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="barber-name">Full Name *</Label>
                      <Input
                        id="barber-name"
                        placeholder="Carlos Mendoza"
                        value={newBarber.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        onBlur={() => handleFieldBlur('name')}
                        className={`border-[#E8DCC8] ${addFormErrors.name ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                      />
                      {addFormErrors.name && <p className="text-xs text-red-500">{addFormErrors.name}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="barber-email">Email *</Label>
                        <Input
                          id="barber-email"
                          type="email"
                          placeholder="carlos@email.com"
                          value={newBarber.email}
                          onChange={(e) => handleFieldChange('email', e.target.value)}
                          onBlur={() => handleFieldBlur('email')}
                          className={`border-[#E8DCC8] ${addFormErrors.email ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                        />
                        {addFormErrors.email && <p className="text-xs text-red-500">{addFormErrors.email}</p>}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="barber-phone">Phone Number *</Label>
                        <Input
                          id="barber-phone"
                          type="tel"
                          inputMode="numeric"
                          placeholder="09123456789"
                          value={newBarber.phone}
                          onChange={(e) => {
                            // Only allow digits and leading +
                            const filtered = e.target.value.replace(/[^0-9+]/g, '');
                            handleFieldChange('phone', filtered);
                          }}
                          onBlur={() => handleFieldBlur('phone')}
                          className={`border-[#E8DCC8] ${addFormErrors.phone ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                        />
                        {addFormErrors.phone && <p className="text-xs text-red-500">{addFormErrors.phone}</p>}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="specialty">Specialty *</Label>
                      <Input
                        id="specialty"
                        placeholder="Fade Specialist"
                        value={newBarber.specialty}
                        onChange={(e) => handleFieldChange('specialty', e.target.value)}
                        onBlur={() => handleFieldBlur('specialty')}
                        className={`border-[#E8DCC8] ${addFormErrors.specialty ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                      />
                      {addFormErrors.specialty && <p className="text-xs text-red-500">{addFormErrors.specialty}</p>}
                    </div>

                    {/* Auto-generated Credentials Preview */}
                    <div className="grid gap-2 p-3 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8]">
                      <Label className="text-xs text-[#87765E]">Auto-Generated Login Credentials</Label>
                      <p className="text-[10px] text-[#87765E] italic">Based on name and barber ID #{String(barbers.length + 1).padStart(3, '0')}</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#87765E] w-16">Username:</span>
                          <span className="text-sm text-[#5C4A3A] font-mono bg-white px-2 py-0.5 rounded border border-[#E8DCC8]">
                            {generateCredentials().username}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#87765E] w-16">Password:</span>
                          <span className="text-sm text-[#5C4A3A] font-mono bg-white px-2 py-0.5 rounded border border-[#E8DCC8]">
                            {generateCredentials().password}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                      onClick={handleAddBarber}
                    >
                      Add Barber
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                onClick={handleExportBarbers}
                variant="outline"
                className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#FBF7EF] text-xs md:text-sm px-2 md:px-4"
              >
                <Download className="w-4 h-4 mr-1.5" />
                <span>Export Report</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="mb-4 bg-[#F8F0E0] border border-[#E8DCC8]">
              <TabsTrigger
                value="table"
                className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white"
              >
                Barber List
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Schedule Calendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="space-y-3 md:space-y-4">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
                  <Input
                    placeholder="Search barbers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-[#E8DCC8] text-sm"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-48 border-[#E8DCC8] text-sm">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border border-[#E8DCC8] overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#FBF7EF]">
                      <TableHead className="text-[#5C4A3A]">Name</TableHead>
                      <TableHead className="text-[#5C4A3A] hidden xl:table-cell">Email</TableHead>
                      <TableHead className="text-[#5C4A3A] hidden sm:table-cell">Specialty</TableHead>
                      <TableHead className="text-[#5C4A3A] text-center hidden lg:table-cell">Bookings</TableHead>
                      <TableHead className="text-[#5C4A3A] text-center">Rating</TableHead>
                      <TableHead className="text-[#5C4A3A] hidden md:table-cell">Status</TableHead>
                      <TableHead className="text-[#5C4A3A] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentBarbers.map((barber) => (
                      <TableRow key={barber.id} className="hover:bg-[#FBF7EF]">
                        <TableCell className="text-[#5C4A3A]">
                          <div>
                            {barber.name}
                            <div className="sm:hidden text-xs text-[#87765E] mt-1">{barber.specialty}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#87765E] hidden xl:table-cell">
                          <span className="font-mono text-xs">{barber.email || 'N/A'}</span>
                        </TableCell>
                        <TableCell className="text-[#87765E] hidden sm:table-cell">{barber.specialty}</TableCell>
                        <TableCell className="text-center text-[#5C4A3A] hidden lg:table-cell">
                          {barber.totalBookings}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-[#5C4A3A]">{barber.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className={getStatusColor(barber.status)}>
                            {barber.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#8B7355] hover:text-[#6B5345] hover:bg-[#FBF7EF] h-8 w-8 sm:w-auto p-0 sm:px-2"
                                  onClick={() => handleResetPassword(barber.id, barber.name)}
                                >
                                  <Key className="w-4 h-4 sm:mr-1" />
                                  <span className="hidden sm:inline text-xs">Reset</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reset barber password</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#DB9D47] hover:text-[#C88A35] hover:bg-[#FBF7EF] h-8 w-8 sm:w-auto p-0 sm:px-2"
                                  onClick={() => handleEditBarber(barber.id)}
                                >
                                  <Edit className="w-4 h-4 sm:mr-1" />
                                  <span className="hidden sm:inline text-xs">Edit</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit barber details</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#E57373] hover:text-[#D32F2F] hover:bg-[#FBF7EF] h-8 w-8 sm:w-auto p-0 sm:px-2"
                                  onClick={() => handleDeleteBarber(barber.id, barber.name)}
                                >
                                  <Trash2 className="w-4 h-4 sm:mr-1" />
                                  <span className="hidden sm:inline text-xs">Delete</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove barber permanently</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                totalItems={filteredBarbers.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(newSize) => {
                  setItemsPerPage(newSize);
                  setCurrentPage(1);
                }}
              />
            </TabsContent>

            <TabsContent value="calendar">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <Card className="border-[#E8DCC8]">
                    <CardHeader>
                      <CardTitle className="text-[#5C4A3A]">Select Date</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md border border-[#E8DCC8]"
                      />
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-2">
                  <Card className="border-[#E8DCC8]">
                    <CardHeader>
                      <CardTitle className="text-[#5C4A3A]">
                        Schedule for {selectedDate?.toLocaleDateString()}
                      </CardTitle>
                      <CardDescription className="text-[#87765E]">
                        View all barber schedules for the selected day
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 styled-scrollbar">
                        {barbers
                          .filter((b) => b.status === "active")
                          .map((barber) => {
                            const barberBookings = appointments.filter(a =>
                              (a.barber === barber.name || a.barberId === barber.id) &&
                              a.date === (selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : '') &&
                              (a.status === 'pending' || a.status === 'confirmed')
                            ).sort((a, b) => {
                              const matchA = (a.time || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
                              const matchB = (b.time || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
                              const timeA = matchA ? (parseInt(matchA[1]) % 12 + (matchA[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + parseInt(matchA[2]) : 0;
                              const timeB = matchB ? (parseInt(matchB[1]) % 12 + (matchB[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + parseInt(matchB[2]) : 0;
                              return timeA - timeB;
                            });

                            const isExpanded = expandedBarberId === barber.id;

                            return (
                              <div
                                key={barber.id}
                                onClick={() => setExpandedBarberId(isExpanded ? null : barber.id)}
                                className={`flex flex-col p-4 rounded-lg bg-[#FBF7EF] border cursor-pointer transition-all duration-200 hover:shadow-md ${isExpanded ? 'border-[#DB9D47] shadow-sm' : 'border-[#E8DCC8]'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#DB9D47] to-[#D98555] flex items-center justify-center text-white shadow-inner">
                                      {barber.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </div>
                                    <div>
                                      <p className="text-[#5C4A3A] font-medium group-hover:text-[#DB9D47] transition-colors">{barber.name}</p>
                                      <p className="text-sm text-[#87765E]">{barber.specialty}</p>
                                    </div>
                                  </div>
                                  <div className="text-right flex flex-col items-end">
                                    <Badge variant="outline" className={`mt-1 font-medium ${barberBookings.length > 0 ? 'bg-orange-50 text-[#DB9D47] border-[#DB9D47]/30' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                      {barberBookings.length} {barberBookings.length === 1 ? 'booking' : 'bookings'}
                                    </Badge>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="mt-4 pt-4 border-t border-[#E8DCC8]/60 animate-in slide-in-from-top-2 fade-in duration-200">
                                    {/* Barber Contact/Info Details */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div className="bg-white p-3 border border-[#E8DCC8] rounded-md">
                                        <p className="text-xs text-[#87765E] uppercase tracking-wide mb-1">Email Contact</p>
                                        <p className="text-sm text-[#5C4A3A] font-medium truncate">{barber.email || 'No email provided'}</p>
                                      </div>
                                      <div className="bg-white p-3 border border-[#E8DCC8] rounded-md">
                                        <p className="text-xs text-[#87765E] uppercase tracking-wide mb-1">Current Rating</p>
                                        <div className="flex items-center gap-1">
                                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                          <span className="text-sm text-[#5C4A3A] font-medium">{barber.rating.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Bookings Timeline */}
                                    {barberBookings.length > 0 ? (
                                      <>
                                        <p className="text-xs font-semibold text-[#87765E] uppercase tracking-wider mb-3">Today's Booked Slots</p>
                                        <div className="flex flex-wrap gap-2">
                                          {barberBookings.map((booking, idx) => (
                                            <div key={idx} className="flex items-center bg-white border border-[#E8DCC8] rounded-md px-3 py-1.5 space-x-2 shadow-sm transition-transform hover:scale-105">
                                              <div className="w-2 h-2 rounded-full bg-[#DB9D47] animate-pulse"></div>
                                              <span className="text-sm text-[#5C4A3A] font-medium">{booking.time}</span>
                                              <span className="text-xs text-[#87765E] bg-gray-50 px-1.5 py-0.5 rounded">({booking.duration}m)</span>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center py-6 bg-white border border-[#E8DCC8] border-dashed rounded-md">
                                        <CalendarIcon className="w-8 h-8 text-gray-300 mb-2" />
                                        <p className="text-sm font-medium text-[#87765E]">No bookings for this date.</p>
                                        <p className="text-xs text-gray-400">This barber is completely free today.</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Barber Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Barber</DialogTitle>
            <DialogDescription>
              Update barber information
            </DialogDescription>
          </DialogHeader>
          {editingBarber && (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-barber-name">Full Name</Label>
                  <Input
                    id="edit-barber-name"
                    placeholder="Carlos Mendoza"
                    value={editingBarber.name}
                    onChange={(e) => setEditingBarber({ ...editingBarber, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-specialty">Specialty</Label>
                  <Input
                    id="edit-specialty"
                    placeholder="Fade Specialist"
                    value={editingBarber.specialty}
                    onChange={(e) => setEditingBarber({ ...editingBarber, specialty: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingBarber(null);
                }}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                  onClick={handleSaveEdit}
                >
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Reset Barber Password</DialogTitle>
            <DialogDescription>
              Reset password for {resetPasswordBarber?.name}
            </DialogDescription>
          </DialogHeader>
          {resetPasswordBarber && (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2 p-3 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8]">
                  <Label className="text-xs text-[#87765E]">Account Information</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#87765E]">Name:</span>
                      <span className="text-sm text-[#5C4A3A]">
                        {resetPasswordBarber.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#87765E]">Email:</span>
                      <span className="text-sm text-[#5C4A3A] font-mono">
                        {resetPasswordBarber.email}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <StrongPasswordInput
                    label=""
                    id="new-password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(value) => setNewPassword(value)}
                    showStrength={true}
                    userName={resetPasswordBarber.name}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setIsResetPasswordDialogOpen(false);
                  setResetPasswordBarber(null);
                  setNewPassword("SupremoBarber2024");
                  setShowPassword(false);
                }}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                  onClick={handleSaveNewPassword}
                >
                  Reset Password
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Confirmation Dialog */}
      <PasswordConfirmationDialog
        isOpen={passwordConfirmation.isOpen}
        onClose={() =>
          setPasswordConfirmation({ isOpen: false, action: null, barberId: null, barberName: null })
        }
        onConfirm={() => {
          if (passwordConfirmation.action === 'delete') {
            confirmDeleteBarber();
          } else if (passwordConfirmation.action === 'edit') {
            confirmEditBarber();
          } else if (passwordConfirmation.action === 'reset-password') {
            confirmResetPassword();
          }
        }}
        title={
          passwordConfirmation.action === 'delete'
            ? 'Confirm Barber Deletion'
            : passwordConfirmation.action === 'reset-password'
              ? 'Confirm Password Reset'
              : 'Confirm Barber Edit'
        }
        description={
          passwordConfirmation.action === 'delete'
            ? `Enter your password to confirm deletion of ${passwordConfirmation.barberName}`
            : passwordConfirmation.action === 'reset-password'
              ? `Enter your password to reset password for ${passwordConfirmation.barberName}`
              : `Enter your password to edit ${passwordConfirmation.barberName}`
        }
        actionType={passwordConfirmation.action || 'action'}
      />
    </div>
  );
}