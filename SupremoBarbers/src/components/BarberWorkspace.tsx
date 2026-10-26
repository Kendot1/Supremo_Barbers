import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Scissors,
  Settings2,
  Sparkles,
  UserCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { BarberEarningsOverview } from "./BarberEarningsOverview";
import { BarberProfile } from "./BarberProfile";
import { BarberScheduleCalendar } from "./BarberScheduleCalendar";
import { NotificationCenter } from "./NotificationCenter";
import type { Appointment, User } from "../App";
import API from "../services/api.service";
import { isActiveAppointmentStatus } from "../utils/appointmentRules";
import {
  MetricTile,
  RoleShell,
  SectionTitle,
  StatusPill,
  Surface,
  type RoleNavItem,
} from "./redesign/RoleShell";

interface BarberWorkspaceProps {
  user: User;
  onLogout: () => void;
  appointments: Appointment[];
  onUpdateAppointments: (appointments: Appointment[]) => void;
  onUserUpdate: (user: User) => void;
}

interface AvailabilityDay {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

const navItems: RoleNavItem[] = [
  { id: "today", label: "Today", description: "Your next client", icon: LayoutDashboard, group: "Floor" },
  { id: "schedule", label: "Schedule", description: "Daily appointments", icon: ListChecks, group: "Floor" },
  { id: "calendar", label: "Calendar", description: "Plan the week", icon: CalendarDays, group: "Floor" },
  { id: "history", label: "History", description: "Completed visits", icon: History, group: "Performance" },
  { id: "earnings", label: "Earnings", description: "Your numbers", icon: Sparkles, group: "Performance" },
  { id: "availability", label: "Availability", description: "Control your hours", icon: Clock3, group: "Account" },
  { id: "profile", label: "Profile", description: "Professional details", icon: UserCircle, group: "Account" },
];

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const defaultAvailability = (): AvailabilityDay[] => dayNames.map((_, dayOfWeek) => ({ dayOfWeek, isAvailable: dayOfWeek !== 0, startTime: "09:00", endTime: "18:00" }));

const getDate = (appointment: Appointment) => appointment.date || appointment.appointment_date || "";
const getTime = (appointment: Appointment) => appointment.time || appointment.appointment_time || "";
const dateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const prettyDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

export function BarberWorkspace({ user, onLogout, appointments: allAppointments, onUpdateAppointments, onUserUpdate }: BarberWorkspaceProps) {
  const [activeSection, setActiveSection] = useState("today");
  const [barberRecordId, setBarberRecordId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityDay[]>(defaultAvailability);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const barberAppointments = useMemo(() => allAppointments.filter((appointment) => appointment.barber === user.name || appointment.barber_id === user.id || appointment.barberId === user.id), [allAppointments, user.id, user.name]);
  const today = dateKey();
  const todayAppointments = useMemo(() => barberAppointments.filter((appointment) => getDate(appointment) === today).sort((a, b) => getTime(a).localeCompare(getTime(b))), [barberAppointments, today]);
  const upcomingAppointments = useMemo(() => barberAppointments.filter((appointment) => isActiveAppointmentStatus(appointment.status) && getDate(appointment) >= today).sort((a, b) => `${getDate(a)} ${getTime(a)}`.localeCompare(`${getDate(b)} ${getTime(b)}`)), [barberAppointments, today]);
  const completedAppointments = useMemo(() => barberAppointments.filter((appointment) => appointment.status === "completed"), [barberAppointments]);
  const pendingAppointments = barberAppointments.filter((appointment) => appointment.status === "pending");
  const nextAppointment = upcomingAppointments[0];
  const todayCompleted = todayAppointments.filter((appointment) => appointment.status === "completed");

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const barber = await API.barbers.getByUserId(user.id);
        if (!mounted || !barber?.id) return;
        setBarberRecordId(barber.id);
        const schedule = await API.barbers.getAvailability(barber.id);
        if (mounted && Array.isArray(schedule) && schedule.length) setAvailability(schedule);
      } catch (error) {
        console.warn("Unable to load barber availability", error);
      }
    };
    loadProfile();
    return () => { mounted = false; };
  }, [user.id]);

  const updateAppointmentStatus = async (appointment: Appointment, status: "confirmed" | "completed" | "cancelled") => {
    setBusyAppointmentId(appointment.id);
    try {
      const updated = allAppointments.map((item) => item.id === appointment.id ? { ...item, status, ...(status === "cancelled" ? { cancellationReason: "Cancelled by barber", cancellation_reason: "Cancelled by barber", cancelledBy: user.name, cancelled_by: user.name } : {}) } : item);
      await Promise.resolve(onUpdateAppointments(updated));
      toast.success(status === "completed" ? "Appointment marked complete" : status === "cancelled" ? "Appointment cancelled" : "Appointment confirmed");
      setCancelTarget(null);
    } catch (error: any) {
      toast.error(error?.message || "Could not update this appointment");
    } finally {
      setBusyAppointmentId(null);
    }
  };

  const saveAvailability = async () => {
    if (!barberRecordId) {
      toast.error("Your barber profile is not ready yet");
      return;
    }
    setIsSavingAvailability(true);
    try {
      await API.barbers.update(barberRecordId, { available_hours: availability });
      toast.success("Availability saved", { description: "New booking slots will use these hours." });
    } catch (error: any) {
      toast.error(error?.message || "Could not save availability");
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const notificationSlot = <NotificationCenter userId={user.id} userRole="barber" onNavigate={(url) => { if (url.includes("appointment")) setActiveSection("schedule"); else if (url.includes("profile")) setActiveSection("profile"); }} />;

  return (
    <RoleShell
      user={user}
      roleLabel="Barber workspace"
      eyebrow={activeSection === "today" ? "Your floor, at a glance" : "Professional workspace"}
      title={navItems.find((item) => item.id === activeSection)?.label || "Today"}
      description="See the next client, take action on the appointment in front of you, and keep your hours accurate for the whole shop."
      navItems={navItems}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={onLogout}
      notificationSlot={notificationSlot}
      primaryAction={<button type="button" onClick={() => setActiveSection("availability")} className="hidden items-center gap-2 rounded-xl bg-[#241d18] px-4 py-2.5 text-sm font-bold text-[#f9f3e8] transition hover:bg-[#3a2e26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a756] sm:flex"><Clock3 className="h-4 w-4 text-[#e0a756]" aria-hidden="true" /> Edit availability</button>}
    >
      {activeSection === "today" && <BarberToday user={user} todayAppointments={todayAppointments} nextAppointment={nextAppointment} pendingAppointments={pendingAppointments} completedCount={todayCompleted.length} onSchedule={() => setActiveSection("schedule")} onCalendar={() => setActiveSection("calendar")} onUpdateStatus={updateAppointmentStatus} busyAppointmentId={busyAppointmentId} onCancel={setCancelTarget} />}
      {activeSection === "schedule" && <BarberSchedule appointments={todayAppointments} onUpdateStatus={updateAppointmentStatus} busyAppointmentId={busyAppointmentId} onCancel={setCancelTarget} />}
      {activeSection === "calendar" && <div className="space-y-6"><SectionTitle eyebrow="Week view" title="Plan the week without losing today." description="Click any appointment for customer and payment context." /><Surface className="overflow-hidden p-3 sm:p-5"><BarberScheduleCalendar appointments={barberAppointments} barberName={user.name} /></Surface></div>}
      {activeSection === "history" && <BarberHistory appointments={completedAppointments} searchQuery={searchQuery} onSearch={setSearchQuery} />}
      {activeSection === "earnings" && <div className="space-y-6"><SectionTitle eyebrow="Performance" title="Your work, made visible." description="Completed visits and earnings stay connected to the appointment record." /><BarberEarningsOverview appointments={barberAppointments} user={user} /></div>}
      {activeSection === "availability" && <AvailabilityEditor availability={availability} setAvailability={setAvailability} onSave={saveAvailability} isSaving={isSavingAvailability} />}
      {activeSection === "profile" && <BarberProfile user={user} appointments={barberAppointments} onUserUpdate={onUserUpdate} />}

      {cancelTarget && <CancelDialog appointment={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={() => updateAppointmentStatus(cancelTarget, "cancelled")} isBusy={busyAppointmentId === cancelTarget.id} />}
    </RoleShell>
  );
}

function BarberToday({ user, todayAppointments, nextAppointment, pendingAppointments, completedCount, onSchedule, onCalendar, onUpdateStatus, busyAppointmentId, onCancel }: { user: User; todayAppointments: Appointment[]; nextAppointment?: Appointment; pendingAppointments: Appointment[]; completedCount: number; onSchedule: () => void; onCalendar: () => void; onUpdateStatus: (appointment: Appointment, status: "confirmed" | "completed" | "cancelled") => void; busyAppointmentId: string | null; onCancel: (appointment: Appointment) => void }) {
  return <div className="space-y-8">
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-[#2d241d] px-6 py-8 text-[#fff9ed] shadow-[0_25px_60px_rgb(36_29_24/18%)] sm:px-9 sm:py-10"><div className="relative z-10"><p className="mb-3 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#e0a756]"><Sparkles className="h-4 w-4" aria-hidden="true" /> Chair captain</p><h2 className="font-display text-4xl leading-[0.96] tracking-[-0.05em] sm:text-6xl">Make today feel easy.</h2><p className="mt-5 max-w-lg text-sm leading-7 text-[#d7c8b6] sm:text-base">Good morning, {user.name.split(" ")[0]}. Your schedule is the source of truth for the next person in the chair.</p><div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={onSchedule} className="rounded-xl bg-[#e0a756] px-4 py-3 text-sm font-bold text-[#241d18] hover:bg-[#efbd72]">Open today’s queue</button><button type="button" onClick={onCalendar} className="rounded-xl border border-[#806d5d] px-4 py-3 text-sm font-bold text-[#fff9ed] hover:bg-[#3a2e26]">View calendar</button></div></div><div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[36px] border-[#e0a756]/15" aria-hidden="true" /></div>
      <Surface className="p-5 sm:p-7"><p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#a05d32]">Next in the chair</p><h3 className="font-display text-2xl tracking-[-0.04em] text-[#241d18]">Stay one step ahead</h3>{nextAppointment ? <div className="mt-6 rounded-2xl bg-[#f6efe4] p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-[#a05d32]">{getTime(nextAppointment)}</span><StatusPill status={nextAppointment.status} /></div><p className="mt-4 font-display text-2xl text-[#241d18]">{nextAppointment.customerName || nextAppointment.customer_name || "Customer"}</p><p className="mt-1 text-sm text-[#786b5c]">{nextAppointment.service || nextAppointment.service_name}</p><div className="mt-5 flex flex-wrap gap-2">{nextAppointment.status === "pending" && <button type="button" disabled={busyAppointmentId === nextAppointment.id} onClick={() => onUpdateStatus(nextAppointment, "confirmed")} className="rounded-xl bg-[#241d18] px-3 py-2 text-xs font-bold text-[#fff9ed]">Confirm arrival</button>}{isActiveAppointmentStatus(nextAppointment.status) && <button type="button" onClick={() => onCancel(nextAppointment)} className="rounded-xl border border-[#d5c5b4] px-3 py-2 text-xs font-bold text-[#974d2a]">Cannot make it?</button>}</div></div> : <div className="mt-6 rounded-2xl border border-dashed border-[#d5c5b4] px-4 py-8 text-center text-sm text-[#8a7867]"><CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-[#d48d3d]" aria-hidden="true" />No active appointments yet.</div>}</Surface>
    </section>
    <div className="grid gap-4 sm:grid-cols-3"><MetricTile label="Today’s visits" value={String(todayAppointments.length)} detail="Your full chair flow" accent="gold" /><MetricTile label="Awaiting action" value={String(pendingAppointments.length)} detail="Pending confirmations" accent="rust" /><MetricTile label="Completed" value={String(completedCount)} detail="Closed out today" accent="sage" /></div>
    <BarberSchedule appointments={todayAppointments} onUpdateStatus={onUpdateStatus} busyAppointmentId={busyAppointmentId} onCancel={onCancel} />
  </div>;
}

function BarberSchedule({ appointments, onUpdateStatus, busyAppointmentId, onCancel }: { appointments: Appointment[]; onUpdateStatus: (appointment: Appointment, status: "confirmed" | "completed" | "cancelled") => void; busyAppointmentId: string | null; onCancel: (appointment: Appointment) => void }) {
  return <div className="space-y-5"><SectionTitle eyebrow="Today’s queue" title="Appointments in order." description="The next action is always attached to the appointment it belongs to." />{appointments.length === 0 ? <Surface className="p-12 text-center"><CalendarDays className="mx-auto h-10 w-10 text-[#d48d3d]" aria-hidden="true" /><h3 className="mt-4 font-display text-2xl text-[#241d18]">A clear chair.</h3><p className="mt-2 text-sm text-[#786b5c]">Enjoy the breathing room or use availability to open more time.</p></Surface> : <div className="space-y-3">{appointments.map((appointment, index) => <Surface key={appointment.id} className="overflow-hidden"><div className="grid gap-4 p-4 sm:grid-cols-[72px_1fr_auto] sm:items-center sm:p-5"><div className="border-b border-[#eee5d8] pb-3 sm:border-b-0 sm:border-r sm:pb-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a05d32]">{index === 0 ? "Next" : "At"}</p><p className="mt-1 font-display text-xl text-[#241d18]">{getTime(appointment)}</p></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-display text-xl text-[#241d18]">{appointment.customerName || appointment.customer_name || "Customer"}</h3><StatusPill status={appointment.status} /></div><p className="mt-1 text-sm text-[#786b5c]">{appointment.service || appointment.service_name} · ₱{Number(appointment.price || appointment.total_amount || 0).toLocaleString("en-PH")}</p><p className="mt-2 text-xs text-[#a08e7b]">{appointment.notes || "No special notes from the customer."}</p></div><div className="flex flex-wrap gap-2 sm:justify-end">{appointment.status === "pending" && <button type="button" disabled={busyAppointmentId === appointment.id} onClick={() => onUpdateStatus(appointment, "confirmed")} className="rounded-xl bg-[#241d18] px-3 py-2 text-xs font-bold text-[#fff9ed]">Confirm</button>}{(appointment.status === "confirmed" || appointment.status === "verified" || appointment.status === "upcoming") && <button type="button" disabled={busyAppointmentId === appointment.id} onClick={() => onUpdateStatus(appointment, "completed")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#e8eee1] px-3 py-2 text-xs font-bold text-[#587049]"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Complete</button>}{isActiveAppointmentStatus(appointment.status) && <button type="button" disabled={busyAppointmentId === appointment.id} onClick={() => onCancel(appointment)} className="rounded-xl border border-[#d5c5b4] px-3 py-2 text-xs font-bold text-[#974d2a]">Cancel</button>}</div></div></Surface>)}</div>}</div>;
}

function BarberHistory({ appointments, searchQuery, onSearch }: { appointments: Appointment[]; searchQuery: string; onSearch: (query: string) => void }) {
  const filtered = appointments.filter((appointment) => `${appointment.customerName || appointment.customer_name} ${appointment.service || appointment.service_name} ${getDate(appointment)}`.toLowerCase().includes(searchQuery.toLowerCase()));
  return <div className="space-y-5"><SectionTitle eyebrow="Your work" title="Completed visit history." description="A practical record of the customers and services you have delivered." action={<input value={searchQuery} onChange={(event) => onSearch(event.target.value)} aria-label="Search completed appointments" placeholder="Search visits" className="w-full rounded-xl border border-[#d5c5b4] bg-[#fffdfa] px-3 py-2 text-sm outline-none ring-[#e0a756] placeholder:text-[#a08e7b] focus:ring-2 sm:w-56" />} /><Surface className="overflow-hidden"><div className="divide-y divide-[#eee5d8]">{filtered.map((appointment) => <div key={appointment.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_160px_130px] sm:items-center"><div><p className="font-semibold text-[#4e4034]">{appointment.customerName || appointment.customer_name || "Customer"}</p><p className="text-sm text-[#8a7867]">{appointment.service || appointment.service_name}</p></div><p className="text-sm text-[#786b5c]">{prettyDate(getDate(appointment))}</p><div className="sm:text-right"><StatusPill status={appointment.status} /></div></div>)}{filtered.length === 0 && <div className="p-12 text-center text-sm text-[#786b5c]">No completed visits match that search.</div>}</div></Surface></div>;
}

function AvailabilityEditor({ availability, setAvailability, onSave, isSaving }: { availability: AvailabilityDay[]; setAvailability: (value: AvailabilityDay[]) => void; onSave: () => void; isSaving: boolean }) {
  const updateDay = (dayOfWeek: number, changes: Partial<AvailabilityDay>) => setAvailability(availability.map((day) => day.dayOfWeek === dayOfWeek ? { ...day, ...changes } : day));
  return <div className="space-y-6"><SectionTitle eyebrow="Open chair hours" title="Make availability easy to trust." description="These hours shape the slots customers can see. Sunday remains closed by default, but your other days are yours to tune." action={<button type="button" onClick={onSave} disabled={isSaving} className="rounded-xl bg-[#241d18] px-4 py-2.5 text-sm font-bold text-[#fff9ed] disabled:opacity-50">{isSaving ? "Saving…" : "Save hours"}</button>} /><Surface className="overflow-hidden"><div className="divide-y divide-[#eee5d8]">{availability.map((day) => <div key={day.dayOfWeek} className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_100px_150px_150px] sm:items-center"><div><p className="font-semibold text-[#4e4034]">{dayNames[day.dayOfWeek]}</p><p className="text-xs text-[#8a7867]">{day.isAvailable ? "Customers can request this day" : "Hidden from booking"}</p></div><label className="flex items-center gap-2 text-sm text-[#786b5c]"><input type="checkbox" checked={day.isAvailable} onChange={(event) => updateDay(day.dayOfWeek, { isAvailable: event.target.checked })} className="h-4 w-4 accent-[#a05d32]" /> Open</label><label className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a7867]">Starts<input type="time" value={day.startTime} disabled={!day.isAvailable} onChange={(event) => updateDay(day.dayOfWeek, { startTime: event.target.value })} className="mt-1 block w-full rounded-xl border border-[#d5c5b4] bg-[#fffdfa] px-3 py-2 text-sm font-normal tracking-normal text-[#4e4034] disabled:opacity-45" /></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a7867]">Ends<input type="time" value={day.endTime} disabled={!day.isAvailable} onChange={(event) => updateDay(day.dayOfWeek, { endTime: event.target.value })} className="mt-1 block w-full rounded-xl border border-[#d5c5b4] bg-[#fffdfa] px-3 py-2 text-sm font-normal tracking-normal text-[#4e4034] disabled:opacity-45" /></label></div>)}</div></Surface><div className="flex gap-3 rounded-2xl bg-[#e8eee1] p-4 text-sm text-[#587049]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>Changes affect future availability only. Existing appointments remain protected by the appointment rules and server-side conflict checks.</p></div></div>;
}

function CancelDialog({ appointment, onClose, onConfirm, isBusy }: { appointment: Appointment; onClose: () => void; onConfirm: () => void; isBusy: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241d18]/55 p-4" role="dialog" aria-modal="true" aria-labelledby="barber-cancel-title"><div className="w-full max-w-md rounded-[1.5rem] border border-[#ded2c3] bg-[#fffdfa] p-6 shadow-2xl"><p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#a05d32]">Appointment action</p><h2 id="barber-cancel-title" className="mt-2 font-display text-2xl text-[#241d18]">Cancel {appointment.customerName || appointment.customer_name || "this appointment"}?</h2><p className="mt-3 text-sm leading-6 text-[#786b5c]">This will update the customer’s booking and payment state. Make sure you have confirmed the change with the customer.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-[#d5c5b4] px-4 py-2.5 text-sm font-bold text-[#786b5c]">Keep appointment</button><button type="button" onClick={onConfirm} disabled={isBusy} className="rounded-xl bg-[#974d2a] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{isBusy ? "Cancelling…" : "Cancel appointment"}</button></div></div></div>;
}
