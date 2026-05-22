'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Search,
  Pencil,
  X,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
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

/* ───────── Main Component ───────── */

export function ConsolidatedSalarySheet() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [sites, setSites] = useState<SiteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mutable employee data per site (keyed by siteId)
  const [siteEmployees, setSiteEmployees] = useState<Record<string, EmployeeSalaryData[]>>({});

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, []);

  const monthStr = getMonthString(selectedYear, selectedMonth);

  const fetchData = useCallback(async () => {
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

        // Initialize mutable employee data
        const empMap: Record<string, EmployeeSalaryData[]> = {};
        for (const site of mappedSites) {
          empMap[site.id] = [...site.employees];
        }
        setSiteEmployees(empMap);
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to load data', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load consolidated salary data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [monthStr, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset edit mode when month/year changes
  useEffect(() => {
    setEditMode(false);
  }, [selectedMonth, selectedYear]);

  // ── Cell change handler with sync for split rows ──
  const handleCellChange = (siteId: string, index: number, field: string, value: number | boolean | string) => {
    setSiteEmployees((prev) => {
      const employees = prev[siteId] || [];
      const currentEmp = employees[index];
      if (!currentEmp) return prev;

      const skipSyncFields = new Set(['totalHours', 'rtPerHour', 'totalSalary', 'balanceSalary', 'rateTier', 'salaryRecordId']);

      const updated = employees.map((emp, i) => {
        if (i === index) {
          const u = { ...emp, [field]: value };
          if (field === 'totalHours' || field === 'rtPerHour' || field === 'deduction' || field === 'advance') {
            u.totalSalary = u.totalHours * u.rtPerHour;
            u.balanceSalary = u.totalSalary - u.deduction - u.advance;
          }
          return u;
        }

        // Sync shared fields to sibling split row
        if (!skipSyncFields.has(field) && emp.empId === currentEmp.empId && emp.rateTier !== currentEmp.rateTier) {
          const u = { ...emp, [field]: value };
          if (field === 'deduction' || field === 'advance') {
            u.totalSalary = u.totalHours * u.rtPerHour;
            u.balanceSalary = u.totalSalary - u.deduction - u.advance;
          }
          return u;
        }

        return emp;
      });

      return { ...prev, [siteId]: updated };
    });
  };

  const handlePaidToggle = (siteId: string, index: number, currentIsPaid: boolean) => {
    if (currentIsPaid && !editMode) return;
    handleCellChange(siteId, index, 'isPaid', !currentIsPaid);
  };

  const handleAddRow = (siteId: string) => {
    setSiteEmployees((prev) => {
      const employees = prev[siteId] || [];
      const newSlNo = employees.length + 1;
      return {
        ...prev,
        [siteId]: [
          ...employees,
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
        ],
      };
    });
  };

  const handleDeleteRow = (siteId: string, index: number) => {
    setSiteEmployees((prev) => {
      const employees = prev[siteId] || [];
      const updated = employees.filter((_, i) => i !== index);
      return { ...prev, [siteId]: updated.map((emp, i) => ({ ...emp, slNo: i + 1 })) };
    });
  };

  // ── Save all changes ──
  const handleSave = async () => {
    try {
      setSaving(true);
      let totalSaved = 0;
      let totalFailed = 0;

      for (const site of sites) {
        const employees = siteEmployees[site.id] || [];
        for (const emp of employees) {
          try {
            const body = {
              empId: emp.empId,
              empName: emp.empName,
              siteId: site.id,
              siteName: site.name,
              month: monthStr,
              year: selectedYear,
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
              updateWorkingHours: true,
            };

            const res = emp.salaryRecordId
              ? await fetch('/api/accounts/salary', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: emp.salaryRecordId, ...body }),
                })
              : await fetch('/api/accounts/salary', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });

            const json = await res.json();
            if (json.success) {
              totalSaved++;
            } else {
              totalFailed++;
            }
          } catch {
            totalFailed++;
          }
        }
      }

      if (totalFailed > 0) {
        toast({ title: 'Partial Save', description: `${totalSaved} saved, ${totalFailed} failed.`, variant: 'destructive' });
      } else {
        toast({ title: 'Saved', description: `All ${totalSaved} salary records saved successfully.` });
      }
      setEditMode(false);
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'Failed to save salary records', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Search highlight logic ──
  const searchLower = searchQuery.toLowerCase().trim();

  const isRowHighlighted = (emp: EmployeeSalaryData): boolean => {
    if (!searchLower) return false;
    return (
      emp.empName.toLowerCase().includes(searchLower) ||
      emp.employeeCode.toLowerCase().includes(searchLower)
    );
  };

  const tradeDisplay = (emp: EmployeeSalaryData) => {
    let trade = emp.trade;
    if (emp.isSupervisor) trade = `${trade}/SUPERVISOR`;
    if (emp.isTeamLeader) trade = `${trade}/TL`;
    return trade;
  };

  // Grand totals
  const grandTotals = useMemo(() => {
    let totalHours = 0;
    let totalSalary = 0;
    let totalDeductions = 0;
    let totalAdvances = 0;
    let totalBalance = 0;
    let totalEmployees = 0;

    for (const site of sites) {
      const employees = siteEmployees[site.id] || site.employees;
      totalHours += employees.reduce((s, e) => s + e.totalHours, 0);
      totalSalary += employees.reduce((s, e) => s + e.totalSalary, 0);
      totalDeductions += employees.reduce((s, e) => s + e.deduction, 0);
      totalAdvances += employees.reduce((s, e) => s + e.advance, 0);
      totalBalance += employees.reduce((s, e) => s + e.balanceSalary, 0);
      // Count unique empIds
      const uniqueIds = new Set(employees.map(e => e.empId));
      totalEmployees += uniqueIds.size;
    }

    return { totalHours, totalSalary, totalDeductions, totalAdvances, totalBalance, totalEmployees };
  }, [sites, siteEmployees]);

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
                  Consolidated Salary Sheet
                  {!loading && sites.length > 0 && (
                    <span className="text-slate-400 font-normal"> ({sites.length} Site{sites.length !== 1 ? 's' : ''})</span>
                  )}
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">
                  All sites salary data in one view • {MONTH_FULL[selectedMonth]} {selectedYear}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-sm px-3 py-1.5 font-semibold">
              Grand Total: {formatNumber(grandTotals.totalSalary)} AED
            </Badge>
            {editMode && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save All
              </Button>
            )}
            <Button
              onClick={() => {
                if (editMode) {
                  // Revert changes
                  const empMap: Record<string, EmployeeSalaryData[]> = {};
                  for (const site of sites) {
                    empMap[site.id] = [...site.employees];
                  }
                  setSiteEmployees(empMap);
                }
                setEditMode(!editMode);
              }}
              className={cn(
                'gap-2',
                editMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              )}
            >
              {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {editMode ? 'Cancel Edit' : 'Edit'}
            </Button>
          </div>
        </div>

        {/* Year Selector, Month Buttons, and Search */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
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

              {/* Global Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search employee name or ID to highlight..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-500 hover:text-white"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-8 bg-slate-800 w-48" />
                <Skeleton className="h-40 bg-slate-800 rounded-lg" />
              </div>
            ))}
          </div>
        ) : sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-700/50 mb-4">
              <FileSpreadsheet className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">No sites found</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              No sites with employees for {MONTH_FULL[selectedMonth]} {selectedYear}.
            </p>
          </div>
        ) : (
          /* ── Consolidated Table (Google Sheets style) ── */
          <div className="space-y-0">
            {sites.map((site) => {
              const employees = siteEmployees[site.id] || site.employees;
              const siteTotalHours = employees.reduce((s, e) => s + e.totalHours, 0);
              const siteTotalSalary = employees.reduce((s, e) => s + e.totalSalary, 0);

              return (
                <div key={site.id} className="mb-1">
                  {/* Site Header Row */}
                  <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-t-lg px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-300">{site.name}</span>
                      {site.clientName && (
                        <span className="text-xs text-slate-400">({site.clientName})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-400">
                        Employees: <span className="text-white font-semibold">{new Set(employees.map(e => e.empId)).size}</span>
                      </span>
                      <span className="text-slate-400">
                        Hours: <span className="text-white font-semibold">{formatNumber(siteTotalHours)}</span>
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        {formatNumber(siteTotalSalary)} AED
                      </span>
                    </div>
                  </div>

                  {/* Salary Table */}
                  <div className="overflow-x-auto border border-t-0 border-slate-700/50 rounded-b-lg">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-800/90 border-b border-slate-700/50">
                          <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 w-10 text-center">SL</th>
                          <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 min-w-[70px]">NATIONALITY</th>
                          <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 min-w-[100px]">NAME</th>
                          <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 min-w-[80px]">TRADE</th>
                          <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 min-w-[70px]">EMP ID</th>
                          <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 w-16 text-right">HOURS</th>
                          <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 w-16 text-right">RT/HR</th>
                          <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 w-20 text-right">TOTAL SALARY</th>
                          <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 w-16 text-right">DEDUCT</th>
                          <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 w-16 text-right">ADVANCE</th>
                          <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 w-20 text-right">BALANCE</th>
                          <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 w-14 text-center">PAID</th>
                          {editMode && <th className="text-slate-400 font-semibold text-[11px] py-2 px-2 w-8"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {employees.length === 0 ? (
                          <tr>
                            <td colSpan={editMode ? 13 : 12} className="text-center text-slate-500 py-6 text-xs">
                              No employees for this site.
                            </td>
                          </tr>
                        ) : (
                          employees.map((emp, index) => {
                            const highlighted = isRowHighlighted(emp);
                            return (
                              <tr
                                key={`${emp.empId}-${emp.rateTier}-${index}`}
                                className={cn(
                                  'border-b border-slate-700/30 transition-colors',
                                  highlighted && 'bg-yellow-500/15 ring-1 ring-yellow-500/30',
                                  !highlighted && emp.isPaid && 'bg-emerald-500/5',
                                  !highlighted && !emp.isPaid && emp.rateTier === 'premium' && 'bg-amber-500/5',
                                  editMode && !highlighted && 'hover:bg-slate-700/20',
                                )}
                              >
                                <td className="text-slate-500 text-[11px] text-center font-mono py-1.5 px-2">{emp.slNo}</td>
                                <td className="py-1.5 px-2">
                                  {editMode ? (
                                    <Input
                                      value={emp.nationality}
                                      onChange={(e) => handleCellChange(site.id, index, 'nationality', e.target.value)}
                                      className="h-6 text-[11px] bg-slate-900/80 border-slate-600/50 text-white min-w-[60px] py-0"
                                    />
                                  ) : (
                                    <span className="text-[11px] text-slate-300">{emp.nationality || '-'}</span>
                                  )}
                                </td>
                                <td className="py-1.5 px-2">
                                  {editMode ? (
                                    <Input
                                      value={emp.empName}
                                      onChange={(e) => handleCellChange(site.id, index, 'empName', e.target.value)}
                                      className="h-6 text-[11px] bg-slate-900/80 border-slate-600/50 text-white min-w-[90px] py-0"
                                    />
                                  ) : (
                                    <span className={cn('text-[11px] font-medium', highlighted ? 'text-yellow-300' : 'text-white')}>{emp.empName || '-'}</span>
                                  )}
                                </td>
                                <td className="py-1.5 px-2">
                                  {editMode ? (
                                    <Input
                                      value={emp.trade}
                                      onChange={(e) => handleCellChange(site.id, index, 'trade', e.target.value)}
                                      className="h-6 text-[11px] bg-slate-900/80 border-slate-600/50 text-white min-w-[70px] py-0"
                                    />
                                  ) : (
                                    <span className="text-[11px] text-slate-300">{tradeDisplay(emp)}</span>
                                  )}
                                </td>
                                <td className="py-1.5 px-2">
                                  {editMode ? (
                                    <Input
                                      value={emp.employeeCode}
                                      onChange={(e) => handleCellChange(site.id, index, 'employeeCode', e.target.value)}
                                      className="h-6 text-[11px] bg-slate-900/80 border-slate-600/50 text-white font-mono min-w-[65px] py-0"
                                    />
                                  ) : (
                                    <span className={cn('text-[11px] font-mono', highlighted ? 'text-yellow-300' : 'text-slate-300')}>{emp.employeeCode || '-'}</span>
                                  )}
                                </td>
                                <td className="py-1.5 px-2 text-right">
                                  {editMode ? (
                                    <Input
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={emp.totalHours}
                                      onChange={(e) => handleCellChange(site.id, index, 'totalHours', parseFloat(e.target.value) || 0)}
                                      className="h-6 text-[11px] bg-slate-900/80 border-slate-600/50 text-white text-right w-[60px] py-0"
                                    />
                                  ) : (
                                    <span className={cn('text-[11px]', emp.totalHours > 0 ? 'text-white font-medium' : 'text-slate-500')}>
                                      {emp.totalHours || '-'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 px-2 text-right">
                                  {editMode ? (
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.5}
                                      value={emp.rtPerHour}
                                      onChange={(e) => handleCellChange(site.id, index, 'rtPerHour', parseFloat(e.target.value) || 0)}
                                      className="h-6 text-[11px] bg-slate-900/80 border-slate-600/50 text-white text-right w-[60px] py-0"
                                    />
                                  ) : (
                                    <span className="text-[11px] text-white">{emp.rtPerHour}</span>
                                  )}
                                </td>
                                <td className={cn('text-[11px] text-right font-medium', emp.totalSalary > 0 ? 'text-white' : 'text-slate-500')}>
                                  {formatNumber(emp.totalSalary)}
                                </td>
                                <td className="py-1.5 px-2 text-right">
                                  {editMode ? (
                                    <Input
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={emp.deduction}
                                      onChange={(e) => handleCellChange(site.id, index, 'deduction', parseFloat(e.target.value) || 0)}
                                      className="h-6 text-[11px] bg-slate-900/80 border-slate-600/50 text-white text-right w-[60px] py-0"
                                    />
                                  ) : (
                                    <span className={cn('text-[11px]', emp.deduction > 0 ? 'text-slate-300' : 'text-slate-600')}>
                                      {emp.deduction || '-'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 px-2 text-right">
                                  {editMode ? (
                                    <Input
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={emp.advance}
                                      onChange={(e) => handleCellChange(site.id, index, 'advance', parseFloat(e.target.value) || 0)}
                                      className="h-6 text-[11px] bg-slate-900/80 border-slate-600/50 text-white text-right w-[60px] py-0"
                                    />
                                  ) : (
                                    <span className={cn('text-[11px]', emp.advance > 0 ? 'text-slate-300' : 'text-slate-600')}>
                                      {emp.advance || '-'}
                                    </span>
                                  )}
                                </td>
                                <td className={cn(
                                  'text-[11px] text-right font-semibold',
                                  emp.isPaid ? 'text-emerald-400' : emp.balanceSalary > 0 ? 'text-amber-400' : 'text-slate-400'
                                )}>
                                  {formatNumber(emp.balanceSalary)}
                                </td>
                                <td className="text-center py-1.5 px-2">
                                  <button
                                    onClick={() => handlePaidToggle(site.id, index, emp.isPaid)}
                                    className={cn(
                                      'inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors',
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
                                </td>
                                {editMode && (
                                  <td className="py-1.5 px-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                      onClick={() => handleDeleteRow(site.id, index)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {/* Site Total Footer */}
                      <tfoot>
                        <tr className="bg-slate-900/60 border-t border-slate-700/50">
                          <td colSpan={5} className="text-[11px] text-slate-400 font-bold py-2 px-2">
                            Site Total
                          </td>
                          <td className="text-[11px] text-white font-bold py-2 px-2 text-right">
                            {formatNumber(employees.reduce((s, e) => s + e.totalHours, 0))}
                          </td>
                          <td className="py-2 px-2"></td>
                          <td className="text-[11px] text-emerald-400 font-bold py-2 px-2 text-right">
                            {formatNumber(employees.reduce((s, e) => s + e.totalSalary, 0))} AED
                          </td>
                          <td className="text-[11px] text-slate-400 font-bold py-2 px-2 text-right">
                            {formatNumber(employees.reduce((s, e) => s + e.deduction, 0))}
                          </td>
                          <td className="text-[11px] text-slate-400 font-bold py-2 px-2 text-right">
                            {formatNumber(employees.reduce((s, e) => s + e.advance, 0))}
                          </td>
                          <td className="text-[11px] text-amber-400 font-bold py-2 px-2 text-right">
                            {formatNumber(employees.reduce((s, e) => s + e.balanceSalary, 0))}
                          </td>
                          <td className="py-2 px-2"></td>
                          {editMode && <td className="py-2 px-2"></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Add Row Button (only in edit mode) */}
                  {editMode && (
                    <div className="mt-1 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddRow(site.id)}
                        className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white gap-1 h-7 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                        Add Row to {site.name}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Grand Total Bar */}
            <div className="mt-4 bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 text-xs">
                <div>
                  <div className="text-slate-500 mb-0.5">Sites</div>
                  <div className="text-white font-bold text-sm">{sites.length}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Employees</div>
                  <div className="text-white font-bold text-sm">{grandTotals.totalEmployees}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Total Hours</div>
                  <div className="text-white font-bold text-sm">{formatNumber(grandTotals.totalHours)}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Total Salary</div>
                  <div className="text-emerald-400 font-bold text-sm">{formatNumber(grandTotals.totalSalary)} AED</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Total Deductions</div>
                  <div className="text-slate-400 font-bold text-sm">{formatNumber(grandTotals.totalDeductions)} AED</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Total Balance</div>
                  <div className="text-amber-400 font-bold text-sm">{formatNumber(grandTotals.totalBalance)} AED</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
