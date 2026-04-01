// This is a reference file for the appointment details enhancement
// Copy this code to replace lines 7519-7528 in index.tsx

// Add today's appointment details with times and barbers
if (context.todayAppointments?.length > 0) {
  systemPrompt += `\n\nTODAY'S BOOKED APPOINTMENTS (${context.todayAppointments.length} total):\n`;
  
  // Group by barber for better organization
  const byBarber: any = {};
  context.todayAppointments.forEach((apt: any) => {
    // Find barber name from barbers array
    const barber = context.barbers?.find((b: any) => b.id === apt.barber_id);
    const barberName = barber?.name || "Unknown Barber";
    
    if (!byBarber[barberName]) {
      byBarber[barberName] = [];
    }
    byBarber[barberName].push(apt);
  });
  
  // Add each barber's schedule
  Object.entries(byBarber).forEach(([barberName, appointments]: any) => {
    systemPrompt += `\n${barberName}'s Schedule:\n`;
    appointments.forEach((apt: any) => {
      systemPrompt += `  • ${apt.time} - ${apt.service_name} (${apt.duration} mins) - ${apt.status}\n`;
    });
  });
  
  systemPrompt += `\nNOTE: Use this to determine available time slots. Operating hours: 9AM-8PM (Mon-Sat), 10AM-6PM (Sun)`;
} else {
  systemPrompt += `\n\nTODAY'S SCHEDULE: No appointments booked yet - fully available!`;
}

// Add upcoming week overview for better planning
if (context.upcomingAppointments?.length > 0) {
  const appointmentsByDate: any = {};
  context.upcomingAppointments.forEach((apt: any) => {
    if (!appointmentsByDate[apt.date]) {
      appointmentsByDate[apt.date] = 0;
    }
    appointmentsByDate[apt.date]++;
  });
  
  systemPrompt += `\n\nUPCOMING WEEK OVERVIEW:\n`;
  Object.entries(appointmentsByDate).forEach(([date, count]: any) => {
    systemPrompt += `- ${date}: ${count} appointment(s) booked\n`;
  });
}
