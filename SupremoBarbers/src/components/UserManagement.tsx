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
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from 'sonner';
import { PasswordConfirmationDialog } from './PasswordConfirmationDialog';
import API from '../services/api.service';
import {
  exportToCSV,
} from './utils/exportUtils';
import { Pagination } from './ui/pagination';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  joinDate: string;
  createdAt: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('customer'); // Changed default to 'customer'
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
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
  const [viewingUser, setViewingUser] = useState<UserData | null>(null);

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
        .filter((user: any) => user.role === 'customer')
        .map((user: any) => ({
          id: user.id || user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive !== undefined ? user.isActive : (user.is_active !== undefined ? user.is_active : true),
          createdAt: user.createdAt || user.created_at || new Date().toISOString(),
          joinDate: (user.createdAt || user.created_at) ? new Date(user.createdAt || user.created_at).toLocaleDateString('en-US', {
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
  const activeCustomers = users.filter(user => user.isActive).length;

  // New customers (joined within last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newCustomers = users.filter(user => {
    const joinDate = new Date(user.createdAt);
    return joinDate >= thirtyDaysAgo;
  }).length;

  const filteredUsers = users.filter(user => {
    const statusText = user.isActive ? 'active' : 'inactive';
    const matchesSearch =
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statusText.includes(searchTerm.toLowerCase()) ||
      user.joinDate.includes(searchTerm);
    return matchesSearch;
  });

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.email || !newUser.password) {
      toast.error('Please fill in all fields (Name, Username, Email, and Password)');
      return;
    }

    try {
      // Optimistic UI Update for maximum perceived performance
      setIsAddDialogOpen(false);

      const tempUser: UserData = {
        id: 'optimistic_' + Date.now(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: true,
        joinDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        createdAt: new Date().toISOString()
      };

      setUsers(prev => [tempUser, ...prev]);

      const userPayload = { ...newUser };
      setNewUser({ name: '', username: '', email: '', password: '', role: 'customer' });

      // Execute network transaction in background
      await API.users.create({
        name: userPayload.name,
        username: userPayload.username,
        email: userPayload.email,
        password: userPayload.password,
        role: userPayload.role,
        phone: '', // Handled by Supabase later
      });

      toast.success('User added successfully');

      // Refresh list to sync real database IDs behind the scenes
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
      // Revert optimistic update on failure by re-fetching old state
      fetchUsers();
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
      const targetId = passwordConfirmation.userId;

      // Close modal instantly
      setPasswordConfirmation({ isOpen: false, action: null, userId: null });

      try {
        const user = users.find(u => u.id === targetId);
        if (!user) return;

        // Optimistic UI Update
        setUsers(prev => prev.map(u =>
          u.id === targetId ? { ...u, isActive: !u.isActive } : u
        ));

        // Use the proper suspend/unsuspend API endpoints
        if (user.isActive) {
          await API.users.suspend(targetId);
          toast.success(`${user.name}'s account has been deactivated`);
        } else {
          await API.users.unsuspend(targetId);
          toast.success(`${user.name}'s account has been reactivated`);
        }

        // Refresh users list from database in background
        fetchUsers();
      } catch (error) {
        console.error('Error updating user status:', error);
        toast.error('Failed to update user status');
        fetchUsers(); // Revert on failure
      }
    }
  };

  const confirmDeleteUser = async () => {
    if (passwordConfirmation.userId) {
      const targetId = passwordConfirmation.userId;

      // Close modal instantly
      setPasswordConfirmation({ isOpen: false, action: null, userId: null });

      try {
        // Optimistic UI Update
        setUsers(prev => prev.filter(u => u.id !== targetId));

        // Delete user from database
        await API.users.delete(targetId);

        toast.success('User deleted successfully');

        // Refresh silently
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user');
        fetchUsers(); // Revert on failure
      }
    }
  };

  const handleExportToCSV = () => {
    if (filteredUsers.length === 0) {
      toast.error('No customers to export');
      return;
    }

    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Join Date'];
    const formattedUsers = filteredUsers.map(user => ({
      'ID': user.id,
      'Name': user.name,
      'Email': user.email,
      'Role': user.role,
      'Status': user.isActive ? 'Active' : 'Inactive',
      'Join Date': user.joinDate,
    }));
    exportToCSV(formattedUsers, headers, 'customers');
    toast.success(`Exported ${formattedUsers.length} customers to CSV`);
  };

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  return (
    <>
      {/* Analytics Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 md:mb-6">
        <Card className="border-[#DB9D47]/20 bg-gradient-to-br from-white to-amber-50/30">
          <CardContent className="pt-3 sm:pt-4 md:pt-6 p-2.5 sm:p-3 md:p-6">
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1"><span className="hidden sm:inline">Total Customers</span><span className="sm:hidden">Total</span></p>
                <p className="text-lg sm:text-xl md:text-3xl font-bold text-[#DB9D47]">{totalCustomers}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-[#DB9D47]/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#DB9D47]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-gradient-to-br from-white to-green-50/30">
          <CardContent className="pt-3 sm:pt-4 md:pt-6 p-2.5 sm:p-3 md:p-6">
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1"><span className="hidden sm:inline">Active Customers</span><span className="sm:hidden">Active</span></p>
                <p className="text-lg sm:text-xl md:text-3xl font-bold text-green-600">{activeCustomers}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-white to-blue-50/30">
          <CardContent className="pt-3 sm:pt-4 md:pt-6 p-2.5 sm:p-3 md:p-6">
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1"><span className="hidden sm:inline">New (30 Days)</span><span className="sm:hidden">New</span></p>
                <p className="text-lg sm:text-xl md:text-3xl font-bold text-blue-600">{newCustomers}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <UserPlusIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <CardTitle className="text-sm md:text-base">Customer Management</CardTitle>
              <CardDescription className="text-xs md:text-sm hidden sm:block">Manage customer accounts</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#DB9D47] hover:bg-[#C88A35] text-white text-xs md:text-sm px-2 md:px-4">
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    <span>Add User</span>
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
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder="johndoe123"
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
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-6 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddUser}
                      className="bg-[#DB9D47] hover:bg-[#C88D3F] text-white"
                    >
                      Add Customer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                onClick={handleExportToCSV}
                variant="outline"
                className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#FBF7EF] text-xs md:text-sm px-2 md:px-4"
              >
                <Download className="w-4 h-4 mr-1.5" />
                <span>Export Report</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4 px-3 sm:px-6">
          {/* Filters */}
          <div className="flex gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Email</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="hidden md:table-cell text-xs sm:text-sm">Join Date</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
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
                  <TableRow 
                    key={user.id}
                    className="hover:bg-[#FBF7EF] cursor-pointer"
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('button, a')) {
                        setViewingUser(user);
                      }
                    }}
                  >
                    <TableCell className="text-xs sm:text-sm py-2.5 sm:py-3">
                      <div>
                        {user.name}
                        <div className="sm:hidden text-[10px] text-muted-foreground mt-0.5 truncate max-w-[160px]">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{user.email}</TableCell>
                    <TableCell className="py-2.5 sm:py-3">
                      <Badge variant={user.isActive ? 'default' : 'secondary'} className={`text-[10px] sm:text-xs ${user.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {user.isActive ? (
                          <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                        ) : (
                          <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">{user.isActive ? 'Active' : 'Inactive'}</span>
                        <span className="sm:hidden">{user.isActive ? 'On' : 'Off'}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs sm:text-sm">{user.joinDate}</TableCell>
                    <TableCell className="text-right py-2.5 sm:py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 w-7 sm:h-8 sm:w-auto p-0 sm:px-2 ${user.isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}`}
                              onClick={() => handleToggleStatus(user.id)}
                            >
                              {user.isActive ? (
                                <><XCircle className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline text-xs">Deactivate</span></>
                              ) : (
                                <><CheckCircle2 className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline text-xs">Activate</span></>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{user.isActive ? 'Deactivate this account' : 'Activate this account'}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 sm:h-8 sm:w-auto p-0 sm:px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:mr-1" />
                              <span className="hidden sm:inline text-xs">Delete</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete this user permanently</p>
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

        {/* View User Details Dialog (Mobile View) */}
        <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
          <DialogContent className="sm:max-w-md bg-[#FBF7EF] border-[#E8DCC8]">
            <DialogHeader>
              <DialogTitle className="text-[#5C4A3A]">User Details</DialogTitle>
              <DialogDescription className="text-[#87765E]">
                Complete information for this user.
              </DialogDescription>
            </DialogHeader>
            
            {viewingUser && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-3 gap-2 border-b border-[#E8DCC8] pb-3">
                  <span className="text-[#87765E] text-sm">Full Name</span>
                  <span className="col-span-2 text-[#5C4A3A] font-medium text-sm">{viewingUser.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-[#E8DCC8] pb-3">
                  <span className="text-[#87765E] text-sm">Email</span>
                  <span className="col-span-2 text-[#5C4A3A] text-sm break-all">{viewingUser.email}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-[#E8DCC8] pb-3">
                  <span className="text-[#87765E] text-sm">Role</span>
                  <span className="col-span-2">
                    <Badge variant="outline" className="bg-[#E8DCC8] text-[#5C4A3A]">
                      {viewingUser.role}
                    </Badge>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-[#E8DCC8] pb-3">
                  <span className="text-[#87765E] text-sm">Status</span>
                  <span className="col-span-2">
                    <Badge variant="outline" className={viewingUser.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                      {viewingUser.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <span className="text-[#87765E] text-sm">Join Date</span>
                  <span className="col-span-2 text-[#5C4A3A] text-sm">{viewingUser.joinDate}</span>
                </div>
              </div>
            )}
            
            <div className="mt-2 flex justify-end">
              <Button 
                className="bg-[#DB9D47] hover:bg-[#C88A35] text-white" 
                onClick={() => setViewingUser(null)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </>
  );
}