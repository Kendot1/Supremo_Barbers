import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { CalendarPlus, Clock, History } from 'lucide-react';
import { BookingFlow } from './BookingFlow';
import { RealTimeSlotAvailability } from './RealTimeSlotAvailability';
import { CustomerBookingManagement } from './CustomerBookingManagement';
import type { User as UserType, Appointment } from '../App';

interface UnifiedBookingModuleProps {
  user: UserType;
  appointments: Appointment[];
  onAddAppointment: (appointment: Appointment) => void;
  onUpdateAppointments: (appointments: Appointment[]) => void;
  onBookingComplete?: () => void;
}

export function UnifiedBookingModule({
  user,
  appointments,
  onAddAppointment,
  onUpdateAppointments,
  onBookingComplete,
}: UnifiedBookingModuleProps) {
  const [activeTab, setActiveTab] = useState<'book' | 'slots' | 'manage'>('book');

  const handleBookingComplete = () => {
    // Switch to My Bookings tab after successful booking
    setActiveTab('manage');
    onBookingComplete?.();
  };

  const handleNavigateToBooking = () => {
    setActiveTab('book');
  };

  const tabs = [
    {
      id: 'book' as const,
      label: 'Book Appointment',
      icon: CalendarPlus,
      description: 'Schedule a new appointment',
    },
    {
      id: 'slots' as const,
      label: 'View Slots',
      icon: Clock,
      description: 'Check available time slots',
    },
    {
      id: 'manage' as const,
      label: 'My Bookings',
      icon: History,
      description: 'Manage your appointments',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <Card className="border-[#E8DCC8] bg-gradient-to-br from-[#FBF7EF] to-white shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-start gap-3 p-4 rounded-lg border-2 transition-all
                    ${isActive
                      ? 'border-[#DB9D47] bg-gradient-to-br from-[#DB9D47] to-[#D98555] text-white shadow-lg'
                      : 'border-[#E8DCC8] bg-white text-[#5C4A3A] hover:border-[#DB9D47]/50 hover:bg-[#FBF7EF]'
                    }
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                    ${isActive 
                      ? 'bg-white/20' 
                      : 'bg-gradient-to-br from-[#DB9D47]/10 to-[#D98555]/10'
                    }
                  `}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#DB9D47]'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`text-sm sm:text-base ${isActive ? 'text-white' : 'text-[#5C4A3A]'}`}>
                      {tab.label}
                    </div>
                    <div className={`text-xs mt-1 ${isActive ? 'text-white/90' : 'text-[#87765E]'}`}>
                      {tab.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-white flex-shrink-0 mt-2" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content based on active tab */}
      <div className="animate-in fade-in duration-300">
        {activeTab === 'book' && (
          <BookingFlow
            user={user}
            appointments={appointments}
            onAddAppointment={onAddAppointment}
            onBookingComplete={handleBookingComplete}
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
            onNavigateToBooking={handleNavigateToBooking}
          />
        )}
      </div>
    </div>
  );
}
