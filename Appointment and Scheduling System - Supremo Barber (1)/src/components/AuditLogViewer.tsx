/**
 * Audit Log Viewer Component
 * Admin-only component to view system audit logs
 */

import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Download, Calendar, User, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import API from '../services/api.service';

interface AuditLog {
  id: string;
  userId: string;
  userRole: 'customer' | 'barber' | 'admin' | 'system';
  userName?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  changes?: any;
  metadata?: any;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditLogStatistics {
  total: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
  byUserRole: Record<string, number>;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<AuditLogStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUserRole, setFilterUserRole] = useState<string>('all');
  const [limit, setLimit] = useState(100);

  // Fetch audit logs
  const fetchLogs = async () => {
    try {
      setIsLoading(true);
    
      
      const [logsData, statsData] = await Promise.all([
        API.auditLogs.getAll(limit),
        API.auditLogs.getStatistics(),
      ]);
      
     
      setLogs(logsData);
      setStatistics(statsData);
      
      toast.success(`Loaded ${logsData.length} audit logs`);
    } catch (error: any) {
      console.error('❌ Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.description?.toLowerCase().includes(term) ||
        log.userName?.toLowerCase().includes(term) ||
        log.userEmail?.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        log.entityType.toLowerCase().includes(term)
      );
    }

    // Action filter
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(log => log.status === filterStatus);
    }

    // User role filter
    if (filterUserRole !== 'all') {
      filtered = filtered.filter(log => log.userRole === filterUserRole);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, filterAction, filterStatus, filterUserRole]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchLogs();
  }, [limit]);

  // Export logs as JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Audit logs exported successfully');
  };

  // Export logs as CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Description', 'Status'];
    const csvData = filteredLogs.map(log => [
      new Date(log.createdAt).toLocaleString(),
      log.userName || log.userId,
      log.userRole,
      log.action,
      log.entityType,
      log.entityId,
      log.description.replace(/"/g, '""'),
      log.status,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Audit logs exported as CSV');
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Get role badge color
  const getRoleColor = (role: string): string => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      barber: 'bg-blue-100 text-blue-800',
      customer: 'bg-green-100 text-green-800',
      system: 'bg-gray-100 text-gray-800',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Get unique actions from logs
  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#87765E]">Total Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-2xl font-semibold text-[#5C4A3A]">
                  {statistics.total}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#87765E]">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-semibold text-[#5C4A3A]">
                  {statistics.total > 0
                    ? Math.round((statistics.byStatus.success / statistics.total) * 100)
                    : 0}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#87765E]">Failed Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-600" />
                <span className="text-2xl font-semibold text-[#5C4A3A]">
                  {statistics.byStatus.failed || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#87765E]">Action Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-2xl font-semibold text-[#5C4A3A]">
                  {Object.keys(statistics.byAction).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="text-lg">Audit Logs</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={fetchLogs}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="border-[#E8DCC8]"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                className="border-[#E8DCC8]"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="border-[#E8DCC8]"
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#87765E]" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-[#E8DCC8]"
              />
            </div>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="border-[#E8DCC8]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="border-[#E8DCC8]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterUserRole} onValueChange={setFilterUserRole}>
              <SelectTrigger className="border-[#E8DCC8]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="barber">Barber</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-sm text-[#87765E]">
            <span>
              Showing {filteredLogs.length} of {logs.length} logs
            </span>
            <Select
              value={limit.toString()}
              onValueChange={(value) => setLimit(parseInt(value))}
            >
              <SelectTrigger className="w-32 border-[#E8DCC8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">Last 50</SelectItem>
                <SelectItem value="100">Last 100</SelectItem>
                <SelectItem value="500">Last 500</SelectItem>
                <SelectItem value="1000">Last 1000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Audit Logs Table */}
          <div className="border border-[#E8DCC8] rounded-lg overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-[#FBF7EF] z-10">
                  <TableRow>
                    <TableHead className="min-w-[160px]">Timestamp</TableHead>
                    <TableHead className="min-w-[150px]">User</TableHead>
                    <TableHead className="min-w-[100px]">Role</TableHead>
                    <TableHead className="min-w-[150px]">Action</TableHead>
                    <TableHead className="min-w-[120px]">Entity</TableHead>
                    <TableHead className="min-w-[300px]">Description</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#DB9D47]" />
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-[#87765E]">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-[#FBF7EF]/50">
                        <TableCell className="text-sm text-[#5C4A3A]">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>
                            <div className="font-medium text-[#5C4A3A]">
                              {log.userName || log.userId}
                            </div>
                            {log.userEmail && (
                              <div className="text-xs text-[#87765E]">{log.userEmail}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(log.userRole)}`}>
                            {log.userRole}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-[#5C4A3A]">
                          {log.action.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="text-sm text-[#87765E]">
                          <div>
                            <div>{log.entityType}</div>
                            <div className="text-xs truncate max-w-[100px]">{log.entityId}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-[#5C4A3A]">
                          {log.description}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
