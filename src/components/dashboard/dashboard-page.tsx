'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  CalendarDays,
  ChevronDown,
  UserX,
  ArrowRight,
  Crown,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAppStore } from '@/store/app-store';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const PIE_COLORS = ['#22c55e', '#f59e0b'];

interface AttendanceRecord {
  status: string;
  date: string;
}

interface EmployeeRecord {
  id: string;
  status: string;
  currentSite: string | null;
}

interface SiteGroup {
  name: string;
  count: number;
  statuses: Record<string, number>;
}

interface MonthlyChartData {
  name: string;
  present: number;
  absent: number;
  overtime: number;
}

// Generate all dates of a given month (up to today)
function getMonthDates(yearNum: number, monthNum: number) {
  const now = new Date();
  const today = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const dates: { value: string; label: string; dayNum: number }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateNum = yearNum * 10000 + monthNum * 100 + d;
    const isFuture = dateNum > today;
    const dayOfWeek = new Date(yearNum, monthNum - 1, d).getDay();
    const isFriday = dayOfWeek === 5;
    const dayName = new Date(yearNum, monthNum - 1, d).toLocaleDateString('en-US', { weekday: 'short' });

    dates.push({
      value: dateKey,
      label: `${dayName}, ${format(new Date(yearNum, monthNum - 1, d), 'MMM d')}${isFuture ? ' (upcoming)' : isFriday ? ' (Fri)' : ''}`,
      dayNum: d,
    });
  }

  return dates;
}

export function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [selectedDate, setSelectedDate] = useState<string>(format(now, 'yyyy-MM-dd'));

  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [idleCount, setIdleCount] = useState<number | null>(null);
  const [teamLeaderCount, setTeamLeaderCount] = useState<number>(0);
  const [supervisorCount, setSupervisorCount] = useState<number>(0);

  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setPendingIdleFilter = useAppStore((s) => s.setPendingIdleFilter);

  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  // Format today's date with day name
  const todayDisplay = useMemo(() => {
    return format(now, 'EEEE, MMMM d, yyyy');
  }, []);

  // Generate year options (current year ± 2)
  const yearOptions = useMemo(() => {
    const currentYear = now.getFullYear();
    return [
      String(currentYear - 2),
      String(currentYear - 1),
      String(currentYear),
      String(currentYear + 1),
    ];
  }, []);

  // Generate all dates of the selected month
  const monthDates = useMemo(() => {
    return getMonthDates(yearNum, monthNum);
  }, [yearNum, monthNum]);

  // Check if selected date is valid for current month
  const selectedDateInMonth = useMemo(() => {
    return monthDates.some((d) => d.value === selectedDate);
  }, [monthDates, selectedDate]);

  // Fetch total employees
  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const res = await fetch('/api/employees?limit=1000');
      const json = await res.json();
      if (json.success) {
        setTotalEmployees(json.data.total);
        setEmployees(json.data.employees || []);
        setIdleCount(json.data.idleCount ?? null);
        setTeamLeaderCount(json.data.teamLeaderCount ?? 0);
        setSupervisorCount(json.data.supervisorCount ?? 0);
      }
    } catch {
      setTotalEmployees(null);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // Fetch attendance for current month/year
  const fetchAttendance = useCallback(async (m: string, y: string) => {
    try {
      setLoadingAttendance(true);
      const param = `${y}-${m.padStart(2, '0')}`;
      const res = await fetch(`/api/attendance?month=${param}&year=${y}`);
      const json = await res.json();
      if (json.success) {
        setAttendanceRecords(json.data.records || []);
      } else {
        setAttendanceRecords([]);
      }
    } catch {
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchAttendance(month, year);
  }, [month, year, fetchAttendance]);

  // Handle month/year change - reset selected date to today or last valid date
  useEffect(() => {
    const todayStr = format(now, 'yyyy-MM-dd');
    const inMonth = monthDates.some((d) => d.value === todayStr);
    if (inMonth) {
      setSelectedDate(todayStr);
    } else {
      // Select the latest date in the month
      const lastDate = monthDates[monthDates.length - 1];
      if (lastDate) setSelectedDate(lastDate.value);
    }
  }, [monthDates]);

  const monthParam = `${year}-${month.padStart(2, '0')}`;

  // Compute metrics from attendance data based on selected date
  const selectedDateRecords = attendanceRecords.filter((r) => r.date === selectedDate);
  const presentCount = selectedDateRecords.filter((r) => r.status === 'present').length;
  const absentCount = selectedDateRecords.filter((r) => r.status === 'absent').length;
  const overtimeCount = selectedDateRecords.filter((r) => r.status === 'overtime').length;

  const selectedDateDisplay = useMemo(() => {
    try {
      return format(new Date(selectedDate + 'T00:00:00'), 'MMM d, yyyy');
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const selectedDayName = useMemo(() => {
    try {
      return format(new Date(selectedDate + 'T00:00:00'), 'EEEE');
    } catch {
      return '';
    }
  }, [selectedDate]);

  const isToday = selectedDate === format(now, 'yyyy-MM-dd');

  // Compute monthly chart data
  const monthlyChartData: MonthlyChartData[] = useMemo(() => {
    const data: MonthlyChartData[] = [];
    const currentYearN = parseInt(year, 10);
    const currentMonthN = parseInt(month, 10);

    for (let i = 5; i >= 0; i--) {
      let m = currentMonthN - i;
      let y = currentYearN;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      const monthStr = `${y}-${String(m).padStart(2, '0')}`;
      const monthLabel = MONTHS[m - 1]?.label.slice(0, 3) || `M${m}`;

      const monthRecords = attendanceRecords.filter((r) => r.date.startsWith(monthStr));
      data.push({
        name: `${monthLabel} ${y}`,
        present: monthRecords.filter((r) => r.status === 'present').length,
        absent: monthRecords.filter((r) => r.status === 'absent').length,
        overtime: monthRecords.filter((r) => r.status === 'overtime').length,
      });
    }
    return data;
  }, [attendanceRecords, month, year]);

  // Compute pie chart data - With Site vs Without Site/Idle
  const pieData = useMemo(() => {
    const withSite = employees.filter((e) => e.currentSite && e.currentSite !== '' && e.currentSite !== 'Idle').length;
    const withoutSite = employees.filter((e) => !e.currentSite || e.currentSite === '' || e.currentSite === 'Idle').length;
    const arr = [];
    if (withSite > 0) arr.push({ name: 'With Site', value: withSite });
    if (withoutSite > 0) arr.push({ name: 'Without Site / Idle', value: withoutSite });
    if (arr.length === 0) arr.push({ name: 'No Data', value: 1 });
    return arr;
  }, [employees]);

  // Compute site-wise breakdown
  const siteGroups: SiteGroup[] = useMemo(() => {
    const map = new Map<string, { count: number; statuses: Record<string, number> }>();
    employees.forEach((emp) => {
      const site = emp.currentSite || 'Unassigned';
      const existing = map.get(site) || { count: 0, statuses: {} };
      existing.count++;
      const st = emp.status || 'active';
      existing.statuses[st] = (existing.statuses[st] || 0) + 1;
      map.set(site, existing);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [employees]);

  const idlePercent = totalEmployees && idleCount !== null && totalEmployees > 0
    ? ((idleCount / totalEmployees) * 100).toFixed(1)
    : null;

  const handleIdleClick = () => {
    setPendingIdleFilter(true);
    setCurrentView('employees');
  };

  const metrics = [
    {
      title: 'Total Employees',
      value: loadingEmployees ? null : (totalEmployees ?? 0),
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      subtitle: null,
      clickable: false,
    },
    {
      title: 'Present',
      value: loadingAttendance ? null : presentCount,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      subtitle: `${selectedDayName}, ${selectedDateDisplay}`,
      clickable: false,
    },
    {
      title: 'Absent',
      value: loadingAttendance ? null : absentCount,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      subtitle: `${selectedDayName}, ${selectedDateDisplay}`,
      clickable: false,
    },
    {
      title: 'Overtime',
      value: loadingAttendance ? null : overtimeCount,
      icon: Clock,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      subtitle: `${selectedDayName}, ${selectedDateDisplay}`,
      clickable: false,
    },
    {
      title: 'Idle Workers',
      value: loadingEmployees ? null : (idleCount ?? 0),
      icon: UserX,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      subtitle: idlePercent !== null ? `${idlePercent}% of workforce` : 'No site assigned',
      clickable: true,
      onClick: handleIdleClick,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <div className="flex items-center gap-2 mt-1">
            <CalendarDays className="h-4 w-4 text-emerald-400" />
            <p className="text-emerald-400 font-medium text-sm">{todayDisplay}</p>
          </div>
          <p className="text-slate-400 mt-1">
            Overview of your workforce metrics and attendance.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Dropdown - all dates of current month */}
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[220px] bg-slate-800 border-slate-700 text-slate-200">
              <CalendarDays className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent className="dropdown-upward bg-slate-800 border-slate-700 max-h-72">
              {monthDates.map((d) => (
                <SelectItem
                  key={d.value}
                  value={d.value}
                  className="text-slate-200 focus:bg-slate-700 focus:text-white"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-5 text-right">{d.dayNum}</span>
                    {d.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-slate-200">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent className="dropdown-upward bg-slate-800 border-slate-700">
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-slate-200 focus:bg-slate-700 focus:text-white">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[110px] bg-slate-800 border-slate-700 text-slate-200">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="dropdown-upward bg-slate-800 border-slate-700">
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y} className="text-slate-200 focus:bg-slate-700 focus:text-white">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Team Leaders & Supervisors Pills */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Crown className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-medium text-amber-400">Team Leaders</span>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0 h-4 min-w-[20px] justify-center">
            {loadingEmployees ? '...' : teamLeaderCount}
          </Badge>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Supervisors</span>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0 h-4 min-w-[20px] justify-center">
            {loadingEmployees ? '...' : supervisorCount}
          </Badge>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.title}
              className={`bg-slate-800/50 border-slate-700/50 transition-colors py-4 ${metric.clickable ? 'cursor-pointer hover:border-amber-500/40 hover:bg-slate-800/70' : 'hover:border-slate-600/50'}`}
              onClick={metric.clickable && metric.onClick ? metric.onClick : undefined}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 px-4">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {metric.title}
                </CardTitle>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${metric.bgColor}`}
                >
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pt-0">
                {metric.value === null ? (
                  <Skeleton className="h-8 w-16 bg-slate-700" />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-white">
                      {metric.value.toLocaleString()}
                    </div>
                    {metric.clickable && (
                      <span className="text-[10px] text-amber-400/70 font-medium flex items-center gap-0.5 hover:text-amber-400 transition-colors">
                        View All <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {metric.subtitle || `${MONTHS.find((m) => m.value === month)?.label} ${year}`}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Attendance Bar Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base text-white">
              Monthly Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {loadingAttendance ? (
              <div className="flex flex-col items-center justify-center" style={{ height: 300 }}>
                <Skeleton className="h-full w-full bg-slate-700 rounded-lg" style={{ height: 300 }} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData} barGap={4} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={{ stroke: '#334155' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                    }}
                    itemStyle={{ color: '#e2e8f0' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                    cursor={{ fill: 'rgba(51, 65, 85, 0.3)' }}
                  />
                  <Legend
                    wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
                    iconType="circle"
                  />
                  <Bar dataKey="present" name="Present" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overtime" name="Overtime" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base text-white">
              Site Assignment Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {loadingEmployees ? (
              <div className="flex items-center justify-center" style={{ height: 300 }}>
                <Skeleton className="h-full w-full bg-slate-700 rounded-lg" style={{ height: 300 }} />
              </div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center" style={{ height: 300 }}>
                <Building2 className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">No employee data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: '#64748b' }}
                  >
                    {pieData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend
                    wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
                    iconType="circle"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                    }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Site-wise Breakdown Table */}
      <Card className="bg-slate-800/50 border-slate-700/50 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            Site-wise Employee Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {loadingEmployees ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-slate-700 rounded-lg" />
              ))}
            </div>
          ) : siteGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No site data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-semibold">Site Name</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-center">Employee Count</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteGroups.map((site) => {
                    const statusEntries = Object.entries(site.statuses);
                    const hasOnlyActive = statusEntries.length === 1 && statusEntries[0][0] === 'active';
                    return (
                      <TableRow key={site.name} className="border-slate-700/50 hover:bg-slate-700/30">
                        <TableCell className="text-slate-200 font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-500" />
                            {site.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-200 text-center font-semibold">
                          {site.count}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasOnlyActive ? (
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20">
                              Active
                            </Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {statusEntries.map(([status, count]) => {
                                const colorMap: Record<string, string> = {
                                  active: 'bg-green-500/10 text-green-400 border-green-500/20',
                                  pending_deletion: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                  idle: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                                  deleted: 'bg-red-500/10 text-red-400 border-red-500/20',
                                };
                                const labelMap: Record<string, string> = {
                                  active: 'Active',
                                  pending_deletion: 'Pending',
                                  idle: 'Idle',
                                  deleted: 'Deleted',
                                };
                                return (
                                  <Badge
                                    key={status}
                                    className={`${colorMap[status] || colorMap.active} hover:opacity-80 text-xs`}
                                  >
                                    {labelMap[status] || status}: {count}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
