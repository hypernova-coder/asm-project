'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Edit2, Save, X, Loader2, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

/* ───────── Types ───────── */

interface UniformEntry {
  id: string;
  tokenNumber: number;
  employeeName: string;
  employeeId: string;
  documentType: string;
  documentNumber: string;
  items: string;
  siteName: string | null;
  teamLeaderName: string | null;
  isRenewal: boolean;
  previousTokenId: string | null;
  isDeleted: boolean;
  createdAt: string;
  renewalDate: string;
  employee?: {
    id: string;
    fullName: string;
    isTeamLeader: boolean;
    currentSite: string | null;
    photo: string | null;
  };
}

interface ItemsMap {
  uniform: boolean;
  shoes: boolean;
  helmet: boolean;
  bottle: boolean;
  safetyJacket: boolean;
  mattress: boolean;
  pillow: boolean;
}

const DEFAULT_ITEMS: ItemsMap = {
  uniform: false,
  shoes: false,
  helmet: false,
  bottle: false,
  safetyJacket: false,
  mattress: false,
  pillow: false,
};

const ITEM_LABELS: Record<keyof ItemsMap, string> = {
  uniform: 'UNIFORM',
  shoes: 'SHOES',
  helmet: 'HELMET',
  bottle: 'BOTTLE',
  safetyJacket: 'SAFETY JACKET',
  mattress: 'MATTRESS',
  pillow: 'PILLOW',
};

function parseItems(itemsStr: string): ItemsMap {
  try {
    const parsed = JSON.parse(itemsStr);
    return {
      uniform: !!parsed.uniform,
      shoes: !!parsed.shoes,
      helmet: !!parsed.helmet,
      bottle: !!parsed.bottle,
      safetyJacket: !!parsed.safetyJacket,
      mattress: !!parsed.mattress,
      pillow: !!parsed.pillow,
    };
  } catch {
    return { ...DEFAULT_ITEMS };
  }
}

interface MonthGroup {
  key: string;       // "2026-01"
  label: string;     // "JAN 2026"
  entries: UniformEntry[];
  status: 'expired' | 'expiring' | 'active'; // for coloring
}

interface Props {
  entry: UniformEntry;
  onBack: () => void;
  onRenew?: (entry: UniformEntry) => void;
}

/* ───────── Helpers ───────── */

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key: string): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const [year, month] = key.split('-');
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

function formatDateShort(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).toUpperCase();
  } catch {
    return dateStr;
  }
}

/* ───────── Main Component ───────── */

export function UniformEntryDetails({ entry, onBack, onRenew }: Props) {
  const [allEntries, setAllEntries] = useState<UniformEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  // Fetch all entries for this employee
  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/uniform-registry/employee/${entry.employeeId}`);
        const json = await res.json();
        if (json.success) {
          const entries: UniformEntry[] = json.data.entries || [];
          setAllEntries(entries);
          // Auto-select the month of the clicked entry
          const entryMonth = getMonthKey(entry.createdAt);
          if (entries.length > 0) {
            setSelectedMonth(entryMonth);
          }
        }
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [entry]);

  // Group entries by month
  const monthGroups = useMemo((): MonthGroup[] => {
    const groups = new Map<string, UniformEntry[]>();
    allEntries.forEach((e) => {
      const key = getMonthKey(e.createdAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    });

    // Sort by month descending
    const sorted = Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));

    return sorted.map(([key, entries]) => {
      const now = new Date();
      let hasExpired = false;
      let hasExpiring = false;
      let hasActive = false;

      entries.forEach((e) => {
        const renewal = new Date(e.renewalDate);
        const diffDays = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) hasExpired = true;
        else if (diffDays <= 30) hasExpiring = true;
        else hasActive = true;
      });

      // Priority: if any entry is expired, show green; if expiring, show red; else default/slate
      let status: 'expired' | 'expiring' | 'active' = 'active';
      if (hasExpired) status = 'expired';
      else if (hasExpiring) status = 'expiring';

      return {
        key,
        label: getMonthLabel(key),
        entries,
        status,
      };
    });
  }, [allEntries]);

  // Selected month's entries
  const selectedEntries = useMemo(() => {
    const group = monthGroups.find(g => g.key === selectedMonth);
    return group?.entries || [];
  }, [monthGroups, selectedMonth]);

  // Start editing
  const startEdit = useCallback((entryItem: UniformEntry) => {
    setEditingId(entryItem.id);
    setEditData({
      siteName: entryItem.siteName || '',
      teamLeaderName: entryItem.teamLeaderName || '',
      items: parseItems(entryItem.items),
    });
  }, []);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditData({});
  }, []);

  // Save edit
  const saveEdit = useCallback(async (entryId: string) => {
    setSaving(true);
    try {
      const items = editData.items as ItemsMap;
      const res = await fetch(`/api/uniform-registry/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: JSON.stringify(items),
          siteName: editData.siteName,
          teamLeaderName: editData.teamLeaderName,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Updated', description: 'Entry updated successfully.' });
        // Refresh entries
        const refreshRes = await fetch(`/api/uniform-registry/employee/${entry.employeeId}`);
        const refreshJson = await refreshRes.json();
        if (refreshJson.success) {
          setAllEntries(refreshJson.data.entries || []);
        }
        setEditingId(null);
        setEditData({});
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to update entry', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update entry', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [editData, entry.employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={onBack}
          className="gap-1.5 bg-black text-white hover:bg-gray-800 border-none shadow-md font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-bold text-white uppercase">
            TOKEN #{entry.tokenNumber} — {entry.employeeName.toUpperCase()}
          </h2>
          <p className="text-sm text-slate-400 uppercase">
            EMPLOYEE ID: {entry.employeeId} · {allEntries.length} ENTRIES TOTAL
          </p>
        </div>
      </div>

      {/* Month Tabs */}
      <div className="flex flex-wrap gap-2">
        {monthGroups.map((group) => (
          <button
            key={group.key}
            onClick={() => setSelectedMonth(group.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold uppercase transition-all border',
              selectedMonth === group.key
                ? group.status === 'expired'
                  ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-500/20'
                  : group.status === 'expiring'
                  ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/20'
                  : 'bg-slate-600 text-white border-slate-500 shadow-lg shadow-slate-500/20'
                : group.status === 'expired'
                ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                : group.status === 'expiring'
                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            )}
          >
            {group.label}
            <span className="ml-1.5 opacity-70">({group.entries.length})</span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50"></span> EXPIRING SOON</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/30 border border-green-500/50"></span> EXPIRED / RENEWAL AVAILABLE</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-500/30 border border-slate-500/50"></span> ACTIVE</span>
      </div>

      {/* Entries Table - Dark themed */}
      {selectedEntries.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No entries for this month.
        </div>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px] uppercase">
              <thead>
                <tr className="bg-slate-700/80 text-slate-200">
                  <th className="border border-slate-600 px-3 py-2.5 text-center font-bold">TOKEN #</th>
                  <th className="border border-slate-600 px-3 py-2.5 text-left font-bold">DOC TYPE</th>
                  <th className="border border-slate-600 px-3 py-2.5 text-left font-bold">DOC NUMBER</th>
                  <th className="border border-slate-600 px-3 py-2.5 text-left font-bold">SITE NAME</th>
                  <th className="border border-slate-600 px-3 py-2.5 text-left font-bold">TEAM LEADER</th>
                  <th className="border border-slate-600 px-3 py-2.5 text-left font-bold min-w-[180px]">ITEMS</th>
                  <th className="border border-slate-600 px-3 py-2.5 text-center font-bold">CREATED</th>
                  <th className="border border-slate-600 px-3 py-2.5 text-center font-bold">RENEWAL</th>
                  <th className="border border-slate-600 px-3 py-2.5 text-center font-bold">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {selectedEntries.map((entryItem, idx) => {
                  const isEditing = editingId === entryItem.id;
                  const items = isEditing ? (editData.items as ItemsMap) : parseItems(entryItem.items);
                  const isEven = idx % 2 === 1;

                  const now = new Date();
                  const renewal = new Date(entryItem.renewalDate);
                  const diffDays = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <tr key={entryItem.id} className={cn(
                      isEven ? 'bg-slate-800/40' : 'bg-slate-800/20',
                      'hover:bg-slate-700/30 transition-colors'
                    )}>
                      <td className="border border-slate-700 px-3 py-2 text-center font-bold text-slate-200">
                        #{entryItem.tokenNumber}
                        {entryItem.isRenewal && (
                          <Badge className="ml-1 bg-purple-500/15 text-purple-400 border-purple-500/25 text-[9px] px-1 py-0">
                            RENEWAL
                          </Badge>
                        )}
                      </td>
                      <td className="border border-slate-700 px-3 py-2 text-slate-300">
                        <Badge
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            entryItem.documentType === 'passport'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                              : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                          )}
                        >
                          {entryItem.documentType === 'passport' ? 'PASSPORT' : 'ID'}
                        </Badge>
                      </td>
                      <td className="border border-slate-700 px-3 py-2 text-slate-300 font-mono">
                        {entryItem.documentNumber.toUpperCase()}
                      </td>
                      <td className="border border-slate-700 px-3 py-2">
                        {isEditing ? (
                          <Input
                            value={editData.siteName as string}
                            onChange={(e) => setEditData(prev => ({ ...prev, siteName: e.target.value.toUpperCase() }))}
                            className="h-7 text-[11px] uppercase bg-slate-900 border-slate-600 text-slate-200"
                          />
                        ) : (
                          <span className="text-slate-300">{(entryItem.siteName || '—').toUpperCase()}</span>
                        )}
                      </td>
                      <td className="border border-slate-700 px-3 py-2">
                        {isEditing ? (
                          <Input
                            value={editData.teamLeaderName as string}
                            onChange={(e) => setEditData(prev => ({ ...prev, teamLeaderName: e.target.value.toUpperCase() }))}
                            className="h-7 text-[11px] uppercase bg-slate-900 border-slate-600 text-slate-200"
                          />
                        ) : (
                          <span className="text-slate-300">{(entryItem.teamLeaderName || '—').toUpperCase()}</span>
                        )}
                      </td>
                      <td className="border border-slate-700 px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {(Object.keys(items) as (keyof ItemsMap)[]).map((key) => {
                            const checked = items[key];
                            if (isEditing) {
                              return (
                                <label key={key} className="flex items-center gap-0.5 text-[10px] cursor-pointer select-none text-slate-300">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(val) => {
                                      setEditData(prev => ({
                                        ...prev,
                                        items: { ...(prev.items as ItemsMap), [key]: !!val },
                                      }));
                                    }}
                                    className="h-3 w-3"
                                  />
                                  {ITEM_LABELS[key]}
                                </label>
                              );
                            }
                            return checked ? (
                              <Badge key={key} className="bg-blue-500/15 text-blue-400 text-[9px] px-1 py-0 border border-blue-500/25">
                                {ITEM_LABELS[key]}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </td>
                      <td className="border border-slate-700 px-3 py-2 text-center text-slate-400 text-[10px]">
                        {formatDateShort(entryItem.createdAt)}
                      </td>
                      <td className="border border-slate-700 px-3 py-2 text-center text-[10px]">
                        {(() => {
                          const dateStr = formatDateShort(entryItem.renewalDate);
                          if (diffDays <= 0) {
                            return <span className="text-green-400 font-bold">{dateStr}</span>;
                          }
                          if (diffDays <= 30) {
                            return <span className="text-red-400 font-bold">{dateStr}</span>;
                          }
                          return <span className="text-slate-400">{dateStr}</span>;
                        })()}
                      </td>
                      <td className="border border-slate-700 px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => saveEdit(entryItem.id)}
                                disabled={saving}
                                className="h-7 w-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                title="Save"
                              >
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                disabled={saving}
                                className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEdit(entryItem)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                                title="Edit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              {diffDays <= 0 && onRenew && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onRenew(entryItem)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-green-400 hover:bg-green-500/10"
                                  title="Renew"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
