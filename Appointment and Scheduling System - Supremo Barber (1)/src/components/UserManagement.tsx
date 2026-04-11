import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from './ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger
} from './ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui/select';
import { UserPlus, Search, Edit, Trash2, CheckCircle2, XCircle, Loader2, Users, UserCheck, UserPlus as UserPlusIcon, Download } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PasswordConfirmationDialog } from './PasswordConfirmationDialog';
import API from '../services/api.service';
import {
  exportToCSV,
  formatDateForExport,
} from './utils/exportUtils';
import { Pagination } from './ui/pagination';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  joinDate: string;
  createdAt: string; // Add raw createdAt for calculations
}

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('customer'); // Changed default to 'customer'
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'customer',
  });
  const [passwordConfirmation, setPasswordConfirmation] = useState<{
    isOpen: boolean;
    action: 'delete' | 'edit' | null;
    userId: string | null;
  }>({
    isOpen: false,
    action: null,
    userId: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);

  // Fetch users from database on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const fetchedUsers = await API.users.getAll();
      // Format users to match UserData interface - FILTER FOR CUSTOMERS ONLY
      const formattedUsers = fetchedUsers
        .filter((user: any) => user.role === 'customer') // Only fetch customers
        .map((user: any) => ({
          id: user.id || user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status || 'active',
          createdAt: user.createdAt || new Date().toISOString(),
          joinDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }),
        }));
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users from database');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate analytics
  const totalCustomers = users.length;
  const activeCustomers = users.filter(user => user.status === 'active').length;
  
  // New customers (joined within last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newCustomers = users.filter(user => {
    const joinDate = new Date(user.createdAt);
    return joinDate >= thirtyDaysAgo;
  }).length;

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.joinDate.includes(searchTerm);
    // Removed role filtering since we only have customers now
    return matchesSearch;
  });

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Create user in database
      const createdUser = await API.users.create({
        ...newUser,
        password: 'default123', // Default password (should be changed by user)
        status: 'active',
      });

      // Refresh users list
      await fetchUsers();
      
      setIsAddDialogOpen(false);
      setNewUser({ name: '', email: '', role: 'customer' });
      toast.success('User added successfully to database');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user in database');
    }
  };

  const handleToggleStatus = (userId: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'edit',
      userId,
    });
  };

  const handleDeleteUser = (userId: string) => {
    setPasswordConfirmation({
      isOpen: true,
      action: 'delete',
      userId,
    });
  };

  const confirmToggleStatus = async () => {
    if (passwordConfirmation.userId) {
      try {
        const user = users.find(u => u.id === passwordConfirmation.userId);
        if (!user) return;

        // Update user status in database
        await API.users.update(passwordConfirmation.userId, {
          status: user.status === 'active' ? 'inactive' : 'active',
        });

        // Refresh users list
        await fetchUsers();
        
        toast.success('User status updated in database');
      } catch (error) {
        console.error('Error updating user status:', error);
        toast.error('Failed to update user status');
      }
    }
  };

  const confirmDeleteUser = async () => {
    if (passwordConfirmation.userId) {
      try {
        // Delete user from database
        await API.users.delete(passwordConfirmation.userId);

        // Refresh users list
        await fetchUsers();
        
        toast.success('User deleted from database');
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user');
      }
    }
  };

  const handleExportToCSV = () => {
    const formattedUsers = users.map(user => ({
      ID: user.id,
      Name: user.name,
      Email: user.email,
      Role: user.role,
      Status: user.status,
      'Join Date': formatDateForExport(user.joinDate),
    }));
    exportToCSV(formattedUsers, 'customers');
  };

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  return (
    <>
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-[#DB9D47]/20 bg-gradient-to-br from-white to-amber-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Customers</p>
                <p className="text-3xl font-bold text-[#DB9D47]">{totalCustomers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-[#DB9D47]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#DB9D47]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-gradient-to-br from-white to-green-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Customers</p>
                <p className="text-3xl font-bold text-green-600">{activeCustomers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-white to-blue-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">New (30 Days)</p>
                <p className="text-3xl font-bold text-blue-600">{newCustomers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <UserPlusIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer Management</CardTitle>
              <CardDescription>Manage customer accounts</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                  <DialogDescription>Create a new customer account</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddUser}>Add Customer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading users from database...</p>
                    </TableCell>
                  </TableRow>
                ) : currentUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No users found</p>
                    </TableCell>
                  </TableRow>
                ) : currentUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status === 'active' ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.joinDate}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(user.id)}
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            totalItems={filteredUsers.length}
            itemsPerPage={usersPerPage}
            currentPage={currentPage}
            totalPages={Math.ceil(filteredUsers.length / usersPerPage)}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newSize) => {
              setUsersPerPage(newSize);
              setCurrentPage(1);
            }}
          />
        </CardContent>

        {/* Password Confirmation Dialog */}
        <PasswordConfirmationDialog
          isOpen={passwordConfirmation.isOpen}
          onClose={() =>
            setPasswordConfirmation({ isOpen: false, action: null, userId: null })
          }
          onConfirm={() => {
            if (passwordConfirmation.action === 'delete') {
              confirmDeleteUser();
            } else if (passwordConfirmation.action === 'edit') {
              confirmToggleStatus();
            }
          }}
          title={
            passwordConfirmation.action === 'delete'
              ? 'Confirm User Deletion'
              : 'Confirm Status Change'
          }
          description={
            passwordConfirmation.action === 'delete'
              ? 'Enter your password to confirm deletion of this user'
              : 'Enter your password to confirm changing this user\'s status'
          }
          actionType={passwordConfirmation.action || 'action'}
        />
      </Card>
    </>
  );
}