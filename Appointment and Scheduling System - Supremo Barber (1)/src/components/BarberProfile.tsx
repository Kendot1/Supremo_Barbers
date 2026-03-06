import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User, Mail, Phone, Save, Calendar, DollarSign, Star, Scissors, Clock, Loader2, AlertTriangle, Camera, Upload } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import type { User as UserType, Appointment } from '../App';
import API from '../services/api.service';
import { normalizeR2Url } from '../utils/avatarUrl';
import { 
  logProfileUpdate, 
  logPasswordChange, 
  logAvatarUpload 
} from '../services/audit-notification.service';
import { PasswordInput, ConfirmPasswordInput } from './ui/PasswordInput';
import { validatePassword } from '@/utils/passwordValidator';

interface BarberProfileProps {
  user: UserType;
  appointments: Appointment[];
  onUserUpdate?: (updatedUser: UserType) => void;
}

export function BarberProfile({ user, appointments, onUserUpdate }: BarberProfileProps) {
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    avatarUrl: user.avatarUrl || '',
    bio: 'Experienced barber specializing in modern and classic cuts. Over 5 years of experience making clients look their best.',
    specialties: 'Fade, Taper, Beard Styling, Classic Cuts',
  });
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showProfileConfirm, setShowProfileConfirm] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update profile state when user prop changes (e.g., after avatar upload)
  useEffect(() => {
    console.log('👤 User prop changed, updating profile state with:', user);
    setProfile(prev => ({
      ...prev,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      avatarUrl: user.avatarUrl || '',
    }));
  }, [user]);

  // Calculate barber statistics
  const barberAppointments = appointments.filter(apt => apt.barber === user.name);
  const completedAppointments = barberAppointments.filter(apt => apt.status === 'completed');
  const totalEarnings = completedAppointments.reduce((sum, apt) => sum + apt.price, 0);
  const avgRating = completedAppointments.length >= 10 ? '4.8' : completedAppointments.length > 0 ? '5.0' : 'N/A';

  const handleSaveProfile = async () => {
    setShowProfileConfirm(false);
    setLoading(true);
    try {
      // Simulate API call to update profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Profile updated successfully!', {
        description: 'Your professional information has been saved.'
      });
      logProfileUpdate(user.name);
      if (onUserUpdate) {
        onUserUpdate({ ...user, ...profile });
      }
    } catch (error) {
      toast.error('Failed to update profile', {
        description: 'Please try again later.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    // Comprehensive password validation
    const passwordValidation = validatePassword(passwordData.newPassword, user.name);
    if (!passwordValidation.isValid) {
      toast.error('Password does not meet security requirements', {
        description: passwordValidation.issues[0] || 'Please create a stronger password'
      });
      return;
    }

    setShowPasswordConfirm(false);
    setPasswordLoading(true);
    try {
      // Debug: Log the user ID being sent
      console.log('🔐 Attempting password change for user:', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        userObject: user
      });

      // WORKAROUND: First verify the user exists in the database
      console.log('🔍 Verifying user exists in database...');
      try {
        const userInDb = await API.users.getById(user.id);
        console.log('✅ User found in database:', userInDb);
      } catch (verifyError: any) {
        console.error('❌ User not found in database:', verifyError);
        toast.error('Account verification failed', {
          description: 'Your user account was not found in the database. Please log out and log back in, or contact support.'
        });
        setPasswordLoading(false);
        return;
      }
      
      // Call API to change password
      const result = await API.users.changePassword(user.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      console.log('✅ Password change result:', result);

      // Log password change to audit logs
      await logPasswordChange(
        user.id,
        user.role as 'barber',
        user.name,
        user.email,
        false
      );

      toast.success('Password changed successfully!', {
        description: 'Your new password is now active.'
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('❌ Error changing password:', error);
      
      // Better error message handling
      let errorMsg = 'Please check your current password and try again.';
      if (error.message) {
        if (error.message.includes('Current password is incorrect')) {
          errorMsg = 'Current password is incorrect. Please try again.';
        } else if (error.message.includes('User not found')) {
          errorMsg = 'Your account was not found in the database. Please try logging out and back in.';
        } else {
          errorMsg = error.message;
        }
      }
      
      toast.error('Failed to change password', {
        description: errorMsg
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file size must be less than 5MB');
      return;
    }

    // Upload to Cloudflare R2 immediately
    try {
      setIsUploadingAvatar(true);
      toast.loading('Uploading avatar to Cloudflare R2...', { id: 'avatar-upload' });

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', 'avatar'); // Specify upload type for proper folder organization

      console.log('📤 Uploading avatar to Cloudflare R2...');
      const response = await API.uploadImage(uploadFormData);
      console.log('✅ Upload response:', response);
      
      // Validate response
      if (!response || !response.url) {
        console.error('❌ Invalid response from upload API:', response);
        throw new Error('Upload failed: No URL returned from server');
      }
      
      console.log('🖼️ Avatar URL received:', response.url);
      
      // Set the R2 URL in profile data
      setProfile({ ...profile, avatarUrl: response.url });
      
      // Update user in database
      console.log('💾 Updating user in database with avatarUrl:', response.url);
      const updatedUser = await API.users.update(user.id, { avatarUrl: response.url });
      console.log('✅ Database update response:', updatedUser);
      
      // Update localStorage
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.avatarUrl = response.url;
        localStorage.setItem('currentUser', JSON.stringify(parsedUser));
        console.log('💾 Updated localStorage with new avatarUrl');
      }
      
      // Update parent component's user state
      if (onUserUpdate) {
        console.log('🔄 Calling onUserUpdate with new avatarUrl');
        onUserUpdate({ ...user, avatarUrl: response.url });
      }
      
      // Log avatar upload to audit logs
      await logAvatarUpload(
        user.id,
        user.role as 'barber',
        user.name,
        user.email,
        response.url
      );
      
      toast.success('Avatar uploaded successfully!', { id: 'avatar-upload' });
    } catch (error) {
      console.error('❌ Avatar upload error:', error);
      toast.error('Failed to upload avatar', { id: 'avatar-upload' });
      
      // Clear the file input on error
      if (event.target) {
        event.target.value = '';
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUploadClick = () => {
    document.getElementById('avatar-upload-input')?.click();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[#5C4A3A] mb-2">Barber Profile</h1>
        <p className="text-[#87765E]">Manage your professional information and account settings</p>
      </div>

      {/* Professional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-[#DB9D47]" />
              <p className="text-sm text-[#87765E]">Total Bookings</p>
            </div>
            <p className="text-2xl text-[#5C4A3A]">{barberAppointments.length}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Scissors className="w-5 h-5 text-[#94A670]" />
              <p className="text-sm text-[#87765E]">Completed</p>
            </div>
            <p className="text-2xl text-[#5C4A3A]">{completedAppointments.length}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-[#D98555]" />
              <p className="text-sm text-[#87765E]">Total Earnings</p>
            </div>
            <p className="text-2xl text-[#5C4A3A]">₱{totalEarnings.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-5 h-5 text-[#B89968]" />
              <p className="text-sm text-[#87765E]">Avg Rating</p>
            </div>
            <p className="text-2xl text-[#5C4A3A]">{avgRating}</p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Information */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <CardTitle className="text-[#5C4A3A]">Profile Information</CardTitle>
          <CardDescription className="text-[#87765E]">Update your personal and professional details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-20 h-20 bg-[#DB9D47] text-white">
                <AvatarImage src={normalizeR2Url(profile.avatarUrl || user.avatarUrl || '')} alt={profile.name} />
                <AvatarFallback className="text-2xl bg-[#DB9D47] text-white">{getInitials(profile.name)}</AvatarFallback>
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
                id="avatar-upload-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <h3 className="text-[#5C4A3A]">{profile.name}</h3>
              <p className="text-sm text-[#87765E]">{profile.email}</p>
              <span className="text-xs text-[#87765E] mt-2 block">Barber since {new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#5C4A3A]">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="pl-9 border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#5C4A3A]">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="09XXXXXXXXX"
                  className="pl-9 border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#5C4A3A]">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="pl-9 border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-[#5C4A3A]">Professional Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell customers about your experience and expertise..."
              rows={4}
              className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialties" className="text-[#5C4A3A]">Specialties</Label>
            <Input
              id="specialties"
              value={profile.specialties}
              onChange={(e) => setProfile({ ...profile, specialties: e.target.value })}
              placeholder="e.g., Fade, Taper, Beard Styling"
              className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
            />
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
          <CardTitle className="text-[#5C4A3A]">Change Password</CardTitle>
          <CardDescription className="text-[#87765E]">Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PasswordInput
            label="Current Password"
            id="currentPassword"
            value={passwordData.currentPassword}
            onChange={(value) => setPasswordData({ ...passwordData, currentPassword: value })}
            placeholder="••••••••"
            showStrength={false}
            className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
          />

          <PasswordInput
            label="New Password"
            id="newPassword"
            value={passwordData.newPassword}
            onChange={(value) => setPasswordData({ ...passwordData, newPassword: value })}
            placeholder="••••••••"
            showStrength={true}
            userName={user.name}
            className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
          />

          <ConfirmPasswordInput
            label="Confirm New Password"
            id="confirmPassword"
            value={passwordData.confirmPassword}
            onChange={(value) => setPasswordData({ ...passwordData, confirmPassword: value })}
            password={passwordData.newPassword}
            placeholder="••••••••"
            className="border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
          />

          <Button 
            onClick={() => {
              // Validate first before showing confirmation
              if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
                toast.error('Please fill in all password fields');
                return;
              }
              if (passwordData.newPassword !== passwordData.confirmPassword) {
                toast.error('New passwords do not match');
                return;
              }
              
              // Comprehensive password validation
              const passwordValidation = validatePassword(passwordData.newPassword, user.name);
              if (!passwordValidation.isValid) {
                toast.error('Password does not meet security requirements', {
                  description: passwordValidation.issues[0] || 'Please create a stronger password'
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
              'Update Password'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Profile Confirmation Dialog */}
      <AlertDialog open={showProfileConfirm} onOpenChange={setShowProfileConfirm}>
        <AlertDialogContent className="border-[#E8DCC8]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#5C4A3A] flex items-center gap-2">
              <Save className="w-5 h-5 text-[#DB9D47]" />
              Confirm Profile Changes
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#87765E]">
              Are you sure you want to save these changes to your professional profile? This will update your information visible to customers.
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
      <AlertDialog open={showPasswordConfirm} onOpenChange={setShowPasswordConfirm}>
        <AlertDialogContent className="border-[#E8DCC8]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#D98555] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Password Change
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#87765E] space-y-2">
              <p className="font-medium">⚠️ Important Security Update</p>
              <p>You are about to change your account password. After this change:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>You will need to use the new password to log in</li>
                <li>All active sessions will remain logged in</li>
                <li>Make sure to remember your new password</li>
              </ul>
              <p className="mt-3">Do you want to proceed with changing your password?</p>
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