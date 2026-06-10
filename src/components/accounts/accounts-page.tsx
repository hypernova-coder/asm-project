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
  ArrowDownToLine,
  RefreshCw,
  Pencil,
  Check,
  Trash2,
  Save,
  XSquare,
  Users,
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
  clientName?: string | null;
  employeeCount?: number;
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
  customHourlyRate: number | null;
}

/* Edit buffer: tracks modified fields per record during site edit mode */
interface EditBufferEntry {
  totalHours?: number;
  rtPerHour?: number;
  deduction?: number;
  advance?: number;
}

type EditBuffer = Map<string, EditBufferEntry>;

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
  loading?: boolean;
}

function SiteFilter({ sites, selectedSiteId, selectedSiteName, onSiteChange, loading }: SiteFilterProps) {
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
        onClick={() => !loading && setOpen(!open)}
        className={cn(
          'flex items-center gap-2 h-9 rounded-lg border px-3 text-sm transition-colors text-left min-w-[200px]',
          loading
            ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-wait'
            : selectedSiteId
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
        )}
      >
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="truncate flex-1">
          {loading ? 'Loading sites...' : selectedSiteName || 'Select Site'}
        </span>
        {selectedSiteId && !loading && (
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

      {open && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl shadow-black/40 overflow-hidden min-w-[300px]">
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
              <div className="px-3 py-4 text-center text-sm text-slate-500">No sites found for this month/year</div>
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
                  <span className="truncate flex-1">{site.name}</span>
                  {site.employeeCount != null && (
                    <span className="text-xs text-slate-500 shrink-0">
                      {site.employeeCount} emp
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Custom Rate Cell ───────── */

interface CustomRateCellProps {
  empId: string;
  customHourlyRate: number | null;
  currentRtPerHour: number;
  monthParam: string;
  onSave: (empId: string, customRate: number | null) => Promise<void>;
}

function CustomRateCell({ empId, customHourlyRate, currentRtPerHour, monthParam, onSave }: CustomRateCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    customHourlyRate != null ? String(customHourlyRate) : ''
  );
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setEditValue(customHourlyRate != null ? String(customHourlyRate) : '');
    }
  }, [customHourlyRate, editing]);

  const handleSave = useCallback(async () => {
    const trimmed = editValue.trim();

    if (trimmed === '' || trimmed === '0') {
      setSaving(true);
      try {
        await onSave(empId, null);
        setEditing(false);
      } catch {
        // Keep editing on error
      } finally {
        setSaving(false);
      }
      return;
    }

    const numVal = parseFloat(trimmed);
    if (isNaN(numVal) || numVal < 0) {
      toast({ title: 'Invalid rate', description: 'Please enter a valid positive number', variant: 'destructive' });
      return;
    }

    if (customHourlyRate != null && numVal === customHourlyRate) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(empId, numVal);
      setEditing(false);
    } catch {
      // Keep editing on error
    } finally {
      setSaving(false);
    }
  }, [editValue, customHourlyRate, empId, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(customHourlyRate != null ? String(customHourlyRate) : '');
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
          step="0.1"
          placeholder="Rate"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="h-7 w-20 bg-slate-900 border-violet-500/50 text-white text-xs px-2 py-1"
        />
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
        ) : (
          <Check className="h-3 w-3 text-violet-400" />
        )}
      </div>
    );
  }

  const hasCustom = customHourlyRate != null && customHourlyRate > 0;

  return (
    <button
      onClick={() => {
        setEditValue(customHourlyRate != null ? String(customHourlyRate) : '');
        setEditing(true);
      }}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors cursor-pointer',
        hasCustom
          ? 'bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border border-violet-500/20'
          : 'text-slate-500 hover:bg-slate-700/50 hover:text-slate-300 border border-transparent'
      )}
      title={hasCustom ? `Custom: ${customHourlyRate!.toFixed(2)} SAR/hr – Click to edit` : 'Click to set custom rate'}
    >
      <Pencil className="h-3 w-3 shrink-0" />
      <span>{hasCustom ? customHourlyRate!.toFixed(2) : 'Set'}</span>
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
  const [loadingSites, setLoadingSites] = useState(false);

  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [generating, setGenerating] = useState(false);
  const autoGenerateAttempted = useRef(false);

  /* Site edit mode state */
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState<EditBuffer>(new Map());
  const [savingEdits, setSavingEdits] = useState(false);

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

  // Fetch sites for the selected month/year
  const fetchSitesForMonth = useCallback(async (m: string, y: string) => {
    const mp = `${y}-${m.padStart(2, '0')}`;
    try {
      setLoadingSites(true);
      const res = await fetch(`/api/accounts/sites-for-month?month=${mp}&year=${y}`);
      const data = await res.json();
      if (data.success) {
        setSites(
          (data.data.sites || []).map((s: { id: string; name: string; clientName?: string | null; employeeCount?: number }) => ({
            id: s.id,
            name: s.name,
            clientName: s.clientName,
            employeeCount: s.employeeCount,
          }))
        );
      } else {
        setSites([]);
      }
    } catch {
      setSites([]);
    } finally {
      setLoadingSites(false);
    }
  }, []);

  // Fetch sites when month/year changes
  useEffect(() => {
    fetchSitesForMonth(month, year);
    // Reset site selection when month/year changes
    setSelectedSiteId('');
    setSelectedSiteName('');
    setSalaryRecords([]);
    setIsEditing(false);
    setEditBuffer(new Map());
    autoGenerateAttempted.current = false;
  }, [month, year, fetchSitesForMonth]);

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
        const rawRecords = data.data.records || [];
        const records = rawRecords.map((r: Record<string, unknown>) => ({
          ...r,
          customHourlyRate: (r.employee as Record<string, unknown>)?.customHourlyRate ?? null,
        }));
        setSalaryRecords(records);

        if (records.length === 0 && !autoGenerateAttempted.current) {
          autoGenerateAttempted.current = true;
          await autoGenerateSalary();
        }
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

  // Auto-generate salary records when site is selected
  const autoGenerateSalary = useCallback(async () => {
    if (!selectedSiteId || !selectedSiteName) return;
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
      if (data.success && data.data.created > 0) {
        toast({
          title: 'Salary Records Auto-Generated',
          description: data.data.message || `${data.data.created} records created`,
        });
        const params = new URLSearchParams({
          siteId: selectedSiteId,
          month: monthParam,
          year: year,
        });
        const refetch = await fetch(`/api/salary-records?${params.toString()}`);
        const refetchData = await refetch.json();
        if (refetchData.success) {
          setSalaryRecords(refetchData.data.records || []);
        }
        // Refresh sites list to update employee counts
        fetchSitesForMonth(month, year);
      }
    } catch {
      // Silent fail for auto-generate
    } finally {
      setGenerating(false);
    }
  }, [selectedSiteId, selectedSiteName, monthParam, year, fetchSitesForMonth]);

  useEffect(() => {
    if (selectedSiteId) {
      fetchSalaryRecords();
    } else {
      setSalaryRecords([]);
    }
  }, [selectedSiteId, month, year, fetchSalaryRecords]);

  // Generate salary records manually (re-generate)
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
        fetchSitesForMonth(month, year);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to generate salary records', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to generate salary records', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }, [selectedSiteId, selectedSiteName, monthParam, year, fetchSalaryRecords, fetchSitesForMonth]);

  // Update individual salary record (for inline edits outside of site edit mode)
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
          setSalaryRecords((prev) =>
            prev.map((r) => {
              if (r.id !== recordId) return r;
              const updated = { ...r, [field]: value };
              if (field === 'deduction' || field === 'advance' || field === 'rtPerHour' || field === 'totalHours') {
                updated.totalSalary = updated.totalHours * updated.rtPerHour;
                updated.balanceSalary = updated.totalSalary - updated.deduction - updated.advance;
              }
              return updated;
            })
          );
          toast({ title: 'Updated', description: 'Record saved successfully' });
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

  // Set custom hourly rate for an employee
  const handleSetCustomRate = useCallback(
    async (empId: string, customRate: number | null) => {
      try {
        const empRes = await fetch(`/api/employees/${empId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customHourlyRate: customRate }),
        });
        const empData = await empRes.json();
        if (!empData.success) {
          toast({ title: 'Error', description: empData.error || 'Failed to update custom rate', variant: 'destructive' });
          throw new Error('Employee update failed');
        }

        const whRes = await fetch('/api/accounts/working-hours', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empId,
            month: monthParam,
            isCustom: customRate != null,
            rtPerHour: customRate ?? undefined,
          }),
        });
        if (!whRes.ok) {
          console.warn('Working hours update returned non-ok status');
        }

        try {
          await fetch('/api/accounts/allocate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month: monthParam, year: parseInt(year, 10) }),
          });
        } catch {
          // Allocation engine failure shouldn't block the user
        }

        await fetchSalaryRecords();

        toast({
          title: customRate != null ? 'Custom Rate Set' : 'Custom Rate Removed',
          description: customRate != null
            ? `Hourly rate override set to ${customRate.toFixed(2)} SAR`
            : 'Rate reverted to standard tier calculation',
        });
      } catch {
        toast({ title: 'Error', description: 'Failed to set custom rate', variant: 'destructive' });
        throw new Error('Custom rate update failed');
      }
    },
    [monthParam, year, fetchSalaryRecords]
  );

  // Toggle paid status
  const handleTogglePaid = useCallback(
    async (record: SalaryRecord) => {
      const newPaidStatus = !record.isPaid;
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

  // Soft delete a record
  const handleSoftDelete = useCallback(
    async (record: SalaryRecord) => {
      // Optimistically remove from local state
      setSalaryRecords((prev) => prev.filter((r) => r.id !== record.id));

      try {
        const res = await fetch(`/api/salary-records/${record.id}`, {
          method: 'DELETE',
        });
        const data = await res.json();

        if (data.success) {
          // Show toast with Undo button
          const { dismiss } = toast({
            title: 'Record Deleted',
            description: `${record.empName} salary record removed`,
            action: (
              <Button
                variant="outline"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                onClick={async () => {
                  // Undo: restore the record
                  try {
                    const undoRes = await fetch(`/api/salary-records/${record.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isDeleted: false }),
                    });
                    const undoData = await undoRes.json();
                    if (undoData.success) {
                      toast({ title: 'Record Restored', description: `${record.empName} salary record has been restored` });
                      fetchSalaryRecords();
                    } else {
                      toast({ title: 'Undo Failed', description: 'Could not restore the record', variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: 'Undo Failed', description: 'Could not restore the record', variant: 'destructive' });
                  }
                  dismiss();
                }}
              >
                Undo
              </Button>
            ),
            duration: 5000,
          });
        } else {
          // Revert on failure
          setSalaryRecords((prev) => [...prev, record]);
          toast({ title: 'Error', description: data.error || 'Failed to delete record', variant: 'destructive' });
        }
      } catch {
        setSalaryRecords((prev) => [...prev, record]);
        toast({ title: 'Error', description: 'Failed to delete record', variant: 'destructive' });
      }
    },
    [fetchSalaryRecords]
  );

  // Site change handler
  const handleSiteChange = useCallback((siteId: string, siteName: string) => {
    setSelectedSiteId(siteId);
    setSelectedSiteName(siteName);
    autoGenerateAttempted.current = false;
    setIsEditing(false);
    setEditBuffer(new Map());
  }, []);

  /* ─── Site Edit Mode Handlers ─── */

  const handleEnterEditMode = useCallback(() => {
    setIsEditing(true);
    setEditBuffer(new Map());
  }, []);

  const handleCancelEditMode = useCallback(() => {
    setIsEditing(false);
    setEditBuffer(new Map());
  }, []);

  // Update a field in the edit buffer (local only, no API call)
  const handleEditFieldChange = useCallback((recordId: string, field: keyof EditBufferEntry, value: number) => {
    setEditBuffer((prev) => {
      const next = new Map(prev);
      const entry = next.get(recordId) || {};
      next.set(recordId, { ...entry, [field]: value });
      return next;
    });
  }, []);

  // Save all edited records via bulk-update API
  const handleSaveEdits = useCallback(async () => {
    if (editBuffer.size === 0) {
      setIsEditing(false);
      return;
    }

    setSavingEdits(true);
    try {
      const records: Array<{ id: string; totalHours?: number; rtPerHour?: number; deduction?: number; advance?: number }> = [];

      editBuffer.forEach((entry, id) => {
        records.push({ id, ...entry });
      });

      const res = await fetch('/api/salary-records/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      const data = await res.json();

      if (data.success) {
        const { updated, failed } = data.data;
        if (failed > 0) {
          toast({
            title: 'Partial Save',
            description: `${updated} records saved, ${failed} failed`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'All Changes Saved',
            description: `${updated} record${updated !== 1 ? 's' : ''} updated successfully`,
          });
        }
        setIsEditing(false);
        setEditBuffer(new Map());
        await fetchSalaryRecords();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save changes', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' });
    } finally {
      setSavingEdits(false);
    }
  }, [editBuffer, fetchSalaryRecords]);

  // Get the effective value for a field (edit buffer override or original)
  const getEffectiveValue = useCallback(
    (record: SalaryRecord, field: keyof EditBufferEntry): number => {
      const buf = editBuffer.get(record.id);
      if (buf && buf[field] !== undefined) {
        return buf[field]!;
      }
      return record[field];
    },
    [editBuffer]
  );

  // Compute effective records with edit buffer applied (for totals and display)
  const effectiveRecords = useMemo(() => {
    return salaryRecords.map((r) => {
      const buf = editBuffer.get(r.id);
      if (!buf) return r;
      const totalHours = buf.totalHours ?? r.totalHours;
      const rtPerHour = buf.rtPerHour ?? r.rtPerHour;
      const deduction = buf.deduction ?? r.deduction;
      const advance = buf.advance ?? r.advance;
      const totalSalary = totalHours * rtPerHour;
      const balanceSalary = totalSalary - deduction - advance;
      return { ...r, totalHours, rtPerHour, deduction, advance, totalSalary, balanceSalary };
    });
  }, [salaryRecords, editBuffer]);

  // Compute totals
  const totals = useMemo(() => {
    return effectiveRecords.reduce(
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
  }, [effectiveRecords]);

  // Count of changed records in edit buffer
  const changedCount = editBuffer.size;

  // Unique employees count
  const uniqueEmployeeCount = useMemo(() => {
    return new Set(salaryRecords.map(r => r.empId)).size;
  }, [salaryRecords]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Accounts</h2>
          <p className="text-slate-400 mt-1">
            Manage employee salary records and payments for {MONTHS.find((m) => m.value === month)?.label} {year}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={month} onValueChange={(v) => { setMonth(v); }}>
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
          <Select value={year} onValueChange={(v) => { setYear(v); }}>
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
          <SiteFilter
            sites={sites}
            selectedSiteId={selectedSiteId}
            selectedSiteName={selectedSiteName}
            onSiteChange={handleSiteChange}
            loading={loadingSites}
          />
          {selectedSiteId && (
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedSiteId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Re-Generate
            </Button>
          )}
        </div>
      </div>

      {/* Sites overview - show when no site is selected */}
      {!selectedSiteId && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="px-4">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              Sites for {MONTHS.find((m) => m.value === month)?.label} {year}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {loadingSites ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-slate-700 rounded-lg" />
                ))}
              </div>
            ) : sites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-700/50 mb-4">
                  <Building2 className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">No sites found</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  No sites have activity for {MONTHS.find((m) => m.value === month)?.label} {year}. Try selecting a different month or year, or generate salary records first.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sites.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => handleSiteChange(site.id, site.name)}
                    className={cn(
                      'flex flex-col gap-2 p-4 rounded-lg border text-left transition-all',
                      'bg-slate-800/80 border-slate-700/60 hover:bg-slate-700/60 hover:border-emerald-500/30'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                        <Building2 className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{site.name}</p>
                        {site.clientName && (
                          <p className="text-xs text-slate-500 truncate">{site.clientName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Users className="h-3 w-3" />
                        <span>{site.employeeCount ?? 0} employees</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Auto-generating indicator */}
      {generating && (
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="flex items-center gap-3 py-3">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            <span className="text-emerald-300 text-sm">Auto-generating salary records from employee data...</span>
          </CardContent>
        </Card>
      )}

      {/* Site header when selected */}
      {selectedSiteId && (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <Building2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{selectedSiteName}</h3>
            <p className="text-sm text-slate-400">
              {uniqueEmployeeCount} employee{uniqueEmployeeCount !== 1 ? 's' : ''} • {MONTHS.find((m) => m.value === month)?.label} {year}
            </p>
          </div>
        </div>
      )}

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
              <p className="text-xs text-slate-500 mt-0.5">of {effectiveRecords.length} employees</p>
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
              <p className="text-xs text-slate-500 mt-0.5">of {effectiveRecords.length} employees</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Salary Records Table */}
      {selectedSiteId && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              Salary Records
            </CardTitle>
            {/* Edit Action Buttons */}
            {salaryRecords.length > 0 && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnterEditMode}
                className="gap-1.5 bg-amber-600/10 border-amber-500/30 text-amber-400 hover:bg-amber-600/20 hover:text-amber-300"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {isEditing && (
              <div className="flex items-center gap-2">
                {changedCount > 0 && (
                  <span className="text-xs text-amber-400 font-medium">
                    {changedCount} record{changedCount !== 1 ? 's' : ''} modified
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEditMode}
                  disabled={savingEdits}
                  className="gap-1.5 bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  <XSquare className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveEdits}
                  disabled={savingEdits || changedCount === 0}
                  className="gap-1.5 bg-emerald-600/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20 hover:text-emerald-300"
                >
                  {savingEdits ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </div>
            )}
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
                  Generate salary records from attendance data by clicking the &quot;Re-Generate&quot; button above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs font-medium">S.No</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium">Emp Code</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium">Name</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium">Nationality</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium">Trade</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium">Rate Tier</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium text-right">Total Hours</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium text-right">Rate/Hr</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium text-right">Total Salary</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium text-right">Deduction</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium text-right">Advance</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium text-right">Balance</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium text-center">Custom Rate</TableHead>
                      <TableHead className="text-slate-400 text-xs font-medium text-center">Paid</TableHead>
                      {!isEditing && (
                        <TableHead className="text-slate-400 text-xs font-medium text-center">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {effectiveRecords.map((record) => {
                      const isStandard = record.rateTier === 'standard';
                      const rateColor = isStandard
                        ? 'text-emerald-400'
                        : 'text-green-400';

                      return (
                        <TableRow key={record.id} className="border-slate-700/50 hover:bg-slate-700/30">
                          <TableCell className="text-slate-300 text-xs">{record.slNo}</TableCell>
                          <TableCell className="text-slate-300 text-xs font-mono">{record.employeeCode}</TableCell>
                          <TableCell className="text-white text-xs font-medium">{record.empName}</TableCell>
                          <TableCell className="text-slate-400 text-xs">{record.nationality}</TableCell>
                          <TableCell className="text-slate-400 text-xs">{record.trade}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] px-1.5 py-0 h-5',
                                isStandard
                                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                  : 'border-green-500/30 text-green-400 bg-green-500/10'
                              )}
                            >
                              {isStandard ? 'Below' : 'Above'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={getEffectiveValue(record, 'totalHours')}
                                onChange={(e) => handleEditFieldChange(record.id, 'totalHours', parseFloat(e.target.value) || 0)}
                                className="h-7 w-20 bg-slate-900 border-amber-500/30 text-white text-xs px-2 py-1 text-right"
                              />
                            ) : (
                              <span className="text-white text-xs">{record.totalHours.toFixed(1)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={getEffectiveValue(record, 'rtPerHour')}
                                onChange={(e) => handleEditFieldChange(record.id, 'rtPerHour', parseFloat(e.target.value) || 0)}
                                className="h-7 w-20 bg-slate-900 border-amber-500/30 text-white text-xs px-2 py-1 text-right"
                              />
                            ) : (
                              <span className={cn('text-xs font-medium', rateColor)}>
                                {record.rtPerHour.toFixed(2)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-white text-xs">
                            {(getEffectiveValue(record, 'totalHours') * getEffectiveValue(record, 'rtPerHour')).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={getEffectiveValue(record, 'deduction')}
                                onChange={(e) => handleEditFieldChange(record.id, 'deduction', parseFloat(e.target.value) || 0)}
                                className="h-7 w-20 bg-slate-900 border-amber-500/30 text-white text-xs px-2 py-1 text-right"
                              />
                            ) : (
                              <span className="text-red-400 text-xs">{record.deduction.toFixed(2)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={getEffectiveValue(record, 'advance')}
                                onChange={(e) => handleEditFieldChange(record.id, 'advance', parseFloat(e.target.value) || 0)}
                                className="h-7 w-20 bg-slate-900 border-amber-500/30 text-white text-xs px-2 py-1 text-right"
                              />
                            ) : (
                              <span className="text-amber-400 text-xs">{record.advance.toFixed(2)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-white text-xs font-medium">
                            {(getEffectiveValue(record, 'totalHours') * getEffectiveValue(record, 'rtPerHour') - getEffectiveValue(record, 'deduction') - getEffectiveValue(record, 'advance')).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <CustomRateCell
                              empId={record.empId}
                              customHourlyRate={record.customHourlyRate}
                              currentRtPerHour={record.rtPerHour}
                              monthParam={monthParam}
                              onSave={handleSetCustomRate}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={() => handleTogglePaid(record)}
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors',
                                record.isPaid
                                  ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                  : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              )}
                            >
                              {record.isPaid ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  Paid
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3" />
                                  Unpaid
                                </>
                              )}
                            </button>
                          </TableCell>
                          {!isEditing && (
                            <TableCell className="text-center">
                              <button
                                onClick={() => handleSoftDelete(record)}
                                className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                title="Delete record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="border-slate-700 bg-slate-800/80">
                      <TableCell colSpan={6} className="text-xs font-semibold text-slate-300">
                        Total ({uniqueEmployeeCount} employee{uniqueEmployeeCount !== 1 ? 's' : ''})
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-white">
                        {totals.totalHours.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-white">
                        —
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-white">
                        {totals.totalSalary.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-red-400">
                        {totals.deduction.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-amber-400">
                        {totals.advance.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-white">
                        {totals.balanceSalary.toFixed(2)}
                      </TableCell>
                      <TableCell colSpan={isEditing ? 1 : 2} />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
