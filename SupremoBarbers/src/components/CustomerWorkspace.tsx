import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  Home,
  LogOut,
  Scissors,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { BookingFlow } from "./BookingFlow";
import { CustomerBookingManagement } from "./CustomerBookingManagement";
import { CustomerProfile } from "./CustomerProfile";
import { FavoritesCart } from "./FavoritesCart";
import { NotificationCenter } from "./NotificationCenter";
import { RealTimeSlotAvailability } from "./RealTimeSlotAvailability";
import { ServicesShowcase } from "./ServicesShowcase";
import type { Appointment, Notification, User } from "../App";
import API from "../services/api.service";
import { favoriteEvents } from "../utils/favoriteEvents";
import { isActiveAppointmentStatus } from "../utils/appointmentRules";
import {
  MetricTile,
  RoleShell,
  SectionTitle,
  StatusPill,
  Surface,
  type RoleNavItem,
} from "./redesign/RoleShell";

interface CustomerWorkspaceProps {
  user: User;
  onLogout: () => void;
  appointments: Appointment[];
  onAddAppointment: (appointment: Appointment) => Promise<Appointment>;
  onUpdateAppointments: (appointments: Appointment[]) => void;
  onUserUpdate?: (updatedUser: User) => void;
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

const navItems: RoleNavItem[] = [
  { id: "home", label: "Overview", description: "Your next visit", icon: Home, group: "Your chair" },
  { id: "book", label: "Book a visit", description: "Choose your cut", icon: CalendarDays, group: "Your chair" },
  { id: "manage", label: "Appointments", description: "Manage your bookings", icon: History, group: "Your chair" },
  { id: "services", label: "Services", description: "Explore the menu", icon: Scissors, group: "Discover" },
  { id: "slots", label: "Live availability", description: "Find an open time", icon: Clock3, group: "Discover" },
  { id: "profile", label: "Profile", description: "Account details", icon: UserCircle, group: "Account" },
];

const dateLabel = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};

export function CustomerWorkspace({
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
  onSetPreSelectedServiceIds,
}: CustomerWorkspaceProps) {
  const [activeSection, setActiveSection] = useState("home");
  const [preSelectedSlot, setPreSelectedSlot] = useState<{ date: Date; time: string; barberName: string } | null>(null);
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<string | null>(null);

  const userAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.userId === user.id || appointment.customer_id === user.id),
    [appointments, user.id],
  );
  const upcomingAppointments = useMemo(
    () => userAppointments
      .filter((appointment) => isActiveAppointmentStatus(appointment.status))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [userAppointments],
  );
  const nextAppointment = upcomingAppointments[0];
  const pendingPayments = userAppointments.filter((appointment) => isActiveAppointmentStatus(appointment.status) && (appointment.paymentStatus || appointment.payment_status) === "pending").length;
  const totalSpent = userAppointments.reduce((total, appointment) => {
    const amount = Number(appointment.total_amount || appointment.price || 0);
    if (appointment.status === "completed") return total + amount;
    if (appointment.paymentStatus === "verified" || appointment.payment_status === "verified" || appointment.payment_status === "paid") return total + amount * 0.5;
    return total;
  }, 0);

  useEffect(() => {
    if (preSelectedServiceId || preSelectedSlot) setActiveSection("book");
  }, [preSelectedServiceId, preSelectedSlot]);

  const goTo = (section: string) => setActiveSection(section);
  const handleNotificationNavigation = (url: string) => {
    const [path, query] = url.split("?");
    const highlight = new URLSearchParams(query || "").get("highlight");
    if (path === "/appointments") {
      setActiveSection("manage");
      if (highlight) {
        setHighlightedAppointmentId(highlight);
        window.setTimeout(() => setHighlightedAppointmentId(null), 5000);
      }
    } else if (path === "/profile") setActiveSection("profile");
    else if (path === "/book") setActiveSection("book");
    else if (path === "/services") setActiveSection("services");
  };

  const notificationSlot = (
    <div className="flex items-center gap-2">
      <FavoritesCart
        userId={user.id}
        onBookService={(serviceId) => {
          onSetPreSelectedService?.(serviceId);
          setActiveSection("book");
        }}
        onBookMultipleServices={(serviceIds) => {
          onSetPreSelectedServiceIds?.(serviceIds);
          setActiveSection("book");
        }}
      />
      <NotificationCenter
        userId={user.id}
        userRole="customer"
        onNavigate={handleNotificationNavigation}
        initialNotifications={notifications}
        onMarkAsRead={onMarkNotificationAsRead}
        onMarkAllAsRead={onMarkAllNotificationsAsRead}
        onDelete={onDeleteNotification}
        onClearAll={onClearAllNotifications}
      />
    </div>
  );

  return (
    <RoleShell
      user={user}
      roleLabel="Customer workspace"
      eyebrow={activeSection === "home" ? `Good to see you, ${user.name.split(" ")[0]}` : "Your next good cut is close"}
      title={navItems.find((item) => item.id === activeSection)?.label || "Overview"}
      description="Book with confidence, keep your appointment details close, and spend less time managing the details."
      navItems={navItems}
      activeSection={activeSection}
      onSectionChange={goTo}
      onLogout={onLogout}
      notificationSlot={notificationSlot}
      primaryAction={
        <button type="button" onClick={() => setActiveSection("book")} className="hidden items-center gap-2 rounded-xl bg-[#241d18] px-4 py-2.5 text-sm font-bold text-[#f9f3e8] transition hover:bg-[#3a2e26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a756] sm:flex">
          <CalendarDays className="h-4 w-4 text-[#e0a756]" aria-hidden="true" />
          Book a visit
        </button>
      }
    >
      {activeSection === "home" && (
        <CustomerOverview
          user={user}
          nextAppointment={nextAppointment}
          upcomingCount={upcomingAppointments.length}
          pendingPayments={pendingPayments}
          totalSpent={totalSpent}
          onBook={() => setActiveSection("book")}
          onManage={() => setActiveSection("manage")}
          onBrowse={() => setActiveSection("services")}
        />
      )}

      {activeSection === "book" && (
        <div className="space-y-6">
          <SectionTitle eyebrow="A simple four-step visit" title="Choose how you want to feel walking out." description="Select your service, barber, date, and time. We will keep the booking details and payment instructions together." />
          <div className="grid gap-3 sm:grid-cols-4">
            {["Service", "Barber", "Time", "Confirm"].map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-2xl border border-[#ded2c3] bg-[#fffdfa] p-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#241d18] text-xs font-bold text-[#e0a756]">0{index + 1}</span>
                <span className="text-sm font-semibold text-[#4e4034]">{step}</span>
              </div>
            ))}
          </div>
          <div className="rounded-[1.5rem] border border-[#ded2c3] bg-[#fffdfa] p-4 shadow-[0_18px_45px_rgb(64_47_32/6%)] sm:p-6">
            <BookingFlow
              user={user}
              appointments={appointments}
              onAddAppointment={onAddAppointment}
              onBookingComplete={async (bookedServiceIds) => {
                setActiveSection("manage");
                setPreSelectedSlot(null);
                if (bookedServiceIds?.length) {
                  await Promise.all(bookedServiceIds.map(async (serviceId) => {
                    try {
                      await API.favorites.remove(user.id, serviceId);
                      favoriteEvents.removeFavorite(user.id, serviceId);
                    } catch {
                      // Booking already succeeded; favorites are secondary state.
                    }
                  }));
                }
              }}
              preSelectedServiceId={preSelectedServiceId}
              onClearPreSelectedService={onClearPreSelectedService}
              preSelectedServiceIds={preSelectedServiceIds}
              onClearPreSelectedServiceIds={() => onSetPreSelectedServiceIds?.([])}
              preSelectedSlot={preSelectedSlot}
              onClearPreSelectedSlot={() => setPreSelectedSlot(null)}
            />
          </div>
        </div>
      )}

      {activeSection === "slots" && <CustomerModulePage eyebrow="Find your opening" title="Live availability" description="See which barbers and time slots are open before you start a booking."><RealTimeSlotAvailability /></CustomerModulePage>}

      {activeSection === "manage" && (
        <CustomerModulePage eyebrow="Your calendar" title="Appointments" description="One place for upcoming visits, payment proof, rescheduling, cancellation, and feedback.">
          <CustomerBookingManagement
            user={user}
            appointments={appointments}
            onUpdateAppointments={onUpdateAppointments}
            onNavigateToBooking={() => setActiveSection("book")}
            onSetPreSelectedService={onSetPreSelectedService}
            highlightedAppointmentId={highlightedAppointmentId}
          />
        </CustomerModulePage>
      )}

      {activeSection === "services" && (
        <CustomerModulePage eyebrow="The menu" title="Services" description="Compare the cut, time, and price before choosing the experience that fits your day.">
          <ServicesShowcase
            onBookService={() => setActiveSection("book")}
            onServiceClick={(serviceId) => {
              onSetPreSelectedService?.(serviceId);
              setActiveSection("book");
            }}
            userId={user.id}
            appointments={appointments}
          />
        </CustomerModulePage>
      )}

      {activeSection === "profile" && <CustomerModulePage eyebrow="Your account" title="Profile and preferences" description="Keep contact details current so your barber and booking updates reach you."><CustomerProfile user={user} onUserUpdate={onUserUpdate} onLogout={onLogout} /></CustomerModulePage>}
    </RoleShell>
  );
}

function CustomerOverview({
  user,
  nextAppointment,
  upcomingCount,
  pendingPayments,
  totalSpent,
  onBook,
  onManage,
  onBrowse,
}: {
  user: User;
  nextAppointment?: Appointment;
  upcomingCount: number;
  pendingPayments: number;
  totalSpent: number;
  onBook: () => void;
  onManage: () => void;
  onBrowse: () => void;
}) {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#2d241d] px-6 py-8 text-[#fff9ed] shadow-[0_25px_60px_rgb(36_29_24/18%)] sm:px-9 sm:py-10">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#e0a756]"><Sparkles className="h-4 w-4" aria-hidden="true" /> Your chair, your pace</p>
          <h2 className="max-w-xl font-display text-4xl leading-[0.95] tracking-[-0.05em] sm:text-6xl">Look sharp. Feel ready.</h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[#d7c8b6] sm:text-base">Welcome back, {user.name.split(" ")[0]}. Your next appointment, your favorites, and the easiest way to book are all in one place.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={onBook} className="inline-flex items-center gap-2 rounded-xl bg-[#e0a756] px-4 py-3 text-sm font-bold text-[#241d18] transition hover:bg-[#efbd72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f8e0ae]"><CalendarDays className="h-4 w-4" aria-hidden="true" /> Book your next visit</button>
            <button type="button" onClick={onBrowse} className="inline-flex items-center gap-2 rounded-xl border border-[#806d5d] px-4 py-3 text-sm font-bold text-[#fff9ed] transition hover:bg-[#3a2e26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a756]">Browse services <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[36px] border-[#e0a756]/15" aria-hidden="true" />
        <div className="absolute -bottom-28 right-24 h-60 w-60 rounded-full bg-[#a9562d]/20 blur-3xl" aria-hidden="true" />
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile label="Upcoming visits" value={String(upcomingCount)} detail="Confirmed or awaiting verification" accent="sage" />
        <MetricTile label="To review" value={String(pendingPayments)} detail="Payment proofs needing attention" accent="gold" />
        <MetricTile label="Total spent" value={`₱${totalSpent.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} detail="Across your Supremo visits" accent="rust" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Surface className="overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-[#eee5d8] px-5 py-5 sm:px-7">
            <div><p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#a05d32]">Next on your calendar</p><h3 className="font-display text-2xl tracking-[-0.04em] text-[#241d18]">Your next chair time</h3></div>
            <button type="button" onClick={onManage} className="text-sm font-bold text-[#a05d32] hover:text-[#7d4327]">View all <span aria-hidden="true">→</span></button>
          </div>
          {nextAppointment ? (
            <div className="grid gap-6 px-5 py-7 sm:grid-cols-[1fr_auto] sm:px-7">
              <div>
                <div className="flex flex-wrap items-center gap-2"><StatusPill status={nextAppointment.status} /><span className="text-sm text-[#8a7867]">{dateLabel(nextAppointment.date)}</span></div>
                <h4 className="mt-4 font-display text-3xl tracking-[-0.04em] text-[#241d18]">{nextAppointment.service || nextAppointment.service_name}</h4>
                <div className="mt-4 grid gap-3 text-sm text-[#786b5c] sm:grid-cols-2"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#d48d3d]" />{nextAppointment.time || nextAppointment.appointment_time}</span><span className="flex items-center gap-2"><Scissors className="h-4 w-4 text-[#d48d3d]" />with {nextAppointment.barber || nextAppointment.barber_name}</span></div>
              </div>
              <div className="flex flex-col justify-end rounded-2xl bg-[#f6efe4] p-4 sm:min-w-[150px]"><span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a7867]">Visit total</span><span className="mt-2 font-display text-2xl text-[#241d18]">₱{Number(nextAppointment.price || nextAppointment.total_amount || 0).toLocaleString("en-PH")}</span><span className="mt-1 text-xs text-[#8a7867]">Payment details in booking</span></div>
            </div>
          ) : (
            <div className="px-5 py-12 text-center sm:px-7"><CalendarDays className="mx-auto h-10 w-10 text-[#d48d3d]" aria-hidden="true" /><h4 className="mt-4 font-display text-2xl text-[#241d18]">Your calendar is open.</h4><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#786b5c]">Choose a service and we will guide you through the rest.</p><button type="button" onClick={onBook} className="mt-5 rounded-xl bg-[#241d18] px-4 py-2.5 text-sm font-bold text-[#fff9ed]">Start a booking</button></div>
          )}
        </Surface>

        <Surface className="p-5 sm:p-7">
          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#a05d32]">A smoother visit</p>
          <h3 className="font-display text-2xl tracking-[-0.04em] text-[#241d18]">Before you arrive</h3>
          <div className="mt-6 space-y-5">
            {[{ title: "Reserve your slot", copy: "Pick the service and time that fit your day." }, { title: "Upload payment proof", copy: "Online bookings use a 50% GCash down payment." }, { title: "Show up ready", copy: "Your barber has the details before you sit down." }].map((item, index) => <div key={item.title} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8eee1] text-xs font-bold text-[#587049]">{index + 1}</span><div><p className="text-sm font-bold text-[#4e4034]">{item.title}</p><p className="mt-1 text-sm leading-5 text-[#8a7867]">{item.copy}</p></div></div>)}
          </div>
          <div className="mt-7 rounded-2xl bg-[#f5e2d9] p-4"><p className="flex items-center gap-2 text-sm font-bold text-[#974d2a]"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Need help?</p><p className="mt-1 text-xs leading-5 text-[#7f604e]">Your appointment page keeps cancellation, rescheduling, and payment instructions together.</p></div>
        </Surface>
      </div>

      <div className="flex items-center justify-between rounded-[1.35rem] border border-dashed border-[#d5c5b4] bg-[#f9f5ee] px-5 py-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#e9e0d5] p-2.5 text-[#7b6856]"><History className="h-4 w-4" aria-hidden="true" /></div><p className="text-sm text-[#786b5c]">Need to revisit a past look or leave feedback?</p></div><button type="button" onClick={onManage} className="inline-flex items-center gap-1 text-sm font-bold text-[#a05d32]">Open history <ArrowRight className="h-4 w-4" aria-hidden="true" /></button></div>
    </div>
  );
}

function CustomerModulePage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <div className="space-y-6"><SectionTitle eyebrow={eyebrow} title={title} description={description} /><div className="min-w-0">{children}</div></div>;
}
