import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Search, FileText, Calendar, Scissors } from "lucide-react";
import { toast } from "sonner";
import type { Appointment } from "../App";

// Utility function to parse date string without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface CustomerHistory {
  userId: string;
  lastVisit: string;
  totalVisits: number;
  preferredService: string;
  totalSpent: number;
  appointments: Appointment[];
}

interface BarberCustomerHistoryProps {
  appointments: Appointment[];
}

export function BarberCustomerHistory({ appointments }: BarberCustomerHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerHistory | null>(null);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [customerNotes, setCustomerNotes] = useState<Record<string, string>>({});

  // Derive customer history from appointments
  const customers = useMemo(() => {
    const customerMap = new Map<string, CustomerHistory>();

    appointments.forEach((apt) => {
      if (!customerMap.has(apt.userId)) {
        customerMap.set(apt.userId, {
          userId: apt.userId,
          lastVisit: apt.date,
          totalVisits: 0,
          preferredService: apt.service,
          totalSpent: 0,
          appointments: [],
        });
      }

      const customer = customerMap.get(apt.userId)!;
      customer.totalVisits += 1;
      customer.appointments.push(apt);
      
      if (apt.status === 'completed') {
        customer.totalSpent += apt.price;
      }

      // Update last visit if this appointment is more recent
      if (new Date(apt.date) > new Date(customer.lastVisit)) {
        customer.lastVisit = apt.date;
      }
    });

    // Convert to array and sort by last visit
    return Array.from(customerMap.values()).sort((a, b) => 
      new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
    );
  }, [appointments]);

  const filteredCustomers = customers.filter((customer) =>
    customer.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewNotes = (customer: CustomerHistory) => {
    setSelectedCustomer(customer);
    setIsNotesDialogOpen(true);
  };

  const handleSaveNotes = () => {
    if (selectedCustomer) {
      toast.success('Customer notes saved successfully');
      setIsNotesDialogOpen(false);
    }
  };

  return (
    <Card className="border-[#E8DCC8] max-w-full overflow-x-hidden">
      <CardHeader>
        <CardTitle className="text-[#5C4A3A]">Customer History</CardTitle>
        <CardDescription className="text-[#87765E]">
          Past clients and service records ({customers.length} total customers)
        </CardDescription>
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
            <Input
              placeholder="Search customers by ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-[#E8DCC8] mx-auto mb-4" />
            <p className="text-[#87765E]">
              {searchQuery ? 'No customers found matching your search' : 'No customer history available'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.userId}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8] hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-[#DB9D47] to-[#D98555] flex items-center justify-center text-white text-sm sm:text-base">
                    {customer.userId.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[#5C4A3A] text-sm sm:text-base truncate">Customer #{customer.userId}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-[#87765E] mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">Last: {new Date(customer.lastVisit).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Scissors className="w-3 h-3 flex-shrink-0" />
                        {customer.totalVisits} visits
                      </span>
                      <span className="text-[#94A670] whitespace-nowrap">
                        ₱{customer.totalSpent.toLocaleString()} spent
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-shrink-0">
                  <Badge variant="secondary" className="bg-[#F8F0E0] text-[#DB9D47] border-[#E8DCC8] text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                    {customer.preferredService}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white text-xs sm:text-sm whitespace-nowrap"
                    onClick={() => handleViewNotes(customer)}
                  >
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">View Details</span>
                    <span className="sm:hidden">Details</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Customer Details Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Customer Details - #{selectedCustomer?.userId}</DialogTitle>
            <DialogDescription>
              Service history and notes
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 py-4 overflow-x-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                  <p className="text-xs text-[#87765E] mb-1">Total Visits</p>
                  <p className="text-xl text-[#5C4A3A]">{selectedCustomer.totalVisits}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                  <p className="text-xs text-[#87765E] mb-1">Last Visit</p>
                  <p className="text-sm text-[#5C4A3A]">
                    {new Date(selectedCustomer.lastVisit).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                  <p className="text-xs text-[#87765E] mb-1">Total Spent</p>
                  <p className="text-lg text-[#94A670]">₱{selectedCustomer.totalSpent.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-[#5C4A3A] mb-2 block">Service History</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedCustomer.appointments.map((apt) => (
                    <div key={apt.id} className="p-2 rounded bg-white border border-[#E8DCC8] flex justify-between items-center text-sm">
                      <div>
                        <span className="text-[#5C4A3A]">{apt.service}</span>
                        <span className="text-[#87765E] ml-2">({parseLocalDate(apt.date).toLocaleDateString()})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#94A670]">₱{apt.price}</span>
                        <Badge variant="outline" className="text-xs">
                          {apt.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-[#5C4A3A] mb-2 block">Service Notes</label>
                <Textarea
                  value={customerNotes[selectedCustomer.userId] || ""}
                  onChange={(e) => setCustomerNotes(prev => ({
                    ...prev,
                    [selectedCustomer.userId]: e.target.value
                  }))}
                  placeholder="Add notes about customer preferences, allergies, or special requests..."
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
                  Close
                </Button>
                <Button 
                  className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                  onClick={handleSaveNotes}
                >
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
