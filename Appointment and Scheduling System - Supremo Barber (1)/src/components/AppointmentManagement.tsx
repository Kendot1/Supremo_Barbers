import { PaymentVerification } from './PaymentVerification';
import type { Appointment as AppointmentType, User } from '../App';
import { PasswordConfirmationDialog } from './PasswordConfirmationDialog';
import { logAppointmentStatusUpdate } from '../services/audit-notification.service';
import API from '../services/api.service';
import { FaPesoSign } from 'react-icons/fa6';

// Utility function to parse date string without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface Appointment {
  id: string;
  customer: string;
  barber: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  price: number;
  downPayment: number;
}

const mockAppointments: Appointment[] = [
  {
    id: '1',
    customer: 'Mike Customer',
    barber: 'Tony Stark',
    service: 'Gupit Supremo w/ Banlaw',
    date: '2025-10-15',
    time: '10:00 AM',
    status: 'pending',
    price: 300,
    downPayment: 150
  },
  {
    id: '2',
    customer: 'John Doe',
    barber: 'Peter Parker',
    service: 'Gupit Supremo',
    date: '2025-10-15',
    time: '11:00 AM',
    status: 'approved',
    price: 250,
    downPayment: 125
  },
  {
    id: '3',
    customer: 'Sarah Wilson',
    barber: 'Tony Stark',
    service: 'Supremo Espesyal',
    date: '2025-10-16',
    time: '02:00 PM',
    status: 'pending',
    price: 450,
    downPayment: 225
  },
  {
    id: '4',
    customer: 'Emily Johnson',
    barber: 'Bruce Wayne',
    service: 'Ahit Supremo',
    date: '2025-10-14',
    time: '09:00 AM',
    status: 'completed',
    price: 200,
    downPayment: 100
  },
  {
    id: '5',
    customer: 'David Smith',
    barber: 'Peter Parker',
    service: 'Tina (Hair Color)',
    date: '2025-10-13',
    time: '03:00 PM',
    status: 'cancelled',
    price: 450,
    downPayment: 225
  },
];

interface AppointmentManagementProps {
  user?: User;
}

export function AppointmentManagement({ user }: AppointmentManagementProps = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'payments'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBarber, setFilterBarber] = useState('all');
  const [passwordConfirmation, setPasswordConfirmation] = useState<{
    isOpen: boolean;
    action: 'approve' | 'cancel' | 'complete' | null;
    appointmentId: string | null;
    customerName: string | null;
  }>({
    isOpen: false,
    action: null,
    appointmentId: null,
    customerName: null,
  });

  // Get unique barbers for filter
  const barbers = Array.from(new Set(appointments.map(apt => apt.barber)));

  const filteredAppointments = appointments.filter(apt => {
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;

    // Format date for better search experience
    const formattedDate = parseLocalDate(apt.date).toLocaleDateString();

    const matchesSearch =
      apt.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.barber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.date.includes(searchTerm) ||
      formattedDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.time.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.price.toString().includes(searchTerm);
    const matchesBarber = filterBarber === 'all' || apt.barber === filterBarber;

    return matchesStatus && matchesSearch && matchesBarber;
  });

  // Convert mock appointments to match the App Appointment type
  const convertedAppointments: AppointmentType[] = appointments.map(apt => ({
    id: apt.id,
    userId: apt.customer,
    service: apt.service,
    barber: apt.barber,
    date: apt.date,
    time: apt.time,
    price: apt.price,
    status: apt.status === 'approved' ? 'upcoming' : apt.status,
    canCancel: apt.status === 'approved' || apt.status === 'pending',
  }));

  const handleApprove = (id: string, customerName: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'approve',
      appointmentId: id,
      customerName,
    });
  };

  const confirmApprove = async () => {
    if (passwordConfirmation.appointmentId && user) {
      const appointment = appointments.find(apt => apt.id === passwordConfirmation.appointmentId);

      if (appointment) {
        // Update local state
        setAppointments(appointments.map(apt =>
          apt.id === passwordConfirmation.appointmentId ? { ...apt, status: 'approved' as const } : apt
        ));
        toast.success('Appointment approved');

        // Send notification to customer
        try {
          const fullAppointment = await API.appointments.getById(passwordConfirmation.appointmentId);

          await logAppointmentStatusUpdate(
            user.id,
            user.role as 'customer' | 'barber' | 'admin',
            user.name,
            user.email,
            passwordConfirmation.appointmentId,
            'pending',
            'verified',
            {
              customerId: fullAppointment.customer_id || fullAppointment.userId || '',
              customerName: appointment.customer || 'Customer',
              barberId: fullAppointment.barber_id || '',
              service: appointment.service,
              date: appointment.date,
              time: appointment.time,
            }
          );

        } catch (error) {
          console.error('❌ Failed to send notification:', error);
          // Don't fail the operation if notification fails
        }
      }
    }
  };

  const handleCancel = (id: string, customerName: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'cancel',
      appointmentId: id,
      customerName,
    });
  };

  const confirmCancel = async () => {
    if (passwordConfirmation.appointmentId && user) {
      const appointment = appointments.find(apt => apt.id === passwordConfirmation.appointmentId);

      if (appointment) {
        // Update local state
        setAppointments(appointments.map(apt =>
          apt.id === passwordConfirmation.appointmentId ? { ...apt, status: 'cancelled' as const } : apt
        ));
        toast.success('Appointment cancelled');

        // Send notification to customer
        try {
          const fullAppointment = await API.appointments.getById(passwordConfirmation.appointmentId);

          await logAppointmentStatusUpdate(
            user.id,
            user.role as 'customer' | 'barber' | 'admin',
            user.name,
            user.email,
            passwordConfirmation.appointmentId,
            appointment.status,
            'cancelled',
            {
              customerId: fullAppointment.customer_id || fullAppointment.userId || '',
              customerName: appointment.customer || 'Customer',
              barberId: fullAppointment.barber_id || '',
              service: appointment.service,
              date: appointment.date,
              time: appointment.time,
            }
          );

        } catch (error) {
          console.error('❌ Failed to send notification:', error);
          // Don't fail the operation if notification fails
        }
      }
    }
  };

  const handleComplete = (id: string, customerName: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'complete',
      appointmentId: id,
      customerName,
    });
  };

  const confirmComplete = async () => {
    if (passwordConfirmation.appointmentId && user) {
      const appointment = appointments.find(apt => apt.id === passwordConfirmation.appointmentId);

      if (appointment) {
        // Update local state
        setAppointments(appointments.map(apt =>
          apt.id === passwordConfirmation.appointmentId ? { ...apt, status: 'completed' as const } : apt
        ));
        toast.success('Appointment marked as completed');

        // Send notification to customer
        try {
          const fullAppointment = await API.appointments.getById(passwordConfirmation.appointmentId);

          await logAppointmentStatusUpdate(
            user.id,
            user.role as 'customer' | 'barber' | 'admin',
            user.name,
            user.email,
            passwordConfirmation.appointmentId,
            'approved',
            'completed',
            {
              customerId: fullAppointment.customer_id || fullAppointment.userId || '',
              customerName: appointment.customer || 'Customer',
              barberId: fullAppointment.barber_id || '',
              service: appointment.service,
              date: appointment.date,
              time: appointment.time,
            }
          );

        } catch (error) {
          console.error('❌ Failed to send notification:', error);
          // Don't fail the operation if notification fails
        }
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'verified':
        return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'completed':
        return <Badge><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-[#E8DCC8]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[#5C4A3A]">Appointment Management</CardTitle>
            <CardDescription className="text-[#87765E]">View and manage customer appointments</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Row - Only show in list view */}
        {viewMode === 'list' && (
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#87765E] w-4 h-4" />
              <Input
                placeholder="Search by customer name or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#E8DCC8]"
              />
            </div>
            <div className="flex gap-3">
              <Select value={filterBarber} onValueChange={setFilterBarber}>
                <SelectTrigger className="w-full md:w-48 border-[#E8DCC8]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by barber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Barbers</SelectItem>
                  {barbers.map(barber => (
                    <SelectItem key={barber} value={barber}>{barber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48 border-[#E8DCC8]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'calendar' | 'payments')} className="space-y-4">
          <TabsList className="bg-[#FBF7EF] grid w-full grid-cols-3">
            <TabsTrigger value="list" className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white">
              <List className="w-4 h-4 mr-2" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white">
              <CalendarDays className="w-4 h-4 mr-2" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white">
              <FaPesoSign className="w-4 h-4 mr-2" />
              Payment Verification
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="border rounded-lg border-[#E8DCC8]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Barber</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          {apt.customer}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCog className="w-4 h-4 text-slate-400" />
                          {apt.barber}
                        </div>
                      </TableCell>
                      <TableCell>{apt.service}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                          <div>
                            <div>{apt.date}</div>
                            <div className="text-sm text-slate-500">{apt.time}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>₱{apt.price}</div>
                          <div className="text-xs text-slate-500">Paid: ₱{apt.downPayment}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(apt.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {apt.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(apt.id, apt.customer)}
                                className="bg-[#DB9D47] hover:bg-[#C58A38]"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancel(apt.id, apt.customer)}
                                className="border-[#E8DCC8]"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {apt.status === 'approved' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleComplete(apt.id, apt.customer)}
                                className="bg-[#94A670] hover:bg-[#819157]"
                              >
                                Complete
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancel(apt.id, apt.customer)}
                                className="border-[#E8DCC8]"
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <AppointmentCalendar
              appointments={convertedAppointments}
              viewMode="all"
            />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentVerification
              appointments={convertedAppointments}
              onUpdateAppointment={(appointmentId, updates) => {
                // Update the local appointments state
                setAppointments(appointments.map(apt =>
                  apt.id === appointmentId
                    ? { ...apt, status: updates.paymentStatus === 'verified' ? 'approved' : apt.status }
                    : apt
                ));
              }}
              userRole="admin"
              currentUser={user ? { id: user.id, name: user.name, email: user.email } : undefined}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Password Confirmation Dialog */}
      <PasswordConfirmationDialog
        isOpen={passwordConfirmation.isOpen}
        onClose={() =>
          setPasswordConfirmation({ isOpen: false, action: null, appointmentId: null, customerName: null })
        }
        onConfirm={() => {
          if (passwordConfirmation.action === 'approve') {
            confirmApprove();
          } else if (passwordConfirmation.action === 'cancel') {
            confirmCancel();
          } else if (passwordConfirmation.action === 'complete') {
            confirmComplete();
          }
        }}
        title={
          passwordConfirmation.action === 'approve'
            ? 'Confirm Appointment Approval'
            : passwordConfirmation.action === 'cancel'
              ? 'Confirm Appointment Cancellation'
              : 'Confirm Appointment Completion'
        }
        description={
          passwordConfirmation.action === 'approve'
            ? `Enter your password to approve appointment for ${passwordConfirmation.customerName}`
            : passwordConfirmation.action === 'cancel'
              ? `Enter your password to cancel appointment for ${passwordConfirmation.customerName}`
              : `Enter your password to mark appointment as completed for ${passwordConfirmation.customerName}`
        }
        actionType={passwordConfirmation.action === 'cancel' ? 'delete' : 'edit'}
      />
    </Card>
  );
}