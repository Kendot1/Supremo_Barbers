import { useState, useEffect } from 'react';
import API from '../services/api.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from './ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from './ui/dropdown-menu';
import { Search, Activity, Download, FileText, FileSpreadsheet, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { exportToCSV } from './utils/exportUtils';
import { Pagination } from './ui/pagination';
import { usePagination } from '../hooks/usePagination';

// Match database schema from migration
interface AuditLog {
  id: string;
  userId: string;
  userRole: 'customer' | 'barber' | 'admin' | 'system';
  userName?: string;
  userEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  description?: string; // Legacy field for backwards compatibility
  details?: { // New JSONB field containing description and metadata
    description?: string;
    [key: string]: any;
  };
  status: 'success' | 'error' | 'warning';
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditLogsProps {
  isActive?: boolean;
}

export function AuditLogs({ isActive = true }: AuditLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);

  // Fetch audit logs from database
  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await API.auditLogs.getAll();
      setLogs(data);
    } catch (error) {
      console.error('❌ Error fetching audit logs:', error);
      // Silently handle - backend might not be running or tables don't exist yet
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Refetch data when component becomes active (tab is switched)
  useEffect(() => {
    if (isActive) {
      fetchLogs();
    }
  }, [isActive]);

  // Extract description from either legacy field or new details JSONB field
  const getDescription = (log: AuditLog): string => {
    // Try details.description first (new schema)
    if (log.details && log.details.description) {
      return log.details.description;
    }
    // Fallback to legacy description field
    if (log.description) {
      return log.description;
    }
    return '';
  };

  const filteredLogs = logs.filter(log => {
    const description = getDescription(log);
    const matchesSearch = 
      (log.id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.userEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.action?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.entityType?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  // Format action names from snake_case to readable format
  const formatActionName = (action: string): string => {
    if (!action) return '';
    
    // Split by underscore and capitalize each word
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

 
  const handleExportCSV = () => {
    const exportData = filteredLogs.map(log => ({
      'Log ID': log.id,
      'Timestamp': new Date(log.createdAt).toLocaleString(),
      'User': log.userName || log.userId,
      'Email': log.userEmail || '',
      'Role': log.userRole,
      'Action': log.action,
      'Entity Type': log.entityType,
      'Entity ID': log.entityId,
      'Description': getDescription(log),
      'Status': log.status.charAt(0).toUpperCase() + log.status.slice(1),
      'IP Address': log.ipAddress || '',
    }));

    const headers = ['Log ID', 'Timestamp', 'User', 'Email', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Description', 'Status', 'IP Address'];
    
    exportToCSV(exportData, headers, 'supremo-barber-audit-logs');
    toast.success(`Exported ${filteredLogs.length} audit logs successfully!`);
  };

  // Calculate stats
  const totalLogs = logs.length;
  const successLogs = logs.filter(l => l.status === 'success').length;
  const pendingLogs = logs.filter(l => l.status === 'warning').length;
  const failedLogs = logs.filter(l => l.status === 'error').length;

  // Get current logs to display
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#DB9D47] p-2 sm:p-2.5 rounded-lg">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{totalLogs}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Total Logs</p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#94A670] p-2 sm:p-2.5 rounded-lg">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{successLogs}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Success</p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#F59E0B] p-2 sm:p-2.5 rounded-lg">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{pendingLogs}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Pending</p>
        </div>

        <div className="flex flex-col p-3 sm:p-4 bg-white rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-[#DC2626] p-2 sm:p-2.5 rounded-lg">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-[#94A670]" />
          </div>
          <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{failedLogs}</p>
          <p className="text-xs sm:text-sm text-[#87765E] truncate">Failed</p>
        </div>
      </div>

      {/* Audit Logs Table */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#DB9D47]" />
              <div>
                <CardTitle className="text-[#5C4A3A]">Audit Logs</CardTitle>
                <CardDescription className="text-[#87765E]">Track all system activities and user actions</CardDescription>
              </div>
            </div>
            <DropdownMenu>
              
                <Button onClick={handleExportCSV} className="bg-[#DB9D47] hover:bg-[#C88A35] text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              
            </DropdownMenu>
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        <div className="text-sm text-[#87765E]">
          Showing {filteredLogs.length} of {logs.length} logs
        </div>

        {/* Logs Table */}
        <div className="border rounded-lg border-[#E8DCC8] overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#FBF7EF] hover:bg-[#FBF7EF]">
                <TableHead className="text-[#5C4A3A]">Timestamp</TableHead>
                <TableHead className="text-[#5C4A3A] hidden md:table-cell">User</TableHead>
                <TableHead className="text-[#5C4A3A]">Action</TableHead>
                <TableHead className="text-[#5C4A3A] hidden lg:table-cell">Details</TableHead>
                <TableHead className="text-[#5C4A3A]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-[#87765E]">
                    No audit logs found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                currentLogs.map((log, index) => (
                  <TableRow key={`audit-log-${log.id || index}`} className="hover:bg-[#FFFDF8]">
                    <TableCell className="text-sm text-[#87765E]">
                      {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <div className="text-xs">{new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                    </TableCell>
                    <TableCell className="text-[#5C4A3A] hidden md:table-cell">
                      {log.userName || log.userEmail || log.userId}
                    </TableCell>
                    <TableCell className="text-sm text-[#5C4A3A]">{formatActionName(log.action)}</TableCell>
                    <TableCell className="text-sm text-[#87765E] hidden lg:table-cell">{getDescription(log)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(log.status)} className="text-xs whitespace-nowrap">
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <Pagination
          totalItems={filteredLogs.length}
          itemsPerPage={logsPerPage}
          currentPage={currentPage}
          totalPages={Math.ceil(filteredLogs.length / logsPerPage)}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newSize) => {
            setLogsPerPage(newSize);
            setCurrentPage(1); // Reset to first page when changing page size
          }}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8 text-[#87765E]">
            Loading audit logs...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && logs.length === 0 && (
          <div className="text-center py-8 text-[#87765E]">
            <Activity className="w-12 h-12 mx-auto mb-4 text-[#E8DCC8]" />
            <p>No audit logs available.</p>
            <p className="text-sm mt-2">Backend server must be running to display audit logs.</p>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}