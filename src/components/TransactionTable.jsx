import { useState } from "react";

import { titleCase } from "../lib/format";

const priorityColumns = ["TAX_CATEGORY", "CONFIDENCE", "REVIEW_RECOMMENDED", "ML_ASSIST", "REASON"];
const longTextLimit = 140;

function columnsFor(rows) {
  const all = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const ordered = priorityColumns.filter((col) => all.includes(col));
  const rest = all.filter((col) => !priorityColumns.includes(col));
  return [...rest.slice(0, 4), ...ordered, ...rest.slice(4)];
}

function cellValue(column, value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  if (column === "REVIEW_RECOMMENDED") return value ? "Yes" : "No";
  return String(value).replace(/\s+/g, " ").trim();
}

function badgeClass(column, value) {
  if (column === "CONFIDENCE") {
    if (value === "HIGH") return "bg-green-100 text-green-700";
    if (value === "MEDIUM") return "bg-amber-100 text-amber-700";
    if (value === "LOW") return "bg-red-100 text-red-700";
  }
  if (column === "TAX_CATEGORY") {
    if (value === "GST") return "bg-green-100 text-green-700";
    if (value === "POSSIBLE_GST") return "bg-lime-100 text-lime-700";
    if (value === "TDS") return "bg-amber-100 text-amber-700";
    return "bg-blue-100 text-blue-700";
  }
  if (column === "REVIEW_RECOMMENDED") {
    return value ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";
  }
  return "";
}

function normalizedColumn(column) {
  return String(column || "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function isMoneyColumn(column) {
  const normalized = normalizedColumn(column);
  return /\b(debit|credit|balance|amount|withdraw|deposit|dr|cr)\b/.test(normalized);
}

function isNarrativeColumn(column) {
  const normalized = normalizedColumn(column);
  return /\b(reason|particulars|remarks|remark|narration|description|details|memo)\b/.test(normalized);
}

function isDateColumn(column) {
  return /\bdate\b/.test(normalizedColumn(column));
}

function isStatusColumn(column) {
  return ["TAX_CATEGORY", "CONFIDENCE", "REVIEW_RECOMMENDED", "ML_ASSIST"].includes(column);
}

function isCompactColumn(column) {
  const normalized = normalizedColumn(column);
  return /\b(sl no|tran id|transaction id|cheque|ref no|reference)\b/.test(normalized);
}

function columnWidth(column) {
  if (column === "REASON") return 36;
  if (isNarrativeColumn(column)) return 28;
  if (isMoneyColumn(column)) return 9;
  if (isDateColumn(column)) return 11;
  if (isStatusColumn(column)) return 10;
  if (isCompactColumn(column)) return 10;
  return 12;
}

function cellClass(column) {
  const base = "border-b border-slate-100 px-4 py-3 align-top text-slate-700";
  if (isMoneyColumn(column)) return `${base} whitespace-nowrap text-right font-medium tabular-nums`;
  if (isNarrativeColumn(column)) return `${base} whitespace-normal break-words leading-relaxed`;
  if (isDateColumn(column) || isStatusColumn(column) || isCompactColumn(column)) return `${base} whitespace-nowrap`;
  return `${base} whitespace-normal break-words`;
}

function headerClass(column) {
  const base = "overflow-hidden border-b border-slate-200 px-4 py-3 align-bottom text-xs font-bold uppercase tracking-wide text-slate-500";
  if (isMoneyColumn(column)) return `${base} text-right`;
  return base;
}

function headerContentClass(column) {
  const base = "block w-full min-w-0";
  if (isMoneyColumn(column)) return `${base} truncate text-right`;
  if (isNarrativeColumn(column) || isDateColumn(column) || isCompactColumn(column) || isStatusColumn(column)) {
    return `${base} whitespace-normal break-words leading-snug`;
  }
  return `${base} truncate`;
}

function TextCell({ column, value, expanded, onToggle }) {
  const text = cellValue(column, value);
  const narrative = isNarrativeColumn(column);
  const canExpand = narrative && text.length > longTextLimit;
  const shouldClamp = canExpand && !expanded;

  if (!narrative) {
    return (
      <div className={isMoneyColumn(column) ? "truncate text-right" : "truncate"} title={text}>
        {text}
      </div>
    );
  }

  return (
    <div title={text}>
      <span className={shouldClamp ? "line-clamp-3" : ""}>{text}</span>
      {canExpand && (
        <button
          type="button"
          className="mt-1 block text-xs font-bold text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export default function TransactionTable({ rows, loading }) {
  const [expandedCells, setExpandedCells] = useState({});
  const columns = columnsFor(rows || []);
  const tableMinWidth = columns.reduce((total, column) => total + columnWidth(column), 0);

  function toggleCell(rowIndex, column) {
    const key = `${rowIndex}:${column}`;
    setExpandedCells((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <section className="rounded-xl bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-900">Classified Transactions</h2>
        <span className="text-sm font-semibold text-slate-500">{rows.length} rows</span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading transactions...</div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">No transactions found for the selected filters.</div>
      ) : (
        <div className="table-scroll max-h-[620px] overflow-auto">
          <table
            className="w-full table-fixed border-separate border-spacing-0 text-left text-sm"
            style={{ minWidth: `${Math.max(tableMinWidth, 72)}rem` }}
          >
            <colgroup>
              {columns.map((column) => (
                <col key={column} style={{ width: `${columnWidth(column)}rem` }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                {columns.map((column) => (
                  <th key={column} className={headerClass(column)}>
                    <span className={headerContentClass(column)} title={titleCase(column)}>
                      {titleCase(column)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  {columns.map((column) => {
                    const value = row[column];
                    const badge = badgeClass(column, value);
                    return (
                      <td key={column} className={cellClass(column)}>
                        {badge ? (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${badge}`}>
                            {cellValue(column, value)}
                          </span>
                        ) : (
                          <TextCell
                            column={column}
                            value={value}
                            expanded={Boolean(expandedCells[`${index}:${column}`])}
                            onToggle={() => toggleCell(index, column)}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
