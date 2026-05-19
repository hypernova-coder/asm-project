'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { ArrowLeft, Download, Printer, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
// A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PRINT_MARGIN_MM = 12;

// How many employee rows fit per A4 page (empirical for 13px font with borders)
const ROWS_PER_PAGE = 28;
const EXTRA_ROWS = 5; // extra blank rows after employees

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

/** Force uppercase for display */
function upper(val: string): string {
  return val.toUpperCase();
}

/* ───────── Inline Editable Cell ───────── */
function EditableCell({
  value,
  onChange,
  className,
  align = 'left',
  uppercase: forceUppercase = false,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  align?: 'left' | 'center';
  uppercase?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(forceUppercase ? e.target.value.toUpperCase() : e.target.value)}
      className={cn(
        'w-full bg-transparent border-none outline-none text-inherit font-inherit',
        'hover:bg-blue-50/60 focus:bg-blue-50/80 focus:outline-1 focus:outline-blue-300',
        'transition-colors rounded px-1 -mx-1 cursor-text',
        align === 'center' && 'text-center',
        forceUppercase && 'uppercase',
        className
      )}
    />
  );
}

/* ───────── Page Chunk Helper ───────── */
function chunkRows<T>(items: T[], perPage: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    chunks.push(items.slice(i, i + perPage));
  }
  return chunks;
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

  // Get display trade for employee (ALL UPPERCASE)
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

  // ── Build row list: employees + 5 extra blank rows ──
  const allRows = useMemo(() => {
    const rows: Array<{
      type: 'employee' | 'extra';
      id?: string;
      fullName?: string;
      code?: string;
      position?: string;
      isTeamLeader?: boolean;
      isSupervisor?: boolean;
    }> = sortedEmployees.map((emp) => ({
      type: 'employee' as const,
      id: emp.id,
      fullName: emp.fullName,
      code: emp.code,
      position: emp.position,
      isTeamLeader: emp.isTeamLeader,
      isSupervisor: emp.isSupervisor,
    }));
    // Add 5 extra blank rows
    for (let i = 0; i < EXTRA_ROWS; i++) {
      rows.push({ type: 'extra' });
    }
    return rows;
  }, [sortedEmployees]);

  // ── Chunk rows into pages ──
  // First page has fewer rows because of the header/info section
  const FIRST_PAGE_ROWS = ROWS_PER_PAGE - 6; // account for header space
  const pages = useMemo(() => {
    if (allRows.length <= FIRST_PAGE_ROWS) {
      return [allRows];
    }
    const result: typeof allRows[] = [];
    result.push(allRows.slice(0, FIRST_PAGE_ROWS));
    const remaining = allRows.slice(FIRST_PAGE_ROWS);
    const remainingChunks = chunkRows(remaining, ROWS_PER_PAGE);
    result.push(...remainingChunks);
    return result;
  }, [allRows]);

  // ── Download PDF using print-based approach ──
  const handleDownloadPDF = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      // Use the browser's print-to-PDF functionality which handles page breaks natively
      // Create an iframe to isolate the print content
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = `${A4_WIDTH_MM}mm`;
      iframe.style.height = `${A4_HEIGHT_MM}mm`;
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        setIsGenerating(false);
        return;
      }

      // Build the HTML content for printing
      const printableEl = sheetRef.current;
      if (!printableEl) {
        document.body.removeChild(iframe);
        setIsGenerating(false);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @page {
              size: A4 portrait;
              margin: ${PRINT_MARGIN_MM}mm;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; background: white; }
            .page {
              width: ${A4_WIDTH_MM - PRINT_MARGIN_MM * 2}mm;
              min-height: ${A4_HEIGHT_MM - PRINT_MARGIN_MM * 2}mm;
              page-break-after: always;
              page-break-inside: avoid;
              position: relative;
            }
            .page:last-child {
              page-break-after: auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              text-transform: uppercase;
            }
            thead tr {
              background: #1f2937 !important;
              color: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            th, td {
              border: 1px solid #374151;
              padding: 4px 6px;
            }
            th {
              font-weight: bold;
              text-align: center;
              font-size: 11px;
            }
            .extra-separator td {
              border-top: 2px solid #1f2937 !important;
              background: #f9fafb;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .even-row { background: #f9fafb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .team-leader { background: #fffbeb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .supervisor { background: #eff6ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .total-row {
              background: #1f2937 !important;
              color: white !important;
              font-weight: bold;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .total-row td {
              border-color: #111827;
            }
            .header-title {
              font-size: 18px;
              font-weight: bold;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 6px;
            }
            .header-bar {
              background: #1f2937;
              color: white;
              text-align: center;
              padding: 6px;
              font-size: 12px;
              font-weight: bold;
              letter-spacing: 0.15em;
              text-transform: uppercase;
              margin-bottom: 12px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px 24px;
              font-size: 12px;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .info-item {
              display: flex;
              align-items: baseline;
              padding: 2px 0;
            }
            .info-label {
              font-weight: bold;
              width: 110px;
              flex-shrink: 0;
              font-size: 11px;
            }
            .info-value {
              flex: 1;
              border-bottom: 1px solid #9ca3af;
              padding: 1px 4px;
              font-size: 11px;
              min-height: 16px;
            }
            .logo-container {
              position: absolute;
              top: 0;
              right: 0;
            }
            .page-info {
              text-align: right;
              font-size: 10px;
              color: #6b7280;
              margin-top: 4px;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
      `);

      // Render each page
      pages.forEach((pageRows, pageIdx) => {
        const isLastPage = pageIdx === pages.length - 1;
        const serialOffset = pageIdx === 0 ? 0 : pages.slice(0, pageIdx).flat().length;

        iframeDoc.write(`<div class="page">`);

        // Header on every page
        iframeDoc.write(`
          <div style="position: relative; margin-bottom: 8px;">
            ${pageIdx === 0 ? `<div class="logo-container"><img src="/logo_asm.png" alt="ASM" style="height: 40px; width: auto;" /></div>` : ''}
            <div class="header-title">ARABIAN SHIELD MANPOWER</div>
            <div class="header-bar">DAILY ATTENDANCE</div>
          </div>
        `);

        // Info section on every page (condensed on continuation pages)
        if (pageIdx === 0) {
          iframeDoc.write(`
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">CLIENT NAME:</span>
                <span class="info-value">${upper(clientName)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">DATE:</span>
                <span class="info-value">${upper(dateInput)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">PROJECT NAME:</span>
                <span class="info-value">${upper(projectName)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">STRENGTH:</span>
                <span class="info-value">${upper(strengthInput || String(sortedEmployees.length))}</span>
              </div>
            </div>
          `);
        } else {
          // Continuation page - small header
          iframeDoc.write(`
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 8px; text-transform: uppercase; color: #374151;">
              <span><strong>CLIENT:</strong> ${upper(clientName)} &nbsp;&nbsp; <strong>PROJECT:</strong> ${upper(projectName)}</span>
              <span><strong>DATE:</strong> ${upper(dateInput)}</span>
            </div>
          `);
        }

        // Table
        iframeDoc.write(`
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">SL. NO</th>
                <th style="text-align: left;">NAME</th>
                <th style="width: 70px;">CODE</th>
                <th style="width: 140px; text-align: left;">TRADE</th>
                <th style="width: 100px;">SIGNATURE</th>
              </tr>
            </thead>
            <tbody>
        `);

        // Find if this page contains the transition from employees to extra rows
        const employeeCount = sortedEmployees.length;

        pageRows.forEach((row, idx) => {
          const serialNo = serialOffset + idx + 1;
          const isEven = idx % 2 === 1;

          if (row.type === 'employee') {
            const trade = getDisplayTrade(row as typeof sortedEmployees[0] & { type: string });
            const rowClass = (row as typeof sortedEmployees[0] & { type: string }).isTeamLeader
              ? 'team-leader'
              : (row as typeof sortedEmployees[0] & { type: string }).isSupervisor
              ? 'supervisor'
              : isEven ? 'even-row' : '';

            iframeDoc.write(`
              <tr class="${rowClass}">
                <td style="text-align: center;">${serialNo}</td>
                <td>${upper(row.fullName || '')}</td>
                <td style="text-align: center;">${upper(row.code || '')}</td>
                <td>${upper(trade)}</td>
                <td style="text-align: center;"></td>
              </tr>
            `);
          } else {
            // Extra row - add separator line before the first extra row
            const isSeparator = idx === pageRows.findIndex(r => r.type === 'extra') &&
                                pageRows.some(r => r.type === 'employee');
            const separatorClass = isSeparator ? 'extra-separator' : (isEven ? 'even-row' : '');
            iframeDoc.write(`
              <tr class="${separatorClass}">
                <td style="text-align: center; color: #9ca3af;">${serialNo}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            `);
          }
        });

        iframeDoc.write(`</tbody>`);

        // Add TOTAL row on the last page
        if (isLastPage) {
          const displayStrength = upper(strengthInput || String(sortedEmployees.length));
          iframeDoc.write(`
            <tfoot>
              <tr class="total-row">
                <td colspan="4" style="text-align: center;">TOTAL</td>
                <td style="text-align: center;">${displayStrength}</td>
              </tr>
            </tfoot>
          `);
        }

        iframeDoc.write(`</table>`);

        // Page number
        iframeDoc.write(`
          <div class="page-info">PAGE ${pageIdx + 1} OF ${pages.length}</div>
        `);

        iframeDoc.write(`</div>`);
      });

      iframeDoc.write(`</body></html>`);
      iframeDoc.close();

      // Wait for images to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Print the iframe
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, site.name, date, clientName, projectName, dateInput, strengthInput, sortedEmployees, pages, getDisplayTrade]);

  // Print
  const handlePrint = useCallback(() => {
    // Create an iframe for proper A4 printing with page breaks
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = `${A4_WIDTH_MM}mm`;
    iframe.style.height = `${A4_HEIGHT_MM}mm`;
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page {
            size: A4 portrait;
            margin: ${PRINT_MARGIN_MM}mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; background: white; }
          .page {
            width: ${A4_WIDTH_MM - PRINT_MARGIN_MM * 2}mm;
            page-break-after: always;
            page-break-inside: avoid;
            position: relative;
            padding-bottom: 8mm;
          }
          .page:last-child {
            page-break-after: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            text-transform: uppercase;
          }
          thead tr {
            background: #1f2937 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          th, td {
            border: 1px solid #374151;
            padding: 4px 6px;
          }
          th {
            font-weight: bold;
            text-align: center;
            font-size: 11px;
          }
          .extra-separator td {
            border-top: 2px solid #1f2937 !important;
            background: #f9fafb;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .even-row { background: #f9fafb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .team-leader { background: #fffbeb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .supervisor { background: #eff6ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .total-row {
            background: #1f2937 !important;
            color: white !important;
            font-weight: bold;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .total-row td {
            border-color: #111827;
          }
          .header-title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 6px;
          }
          .header-bar {
            background: #1f2937;
            color: white;
            text-align: center;
            padding: 6px;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin-bottom: 12px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 24px;
            font-size: 12px;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .info-item {
            display: flex;
            align-items: baseline;
            padding: 2px 0;
          }
          .info-label {
            font-weight: bold;
            width: 110px;
            flex-shrink: 0;
            font-size: 11px;
          }
          .info-value {
            flex: 1;
            border-bottom: 1px solid #9ca3af;
            padding: 1px 4px;
            font-size: 11px;
            min-height: 16px;
          }
          .logo-container {
            position: absolute;
            top: 0;
            right: 0;
          }
          .page-info {
            text-align: right;
            font-size: 10px;
            color: #6b7280;
            margin-top: 4px;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
    `);

    // Render each page
    pages.forEach((pageRows, pageIdx) => {
      const isLastPage = pageIdx === pages.length - 1;
      const serialOffset = pageIdx === 0 ? 0 : pages.slice(0, pageIdx).flat().length;

      iframeDoc.write(`<div class="page">`);

      // Header on every page
      iframeDoc.write(`
        <div style="position: relative; margin-bottom: 8px;">
          ${pageIdx === 0 ? `<div class="logo-container"><img src="/logo_asm.png" alt="ASM" style="height: 40px; width: auto;" /></div>` : ''}
          <div class="header-title">ARABIAN SHIELD MANPOWER</div>
          <div class="header-bar">DAILY ATTENDANCE</div>
        </div>
      `);

      // Info section
      if (pageIdx === 0) {
        iframeDoc.write(`
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">CLIENT NAME:</span>
              <span class="info-value">${upper(clientName)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">DATE:</span>
              <span class="info-value">${upper(dateInput)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">PROJECT NAME:</span>
              <span class="info-value">${upper(projectName)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">STRENGTH:</span>
              <span class="info-value">${upper(strengthInput || String(sortedEmployees.length))}</span>
            </div>
          </div>
        `);
      } else {
        iframeDoc.write(`
          <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 8px; text-transform: uppercase; color: #374151;">
            <span><strong>CLIENT:</strong> ${upper(clientName)} &nbsp;&nbsp; <strong>PROJECT:</strong> ${upper(projectName)}</span>
            <span><strong>DATE:</strong> ${upper(dateInput)}</span>
          </div>
        `);
      }

      // Table
      iframeDoc.write(`
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">SL. NO</th>
              <th style="text-align: left;">NAME</th>
              <th style="width: 70px;">CODE</th>
              <th style="width: 140px; text-align: left;">TRADE</th>
              <th style="width: 100px;">SIGNATURE</th>
            </tr>
          </thead>
          <tbody>
      `);

      const employeeCount = sortedEmployees.length;

      pageRows.forEach((row, idx) => {
        const serialNo = serialOffset + idx + 1;
        const isEven = idx % 2 === 1;

        if (row.type === 'employee') {
          const trade = getDisplayTrade(row as typeof sortedEmployees[0] & { type: string });
          const rowClass = (row as typeof sortedEmployees[0] & { type: string }).isTeamLeader
            ? 'team-leader'
            : (row as typeof sortedEmployees[0] & { type: string }).isSupervisor
            ? 'supervisor'
            : isEven ? 'even-row' : '';

          iframeDoc.write(`
            <tr class="${rowClass}">
              <td style="text-align: center;">${serialNo}</td>
              <td>${upper(row.fullName || '')}</td>
              <td style="text-align: center;">${upper(row.code || '')}</td>
              <td>${upper(trade)}</td>
              <td style="text-align: center;"></td>
            </tr>
          `);
        } else {
          const isSeparator = idx === pageRows.findIndex(r => r.type === 'extra') &&
                              pageRows.some(r => r.type === 'employee');
          const separatorClass = isSeparator ? 'extra-separator' : (isEven ? 'even-row' : '');
          iframeDoc.write(`
            <tr class="${separatorClass}">
              <td style="text-align: center; color: #9ca3af;">${serialNo}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          `);
        }
      });

      iframeDoc.write(`</tbody>`);

      if (isLastPage) {
        const displayStrength = upper(strengthInput || String(sortedEmployees.length));
        iframeDoc.write(`
          <tfoot>
            <tr class="total-row">
              <td colspan="4" style="text-align: center;">TOTAL</td>
              <td style="text-align: center;">${displayStrength}</td>
            </tr>
          </tfoot>
        `);
      }

      iframeDoc.write(`</table>`);
      iframeDoc.write(`
        <div class="page-info">PAGE ${pageIdx + 1} OF ${pages.length}</div>
      `);
      iframeDoc.write(`</div>`);
    });

    iframeDoc.write(`</body></html>`);
    iframeDoc.close();

    // Wait for content to render
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  }, [clientName, projectName, dateInput, strengthInput, sortedEmployees, pages, getDisplayTrade]);

  const displayStrength = upper(strengthInput || String(sortedEmployees.length));

  return (
    <>
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
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
          }
          #attendance-toolbar {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 bg-gray-200 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div
          id="attendance-toolbar"
          className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-300 shadow-sm shrink-0 print:hidden"
        >
          {/* Black Back Button */}
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
              className="h-8 w-32 text-sm font-mono uppercase"
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

        {/* Sheet Container - scrollable preview */}
        <div className="flex-1 overflow-auto flex flex-col items-center py-6 px-4 gap-6">
          {pages.map((pageRows, pageIdx) => {
            const isLastPage = pageIdx === pages.length - 1;
            const serialOffset = pageIdx === 0 ? 0 : pages.slice(0, pageIdx).flat().length;

            return (
              <div
                key={pageIdx}
                id={pageIdx === 0 ? 'attendance-sheet-printable' : undefined}
                ref={pageIdx === 0 ? sheetRef : undefined}
                className="bg-white shadow-xl border border-gray-300 w-full"
                style={{ maxWidth: `${A4_WIDTH_MM}mm`, minHeight: `${A4_HEIGHT_MM}mm` }}
              >
                {/* Header Section */}
                <div className="relative px-8 pt-6 pb-0">
                  {/* Logo */}
                  {pageIdx === 0 && (
                    <div className="absolute top-4 right-8">
                      <img
                        src="/logo_asm.png"
                        alt="ASM Logo"
                        className="h-14 w-auto object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}

                  {/* Company Name */}
                  <h1 className="text-[22px] font-bold text-center text-gray-900 tracking-wide uppercase">
                    ARABIAN SHIELD MANPOWER
                  </h1>

                  {/* Title Bar */}
                  <div className="mt-2 bg-gray-800 text-white text-center py-2 text-sm font-bold tracking-[0.2em] uppercase">
                    DAILY ATTENDANCE
                  </div>
                </div>

                {/* Info Section */}
                {pageIdx === 0 ? (
                  <div className="px-8 mt-4">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="flex items-baseline">
                        <span className="font-bold text-gray-800 w-36 shrink-0 text-[13px] uppercase">
                          CLIENT Name:
                        </span>
                        <span className="flex-1 border-b border-gray-400">
                          <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value.toUpperCase())}
                            className="w-full bg-transparent border-none outline-none text-gray-700 text-[13px] uppercase hover:bg-blue-50/60 focus:bg-blue-50/80 focus:outline-1 focus:outline-blue-300 transition-colors rounded px-1 -mx-1 cursor-text py-0.5"
                          />
                        </span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="font-bold text-gray-800 w-32 shrink-0 text-[13px] uppercase">Date:</span>
                        <span className="flex-1 border-b border-gray-400">
                          <input
                            type="text"
                            value={dateInput}
                            onChange={(e) => handleDateChange(e.target.value.toUpperCase())}
                            className="w-full bg-transparent border-none outline-none text-gray-700 text-[13px] font-mono uppercase hover:bg-blue-50/60 focus:bg-blue-50/80 focus:outline-1 focus:outline-blue-300 transition-colors rounded px-1 -mx-1 cursor-text py-0.5"
                          />
                        </span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="font-bold text-gray-800 w-36 shrink-0 text-[13px] uppercase">
                          Project Name:
                        </span>
                        <span className="flex-1 border-b border-gray-400">
                          <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value.toUpperCase())}
                            className="w-full bg-transparent border-none outline-none text-gray-700 text-[13px] uppercase hover:bg-blue-50/60 focus:bg-blue-50/80 focus:outline-1 focus:outline-blue-300 transition-colors rounded px-1 -mx-1 cursor-text py-0.5"
                          />
                        </span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="font-bold text-gray-800 w-32 shrink-0 text-[13px] uppercase">
                          Strength:
                        </span>
                        <span className="flex-1 border-b border-gray-400">
                          <input
                            type="text"
                            value={strengthInput}
                            onChange={(e) => setStrengthInput(e.target.value.toUpperCase())}
                            className="w-full bg-transparent border-none outline-none text-gray-700 text-[13px] font-semibold uppercase hover:bg-blue-50/60 focus:bg-blue-50/80 focus:outline-1 focus:outline-blue-300 transition-colors rounded px-1 -mx-1 cursor-text py-0.5"
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Continuation page - condensed header */
                  <div className="px-8 mt-3 flex justify-between text-[11px] uppercase text-gray-600">
                    <span>
                      <strong>Client:</strong> {upper(clientName)} &nbsp;&nbsp; <strong>Project:</strong> {upper(projectName)}
                    </span>
                    <span>
                      <strong>Date:</strong> {upper(dateInput)}
                    </span>
                  </div>
                )}

                {/* Attendance Table */}
                <div className="px-8 mt-4 pb-4">
                  <table className="w-full border-collapse text-[12px] uppercase">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="border border-gray-900 px-2 py-1.5 text-center font-bold w-12 uppercase">
                          Sl. No
                        </th>
                        <th className="border border-gray-900 px-2 py-1.5 text-left font-bold uppercase">Name</th>
                        <th className="border border-gray-900 px-2 py-1.5 text-center font-bold w-24 uppercase">
                          Code
                        </th>
                        <th className="border border-gray-900 px-2 py-1.5 text-left font-bold w-44 uppercase">
                          Trade
                        </th>
                        <th className="border border-gray-900 px-2 py-1.5 text-center font-bold w-36 uppercase">
                          Signature
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row, idx) => {
                        const serialNo = serialOffset + idx + 1;
                        const isEven = idx % 2 === 1;

                        // Find if this is the first extra row (for separator)
                        const firstExtraIdx = pageRows.findIndex(r => r.type === 'extra');
                        const isSeparatorRow = row.type === 'extra' && idx === firstExtraIdx && pageRows.some(r => r.type === 'employee');

                        if (row.type === 'employee') {
                          return (
                            <tr
                              key={row.id || `emp-${idx}`}
                              className={cn(
                                isEven ? 'bg-gray-50/70' : 'bg-white',
                                row.isTeamLeader && 'bg-amber-50/50',
                                row.isSupervisor && !row.isTeamLeader && 'bg-blue-50/40'
                              )}
                            >
                              <td className="border border-gray-400 px-2 py-1 text-center text-gray-700">
                                {serialNo}
                              </td>
                              <td className="border border-gray-400 px-1 py-0">
                                <EditableCell
                                  value={upper(row.fullName || '')}
                                  onChange={(val) => updateEmployee(row.id!, 'fullName', val)}
                                  className="py-0.5 text-gray-900 font-medium text-[12px] uppercase"
                                  uppercase
                                />
                              </td>
                              <td className="border border-gray-400 px-1 py-0 text-center">
                                <EditableCell
                                  value={upper(row.code || '')}
                                  onChange={(val) => updateEmployee(row.id!, 'code', val)}
                                  className="py-0.5 text-gray-700 text-center font-mono text-[12px] uppercase"
                                  align="center"
                                  uppercase
                                />
                              </td>
                              <td className="border border-gray-400 px-1 py-0">
                                <EditableCell
                                  value={upper(getDisplayTrade(row as typeof sortedEmployees[0] & { type: string }))}
                                  onChange={(val) => {
                                    const baseVal = val.replace(/ \/ (TEAM LEADER|SUPERVISOR)$/i, '');
                                    updateEmployee(row.id!, 'position', baseVal);
                                  }}
                                  className="py-0.5 text-gray-700 uppercase text-[11px]"
                                  uppercase
                                />
                              </td>
                              <td className="border border-gray-400 px-2 py-1 text-center">
                                <EditableCell
                                  value=""
                                  onChange={() => {}}
                                  className="py-0.5 text-[12px]"
                                  align="center"
                                />
                              </td>
                            </tr>
                          );
                        } else {
                          // Extra blank row
                          return (
                            <tr
                              key={`extra-${pageIdx}-${idx}`}
                              className={cn(
                                isSeparatorRow ? 'bg-gray-100/80' : (isEven ? 'bg-gray-50/70' : 'bg-white'),
                              )}
                            >
                              {isSeparatorRow ? (
                                <>
                                  <td className="border-t-2 border-b border-gray-600 px-2 py-1 text-center text-gray-400 text-[12px]">
                                    {serialNo}
                                  </td>
                                  <td className="border-t-2 border-b border-gray-600 px-1 py-0">
                                    <EditableCell
                                      value=""
                                      onChange={() => {}}
                                      className="py-0.5 text-[12px]"
                                    />
                                  </td>
                                  <td className="border-t-2 border-b border-gray-600 px-1 py-0 text-center">
                                    <EditableCell
                                      value=""
                                      onChange={() => {}}
                                      className="py-0.5 text-[12px]"
                                      align="center"
                                    />
                                  </td>
                                  <td className="border-t-2 border-b border-gray-600 px-1 py-0">
                                    <EditableCell
                                      value=""
                                      onChange={() => {}}
                                      className="py-0.5 text-[11px]"
                                    />
                                  </td>
                                  <td className="border-t-2 border-b border-gray-600 px-2 py-1 text-center">
                                    <EditableCell
                                      value=""
                                      onChange={() => {}}
                                      className="py-0.5 text-[12px]"
                                      align="center"
                                    />
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="border border-gray-400 px-2 py-1 text-center text-gray-400 text-[12px]">
                                    {serialNo}
                                  </td>
                                  <td className="border border-gray-400 px-1 py-0">
                                    <EditableCell
                                      value=""
                                      onChange={() => {}}
                                      className="py-0.5 text-[12px]"
                                    />
                                  </td>
                                  <td className="border border-gray-400 px-1 py-0 text-center">
                                    <EditableCell
                                      value=""
                                      onChange={() => {}}
                                      className="py-0.5 text-[12px]"
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
                                      className="py-0.5 text-[12px]"
                                      align="center"
                                    />
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        }
                      })}
                    </tbody>

                    {/* TOTAL row on last page */}
                    {isLastPage && (
                      <tfoot>
                        <tr className="bg-gray-800 text-white font-bold uppercase">
                          <td className="border border-gray-900 px-2 py-2 text-center" colSpan={4}>
                            TOTAL
                          </td>
                          <td className="border border-gray-900 px-2 py-2 text-center uppercase">
                            {displayStrength}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>

                  {/* Page info */}
                  <div className="text-right text-[10px] text-gray-400 mt-2 uppercase">
                    Page {pageIdx + 1} of {pages.length}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
