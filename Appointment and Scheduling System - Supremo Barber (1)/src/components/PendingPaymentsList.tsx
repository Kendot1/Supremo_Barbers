import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { 
  CreditCard, Scissors, Calendar as CalendarIcon
} from 'lucide-react';
import type { Appointment } from '../App';
import { FaPesoSign } from 'react-icons/fa6';
interface PendingPaymentsListProps {
  appointments: Appointment[];
  onViewAll: () => void;
  maxDisplay?: number;
}

export function PendingPaymentsList({ 
  appointments, 
  onViewAll,
  maxDisplay = 5 
}: PendingPaymentsListProps) {
  // Filter appointments with pending payment verification
  const pendingPaymentVerifications = appointments.filter(apt => 
    apt.paymentProof && apt.paymentStatus === 'pending' && apt.status === 'upcoming'
  );

  // Don't render if there are no pending payments
  if (pendingPaymentVerifications.length === 0) {
    return null;
  }

  return (
    <Card className="border-[#E8DCC8]">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-[#FFA726] p-2 rounded-lg">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-[#5C4A3A]">Pending Payment Verifications</h3>
              <p className="text-xs md:text-sm text-[#87765E]">
                {pendingPaymentVerifications.length} payment{pendingPaymentVerifications.length !== 1 ? 's' : ''} awaiting verification
              </p>
            </div>
          </div>
          <Button
            onClick={onViewAll}
            className="bg-[#DB9D47] hover:bg-[#C88A35] text-white text-xs md:text-sm"
          >
            View All
          </Button>
        </div>

        <div className="space-y-3">
          {pendingPaymentVerifications.slice(0, maxDisplay).map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8] hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[#5C4A3A] truncate">
                    {appointment.customerName || 'Unknown Customer'}
                  </p>
                  <span className="px-2 py-0.5 bg-[#FFA726] text-white text-xs rounded-full flex-shrink-0">
                    Pending
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs md:text-sm text-[#87765E]">
                  <div className="flex items-center gap-1">
                    <Scissors className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{appointment.service}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                    <span>{new Date(appointment.date).toLocaleDateString()} • {appointment.time}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs md:text-sm text-[#87765E] mt-1">
                  <FaPesoSign className="w-3 h-3" />
                  <span>₱{appointment.price.toLocaleString()}</span>
                  <span className="text-[#87765E] ml-1">
                    (50% down: ₱{(appointment.price * 0.5).toLocaleString()})
                  </span>
                </div>
              </div>
              <Button
                onClick={onViewAll}
                variant="outline"
                size="sm"
                className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#FBF7EF] ml-2 flex-shrink-0"
              >
                Verify
              </Button>
            </div>
          ))}
        </div>

        {pendingPaymentVerifications.length > maxDisplay && (
          <div className="mt-4 text-center">
            <Button
              onClick={onViewAll}
              variant="ghost"
              className="text-[#DB9D47] hover:bg-[#FBF7EF] text-sm"
            >
              + {pendingPaymentVerifications.length - maxDisplay} more pending verification{pendingPaymentVerifications.length - maxDisplay !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
