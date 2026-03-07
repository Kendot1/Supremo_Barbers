import { AdminToolsPage } from './AdminToolsPage';
import { ReportsAnalytics } from './ReportsAnalytics';
import { LocalBackendBanner } from './LocalBackendBanner';

// Mock data for demonstration
const mockServices = [
  { id: '1', name: 'Haircut', price: 150 },
  { id: '2', name: 'Beard Trim', price: 100 },
  { id: '3', name: 'Shave', price: 80 },
  { id: '4', name: 'Hair Styling', price: 200 },
  { id: '5', name: 'Hair Coloring', price: 300 },
];

export function ImprovedAdminDashboard() {
  const [activeTab, setActiveTab] = useState('appointments');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Calculate stats from real data
  const today = new Date().toISOString().split('T')[0];
  
  const todayBookings = appointments.filter(apt => apt.date === today);
  const pendingApprovals = appointments.filter(apt => apt.status === 'pending').length;
  const completedToday = todayBookings.filter(apt => apt.status === 'completed');
  const todayRevenue = completedToday.reduce((sum, apt) => sum + apt.price, 0);

  const stats = [
    { label: "Today's Bookings", value: todayBookings.length.toString(), icon: Calendar, color: 'bg-[#DB9D47]' },
    { label: 'Pending Approvals', value: pendingApprovals.toString(), icon: Clock, color: 'bg-[#D98555]' },
    { label: 'Completed Today', value: completedToday.length.toString(), icon: CheckCircle2, color: 'bg-[#94A670]' },
    { label: "Today's Revenue", value: `₱${todayRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-[#B89968]' },
  ];

  const menuItems = [
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'barbers', label: 'Barber Schedules', icon: UserCog },
    { id: 'services', label: 'Services', icon: Scissors },
    { id: 'loyalty', label: 'Loyalty System', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF8] flex">
      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full bg-[#5C4A3A] text-[#F5EDD8] transition-all duration-300 z-20
        ${sidebarOpen ? 'w-64' : 'w-20'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-[#796653]">
            <div className="flex items-center gap-3">
              <img 
                src="figma:asset/977b2768ef70cae70ca08f72c19d58ae8904def2.png" 
                alt="Supremo Barber Logo" 
                className="h-10 w-10 flex-shrink-0"
              />
              {sidebarOpen && (
                <div>
                  <p className="text-[#F5EDD8]">Admin Panel</p>
                  <p className="text-xs text-[#C4B494]">Supremo Barber</p>
                </div>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${activeTab === item.id 
                    ? 'bg-[#DB9D47] text-white' 
                    : 'text-[#C4B494] hover:bg-[#6E5A48] hover:text-[#F5EDD8]'
                  }
                `}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-[#796653]">
            {sidebarOpen && (
              <div className="mb-3 px-4 py-2 bg-[#6E5A48] rounded-lg">
                <p className="text-sm text-[#F5EDD8]">{user.name}</p>
                <p className="text-xs text-[#C4B494]">{user.email}</p>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={onLogout}
              className="w-full justify-start text-[#C4B494] hover:text-[#F5EDD8] hover:bg-[#6E5A48]"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="ml-3">Logout</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Bar */}
        <header className="bg-white border-b-2 border-[#E8DCC8] sticky top-0 z-10 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-[#5C4A3A] hover:bg-[#FBF7EF]"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <h1 className="text-2xl text-[#5C4A3A]">
                {menuItems.find(item => item.id === activeTab)?.label}
              </h1>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          <LocalBackendBanner />
          
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <Card key={index} className="overflow-hidden border-[#E8DCC8] hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex items-center">
                        <div className={`${stat.color} p-4`}>
                          <stat.icon className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1 p-4">
                          <p className="text-sm text-[#87765E]">{stat.label}</p>
                          <p className="text-2xl text-[#5C4A3A]">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <AppointmentManagement user={user} />
            </div>
          )}

          {activeTab === 'barbers' && <BarberScheduleManager />}
          {activeTab === 'services' && <ServiceManagement />}
          {activeTab === 'loyalty' && <LoyaltyConfiguration />}
          {activeTab === 'reports' && <ReportsAnalytics />}
        </div>
      </main>
    </div>
  );
}