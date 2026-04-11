import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Loader2,
  CheckCircle,
  Upload,
  Calendar as CalendarIcon,
  Clock,
  Scissors,
  User,
  X,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../utils/supabase/info.tsx";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
}

interface Barber {
  id: string;
  name: string;
  phone?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface ChatBookingProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
  } | null;
  onComplete: (bookingData: any) => void;
  onCancel: () => void;
  onAddAppointment?: (appointment: any) => Promise<any>;
}

type BookingStep =
  | "customer"
  | "service"
  | "barber"
  | "datetime"
  | "payment"
  | "complete";

export function ChatBooking({
  currentUser,
  onComplete,
  onCancel,
  onAddAppointment,
}: ChatBookingProps) {
  const [step, setStep] = useState<
    | "customer"
    | "service"
    | "barber"
    | "datetime"
    | "payment"
    | "complete"
  >(currentUser?.role === "admin" ? "customer" : "service");
  const [selectedCustomer, setSelectedCustomer] =
    useState<any>(null);
  const [selectedService, setSelectedService] =
    useState<any>(null);
  const [selectedBarber, setSelectedBarber] =
    useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [paymentProof, setPaymentProof] = useState("");
  const [paymentFile, setPaymentFile] = useState<File | null>(
    null,
  );
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);

  // Search states
  const [customerSearch, setCustomerSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [barberSearch, setBarberSearch] = useState("");

  // Available time slots (AM/PM format to match BookingFlow)
  const timeSlots = [
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "12:00 PM",
    "12:30 PM",
    "01:00 PM",
    "01:30 PM",
    "02:00 PM",
    "02:30 PM",
    "03:00 PM",
    "03:30 PM",
    "04:00 PM",
    "04:30 PM",
    "05:00 PM",
    "05:30 PM",
    "06:00 PM",
    "06:30 PM",
  ];

  // Filter functions
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name
        .toLowerCase()
        .includes(customerSearch.toLowerCase()) ||
      customer.email
        .toLowerCase()
        .includes(customerSearch.toLowerCase()),
  );

  const filteredServices = services.filter(
    (service) =>
      service.name
        .toLowerCase()
        .includes(serviceSearch.toLowerCase()) ||
      (service.description || "")
        .toLowerCase()
        .includes(serviceSearch.toLowerCase()),
  );

  const filteredBarbers = barbers.filter((barber) =>
    barber.name
      .toLowerCase()
      .includes(barberSearch.toLowerCase()),
  );

  // Debug: Log when component mounts
  useEffect(() => {
    console.log("🔧 ChatBooking mounted with:", {
      hasOnAddAppointment: !!onAddAppointment,
      onAddAppointmentType: typeof onAddAppointment,
      currentUser: currentUser?.name,
      role: currentUser?.role,
    });
  }, [onAddAppointment, currentUser]);

  // Fetch data on mount
  useEffect(() => {
    fetchServices();
    fetchBarbers();
    fetchAppointments();
    if (currentUser?.role === "admin") {
      fetchCustomers();
    }

    // Real-time data polling every 10 seconds
    const interval = setInterval(() => {
      fetchServices();
      fetchBarbers();
      fetchAppointments();
      if (currentUser?.role === "admin") {
        fetchCustomers();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Debug: Log when services/barbers/customers change
  useEffect(() => {
    console.log("📊 ChatBooking data state updated:", {
      servicesCount: services.length,
      barbersCount: barbers.length,
      customersCount: customers.length,
      appointmentsCount: appointments.length,
      services: services,
      barbers: barbers,
      appointments: appointments,
    });
  }, [services, barbers, customers, appointments]);

  const fetchServices = async () => {
    try {
      console.log(
        "🔍 ChatBooking: Fetching services from API...",
      );
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/services`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );
      console.log(
        "🔍 ChatBooking: Services API response status:",
        response.status,
      );
      if (response.ok) {
        const data = await response.json();
        console.log(
          "✅ ChatBooking: Services fetched successfully:",
          data,
        );
        setServices(data.data || data.services || []);
      } else {
        const errorText = await response.text();
        console.error(
          "❌ ChatBooking: Services API error:",
          response.status,
          errorText,
        );
      }
    } catch (error) {
      console.error(
        "❌ ChatBooking: Failed to fetch services:",
        error,
      );
    }
  };

  const fetchBarbers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/barbers`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );
      if (response.ok) {
        const data = await response.json();
        setBarbers(data.data || data.barbers || []);
      }
    } catch (error) {
      console.error("Failed to fetch barbers:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/users`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );
      if (response.ok) {
        const data = await response.json();
        const customersList = (
          data.data ||
          data.users ||
          []
        ).filter((u: any) => u.role === "customer");
        setCustomers(customersList);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/appointments`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.data || data.appointments || []);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    }
  };

  // Helper to convert time string to minutes since midnight (handles AM/PM format)
  const timeToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let totalHours = hours;

    if (period === "PM" && hours !== 12) {
      totalHours += 12;
    } else if (period === "AM" && hours === 12) {
      totalHours = 0;
    }

    return totalHours * 60 + minutes;
  };

  // Helper to get service duration by name
  const getServiceDuration = (serviceName: string): number => {
    const service = services.find(
      (s) => s.name === serviceName,
    );
    return service?.duration || 30;
  };

  // Check if a time slot is available (matches BookingFlow logic)
  const isTimeSlotTaken = (time: string): boolean => {
    if (!selectedBarber || !selectedDate || !selectedService) {
      return false;
    }

    // Skip check for "Any Available Barber"
    if (selectedBarber.id === "any") {
      return false;
    }

    // Format the selected date to match appointment date format (YYYY-MM-DD)
    const dateObj = new Date(selectedDate + "T00:00:00");
    const dateString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    
    const newBookingStart = timeToMinutes(time);
    const newBookingEnd = newBookingStart + selectedService.duration;

    return appointments.some((apt) => {
      // Only consider active appointments (not cancelled or completed)
      const isActiveAppointment = 
        apt.status === 'pending' || 
        apt.status === 'confirmed' || 
        apt.status === 'upcoming';
      
      if (
        apt.barber !== selectedBarber.name ||
        apt.date !== dateString ||
        !isActiveAppointment
      ) {
        return false;
      }

      const existingStart = timeToMinutes(apt.time);
      const existingDuration = getServiceDuration(apt.service);
      const existingEnd = existingStart + existingDuration;

      // Check if time ranges overlap
      return (
        newBookingStart < existingEnd &&
        newBookingEnd > existingStart
      );
    });
  };

  const handlePaymentUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setPaymentFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateBooking = async () => {
    if (
      !selectedService ||
      !selectedBarber ||
      !selectedDate ||
      !selectedTime ||
      !paymentProof
    ) {
      toast.error("Please complete all fields");
      return;
    }

    setLoading(true);
    try {
      // Format date properly
      const dateObj = new Date(selectedDate);
      const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

      // Calculate payments
      const downPayment = selectedService.price * 0.5;
      const remainingAmount = selectedService.price * 0.5;

      const newAppointment: any = {
        // Database fields (new schema)
        customer_id: selectedCustomer?.id || currentUser?.id,
        barber_id: selectedBarber.id,
        service_id: selectedService.id,
        appointment_date: formattedDate,
        appointment_time: selectedTime,
        total_amount: selectedService.price,
        down_payment: downPayment,
        remaining_amount: remainingAmount,
        status: "pending",
        payment_status: "pending",
        notes: "Booked via AI Chat",

        // Legacy fields for backward compatibility (frontend display)
        userId: selectedCustomer?.id || currentUser?.id,
        service: selectedService.name,
        barber: selectedBarber.name,
        date: formattedDate,
        time: selectedTime,
        price: selectedService.price,
        canCancel: true,
        customerName:
          selectedCustomer?.name || currentUser?.name,
        paymentProof: paymentProof,
        paymentStatus: "pending",
        downPaymentPaid: true,
        remainingBalance: remainingAmount,
        rescheduledCount: 0,
        barberId: selectedBarber.id,
        serviceId: selectedService.id,
      };

      console.log(
        "📦 Creating appointment with data:",
        newAppointment,
      );

      // Use the proper onAddAppointment function if available (preferred method)
      let createdAppointment;
      if (onAddAppointment) {
        console.log(
          "✅ Using onAddAppointment function from App.tsx",
        );
        try {
          createdAppointment =
            await onAddAppointment(newAppointment);
          console.log(
            "✅ Appointment created via onAddAppointment:",
            createdAppointment,
          );
        } catch (error) {
          console.error("❌ onAddAppointment failed:", error);
          throw error;
        }
      } else {
        // Fallback to direct API call if onAddAppointment not available
        console.log("⚠️ Fallback: Using direct API call");
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/appointments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify(newAppointment),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ API Error:", errorData);
          throw new Error(
            errorData.message || "Failed to create booking",
          );
        }

        const result = await response.json();
        createdAppointment = result.appointment || result;
        console.log(
          "✅ Appointment created via API:",
          createdAppointment,
        );
      }

      console.log(
        "✅ Booking created successfully:",
        createdAppointment,
      );

      // Create payment record
      const paymentData = {
        appointment_id: createdAppointment?.id,
        customer_id: selectedCustomer?.id || currentUser?.id,
        amount: downPayment,
        payment_type: "down_payment",
        payment_method: "gcash",
        payment_proof_url: paymentProof,
        status: "pending",
        notes: "Down payment via AI Chat booking",
      };

      console.log("💳 Creating payment record:", paymentData);

      const paymentResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/payments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(paymentData),
        },
      );

      if (paymentResponse.ok) {
        const paymentResult = await paymentResponse.json();
        console.log(
          "✅ Payment record created:",
          paymentResult,
        );
      } else {
        const paymentError = await paymentResponse.json();
        console.error(
          "⚠️ Payment creation failed:",
          paymentError,
        );
      }

      setStep("complete");
      toast.success(
        "Booking created and sent to payment verification!",
      );

      setTimeout(() => {
        onComplete(createdAppointment);
      }, 2000);
    } catch (error) {
      console.error("❌ Booking error:", error);
      toast.error(
        `Failed to create booking: ${error.message || "Please try again"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case "customer":
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Select a customer for this booking:
            </p>
            <Input
              type="text"
              placeholder="Search customer..."
              value={customerSearch}
              onChange={(e) =>
                setCustomerSearch(e.target.value)
              }
              className="w-full mb-2"
            />
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <Button
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setStep("service");
                  }}
                  variant="outline"
                  className="w-full justify-start text-left"
                >
                  <User className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-medium">
                      {customer.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {customer.email}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );

      case "service":
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Choose your service:
            </p>
            <Input
              type="text"
              placeholder="Search service..."
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              className="w-full mb-2"
            />
            <div className="space-y-2">
              {filteredServices.map((service) => (
                <Button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setStep("barber");
                  }}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3"
                >
                  <Scissors className="w-4 h-4 mr-3 text-[#DB9D47]" />
                  <div className="flex-1">
                    <div className="font-semibold">
                      {service.name}
                    </div>
                    {service.description && (
                      <div className="text-xs text-gray-500">
                        {service.description}
                      </div>
                    )}
                    <div className="text-xs text-[#DB9D47] mt-1">
                      ₱{service.price} • {service.duration} mins
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );

      case "barber":
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Select your barber:
            </p>
            <Input
              type="text"
              placeholder="Search barber..."
              value={barberSearch}
              onChange={(e) => setBarberSearch(e.target.value)}
              className="w-full mb-2"
            />
            <div className="space-y-2">
              {filteredBarbers.map((barber) => (
                <Button
                  key={barber.id}
                  onClick={() => {
                    setSelectedBarber(barber);
                    setStep("datetime");
                  }}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <User className="w-4 h-4 mr-2 text-[#DB9D47]" />
                  {barber.name}
                </Button>
              ))}
              <Button
                onClick={() => {
                  setSelectedBarber({
                    id: "any",
                    name: "Any Available Barber",
                  });
                  setStep("datetime");
                }}
                variant="outline"
                className="w-full justify-start"
              >
                <User className="w-4 h-4 mr-2 text-gray-400" />
                Any Available Barber
              </Button>
            </div>
          </div>
        );

      case "datetime":
        // Check if selected date is Sunday
        const isSunday = selectedDate
          ? new Date(selectedDate).getDay() === 0
          : false;

        // Calculate max date (30 days from now)
        const today = new Date();
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + 30);
        const maxDateString = maxDate.toISOString().split("T")[0];
        const minDateString = today.toISOString().split("T")[0];

        return (
          <div className="space-y-4">
            {/* Date Selection */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2 text-gray-700">
                <CalendarIcon className="w-4 h-4 text-[#DB9D47]" />
                Select Date
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const selectedDateValue = e.target.value;
                  if (!selectedDateValue) return;

                  const date = new Date(selectedDateValue + "T00:00:00");
                  
                  // Check if Sunday
                  if (date.getDay() === 0) {
                    toast.error(
                      "Sorry, we're closed on Sundays!",
                    );
                    setSelectedDate("");
                    return;
                  }

                  // Check if within 30 days
                  const selected = new Date(selectedDateValue);
                  const todayCheck = new Date();
                  todayCheck.setHours(0, 0, 0, 0);
                  const maxCheck = new Date(todayCheck);
                  maxCheck.setDate(todayCheck.getDate() + 30);

                  if (selected < todayCheck) {
                    toast.error("Cannot book for past dates!");
                    setSelectedDate("");
                    return;
                  }

                  if (selected > maxCheck) {
                    toast.error("Bookings are only allowed within 30 days!");
                    setSelectedDate("");
                    return;
                  }

                  setSelectedDate(selectedDateValue);
                  setSelectedTime(""); // Reset time when date changes
                }}
                min={minDateString}
                max={maxDateString}
                className="w-full border-[#DB9D47]/30 focus:border-[#DB9D47]"
              />
              {isSunday && (
                <p className="text-xs text-red-500 mt-1 font-medium">
                  ⚠️ Sundays are not available
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
               Sundays closed. Please select another day.
              </p>
            </div>

            {/* Time Selection */}
            {selectedDate && !isSunday && (
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2 text-gray-700">
                  <Clock className="w-4 h-4 text-[#DB9D47]" />
                  Select Time Slot
                </label>
                
                
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1" key={`slots-${appointments.length}-${selectedDate}-${selectedBarber?.id}`}>
                  {timeSlots.map((time) => {
                    const isTaken = isTimeSlotTaken(time);
                    console.log(`🎨 Rendering button for ${time}: isTaken=${isTaken}`);
                    return (
                      <Button
                        key={time}
                        onClick={() => {
                          if (!isTaken) {
                            setSelectedTime(time);
                          } else {
                            toast.error("This time slot is already booked!");
                          }
                        }}
                        variant={
                          selectedTime === time
                            ? "default"
                            : "outline"
                        }
                        className={`text-xs py-2 flex flex-col gap-0.5 ${
                          selectedTime === time
                            ? "bg-[#DB9D47] hover:bg-[#C88D3F] text-white"
                            : isTaken
                              ? "opacity-40 cursor-not-allowed bg-gray-100 border-red-300"
                              : "hover:bg-[#FBF7EF] hover:border-[#DB9D47]"
                        }`}
                        disabled={isTaken}
                        type="button"
                      >
                        <span>{time}</span>
                        {isTaken && (
                          <span className="text-[9px] text-red-600 font-semibold">BOOKED</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  💡 Gray/disabled slots are already booked
                </p>
              </div>
            )}

            {/* Continue Button */}
            {selectedDate && selectedTime && !isSunday && (
              <Button
                onClick={() => setStep("payment")}
                className="w-full bg-[#DB9D47] hover:bg-[#C88D3F] text-white"
              >
                Continue to Payment
              </Button>
            )}
          </div>
        );

      case "payment":
        const downPayment = selectedService
          ? selectedService.price * 0.5
          : 0;
        return (
          <div className="space-y-4">
            <div className="bg-[#FBF7EF] p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">
                Booking Summary
              </h3>
              {currentUser?.role === "admin" &&
                selectedCustomer && (
                  <div className="text-xs">
                    <span className="text-gray-600">
                      Customer:
                    </span>{" "}
                    <span className="font-medium">
                      {selectedCustomer.name}
                    </span>
                  </div>
                )}
              <div className="text-xs">
                <span className="text-gray-600">Service:</span>{" "}
                <span className="font-medium">
                  {selectedService?.name}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-gray-600">Barber:</span>{" "}
                <span className="font-medium">
                  {selectedBarber?.name}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-gray-600">
                  Date & Time:
                </span>{" "}
                <span className="font-medium">
                  {selectedDate} at {selectedTime}
                </span>
              </div>
              <div className="text-xs pt-2 border-t">
                <span className="text-gray-600">Total:</span>{" "}
                <span className="font-bold text-[#DB9D47]">
                  ₱{selectedService?.price}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-gray-600">
                  Down Payment (50%):
                </span>{" "}
                <span className="font-bold text-green-600">
                  ₱{downPayment.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Upload className="w-4 h-4" />
                Upload Payment Proof
              </label>
              <Input
                type="file"
                accept="image/*"
                onChange={handlePaymentUpload}
                className="w-full"
              />
              {paymentProof && (
                <div className="mt-2 relative">
                  <img
                    src={paymentProof}
                    alt="Payment proof"
                    className="w-full h-32 object-cover rounded border"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => {
                      setPaymentProof(null);
                      setPaymentFile(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <Button
              onClick={handleCreateBooking}
              disabled={!paymentProof || loading}
              className="w-full bg-[#DB9D47] hover:bg-[#C88D3F]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Booking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          </div>
        );

      case "complete":
        return (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                Booking Successful!
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                Your appointment has been created and sent to{" "}
                <span className="font-semibold text-[#DB9D47]">
                  Payment Verification
                </span>
                .
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Admin will review your payment proof and approve
                your booking shortly.
              </p>
            </div>
            <Button
              onClick={() => onComplete({})}
              className="bg-[#DB9D47] hover:bg-[#C88D3F]"
            >
              Done
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  // Handle back button navigation
  const handleBack = () => {
    if (step === "service") {
      if (currentUser?.role === "admin") {
        setStep("customer");
        setSelectedService(null);
        setServiceSearch("");
      }
    } else if (step === "barber") {
      setStep("service");
      setSelectedBarber(null);
      setBarberSearch("");
    } else if (step === "datetime") {
      setStep("barber");
      setSelectedDate("");
      setSelectedTime("");
    } else if (step === "payment") {
      setStep("datetime");
      setPaymentProof("");
      setPaymentFile(null);
    }
  };

  return (
    <Card className="border-2 border-[#DB9D47]">
      <CardHeader className="bg-[#FBF7EF]">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          {step !== "customer" &&
            step !== "complete" &&
            !(
              step === "service" &&
              currentUser?.role !== "admin"
            ) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 w-8 p-0 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}

          {/* Title and Description */}
          <div className="flex-1">
            <CardTitle className="text-base">
              {step === "complete"
                ? "Booking Complete"
                : "Book Appointment"}
            </CardTitle>
            <CardDescription className="text-xs">
              {step === "customer" && "Step 1: Select Customer"}
              {step === "service" &&
                `Step ${currentUser?.role === "admin" ? "2" : "1"}: Choose Service`}
              {step === "barber" &&
                `Step ${currentUser?.role === "admin" ? "3" : "2"}: Choose Barber`}
              {step === "datetime" &&
                `Step ${currentUser?.role === "admin" ? "4" : "3"}: Pick Date & Time`}
              {step === "payment" &&
                `Step ${currentUser?.role === "admin" ? "5" : "4"}: Upload Payment`}
            </CardDescription>
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0 shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {renderStepContent()}
      </CardContent>
    </Card>
  );
}