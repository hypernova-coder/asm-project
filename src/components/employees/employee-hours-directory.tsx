'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Users,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Crown,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useAppStore } from '@/store/app-store';

// ─── Types ───────────────────────────────────────────────────────────────

interface EmployeeHoursSummary {
  id: string;
  fullName: string;
  employeeId: string;
  currentSite: string | null;
  trade: string | null;
  isTeamLeader: boolean;
  isSupervisor: boolean;
  customHourlyRate: number | null;
  cumulativeHours: number;
  hoursThreshold: number;
  effectiveRate: number;
  rateLabel: string;
  thresholdStatus: 'below' | 'above';
}

type SortField = 'employeeId' | 'fullName' | 'currentSite' | 'trade' | 'rate' | 'cumulativeHours' | 'thresholdStatus';
type SortDirection = 'asc' | 'desc';

// ─── Helper ─────────────────────────────────────────────────────────────

function formatHours(hours: number): string {
  if (hours === 0) return '0h';
  return `${hours.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h`;
}

// ─── Main Component ─────────────────────────────────────────────────────

export function EmployeeHoursDirectory() {
  const { setSelectedEmployeeId, setCurrentView } = useAppStore();

  // ── State ──
  const [employees, setEmployees] = useState<EmployeeHoursSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rateFilter, setRateFilter] = useState<string>('all');
  const [thresholdFilter, setThresholdFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('fullName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (rateFilter && rateFilter !== 'all') params.set('rate', rateFilter);
      if (thresholdFilter && thresholdFilter !== 'all') params.set('threshold', thresholdFilter);

      const res = await fetch(`/api/employees/hours-summary?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setEmployees(json.data.employees);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [search, rateFilter, thresholdFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Sorting ──
  const sortedEmployees = useMemo(() => {
    const sorted = [...employees].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'employeeId':
          comparison = a.employeeId.localeCompare(b.employeeId);
          break;
        case 'fullName':
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case 'currentSite':
          comparison = (a.currentSite || '').localeCompare(b.currentSite || '');
          break;
        case 'trade':
          comparison = (a.trade || '').localeCompare(b.trade || '');
          break;
        case 'rate':
          comparison = a.effectiveRate - b.effectiveRate;
          break;
        case 'cumulativeHours':
          comparison = a.cumulativeHours - b.cumulativeHours;
          break;
        case 'thresholdStatus':
          comparison = a.thresholdStatus.localeCompare(b.thresholdStatus);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [employees, sortField, sortDirection]);

  // ── Sort handler ──
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ── Employee click ──
  const handleEmployeeClick = (empId: string) => {
    setSelectedEmployeeId(empId);
    setCurrentView('employee_hours_ledger');
  };

  // ── Sort icon helper ──
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 text-blue-400" />
      : <ArrowDown className="h-3 w-3 ml-1 text-blue-400" />;
  };

  // ── Summary stats ──
  const stats = useMemo(() => {
    const total = employees.length;
    const aboveThreshold = employees.filter(e => e.thresholdStatus === 'above').length;
    const belowThreshold = total - aboveThreshold;
    const customRate = employees.filter(e => e.customHourlyRate != null).length;
    const totalHours = employees.reduce((sum, e) => sum + e.cumulativeHours, 0);
    return { total, aboveThreshold, belowThreshold, customRate, totalHours };
  }, [employees]);

  // ── Rate badge ──
  const RateBadge = ({ emp }: { emp: EmployeeHoursSummary }) => {
    if (emp.customHourlyRate != null) {
      return (
        <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/25 text-[10px] px-1.5 py-0 h-5 font-mono">
          Custom
        </Badge>
      );
    }
    const isAbove = emp.thresholdStatus === 'above';
    if (emp.isTeamLeader || emp.isSupervisor) {
      return (
        <Badge className={`text-[10px] px-1.5 py-0 h-5 font-mono ${
          isAbove
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
            : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
        }`}>
          {isAbove ? '0.91' : '0.83'}
        </Badge>
      );
    }
    return (
      <Badge className={`text-[10px] px-1.5 py-0 h-5 font-mono ${
        isAbove
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
          : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
      }`}>
        {isAbove ? '5.0' : '2.5'}
      </Badge>
    );
  };

  // ── Role badge ──
  const RoleBadge = ({ emp }: { emp: EmployeeHoursSummary }) => {
    if (emp.isSupervisor) {
      return (
        <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[9px] px-1 py-0 h-4 gap-0.5">
          <ShieldCheck className="h-2.5 w-2.5" /> SUP
        </Badge>
      );
    }
    if (emp.isTeamLeader) {
      return (
        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] px-1 py-0 h-4 gap-0.5">
          <Crown className="h-2.5 w-2.5" /> TL
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[9px] px-1 py-0 h-4 gap-0.5">
        <User className="h-2.5 w-2.5" /> STD
      </Badge>
    );
  };

  // ── Loading state ──
  if (isLoading && employees.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg bg-slate-700" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 bg-slate-700" />
            <Skeleton className="h-4 w-32 bg-slate-700" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl bg-slate-700" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl bg-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 border border-blue-500/25">
            <Clock className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Employee Hours Directory
            </h1>
            <p className="text-sm text-slate-400">
              Master directory of all employee hours and rates
            </p>
          </div>
        </div>
      </div>

      {/* ─── Summary Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="h-4 w-4 text-slate-400" />
              <p className="text-xs text-slate-500">Total Employees</p>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <p className="text-xs text-slate-500">Above Threshold</p>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{stats.aboveThreshold}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <p className="text-xs text-slate-500">Below Threshold</p>
            </div>
            <p className="text-2xl font-bold text-amber-400">{stats.belowThreshold}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-violet-400" />
              <p className="text-xs text-slate-500">Custom Rates</p>
            </div>
            <p className="text-2xl font-bold text-violet-400">{stats.customRate}</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters ───────────────────────────────────────────── */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, ID, trade, or site..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-700 h-9"
              />
            </div>

            {/* Rate Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <Select value={rateFilter} onValueChange={setRateFilter}>
                <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700 h-9 text-sm">
                  <SelectValue placeholder="Filter by Rate" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Rates</SelectItem>
                  <SelectItem value="2.5">2.5 (Std Basic)</SelectItem>
                  <SelectItem value="5.0">5.0 (Std Full)</SelectItem>
                  <SelectItem value="0.83">0.83 (TL Basic)</SelectItem>
                  <SelectItem value="0.91">0.91 (TL Full)</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Threshold Filter */}
            <Select value={thresholdFilter} onValueChange={setThresholdFilter}>
              <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700 h-9 text-sm">
                <SelectValue placeholder="Threshold" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Thresholds</SelectItem>
                <SelectItem value="below">&lt; 1000h</SelectItem>
                <SelectItem value="above">&ge; 1000h</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ─── Directory Table ───────────────────────────────────── */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              Employee Directory
            </CardTitle>
            <span className="text-xs text-slate-400">
              {sortedEmployees.length} employee{sortedEmployees.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-medium">
                    <button
                      className="flex items-center hover:text-white transition-colors"
                      onClick={() => handleSort('employeeId')}
                    >
                      Employee ID <SortIcon field="employeeId" />
                    </button>
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium">
                    <button
                      className="flex items-center hover:text-white transition-colors"
                      onClick={() => handleSort('fullName')}
                    >
                      Name <SortIcon field="fullName" />
                    </button>
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium">
                    <button
                      className="flex items-center hover:text-white transition-colors"
                      onClick={() => handleSort('currentSite')}
                    >
                      Current Site <SortIcon field="currentSite" />
                    </button>
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium">
                    <button
                      className="flex items-center hover:text-white transition-colors"
                      onClick={() => handleSort('trade')}
                    >
                      Trade <SortIcon field="trade" />
                    </button>
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium">
                    <button
                      className="flex items-center hover:text-white transition-colors"
                      onClick={() => handleSort('rate')}
                    >
                      Rate <SortIcon field="rate" />
                    </button>
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium text-right">
                    <button
                      className="flex items-center justify-end hover:text-white transition-colors"
                      onClick={() => handleSort('cumulativeHours')}
                    >
                      Cumulative Hours <SortIcon field="cumulativeHours" />
                    </button>
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium text-center">
                    <button
                      className="flex items-center justify-center hover:text-white transition-colors"
                      onClick={() => handleSort('thresholdStatus')}
                    >
                      Threshold <SortIcon field="thresholdStatus" />
                    </button>
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      ) : (
                        'No employees found matching filters'
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedEmployees.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="border-slate-700/30 hover:bg-slate-700/30 cursor-pointer transition-colors"
                      onClick={() => handleEmployeeClick(emp.id)}
                    >
                      <TableCell className="font-mono text-sm text-slate-300 whitespace-nowrap">
                        {emp.employeeId}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{emp.fullName}</span>
                          <RoleBadge emp={emp} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-300 whitespace-nowrap">
                        {emp.currentSite || <span className="text-slate-600">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-slate-300 whitespace-nowrap">
                        {emp.trade || <span className="text-slate-600">—</span>}
                      </TableCell>
                      <TableCell>
                        <RateBadge emp={emp} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        <span className={
                          emp.cumulativeHours >= emp.hoursThreshold
                            ? 'text-red-400'
                            : 'text-slate-200'
                        }>
                          {formatHours(emp.cumulativeHours)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.thresholdStatus === 'above' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px] px-1.5 py-0 h-5">
                            &ge; {emp.hoursThreshold}h
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px] px-1.5 py-0 h-5">
                            &lt; {emp.hoursThreshold}h
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
