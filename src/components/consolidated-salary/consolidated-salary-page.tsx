'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Building2,
  Users,
  Clock,
  DollarSign,
  TrendingDown,
  ArrowUpRight,
  Wallet,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';

/* ───────── constants ───────── */
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

/* ───────── types ───────── */
interface SalaryRecord {
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
  rateTier: string;
  employee?: {
    id: string;
    fullName: string;
    employeeId: string;
    currentSite: string | null;
    trade: string | null;
    nationality: string | null;
  };
}

interface SiteSummary {
  siteId: string;
  siteName: string;
  clientName: string | null;
  employeeCount: number;
  totalHours: number;
  totalSalary: number;
  totalDeductions: number;
  totalAdvances: number;
  netBalance: number;
  paidCount: number;
  totalRecords: number;
  employees: SalaryRecord[];
}

interface Totals {
  totalSites: number;
  totalEmployees: number;
  totalHours: number;
  totalSalary: number;
  totalDeductions: number;
  totalAdvances: number;
  netBalance: number;
  paidCount: number;
  totalRecords: number;
}

/* ───────── helpers ───────── */
function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatHours(hours: number): string {
  return hours.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

/* ───────── Metric Card ───────── */
interface MetricCardProps {
  title: string;
  value: number | null;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  format?: 'number' | 'currency' | 'hours';
  loading?: boolean;
  subtitle?: string;
}

function MetricCard({ title, value, icon: Icon, color, bgColor, format = 'number', loading, subtitle }: MetricCardProps) {
  const displayValue = useMemo(() => {
    if (value === null) return null;
    switch (format) {
      case 'currency':
        return `SAR ${formatCurrency(value)}`;
      case 'hours':
        return formatHours(value);
      default:
        return value.toLocaleString();
    }
  }, [value, format]);

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-colors py-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-4">
        <CardTitle className="text-sm font-medium text-slate-400">
          {title}
        </CardTitle>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', bgColor)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0">
        {loading || displayValue === null ? (
          <Skeleton className="h-8 w-24 bg-slate-700" />
        ) : (
          <div className="text-2xl font-bold text-white">{displayValue}</div>
        )}
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────── Main Component ───────── */
export function ConsolidatedSalaryPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [siteSummaries, setSiteSummaries] = useState<SiteSummary[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [hasData, setHasData] = useState(true);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());

  const yearOptions = useMemo(() => {
    const currentYear = now.getFullYear();
    return [
      String(currentYear - 2),
      String(currentYear - 1),
      String(currentYear),
      String(currentYear + 1),
    ];
  }, []);

  /* ── Fetch salary data ── */
  const fetchSalaryData = useCallback(async (m: string, y: string) => {
    try {
      setLoading(true);
      const monthStr = `${y}-${m.padStart(2, '0')}`;
      const res = await fetch(`/api/salary-records?month=${monthStr}&year=${y}`);
      const json = await res.json();
      if (json.success) {
        setSiteSummaries(json.data.siteSummaries || []);
        setTotals(json.data.totals || null);
        setHasData((json.data.records || []).length > 0);
      } else {
        setSiteSummaries([]);
        setTotals(null);
        setHasData(false);
      }
    } catch {
      setSiteSummaries([]);
      setTotals(null);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalaryData(month, year);
  }, [month, year, fetchSalaryData]);

  /* ── Toggle site expansion ── */
  const toggleSiteExpand = useCallback((siteId: string) => {
    setExpandedSites((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  }, []);

  /* ── Month/Year display label ── */
  const monthLabel = MONTHS.find((m) => m.value === month)?.label || '';

  /* ── Summary metrics config ── */
  const metrics: MetricCardProps[] = useMemo(() => [
    {
      title: 'Total Sites',
      value: totals?.totalSites ?? null,
      icon: Building2,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      loading,
      subtitle: `${monthLabel} ${year}`,
    },
    {
      title: 'Total Employees',
      value: totals?.totalEmployees ?? null,
      icon: Users,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      loading,
      subtitle: `${monthLabel} ${year}`,
    },
    {
      title: 'Total Working Hours',
      value: totals?.totalHours ?? null,
      icon: Clock,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      format: 'hours',
      loading,
      subtitle: `${monthLabel} ${year}`,
    },
    {
      title: 'Total Salary',
      value: totals?.totalSalary ?? null,
      icon: DollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      format: 'currency',
      loading,
      subtitle: `${monthLabel} ${year}`,
    },
    {
      title: 'Total Deductions',
      value: totals?.totalDeductions ?? null,
      icon: TrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      format: 'currency',
      loading,
      subtitle: `${monthLabel} ${year}`,
    },
    {
      title: 'Total Advances',
      value: totals?.totalAdvances ?? null,
      icon: ArrowUpRight,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      format: 'currency',
      loading,
      subtitle: `${monthLabel} ${year}`,
    },
    {
      title: 'Net Balance',
      value: totals?.netBalance ?? null,
      icon: Wallet,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      format: 'currency',
      loading,
      subtitle: `${monthLabel} ${year}`,
    },
  ], [totals, loading, monthLabel, year]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Consolidated Salary Sheet</h2>
          <div className="flex items-center gap-2 mt-1">
            <CalendarDays className="h-4 w-4 text-emerald-400" />
            <p className="text-emerald-400 font-medium text-sm">{monthLabel} {year}</p>
          </div>
          <p className="text-slate-400 mt-1">
            Aggregated salary overview across all sites for the selected month.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-slate-200">
              <CalendarDays className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent className="dropdown-upward bg-slate-800 border-slate-700">
              {MONTHS.map((m) => (
                <SelectItem
                  key={m.value}
                  value={m.value}
                  className="text-slate-200 focus:bg-slate-700 focus:text-white"
                >
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
                <SelectItem
                  key={y}
                  value={y}
                  className="text-slate-200 focus:bg-slate-700 focus:text-white"
                >
                  {y}
                </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* No Data Message */}
      {!loading && !hasData && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-slate-600 mb-3" />
            <p className="text-slate-400 text-lg font-medium">No salary data for this month</p>
            <p className="text-slate-500 text-sm mt-1">
              Generate salary records from the Accounts page first.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Table */}
      {!loading && hasData && siteSummaries.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              Site-wise Salary Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="overflow-x-auto rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-semibold w-8"></TableHead>
                    <TableHead className="text-slate-400 font-semibold">Site Name</TableHead>
                    <TableHead className="text-slate-400 font-semibold">Client Name</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-center">No. of Employees</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-right">Total Hours</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-right">Total Salary</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-right">Total Deductions</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-right">Total Advances</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-right">Net Balance</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-center">Paid / Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteSummaries.map((site) => {
                    const isExpanded = expandedSites.has(site.siteId);
                    return (
                      <React.Fragment key={site.siteId}>
                        {/* Site Summary Row */}
                        <TableRow
                          className={cn(
                            'border-slate-700/50 cursor-pointer transition-colors',
                            isExpanded
                              ? 'bg-slate-700/30 hover:bg-slate-700/40'
                              : 'hover:bg-slate-700/20'
                          )}
                          onClick={() => toggleSiteExpand(site.siteId)}
                        >
                          <TableCell className="w-8 px-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                          </TableCell>
                          <TableCell className="text-slate-200 font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-500" />
                              {site.siteName}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {site.clientName || '—'}
                          </TableCell>
                          <TableCell className="text-slate-200 text-center font-semibold">
                            {site.employeeCount}
                          </TableCell>
                          <TableCell className="text-slate-200 text-right">
                            {formatHours(site.totalHours)}
                          </TableCell>
                          <TableCell className="text-emerald-400 text-right font-medium">
                            {formatCurrency(site.totalSalary)}
                          </TableCell>
                          <TableCell className="text-red-400 text-right">
                            {formatCurrency(site.totalDeductions)}
                          </TableCell>
                          <TableCell className="text-amber-400 text-right">
                            {formatCurrency(site.totalAdvances)}
                          </TableCell>
                          <TableCell className={cn(
                            'text-right font-semibold',
                            site.netBalance >= 0 ? 'text-purple-400' : 'text-red-400'
                          )}>
                            {formatCurrency(site.netBalance)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-emerald-400 font-semibold">{site.paidCount}</span>
                              <span className="text-slate-500">/</span>
                              <span className="text-slate-300">{site.totalRecords}</span>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Employee Details */}
                        {isExpanded && (
                          <TableRow className="border-slate-700/30 bg-slate-900/50 hover:bg-transparent">
                            <TableCell colSpan={10} className="p-0">
                              <div className="px-8 py-3">
                                <div className="overflow-x-auto rounded-lg border border-slate-700/30">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-slate-700/30 hover:bg-transparent">
                                        <TableHead className="text-slate-500 font-medium text-xs">#</TableHead>
                                        <TableHead className="text-slate-500 font-medium text-xs">Employee Name</TableHead>
                                        <TableHead className="text-slate-500 font-medium text-xs">Code</TableHead>
                                        <TableHead className="text-slate-500 font-medium text-xs">Trade</TableHead>
                                        <TableHead className="text-slate-500 font-medium text-xs text-right">Hours</TableHead>
                                        <TableHead className="text-slate-500 font-medium text-xs text-right">Rate/Hr</TableHead>
                                        <TableHead className="text-slate-500 font-medium text-xs text-right">Salary</TableHead>
                                        <TableHead className="text-slate-500 font-medium text-xs text-right">Deduction</TableHead>
                                        <TableHead className="text-slate-500 font-medium text-xs text-right">Advance</TableHead>
                                        <TableHead className="text-slate-500 font-medium text-xs text-right">Balance</TableHead>
                                        <TableHead className="text-slate-500 font-medium text-xs text-center">Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {site.employees.map((emp, idx) => (
                                        <TableRow
                                          key={emp.id}
                                          className="border-slate-700/20 hover:bg-slate-800/30"
                                        >
                                          <TableCell className="text-slate-500 text-xs">{idx + 1}</TableCell>
                                          <TableCell className="text-slate-300 text-sm font-medium">
                                            {emp.empName}
                                          </TableCell>
                                          <TableCell className="text-slate-400 text-xs font-mono">
                                            {emp.employeeCode}
                                          </TableCell>
                                          <TableCell className="text-slate-400 text-xs">
                                            {emp.trade || '—'}
                                          </TableCell>
                                          <TableCell className="text-slate-300 text-xs text-right">
                                            {formatHours(emp.totalHours)}
                                          </TableCell>
                                          <TableCell className="text-slate-400 text-xs text-right">
                                            {formatCurrency(emp.rtPerHour)}
                                          </TableCell>
                                          <TableCell className="text-emerald-400/80 text-xs text-right">
                                            {formatCurrency(emp.totalSalary)}
                                          </TableCell>
                                          <TableCell className="text-red-400/80 text-xs text-right">
                                            {formatCurrency(emp.deduction)}
                                          </TableCell>
                                          <TableCell className="text-amber-400/80 text-xs text-right">
                                            {formatCurrency(emp.advance)}
                                          </TableCell>
                                          <TableCell className={cn(
                                            'text-xs text-right font-medium',
                                            emp.balanceSalary >= 0 ? 'text-slate-200' : 'text-red-400'
                                          )}>
                                            {formatCurrency(emp.balanceSalary)}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            {emp.isPaid ? (
                                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Paid
                                              </Badge>
                                            ) : (
                                              <Badge className="bg-slate-600/20 text-slate-400 border-slate-600/30 hover:bg-slate-600/30 text-[10px] gap-1">
                                                <XCircle className="h-3 w-3" />
                                                Unpaid
                                              </Badge>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Grand Total Row */}
                  {totals && (
                    <TableRow className="border-slate-600/50 bg-slate-800/60 hover:bg-slate-800/60">
                      <TableCell className="w-8 px-2"></TableCell>
                      <TableCell className="text-white font-bold">
                        Grand Total
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-white text-center font-bold">
                        {totals.totalEmployees}
                      </TableCell>
                      <TableCell className="text-white text-right font-bold">
                        {formatHours(totals.totalHours)}
                      </TableCell>
                      <TableCell className="text-emerald-400 text-right font-bold">
                        {formatCurrency(totals.totalSalary)}
                      </TableCell>
                      <TableCell className="text-red-400 text-right font-bold">
                        {formatCurrency(totals.totalDeductions)}
                      </TableCell>
                      <TableCell className="text-amber-400 text-right font-bold">
                        {formatCurrency(totals.totalAdvances)}
                      </TableCell>
                      <TableCell className={cn(
                        'text-right font-bold',
                        totals.netBalance >= 0 ? 'text-purple-400' : 'text-red-400'
                      )}>
                        {formatCurrency(totals.netBalance)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-emerald-400 font-bold">{totals.paidCount}</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-white font-bold">{totals.totalRecords}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card className="bg-slate-800/50 border-slate-700/50 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              Site-wise Salary Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-slate-700 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
