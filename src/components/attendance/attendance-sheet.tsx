'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { ArrowLeft, Download, Printer, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

/* ───────── Types ───────── */
interface AttendanceSheetProps {
  site: {
    id: string;
    name: string;
    clientName?: string | null;
    projectName?: string | null;
  };
  employees: Array<{
    id: string;
    fullName: string;
    employeeId: string;
    position: string | null;
    isTeamLeader: boolean;
    currentSite: string | null;
  }>;
  onClose: () => void;
}

/* ───────── Constants ───────── */
const MIN_ROWS = 25;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PRINT_MARGIN_MM = 15;

/* ───────── Helpers ───────── */
function formatDateDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseDateInput(value: string): Date {
  const parts = value.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    if (day && month && year) return new Date(year, month - 1, day);
  }
  return new Date();
}

/* ───────── Inline Editable Cell ───────── */
function EditableCell({
  value,
  onChange,
  className,
  align = 'left',
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  align?: 'left' | 'center';
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full bg-transparent border-none outline-none text-inherit font-inherit',
        'hover:bg-blue-50/60 focus:bg-blue-50/80 focus:outline-1 focus:outline-blue-300',
        'transition-colors rounded px-1 -mx-1 cursor-text',
        align === 'center' && 'text-center',
        className
      )}
    />
  );
}

/* ───────── Main Component ───────── */
export function AttendanceSheet({ site, employees, onClose }: AttendanceSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [dateInput, setDateInput] = useState(formatDateDisplay(new Date()));
  const [isGenerating, setIsGenerating] = useState(false);

  // Editable info fields
  const [clientName, setClientName] = useState(site.clientName || '');
  const [projectName, setProjectName] = useState(site.projectName || site.name);
  const [strengthInput, setStrengthInput] = useState(String(employees.length));

  // Editable employee data - CODE column starts EMPTY
  const [employeeData, setEmployeeData] = useState(() =>
    employees.map((emp) => ({
      id: emp.id,
      fullName: emp.fullName,
      code: '', // CODE column is empty by default
      position: emp.position || '',
      isTeamLeader: emp.isTeamLeader,
      isSupervisor: emp.position?.toLowerCase().includes('supervisor') ?? false,
    }))
  );

  // Sort employees: Team Leader first, then Supervisor, then rest alphabetically
  const sortedEmployees = useMemo(() => {
    return [...employeeData].sort((a, b) => {
      if (a.isTeamLeader && !b.isTeamLeader) return -1;
      if (!a.isTeamLeader && b.isTeamLeader) return 1;
      if (a.isSupervisor && !b.isSupervisor) return -1;
      if (!a.isSupervisor && b.isSupervisor) return 1;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [employeeData]);

  // Update employee field
  const updateEmployee = useCallback(
    (id: string, field: 'fullName' | 'code' | 'position' | 'serialNo', value: string) => {
      setEmployeeData((prev) =>
        prev.map((emp) =>
          emp.id === id
            ? {
                ...emp,
                [field]: value,
                isSupervisor:
                  field === 'position' ? value.toLowerCase().includes('supervisor') : emp.isSupervisor,
              }
            : emp
        )
      );
    },
    []
  );

  // Handle date input change
  const handleDateChange = useCallback((value: string) => {
    setDateInput(value);
    const parsed = parseDateInput(value);
    if (!isNaN(parsed.getTime())) {
      setDate(parsed);
    }
  }, []);

  // Get display trade for employee
  const getDisplayTrade = useCallback((emp: (typeof sortedEmployees)[0]) => {
    const pos = emp.position || '';
    if (emp.isTeamLeader) {
      return pos ? `${pos} / TEAM LEADER` : 'TEAM LEADER';
    }
    if (emp.isSupervisor) {
      return pos ? `${pos} / SUPERVISOR` : 'SUPERVISOR';
    }
    return pos;
  }, []);

  // Download PDF - Portrait A4
  const handleDownloadPDF = useCallback(async () => {
    if (!sheetRef.current || isGenerating) return;
    setIsGenerating(true);

    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 10; // 10mm margin on each side

      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // If the content is taller than the page, scale it down
      const availableHeight = pageHeight - margin * 2;
      let finalImgWidth = imgWidth;
      let finalImgHeight = imgHeight;

      if (finalImgHeight > availableHeight) {
        const scaleFactor = availableHeight / finalImgHeight;
        finalImgHeight = availableHeight;
        finalImgWidth = imgWidth * scaleFactor;
      }

      // Center horizontally
      const xOffset = (pageWidth - finalImgWidth) / 2;
      const yOffset = margin;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalImgWidth, finalImgHeight);

      const fileName = `attendance-${site.name.replace(/\s+/g, '-')}-${date.toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, site.name, date]);

  // Print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const displayStrength = strengthInput || String(sortedEmployees.length);
  const emptyRowsCount = Math.max(0, MIN_ROWS - sortedEmployees.length);

  return (
    <>
      {/* Print-specific styles - A4 Portrait with proper margins */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: ${PRINT_MARGIN_MM}mm;
          }
          body * {
            visibility: hidden;
          }
          #attendance-sheet-printable,
          #attendance-sheet-printable * {
            visibility: visible;
          }
          #attendance-sheet-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: white;
            box-shadow: none !important;
            border: none !important;
          }
          #attendance-toolbar {
            display: none !important;
          }
          #attendance-overlay-bg {
            background: white !important;
          }
        }
      `}</style>

      <div
        id="attendance-overlay-bg"
        className="fixed inset-0 z-50 bg-gray-200 flex flex-col overflow-hidden"
      >
        {/* Toolbar */}
        <div
          id="attendance-toolbar"
          className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-300 shadow-sm shrink-0 print:hidden"
        >
          {/* Black Back Button - highly visible */}
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="gap-1.5 bg-black text-white hover:bg-gray-800 border-none shadow-md font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>

          <div className="h-5 w-px bg-gray-300 mx-1" />

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Input
              type="text"
              value={dateInput}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-8 w-32 text-sm font-mono"
              placeholder="DD/MM/YYYY"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="gap-1.5"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
            </Button>

            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* Sheet Container */}
        <div className="flex-1 overflow-auto flex justify-center py-6 px-4">
          <div
            id="attendance-sheet-printable"
            ref={sheetRef}
            className="bg-white shadow-xl border border-gray-300 w-full"
            style={{ maxWidth: `${A4_WIDTH_MM}mm`, minHeight: `${A4_HEIGHT_MM}mm` }}
          >
            {/* ─── Header Section ─── */}
            <div className="relative px-8 pt-6 pb-0">
              {/* Logo */}
              <div className="absolute top-4 right-8">
                <img
                  src="/logo_asm.png"
                  alt="ASM Logo"
                  className="h-14 w-auto object-contain"
                  crossOrigin="anonymous"
                />
              </div>

              {/* Company Name */}
              <h1 className="text-[22px] font-bold text-center text-gray-900 tracking-wide">
                ARABIAN SHIELD MANPOWER
              </h1>

              {/* Title Bar */}
              <div className="mt-2 bg-gray-800 text-white text-center py-2 text-sm font-bold tracking-[0.2em]">
                DAILY ATTENDANCE
              </div>
            </div>

            {/* ─── Info Section ─── */}
            <div className="px-8 mt-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex items-baseline">
                  <span className="font-bold text-gray-800 w-36 shrink-0 text-[13px]">
                    CLIENT NAME:
                  </span>
                  <span className="flex-1 border-b border-gray-400">
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-gray-700 text-[13px] hover:bg-blue-50/60 focus:bg-blue-50/80 focus:outline-1 focus:outline-blue-300 transition-colors rounded px-1 -mx-1 cursor-text py-0.5"
                    />
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold text-gray-800 w-32 shrink-0 text-[13px]">DATE:</span>
                  <span className="flex-1 border-b border-gray-400">
                    <input
                      type="text"
                      value={dateInput}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-gray-700 text-[13px] font-mono hover:bg-blue-50/60 focus:bg-blue-50/80 focus:outline-1 focus:outline-blue-300 transition-colors rounded px-1 -mx-1 cursor-text py-0.5"
                    />
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold text-gray-800 w-36 shrink-0 text-[13px]">
                    PROJECT NAME:
                  </span>
                  <span className="flex-1 border-b border-gray-400">
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-gray-700 text-[13px] hover:bg-blue-50/60 focus:bg-blue-50/80 focus:outline-1 focus:outline-blue-300 transition-colors rounded px-1 -mx-1 cursor-text py-0.5"
                    />
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold text-gray-800 w-32 shrink-0 text-[13px]">
                    STRENGTH:
                  </span>
                  <span className="flex-1 border-b border-gray-400">
                    <input
                      type="text"
                      value={strengthInput}
                      onChange={(e) => setStrengthInput(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-gray-700 text-[13px] font-semibold hover:bg-blue-50/60 focus:bg-blue-50/80 focus:outline-1 focus:outline-blue-300 transition-colors rounded px-1 -mx-1 cursor-text py-0.5"
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Attendance Table ─── */}
            <div className="px-8 mt-5 pb-6">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="border border-gray-900 px-2 py-2 text-center font-bold w-12">
                      Sl. No
                    </th>
                    <th className="border border-gray-900 px-2 py-2 text-left font-bold">NAME</th>
                    <th className="border border-gray-900 px-2 py-2 text-center font-bold w-24">
                      CODE
                    </th>
                    <th className="border border-gray-900 px-2 py-2 text-left font-bold w-44">
                      TRADE
                    </th>
                    <th className="border border-gray-900 px-2 py-2 text-center font-bold w-36">
                      SIGNATURE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEmployees.map((emp, index) => (
                    <tr
                      key={emp.id}
                      className={cn(
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70',
                        emp.isTeamLeader && 'bg-amber-50/50',
                        emp.isSupervisor && !emp.isTeamLeader && 'bg-blue-50/40'
                      )}
                    >
                      <td className="border border-gray-400 px-2 py-1 text-center text-gray-700">
                        <EditableCell
                          value={String(index + 1)}
                          onChange={(val) => {
                            // Allow editing serial number
                          }}
                          className="py-0.5 text-gray-700 text-[13px]"
                          align="center"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0">
                        <EditableCell
                          value={emp.fullName}
                          onChange={(val) => updateEmployee(emp.id, 'fullName', val)}
                          className="py-0.5 text-gray-900 font-medium text-[13px]"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0 text-center">
                        <EditableCell
                          value={emp.code}
                          onChange={(val) => updateEmployee(emp.id, 'code', val)}
                          className="py-0.5 text-gray-700 text-center font-mono text-[13px]"
                          align="center"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0">
                        <EditableCell
                          value={getDisplayTrade(emp)}
                          onChange={(val) => {
                            // Only update the position part before the " / " suffix
                            const baseVal = val.replace(/ \/ (TEAM LEADER|SUPERVISOR)$/, '');
                            updateEmployee(emp.id, 'position', baseVal);
                          }}
                          className="py-0.5 text-gray-700 uppercase text-[11px]"
                        />
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center">
                        {/* Empty for signature - editable */}
                        <EditableCell
                          value=""
                          onChange={() => {}}
                          className="py-0.5 text-[13px]"
                          align="center"
                        />
                      </td>
                    </tr>
                  ))}

                  {/* Fill remaining rows to ensure minimum table height */}
                  {Array.from({ length: emptyRowsCount }).map((_, i) => (
                    <tr key={`empty-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                      <td className="border border-gray-400 px-2 py-1 text-center text-gray-400">
                        {sortedEmployees.length + i + 1}
                      </td>
                      <td className="border border-gray-400 px-1 py-0">
                        <EditableCell
                          value=""
                          onChange={() => {}}
                          className="py-0.5 text-[13px]"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0 text-center">
                        <EditableCell
                          value=""
                          onChange={() => {}}
                          className="py-0.5 text-[13px]"
                          align="center"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0">
                        <EditableCell
                          value=""
                          onChange={() => {}}
                          className="py-0.5 text-[11px]"
                        />
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center">
                        <EditableCell
                          value=""
                          onChange={() => {}}
                          className="py-0.5 text-[13px]"
                          align="center"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Footer TOTAL row */}
                <tfoot>
                  <tr className="bg-gray-800 text-white font-bold">
                    <td className="border border-gray-900 px-2 py-2 text-center" colSpan={4}>
                      TOTAL
                    </td>
                    <td className="border border-gray-900 px-2 py-2 text-center">
                      {displayStrength}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
