import { useState, useEffect } from "react";
import API from "../services/api.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Users, UserPlus, TrendingUp, Calendar, Search, Edit, Trash2, Filter, Download, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV, formatDateForExport } from "./utils/exportUtils";
import { PasswordConfirmationDialog } from "./PasswordConfirmationDialog";

interface Customer {
  id: string;
  name: string;
  email: string;
  contact: string;
  totalVisits: number;
  lastBookingDate: string;
  status: "active" | "inactive";
}

export function CustomerModule() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", contact: "" });
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [passwordConfirmation, setPasswordConfirmation] = useState<{
    isOpen: boolean;
    action: 'suspend' | 'edit' | 'delete' | null;
    customerId: string | null;
    customerName: string | null;
  }>({
    isOpen: false,
    action: null,
    customerId: null,
    customerName: null,
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const users = await API.users.getAll({ role: 'customer' });

      const customerUsers = users.filter(user => user.role === 'customer');

      const transformedCustomers: Customer[] = customerUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        contact: user.phone || 'N/A',
        totalVisits: 0,
        lastBookingDate: 'N/A',
        status: (user.isActive ?? true) ? 'active' : 'inactive',
      }));

      setCustomers(transformedCustomers);
    } catch (error) {
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomersSilently = async () => {
    try {
      const users = await API.users.getAll({ role: 'customer' });
      const customerUsers = users.filter(user => user.role === 'customer');
      const transformedCustomers: Customer[] = customerUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        contact: user.phone || 'N/A',
        totalVisits: 0,
        lastBookingDate: 'N/A',
        status: (user.isActive ?? true) ? 'active' : 'inactive',
      }));
      setCustomers(transformedCustomers);
    } catch (error) {
      console.error(error);
    }
  };

  // Fetch customers from database
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Calculate analytics from real customer data
  const analytics = {
    totalCustomers: customers.length,
    newCustomers: customers.filter(c => c.totalVisits < 2).length,
    returningCustomers: customers.filter(c => c.totalVisits >= 2).length,
    averageBookings: customers.length > 0
      ? customers.reduce((sum, c) => sum + c.totalVisits, 0) / customers.length
      : 0,
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.contact.includes(searchQuery) ||
      customer.totalVisits.toString().includes(searchQuery) ||
      customer.lastBookingDate.includes(searchQuery);

    const matchesStatus = filterStatus === "all" || customer.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email || !newCustomer.contact) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Optimistic UI Update
      setIsAddDialogOpen(false);
      const tempUser: Customer = {
        id: 'optimistic_' + Date.now().toString(),
        name: newCustomer.name,
        email: newCustomer.email,
        contact: newCustomer.contact,
        totalVisits: 0,
        lastBookingDate: 'N/A',
        status: 'active',
      };
      setCustomers(prev => [tempUser, ...prev]);

      const payload = { ...newCustomer };
      setNewCustomer({ name: "", email: "", contact: "" });

      await API.users.create({
        name: payload.name,
        email: payload.email,
        phone: payload.contact,
        password: 'customer123',
        role: 'customer',
      });

      toast.success(`Customer ${payload.name} added to database!`);

      // Refetch customers silently
      fetchCustomersSilently();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer to database');
      fetchCustomersSilently(); // Revert on failure
    }
  };

  const handleEditCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setPasswordConfirmation({
        isOpen: true,
        action: 'edit',
        customerId: customer.id,
        customerName: customer.name,
      });
    }
  };

  const confirmEditCustomer = () => {
    if (passwordConfirmation.customerId) {
      const customer = customers.find(c => c.id === passwordConfirmation.customerId);
      if (customer) {
        setEditingCustomer(customer);
        setIsEditDialogOpen(true);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;

    if (!editingCustomer.name || !editingCustomer.email || !editingCustomer.contact) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Optimistic UI update
      setIsEditDialogOpen(false);
      setCustomers(prev => prev.map(c => 
        c.id === editingCustomer.id 
          ? { ...c, name: editingCustomer.name, email: editingCustomer.email, contact: editingCustomer.contact }
          : c
      ));

      await API.users.update(editingCustomer.id, {
        name: editingCustomer.name,
        email: editingCustomer.email,
        phone: editingCustomer.contact,
        isActive: editingCustomer.status === 'active',
      });

      toast.success(`Customer ${editingCustomer.name} updated in database!`);
      setEditingCustomer(null);

      // Refetch customers silently
      fetchCustomersSilently();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer in database');
      fetchCustomersSilently(); // Revert on failure
    }
  };

  const handleDeleteCustomer = (customerId: string, customerName: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'delete',
      customerId,
      customerName,
    });
  };

  const handleSuspendCustomer = (customerId: string, customerName: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'suspend',
      customerId,
      customerName,
    });
  };

  const confirmSuspendCustomer = async () => {
    if (passwordConfirmation.customerId && passwordConfirmation.customerName) {
      const targetId = passwordConfirmation.customerId;
      const targetName = passwordConfirmation.customerName;

      const customer = customers.find(c => c.id === targetId);
      if (!customer) return;

      // Optimistic UI Update
      setPasswordConfirmation({ isOpen: false, action: null, customerId: null, customerName: null });
      setCustomers(prev => prev.map(c => 
        c.id === targetId ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c
      ));

      try {
        // Toggle suspend/unsuspend
        if (customer.status === 'active') {
          await API.users.suspend(targetId);
          toast.success(`Customer ${targetName} account suspended!`);
        } else {
          await API.users.unsuspend(targetId);
          toast.success(`Customer ${targetName} account reactivated!`);
        }

        // Refetch customers silently
        fetchCustomersSilently();
      } catch (error) {
        console.error('Error suspending/unsuspending customer:', error);
        toast.error('Failed to update customer status');
        fetchCustomersSilently(); // Revert on failure
      }
    }
  };

  const confirmDeleteCustomer = async () => {
    if (passwordConfirmation.customerId && passwordConfirmation.customerName) {
      const targetId = passwordConfirmation.customerId;
      
      // Optimistic set state
      setPasswordConfirmation({ isOpen: false, action: null, customerId: null, customerName: null });
      setCustomers(prev => prev.filter(c => c.id !== targetId));

      try {
        // Permanently delete customer from database
        await API.users.delete(targetId);
        toast.success(`Customer permanently deleted from database!`);

        // Refetch customers silently
        fetchCustomersSilently();
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error('Failed to delete customer from database');
        fetchCustomersSilently(); // Revert on failure
      }
    }
  };

  const handleExportCustomers = () => {
    if (filteredCustomers.length === 0) {
      toast.error("No customers to export");
      return;
    }

    const exportData = filteredCustomers.map(customer => ({
      'Customer ID': customer.id,
      'Name': customer.name,
      'Email': customer.email,
      'Contact': customer.contact,
      'Total Visits': customer.totalVisits.toString(),
      'Last Booking Date': formatDateForExport(customer.lastBookingDate),
      'Status': customer.status.charAt(0).toUpperCase() + customer.status.slice(1),
    }));

    const headers = ['Customer ID', 'Name', 'Email', 'Contact', 'Total Visits', 'Last Booking Date', 'Status'];

    exportToCSV(exportData, headers, 'supremo-barber-customers');
    toast.success(`Exported ${filteredCustomers.length} customers successfully!`);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#DB9D47] p-2 sm:p-2.5 rounded-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{analytics.totalCustomers}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Total Customers</p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#D98555] p-2 sm:p-2.5 rounded-lg">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{analytics.newCustomers}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">New This Month</p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#94A670] p-2 sm:p-2.5 rounded-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{analytics.returningCustomers}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Returning Customers</p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#B89968] p-2 sm:p-2.5 rounded-lg">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{analytics.averageBookings.toFixed(1)}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Avg Bookings/Customer</p>
        </div>
      </div>

      {/* Customer Table */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-[#5C4A3A] text-base md:text-lg">Customer Management</CardTitle>
              <CardDescription className="text-[#87765E] text-xs md:text-sm">
                Manage customer information and loyalty points
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                onClick={handleExportCustomers}
                variant="outline"
                className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#FBF7EF] text-xs md:text-sm px-2 md:px-4"
              >
                <Download className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Export Report</span>
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#DB9D47] hover:bg-[#C88A35] text-white text-xs md:text-sm px-2 md:px-4">
                    <UserPlus className="w-4 h-4 md:mr-2" />
                    <span className="hidden sm:inline">Add Customer</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
                    <DialogDescription>
                      Add a new customer to the system
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="Juan Dela Cruz"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="juan@email.com"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contact">Contact Number</Label>
                      <Input
                        id="contact"
                        placeholder="+63 912 345 6789"
                        value={newCustomer.contact}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, contact: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                      onClick={handleAddCustomer}
                    >
                      Add Customer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#E8DCC8] text-sm"
              />
            </div>
            <div className="flex gap-2 md:gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-40 border-[#E8DCC8] text-sm">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-[#E8DCC8] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FBF7EF]">
                  <TableHead className="text-[#5C4A3A]">Name</TableHead>
                  <TableHead className="text-[#5C4A3A] hidden sm:table-cell">Email</TableHead>
                  <TableHead className="text-[#5C4A3A] hidden md:table-cell">Contact</TableHead>
                  <TableHead className="text-[#5C4A3A] text-center hidden lg:table-cell">Visits</TableHead>
                  <TableHead className="text-[#5C4A3A] hidden lg:table-cell">Last Booking</TableHead>
                  <TableHead className="text-[#5C4A3A] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-[#FBF7EF]">
                    <TableCell className="text-[#5C4A3A]">
                      <div>
                        {customer.name}
                        <div className="sm:hidden text-xs text-[#87765E] mt-1">{customer.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#87765E] hidden sm:table-cell">{customer.email}</TableCell>
                    <TableCell className="text-[#87765E] hidden md:table-cell">{customer.contact}</TableCell>
                    <TableCell className="text-center hidden lg:table-cell">
                      {customer.totalVisits}
                    </TableCell>
                    <TableCell className="text-[#87765E] hidden lg:table-cell">
                      {new Date(customer.lastBookingDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#DB9D47] hover:text-[#C88A35] hover:bg-[#FBF7EF] h-8 w-8 p-0"
                          onClick={() => handleEditCustomer(customer.id)}
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            customer.status === 'active'
                              ? "text-[#F59E0B] hover:text-[#D97706] hover:bg-[#FBF7EF] h-8 w-8 p-0"
                              : "text-[#94A670] hover:text-[#7A8E5A] hover:bg-[#FBF7EF] h-8 w-8 p-0"
                          }
                          onClick={() => handleSuspendCustomer(customer.id, customer.name)}
                          title={customer.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                        >
                          {customer.status === 'active' ? (
                            <Ban className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#E57373] hover:text-[#D32F2F] hover:bg-[#FBF7EF] h-8 w-8 p-0"
                          onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                          title="Delete Customer Permanently"
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
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information
            </DialogDescription>
          </DialogHeader>
          {editingCustomer && (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    placeholder="Juan Dela Cruz"
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="juan@email.com"
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-contact">Contact Number</Label>
                  <Input
                    id="edit-contact"
                    placeholder="+63 912 345 6789"
                    value={editingCustomer.contact}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, contact: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingCustomer(null);
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

      {/* Password Confirmation Dialog */}
      <PasswordConfirmationDialog
        isOpen={passwordConfirmation.isOpen}
        onClose={() =>
          setPasswordConfirmation({ isOpen: false, action: null, customerId: null, customerName: null })
        }
        onConfirm={() => {
          if (passwordConfirmation.action === 'suspend') {
            confirmSuspendCustomer();
          } else if (passwordConfirmation.action === 'edit') {
            confirmEditCustomer();
          } else if (passwordConfirmation.action === 'delete') {
            confirmDeleteCustomer();
          }
        }}
        title={
          passwordConfirmation.action === 'suspend'
            ? (() => {
              const customer = customers.find(c => c.id === passwordConfirmation.customerId);
              return customer?.status === 'active'
                ? 'Confirm Account Suspension'
                : 'Confirm Account Reactivation';
            })()
            : passwordConfirmation.action === 'delete'
              ? 'Confirm Customer Deletion'
              : 'Confirm Customer Edit'
        }
        description={
          passwordConfirmation.action === 'suspend'
            ? (() => {
              const customer = customers.find(c => c.id === passwordConfirmation.customerId);
              return customer?.status === 'active'
                ? `Enter your password to suspend ${passwordConfirmation.customerName}'s account`
                : `Enter your password to reactivate ${passwordConfirmation.customerName}'s account`;
            })()
            : passwordConfirmation.action === 'delete'
              ? `Enter your password to permanently delete ${passwordConfirmation.customerName} from the database`
              : `Enter your password to edit ${passwordConfirmation.customerName}`
        }
        actionType={passwordConfirmation.action || 'action'}
      />
    </div>
  );
}