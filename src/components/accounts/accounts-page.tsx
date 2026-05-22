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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
    currentSite: string | null;
  };
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

type SubView = 'accounts' | 'working-hours';

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

/* ───────── Manage Employee Hours Sub-View ───────── */

function ManageWorkingHoursPage({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<WorkingHoursData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

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
        // Recalculate rtPerHour if not custom
        if (!r.isCustom) {
          const isTL = r.employee.isTeamLeader;
          if (value >= 1000) {
            updated.rtPerHour = isTL ? 5.5 : 5.0;
          } else {
            updated.rtPerHour = isTL ? 3.0 : 2.5;
          }
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
          // Recalculate
          const isTL = r.employee.isTeamLeader;
          const hrs = r.totalWorkingHours;
          if (hrs >= 1000) {
            updated.rtPerHour = isTL ? 5.5 : 5.0;
          } else {
            updated.rtPerHour = isTL ? 3.0 : 2.5;
          }
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
              Edit total working hours and rate per hour for employees.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.empId} className="border-slate-700/50 hover:bg-slate-700/30">
                        <TableCell className="text-white text-sm font-medium">{record.empName}</TableCell>
                        <TableCell className="text-slate-300 text-sm font-mono">{record.employee.employeeId}</TableCell>
                        <TableCell className="text-slate-300 text-sm">{record.employee.trade || '-'}</TableCell>
                        <TableCell className="text-slate-300 text-sm">{record.employee.nationality || '-'}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={record.totalWorkingHours}
                            onChange={(e) => handleWorkingHoursChange(record.empId, parseFloat(e.target.value) || 0)}
                            className="w-24 h-8 text-sm bg-slate-900 border-slate-600 text-white text-right"
                          />
                        </TableCell>
                        <TableCell>
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
                        <TableCell>
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
                <li>Team Leader bonus: <span className="text-white font-medium">+0.5 AED/hr</span> (3.0 basic, 5.5 after 1000 hrs)</li>
                <li>Enable &quot;Custom Rate&quot; to manually override the rate</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── Site Salary Sheet ───────── */

function SiteSalarySheet({
  site,
  month,
  year,
  onRefresh,
}: {
  site: SiteData;
  month: number;
  year: number;
  onRefresh: () => void;
}) {
  const [employees, setEmployees] = useState<EmployeeSalaryData[]>(site.employees);
  const [saving, setSaving] = useState(false);

  // Sync employees when site prop changes
  useEffect(() => {
    setEmployees(site.employees);
  }, [site.employees]);

  const handleCellChange = (empId: string, field: string, value: number | boolean) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.empId !== empId) return emp;
        const updated = { ...emp, [field]: value };

        // Auto-calculate totals
        if (field === 'totalHours' || field === 'rtPerHour' || field === 'deduction' || field === 'advance') {
          updated.totalSalary = updated.totalHours * updated.rtPerHour;
          updated.balanceSalary = updated.totalSalary - updated.deduction - updated.advance;
        }
        if (field === 'isPaid') {
          // Just toggle
        }

        return updated;
      })
    );
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
          };

          if (emp.salaryRecordId) {
            // Update existing
            return fetch('/api/accounts/salary', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: emp.salaryRecordId, ...body }),
            });
          } else {
            // Create new
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
    if (emp.isSupervisor) return `${emp.trade}/SUPERVISOR`;
    if (emp.isTeamLeader) return `${emp.trade}/TL`;
    return emp.trade;
  };

  return (
    <div className="space-y-3">
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
              <TableHead className="text-slate-300 font-semibold text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp, index) => (
              <TableRow
                key={emp.empId}
                className={cn(
                  'border-slate-700/50 hover:bg-slate-700/20',
                  emp.isPaid && 'bg-emerald-500/5'
                )}
              >
                <TableCell className="text-slate-400 text-xs text-center font-mono">{emp.slNo}</TableCell>
                <TableCell>
                  <Input
                    value={emp.nationality}
                    onChange={(e) =>
                      setEmployees((prev) =>
                        prev.map((em, i) => (i === index ? { ...em, nationality: e.target.value } : em))
                      )
                    }
                    className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white min-w-[70px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={emp.empName}
                    onChange={(e) =>
                      setEmployees((prev) =>
                        prev.map((em, i) => (i === index ? { ...em, empName: e.target.value } : em))
                      )
                    }
                    className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white min-w-[110px]"
                  />
                </TableCell>
                <TableCell className="text-xs text-slate-300">
                  {tradeDisplay(emp)}
                </TableCell>
                <TableCell>
                  <Input
                    value={emp.employeeCode}
                    onChange={(e) =>
                      setEmployees((prev) =>
                        prev.map((em, i) => (i === index ? { ...em, employeeCode: e.target.value } : em))
                      )
                    }
                    className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white font-mono min-w-[75px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={emp.totalHours}
                    onChange={(e) => handleCellChange(emp.empId, 'totalHours', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white text-right w-[70px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={emp.rtPerHour}
                    onChange={(e) => handleCellChange(emp.empId, 'rtPerHour', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white text-right w-[70px]"
                  />
                </TableCell>
                <TableCell className={cn('text-xs text-right font-medium', emp.totalSalary > 0 ? 'text-white' : 'text-slate-500')}>
                  {formatNumber(emp.totalSalary)}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={emp.deduction}
                    onChange={(e) => handleCellChange(emp.empId, 'deduction', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white text-right w-[70px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={emp.advance}
                    onChange={(e) => handleCellChange(emp.empId, 'advance', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs bg-slate-900/80 border-slate-600/50 text-white text-right w-[70px]"
                  />
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
                    onClick={() => handleCellChange(emp.empId, 'isPaid', !emp.isPaid)}
                    className={cn(
                      'inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer',
                      emp.isPaid
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-slate-700/50 text-slate-500 border border-slate-600/50 hover:bg-slate-600/50 hover:text-slate-400'
                    )}
                  >
                    {emp.isPaid ? 'PAID' : 'UNPAID'}
                  </button>
                </TableCell>
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
              </TableRow>
            ))}

            {/* Footer Row */}
            <TableRow className="border-slate-700 bg-slate-800/60 hover:bg-transparent font-semibold">
              <TableCell colSpan={5} className="text-xs text-slate-300 text-right pr-4">
                TOTAL
              </TableCell>
              <TableCell className="text-xs text-white text-right font-bold">
                {formatNumber(sumTotalHours)}
              </TableCell>
              <TableCell></TableCell>
              <TableCell className="text-xs text-white text-right font-bold">
                {formatNumber(sumTotalSalary)}
              </TableCell>
              <TableCell className="text-xs text-slate-400 text-right">
                {formatNumber(sumDeduction)}
              </TableCell>
              <TableCell className="text-xs text-slate-400 text-right">
                {formatNumber(sumAdvance)}
              </TableCell>
              <TableCell className="text-xs text-emerald-400 text-right font-bold">
                {formatNumber(sumBalanceSalary)}
              </TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Action Buttons */}
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
    </div>
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
    fetchAccounts();
  }, [fetchAccounts]);

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

  /* ── Working Hours Sub-View ── */
  if (subView === 'working-hours') {
    return (
      <div className="min-h-screen bg-slate-900 p-4 sm:p-6">
        <ManageWorkingHoursPage onBack={() => setSubView('accounts')} />
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
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-sm px-3 py-1.5 font-semibold">
              <CircleDollarSign className="h-4 w-4 mr-1.5" />
              Grand Total: {formatNumber(grandTotal)} AED
            </Badge>
            <Button
              onClick={() => setSubView('working-hours')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Clock className="h-4 w-4" />
              Manage Employee Hours
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

              {/* Month Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {MONTH_SHORT.map((m, i) => (
                  <Button
                    key={m}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMonth(i)}
                    className={cn(
                      'h-8 px-3 text-xs font-semibold rounded-md transition-all',
                      selectedMonth === i
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    )}
                  >
                    {m}
                  </Button>
                ))}
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
                        <span className="font-medium text-white">{site.employeeCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-medium text-white">{formatNumber(site.totalHours)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <CircleDollarSign className="h-3.5 w-3.5" />
                        <span className="font-semibold text-emerald-400">{formatNumber(site.totalSalary)}</span>
                      </div>
                      <div className="ml-1">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Salary Sheet */}
                  {isExpanded && (
                    <div
                      className="border-t border-slate-700/50 bg-slate-800/30 px-4 pb-4 pt-4"
                      style={{
                        animation: 'accordion-down 0.2s ease-out',
                      }}
                    >
                      <SiteSalarySheet
                        site={site}
                        month={selectedMonth}
                        year={selectedYear}
                        onRefresh={fetchAccounts}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Site button */}
        {!loading && sites.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              className="bg-slate-800/50 border-dashed border-slate-600 text-slate-400 hover:bg-slate-700/50 hover:text-white hover:border-slate-500 gap-2"
              onClick={() => {
                toast({
                  title: 'Add Site',
                  description: 'Assign employees to a site from the Sites page to include it in accounts.',
                });
              }}
            >
              <Plus className="h-4 w-4" />
              Add Site
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
