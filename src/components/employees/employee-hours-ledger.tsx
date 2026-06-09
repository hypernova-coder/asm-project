'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Clock,
  Crown,
  ShieldCheck,
  User,
  Loader2,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────────────────────

interface EmployeeHoursLedgerProps {
  employeeId: string;
  onBack?: () => void;
}

interface MonthlyDataPoint {
  month: string;
  totalHours: number;
  cumulativeHours: number;
  rtPerHour: number;
  recordId: string | null;
}

interface EmployeeInfo {
  isTeamLeader: boolean;
  isSupervisor: boolean;
  totalWorkingHours: number;
  rtPerHour: number;
  isCustom: boolean;
  hoursThreshold: number;
  previousCumulativeHours: number;
  previousYearHours: number;
  customHourlyRate: number | null;
}

interface EmployeeDetails {
  id: string;
  fullName: string;
  employeeId: string;
  nationality: string | null;
  trade: string | null;
  isTeamLeader: boolean;
  isSupervisor: boolean;
  customHourlyRate: number | null;
  currentSite: string | null;
  companyName: string | null;
}

// ─── Month name helper ──────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const monthIndex = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

function formatMonthShort(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const monthIndex = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[monthIndex].slice(0, 3)} ${year}`;
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`;
}

// ─── Rate Tier helper ───────────────────────────────────────────────────

function getRateTier(
  cumulativeHours: number,
  totalHours: number,
  prevCumulative: number,
  threshold: number,
  isCustom: boolean,
  customRate: number | null
): { tier: string; color: string } {
  if (isCustom || customRate !== null) {
    return { tier: 'Custom', color: 'violet' };
  }
  if (prevCumulative >= threshold) {
    return { tier: 'Premium', color: 'emerald' };
  }
  if (cumulativeHours >= threshold) {
    return { tier: 'Split', color: 'amber' };
  }
  return { tier: 'Standard', color: 'slate' };
}

// ─── Main Component ─────────────────────────────────────────────────────

export function EmployeeHoursLedger({ employeeId, onBack }: EmployeeHoursLedgerProps) {
  const { toast } = useToast();

  // ── State ──
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customRateInput, setCustomRateInput] = useState('');
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);

  // ── Fetch employee details ──
  const fetchEmployeeDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/employees/${employeeId}`);
      const json = await res.json();
      if (json.success) {
        const emp = json.data.employee;
        setEmployeeDetails({
          id: emp.id,
          fullName: emp.fullName,
          employeeId: emp.employeeId,
          nationality: emp.nationality,
          trade: emp.trade || emp.position,
          isTeamLeader: emp.isTeamLeader,
          isSupervisor: emp.isSupervisor,
          customHourlyRate: emp.customHourlyRate,
          currentSite: emp.currentSite,
          companyName: emp.companyName,
        });
        if (emp.customHourlyRate != null) {
          setCustomRateInput(String(emp.customHourlyRate));
        }
      }
    } catch {
      // silent - will show in monthly data fetch
    }
  }, [employeeId]);

  // ── Fetch monthly data ──
  const fetchMonthlyData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/accounts/employee-monthly?empId=${employeeId}&year=${selectedYear}`);
      const json = await res.json();
      if (json.success) {
        setMonthlyData(json.data.monthlyData);
        setEmployeeInfo(json.data.employeeInfo);
        if (json.data.employeeInfo.customHourlyRate != null) {
          setCustomRateInput(String(json.data.employeeInfo.customHourlyRate));
        } else {
          setCustomRateInput('');
        }
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to load monthly data', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch monthly data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, selectedYear, toast]);

  // ── Effects ──
  useEffect(() => {
    fetchEmployeeDetails();
  }, [fetchEmployeeDetails]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  // ── Available years ──
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear + 1; y >= currentYear - 5; y--) {
      years.push(y);
    }
    return years;
  }, []);

  // ── Threshold crossing detection ──
  const thresholdCrossMonth = useMemo(() => {
    if (!employeeInfo) return null;
    const threshold = employeeInfo.hoursThreshold;
    for (let i = 0; i < monthlyData.length; i++) {
      const prev = i > 0 ? monthlyData[i - 1].cumulativeHours : employeeInfo.previousCumulativeHours;
      if (prev < threshold && monthlyData[i].cumulativeHours >= threshold && monthlyData[i].totalHours > 0) {
        return monthlyData[i].month;
      }
    }
    return null;
  }, [monthlyData, employeeInfo]);

  // ── Milestone progress ──
  const milestoneProgress = useMemo(() => {
    if (!employeeInfo) return { percent: 0, hoursWorked: 0, threshold: 1000, remaining: 1000, crossed: false };
    const threshold = employeeInfo.hoursThreshold;
    const hoursWorked = employeeInfo.totalWorkingHours;
    const percent = Math.min((hoursWorked / threshold) * 100, 100);
    const remaining = Math.max(threshold - hoursWorked, 0);
    const crossed = hoursWorked >= threshold;
    return { percent, hoursWorked, threshold, remaining, crossed };
  }, [employeeInfo]);

  // ── Progress color ──
  const progressColor = useMemo(() => {
    if (milestoneProgress.crossed) return 'red';
    if (milestoneProgress.percent >= 80) return 'amber';
    return 'green';
  }, [milestoneProgress]);

  // ── Yearly totals ──
  const yearlyTotals = useMemo(() => {
    const totalHours = monthlyData.reduce((sum, m) => sum + m.totalHours, 0);
    const totalSalary = monthlyData.reduce((sum, m) => sum + m.totalHours * m.rtPerHour, 0);
    return { totalHours, totalSalary };
  }, [monthlyData]);

  // ── Custom Rate Save ──
  const handleSaveCustomRate = async () => {
    const rateValue = customRateInput.trim();
    const numericRate = rateValue ? parseFloat(rateValue) : null;

    if (numericRate !== null && (isNaN(numericRate) || numericRate <= 0)) {
      toast({ title: 'Invalid Rate', description: 'Please enter a valid positive number.', variant: 'destructive' });
      return;
    }

    setIsSavingRate(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customHourlyRate: numericRate }),
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: numericRate ? 'Custom Rate Set' : 'Custom Rate Cleared',
          description: numericRate
            ? `Custom rate set to ${numericRate} AED/hr`
            : 'Custom rate removed. Standard tier rates will apply.',
        });
        setIsEditingRate(false);
        // Refresh data
        await fetchMonthlyData();
        await fetchEmployeeDetails();
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to update rate', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save custom rate', variant: 'destructive' });
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleClearCustomRate = async () => {
    setIsSavingRate(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customHourlyRate: null }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Custom Rate Cleared', description: 'Standard tier rates will now apply.' });
        setCustomRateInput('');
        setIsEditingRate(false);
        await fetchMonthlyData();
        await fetchEmployeeDetails();
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to clear rate', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to clear custom rate', variant: 'destructive' });
    } finally {
      setIsSavingRate(false);
    }
  };

  // ── Role badge ──
  const roleBadge = useMemo(() => {
    if (!employeeInfo) return null;
    if (employeeInfo.isSupervisor) {
      return (
        <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/25 hover:bg-violet-500/20 gap-1">
          <ShieldCheck className="h-3 w-3" /> Supervisor
        </Badge>
      );
    }
    if (employeeInfo.isTeamLeader) {
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20 gap-1">
          <Crown className="h-3 w-3" /> Team Leader
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/25 hover:bg-slate-500/20 gap-1">
        <User className="h-3 w-3" /> Standard
      </Badge>
    );
  }, [employeeInfo]);

  // ── Loading state ──
  if (isLoading && !employeeInfo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg bg-slate-700" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 bg-slate-700" />
            <Skeleton className="h-4 w-32 bg-slate-700" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-xl bg-slate-700" />
        <Skeleton className="h-96 w-full rounded-xl bg-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0 text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
              {employeeDetails?.fullName || 'Employee'} Hours Ledger
            </h1>
            {roleBadge}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-slate-300">{employeeDetails?.employeeId || employeeId}</span>
            </span>
            {employeeDetails?.trade && (
              <span className="flex items-center gap-1.5">
                <span>{employeeDetails.trade}</span>
              </span>
            )}
            {employeeDetails?.nationality && (
              <span>{employeeDetails.nationality}</span>
            )}
            {employeeInfo && (
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                <span>
                  {employeeInfo.customHourlyRate != null
                    ? `${employeeInfo.customHourlyRate} AED/hr (Custom)`
                    : `${employeeInfo.rtPerHour} AED/hr`}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Milestone Progress Gauge ──────────────────────────── */}
      {employeeInfo && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Hours Milestone Progress
                  </h3>
                  <span className="text-xs text-slate-500">
                    Threshold: {milestoneProgress.threshold}h
                  </span>
                </div>

                <div className="relative h-4 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      progressColor === 'red'
                        ? 'bg-red-500'
                        : progressColor === 'amber'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${milestoneProgress.percent}%` }}
                  />
                  {/* Threshold marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/30"
                    style={{ left: '100%' }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400">
                    {milestoneProgress.hoursWorked.toLocaleString()}h worked
                  </span>
                  {milestoneProgress.crossed ? (
                    <span className="text-xs font-medium text-red-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Threshold crossed by {(milestoneProgress.hoursWorked - milestoneProgress.threshold).toLocaleString()}h
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {milestoneProgress.remaining.toLocaleString()}h remaining
                    </span>
                  )}
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex sm:flex-col gap-3 sm:gap-2 sm:pl-6 sm:border-l sm:border-slate-700/50">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{milestoneProgress.hoursWorked.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Total Hours</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-bold ${
                    milestoneProgress.crossed ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {milestoneProgress.crossed ? 'Premium' : 'Standard'}
                  </p>
                  <p className="text-xs text-slate-500">Current Tier</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Year Selector + Custom Rate ───────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-slate-400" />
          <Select
            value={String(selectedYear)}
            onValueChange={(val) => setSelectedYear(parseInt(val, 10))}
          >
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Rate Configuration */}
        <Card className="bg-slate-800/50 border-slate-700/50 w-full sm:w-auto">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Sparkles className="h-4 w-4 text-violet-400 shrink-0" />
              <span className="text-sm text-slate-300 whitespace-nowrap">Custom Rate:</span>

              {employeeInfo?.customHourlyRate != null && !isEditingRate && (
                <>
                  <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/25">
                    {employeeInfo.customHourlyRate} AED/hr
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingRate(true)}
                    className="h-7 text-xs text-slate-400 hover:text-white"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearCustomRate}
                    disabled={isSavingRate}
                    className="h-7 text-xs text-red-400 hover:text-red-300"
                  >
                    {isSavingRate ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Clear'}
                  </Button>
                </>
              )}

              {(employeeInfo?.customHourlyRate == null || isEditingRate) && (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="e.g. 4.0"
                      value={customRateInput}
                      onChange={(e) => setCustomRateInput(e.target.value)}
                      className="w-24 h-8 text-sm bg-slate-900 border-slate-600"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCustomRate();
                        if (e.key === 'Escape') {
                          setIsEditingRate(false);
                          setCustomRateInput(employeeInfo?.customHourlyRate != null ? String(employeeInfo.customHourlyRate) : '');
                        }
                      }}
                    />
                    <span className="text-xs text-slate-500">AED/hr</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSaveCustomRate}
                    disabled={isSavingRate}
                    className="h-8 text-xs bg-violet-600 hover:bg-violet-700"
                  >
                    {isSavingRate ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    Save
                  </Button>
                  {isEditingRate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditingRate(false);
                        setCustomRateInput(employeeInfo?.customHourlyRate != null ? String(employeeInfo.customHourlyRate) : '');
                      }}
                      className="h-8 text-xs text-slate-400"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Historical Data Table ─────────────────────────────── */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              Monthly Hours Breakdown — {selectedYear}
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>Year Total: <span className="text-white font-medium">{yearlyTotals.totalHours.toLocaleString()}h</span></span>
              <span>Est. Salary: <span className="text-white font-medium">{formatCurrency(yearlyTotals.totalSalary)}</span></span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-medium">Month</TableHead>
                  <TableHead className="text-slate-400 font-medium text-right">Total Hours</TableHead>
                  <TableHead className="text-slate-400 font-medium text-right">Cumulative Hours</TableHead>
                  <TableHead className="text-slate-400 font-medium text-right">Rate/Hr</TableHead>
                  <TableHead className="text-slate-400 font-medium text-center">Rate Tier</TableHead>
                  <TableHead className="text-slate-400 font-medium text-right">Est. Salary</TableHead>
                  <TableHead className="text-slate-400 font-medium text-center">Custom Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      No data available for {selectedYear}
                    </TableCell>
                  </TableRow>
                ) : (
                  monthlyData.map((row, index) => {
                    const prevCumulative = index > 0
                      ? monthlyData[index - 1].cumulativeHours
                      : (employeeInfo?.previousCumulativeHours || 0);
                    const isThresholdRow = thresholdCrossMonth === row.month;
                    const isCustomRate = employeeInfo?.customHourlyRate != null;
                    const rateTier = getRateTier(
                      row.cumulativeHours,
                      row.totalHours,
                      prevCumulative,
                      employeeInfo?.hoursThreshold || 1000,
                      isCustomRate,
                      employeeInfo?.customHourlyRate
                    );
                    const estimatedSalary = row.totalHours * row.rtPerHour;

                    return (
                      <TableRow
                        key={row.month}
                        className={`border-slate-700/30 ${
                          isThresholdRow
                            ? 'bg-red-500/10 hover:bg-red-500/15'
                            : row.totalHours > 0
                            ? 'hover:bg-slate-700/30'
                            : 'opacity-50'
                        }`}
                      >
                        <TableCell className="font-medium text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {formatMonthShort(row.month)}
                            {isThresholdRow && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0 h-5">
                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                1000h Crossed
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-200">
                          {row.totalHours > 0 ? row.totalHours.toFixed(1) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={
                            row.cumulativeHours >= (employeeInfo?.hoursThreshold || 1000)
                              ? 'text-red-400'
                              : 'text-slate-200'
                          }>
                            {row.cumulativeHours > 0 ? row.cumulativeHours.toFixed(1) : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-200">
                          {row.totalHours > 0 ? `${row.rtPerHour.toFixed(1)}` : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.totalHours > 0 ? (
                            <Badge
                              className={`text-[10px] px-1.5 py-0 h-5 ${
                                rateTier.color === 'emerald'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                  : rateTier.color === 'amber'
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                                  : rateTier.color === 'violet'
                                  ? 'bg-violet-500/15 text-violet-400 border-violet-500/25'
                                  : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                              }`}
                            >
                              {rateTier.tier}
                            </Badge>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-200">
                          {row.totalHours > 0 ? formatCurrency(estimatedSalary) : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {isCustomRate && row.totalHours > 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-violet-400 mx-auto" />
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}

                {/* ── Yearly Total Row ── */}
                {monthlyData.length > 0 && (
                  <TableRow className="border-t-2 border-slate-600 bg-slate-800/80">
                    <TableCell className="font-bold text-white">
                      Year Total
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-white">
                      {yearlyTotals.totalHours.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-400">
                      —
                    </TableCell>
                    <TableCell className="text-right text-slate-400">
                      —
                    </TableCell>
                    <TableCell className="text-center text-slate-400">
                      —
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-white">
                      {formatCurrency(yearlyTotals.totalSalary)}
                    </TableCell>
                    <TableCell className="text-center text-slate-400">
                      —
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Summary Cards ─────────────────────────────────────── */}
      {employeeInfo && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{employeeInfo.totalWorkingHours.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Total Lifetime Hours</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">
                {employeeInfo.customHourlyRate != null
                  ? `${employeeInfo.customHourlyRate}`
                  : `${employeeInfo.rtPerHour}`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Current Rate (AED/hr)
                {employeeInfo.customHourlyRate != null && (
                  <span className="text-violet-400 ml-1">Custom</span>
                )}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${milestoneProgress.crossed ? 'text-red-400' : 'text-emerald-400'}`}>
                {milestoneProgress.crossed ? 'Premium' : 'Standard'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Rate Tier ({employeeInfo.hoursThreshold}h threshold)
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
