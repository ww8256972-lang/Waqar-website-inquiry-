import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Download } from 'lucide-react';
import { api } from '../api/client';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; skippedRows: any[] } | null>(null);

  if (!isOpen) return null;

  const parseCsv = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts: string[] = [];
      let inQuotes = false;
      let current = '';

      for (let ch of lines[i]) {
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      parts.push(current.trim());

      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = parts[idx] ? parts[idx].replace(/^"|"$/g, '') : '';
      });
      rows.push(rowObj);
    }
    return rows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      const rows = parseCsv(text);
      setParsedRows(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setLoading(true);
    try {
      const res = await api.bulkImport(parsedRows);
      setResult({
        imported: res.imported_count,
        skipped: res.skipped_count,
        skippedRows: res.skipped_rows || []
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const sampleCsvTemplate = `Name,Phone,Business,Address,Website,Status,Price,Paid,FollowUpDate,Notes
"Rajesh Khanna","9822334455","Khanna Grand Hotel","Connaught Place, New Delhi","khannahotel.in","Interested",45000,10000,"2026-10-06","Needs online table and room booking engine."
"Sunil Mittal","9811998877","Mittal Cloth Emporium","Lajpat Nagar Market, Delhi","mittalcloth.com","New",25000,0,"2026-10-07","Wants catalog showcase with WhatsApp order button."`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsvTemplate], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_customers_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 text-xs">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 text-cyan-400 border border-blue-500/25">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Bulk CSV Customer Import</h2>
              <p className="text-xs text-slate-400">Import leads, validate columns & detect duplicates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Download Sample Button */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="font-bold text-white">Need a template format?</div>
              <div className="text-[11px] text-slate-400">Download the recommended CSV structure</div>
            </div>
            <button
              onClick={handleDownloadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-2xl p-6 text-center bg-slate-950/50 transition-colors">
            <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <div className="font-bold text-white text-sm">Choose CSV file to upload</div>
            <p className="text-[11px] text-slate-400 mt-1">UTF-8 CSV format with headers</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="mt-4 text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400 cursor-pointer"
            />
          </div>

          {/* Parsed Rows Preview */}
          {parsedRows.length > 0 && !result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase text-[11px]">
                  Found {parsedRows.length} Records to Import
                </span>
                <span className="text-emerald-400 font-semibold">Columns Mapped ✓</span>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-1">Name</th>
                      <th className="pb-1">Phone</th>
                      <th className="pb-1">Business</th>
                      <th className="pb-1">Status</th>
                      <th className="pb-1 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {parsedRows.slice(0, 10).map((r, i) => (
                      <tr key={i}>
                        <td className="py-1 font-semibold text-white">{r.Name || r.name}</td>
                        <td className="py-1 text-slate-300 font-mono">{r.Phone || r.phone}</td>
                        <td className="py-1 text-slate-400">{r.Business || r.business_name}</td>
                        <td className="py-1 text-cyan-400">{r.Status || r.status || 'New'}</td>
                        <td className="py-1 text-right font-mono text-white">₹{r.Price || r.quoted_price || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Result Screen */}
          {result && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>Import Completed Successfully!</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-bold">
                  Imported: {result.imported} Customers
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                  Skipped (Duplicates/Invalid): {result.skipped}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white">
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={loading || parsedRows.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md disabled:opacity-50"
            >
              {loading ? 'Importing Batch...' : `Import ${parsedRows.length} Customers`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
