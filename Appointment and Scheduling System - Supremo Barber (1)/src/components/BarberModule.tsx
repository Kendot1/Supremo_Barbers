import { useState, useEffect } from "react";
import API from "../services/api.service";
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
  schedule: string;
  totalBookings: number;
  rating: number;
  status: "active" | "on-leave" | "inactive";
  email?: string;
  password?: string;
}

interface BarberModuleProps {
  appointments: Appointment[];
}

export function BarberModule({ appointments }: BarberModuleProps) {
  // Schedule options
  const scheduleOptions = [
    "Mon-Fri, 9AM-6PM",
    "Mon-Sat, 9AM-6PM",
    "Mon-Sat, 10AM-7PM",
    "Mon-Sun, 9AM-6PM",
    "Tue-Sat, 9AM-6PM",
    "Tue-Sun, 10AM-7PM",
    "Wed-Sun, 9AM-6PM",
    "Mon-Fri, 8AM-5PM",
    "Mon-Sat, 8AM-8PM",
    "Flexible Schedule"
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [newBarber, setNewBarber] = useState({ name: "", specialty: "", schedule: "" });
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

          // Extract schedule from available_hours object
          const schedule = barber.available_hours?.schedule || 'Mon-Sat, 9AM-6PM';

          // Calculate average rating from reviews or use default
          const rating = barber.rating || 5.0;

          return {
            id: barber.user_id, // Use user_id as the barber ID for consistency
            name: barber.name,
            email: barber.email,
            specialty: specialty,
            schedule: schedule,
            totalBookings: barberAppointments.length,
            rating: rating,
            status: 'active', // Default to active, can be updated based on user status
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
      (barber.schedule?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
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

  // Generate email from name
  const generateEmail = (name: string, existingBarbers: Barber[]) => {
    if (!name.trim()) return "";

    const nameParts = name.trim().split(" ");
    const surname = nameParts[nameParts.length - 1].toLowerCase();

    // Count existing barbers with same surname
    const surnameCount = existingBarbers.filter(b => {
      const bSurname = b.name.split(" ").pop()?.toLowerCase();
      return bSurname === surname;
    }).length;

    const idNumber = String(surnameCount + 1).padStart(2, '0');
    return `${surname}${idNumber}@barbershop.com`;
  };

  const handleAddBarber = async () => {
    if (!newBarber.name || !newBarber.specialty || !newBarber.schedule) {
      toast.error("Please fill in all required fields");
      return;
    }

    const email = generateEmail(newBarber.name, barbers);
    const defaultPassword = "SupremoBarber2024";

    // Generate username from barber name (firstname + lastname initial)
    const generateUsername = (name: string): string => {
      const parts = name.trim().toLowerCase().split(' ');
      if (parts.length === 1) {
        return parts[0]; // Single name (e.g., "john" -> "john")
      }
      const firstName = parts[0];
      const lastNameInitial = parts[parts.length - 1].charAt(0);
      return `${firstName}${lastNameInitial}`; // e.g., "John Doe" -> "johnd"
    };

    const username = generateUsername(newBarber.name);

    try {
      // Step 1: Create user account with role 'barber'
      const userResponse = await API.auth.register({
        name: newBarber.name,
        email,
        username, // Add username field
        password: defaultPassword,
        phone: '',
        role: 'barber', // Barber role
      });

      // Step 2: Create barber profile linked to the user
      await API.barbers.create({
        user_id: userResponse.user.id,
        specialties: [newBarber.specialty],
        rating: 5.0,
        available_hours: {
          schedule: newBarber.schedule,
        },
      });

      toast.success(`Barber ${newBarber.name} added successfully! Email: ${email}, Password: ${defaultPassword}`, { duration: 6000 });
      setNewBarber({ name: "", specialty: "", schedule: "" });
      setIsAddDialogOpen(false);

      // Refetch barbers
      const users = await API.barbers.getAll();
      const transformedBarbers: Barber[] = users.map(user => {
        const barberAppointments = appointments.filter(apt => apt.barber === user.name);
        const specialty = Array.isArray(user.specialties) && user.specialties.length > 0
          ? user.specialties[0]
          : 'Barber Specialist';
        const schedule = user.available_hours?.schedule || 'Mon-Sat, 9AM-6PM';

        return {
          id: user.user_id,
          name: user.name,
          email: user.email,
          specialty: specialty,
          schedule: schedule,
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
        toast.error('A user with this email already exists. Please use a different name.');
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

    if (!editingBarber.name || !editingBarber.specialty || !editingBarber.schedule) {
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
          available_hours: {
            schedule: editingBarber.schedule,
          },
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
        const schedule = user.available_hours?.schedule || 'Mon-Sat, 9AM-6PM';

        return {
          id: user.user_id,
          name: user.name,
          email: user.email,
          specialty: specialty,
          schedule: schedule,
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

        toast.success(`Barber ${passwordConfirmation.barberName} removed from database!`);

        // Refetch barbers
        const users = await API.barbers.getAll();
        const transformedBarbers: Barber[] = users.map(user => {
          const barberAppointments = appointments.filter(apt => apt.barber === user.name);
          const specialty = Array.isArray(user.specialties) && user.specialties.length > 0
            ? user.specialties[0]
            : 'Barber Specialist';
          const schedule = user.available_hours?.schedule || 'Mon-Sat, 9AM-6PM';

          return {
            id: user.user_id,
            name: user.name,
            email: user.email,
            specialty: specialty,
            schedule: schedule,
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
      'Schedule': barber.schedule,
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
                Manage barbers, schedules, and availability
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                onClick={handleExportBarbers}
                variant="outline"
                className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#FBF7EF] text-xs md:text-sm px-2 md:px-4"
              >
                <Download className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Export Report</span>
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#DB9D47] hover:bg-[#C88A35] text-white text-xs md:text-sm px-2 md:px-4">
                    <UserCog className="w-4 h-4 md:mr-2" />
                    <span className="hidden sm:inline">Add Barber</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add New Barber</DialogTitle>
                    <DialogDescription>
                      Add a new barber to the team. Email and password will be auto-generated.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="barber-name">Full Name</Label>
                      <Input
                        id="barber-name"
                        placeholder="Carlos Mendoza"
                        value={newBarber.name}
                        onChange={(e) => setNewBarber(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="specialty">Specialty</Label>
                      <Input
                        id="specialty"
                        placeholder="Fade Specialist"
                        value={newBarber.specialty}
                        onChange={(e) => setNewBarber(prev => ({ ...prev, specialty: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="schedule">Schedule</Label>
                      <Select
                        value={newBarber.schedule}
                        onValueChange={(value) => setNewBarber(prev => ({ ...prev, schedule: value }))}
                      >
                        <SelectTrigger className="border-[#E8DCC8]">
                          <SelectValue placeholder="Select work schedule" />
                        </SelectTrigger>
                        <SelectContent>
                          {scheduleOptions.map((schedule) => (
                            <SelectItem key={schedule} value={schedule}>
                              {schedule}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Auto-generated Email Preview */}
                    {newBarber.name && (
                      <div className="grid gap-2 p-3 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8]">
                        <Label className="text-xs text-[#87765E]">Auto-Generated Credentials</Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#87765E]">Email:</span>
                            <span className="text-sm text-[#5C4A3A] font-mono">
                              {generateEmail(newBarber.name, barbers)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#87765E]">Password:</span>
                            <span className="text-sm text-[#5C4A3A] font-mono">
                              SupremoBarber2024
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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
                      <TableHead className="text-[#5C4A3A] hidden md:table-cell">Schedule</TableHead>
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
                        <TableCell className="text-[#87765E] hidden md:table-cell">{barber.schedule}</TableCell>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#8B7355] hover:text-[#6B5345] hover:bg-[#FBF7EF] h-8 w-8 p-0"
                              onClick={() => handleResetPassword(barber.id, barber.name)}
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#DB9D47] hover:text-[#C88A35] hover:bg-[#FBF7EF] h-8 w-8 p-0"
                              onClick={() => handleEditBarber(barber.id)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#E57373] hover:text-[#D32F2F] hover:bg-[#FBF7EF] h-8 w-8 p-0"
                              onClick={() => handleDeleteBarber(barber.id, barber.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
                      <div className="space-y-4">
                        {barbers
                          .filter((b) => b.status === "active")
                          .map((barber) => (
                            <div
                              key={barber.id}
                              className="flex items-center justify-between p-4 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#DB9D47] to-[#D98555] flex items-center justify-center text-white">
                                  {barber.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </div>
                                <div>
                                  <p className="text-[#5C4A3A]">{barber.name}</p>
                                  <p className="text-sm text-[#87765E]">{barber.specialty}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[#5C4A3A]">{barber.schedule}</p>
                                <p className="text-sm text-[#87765E]">
                                  {appointments.filter(a =>
                                    a.barber === barber.name &&
                                    a.date === (selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : '') &&
                                    a.status === 'upcoming'
                                  ).length} bookings
                                </p>
                              </div>
                            </div>
                          ))}
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
                <div className="grid gap-2">
                  <Label htmlFor="edit-schedule">Schedule</Label>
                  <Select
                    value={editingBarber.schedule}
                    onValueChange={(value) => setEditingBarber({ ...editingBarber, schedule: value })}
                  >
                    <SelectTrigger className="border-[#E8DCC8]">
                      <SelectValue placeholder="Select work schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleOptions.map((schedule) => (
                        <SelectItem key={schedule} value={schedule}>
                          {schedule}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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