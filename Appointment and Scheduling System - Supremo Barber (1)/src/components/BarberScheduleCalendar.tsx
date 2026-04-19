import { useState } from "react";
import { Badge } from "./ui/badge";
import { User, CalendarDays, CreditCard, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import type { Appointment } from "../App";
import { AppointmentCalendar } from "./AppointmentCalendar";

interface BarberScheduleCalendarProps {
  appointments: Appointment[];
  barberName: string;
}

export function BarberScheduleCalendar({ appointments, barberName }: BarberScheduleCalendarProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <>
      <AppointmentCalendar
        appointments={appointments}
        viewMode="all"
        onEventClick={(apt) => {
          setSelectedAppointment(apt);
          setIsDetailsOpen(true);
        }}
      />

      {/* Appointment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#5C4A3A]">Appointment Details</DialogTitle>
            <DialogDescription className="text-[#87765E]">
              Full information about this appointment
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4 py-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#87765E]">Status</span>
                <Badge
                  className={`${selectedAppointment.status === 'upcoming' || selectedAppointment.status === 'completed'
                      ? 'bg-[#DB9D47] hover:bg-[#C88A3A]'
                      : selectedAppointment.status === 'cancelled'
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-orange-500 hover:bg-orange-600'
                    } text-white capitalize`}
                >
                  {selectedAppointment.status}
                </Badge>
              </div>

              <Separator className="bg-[#E8DCC8]" />

              {/* Customer Information */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[#5C4A3A] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#DB9D47]" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <p className="text-xs text-[#87765E]">Name</p>
                    <p className="text-sm text-[#5C4A3A]">{selectedAppointment.customerName || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-[#E8DCC8]" />

              {/* Appointment Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[#5C4A3A] flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#DB9D47]" />
                  Appointment Details
                </h4>
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <p className="text-xs text-[#87765E]">Service</p>
                    <p className="text-sm text-[#5C4A3A]">{selectedAppointment.service}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#87765E]">Barber</p>
                    <p className="text-sm text-[#5C4A3A]">{selectedAppointment.barber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#87765E]">Date</p>
                    <p className="text-sm text-[#5C4A3A]">
                      {new Date(selectedAppointment.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#87765E]">Time</p>
                    <p className="text-sm text-[#5C4A3A]">{selectedAppointment.time}</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-[#E8DCC8]" />

              {/* Payment Information */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[#5C4A3A] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#DB9D47]" />
                  Payment Information
                </h4>
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <p className="text-xs text-[#87765E]">Total Price</p>
                    <p className="text-sm text-[#5C4A3A]">₱{selectedAppointment.price}</p>
                  </div>
                  {selectedAppointment.downPaymentPaid && (
                    <>
                      <div>
                        <p className="text-xs text-[#87765E]">Down Payment</p>
                        <p className="text-sm text-green-600">₱{(selectedAppointment.price * 0.5).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#87765E]">Remaining Balance</p>
                        <p className="text-sm text-orange-600">
                          ₱{selectedAppointment.remainingBalance || (selectedAppointment.price * 0.5).toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}
                  {selectedAppointment.paymentStatus && (
                    <div>
                      <p className="text-xs text-[#87765E]">Payment Status</p>
                      <Badge
                        className={`${selectedAppointment.paymentStatus === 'verified'
                            ? 'bg-green-500 hover:bg-green-600'
                            : selectedAppointment.paymentStatus === 'rejected'
                              ? 'bg-red-500 hover:bg-red-600'
                              : 'bg-orange-500 hover:bg-orange-600'
                          } text-white capitalize text-xs`}
                      >
                        {selectedAppointment.paymentStatus}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Loyalty Points */}
              {selectedAppointment.loyaltyPointsEarned && (
                <>
                  <Separator className="bg-[#E8DCC8]" />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-[#5C4A3A] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#DB9D47]" />
                      Loyalty Points
                    </h4>
                    <div className="pl-6">
                      <p className="text-xs text-[#87765E]">Points Earned</p>
                      <p className="text-sm text-[#DB9D47] font-medium">
                        {selectedAppointment.loyaltyPointsEarned} points
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Payment Proof Image */}
              {selectedAppointment.paymentProof && (
                <>
                  <Separator className="bg-[#E8DCC8]" />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-[#5C4A3A]">Payment Proof</h4>
                    <div className="rounded-lg overflow-hidden border border-[#E8DCC8]">
                      <img
                        src={selectedAppointment.paymentProof}
                        alt="Payment Proof"
                        className="w-full h-auto max-h-[300px] object-contain bg-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                  className="flex-1 border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF]"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
