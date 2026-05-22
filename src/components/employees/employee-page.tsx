'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Star,
  StarHalf,
  X,
  Loader2,
  Download,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Briefcase,
  User,
  Globe,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
  Shield,
  ShieldCheck,
  Clock,
  Camera,
  Upload,
  ImagePlus,
  Crown,
  Filter,
  UserX,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import jsPDF from 'jspdf';

// ─── Types ───────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  fullName: string;
  employeeId: string;
  nationality: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergencyContact: string | null;
  position: string | null;
  trade: string | null;
  joinDate: string | null;
  companyName: string | null;
  passportNumber: string | null;
  passportStatus: string | null;
  idNumber: string | null;
  idStatus: string | null;
  currentSite: string | null;
  isTeamLeader: boolean;
  teamLeaderSiteId: string | null;
  isSupervisor: boolean;
  supervisorSiteId: string | null;
  rating: number;
  status: string;
  photo: string | null;
  createdAt: string;
  updatedAt: string;
  attendance?: unknown[];
  warnings?: unknown[];
  fines?: unknown[];
}

interface Site {
  id: string;
  name: string;
}

// ─── Common Nationalities (for dropdown) ─────────────────────────────────

const NATIONALITIES = [
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros',
  'Democratic Republic of the Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea',
  'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea',
  'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho', 'Liberia', 'Libya',
  'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco',
  'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Republic of the Congo',
  'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone',
  'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo',
  'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe', 'India', 'Pakistan', 'Bangladesh',
];

// ─── Common Trades (for dropdown) ────────────────────────────────────────

const COMMON_TRADES = [
  'Mason', 'Electrician', 'Welder', 'Carpenter', 'Helper',
  'Plumber', 'HVAC Technician', 'Steel Fixer', 'Painter',
  'Crane Operator', 'Rigger', 'Scaffolder', 'Foreman',
  'Driver', 'Mechanic', 'Laborer', 'Cleaner', 'Security Guard',
  'Surveyor', 'Heavy Equipment Operator',
];

// ─── Searchable Nationality Dropdown ─────────────────────────────────────

interface SearchableNationalitySelectProps {
  value: string;
  onChange: (value: string) => void;
}

function SearchableNationalitySelect({
  value,
  onChange,
}: SearchableNationalitySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? NATIONALITIES.filter((n) =>
        n.toLowerCase().includes(search.toLowerCase())
      )
    : NATIONALITIES;

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

  const handleSelect = (nationality: string) => {
    onChange(nationality);
    setOpen(false);
    setSearch('');
  };

  const handleCustomInput = () => {
    if (search.trim()) {
      onChange(search.trim());
      setOpen(false);
      setSearch('');
    }
  };

  function cn(arg0: string, arg1: string): string {
    return `${arg0} ${arg1}`;
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full h-10 rounded-lg border border-slate-600 bg-slate-900 px-3 pl-10 text-sm text-white hover:bg-slate-800 transition-colors text-left"
        >
          <span className="truncate flex-1">{value || 'Select or type nationality'}</span>
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="text-slate-400 hover:text-white shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl shadow-black/40 overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search nationality or type custom..."
                className="w-full h-8 pl-8 pr-3 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomInput();
                  }
                }}
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
              <div className="px-3 py-4 text-center text-sm text-slate-500">
                No matching nationalities. Press Enter to add &quot;{search}&quot;.
              </div>
            ) : (
              filtered.map((nat) => (
                <button
                  key={nat}
                  type="button"
                  onClick={() => handleSelect(nat)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors hover:bg-slate-700/50',
                    value === nat ? 'bg-slate-700/70 text-white' : 'text-slate-300'
                  )}
                >
                  <Globe className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{nat}</span>
                </button>
              ))
            )}
            {search.trim() && !filtered.some(n => n.toLowerCase() === search.toLowerCase()) && (
              <button
                type="button"
                onClick={handleCustomInput}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left border-t border-slate-700 text-emerald-400 hover:bg-slate-700/50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add &quot;{search}&quot; as custom nationality</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Searchable Trade Dropdown ───────────────────────────────────────────

interface SearchableTradeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

function SearchableTradeSelect({
  value,
  onChange,
}: SearchableTradeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? COMMON_TRADES.filter((t) =>
        t.toLowerCase().includes(search.toLowerCase())
      )
    : COMMON_TRADES;

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

  const handleSelect = (trade: string) => {
    onChange(trade);
    setOpen(false);
    setSearch('');
  };

  const handleCustomInput = () => {
    if (search.trim()) {
      onChange(search.trim());
      setOpen(false);
      setSearch('');
    }
  };

  function cn(arg0: string, arg1: string): string {
    return `${arg0} ${arg1}`;
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full h-10 rounded-lg border border-slate-600 bg-slate-900 px-3 pl-10 text-sm text-white hover:bg-slate-800 transition-colors text-left"
        >
          <span className="truncate flex-1">{value || 'Select or type trade'}</span>
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="text-slate-400 hover:text-white shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl shadow-black/40 overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trade or type custom..."
                className="w-full h-8 pl-8 pr-3 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomInput();
                  }
                }}
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
              <div className="px-3 py-4 text-center text-sm text-slate-500">
                No matching trades. Press Enter to add &quot;{search}&quot;.
              </div>
            ) : (
              filtered.map((trade) => (
                <button
                  key={trade}
                  type="button"
                  onClick={() => handleSelect(trade)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors hover:bg-slate-700/50',
                    value === trade ? 'bg-slate-700/70 text-white' : 'text-slate-300'
                  )}
                >
                  <Briefcase className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{trade}</span>
                </button>
              ))
            )}
            {search.trim() && !filtered.some(t => t.toLowerCase() === search.toLowerCase()) && (
              <button
                type="button"
                onClick={handleCustomInput}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left border-t border-slate-700 text-emerald-400 hover:bg-slate-700/50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add &quot;{search}&quot; as custom trade</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Star Rating Component ───────────────────────────────────────────────

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };
  const iconSize = sizeClasses[size];
  const stars: React.ReactNode[] = [];

  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(
        <Star key={i} className={`${iconSize} fill-amber-400 text-amber-400`} />
      );
    } else if (i - 0.5 <= rating) {
      stars.push(
        <StarHalf key={i} className={`${iconSize} fill-amber-400 text-amber-400`} />
      );
    } else {
      stars.push(
        <Star key={i} className={`${iconSize} text-slate-600`} />
      );
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      {stars}
      <span className="text-xs text-slate-400 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Employee Initial Avatar ─────────────────────────────────────────────

function EmployeeAvatar({ name, photo }: { name: string; photo?: string | null }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (photo) {
    return (
      <div className="h-9 w-9 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center flex-shrink-0">
        <img src={photo} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="h-9 w-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-semibold text-blue-400">{initials}</span>
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <Badge className="bg-green-500/15 text-green-400 border-green-500/25 hover:bg-green-500/20">
        Active
      </Badge>
    );
  }
  if (status === 'pending_deletion') {
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20">
        Pending Deletion
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/25">
      {status}
    </Badge>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full bg-slate-700" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 bg-slate-700" />
            <Skeleton className="h-3 w-24 bg-slate-700" />
          </div>
          <Skeleton className="h-5 w-16 bg-slate-700" />
          <Skeleton className="h-5 w-20 bg-slate-700" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 bg-slate-700" />
            <Skeleton className="h-8 w-8 bg-slate-700" />
            <Skeleton className="h-8 w-8 bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-700/50 mb-4">
        <Users className="h-8 w-8 text-slate-500" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">
        {hasFilters ? 'No employees found' : 'No employees yet'}
      </h3>
      <p className="text-sm text-slate-500 max-w-sm">
        {hasFilters
          ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
          : 'Add your first employee to get started with workforce management.'}
      </p>
    </div>
  );
}

// ─── Image compression helper ────────────────────────────────────────────

function compressImage(file: File, maxWidth = 300, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ─── Employee PDF Generator ──────────────────────────────────────────────

function generateEmployeePDF(employee: Employee): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;

  // Company header bar
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ARABIAN SHIELD MANPOWER', 15, 14);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Workforce Management Solutions', 15, 21);

  // Shield icon placeholder
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(185, 6, 16, 20, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('A', 190.5, 19);

  // Left column setup
  const leftX = 15;
  const leftWidth = 70;
  const rightX = 95;
  const rightWidth = 100;
  let yPos = 40;

  // Profile photo circle (left column)
  const photoCenterX = leftX + leftWidth / 2;
  const photoCenterY = yPos + 18;
  const photoRadius = 15;

  if (employee.photo) {
    try {
      doc.addImage(employee.photo, 'JPEG', photoCenterX - photoRadius, photoCenterY - photoRadius, photoRadius * 2, photoRadius * 2);
    } catch {
      // Draw placeholder
      doc.setFillColor(200, 200, 200);
      doc.circle(photoCenterX, photoCenterY, photoRadius, 'F');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const initials = employee.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      doc.text(initials, photoCenterX, photoCenterY + 2, { align: 'center' });
    }
  } else {
    doc.setFillColor(200, 200, 200);
    doc.circle(photoCenterX, photoCenterY, photoRadius, 'F');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const initials = employee.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    doc.text(initials, photoCenterX, photoCenterY + 2, { align: 'center' });
  }

  yPos = photoCenterY + photoRadius + 10;

  // CONTACT section header
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTACT', leftX, yPos);
  yPos += 2;
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(leftX, yPos, leftX + leftWidth, yPos);
  yPos += 6;

  // Contact details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);

  const contactItems = [
    { label: 'Address', value: employee.address || 'Not provided' },
    { label: 'Email', value: employee.email || 'Not provided' },
    { label: 'Phone', value: employee.phone || 'Not provided' },
    { label: 'Nationality', value: employee.nationality || 'Not provided' },
  ];

  for (const item of contactItems) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(item.label + ':', leftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(item.value, leftX + 2, yPos + 4, { maxWidth: leftWidth - 4 });
    yPos += 10;
  }

  // TRADE & SKILLS section
  yPos += 2;
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TRADE & SKILLS', leftX, yPos);
  yPos += 2;
  doc.line(leftX, yPos, leftX + leftWidth, yPos);
  yPos += 6;

  doc.setFontSize(8);
  const tradeItems = [
    { label: 'Trade', value: employee.trade || employee.position || 'Not assigned' },
    { label: 'Team Leader', value: employee.isTeamLeader ? 'Yes' : 'No' },
    { label: 'Supervisor', value: employee.isSupervisor ? 'Yes' : 'No' },
    { label: 'Rating', value: '\u2605'.repeat(Math.round(employee.rating)) + '\u2606'.repeat(5 - Math.round(employee.rating)) + ` (${employee.rating.toFixed(1)})` },
  ];

  for (const item of tradeItems) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(item.label + ':', leftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(item.value, leftX + 2, yPos + 4);
    yPos += 9;
  }

  // Right column - Header bar with name
  doc.setFillColor(30, 58, 95);
  doc.roundedRect(rightX, 38, rightWidth, 20, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(employee.fullName.toUpperCase(), rightX + 5, 49);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const subtitle = `${employee.trade || employee.position || 'N/A'} | ${employee.companyName || 'ASM'}`;
  doc.text(subtitle, rightX + 5, 55);

  let rightY = 66;

  // EMPLOYEE INFORMATION section
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE INFORMATION', rightX, rightY);
  rightY += 2;
  doc.line(rightX, rightY, rightX + rightWidth, rightY);
  rightY += 6;

  // Info grid - 2 columns
  doc.setFontSize(8);
  const infoItems = [
    { label: 'Employee ID', value: employee.employeeId },
    { label: 'Date of Birth', value: employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : 'N/A' },
    { label: 'Join Date', value: employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : 'N/A' },
    { label: 'Current Site', value: employee.currentSite || 'Not assigned' },
    { label: 'ID Status', value: employee.idStatus || 'N/A' },
    { label: 'Passport Status', value: employee.passportStatus || 'N/A' },
    { label: 'Company', value: employee.companyName || 'N/A' },
    { label: 'Emergency Contact', value: employee.emergencyContact || 'N/A' },
  ];

  const colWidth = (rightWidth - 10) / 2;
  for (let i = 0; i < infoItems.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = rightX + col * (colWidth + 5);
    const y = rightY + row * 12;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(infoItems[i].label + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(infoItems[i].value, x, y + 4);
  }

  rightY += Math.ceil(infoItems.length / 2) * 12 + 8;

  // EMPLOYMENT STATUS section
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYMENT STATUS', rightX, rightY);
  rightY += 2;
  doc.line(rightX, rightY, rightX + rightWidth, rightY);
  rightY += 6;

  doc.setFontSize(8);
  const statusItems = [
    { label: 'Status', value: employee.status === 'active' ? 'Active' : employee.status },
    { label: 'Warnings', value: `${(employee.warnings as unknown[])?.length || 0} record(s)` },
    { label: 'Fines', value: `${(employee.fines as unknown[])?.length || 0} record(s)` },
    { label: 'Attendance Records', value: `${(employee.attendance as unknown[])?.length || 0} record(s)` },
  ];

  for (const item of statusItems) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(item.label + ':', rightX, rightY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(item.value, rightX + 50, rightY);
    rightY += 8;
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(15, footerY - 3, pageWidth - 15, footerY - 3);
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Generated by ASM System - Arabian Shield Manpower', 15, footerY);
  doc.text(new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(), pageWidth - 15, footerY, { align: 'right' });

  return doc;
}

// ─── Main Component ──────────────────────────────────────────────────────

export function EmployeePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();

  // ── State ──
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sites, setSites] = useState<Site[]>([]);

  // Advanced filter state
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [idleFilter, setIdleFilter] = useState(false);
  const [teamLeaderFilter, setTeamLeaderFilter] = useState(false);
  const [supervisorFilter, setSupervisorFilter] = useState(false);
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [trades, setTrades] = useState<string[]>([]);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  // Form state
  const [formTab, setFormTab] = useState('personal');
  const [formData, setFormData] = useState({
    fullName: '',
    employeeId: '',
    nationality: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    address: '',
    emergencyContact: '',
    position: '',
    trade: '',
    joinDate: '',
    companyName: '',
    passportNumber: '',
    passportStatus: '',
    idNumber: '',
    idStatus: '',
    currentSite: '',
    isTeamLeader: false,
    teamLeaderSiteId: '',
    isSupervisor: false,
    supervisorSiteId: '',
  });
  const [formPhoto, setFormPhoto] = useState<string | null>(null);
  const [showNewSiteInput, setShowNewSiteInput] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [isCreatingSite, setIsCreatingSite] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-activate idle filter from dashboard ──
  useEffect(() => {
    const idleFlag = localStorage.getItem('asm_idle_filter');
    if (idleFlag === '1') {
      setIdleFilter(true);
      localStorage.removeItem('asm_idle_filter');
    }
  }, []);

  // ── Auto-generate employee ID ──
  const generateAutoId = useCallback(() => {
    const year = new Date().getFullYear();
    return `ASM-${year}-001`;
  }, []);

  // ── Fetch Employees ──
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (tradeFilter && tradeFilter !== 'all') params.set('trade', tradeFilter);
      if (idleFilter) params.set('idle', '1');
      if (teamLeaderFilter) params.set('teamLeaders', '1');
      if (supervisorFilter) params.set('supervisors', '1');
      if (siteFilter && siteFilter !== 'all') params.set('site', siteFilter);

      const res = await fetch(`/api/employees?${params}`);
      const json = await res.json();
      if (json.success) {
        setEmployees(json.data.employees);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages);
        // Update trades list from API response
        if (json.data.trades) {
          setTrades(json.data.trades);
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch employees', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, tradeFilter, idleFilter, teamLeaderFilter, supervisorFilter, siteFilter, toast]);

  // ── Fetch Sites ──
  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch('/api/sites');
      const json = await res.json();
      if (json.success) {
        setSites(json.data.sites);
      }
    } catch {
      // silent fail
    }
  }, []);

  // ── Effects ──
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Debounce search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, tradeFilter, idleFilter, teamLeaderFilter, supervisorFilter, siteFilter]);

  // ── Handlers ──

  const hasFilters = debouncedSearch || statusFilter !== 'all' || tradeFilter !== 'all' || idleFilter || teamLeaderFilter || supervisorFilter || siteFilter !== 'all';

  const activeFilterCount = [
    statusFilter !== 'all',
    tradeFilter !== 'all',
    idleFilter,
    teamLeaderFilter,
    supervisorFilter,
    siteFilter !== 'all',
    !!debouncedSearch,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTradeFilter('all');
    setIdleFilter(false);
    setTeamLeaderFilter(false);
    setSupervisorFilter(false);
    setSiteFilter('all');
    setPage(1);
  };

  const openAddDialog = () => {
    setFormMode('add');
    setEditingEmployee(null);
    setFormPhoto(null);
    setFormData({
      fullName: '',
      employeeId: '',
      nationality: '',
      dateOfBirth: '',
      phone: '',
      email: '',
      address: '',
      emergencyContact: '',
      position: '',
      trade: '',
      joinDate: '',
      companyName: '',
      passportNumber: '',
      passportStatus: '',
      idNumber: '',
      idStatus: '',
      currentSite: '',
      isTeamLeader: false,
      teamLeaderSiteId: '',
      isSupervisor: false,
      supervisorSiteId: '',
    });
    setFormTab('personal');
    setShowNewSiteInput(false);
    setNewSiteName('');
    setFormDialogOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setFormMode('edit');
    setEditingEmployee(employee);
    setFormPhoto(employee.photo || null);
    setFormData({
      fullName: employee.fullName || '',
      employeeId: employee.employeeId || '',
      nationality: employee.nationality || '',
      dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
      phone: employee.phone || '',
      email: employee.email || '',
      address: employee.address || '',
      emergencyContact: employee.emergencyContact || '',
      position: employee.position || '',
      trade: employee.trade || employee.position || '',
      joinDate: employee.joinDate ? employee.joinDate.split('T')[0] : '',
      companyName: employee.companyName || '',
      passportNumber: employee.passportNumber || '',
      passportStatus: employee.passportStatus || '',
      idNumber: employee.idNumber || '',
      idStatus: employee.idStatus || '',
      currentSite: employee.currentSite || '',
      isTeamLeader: employee.isTeamLeader || false,
      teamLeaderSiteId: employee.teamLeaderSiteId || '',
      isSupervisor: employee.isSupervisor || false,
      supervisorSiteId: employee.supervisorSiteId || '',
    });
    setFormTab('personal');
    setShowNewSiteInput(false);
    setNewSiteName('');
    setFormDialogOpen(true);
  };

  const openDetailsDialog = async (employee: Employee) => {
    setViewingEmployee(employee);
    setDetailsDialogOpen(true);
    // Fetch full details
    try {
      const res = await fetch(`/api/employees/${employee.id}`);
      const json = await res.json();
      if (json.success) {
        setViewingEmployee(json.data.employee);
      }
    } catch {
      // use list data
    }
  };

  const openDeleteDialog = (employee: Employee) => {
    setDeletingEmployee(employee);
    setDeleteReason('');
    setDeleteDialogOpen(true);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Please select an image file (JPEG, PNG, WebP).', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Please select an image under 10 MB.', variant: 'destructive' });
      return;
    }
    setIsProcessingImage(true);
    try {
      const compressed = await compressImage(file, 300, 0.8);
      setFormPhoto(compressed);
    } catch {
      toast({ title: 'Upload Error', description: 'Failed to process the image. Please try another.', variant: 'destructive' });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handlePhotoRemove = () => {
    setFormPhoto(null);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateSite = async () => {
    if (!newSiteName.trim()) return;
    setIsCreatingSite(true);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSiteName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchSites();
        handleFormChange('currentSite', json.data.site.name);
        setShowNewSiteInput(false);
        setNewSiteName('');
        toast({ title: 'Success', description: 'Site created successfully' });
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to create site', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create site', variant: 'destructive' });
    } finally {
      setIsCreatingSite(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.fullName.trim()) {
      toast({ title: 'Validation Error', description: 'Full name is required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...formData,
        photo: formPhoto,
        // Send trade as both trade and position for backward compat
        trade: formData.trade || null,
        position: formData.trade || null,
        isTeamLeader: formData.isTeamLeader,
        teamLeaderSiteId: formData.isTeamLeader ? (formData.teamLeaderSiteId || null) : null,
        isSupervisor: formData.isSupervisor,
        supervisorSiteId: formData.isSupervisor ? (formData.supervisorSiteId || null) : null,
      };
      // Clear empty strings (but keep booleans)
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '' && key !== 'isTeamLeader' && key !== 'isSupervisor') payload[key] = null;
      });

      let res: Response;
      if (formMode === 'add') {
        res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/employees/${editingEmployee?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (json.success) {
        toast({
          title: formMode === 'add' ? 'Employee Created' : 'Employee Updated',
          description: `${formData.fullName} has been ${formMode === 'add' ? 'added' : 'updated'} successfully.`,
        });
        setFormDialogOpen(false);
        fetchEmployees();
      } else {
        toast({ title: 'Error', description: json.error || 'Operation failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEmployee || !user) return;
    setIsDeleting(true);
    try {
      if (user.role === 'super_admin') {
        // Super Admin: delete immediately
        const res = await fetch(`/api/employees/${deletingEmployee.id}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (json.success) {
          toast({
            title: 'Employee Deleted',
            description: `${deletingEmployee.fullName} has been permanently removed.`,
          });
          setDeleteDialogOpen(false);
          setDeletingEmployee(null);
          fetchEmployees();
        } else {
          toast({ title: 'Error', description: json.error || 'Failed to delete employee', variant: 'destructive' });
        }
      } else {
        // Admin: submit delete request for approval with reason
        const res = await fetch(`/api/employees/${deletingEmployee.id}/delete-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestedBy: user.id, reason: deleteReason.trim() || undefined }),
        });
        const json = await res.json();
        if (json.success) {
          toast({
            title: 'Delete Request Submitted',
            description: `${deletingEmployee.fullName} has been marked for deletion. Awaiting admin approval.`,
          });
          setDeleteDialogOpen(false);
          setDeletingEmployee(null);
          fetchEmployees();
        } else {
          toast({ title: 'Error', description: json.error || 'Failed to submit delete request', variant: 'destructive' });
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShareWhatsApp = async (employee: Employee) => {
    try {
      const doc = generateEmployeePDF(employee);
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], 'EMPLOYEE_DATA.pdf', { type: 'application/pdf' });

      // Try Web Share API first (supports file sharing to WhatsApp on mobile)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${employee.fullName} - Employee Data`,
          text: `Employee details for ${employee.fullName}`,
        });
      } else {
        // Fallback: download PDF and open WhatsApp
        doc.save('EMPLOYEE_DATA.pdf');
        window.open('https://wa.me/?text=' + encodeURIComponent(`Employee Details: ${employee.fullName} (${employee.employeeId})`), '_blank');
      }
    } catch (error) {
      console.error('PDF share error:', error);
      // Final fallback: just download
      const doc = generateEmployeePDF(employee);
      doc.save('EMPLOYEE_DATA.pdf');
    }
  };

  const handleDownloadPDF = (employee: Employee) => {
    const doc = generateEmployeePDF(employee);
    doc.save('EMPLOYEE_DATA.pdf');
  };

  // ── Pagination ──
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: (number | 'dots')[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('dots');
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('dots');
      pages.push(totalPages);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
        <p className="text-sm text-slate-400">
          Showing {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} of {total} employees
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pages.map((p, idx) =>
            p === 'dots' ? (
              <span key={`dots-${idx}`} className="px-1 text-slate-500">...</span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'ghost'}
                size="icon"
                className={
                  p === page
                    ? 'h-8 w-8 bg-blue-500 hover:bg-blue-600 text-white'
                    : 'h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700'
                }
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            )
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // ── Render ──

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Employee Management</h2>
          <p className="text-slate-400 mt-1">
            Manage your workforce, add new employees, and view profiles.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-blue-500 hover:bg-blue-600 text-white gap-2 self-start"
        >
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="bg-slate-800 border-slate-700 rounded-xl">
        <CardContent className="p-4 space-y-3">
          {/* Search row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, ID, nationality, phone, trade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-slate-900 border-slate-600 text-white h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_deletion">Pending Deletion</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tradeFilter} onValueChange={setTradeFilter}>
                <SelectTrigger className="w-[150px] bg-slate-900 border-slate-600 text-white h-9">
                  <SelectValue placeholder="Trade" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Trades</SelectItem>
                  {trades.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="w-[150px] bg-slate-900 border-slate-600 text-white h-9">
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggle filters row */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={idleFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIdleFilter(!idleFilter)}
              className={
                idleFilter
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30 h-8 gap-1.5'
                  : 'border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700 h-8 gap-1.5'
              }
            >
              <UserX className="h-3.5 w-3.5" />
              Idle Workers
            </Button>
            <Button
              variant={teamLeaderFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTeamLeaderFilter(!teamLeaderFilter)}
              className={
                teamLeaderFilter
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30 h-8 gap-1.5'
                  : 'border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700 h-8 gap-1.5'
              }
            >
              <Crown className="h-3.5 w-3.5" />
              Team Leaders
            </Button>
            <Button
              variant={supervisorFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSupervisorFilter(!supervisorFilter)}
              className={
                supervisorFilter
                  ? 'bg-violet-500/20 text-violet-400 border-violet-500/40 hover:bg-violet-500/30 h-8 gap-1.5'
                  : 'border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700 h-8 gap-1.5'
              }
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Supervisors
            </Button>

            {hasFilters && (
              <Button
                variant="ghost"
                onClick={resetFilters}
                className="h-8 text-slate-400 hover:text-white hover:bg-slate-700 gap-1.5 ml-auto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear All Filters
              </Button>
            )}
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Filter className="h-3.5 w-3.5 text-slate-500 mr-1" />
              {statusFilter !== 'all' && (
                <Badge
                  variant="outline"
                  className="bg-slate-900/50 border-slate-600 text-slate-300 gap-1 cursor-pointer hover:bg-slate-700/50"
                  onClick={() => setStatusFilter('all')}
                >
                  Status: {statusFilter === 'active' ? 'Active' : 'Pending Deletion'}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {tradeFilter !== 'all' && (
                <Badge
                  variant="outline"
                  className="bg-slate-900/50 border-slate-600 text-slate-300 gap-1 cursor-pointer hover:bg-slate-700/50"
                  onClick={() => setTradeFilter('all')}
                >
                  Trade: {tradeFilter}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {idleFilter && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 border-amber-500/30 text-amber-400 gap-1 cursor-pointer hover:bg-amber-500/20"
                  onClick={() => setIdleFilter(false)}
                >
                  Idle Workers
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {teamLeaderFilter && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 border-amber-500/30 text-amber-400 gap-1 cursor-pointer hover:bg-amber-500/20"
                  onClick={() => setTeamLeaderFilter(false)}
                >
                  Team Leaders
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {supervisorFilter && (
                <Badge
                  variant="outline"
                  className="bg-violet-500/10 border-violet-500/30 text-violet-400 gap-1 cursor-pointer hover:bg-violet-500/20"
                  onClick={() => setSupervisorFilter(false)}
                >
                  Supervisors
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {siteFilter !== 'all' && (
                <Badge
                  variant="outline"
                  className="bg-slate-900/50 border-slate-600 text-slate-300 gap-1 cursor-pointer hover:bg-slate-700/50"
                  onClick={() => setSiteFilter('all')}
                >
                  Site: {siteFilter}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {debouncedSearch && (
                <Badge
                  variant="outline"
                  className="bg-slate-900/50 border-slate-600 text-slate-300 gap-1 cursor-pointer hover:bg-slate-700/50"
                  onClick={() => { setSearchQuery(''); setDebouncedSearch(''); }}
                >
                  Search: {debouncedSearch}
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card className="bg-slate-800 border-slate-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : employees.length === 0 ? (
          <EmptyState hasFilters={!!hasFilters} />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-medium">Employee</TableHead>
                    <TableHead className="text-slate-400 font-medium">Employee ID</TableHead>
                    <TableHead className="text-slate-400 font-medium">Trade</TableHead>
                    <TableHead className="text-slate-400 font-medium">Site</TableHead>
                    <TableHead className="text-slate-400 font-medium">Rating</TableHead>
                    <TableHead className="text-slate-400 font-medium">Status</TableHead>
                    <TableHead className="text-slate-400 font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                      onClick={() => openDetailsDialog(emp)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={emp.fullName} photo={emp.photo} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium text-white">{emp.fullName}</p>
                              {emp.isTeamLeader && (
                                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px] px-1.5 py-0 shrink-0">
                                  <Crown className="h-2.5 w-2.5 mr-0.5" />
                                  Team Leader
                                </Badge>
                              )}
                              {emp.isSupervisor && (
                                <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/25 text-[10px] px-1.5 py-0 shrink-0">
                                  <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                                  Supervisor
                                </Badge>
                              )}
                            </div>
                            {emp.nationality && (
                              <p className="text-xs text-slate-500">{emp.nationality}</p>
                            )}
                            {emp.isTeamLeader && emp.teamLeaderSiteId && (() => {
                              const leadSite = sites.find(s => s.id === emp.teamLeaderSiteId);
                              return leadSite ? (
                                <p className="text-[10px] text-amber-400/70">Leads: {leadSite.name}</p>
                              ) : null;
                            })()}
                            {emp.isSupervisor && emp.supervisorSiteId && (() => {
                              const supSite = sites.find(s => s.id === emp.supervisorSiteId);
                              return supSite ? (
                                <p className="text-[10px] text-violet-400/70">Supervises: {supSite.name}</p>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-300 font-mono">{emp.employeeId}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-300">{emp.trade || emp.position || '—'}</span>
                      </TableCell>
                      <TableCell>
                        {emp.currentSite === 'Idle' ? (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-xs">
                            Idle
                          </Badge>
                        ) : (
                          <span className="text-sm text-slate-300">{emp.currentSite || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StarRating rating={emp.rating} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={emp.status} />
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                            onClick={() => openDetailsDialog(emp)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                            onClick={() => openEditDialog(emp)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {emp.status !== 'pending_deletion' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => openDeleteDialog(emp)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-700/50">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="p-4 hover:bg-slate-700/20 cursor-pointer transition-colors"
                  onClick={() => openDetailsDialog(emp)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <EmployeeAvatar name={emp.fullName} photo={emp.photo} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-white">{emp.fullName}</p>
                          {emp.isTeamLeader && (
                            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px] px-1.5 py-0 shrink-0">
                              <Crown className="h-2.5 w-2.5 mr-0.5" />
                              Team Leader
                            </Badge>
                          )}
                          {emp.isSupervisor && (
                            <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/25 text-[10px] px-1.5 py-0 shrink-0">
                              <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                              Supervisor
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">{emp.employeeId}</p>
                        {emp.isTeamLeader && emp.teamLeaderSiteId && (() => {
                          const leadSite = sites.find(s => s.id === emp.teamLeaderSiteId);
                          return leadSite ? (
                            <p className="text-[10px] text-amber-400/70">Leads: {leadSite.name}</p>
                          ) : null;
                        })()}
                        {emp.isSupervisor && emp.supervisorSiteId && (() => {
                          const supSite = sites.find(s => s.id === emp.supervisorSiteId);
                          return supSite ? (
                            <p className="text-[10px] text-violet-400/70">Supervises: {supSite.name}</p>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <StatusBadge status={emp.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="text-xs text-slate-500">Trade</p>
                      <p className="text-sm text-slate-300">{emp.trade || emp.position || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Site</p>
                      <p className="text-sm text-slate-300">
                        {emp.currentSite === 'Idle' ? (
                          <span className="text-amber-400">Idle</span>
                        ) : (
                          emp.currentSite || '—'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <StarRating rating={emp.rating} />
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-blue-400"
                        onClick={() => openDetailsDialog(emp)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-amber-400"
                        onClick={() => openEditDialog(emp)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {emp.status !== 'pending_deletion' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-400"
                          onClick={() => openDeleteDialog(emp)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {renderPagination()}
          </>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          ADD / EDIT EMPLOYEE DIALOG
         ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-white text-lg">
                {formMode === 'add' ? 'Add New Employee' : 'Edit Employee'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {formMode === 'add'
                  ? 'Fill in the details below to add a new employee.'
                  : `Editing ${editingEmployee?.fullName}`}
              </DialogDescription>
            </DialogHeader>
          </div>

          <Tabs value={formTab} onValueChange={setFormTab} className="w-full px-6">
            <TabsList className="bg-slate-900/50 w-full">
              <TabsTrigger value="personal" className="flex-1 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
                <User className="h-3.5 w-3.5 mr-1.5" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="professional" className="flex-1 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
                <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                Work
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="max-h-[50vh] mt-4 pr-2">
              {/* Personal Details Tab */}
              <TabsContent value="personal" className="space-y-4 pb-4">
                {/* Photo Upload */}
                <div className="flex flex-col items-center gap-3 sm:col-span-2">
                  <Label className="text-slate-300 text-sm self-start">Employee Photo</Label>
                  <div className="flex items-center gap-4 w-full">
                    {formPhoto ? (
                      <div className="relative group">
                        <div className="h-24 w-24 rounded-xl overflow-hidden border-2 border-slate-600 bg-slate-900 flex items-center justify-center">
                          <img src={formPhoto} alt="Employee photo" className="h-full w-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={handlePhotoRemove}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files[0];
                          if (file) handlePhotoUpload(file);
                        }}
                        className="h-24 w-24 rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/50 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/50 transition-colors gap-1"
                      >
                        {isProcessingImage ? (
                          <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
                        ) : (
                          <>
                            <Camera className="h-6 w-6 text-slate-500" />
                            <span className="text-[10px] text-slate-500">Upload</span>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingImage}
                      >
                        {isProcessingImage ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Processing...</>
                        ) : formPhoto ? (
                          <><ImagePlus className="h-3.5 w-3.5 mr-1.5" /> Change Photo</>
                        ) : (
                          <><Upload className="h-3.5 w-3.5 mr-1.5" /> Choose Photo</>
                        )}
                      </Button>
                      <p className="text-xs text-slate-500 mt-1.5">
                        {formPhoto ? 'Photo added. Click × to remove.' : 'JPEG, PNG or WebP. Max 10 MB.'}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-700/50" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-slate-300 text-sm">
                      Full Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Ahmed Mohammed Al-Rashid"
                      value={formData.fullName}
                      onChange={(e) => handleFormChange('fullName', e.target.value)}
                      className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">
                      Employee ID <span className="text-slate-500 font-normal text-xs">(Leave empty to auto-generate)</span>
                    </Label>
                    <Input
                      placeholder="Leave empty to auto-generate (e.g. ASM-2025-001)"
                      value={formData.employeeId}
                      onChange={(e) => handleFormChange('employeeId', e.target.value)}
                      className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 font-mono"
                    />
                  </div>

                  {/* Nationality field with searchable dropdown */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">Nationality</Label>
                    <SearchableNationalitySelect
                      value={formData.nationality}
                      onChange={(val) => handleFormChange('nationality', val)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">Date of Birth</Label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleFormChange('dateOfBirth', e.target.value)}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="+966 5xx xxx xxxx"
                        value={formData.phone}
                        onChange={(e) => handleFormChange('phone', e.target.value)}
                        className="pl-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        type="email"
                        placeholder="employee@example.com"
                        value={formData.email}
                        onChange={(e) => handleFormChange('email', e.target.value)}
                        className="pl-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">Emergency Contact</Label>
                    <div className="relative">
                      <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="Emergency contact info"
                        value={formData.emergencyContact}
                        onChange={(e) => handleFormChange('emergencyContact', e.target.value)}
                        className="pl-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Textarea
                      placeholder="Full address"
                      value={formData.address}
                      onChange={(e) => handleFormChange('address', e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Professional / Work Details Tab */}
              <TabsContent value="professional" className="space-y-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">Trade</Label>
                    <SearchableTradeSelect
                      value={formData.trade}
                      onChange={(val) => handleFormChange('trade', val)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">Join Date</Label>
                    <Input
                      type="date"
                      value={formData.joinDate}
                      onChange={(e) => handleFormChange('joinDate', e.target.value)}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">Company Name</Label>
                    <Input
                      placeholder="Company / Contractor name"
                      value={formData.companyName}
                      onChange={(e) => handleFormChange('companyName', e.target.value)}
                      className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-slate-300 text-sm">Current Working Site</Label>
                    {!showNewSiteInput ? (
                      <Select
                        value={formData.currentSite || '__none__'}
                        onValueChange={(v) => {
                          if (v === '__new__') {
                            setShowNewSiteInput(true);
                          } else if (v === '__idle__') {
                            handleFormChange('currentSite', 'Idle');
                          } else if (v === '__none__') {
                            handleFormChange('currentSite', '');
                          } else {
                            handleFormChange('currentSite', v);
                          }
                        }}
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-600 text-white w-full">
                          <SelectValue placeholder="Select a site" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {!formData.currentSite && (
                            <SelectItem value="__none__">
                              <span className="text-slate-500">No site assigned</span>
                            </SelectItem>
                          )}
                          <SelectItem value="__idle__">
                            <span className="text-amber-400">🟡 Idle</span>
                          </SelectItem>
                          {sites.map((s) => (
                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                          ))}
                          <SelectItem value="__new__">
                            <span className="text-green-400">+ Add New Site</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter new site name"
                          value={newSiteName}
                          onChange={(e) => setNewSiteName(e.target.value)}
                          className="flex-1 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateSite()}
                        />
                        <Button
                          onClick={handleCreateSite}
                          disabled={isCreatingSite || !newSiteName.trim()}
                          className="bg-green-500 hover:bg-green-600 text-white"
                          size="sm"
                        >
                          {isCreatingSite ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => { setShowNewSiteInput(false); setNewSiteName(''); }}
                          className="text-slate-400 hover:text-white"
                          size="icon"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="bg-slate-700/50" />

                {/* Team Leader Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Team Leader
                  </h4>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                    <div>
                      <Label className="text-slate-300 text-sm">Team Leader</Label>
                      <p className="text-xs text-slate-500">Designate this employee as a team leader</p>
                    </div>
                    <Switch
                      checked={formData.isTeamLeader}
                      onCheckedChange={(checked) => {
                        setFormData((prev) => ({
                          ...prev,
                          isTeamLeader: checked,
                          teamLeaderSiteId: checked ? prev.teamLeaderSiteId : '',
                        }));
                      }}
                    />
                  </div>
                  {formData.isTeamLeader && (
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Lead Site</Label>
                      <Select
                        value={formData.teamLeaderSiteId || '__none__'}
                        onValueChange={(v) => {
                          handleFormChange('teamLeaderSiteId', v === '__none__' ? '' : v);
                        }}
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-600 text-white w-full">
                          <SelectValue placeholder="Select which site they lead" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="__none__">
                            <span className="text-slate-500">No specific site</span>
                          </SelectItem>
                          {sites.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">Select the site this employee is the team leader of.</p>
                    </div>
                  )}
                </div>

                <Separator className="bg-slate-700/50" />

                {/* Supervisor Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-violet-400" />
                    Supervisor
                  </h4>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                    <div>
                      <Label className="text-slate-300 text-sm">Supervisor</Label>
                      <p className="text-xs text-slate-500">Designate this employee as a supervisor</p>
                    </div>
                    <Switch
                      checked={formData.isSupervisor}
                      onCheckedChange={(checked) => {
                        setFormData((prev) => ({
                          ...prev,
                          isSupervisor: checked,
                          supervisorSiteId: checked ? prev.supervisorSiteId : '',
                        }));
                      }}
                    />
                  </div>
                  {formData.isSupervisor && (
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Supervise Site</Label>
                      <Select
                        value={formData.supervisorSiteId || '__none__'}
                        onValueChange={(v) => {
                          handleFormChange('supervisorSiteId', v === '__none__' ? '' : v);
                        }}
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-600 text-white w-full">
                          <SelectValue placeholder="Select which site they supervise" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="__none__">
                            <span className="text-slate-500">No specific site</span>
                          </SelectItem>
                          {sites.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">Select the site this employee supervises.</p>
                    </div>
                  )}
                </div>

                <Separator className="bg-slate-700/50" />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Document Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Passport Number</Label>
                      <Input
                        placeholder="Passport number"
                        value={formData.passportNumber}
                        onChange={(e) => handleFormChange('passportNumber', e.target.value)}
                        className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Passport Status</Label>
                      <Select value={formData.passportStatus} onValueChange={(v) => handleFormChange('passportStatus', v)}>
                        <SelectTrigger className="bg-slate-900 border-slate-600 text-white w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="Valid">
                            <span className="text-green-400">✓ Valid</span>
                          </SelectItem>
                          <SelectItem value="Expired">
                            <span className="text-red-400">✗ Expired</span>
                          </SelectItem>
                          <SelectItem value="N/A">
                            <span className="text-slate-400">N/A</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">ID Number</Label>
                      <Input
                        placeholder="National ID number"
                        value={formData.idNumber}
                        onChange={(e) => handleFormChange('idNumber', e.target.value)}
                        className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">ID Status</Label>
                      <Select value={formData.idStatus} onValueChange={(v) => handleFormChange('idStatus', v)}>
                        <SelectTrigger className="bg-slate-900 border-slate-600 text-white w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="Valid">
                            <span className="text-green-400">✓ Valid</span>
                          </SelectItem>
                          <SelectItem value="Expired">
                            <span className="text-red-400">✗ Expired</span>
                          </SelectItem>
                          <SelectItem value="N/A">
                            <span className="text-slate-400">N/A</span>
                          </SelectItem>
                          </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Rating display (read-only, auto-calculated) */}
                {formMode === 'edit' && editingEmployee && (
                  <>
                    <Separator className="bg-slate-700/50" />
                    <div className="flex items-center gap-3">
                      <Star className="h-4 w-4 text-amber-400" />
                      <Label className="text-slate-300 text-sm">Performance Rating</Label>
                      <StarRating rating={editingEmployee.rating} size="md" />
                      <span className="text-xs text-slate-500">(auto-calculated from attendance)</span>
                    </div>
                  </>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/80 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setFormDialogOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              {formTab === 'professional' && (
                <Button
                  variant="outline"
                  onClick={() => setFormTab('personal')}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Back
                </Button>
              )}
              {formTab === 'personal' ? (
                <Button
                  onClick={() => setFormTab('professional')}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.fullName.trim()}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {formMode === 'add' ? 'Creating...' : 'Saving...'}
                    </>
                  ) : (
                    formMode === 'add' ? 'Create Employee' : 'Save Changes'
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          EMPLOYEE DETAILS DIALOG
         ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">{viewingEmployee ? `Employee Details - ${viewingEmployee.fullName}` : 'Employee Details'}</DialogTitle>
          <DialogDescription className="sr-only">{viewingEmployee ? `Details for ${viewingEmployee.fullName} (${viewingEmployee.employeeId})` : 'View employee information'}</DialogDescription>
          {viewingEmployee && (
            <>
              {/* Header */}
              <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-slate-800 to-slate-800/80">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      {viewingEmployee.photo ? (
                        <img
                          src={viewingEmployee.photo}
                          alt={viewingEmployee.fullName}
                          className="h-full w-full rounded-xl object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-blue-400">
                          {viewingEmployee.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-white">{viewingEmployee.fullName}</h3>
                        {viewingEmployee.isTeamLeader && (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px] px-1.5 py-0 shrink-0">
                            <Crown className="h-2.5 w-2.5 mr-0.5" />
                            Team Leader
                          </Badge>
                        )}
                        {viewingEmployee.isSupervisor && (
                          <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/25 text-[10px] px-1.5 py-0 shrink-0">
                            <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                            Supervisor
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 font-mono">{viewingEmployee.employeeId}</p>
                      <div className="mt-1">
                        <StatusBadge status={viewingEmployee.status} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                      onClick={() => {
                        setDetailsDialogOpen(false);
                        openEditDialog(viewingEmployee);
                      }}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {viewingEmployee.status !== 'pending_deletion' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => {
                          setDetailsDialogOpen(false);
                          openDeleteDialog(viewingEmployee);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="max-h-[65vh]">
                <div className="px-6 py-4 space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-400" />
                      Personal Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { icon: Globe, label: 'Nationality', value: viewingEmployee.nationality },
                        { icon: Calendar, label: 'Date of Birth', value: viewingEmployee.dateOfBirth ? new Date(viewingEmployee.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null },
                        { icon: Phone, label: 'Phone', value: viewingEmployee.phone },
                        { icon: Mail, label: 'Email', value: viewingEmployee.email },
                        { icon: AlertTriangle, label: 'Emergency Contact', value: viewingEmployee.emergencyContact },
                        { icon: MapPin, label: 'Address', value: viewingEmployee.address },
                      ].map((item) => (
                        <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50">
                          <item.icon className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-slate-500">{item.label}</p>
                            <p className="text-sm text-slate-200 break-all">{item.value || '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-slate-700/50" />

                  {/* Professional Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-blue-400" />
                      Professional Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { icon: Briefcase, label: 'Trade', value: viewingEmployee.trade || viewingEmployee.position },
                        { icon: Calendar, label: 'Join Date', value: viewingEmployee.joinDate ? new Date(viewingEmployee.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null },
                        { icon: Building2, label: 'Company', value: viewingEmployee.companyName },
                        { icon: Building2, label: 'Current Site', value: viewingEmployee.currentSite, special: viewingEmployee.currentSite === 'Idle' ? 'amber' : undefined },
                      ].map((item) => (
                        <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50">
                          <item.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${item.special === 'amber' ? 'text-amber-400' : 'text-slate-500'}`} />
                          <div>
                            <p className="text-xs text-slate-500">{item.label}</p>
                            <p className={`text-sm ${item.special === 'amber' ? 'text-amber-400' : 'text-slate-200'}`}>
                              {item.value || '—'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-slate-700/50" />

                  {/* Team Leader Status */}
                  {viewingEmployee.isTeamLeader && (
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-400" />
                        Team Leader
                      </h4>
                      <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
                            <Crown className="h-5 w-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-amber-300">
                              Team Leader
                              {viewingEmployee.teamLeaderSiteId && (() => {
                                const leadSite = sites.find(s => s.id === viewingEmployee.teamLeaderSiteId);
                                return leadSite ? ` of ${leadSite.name}` : '';
                              })()}
                            </p>
                            <p className="text-xs text-amber-400/60">This employee is designated as a team leader</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Supervisor Status */}
                  {viewingEmployee.isSupervisor && (
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-violet-400" />
                        Supervisor
                      </h4>
                      <div className="p-4 rounded-lg bg-violet-500/5 border border-violet-500/20">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15">
                            <ShieldCheck className="h-5 w-5 text-violet-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-violet-300">
                              Supervisor
                              {viewingEmployee.supervisorSiteId && (() => {
                                const supSite = sites.find(s => s.id === viewingEmployee.supervisorSiteId);
                                return supSite ? ` of ${supSite.name}` : '';
                              })()}
                            </p>
                            <p className="text-xs text-violet-400/60">This employee is designated as a supervisor</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator className="bg-slate-700/50" />

                  {/* Document Details */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-400" />
                      Document Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-slate-900/50">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-slate-500">Passport Number</p>
                          {viewingEmployee.passportStatus && (
                            <Badge className={`text-[10px] px-1.5 py-0 ${
                              viewingEmployee.passportStatus === 'Valid'
                                ? 'bg-green-500/15 text-green-400 border-green-500/25'
                                : viewingEmployee.passportStatus === 'Expired'
                                  ? 'bg-red-500/15 text-red-400 border-red-500/25'
                                  : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                            }`}>
                              {viewingEmployee.passportStatus}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-200 font-mono">{viewingEmployee.passportNumber || '—'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900/50">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-slate-500">ID Number</p>
                          {viewingEmployee.idStatus && (
                            <Badge className={`text-[10px] px-1.5 py-0 ${
                              viewingEmployee.idStatus === 'Valid'
                                ? 'bg-green-500/15 text-green-400 border-green-500/25'
                                : viewingEmployee.idStatus === 'Expired'
                                  ? 'bg-red-500/15 text-red-400 border-red-500/25'
                                  : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                            }`}>
                              {viewingEmployee.idStatus}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-200 font-mono">{viewingEmployee.idNumber || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-700/50" />

                  {/* Rating */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-400" />
                      Performance Rating
                    </h4>
                    <div className="p-4 rounded-lg bg-slate-900/50">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-3xl font-bold text-white">{viewingEmployee.rating.toFixed(1)}</span>
                          <span className="text-xs text-slate-500">out of 5.0</span>
                        </div>
                        <Separator orientation="vertical" className="h-12 bg-slate-700/50" />
                        <div className="flex-1">
                          <StarRating rating={viewingEmployee.rating} size="lg" />
                          <p className="text-xs text-slate-500 mt-1">
                            Calculated from attendance records
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created: {new Date(viewingEmployee.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated: {new Date(viewingEmployee.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </ScrollArea>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/80 flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  className="text-slate-400 hover:text-white hover:bg-slate-700 gap-1.5"
                  onClick={() => handleShareWhatsApp(viewingEmployee)}
                >
                  <MessageCircle className="h-4 w-4 text-green-400" />
                  Share via WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  className="text-slate-400 hover:text-white hover:bg-slate-700 gap-1.5"
                  onClick={() => handleDownloadPDF(viewingEmployee)}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1.5"
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    openEditDialog(viewingEmployee);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION DIALOG
         ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <DialogTitle className="text-white">
                {user?.role === 'super_admin' ? 'Delete Employee' : 'Request Employee Deletion'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-400">
              Are you sure you want to{' '}
              {user?.role === 'super_admin' ? 'delete' : 'request deletion for'}{' '}
              <span className="text-white font-medium">{deletingEmployee?.fullName}</span>
              {' '}({deletingEmployee?.employeeId})?
              <br />
              {user?.role === 'super_admin' ? (
                <span className="mt-1 block">This action cannot be undone. The employee will be permanently removed.</span>
              ) : (
                <span className="mt-1 block">A super admin will review and approve this request.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {user?.role !== 'super_admin' && (
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Reason for deletion</Label>
              <Textarea
                placeholder="Provide a reason for deleting this employee..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px] resize-none"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {user?.role === 'super_admin' ? 'Deleting...' : 'Submitting...'}
                </>
              ) : (
                user?.role === 'super_admin' ? 'Delete Employee' : 'Request Deletion'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
