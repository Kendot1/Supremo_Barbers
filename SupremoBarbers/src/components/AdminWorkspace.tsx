import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  ReceiptText,
  Scissors,
  Settings2,
  Star,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react";
import { AnalyticsOverview } from "./AnalyticsOverview";
import { AuditLogs } from "./AuditLogs";
import { BarberModule } from "./BarberModule";
import { BookingReservationModule } from "./BookingReservationModule";
import { CustomerReviews } from "./CustomerReviews";
import { NotificationCenter } from "./NotificationCenter";
import { PaymentVerification } from "./PaymentVerification";
import { RevenueModule } from "./RevenueModule";
import { ServicesModule } from "./ServicesModule";
import { SystemSettings } from "./SystemSettings";
import { UserManagement } from "./UserManagement";
import type { Appointment, Notification, User } from "../App";
import { isActiveAppointmentStatus } from "../utils/appointmentRules";
import {
  MetricTile,
  RoleShell,
  SectionTitle,
  StatusPill,
  Surface,
  type RoleNavItem,
} from "./redesign/RoleShell";

interface AdminWorkspaceProps {
  user: User;
  onLogout: () => void;
  appointments: Appointment[];
  onUpdateAppointments: (appointments: Appointment[]) => void;
  onRefreshAppointments?: () => Promise<void>;
  notifications: Notification[];
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllNotificationsAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  onAddNotification: (notification: Notification) => void;
}

const navItems: RoleNavItem[] = [
  { id: "overview", label: "Command center", description: "Business pulse", icon: LayoutDashboard, group: "Operate" },
  { id: "bookings", label: "Appointments", description: "Schedule and assign", icon: CalendarDays, group: "Operate" },
  { id: "payments", label: "Payment queue", description: "Verify proofs", icon: CreditCard, group: "Operate" },
  { id: "customers", label: "Customers", description: "People and history", icon: Users, group: "People" },
  { id: "barbers", label: "Barbers", description: "Chairs and talent", icon: UserCog, group: "People" },
  { id: "services", label: "Service menu", description: "Prices and durations", icon: Scissors, group: "Catalog" },
  { id: "revenue", label: "Revenue", description: "Performance trends", icon: TrendingUp, group: "Insights" },
  { id: "reviews", label: "Reviews", description: "Customer voice", icon: Star, group: "Insights" },
  { id: "settings", label: "Settings", description: "Business controls", icon: Settings2, group: "System" },
  { id: "logs", label: "Audit trail", description: "Accountability", icon: Activity, group: "System" },
];

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function AdminWorkspace({
  user,
  onLogout,
  appointments,
  onUpdateAppointments,
  onRefreshAppointments,
  notifications,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  onAddNotification,
}: AdminWorkspaceProps) {
  const [activeSection, setActiveSection] = useState("overview");
  const currentDay = today();
  const activeBookings = appointments.filter((appointment) => isActiveAppointmentStatus(appointment.status));
  const todayAppointments = useMemo(
    () => appointments
      .filter((appointment) => (appointment.date || appointment.appointment_date) === currentDay)
      .sort((a, b) => `${a.time || a.appointment_time || ""}`.localeCompare(`${b.time || b.appointment_time || ""}`)),
    [appointments, currentDay],
  );
  const pendingPayments = appointments.filter((appointment) => (appointment.paymentStatus || appointment.payment_status) === "pending" && isActiveAppointmentStatus(appointment.status));
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = appointments.filter((appointment) => {
    if (appointment.status !== "completed") return false;
    const date = new Date(appointment.date || appointment.appointment_date || "");
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).reduce((sum, appointment) => sum + Number(appointment.price || appointment.total_amount || 0), 0);

  const attention = useMemo(() => [...pendingPayments].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 5), [pendingPayments]);
  const openNotifications = (url: string) => {
    const path = url.split("?")[0];
    if (path.includes("payment")) setActiveSection("payments");
    else if (path.includes("appointment") || path.includes("booking")) setActiveSection("bookings");
    else if (path.includes("barber")) setActiveSection("barbers");
    else if (path.includes("customer")) setActiveSection("customers");
    else setActiveSection("overview");
  };

  const notificationSlot = (
    <NotificationCenter
      userId={user.id}
      userRole="admin"
      onNavigate={openNotifications}
      initialNotifications={notifications}
      onMarkAsRead={onMarkNotificationAsRead}
      onMarkAllAsRead={onMarkAllNotificationsAsRead}
      onDelete={onDeleteNotification}
      onClearAll={onClearAllNotifications}
    />
  );

  return (
    <RoleShell
      user={user}
      roleLabel={user.role === "staff" ? "Operations desk" : "Admin workspace"}
      eyebrow={activeSection === "overview" ? "The shop at a glance" : "Supremo operations"}
      title={navItems.find((item) => item.id === activeSection)?.label || "Command center"}
      description="Keep the day moving: resolve the queue, protect the schedule, and make decisions from one clear operational view."
      navItems={navItems}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={onLogout}
      notificationSlot={notificationSlot}
      primaryAction={<button type="button" onClick={() => setActiveSection("bookings")} className="hidden items-center gap-2 rounded-xl bg-[#241d18] px-4 py-2.5 text-sm font-bold text-[#f9f3e8] transition hover:bg-[#3a2e26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a756] sm:flex"><CalendarDays className="h-4 w-4 text-[#e0a756]" aria-hidden="true" /> New appointment</button>}
    >
      {activeSection === "overview" && (
        <div className="space-y-8">
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-[#2d241d] px-6 py-8 text-[#fff9ed] shadow-[0_25px_60px_rgb(36_29_24/18%)] sm:px-9 sm:py-10">
              <div className="relative z-10 max-w-2xl"><p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#e0a756]">{currentDay}</p><h2 className="font-display text-4xl leading-[0.96] tracking-[-0.05em] sm:text-6xl">Run a sharper day.</h2><p className="mt-5 max-w-lg text-sm leading-7 text-[#d7c8b6] sm:text-base">Start with what needs attention, then move through the schedule without losing the bigger picture.</p><div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={() => setActiveSection("payments")} className="rounded-xl bg-[#e0a756] px-4 py-3 text-sm font-bold text-[#241d18] hover:bg-[#efbd72]">Review payment queue ({pendingPayments.length})</button><button type="button" onClick={() => setActiveSection("bookings")} className="rounded-xl border border-[#806d5d] px-4 py-3 text-sm font-bold text-[#fff9ed] hover:bg-[#3a2e26]">Open schedule</button></div></div><div className="absolute -right-16 -top-24 h-80 w-80 rounded-full border-[40px] border-[#e0a756]/15" aria-hidden="true" /><div className="absolute -bottom-24 right-16 h-60 w-60 rounded-full bg-[#a9562d]/20 blur-3xl" aria-hidden="true" />
            </div>
            <Surface className="p-5 sm:p-7"><div className="flex items-center justify-between"><div><p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#a05d32]">Today at the shop</p><h3 className="font-display text-2xl tracking-[-0.04em] text-[#241d18]">Chair flow</h3></div><span className="rounded-full bg-[#e8eee1] px-2.5 py-1 text-xs font-bold text-[#587049]">{todayAppointments.length} visits</span></div><div className="mt-6 space-y-3">{todayAppointments.slice(0, 4).map((appointment) => <div key={appointment.id} className="flex items-center gap-3 rounded-2xl bg-[#f6efe4] p-3"><span className="w-16 text-xs font-bold text-[#a05d32]">{appointment.time}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#4e4034]">{appointment.customerName || appointment.customer_name || "Customer"}</p><p className="truncate text-xs text-[#8a7867]">{appointment.service || appointment.service_name} · {appointment.barber || appointment.barber_name}</p></div><StatusPill status={appointment.status} /></div>)}{todayAppointments.length === 0 && <div className="rounded-2xl border border-dashed border-[#d5c5b4] px-4 py-8 text-center text-sm text-[#8a7867]"><CalendarDays className="mx-auto mb-2 h-7 w-7 text-[#d48d3d]" aria-hidden="true" />No appointments scheduled today.</div>}</div><button type="button" onClick={() => setActiveSection("bookings")} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#a05d32]">View full schedule <ArrowRight className="h-4 w-4" aria-hidden="true" /></button></Surface>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricTile label="Today's visits" value={String(todayAppointments.length)} detail="Every chair on the floor" accent="sage" /><MetricTile label="Active bookings" value={String(activeBookings.length)} detail="Not yet closed" accent="gold" /><MetricTile label="Payment queue" value={String(pendingPayments.length)} detail="Proofs to verify" accent="rust" /><MetricTile label="This month" value={`₱${monthlyRevenue.toLocaleString("en-PH")}`} detail="Completed service revenue" accent="ink" /></div>

          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <Surface className="p-5 sm:p-7"><SectionTitle eyebrow="Action queue" title="What needs a decision" description="Resolve high-signal items without hunting through modules." /><div className="space-y-3">{attention.map((appointment) => <button type="button" key={appointment.id} onClick={() => setActiveSection("payments")} className="flex w-full items-center gap-3 rounded-2xl border border-[#eee5d8] p-3 text-left transition hover:border-[#d48d3d] hover:bg-[#fffaf1]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff4dc] text-[#9b641f]"><ReceiptText className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-[#4e4034]">{appointment.customerName || appointment.customer_name || "Customer"}</span><span className="block truncate text-xs text-[#8a7867]">{appointment.service || appointment.service_name} · ₱{Number(appointment.price || appointment.total_amount || 0).toLocaleString("en-PH")}</span></span><ArrowRight className="h-4 w-4 text-[#a05d32]" aria-hidden="true" /></button>)}{attention.length === 0 && <div className="rounded-2xl bg-[#e8eee1] p-5 text-sm text-[#587049]"><CheckCircle2 className="mb-2 h-5 w-5" aria-hidden="true" /><p className="font-bold">Queue is clear.</p><p className="mt-1 text-xs leading-5">New booking and payment activity will appear here.</p></div>}</div></Surface>
            <Surface className="p-5 sm:p-7"><SectionTitle eyebrow="Business pulse" title="See what is changing" description="The detailed analytics view stays one click away, now framed by operational priorities." action={<button type="button" onClick={() => setActiveSection("revenue")} className="text-sm font-bold text-[#a05d32]">Full reports →</button>} /><AnalyticsOverview onNavigateToPaymentVerification={() => setActiveSection("payments")} onNavigateToBookings={() => setActiveSection("bookings")} /></Surface>
          </div>
        </div>
      )}

      {activeSection === "customers" && <WorkspacePage title="Customer relationships" copy="Search customer records, understand visit history, and keep service personal." icon={Users}><UserManagement /></WorkspacePage>}
      {activeSection === "barbers" && <WorkspacePage title="The barber roster" copy="Manage the people, availability, and craft behind every appointment." icon={UserCog}><BarberModule appointments={appointments} /></WorkspacePage>}
      {activeSection === "services" && <WorkspacePage title="Service menu" copy="Keep pricing and service duration clear for both customers and the floor." icon={Scissors}><ServicesModule user={user} onBookService={() => setActiveSection("bookings")} /></WorkspacePage>}
      {activeSection === "bookings" && <WorkspacePage title="Appointment desk" copy="Create, assign, filter, and update the schedule from one operational view." icon={CalendarDays}><BookingReservationModule appointments={appointments} onUpdateAppointments={onUpdateAppointments} onRefreshAppointments={onRefreshAppointments} adminUser={user} /></WorkspacePage>}
      {activeSection === "payments" && <WorkspacePage title="Payment verification" copy="Review proof, approve confidently, and keep customer status in sync." icon={CreditCard}><PaymentVerification appointments={appointments} onUpdateAppointment={(appointmentId, updates) => onUpdateAppointments(appointments.map((appointment) => appointment.id === appointmentId ? { ...appointment, ...updates } : appointment))} userRole="admin" onAddNotification={onAddNotification} onRefreshAppointments={onRefreshAppointments} currentUser={user} /></WorkspacePage>}
      {activeSection === "revenue" && <WorkspacePage title="Revenue intelligence" copy="Track completed service performance and make the next decision with context." icon={BarChart3}><RevenueModule appointments={appointments} /></WorkspacePage>}
      {activeSection === "reviews" && <WorkspacePage title="Customer voice" copy="Keep the public reputation honest, useful, and connected to the team." icon={Star}><CustomerReviews isActive /></WorkspacePage>}
      {activeSection === "settings" && <WorkspacePage title="System settings" copy="Manage the operating details that shape the customer experience." icon={Settings2}><SystemSettings /></WorkspacePage>}
      {activeSection === "logs" && <WorkspacePage title="Audit trail" copy="Review system activity and keep operational changes accountable." icon={Activity}><AuditLogs isActive /></WorkspacePage>}
    </RoleShell>
  );
}

function WorkspacePage({ title, copy, icon: Icon, children }: { title: string; copy: string; icon: typeof CalendarDays; children: ReactNode }) {
  return <div className="space-y-6"><div className="flex items-start gap-4 rounded-[1.5rem] border border-[#ded2c3] bg-[#f9f5ee] p-5 sm:p-7"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#241d18] text-[#e0a756]"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#a05d32]">Workspace module</p><h2 className="mt-1 font-display text-3xl tracking-[-0.04em] text-[#241d18]">{title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#786b5c]">{copy}</p></div></div><div className="min-w-0">{children}</div></div>;
}
