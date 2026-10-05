import * as XLSX from 'xlsx';

export function formatCurrency(amount: number | string | undefined): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0'));
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(isNaN(num) ? 0 : num);
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const parts = dateString.split(' ');
    const d = parts[0];
    const t = parts[1] ? ` ${parts[1]}` : '';
    return `${d}${t}`;
  } catch {
    return dateString;
  }
}

export function exportToExcel(data: Record<string, unknown>[], fileName: string, sheetName: string = 'Report') {
  if (!data || data.length === 0) {
    alert('No records available to export.');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().substring(0, 10)}.xlsx`);
}

export function exportToCsv(data: Record<string, unknown>[], fileName: string) {
  if (!data || data.length === 0) {
    alert('No records available to export.');
    return;
  }
  const headers = Object.keys(data[0]);
  const rows = data.map(obj =>
    headers.map(header => {
      const val = obj[header] === undefined || obj[header] === null ? '' : String(obj[header]);
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}_${new Date().toISOString().substring(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
