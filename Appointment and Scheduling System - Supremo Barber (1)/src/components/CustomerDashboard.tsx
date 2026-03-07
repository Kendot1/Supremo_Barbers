import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  History, 
  Home,
  UserCircle,
  Scissors,
  LogOut,
  CalendarPlus,
  Menu,
  ChevronDown
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from './ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { CustomerDashboardOverview } from './CustomerDashboardOverview';
import { BookingFlow } from './BookingFlow';
import { RealTimeSlotAvailability } from './RealTimeSlotAvailability';
import { CustomerBookingManagement } from './CustomerBookingManagement';
import { ServicesShowcase } from './ServicesShowcase';
import { CustomerProfile } from './CustomerProfile';
import { FavoritesCart } from './FavoritesCart';
import { NotificationCenter } from './NotificationCenter';
import { NotificationToast } from './NotificationToast';
import { Footer } from './Footer';
import type { User as UserType, Appointment, Notification } from '../App';
import API from '../services/api.service';
import { toast } from 'sonner@2.0.3';
import { favoriteEvents } from '../utils/favoriteEvents';

interface CustomerDashboardProps {
  user: UserType;
  onLogout: () => void;
  appointments: Appointment[];
  onAddAppointment: (appointment: Appointment) => Promise<Appointment>;
  onUpdateAppointments: (appointments: Appointment[]) => void;
  onUserUpdate?: (updatedUser: UserType) => void;
  notifications: Notification[];
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllNotificationsAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  onAddNotification: (notification: Notification) => void;
  preSelectedServiceId?: string | null;
  onClearPreSelectedService?: () => void;
  onSetPreSelectedService?: (serviceId: string) => void;
  preSelectedServiceIds?: string[];
  onSetPreSelectedServiceIds?: (serviceIds: string[]) => void;
}

export function CustomerDashboard({ 
  user, 
  onLogout, 
  appointments, 
  onAddAppointment, 
  onUpdateAppointments,
  onUserUpdate,
  notifications,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  onAddNotification,
  preSelectedServiceId,
  onClearPreSelectedService,
  onSetPreSelectedService,
  preSelectedServiceIds,
  onSetPreSelectedServiceIds
}: CustomerDashboardProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [preSelectedSlot, setPreSelectedSlot] = useState<{
    date: Date;
    time: string;
    barberName: string;
  } | null>(null);
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<string | null>(null);

  // Auto-navigate to booking when a service is pre-selected
  useEffect(() => {
    if (preSelectedServiceId) {
      setActiveTab('book');
    }
  }, [preSelectedServiceId]);

  // Auto-navigate to booking when a slot is pre-selected
  useEffect(() => {
    if (preSelectedSlot) {
      setActiveTab('book');
    }
  }, [preSelectedSlot]);

  // Filter appointments for current user
  const userAppointments = useMemo(() => 
    appointments.filter(apt => apt.userId === user.id || apt.customer_id === user.id),
    [appointments, user.id]
  );

  // Count upcoming bookings (only verified appointments)
  const upcomingCount = useMemo(() => 
    userAppointments.filter(apt => 
      apt.status === 'verified'
    ).length,
    [userAppointments]
  );

  // Calculate total spent based on payment status
  const totalSpent = useMemo(() => {
    let total = 0;
    
    userAppointments.forEach(apt => {
      const amount = apt.total_amount || apt.price || 0;
      
      // If payment is verified (50% down payment paid)
      if (apt.paymentStatus === 'verified' || apt.payment_status === 'verified') {
        total += amount * 0.5; // Add 50%
      }
      
      // If appointment is completed (full payment made)
      if (apt.status === 'completed') {
        total += amount * 0.5; // Add remaining 50%
      }
    });
    
    return total;
  }, [userAppointments]);

  const stats = [
    { label: 'Total Spent', value: `₱${totalSpent.toFixed(2)}`, icon: History, color: 'text-[#DB9D47]' },
    { label: 'Upcoming Bookings', value: upcomingCount.toString(), icon: Calendar, color: 'text-[#94A670]' },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF8]">
      {/* Notification Toast System */}
      <NotificationToast notifications={notifications} userId={user.id} />
      
      {/* Navigation - Aligned with Landing Page */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-[#E8DCC8] z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2">
              <img 
                src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png" 
                alt="Supremo Barber Logo" 
                className="h-10 w-10 sm:h-12 sm:w-12"
              />
              <div>
                <span className="text-base sm:text-xl text-[#5C4A3A]">Supremo Barber</span>
                
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              <button
                onClick={() => setActiveTab('home')}
                className={`text-sm transition-all pb-1 border-b-2 cursor-pointer ${
                  activeTab === 'home' 
                    ? 'border-[#DB9D47] text-[#DB9D47]' 
                    : 'border-transparent text-[#87765E] hover:text-[#DB9D47] hover:border-[#DB9D47]'
                }`}
              >
                Home
              </button>
              
              {/* Bookings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-1 text-sm transition-all pb-1 border-b-2 cursor-pointer ${
                      activeTab === 'book' || activeTab === 'slots' || activeTab === 'manage'
                        ? 'border-[#DB9D47] text-[#DB9D47]' 
                        : 'border-transparent text-[#87765E] hover:text-[#DB9D47] hover:border-[#DB9D47]'
                    }`}
                  >
                    Bookings
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-white border-[#E8DCC8]">
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('book')}
                    className="cursor-pointer focus:bg-[#FBF7EF] focus:text-[#5C4A3A]"
                  >
                    <CalendarPlus className="w-4 h-4 mr-2 text-[#DB9D47]" />
                    Book Appointment
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('slots')}
                    className="cursor-pointer focus:bg-[#FBF7EF] focus:text-[#5C4A3A]"
                  >
                    <Clock className="w-4 h-4 mr-2 text-[#94A670]" />
                    View Slots
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('manage')}
                    className="cursor-pointer focus:bg-[#FBF7EF] focus:text-[#5C4A3A]"
                  >
                    <History className="w-4 h-4 mr-2 text-[#D98555]" />
                    My Bookings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => setActiveTab('services')}
                className={`text-sm transition-all pb-1 border-b-2 cursor-pointer ${
                  activeTab === 'services' 
                    ? 'border-[#DB9D47] text-[#DB9D47]' 
                    : 'border-transparent text-[#87765E] hover:text-[#DB9D47] hover:border-[#DB9D47]'
                }`}
              >
                Services
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`text-sm transition-all pb-1 border-b-2 cursor-pointer ${
                  activeTab === 'profile'
                    ? 'border-[#DB9D47] text-[#DB9D47]'
                    : 'border-transparent text-[#87765E] hover:text-[#DB9D47] hover:border-[#DB9D47]'
                }`}
              >
                Profile
              </button>
              <FavoritesCart
                userId={user.id}
                onBookService={(serviceId) => {
                  if (onSetPreSelectedService) {
                    onSetPreSelectedService(serviceId);
                    setActiveTab('book');
                  }
                }}
                onBookMultipleServices={(serviceIds) => {
                  if (onSetPreSelectedServiceIds) {
                    onSetPreSelectedServiceIds(serviceIds);
                    setActiveTab('book');
                  }
                }}
              />
              <NotificationCenter
                userId={user.id}
                userRole="customer"
                onNavigate={(url) => {
                  // Parse URL and extract query parameters
                  const [path, queryString] = url.split('?');
                  const params = new URLSearchParams(queryString || '');
                  const highlightId = params.get('highlight');
                  
                  // Map the URL to dashboard tabs
                  if (path === '/appointments') {
                    setActiveTab('manage');
                    // Set highlighted appointment ID if present
                    if (highlightId) {
                      setHighlightedAppointmentId(highlightId);
                      // Clear highlight after 5 seconds
                      setTimeout(() => setHighlightedAppointmentId(null), 5000);
                    }
                  } else if (path === '/profile') {
                    setActiveTab('profile');
                  }
                }}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={onLogout}
                className="border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF] cursor-pointer"
              >
                Logout
              </Button>
            </div>

            {/* Mobile Navigation - Hamburger Menu */}
            <div className="flex lg:hidden items-center gap-2">
              <FavoritesCart
                userId={user.id}
                onBookService={(serviceId) => {
                  if (onSetPreSelectedService) {
                    onSetPreSelectedService(serviceId);
                    setActiveTab('book');
                  }
                }}
                onBookMultipleServices={(serviceIds) => {
                  if (onSetPreSelectedServiceIds) {
                    onSetPreSelectedServiceIds(serviceIds);
                    setActiveTab('book');
                  }
                }}
              />
              <NotificationCenter
                userId={user.id}
                userRole="customer"
                onNavigate={(url) => {
                  // Map the URL to dashboard tabs
                  if (url === '/appointments') {
                    setActiveTab('manage');
                  } else if (url === '/profile') {
                    setActiveTab('profile');
                  }
                }}
              />
              
              {/* Hamburger Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-[#5C4A3A] hover:bg-[#FBF7EF]"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] bg-white border-l border-[#E8DCC8]">
                  <SheetHeader>
                    <SheetTitle className="text-[#5C4A3A] flex items-center gap-2">
                      <img 
                        src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                        alt="Supremo Barber Logo" 
                        className="h-8 w-8"
                      />
                      Menu
                    </SheetTitle>
                    <SheetDescription className="text-[#87765E]">
                      Navigate through your dashboard
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-6 flex flex-col gap-2">
                    {/* Menu Items */}
                    <button
                      onClick={() => {
                        setActiveTab('home');
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                        activeTab === 'home' 
                          ? 'bg-[#DB9D47] text-white' 
                          : 'text-[#5C4A3A] hover:bg-[#FBF7EF]'
                      }`}
                    >
                      <Home className="w-5 h-5" />
                      <span>Home</span>
                    </button>

                    {/* Bookings Collapsible */}
                    <Collapsible>
                      <CollapsibleTrigger className="w-full">
                        <div className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${
                          activeTab === 'book' || activeTab === 'slots' || activeTab === 'manage'
                            ? 'bg-[#DB9D47] text-white' 
                            : 'text-[#5C4A3A] hover:bg-[#FBF7EF]'
                        }`}>
                          <div className="flex items-center gap-3">
                            <CalendarPlus className="w-5 h-5" />
                            <span>Bookings</span>
                          </div>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-1 ml-4 space-y-1">
                        <button
                          onClick={() => {
                            setActiveTab('book');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                            activeTab === 'book' 
                              ? 'bg-[#DB9D47]/20 text-[#DB9D47]' 
                              : 'text-[#87765E] hover:bg-[#FBF7EF]'
                          }`}
                        >
                          <CalendarPlus className="w-4 h-4" />
                          <span>Book Appointment</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('slots');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                            activeTab === 'slots' 
                              ? 'bg-[#94A670]/20 text-[#94A670]' 
                              : 'text-[#87765E] hover:bg-[#FBF7EF]'
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                          <span>View Slots</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('manage');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                            activeTab === 'manage' 
                              ? 'bg-[#D98555]/20 text-[#D98555]' 
                              : 'text-[#87765E] hover:bg-[#FBF7EF]'
                          }`}
                        >
                          <History className="w-4 h-4" />
                          <span>My Bookings</span>
                        </button>
                      </CollapsibleContent>
                    </Collapsible>

                    <button
                      onClick={() => {
                        setActiveTab('services');
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                        activeTab === 'services' 
                          ? 'bg-[#DB9D47] text-white' 
                          : 'text-[#5C4A3A] hover:bg-[#FBF7EF]'
                      }`}
                    >
                      <Scissors className="w-5 h-5" />
                      <span>Services</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                        activeTab === 'profile' 
                          ? 'bg-[#DB9D47] text-white' 
                          : 'text-[#5C4A3A] hover:bg-[#FBF7EF]'
                      }`}
                    >
                      <UserCircle className="w-5 h-5" />
                      <span>Profile</span>
                    </button>

                    {/* Divider */}
                    <div className="h-px bg-[#E8DCC8] my-2" />

                    {/* Logout Button */}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogout();
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-[#E57373] hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  </div>

                  {/* User Info at Bottom */}
                  <div className="absolute bottom-6 left-0 right-0 px-6">
                    <div className="bg-[#FBF7EF] border border-[#E8DCC8] rounded-lg p-3">
                      <p className="text-xs text-[#87765E] mb-1">Logged in as</p>
                      <p className="text-sm text-[#5C4A3A]">{user.name}</p>
                      <p className="text-xs text-[#87765E]">{user.email}</p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Stats Grid - Only show on home tab */}
        {activeTab === 'home' && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {stats.map((stat, index) => (
              <Card key={index} className="border-[#E8DCC8]">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                  </div>
                  <div className="text-xl sm:text-2xl text-[#5C4A3A] mb-1">{stat.value}</div>
                  <p className="text-xs sm:text-sm text-[#87765E]">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Content based on active tab */}
        <div>
          {activeTab === 'home' && (
            <CustomerDashboardOverview 
              user={user}
              appointments={appointments}
              onNavigate={setActiveTab}
              onUpdateAppointments={onUpdateAppointments}
              onSelectSlot={(date, time, barberName) => {
                setPreSelectedSlot({ date, time, barberName });
              }}
            />
          )}

          {activeTab === 'book' && (
            <BookingFlow
              user={user}
              appointments={appointments}
              onAddAppointment={onAddAppointment}
              onBookingComplete={async (bookedServiceIds) => {
                setActiveTab('manage');
                setPreSelectedSlot(null);
                
                // Remove booked services from favorites
                if (bookedServiceIds && bookedServiceIds.length > 0) {
                  try {
                    // Remove each booked service from favorites
                    await Promise.all(
                      bookedServiceIds.map(async (serviceId) => {
                        await API.favorites.remove(user.id, serviceId);
                        // Emit event to update UI in real-time
                        favoriteEvents.removeFavorite(user.id, serviceId);
                      })
                    );
                    toast.success(`${bookedServiceIds.length} service(s) removed from favorites`);
                  } catch (error) {
                    console.error('Error removing services from favorites:', error);
                    // Don't show error to user as booking already succeeded
                  }
                }
              }}
              preSelectedServiceId={preSelectedServiceId}
              onClearPreSelectedService={onClearPreSelectedService}
              preSelectedServiceIds={preSelectedServiceIds}
              onClearPreSelectedServiceIds={() => {
                if (onSetPreSelectedServiceIds) {
                  onSetPreSelectedServiceIds([]);
                }
              }}
              preSelectedSlot={preSelectedSlot}
              onClearPreSelectedSlot={() => setPreSelectedSlot(null)}
            />
          )}

          {activeTab === 'slots' && (
            <RealTimeSlotAvailability />
          )}

          {activeTab === 'manage' && (
            <CustomerBookingManagement
              user={user}
              appointments={appointments}
              onUpdateAppointments={onUpdateAppointments}
              onNavigateToBooking={() => setActiveTab('book')}
              onSetPreSelectedService={onSetPreSelectedService}
              highlightedAppointmentId={highlightedAppointmentId}
            />
          )}

          {activeTab === 'services' && (
            <ServicesShowcase 
              onBookService={() => setActiveTab('book')} 
              onServiceClick={(serviceId) => {
                if (onSetPreSelectedService) {
                  onSetPreSelectedService(serviceId);
                  setActiveTab('book');
                }
              }}
              userId={user.id}
            />
          )}

          {activeTab === 'profile' && (
            <CustomerProfile user={user} onUserUpdate={onUserUpdate} onLogout={onLogout} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}