'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  Clock,
  DollarSign,
  Users,
  Building2,
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  AlertTriangle,
  Search,
  Pencil,
  X,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/* ───────── Types ───────── */

interface SiteData {
  id: string;
  name: string;
  clientName?: string | null;
  projectName?: string | null;
  isActive: boolean;
  employeeCount: number;
  totalHours: number;
  totalSalary: number;
  totalDeductions: number;
  totalAdvances: number;
  totalBalanceSalary: number;
  employees: EmployeeSalaryData[];
}

interface EmployeeSalaryData {
  salaryRecordId: string | null;
  empId: string;
  empName: string;
  nationality: string;
  trade: string;
  employeeCode: string;
  isTeamLeader: boolean;
  isSupervisor: boolean;
  totalHours: number;
  rtPerHour: number;
  totalSalary: number;
  deduction: number;
  advance: number;
  balanceSalary: number;
  isPaid: boolean;
  slNo: number;
  totalWorkingHours: number;
  calculatedRtPerHour: number;
  rateTier: 'standard' | 'premium';
}

interface WorkingHoursData {
  id: string;
  empId: string;
  empName: string;
  totalWorkingHours: number;
  rtPerHour: number;
  isCustom: boolean;
  calculatedRtPerHour: number;
  employee: {
    employeeId: string;
    fullName: string;
    trade: string | null;
    nationality: string | null;
    isTeamLeader: boolean;
    isSupervisor: boolean;
    currentSite: string | null;
  };
}

interface MonthlyHoursData {
  month: string; // YYYY-MM
  totalHours: number;
  rtPerHour: number;
  recordId: string | null; // TotalEmployeeWorkingHours record ID
  salaryRecordId: string | null;
}

interface SiteResult {
  site: {
    id: string;
    name: string;
    clientName?: string | null;
    projectName?: string | null;
  };
  employeeCount: number;
  totalHours: number;
  totalSalary: number;
  totalDeductions: number;
  totalAdvances: number;
  totalBalanceSalary: number;
  employees: {
    empId: string;
    empName: string;
    employeeCode: string;
    nationality: string;
    trade: string;
    isTeamLeader: boolean;
    isSupervisor: boolean;
    rateTier: 'standard' | 'premium';
    salaryRecord: {
      id: string;
      empId: string;
      empName: string;
      siteId: string;
      siteName: string;
      month: string;
      year: number;
      nationality: string;
      trade: string;
      employeeCode: string;
      slNo: number;
      totalHours: number;
      rtPerHour: number;
      totalSalary: number;
      deduction: number;
      advance: number;
      balanceSalary: number;
      isPaid: boolean;
      isDeleted: boolean;
      rateTier: string;
      createdAt: string;
      updatedAt: string;
    } | null;
    workingHours: {
      id?: string;
      empId: string;
      empName: string;
      totalWorkingHours: number;
      rtPerHour: number;
      isCustom: boolean;
      calculatedRtPerHour: number;
    };
  }[];
}

type SubView = 'accounts' | 'working-hours' | 'employee-detail';

/* ───────── Constants ───────── */

const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ───────── Helpers ───────── */

function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getMonthString(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function isMonthAvailable(year: number, month: number): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  if (year < currentYear) return true;
  if (year === currentYear) return month <= currentMonth;
  return false;
}

// RT/HR calculation with TL and Supervisor bonus for BOTH basic and full rates
function calculateRtPerHourAuto(totalWorkingHours: number, isTeamLeader: boolean, isSupervisor: boolean): number {
  const hasBonus = isTeamLeader || isSupervisor;
  if (totalWorkingHours >= 1000) {
    return hasBonus ? 5.5 : 5.0;
  }
  return hasBonus ? 3.0 : 2.5;
}

/* ───────── Employee Detail Page (Monthly Hours) ───────── */

function EmployeeDetailPage({
  empId,
  empName,
  onBack,
}: {
  empId: string;
  empName: string;
  onBack: () => void;
}) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyHoursData[]>([]);
  const [originalData, setOriginalData] = useState<MonthlyHoursData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [employeeInfo, setEmployeeInfo] = useState<{
    isTeamLeader: boolean;
    isSupervisor: boolean;
    totalWorkingHours: number;
    rtPerHour: number;
    isCustom: boolean;
  } | null>(null);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/accounts/employee-monthly?empId=${empId}&year=${selectedYear}`);
      const json = await res.json();
      if (json.success) {
        const data = json.data.monthlyData || [];
        setMonthlyData(data);
        setOriginalData(data);
        setEmployeeInfo(json.data.employeeInfo || null);
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to load data', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load monthly data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [empId, selectedYear]);

  useEffect(() => {
    setEditMode(false);
    fetchData();
  }, [fetchData]);

  const handleMonthlyHoursChange = (monthStr: string, value: number) => {
    setMonthlyData((prev) =>
      prev.map((m) => {
        if (m.month !== monthStr) return m;
        return { ...m, totalHours: value };
      })
    );
  };

  const handleMonthlyRateChange = (monthStr: string, value: number) => {
    setMonthlyData((prev) =>
      prev.map((m) => {
        if (m.month !== monthStr) return m;
        return { ...m, rtPerHour: value };
      })
    );
  };

  const handleEditToggle = () => {
    if (editMode) {
      // Cancel edit - revert to original data
      setMonthlyData(originalData);
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Only send available months (up to current month)
      // AND only send months that have non-zero hours OR were changed from original
      const availableMonths = monthlyData.filter((m) => {
        const monthNum = parseInt(m.month.split('-')[1], 10) - 1;
        const available = isMonthAvailable(selectedYear, monthNum);
        if (!available) return false;

        // Always include months with non-zero hours
        if (m.totalHours > 0) return true;

        // Include months that were changed (even if back to 0)
        const orig = originalData.find((o) => o.month === m.month);
        if (orig && orig.totalHours !== m.totalHours) return true;
        if (orig && orig.rtPerHour !== m.rtPerHour) return true;

        // Include months that have existing records (even with 0 hours) to preserve them
        if (m.recordId) return true;

        return false;
      });

      if (availableMonths.length === 0) {
        toast({ title: 'No Changes', description: 'No months to save.' });
        setSaving(false);
        return;
      }

      const res = await fetch('/api/accounts/employee-monthly', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId,
          year: selectedYear,
          monthlyData: availableMonths.map((m) => ({
            month: m.month,
            totalHours: m.totalHours,
            rtPerHour: m.rtPerHour,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        const errorCount = json.data?.errors?.length || 0;
        if (errorCount > 0) {
          toast({ title: 'Partial Save', description: `${json.data.updated} month(s) saved, ${errorCount} failed.`, variant: 'destructive' });
        } else {
          toast({ title: 'Saved', description: `${json.data.updated} month(s) updated successfully.` });
        }
        setEditMode(false);
        fetchData();
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to save', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save monthly data', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Compute total hours for available months only
  const totalYearHours = monthlyData
    .filter((m) => {
      const monthNum = parseInt(m.month.split('-')[1], 10) - 1;
      return isMonthAvailable(selectedYear, monthNum);
    })
    .reduce((s, m) => s + m.totalHours, 0);

  // Build split rows: when cumulative hours cross 1000, split that month into 2 rows
  const splitRows: Array<{
    monthStr: string;
    monthName: string;
    hours: number;
    rate: number;
    rateTier: 'standard' | 'premium';
    cumulativeHours: number;
  }> = [];

  let cumulative = 0;
  for (let i = 0; i < 12; i++) {
    const available = isMonthAvailable(selectedYear, i);
    if (!available) continue;
    const monthStr = getMonthString(selectedYear, i);
    const monthData = monthlyData.find((md) => md.month === monthStr);
    const hours = monthData?.totalHours || 0;
    const rate = monthData?.rtPerHour || 2.5;

    if (hours === 0) {
      splitRows.push({
        monthStr,
        monthName: MONTH_FULL[i],
        hours: 0,
        rate,
        rateTier: 'standard',
        cumulativeHours: cumulative,
      });
      continue;
    }

    const prevCumulative = cumulative;
    cumulative += hours;

    if (prevCumulative < 1000 && cumulative > 1000) {
      // This month crosses 1000 — split into 2 rows
      const basicHours = 1000 - prevCumulative;
      const premiumHours = hours - basicHours;
      const hasBonus = employeeInfo?.isTeamLeader || employeeInfo?.isSupervisor || false;
      const basicRate = hasBonus ? 3.0 : 2.5;
      const premiumRate = hasBonus ? 5.5 : 5.0;

      splitRows.push({
        monthStr,
        monthName: MONTH_FULL[i],
        hours: basicHours,
        rate: basicRate,
        rateTier: 'standard',
        cumulativeHours: prevCumulative + basicHours,
      });
      splitRows.push({
        monthStr,
        monthName: MONTH_FULL[i],
        hours: premiumHours,
        rate: premiumRate,
        rateTier: 'premium',
        cumulativeHours: cumulative,
      });
    } else if (cumulative <= 1000) {
      // All at basic rate
      const hasBonus = employeeInfo?.isTeamLeader || employeeInfo?.isSupervisor || false;
      const basicRate = hasBonus ? 3.0 : 2.5;
      splitRows.push({
        monthStr,
        monthName: MONTH_FULL[i],
        hours,
        rate: basicRate,
        rateTier: 'standard',
        cumulativeHours: cumulative,
      });
    } else {
      // All at premium rate (already past 1000)
      const hasBonus = employeeInfo?.isTeamLeader || employeeInfo?.isSupervisor || false;
      const premiumRate = hasBonus ? 5.5 : 5.0;
      splitRows.push({
        monthStr,
        monthName: MONTH_FULL[i],
        hours,
        rate: premiumRate,
        rateTier: 'premium',
        cumulativeHours: cumulative,
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">{empName}</h2>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Monthly working hours breakdown
              {employeeInfo && (
                <span className="ml-2">
                  ({employeeInfo.isTeamLeader ? 'Team Leader' : employeeInfo.isSupervisor ? 'Supervisor' : 'Employee'} • Total: {formatNumber(employeeInfo.totalWorkingHours)} hrs • RT/HR: {employeeInfo.rtPerHour})
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {editMode && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          )}
          <Button
            onClick={handleEditToggle}
            className={cn(
              'gap-2',
              editMode
                ? 'bg-slate-600 hover:bg-slate-500 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            )}
          >
            {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {editMode ? 'Cancel' : 'Edit'}
          </Button>
          <Button
            variant="outline"
            onClick={onBack}
            className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <Separator className="bg-slate-700/50" />

      {/* Year Selector */}
      <div className="flex items-center gap-3">
        <Label className="text-sm text-slate-400">Year:</Label>
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
        >
          <SelectTrigger className="w-[120px] bg-slate-700/50 border-slate-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)} className="text-white focus:bg-slate-700 focus:text-white">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Monthly Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 bg-slate-800 rounded-lg" />
          ))}
        </div>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="text-left text-slate-400 font-semibold text-sm py-3 px-4 w-[180px]">Month</th>
                  <th className="text-right text-slate-400 font-semibold text-sm py-3 px-4 w-[160px]">Total Hours</th>
                  <th className="text-right text-slate-400 font-semibold text-sm py-3 px-4 w-[140px]">RT/HR</th>
                  <th className="text-right text-slate-400 font-semibold text-sm py-3 px-4 w-[160px]">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {splitRows.map((row, idx) => {
                  const isPremium = row.rateTier === 'premium';
                  const isSplitMonth = splitRows.some((r, i) => i !== idx && r.monthStr === row.monthStr);
                  return (
                    <tr key={`${row.monthStr}-${row.rateTier}-${idx}`} className={cn(
                      'border-b border-slate-700/50 hover:bg-slate-700/30',
                      isPremium && 'bg-amber-500/5'
                    )}>
                      <td className="text-white text-sm font-medium py-2.5 px-4">
                        {row.monthName}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {editMode ? (
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={row.hours}
                            onChange={(e) => handleMonthlyHoursChange(row.monthStr, parseFloat(e.target.value) || 0)}
                            className="w-full h-8 text-sm bg-slate-900 border-slate-600 text-white text-right"
                            disabled={isSplitMonth && isPremium}
                          />
                        ) : (
                          <span className={cn('text-sm', row.hours > 0 ? 'text-white' : 'text-slate-500')}>
                            {formatNumber(row.hours)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="text-sm text-white">{formatNumber(row.rate)}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className={cn(
                          'text-sm font-medium',
                          row.cumulativeHours >= 1000 ? 'text-amber-400' : 'text-slate-400'
                        )}>
                          {formatNumber(row.cumulativeHours)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Total Row - visually separated */}
              <tfoot>
                <tr className="border-t-2 border-slate-500 bg-slate-900/60">
                  <td className="text-sm text-slate-300 font-bold py-3 px-4">TOTAL</td>
                  <td className="text-sm text-white font-bold py-3 px-4 text-right">{formatNumber(totalYearHours)}</td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Rate Info */}
      <Card className="bg-slate-800/30 border-slate-700/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">Rate Calculation Rules:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                <li>Basic rate: <span className="text-white font-medium">2.5 AED/hr</span></li>
                <li>After 1000 hours: <span className="text-white font-medium">5.0 AED/hr</span></li>
                <li>Team Leader / Supervisor bonus: <span className="text-white font-medium">+0.5 AED/hr</span> (3.0 basic, 5.5 after 1000 hrs)</li>
                <li>Editing rate here will sync to the salary table</li>
                <li>Click <span className="text-amber-400 font-medium">Edit</span> to modify hours and rates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── Add Employee Dialog ───────── */

function AddEmployeeDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      fetchAvailable();
      setSelectedIds(new Set());
      setSearch('');
    }
  }, [open]);

  const fetchAvailable = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts/working-hours?available=true');
      const json = await res.json();
      if (json.success) {
        setAvailableEmployees(json.data.employees || []);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load employees', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    if (!search) return availableEmployees;
    const q = search.toLowerCase();
    return availableEmployees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        (e.trade && e.trade.toLowerCase().includes(q))
    );
  }, [availableEmployees, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    try {
      setAdding(true);
      const res = await fetch('/api/accounts/working-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: Array.from(selectedIds),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Added', description: `${selectedIds.size} employee(s) added to working hours.` });
        onAdded();
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to add', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add employees', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Add Employees to Working Hours</DialogTitle>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto mt-3 min-h-0 max-h-[400px]">
          {loading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 bg-slate-700 rounded" />
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center text-slate-500 py-8 text-sm">
              No employees available to add.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredEmployees.map((emp) => (
                <label
                  key={emp.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors',
                    selectedIds.has(emp.id)
                      ? 'bg-emerald-600/20 border border-emerald-500/30'
                      : 'hover:bg-slate-700/50 border border-transparent'
                  )}
                >
                  <Checkbox
                    checked={selectedIds.has(emp.id)}
                    onCheckedChange={() => toggleSelect(emp.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{emp.fullName}</div>
                    <div className="text-xs text-slate-400">
                      {emp.employeeId} {emp.trade ? `• ${emp.trade}` : ''}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-slate-700/50 border-slate-600 text-slate-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedIds.size === 0 || adding}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Manage Employee Hours Sub-View ───────── */

function ManageWorkingHoursPage({
  onBack,
  onViewEmployee,
}: {
  onBack: () => void;
  onViewEmployee: (empId: string, empName: string) => void;
}) {
  const [records, setRecords] = useState<WorkingHoursData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchWorkingHours();
  }, []);

  const fetchWorkingHours = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts/working-hours');
      const json = await res.json();
      if (json.success) {
        setRecords(json.data.records || []);
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to load working hours', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load working hours', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredRecords = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.empName.toLowerCase().includes(q) ||
        r.employee.employeeId.toLowerCase().includes(q) ||
        (r.employee.trade && r.employee.trade.toLowerCase().includes(q)) ||
        (r.employee.nationality && r.employee.nationality.toLowerCase().includes(q))
    );
  }, [records, search]);

  const handleWorkingHoursChange = (empId: string, value: number) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.empId !== empId) return r;
        const updated = { ...r, totalWorkingHours: value };
        if (!r.isCustom) {
          updated.rtPerHour = calculateRtPerHourAuto(value, r.employee.isTeamLeader, r.employee.isSupervisor);
          updated.calculatedRtPerHour = updated.rtPerHour;
        }
        return updated;
      })
    );
  };

  const handleRtPerHourChange = (empId: string, value: number) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.empId !== empId) return r;
        return { ...r, rtPerHour: value, calculatedRtPerHour: value };
      })
    );
  };

  const handleCustomToggle = (empId: string, isCustom: boolean) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.empId !== empId) return r;
        const updated = { ...r, isCustom };
        if (!isCustom) {
          updated.rtPerHour = calculateRtPerHourAuto(r.totalWorkingHours, r.employee.isTeamLeader, r.employee.isSupervisor);
          updated.calculatedRtPerHour = updated.rtPerHour;
        }
        return updated;
      })
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const results = await Promise.allSettled(
        records.map((r) =>
          fetch('/api/accounts/working-hours', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empId: r.empId,
              totalWorkingHours: r.totalWorkingHours,
              rtPerHour: r.rtPerHour,
              isCustom: r.isCustom,
              empName: r.empName,
            }),
          })
        )
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        toast({ title: 'Partial Save', description: `${failed} record(s) failed to save.`, variant: 'destructive' });
      } else {
        toast({ title: 'Saved', description: 'All working hours updated successfully.' });
      }
      fetchWorkingHours();
    } catch {
      toast({ title: 'Error', description: 'Failed to save working hours', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Manage Employee Hours</h2>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Edit total working hours and rate per hour. Click a row to view monthly breakdown.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Employee
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All
          </Button>
          <Button
            variant="outline"
            onClick={onBack}
            className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Accounts
          </Button>
        </div>
      </div>

      <Separator className="bg-slate-700/50" />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 bg-slate-800 rounded-lg" />
          ))}
        </div>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-semibold">Name</TableHead>
                    <TableHead className="text-slate-400 font-semibold">EMP ID</TableHead>
                    <TableHead className="text-slate-400 font-semibold">Trade</TableHead>
                    <TableHead className="text-slate-400 font-semibold">Nationality</TableHead>
                    <TableHead className="text-slate-400 font-semibold">Total Working Hours</TableHead>
                    <TableHead className="text-slate-400 font-semibold">RT/HR</TableHead>
                    <TableHead className="text-slate-400 font-semibold">Custom Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                        No employees found. Click &quot;Add Employee&quot; to add employees.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow
                        key={record.empId}
                        className="border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                        onClick={() => onViewEmployee(record.empId, record.empName)}
                      >
                        <TableCell className="text-white text-sm font-medium">{record.empName}</TableCell>
                        <TableCell className="text-slate-300 text-sm font-mono">{record.employee.employeeId}</TableCell>
                        <TableCell className="text-slate-300 text-sm">
                          {record.employee.trade || '-'}
                          {record.employee.isTeamLeader && <span className="text-amber-400 ml-1 text-[10px]">TL</span>}
                          {record.employee.isSupervisor && <span className="text-sky-400 ml-1 text-[10px]">SUP</span>}
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">{record.employee.nationality || '-'}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={record.totalWorkingHours}
                            onChange={(e) => handleWorkingHoursChange(record.empId, parseFloat(e.target.value) || 0)}
                            className="w-24 h-8 text-sm bg-slate-900 border-slate-600 text-white text-right"
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={record.rtPerHour}
                            onChange={(e) => handleRtPerHourChange(record.empId, parseFloat(e.target.value) || 0)}
                            disabled={!record.isCustom}
                            className={cn(
                              'w-20 h-8 text-sm text-right',
                              record.isCustom
                                ? 'bg-slate-900 border-amber-500/50 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed'
                            )}
                          />
                          {!record.isCustom && (
                            <span className="text-[10px] text-slate-500 ml-1">auto</span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={record.isCustom}
                              onCheckedChange={(checked) => handleCustomToggle(record.empId, checked)}
                            />
                            <span className={cn('text-xs', record.isCustom ? 'text-amber-400' : 'text-slate-500')}>
                              {record.isCustom ? 'Custom' : 'Auto'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-calculation Info */}
      <Card className="bg-slate-800/30 border-slate-700/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">Rate Calculation Rules:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                <li>Basic rate: <span className="text-white font-medium">2.5 AED/hr</span></li>
                <li>After 1000 hours: <span className="text-white font-medium">5.0 AED/hr</span></li>
                <li>Team Leader / Supervisor bonus: <span className="text-white font-medium">+0.5 AED/hr</span> (3.0 basic, 5.5 after 1000 hrs)</li>
                <li>Enable &quot;Custom Rate&quot; to manually override the rate</li>
                <li>Click on a row to view monthly hours breakdown</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <AddEmployeeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdded={fetchWorkingHours}
      />
    </div>
  );
}

/* ───────── Site Salary Sheet ───────── */

function SiteSalarySheet({
  site,
  month,
  year,
  onRefresh,
  editMode,
}: {
  site: SiteData;
  month: number;
  year: number;
  onRefresh: () => void;
  editMode: boolean;
}) {
  const [employees, setEmployees] = useState<EmployeeSalaryData[]>(site.employees);
  const [saving, setSaving] = useState(false);

  // Sync employees when site prop changes
  useEffect(() => {
    setEmployees(site.employees);
  }, [site.employees]);

  // Use index-based identification for split entries (same empId can appear twice)
  const handleCellChange = (index: number, field: string, value: number | boolean | string) => {
    setEmployees((prev) => {
      const currentEmp = prev[index];
      if (!currentEmp) return prev;

      // Fields that should sync to the sibling split row (same empId, different rateTier)
      const syncFields = new Set(['empName', 'nationality', 'trade', 'employeeCode', 'deduction', 'advance', 'isPaid']);

      return prev.map((emp, i) => {
        if (i === index) {
          const updated = { ...emp, [field]: value };
          // Auto-calculate totals
          if (field === 'totalHours' || field === 'rtPerHour' || field === 'deduction' || field === 'advance') {
            updated.totalSalary = updated.totalHours * updated.rtPerHour;
            updated.balanceSalary = updated.totalSalary - updated.deduction - updated.advance;
          }
          return updated;
        }

        // Sync shared fields to the sibling split row
        if (syncFields.has(field) && emp.empId === currentEmp.empId && emp.rateTier !== currentEmp.rateTier) {
          const updated = { ...emp, [field]: value };
          // Recalculate balance if deduction/advance changed
          if (field === 'deduction' || field === 'advance') {
            updated.totalSalary = updated.totalHours * updated.rtPerHour;
            updated.balanceSalary = updated.totalSalary - updated.deduction - updated.advance;
          }
          return updated;
        }

        return emp;
      });
    });
  };

  const handlePaidToggle = (index: number, currentIsPaid: boolean) => {
    // unpaid → paid: always allowed
    // paid → unpaid: requires edit mode
    if (currentIsPaid && !editMode) return;
    handleCellChange(index, 'isPaid', !currentIsPaid);
  };

  const handleAddRow = () => {
    const newSlNo = employees.length + 1;
    setEmployees((prev) => [
      ...prev,
      {
        salaryRecordId: null,
        empId: `new-${Date.now()}-${newSlNo}`,
        empName: '',
        nationality: '',
        trade: '',
        employeeCode: '',
        isTeamLeader: false,
        isSupervisor: false,
        totalHours: 0,
        rtPerHour: 2.5,
        totalSalary: 0,
        deduction: 0,
        advance: 0,
        balanceSalary: 0,
        isPaid: false,
        slNo: newSlNo,
        totalWorkingHours: 0,
        calculatedRtPerHour: 2.5,
        rateTier: 'standard' as const,
      },
    ]);
  };

  const handleDeleteRow = (index: number) => {
    setEmployees((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((emp, i) => ({ ...emp, slNo: i + 1 }));
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const monthStr = getMonthString(year, month);

      const results = await Promise.allSettled(
        employees.map((emp) => {
          const body = {
            empId: emp.empId,
            empName: emp.empName,
            siteId: site.id,
            siteName: site.name,
            month: monthStr,
            year,
            nationality: emp.nationality,
            trade: emp.trade,
            employeeCode: emp.employeeCode,
            slNo: emp.slNo,
            totalHours: emp.totalHours,
            rtPerHour: emp.rtPerHour,
            totalSalary: emp.totalSalary,
            deduction: emp.deduction,
            advance: emp.advance,
            balanceSalary: emp.balanceSalary,
            isPaid: emp.isPaid,
            rateTier: emp.rateTier,
            // Bidirectional sync: update TotalEmployeeWorkingHours
            updateWorkingHours: true,
          };

          if (emp.salaryRecordId) {
            return fetch('/api/accounts/salary', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: emp.salaryRecordId, ...body }),
            });
          } else {
            return fetch('/api/accounts/salary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
          }
        })
      );

      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        toast({ title: 'Partial Save', description: `${failed} record(s) failed to save.`, variant: 'destructive' });
      } else {
        toast({ title: 'Saved', description: `Salary records for ${site.name} saved successfully.` });
      }
      onRefresh();
    } catch {
      toast({ title: 'Error', description: 'Failed to save salary records', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Totals
  const sumTotalHours = employees.reduce((s, e) => s + e.totalHours, 0);
  const sumTotalSalary = employees.reduce((s, e) => s + e.totalSalary, 0);
  const sumDeduction = employees.reduce((s, e) => s + e.deduction, 0);
  const sumAdvance = employees.reduce((s, e) => s + e.advance, 0);
  const sumBalanceSalary = employees.reduce((s, e) => s + e.balanceSalary, 0);

  const tradeDisplay = (emp: EmployeeSalaryData) => {
    let trade = emp.trade;
    if (emp.isSupervisor) trade = `${trade}/SUPERVISOR`;
    if (emp.isTeamLeader) trade = `${trade}/TL`;
    return trade;
  };

  return (
    <div className="space-y-4">
      {/* Title rows */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-white">{site.name}</h3>
        <p className="text-sm text-slate-400 mt-1">
          TIMESHEET FOR THE MONTH OF {MONTH_FULL[month].toUpperCase()} {year}
        </p>
      </div>

      {/* Salary Table */}
      <div className="overflow-x-auto border border-slate-700/50 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-transparent bg-slate-800/80">
              <TableHead className="text-slate-300 font-semibold text-xs w-12 text-center">SL.NO</TableHead>
              <TableHead className="text-slate-300 font-semibold text-xs min-w-[80px]">NATIONALITY</TableHead>
              <TableHead className="text-slate-300 font-semibold text-xs min-w-[120px]">NAME</TableHead>
              <TableHead className="text-slate-300 font-semibold text-xs min-w-[90px]">TRADE</TableHead>
              <TableHead className="text-slate-300 font-semibold text-xs min-w-[80px]">EMP ID</TableHead>
              <TableHead className="text-slate-300 font-semibold text-xs w-20 text-right">TOTAL HOUR</TableHead>
              <TableHead className="text-slate-300 font-semibold text-xs w-20 text-right">RT/HR</TableHead>
              <TableHead className="text-slate-300 font-semibold text-xs w-24 text-right">TOTAL SALARY</TableHead>
              <TableHead className="text-slate-300 font-semibold text-xs w-20 text-right">DEDUCTION</TableHead>
              <TableHead className="text-slate-300 font-semibold text-xs w-20 text-right">ADVANCE</TableHead>
              <TableHead className="text-slate-300 font-semibold text-xs w-24 text-right">BALANCE SALARY</TableHead>
              <TableHead className="text-slate-300 font-semibold text-xs w-16 text-center">PAID</TableHead>
              {editMode && <TableHead className="text-slate-300 font-semibold text-xs w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp, index) => {
              return (
                <TableRow
                  key={`${emp.empId}-${emp.rateTier}-${index}`}
                  className={cn(
                    'border-slate-700/50',
                    editMode ? 'hover:bg-slate-700/20' : 'hover:bg-transparent',
                    emp.isPaid && 'bg-emerald-500/5',
                    emp.rateTier === 'premium' && 'bg-amber-500/5'
                  )}
                >
                  <TableCell className="text-slate-400 text-xs text-center font-mono">{emp.slNo}</TableCell>
                  <TableCell>
                    {editMode ? (
                      <Input
                        value={emp.nationality}
                        onChange={(e) => handleCellChange(index, 'nationality', e.target.value)}
                        className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white min-w-[70px]"
                      />
                    ) : (
                      <span className="text-xs text-slate-300 px-1">{emp.nationality || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editMode ? (
                      <Input
                        value={emp.empName}
                        onChange={(e) => handleCellChange(index, 'empName', e.target.value)}
                        className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white min-w-[110px]"
                      />
                    ) : (
                      <span className="text-xs text-white font-medium px-1">{emp.empName || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">
                    {tradeDisplay(emp)}
                  </TableCell>
                  <TableCell>
                    {editMode ? (
                      <Input
                        value={emp.employeeCode}
                        onChange={(e) => handleCellChange(index, 'employeeCode', e.target.value)}
                        className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white font-mono min-w-[75px]"
                      />
                    ) : (
                      <span className="text-xs text-slate-300 font-mono px-1">{emp.employeeCode || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editMode ? (
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={emp.totalHours}
                        onChange={(e) => handleCellChange(index, 'totalHours', parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white text-right w-[70px]"
                      />
                    ) : (
                      <span className={cn('text-xs text-right block', emp.totalHours > 0 ? 'text-white font-medium' : 'text-slate-500')}>
                        {emp.totalHours || '-'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      {editMode ? (
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={emp.rtPerHour}
                          onChange={(e) => handleCellChange(index, 'rtPerHour', parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white text-right w-[70px]"
                        />
                      ) : (
                        <span className="text-xs text-right text-white">{emp.rtPerHour}</span>
                      )}

                    </div>
                  </TableCell>
                  <TableCell className={cn('text-xs text-right font-medium', emp.totalSalary > 0 ? 'text-white' : 'text-slate-500')}>
                    {formatNumber(emp.totalSalary)}
                  </TableCell>
                  <TableCell>
                    {editMode ? (
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={emp.deduction}
                        onChange={(e) => handleCellChange(index, 'deduction', parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white text-right w-[70px]"
                      />
                    ) : (
                      <span className={cn('text-xs text-right block', emp.deduction > 0 ? 'text-slate-300' : 'text-slate-600')}>
                        {emp.deduction || '-'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editMode ? (
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={emp.advance}
                        onChange={(e) => handleCellChange(index, 'advance', parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white text-right w-[70px]"
                      />
                    ) : (
                      <span className={cn('text-xs text-right block', emp.advance > 0 ? 'text-slate-300' : 'text-slate-600')}>
                        {emp.advance || '-'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-xs text-right font-semibold',
                      emp.isPaid ? 'text-emerald-400' : emp.balanceSalary > 0 ? 'text-amber-400' : 'text-slate-400'
                    )}
                  >
                    {formatNumber(emp.balanceSalary)}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => handlePaidToggle(index, emp.isPaid)}
                      className={cn(
                        'inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-bold transition-colors',
                        emp.isPaid
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-500 border border-slate-600/50 hover:bg-slate-600/50 hover:text-slate-400',
                        !emp.isPaid && 'cursor-pointer',
                        emp.isPaid && !editMode && 'cursor-default',
                        emp.isPaid && editMode && 'cursor-pointer hover:bg-emerald-500/30'
                      )}
                    >
                      {emp.isPaid ? 'PAID' : 'UNPAID'}
                    </button>
                  </TableCell>
                  {editMode && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDeleteRow(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Separated Total Section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3">
        <div className="grid grid-cols-5 gap-4 text-xs">
          <div>
            <div className="text-slate-500 mb-0.5">Total Hours</div>
            <div className="text-white font-bold text-sm">{formatNumber(sumTotalHours)}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-0.5">Total Salary</div>
            <div className="text-white font-bold text-sm">{formatNumber(sumTotalSalary)} AED</div>
          </div>
          <div>
            <div className="text-slate-500 mb-0.5">Total Deduction</div>
            <div className="text-slate-400 font-bold text-sm">{formatNumber(sumDeduction)} AED</div>
          </div>
          <div>
            <div className="text-slate-500 mb-0.5">Total Advance</div>
            <div className="text-slate-400 font-bold text-sm">{formatNumber(sumAdvance)} AED</div>
          </div>
          <div>
            <div className="text-slate-500 mb-0.5">Total Balance</div>
            <div className="text-emerald-400 font-bold text-sm">{formatNumber(sumBalanceSalary)} AED</div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Only in Edit Mode */}
      {editMode && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (employees.length > 0) handleDeleteRow(employees.length - 1);
            }}
            disabled={employees.length === 0}
            className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-red-600 hover:text-white hover:border-red-600 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Last Row
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

/* ───────── Add New Sites Dialog ───────── */

interface AvailableSite {
  id: string;
  name: string;
  clientName?: string | null;
  projectName?: string | null;
}

function AddNewSitesDialog({
  open,
  onOpenChange,
  month,
  year,
  existingSiteIds,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: number;
  year: number;
  existingSiteIds: Set<string>;
  onAdded: () => void;
}) {
  const [availableSites, setAvailableSites] = useState<AvailableSite[]>([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [customSiteName, setCustomSiteName] = useState('');
  const [customClientName, setCustomClientName] = useState('');
  const [customProjectName, setCustomProjectName] = useState('');

  useEffect(() => {
    if (open) {
      fetchAvailableSites();
      setSelectedSiteIds(new Set());
      setSearch('');
      setCustomSiteName('');
      setCustomClientName('');
      setCustomProjectName('');
    }
  }, [open]);

  const fetchAvailableSites = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sites');
      const json = await res.json();
      if (json.success) {
        setAvailableSites(json.data.sites || []);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load sites', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Filter sites: exclude sites already in the current view, and apply search
  const filteredSites = useMemo(() => {
    const notAlreadyAdded = availableSites.filter(s => !existingSiteIds.has(s.id));
    if (!search) return notAlreadyAdded;
    const q = search.toLowerCase();
    return notAlreadyAdded.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        (s.clientName && s.clientName.toLowerCase().includes(q)) ||
        (s.projectName && s.projectName.toLowerCase().includes(q))
    );
  }, [availableSites, existingSiteIds, search]);

  const toggleSelect = (id: string) => {
    setSelectedSiteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedSiteIds.size === 0 && !customSiteName.trim()) return;
    try {
      setAdding(true);
      const monthStr = getMonthString(year, month);
      const body: Record<string, unknown> = { month: monthStr, year };

      if (selectedSiteIds.size > 0) {
        body.siteIds = Array.from(selectedSiteIds);
      }
      if (customSiteName.trim()) {
        body.customSiteName = customSiteName.trim();
        if (customClientName.trim()) body.customClientName = customClientName.trim();
        if (customProjectName.trim()) body.customProjectName = customProjectName.trim();
      }

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Sites Added', description: `${json.data.activated} site(s) activated for ${MONTH_FULL[month]} ${year}.` });
        onAdded();
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to add sites', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add sites', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Sites</DialogTitle>
          <p className="text-sm text-slate-400 mt-1">
            Select sites for {MONTH_FULL[month]} {year}
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search sites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Site List */}
        <div className="flex-1 overflow-y-auto mt-3 min-h-0 max-h-[300px]">
          {loading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 bg-slate-700 rounded" />
              ))}
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center text-slate-500 py-6 text-sm">
              No additional sites available.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSites.map((site) => (
                <label
                  key={site.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors',
                    selectedSiteIds.has(site.id)
                      ? 'bg-emerald-600/20 border border-emerald-500/30'
                      : 'hover:bg-slate-700/50 border border-transparent'
                  )}
                >
                  <Checkbox
                    checked={selectedSiteIds.has(site.id)}
                    onCheckedChange={() => toggleSelect(site.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{site.name}</div>
                    <div className="text-xs text-slate-400">
                      {site.clientName && <span>{site.clientName}</span>}
                      {site.clientName && site.projectName && <span> • </span>}
                      {site.projectName && <span>{site.projectName}</span>}
                    </div>
                  </div>
                  <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Custom Site Section */}
        <div className="border-t border-slate-700/50 mt-3 pt-3 space-y-2">
          <p className="text-sm font-medium text-slate-300">Add Custom Site</p>
          <Input
            placeholder="Site name *"
            value={customSiteName}
            onChange={(e) => setCustomSiteName(e.target.value)}
            className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 h-9 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Client name (optional)"
              value={customClientName}
              onChange={(e) => setCustomClientName(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 h-9 text-sm"
            />
            <Input
              placeholder="Project name (optional)"
              value={customProjectName}
              onChange={(e) => setCustomProjectName(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 h-9 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-slate-700/50 border-slate-600 text-slate-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={(selectedSiteIds.size === 0 && !customSiteName.trim()) || adding}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add {selectedSiteIds.size > 0 ? `(${selectedSiteIds.size}${customSiteName.trim() ? ' + 1' : ''})` : customSiteName.trim() ? '(1)' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Main Accounts Page ───────── */

export function AccountsPage() {
  const [subView, setSubView] = useState<SubView>('accounts');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [sites, setSites] = useState<SiteData[]>([]);
  const [expandedSiteIds, setExpandedSiteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [grandTotal, setGrandTotal] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ empId: string; empName: string } | null>(null);
  const [addSiteDialogOpen, setAddSiteDialogOpen] = useState(false);

  // Year options: current year and 5 years back
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, []);

  const monthStr = getMonthString(selectedYear, selectedMonth);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/accounts?month=${monthStr}&year=${selectedYear}`);
      const json = await res.json();
      if (json.success) {
        const siteResults: SiteResult[] = json.data.sites || [];
        const mappedSites: SiteData[] = siteResults.map((s) => ({
          id: s.site.id,
          name: s.site.name,
          clientName: s.site.clientName,
          projectName: s.site.projectName,
          isActive: true,
          employeeCount: s.employeeCount,
          totalHours: s.totalHours,
          totalSalary: s.totalSalary,
          totalDeductions: s.totalDeductions,
          totalAdvances: s.totalAdvances,
          totalBalanceSalary: s.totalBalanceSalary,
          employees: s.employees.map((e, idx) => ({
            salaryRecordId: e.salaryRecord?.id || null,
            empId: e.empId,
            empName: e.empName,
            nationality: e.salaryRecord?.nationality || e.nationality,
            trade: e.salaryRecord?.trade || e.trade,
            employeeCode: e.salaryRecord?.employeeCode || e.employeeCode,
            isTeamLeader: e.isTeamLeader,
            isSupervisor: e.isSupervisor || false,
            totalHours: e.salaryRecord?.totalHours || 0,
            rtPerHour: e.salaryRecord?.rtPerHour || e.workingHours.calculatedRtPerHour || 2.5,
            totalSalary: e.salaryRecord?.totalSalary || 0,
            deduction: e.salaryRecord?.deduction || 0,
            advance: e.salaryRecord?.advance || 0,
            balanceSalary: e.salaryRecord?.balanceSalary || 0,
            isPaid: e.salaryRecord?.isPaid || false,
            slNo: e.salaryRecord?.slNo || idx + 1,
            totalWorkingHours: e.workingHours.totalWorkingHours,
            calculatedRtPerHour: e.workingHours.calculatedRtPerHour,
            rateTier: e.rateTier || 'standard',
          })),
        }));
        setSites(mappedSites);
        setGrandTotal(json.data.grandTotals?.totalSalary || 0);
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to load accounts', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load accounts data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [monthStr, selectedYear]);

  useEffect(() => {
    if (subView === 'accounts') {
      fetchAccounts();
    }
  }, [fetchAccounts, subView]);

  const toggleSiteExpand = (siteId: string) => {
    setExpandedSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  };

  const handleViewEmployee = (empId: string, empName: string) => {
    setSelectedEmployee({ empId, empName });
    setSubView('employee-detail');
  };

  /* ── Employee Detail Sub-View ── */
  if (subView === 'employee-detail' && selectedEmployee) {
    return (
      <div className="min-h-screen bg-slate-900 p-4 sm:p-6">
        <EmployeeDetailPage
          empId={selectedEmployee.empId}
          empName={selectedEmployee.empName}
          onBack={() => {
            setSubView('working-hours');
            setSelectedEmployee(null);
          }}
        />
      </div>
    );
  }

  /* ── Working Hours Sub-View ── */
  if (subView === 'working-hours') {
    return (
      <div className="min-h-screen bg-slate-900 p-4 sm:p-6">
        <ManageWorkingHoursPage
          onBack={() => setSubView('accounts')}
          onViewEmployee={handleViewEmployee}
        />
      </div>
    );
  }

  /* ── Main Accounts View ── */
  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Accounts Management
                  {!loading && sites.length > 0 && (
                    <span className="text-slate-400 font-normal"> ({sites.length} Site{sites.length !== 1 ? 's' : ''})</span>
                  )}
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">
                  Manage salary sheets and employee hours
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-sm px-3 py-1.5 font-semibold">
              <CircleDollarSign className="h-4 w-4 mr-1.5" />
              Grand Total: {formatNumber(grandTotal)} AED
            </Badge>
            <Button
              onClick={() => setEditMode(!editMode)}
              className={cn(
                'gap-2',
                editMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              )}
            >
              {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {editMode ? 'Exit Edit' : 'Edit'}
            </Button>
            <Button
              onClick={() => setSubView('working-hours')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Clock className="h-4 w-4" />
              Manage Employee Hours
            </Button>
            <Button
              onClick={() => setAddSiteDialogOpen(true)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 gap-2"
            >
              <Building2 className="h-4 w-4" />
              Add New Sites
            </Button>
          </div>
        </div>

        {/* Year Selector & Month Row */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Year Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <Label className="text-sm text-slate-400">Year:</Label>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
                >
                  <SelectTrigger className="w-[100px] bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-white focus:bg-slate-700 focus:text-white">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator orientation="vertical" className="hidden sm:block h-8 bg-slate-700/50" />

              {/* Month Buttons - only up to current month */}
              <div className="flex flex-wrap gap-1.5">
                {MONTH_SHORT.map((m, i) => {
                  const available = isMonthAvailable(selectedYear, i);
                  return (
                    <Button
                      key={m}
                      variant="ghost"
                      size="sm"
                      onClick={() => available && setSelectedMonth(i)}
                      disabled={!available}
                      className={cn(
                        'h-8 px-3 text-xs font-semibold rounded-md transition-all',
                        selectedMonth === i
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20'
                          : available
                            ? 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                            : 'bg-slate-800/20 text-slate-600 cursor-not-allowed opacity-50'
                      )}
                    >
                      {m}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sites List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 bg-slate-800 rounded-xl" />
            ))}
          </div>
        ) : sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-700/50 mb-4">
              <Building2 className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">No sites found</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              No sites with employees for {MONTH_FULL[selectedMonth]} {selectedYear}. Make sure employees are assigned to sites.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => {
              const isExpanded = expandedSiteIds.has(site.id);
              return (
                <Card
                  key={site.id}
                  className="bg-slate-800/50 border-slate-700/50 overflow-hidden"
                >
                  {/* Collapsed Site Row */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
                    onClick={() => toggleSiteExpand(site.id)}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
                      <Building2 className="h-4.5 w-4.5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white truncate">{site.name}</h3>
                        {site.clientName && (
                          <span className="text-xs text-slate-500 truncate">({site.clientName})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users className="h-3.5 w-3.5" />
                        {site.employeeCount}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        {formatNumber(site.totalHours)}h
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatNumber(site.totalSalary)} AED
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Site Salary Sheet */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 p-4 bg-slate-900/30">
                      <SiteSalarySheet
                        site={site}
                        month={selectedMonth}
                        year={selectedYear}
                        onRefresh={fetchAccounts}
                        editMode={editMode}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add New Sites Dialog */}
      <AddNewSitesDialog
        open={addSiteDialogOpen}
        onOpenChange={setAddSiteDialogOpen}
        month={selectedMonth}
        year={selectedYear}
        existingSiteIds={new Set(sites.map(s => s.id))}
        onAdded={fetchAccounts}
      />
    </div>
  );
}
