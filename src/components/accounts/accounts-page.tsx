'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  DollarSign,
  Search,
  MapPin,
  X,
  Loader2,
  Building2,
  CalendarDays,
  FileText,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowDownToLine,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  TableFooter,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/* ───────── types ───────── */

interface SiteOption {
  id: string;
  name: string;
}

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
}

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

/* ───────── Searchable Site Filter ───────── */

interface SiteFilterProps {
  sites: SiteOption[];
  selectedSiteId: string;
  selectedSiteName: string;
  onSiteChange: (siteId: string, siteName: string) => void;
}

function SiteFilter({ sites, selectedSiteId, selectedSiteName, onSiteChange }: SiteFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? sites.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : sites;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 h-9 rounded-lg border px-3 text-sm transition-colors text-left min-w-[200px]',
          selectedSiteId
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
        )}
      >
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="truncate flex-1">
          {selectedSiteName || 'Select Site'}
        </span>
        {selectedSiteId && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onSiteChange('', '');
            }}
            className="text-slate-400 hover:text-white shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl shadow-black/40 overflow-hidden min-w-[260px]">
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sites..."
                className="w-full h-8 pl-8 pr-3 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-500">No sites found</div>
            ) : (
              filtered.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => {
                    onSiteChange(site.id, site.name);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors hover:bg-slate-700/50',
                    selectedSiteId === site.id ? 'bg-slate-700/70 text-emerald-400' : 'text-slate-300'
                  )}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{site.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Editable Cell ───────── */

interface EditableCellProps {
  value: number;
  recordId: string;
  field: 'deduction' | 'advance' | 'rtPerHour';
  onSave: (recordId: string, field: string, value: number) => Promise<void>;
}

function EditableCell({ value, recordId, field, onSave }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = useCallback(async () => {
    const numVal = parseFloat(editValue);
    if (isNaN(numVal) || numVal < 0) {
      toast({ title: 'Invalid value', description: 'Please enter a valid positive number', variant: 'destructive' });
      setEditValue(String(value));
      setEditing(false);
      return;
    }
    if (numVal === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(recordId, field, numVal);
      setEditing(false);
    } catch {
      setEditValue(String(value));
    } finally {
      setSaving(false);
    }
  }, [editValue, value, recordId, field, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(String(value));
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="number"
          min="0"
          step={field === 'rtPerHour' ? '0.1' : '1'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="h-7 w-20 bg-slate-900 border-slate-600 text-white text-xs px-2 py-1"
        />
        {saving && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setEditValue(String(value));
        setEditing(true);
      }}
      className="px-2 py-1 rounded text-xs hover:bg-slate-700/50 transition-colors text-slate-200 cursor-pointer min-w-[40px] text-left"
      title="Click to edit"
    >
      {field === 'rtPerHour' ? value.toFixed(2) : value.toLocaleString()}
    </button>
  );
}

/* ───────── Main Component ───────── */

export function AccountsPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));

  const [sites, setSites] = useState<SiteOption[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedSiteName, setSelectedSiteName] = useState('');
  const [loadingSites, setLoadingSites] = useState(true);

  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [generating, setGenerating] = useState(false);

  const yearOptions = useMemo(() => {
    const currentYear = now.getFullYear();
    return [
      String(currentYear - 2),
      String(currentYear - 1),
      String(currentYear),
      String(currentYear + 1),
    ];
  }, []);

  const monthParam = `${year}-${month.padStart(2, '0')}`;

  // Fetch sites
  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoadingSites(true);
        const res = await fetch('/api/sites');
        const data = await res.json();
        if (data.success) {
          setSites(
            (data.data.sites || []).map((s: { id: string; name: string }) => ({
              id: s.id,
              name: s.name,
            }))
          );
        }
      } catch {
        // silently fail
      } finally {
        setLoadingSites(false);
      }
    };
    fetchSites();
  }, []);

  // Fetch salary records
  const fetchSalaryRecords = useCallback(async () => {
    if (!selectedSiteId || !month || !year) return;
    try {
      setLoadingRecords(true);
      const params = new URLSearchParams({
        siteId: selectedSiteId,
        month: monthParam,
        year: year,
      });
      const res = await fetch(`/api/salary-records?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSalaryRecords(data.data.records || []);
      } else {
        setSalaryRecords([]);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch salary records', variant: 'destructive' });
      setSalaryRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedSiteId, month, year, monthParam]);

  useEffect(() => {
    if (selectedSiteId) {
      fetchSalaryRecords();
    } else {
      setSalaryRecords([]);
    }
  }, [selectedSiteId, month, year, fetchSalaryRecords]);

  // Generate salary records
  const handleGenerate = useCallback(async () => {
    if (!selectedSiteId || !selectedSiteName) {
      toast({ title: 'Select Site', description: 'Please select a site first', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/salary-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSiteId,
          siteName: selectedSiteName,
          month: monthParam,
          year: parseInt(year, 10),
          generateFromAttendance: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Salary Records Generated',
          description: data.data.message || `${data.data.created || 0} records created`,
        });
        fetchSalaryRecords();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to generate salary records', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to generate salary records', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }, [selectedSiteId, selectedSiteName, monthParam, year, fetchSalaryRecords]);

  // Update individual salary record
  const handleUpdateRecord = useCallback(
    async (recordId: string, field: string, value: number | boolean) => {
      try {
        const res = await fetch('/api/salary-records', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: recordId, [field]: value }),
        });
        const data = await res.json();
        if (data.success) {
          // Optimistically update local state
          setSalaryRecords((prev) =>
            prev.map((r) => {
              if (r.id !== recordId) return r;
              const updated = { ...r, [field]: value };
              // Recalculate
              if (field === 'deduction' || field === 'advance' || field === 'rtPerHour' || field === 'totalHours') {
                updated.totalSalary = updated.totalHours * updated.rtPerHour;
                updated.balanceSalary = updated.totalSalary - updated.deduction - updated.advance;
              }
              return updated;
            })
          );
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to update record', variant: 'destructive' });
          throw new Error('Update failed');
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to update record', variant: 'destructive' });
        throw new Error('Update failed');
      }
    },
    []
  );

  // Toggle paid status
  const handleTogglePaid = useCallback(
    async (record: SalaryRecord) => {
      const newPaidStatus = !record.isPaid;
      // Optimistic update
      setSalaryRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, isPaid: newPaidStatus } : r))
      );
      try {
        const res = await fetch('/api/salary-records', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: record.id, isPaid: newPaidStatus }),
        });
        const data = await res.json();
        if (!data.success) {
          // Revert on failure
          setSalaryRecords((prev) =>
            prev.map((r) => (r.id === record.id ? { ...r, isPaid: record.isPaid } : r))
          );
          toast({ title: 'Error', description: data.error || 'Failed to update status', variant: 'destructive' });
        } else {
          toast({
            title: newPaidStatus ? 'Marked as Paid' : 'Marked as Unpaid',
            description: `${record.empName} salary status updated`,
          });
        }
      } catch {
        setSalaryRecords((prev) =>
          prev.map((r) => (r.id === record.id ? { ...r, isPaid: record.isPaid } : r))
        );
        toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
      }
    },
    []
  );

  // Site change handler
  const handleSiteChange = useCallback((siteId: string, siteName: string) => {
    setSelectedSiteId(siteId);
    setSelectedSiteName(siteName);
  }, []);

  // Compute totals
  const totals = useMemo(() => {
    return salaryRecords.reduce(
      (acc, r) => ({
        totalHours: acc.totalHours + r.totalHours,
        totalSalary: acc.totalSalary + r.totalSalary,
        deduction: acc.deduction + r.deduction,
        advance: acc.advance + r.advance,
        balanceSalary: acc.balanceSalary + r.balanceSalary,
        paidCount: acc.paidCount + (r.isPaid ? 1 : 0),
        unpaidCount: acc.unpaidCount + (!r.isPaid ? 1 : 0),
      }),
      { totalHours: 0, totalSalary: 0, deduction: 0, advance: 0, balanceSalary: 0, paidCount: 0, unpaidCount: 0 }
    );
  }, [salaryRecords]);

  // No site selected prompt
  if (!selectedSiteId) {
    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Accounts</h2>
            <p className="text-slate-400 mt-1">
              Manage employee salary records and payments.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <SiteFilter
              sites={sites}
              selectedSiteId={selectedSiteId}
              selectedSiteName={selectedSiteName}
              onSiteChange={handleSiteChange}
            />
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

        {/* Prompt Card */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mb-4">
              <Building2 className="h-8 w-8 text-emerald-400/60" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Select a Site</h3>
            <p className="text-sm text-slate-400 max-w-md">
              Choose a site from the dropdown above to view and manage salary records for that site.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Accounts</h2>
          <div className="flex items-center gap-2 mt-1">
            <Building2 className="h-4 w-4 text-emerald-400" />
            <p className="text-emerald-400 font-medium text-sm">{selectedSiteName}</p>
          </div>
          <p className="text-slate-400 mt-1">
            Salary records for {MONTHS.find((m) => m.value === month)?.label} {year}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SiteFilter
            sites={sites}
            selectedSiteId={selectedSiteId}
            selectedSiteName={selectedSiteName}
            onSiteChange={handleSiteChange}
          />
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-slate-200">
              <CalendarDays className="h-4 w-4 mr-2 text-slate-400" />
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
          <Button
            onClick={handleGenerate}
            disabled={generating || !selectedSiteId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Salary
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {salaryRecords.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700/50 py-3">
            <CardHeader className="flex flex-row items-center justify-between pb-1 px-4">
              <CardTitle className="text-xs font-medium text-slate-400">Total Salary</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pt-0">
              <p className="text-xl font-bold text-white">
                {totals.totalSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">SAR</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50 py-3">
            <CardHeader className="flex flex-row items-center justify-between pb-1 px-4">
              <CardTitle className="text-xs font-medium text-slate-400">Balance Due</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <ArrowDownToLine className="h-4 w-4 text-amber-400" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pt-0">
              <p className="text-xl font-bold text-white">
                {totals.balanceSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">SAR</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50 py-3">
            <CardHeader className="flex flex-row items-center justify-between pb-1 px-4">
              <CardTitle className="text-xs font-medium text-slate-400">Paid</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pt-0">
              <p className="text-xl font-bold text-green-400">{totals.paidCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">of {salaryRecords.length} employees</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50 py-3">
            <CardHeader className="flex flex-row items-center justify-between pb-1 px-4">
              <CardTitle className="text-xs font-medium text-slate-400">Unpaid</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <XCircle className="h-4 w-4 text-red-400" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pt-0">
              <p className="text-xl font-bold text-red-400">{totals.unpaidCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">of {salaryRecords.length} employees</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Salary Records Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="px-4">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            Salary Records
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {loadingRecords ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-slate-700 rounded-lg" />
              ))}
            </div>
          ) : salaryRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-700/50 mb-4">
                <FileText className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">No salary records</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Generate salary records from attendance data by clicking the &quot;Generate Salary&quot; button above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-semibold text-xs w-10">Sl</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Emp Code</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Employee Name</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Nationality</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Trade</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-right">Total Hrs</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Rate/Hr</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-right">Total Salary</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Deduction</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Advance</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-right">Balance</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Rate Tier</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryRecords.map((record, idx) => (
                    <TableRow
                      key={record.id}
                      className={cn(
                        'border-slate-700/50 hover:bg-slate-700/30',
                        record.isPaid && 'bg-green-500/5'
                      )}
                    >
                      <TableCell className="text-slate-400 text-xs font-mono">{idx + 1}</TableCell>
                      <TableCell className="text-slate-300 text-xs font-mono">{record.employeeCode}</TableCell>
                      <TableCell className="text-white text-sm font-medium">{record.empName}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{record.nationality || '—'}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{record.trade || '—'}</TableCell>
                      <TableCell className="text-slate-200 text-xs text-right font-mono">
                        {record.totalHours.toFixed(1)}
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={record.rtPerHour}
                          recordId={record.id}
                          field="rtPerHour"
                          onSave={handleUpdateRecord}
                        />
                      </TableCell>
                      <TableCell className="text-emerald-400 text-xs text-right font-mono font-semibold">
                        {record.totalSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={record.deduction}
                          recordId={record.id}
                          field="deduction"
                          onSave={handleUpdateRecord}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={record.advance}
                          recordId={record.id}
                          field="advance"
                          onSave={handleUpdateRecord}
                        />
                      </TableCell>
                      <TableCell className={cn(
                        'text-xs text-right font-mono font-semibold',
                        record.balanceSalary >= 0 ? 'text-white' : 'text-red-400'
                      )}>
                        {record.balanceSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            'text-[10px] px-2 py-0.5',
                            record.rateTier === 'premium'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                              : 'bg-slate-600/30 text-slate-300 border-slate-500/25'
                          )}
                        >
                          {record.rateTier === 'premium' ? 'Premium' : 'Standard'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleTogglePaid(record)}
                          className="focus:outline-none"
                          title={record.isPaid ? 'Click to mark as unpaid' : 'Click to mark as paid'}
                        >
                          <Badge
                            className={cn(
                              'text-[10px] px-2 py-0.5 cursor-pointer transition-colors',
                              record.isPaid
                                ? 'bg-green-500/15 text-green-400 border-green-500/25 hover:bg-green-500/25'
                                : 'bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/25'
                            )}
                          >
                            {record.isPaid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="border-slate-700 hover:bg-transparent bg-slate-900/60">
                    <TableCell colSpan={5} className="text-white text-sm font-bold">
                      Totals ({salaryRecords.length} employees)
                    </TableCell>
                    <TableCell className="text-slate-200 text-xs text-right font-mono font-bold">
                      {totals.totalHours.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">—</TableCell>
                    <TableCell className="text-emerald-400 text-xs text-right font-mono font-bold">
                      {totals.totalSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-amber-400 text-xs font-mono font-bold">
                      {totals.deduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-amber-400 text-xs font-mono font-bold">
                      {totals.advance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={cn(
                      'text-xs text-right font-mono font-bold',
                      totals.balanceSalary >= 0 ? 'text-white' : 'text-red-400'
                    )}>
                      {totals.balanceSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">—</TableCell>
                    <TableCell className="text-center">
                      <span className="text-[10px] text-slate-400">
                        {totals.paidCount}/{salaryRecords.length}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
