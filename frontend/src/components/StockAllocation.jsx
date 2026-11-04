import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
    ChevronRight,
    Search,
    Hash,
    X,
    Eye,
    Filter,
    Plus,
    ChevronsLeft,
    FolderOpen,
    ChevronLeft,
    ChevronRight as ChevronRightIcon,
    ChevronsRight,
    Calendar,
    ArrowDown,
    ChevronDown,
    TrendingUp,
    RefreshCw,
    Trash2
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, PolarGrid, RadialBar, RadialBarChart } from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/Charts/ui/card";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/Charts/ui/chart";

/*
 * Stock Allocated rows now come from the database (GET /api/stock-allocations).
 * Row shape:
 * { id, documentNo, jobCardNo, workOrderNo, processType, bpCode, bpName, operationItem, toUnit, status,
 *   batchNo, batches: [{ batchNo, allocationQty }], allocationQty }
 */
const JOB_CARD_OPTIONS = [];

const statusColor = {
    Open: 'text-slate-700',
    Released: 'text-slate-700',
    Cancelled: 'text-slate-700',
};

/* ---------- Routing helpers (same defaults as CardRouting / StockOrderPlanning) ---------- */
const getUnitOptionsForProcess = (processType) =>
    processType === 'Inter-Unit' ? ['Unit-2', 'Unit-3'] : ['Unit-1'];

// Accept the process-type field names returned by both planning APIs and saved routes.
const readProcessType = (source = {}) => {
    if (!source || typeof source !== 'object') return '';
    const keys = ['processType', 'process_type', 'routingType', 'routing_type', 'processName', 'process_name'];
    for (const key of keys) {
        const value = source[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
        if (value && typeof value === 'object') {
            const nested = value.value ?? value.name ?? value.label ?? value.description;
            if (nested != null && String(nested).trim()) return String(nested).trim();
        }
    }
    for (const key of ['routing', 'route', 'process', 'routingDetails', 'routing_details']) {
        const value = source[key];
        if (value && typeof value === 'object') {
            const nested = readProcessType(value);
            if (nested) return nested;
        }
    }
    return '';
};

const normalizeProcessType = (value) => {
    const normalized = String(value || '').trim().toLowerCase().replace(/[ _]+/g, '-');
    if (/^sub-?con$/.test(normalized)) return 'Sub-Con';
    if (/^in-?house$/.test(normalized)) return 'In-House';
    if (/^inter-?unit$/.test(normalized)) return 'Inter-Unit';
    return String(value || '').trim();
};

const getWarehouseForRoute = (processType, unit) => {
    if (processType === 'Sub-Con' || processType === 'Sub Con') return 'SC-U1';
    if (unit === 'Unit-2') return 'QC-U2';
    if (unit === 'Unit-3') return 'QC-U3';
    return 'QC-U1';
};

const resolveRouting = (card = {}, routingChanges = null) => {
    const jc = card.jobCardNo;
    const savedSel = routingChanges?.selections?.[jc] || {};
    const savedDet = routingChanges?.details?.[jc] || {};

    // The selected per-job-card routing is authoritative; a default process type
    // on a generated card must not overwrite a saved Sub-Con selection.
    const processType = normalizeProcessType(
        readProcessType(savedSel) || readProcessType(savedDet) || readProcessType(card) || 'In-House'
    );

    const unit =
        card.unit || card.toUnit || savedSel.unit ||
        getUnitOptionsForProcess(processType)[0];

    const explicitWarehouse =
        card.warehouse || card.warehouseCode || card.warehouse_code ||
        card.whsCode || card.whs_code || card.targetWhs || card.target_whs ||
        card.toWhs || card.to_whs || savedDet.warehouse || '';
    const subConProcess = /^sub[-\s]?con$/i.test(String(processType || '').trim());
    // A Sub-Con selection must route to an SC warehouse, even if a generated
    // job card still contains the in-house QC warehouse as its default.
    const resolvedWarehouse = subConProcess && !/^SC-/i.test(String(explicitWarehouse).trim())
        ? getWarehouseForRoute(processType, unit)
        : explicitWarehouse || getWarehouseForRoute(processType, unit);

    // Work Orders and Stock Orders routed to QC-U1 should be allocated to PRD-U1.
    const warehouse = String(resolvedWarehouse).trim().toUpperCase() === 'QC-U1'
        ? 'PRD-U1'
        : resolvedWarehouse;

    return { processType, unit, warehouse };
};

/* Warehouses that are always available in the BOM "From Whs" dropdown */
const BOM_FROM_WHS_OPTIONS = ['RM-U1', 'QC-U1'];

/* Sub-Con vendor (BP) used whenever the job card is routed to a Sub-Con warehouse */
const SUB_CON_BP_CODE = 'V00695';
const SUB_CON_BP_NAME = 'Kavitha Hard Chrome';

/* A job card is Sub-Con when its process type is Sub-Con or its warehouse is an SC-* warehouse */
const isSubConRoute = (processType, warehouse) =>
    /^sub[-\s]?con$/i.test(String(processType || '').trim()) ||
    /^SC-/i.test(String(warehouse || '').trim());

/* UoM rule: raw-material (RM) input items are in KGS, operation-wise items are in NOS.
   Sub-Con is always NOS. */
const getBomUom = (ipItemCode, subCon = false) => {
    if (subCon) return 'NOS';
    const code = String(ipItemCode || '').trim().toUpperCase();
    if (!code) return '';
    return code.startsWith('RM') ? 'KGS' : 'NOS';
};

/* Rounds quantities to 6 decimals so sums like 0.1 + 0.2 compare cleanly. */
const roundQty = (n) => Number(Number(n || 0).toFixed(6));

/* ---------- Batch helpers ---------- */

/* Reads one batch entry coming from the API, accepting different field names. */
const readBatchEntry = (b) => ({
    batchNo: String(b?.batchNo ?? b?.batch_no ?? b?.batch ?? '').trim(),
    allocationQty:
        b?.allocationQty ?? b?.allocation_qty ??
        b?.allocatedQty ?? b?.allocated_qty ??
        b?.batchQty ?? b?.batch_qty ??
        b?.qty ?? b?.quantity ?? '',
});

/* Collects EVERY RM batch of a saved allocation (so a Released allocation shows all its
   batches, not just the first one). Handles all the shapes the API may return:
   - a batches array: [{ batchNo, allocationQty }, ...]
   - a comma separated string: "B1, B2, B3"
   - one list row per batch that share the same documentNo
   Returns { batches, totalQty }. */
const collectAllocationBatches = (row = {}, allRows = []) => {
    const sameDoc = row.documentNo
        ? (Array.isArray(allRows) ? allRows : []).filter((r) => r.documentNo === row.documentNo)
        : [];
    const sources = sameDoc.length ? sameDoc : [row];

    const out = [];
    const seen = new Set();
    const push = (batchNo, allocationQty) => {
        if (!batchNo || seen.has(batchNo)) return;
        seen.add(batchNo);
        out.push({ batchNo, allocationQty });
    };

    sources.forEach((src) => {
        if (Array.isArray(src.batches) && src.batches.length) {
            src.batches.forEach((b) => {
                const entry = readBatchEntry(b);
                const names = entry.batchNo.split(',').map((s) => s.trim()).filter(Boolean);
                names.forEach((name) => push(name, names.length === 1 ? entry.allocationQty : ''));
            });
        } else {
            const names = String(src.batchNo || '').split(',').map((s) => s.trim()).filter(Boolean);
            names.forEach((name) => push(name, names.length === 1 ? (src.allocationQty ?? '') : ''));
        }
    });

    const allHaveQty = out.length > 0 && out.every((b) => b.allocationQty !== '' && Number.isFinite(Number(b.allocationQty)));
    const totalQty = allHaveQty && sameDoc.length > 1
        ? roundQty(out.reduce((s, b) => s + Number(b.allocationQty), 0))
        : (row.allocationQty ?? '');

    return { batches: out, totalQty };
};

/* Snapshot of everything the user can change on a saved allocation.
   Used to enable "Update Transfer" only when something really changed. */
const buildEditSignature = ({ qty, fromUnit, fromWhs, remarks, batches }) =>
    JSON.stringify([
        roundQty(qty),
        String(fromUnit || '').trim(),
        String(fromWhs || '').trim(),
        String(remarks || '').trim(),
        (batches || [])
            .map((b) => [String(b.batchNo).trim(), roundQty(b.allocationQty)])
            .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ]);

/* ---------- Stacked bar chart (shadcn) ---------- */
const chartData = [
    { month: "January", desktop: 186, mobile: 80 },
    { month: "February", desktop: 305, mobile: 200 },
    { month: "March", desktop: 237, mobile: 120 },
    { month: "April", desktop: 73, mobile: 190 },
    { month: "May", desktop: 209, mobile: 130 },
    { month: "June", desktop: 214, mobile: 140 },
    { month: "July", desktop: 198, mobile: 150 },
    { month: "August", desktop: 260, mobile: 170 },
    { month: "September", desktop: 175, mobile: 110 },
    { month: "October", desktop: 240, mobile: 160 },
    { month: "November", desktop: 220, mobile: 135 },
    { month: "December", desktop: 285, mobile: 190 },
];

const CHART_YEAR = 2024;
const CHART_PAGES = [
    { label: `January - June ${CHART_YEAR}`, range: 'January - June', data: chartData.slice(0, 6) },
    { label: `July - December ${CHART_YEAR}`, range: 'July - December', data: chartData.slice(6, 12) },
];

const chartConfig = {
    desktop: {
        label: "Desktop",
        color: "var(--chart-1)",
    },
    mobile: {
        label: "Mobile",
        color: "var(--chart-2)",
    },
};

function ChartBarStacked() {
    const [page, setPage] = useState(0);
    const current = CHART_PAGES[page];
    const isFirst = page === 0;
    const isLast = page === CHART_PAGES.length - 1;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                        <CardTitle>Bar Chart - Stacked + Legend</CardTitle>
                        <CardDescription>Monthly Wise Allocation Status</CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={isFirst}
                            aria-label="Show January to June"
                            title="January - June"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(CHART_PAGES.length - 1, p + 1))}
                            disabled={isLast}
                            aria-label="Show July to December"
                            title="July - December"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <BarChart data={current.data}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 3)}
                        />
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar
                            dataKey="desktop"
                            stackId="a"
                            fill="var(--color-desktop)"
                            radius={[0, 0, 4, 4]}
                        />
                        <Bar
                            dataKey="mobile"
                            stackId="a"
                            fill="var(--color-mobile)"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
            </CardFooter>
        </Card>
    );
}

/* ---------- Radial chart with grid (shadcn) ---------- */
const radialChartData = [
    { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
    { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
    { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
    { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
    { browser: "other", visitors: 90, fill: "var(--color-other)" },
];

const radialChartConfig = {
    visitors: {
        label: "Visitors",
    },
    chrome: {
        label: "Chrome",
        color: "var(--chart-1)",
    },
    safari: {
        label: "Safari",
        color: "var(--chart-2)",
    },
    firefox: {
        label: "Firefox",
        color: "var(--chart-3)",
    },
    edge: {
        label: "Edge",
        color: "var(--chart-4)",
    },
    other: {
        label: "Other",
        color: "var(--chart-5)",
    },
};

function ChartRadialGrid() {
    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Radial Chart - Grid</CardTitle>
                <CardDescription>January - June 2024</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={radialChartConfig}
                    className="mx-auto aspect-square max-h-[500px]"
                >
                    <RadialBarChart data={radialChartData} innerRadius={42} outerRadius={140}>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel nameKey="browser" />}
                        />
                        <PolarGrid gridType="circle" />
                        <RadialBar dataKey="visitors" />
                    </RadialBarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

/* ---------- Stock Allocated table ---------- */
const STOCK_ORDER_TABS = ['All', 'Released', 'Cancelled'];

const STOCK_ORDER_STATUS_STYLES = {
    Released: 'bg-emerald-100 text-emerald-700',
    Cancelled: 'bg-rose-100 text-rose-600',
};

const STOCK_ORDER_COLUMNS = [
    { key: 'documentNo', label: 'Document Number' },
    { key: 'jobCardNo', label: 'Job Card Number' },
    { key: 'workOrderNo', label: 'Work Order Number' },
    { key: 'processType', label: 'Process Type' },
    { key: 'bpCode', label: 'BP Code' },
    { key: 'bpName', label: 'BP Name' },
    { key: 'operationItem', label: 'Operation Item' },
    { key: 'toUnit', label: 'To Unit' },
    { key: 'status', label: 'Status' },
];

/* Splits one allocation into one display row per RM batch. */
const expandRowByBatch = (row) => {
    const baseKey = row.id ?? row.documentNo;
    const batches = Array.isArray(row.batches) && row.batches.length
        ? row.batches.map((b) => {
            const entry = readBatchEntry(b);
            return { batchNo: entry.batchNo, allocationQty: entry.allocationQty };
        })
        : String(row.batchNo || '').split(',').map((s) => s.trim()).filter(Boolean)
            .map((batchNo, _i, all) => ({
                batchNo,
                allocationQty: all.length === 1 ? row.allocationQty : '',
            }));

    if (batches.length === 0) {
        return [{ ...row, _rowKey: `${baseKey}-0`, _batchNo: '', _batchQty: row.allocationQty ?? '' }];
    }
    return batches.map((b, i) => ({
        ...row,
        _rowKey: `${baseKey}-${i}`,
        _batchNo: b.batchNo,
        // a single batch always carries the total allocation qty when its own qty is missing
        _batchQty: (b.allocationQty === '' || b.allocationQty == null) && batches.length === 1
            ? (row.allocationQty ?? '')
            : (b.allocationQty ?? ''),
    }));
};

function StockOrdersTable({ rows = [], onView, onDelete, onRefresh }) {
    const [activeTab, setActiveTab] = useState('All');
    const [search, setSearch] = useState('');
    const [unitFilter, setUnitFilter] = useState('All Units');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [page, setPage] = useState(0);

    const counts = useMemo(() => {
        const result = { All: rows.length };
        STOCK_ORDER_TABS.slice(1).forEach((tab) => {
            result[tab] = rows.filter((r) => r.status === tab).length;
        });
        return result;
    }, [rows]);

    const unitOptions = useMemo(() => {
        const unitsInRows = rows.map((row) => String(row.toUnit || '').trim()).filter(Boolean);
        return ['All Units', ...new Set(['Unit-1', 'Unit-2', 'Unit-3', ...unitsInRows])];
    }, [rows]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows
            .filter((row) => {
                if (activeTab !== 'All' && row.status !== activeTab) return false;
                if (unitFilter !== 'All Units' && String(row.toUnit || '').trim() !== unitFilter) return false;
                if (!q) return true;
                const batchText = Array.isArray(row.batches) && row.batches.length
                    ? row.batches.map((b) => b.batchNo).join(' ')
                    : row.batchNo;
                return [row.documentNo, row.jobCardNo, row.workOrderNo, row.processType, row.bpCode, row.bpName, row.operationItem, batchText, row.toUnit, row.status]
                    .some((v) => String(v ?? '').toLowerCase().includes(q));
            })
            .map((row) => ({ ...row, _rowKey: row.id ?? row.documentNo }));
    }, [rows, activeTab, search, unitFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const safePage = Math.min(page, totalPages - 1);
    const start = safePage * rowsPerPage;
    const pageRows = filtered.slice(start, start + rowsPerPage);
    const rangeLabel = filtered.length === 0 ? '0 of 0' : `${start + 1}-${start + pageRows.length} of ${filtered.length}`;

    const pagerBtn = 'flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';

    const handleRefresh = async () => {
        if (!onRefresh || refreshing) return;
        setRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" id="stock-orders-table">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Stock Allocated</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{rows.length}</span>
                </div>
                <div className="relative flex items-center gap-4 text-slate-500">
                    <button type="button" aria-label="Refresh stock allocations" title="Refresh" onClick={handleRefresh} disabled={refreshing} aria-busy={refreshing} className="transition hover:text-slate-800 active:scale-95 disabled:cursor-wait disabled:opacity-60">
                        <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button type="button" aria-label="Filter stock allocations" title="Filter by unit" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)} className="transition hover:text-slate-800 active:scale-95">
                        <Filter className="h-5 w-5" />
                    </button>
                    {filtersOpen && (
                        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-4 text-slate-700 shadow-xl" role="dialog" aria-label="Stock allocation filters">
                            <label htmlFor="stock-allocation-unit-filter" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Filter by unit</label>
                            <select
                                id="stock-allocation-unit-filter"
                                value={unitFilter}
                                onChange={(e) => { setUnitFilter(e.target.value); setPage(0); }}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                            >
                                {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                            </select>
                            <button type="button" onClick={() => { setUnitFilter('All Units'); setPage(0); setFiltersOpen(false); }} className="mt-3 w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200">
                                Show all units
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs + search */}
            <div className="flex flex-col gap-3 px-6 pb-4 pt-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
                    {STOCK_ORDER_TABS.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            onClick={() => { setActiveTab(tab); setPage(0); }}
                            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {tab} <span className="ml-1">{counts[tab]}</span>
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-[320px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        autoComplete="off"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        placeholder="Search stock allocations..."
                        className="w-full rounded-xl border border-transparent bg-slate-100 py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full min-w-[1200px] text-left">
                    <thead>
                        <tr className="border-b border-slate-100">
                            {STOCK_ORDER_COLUMNS.map((col) => (
                                <th key={col.key} className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length === 0 ? (
                            <tr>
                                <td colSpan={STOCK_ORDER_COLUMNS.length + 1} className="px-6 py-10">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <FolderOpen className="w-9 h-9 text-slate-300" />
                                        <span className="font-semibold text-slate-500">No Stock allocations matching database criteria</span>
                                        <p className="text-xs text-slate-400">Try relaxing your search terms or filters.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((row) => (
                                <tr key={row._rowKey} className="border-b border-slate-100 transition hover:bg-slate-50">
                                    <td className="px-6 py-5 text-sm font-extrabold text-slate-900">{row.documentNo}</td>
                                    <td className="px-6 py-5 text-sm text-slate-600">{row.jobCardNo}</td>
                                    <td className="px-6 py-5 text-sm text-slate-600">{row.workOrderNo}</td>
                                    <td className="px-6 py-5 text-sm text-slate-600">{row.processType}</td>
                                    <td className="px-6 py-5 text-sm font-extrabold text-slate-900">{row.bpCode}</td>
                                    <td className="px-6 py-5 text-sm text-slate-600">{row.bpName}</td>
                                    <td className="px-6 py-5 text-sm text-slate-600">{row.operationItem}</td>
                                    <td className="px-6 py-5 text-sm text-slate-600">{row.toUnit}</td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${STOCK_ORDER_STATUS_STYLES[row.status] || 'bg-slate-100 text-slate-700'}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center justify-end gap-3 text-slate-400">
                                            <button type="button" aria-label="Modify" title="Modify stock allocation" onClick={() => onView?.(row)} className="transition hover:text-slate-700">
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            {row.status === 'Draft' && (
                                                <button type="button" aria-label="Delete" onClick={() => onDelete?.(row)} className="transition hover:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    Rows per page:
                    <span className="relative flex items-center">
                        <select
                            value={rowsPerPage}
                            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                            className="cursor-pointer appearance-none bg-transparent pr-5 text-xs font-bold text-slate-800 focus:outline-none"
                        >
                            {[10, 15, 25, 50].map((n) => (<option key={n} value={n}>{n}</option>))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-0 h-3.5 w-3.5 text-slate-600" />
                    </span>
                </label>

                <div className="flex items-center gap-2">
                    <span className="mr-3 text-xs font-bold text-slate-700">{rangeLabel}</span>
                    <button type="button" aria-label="First page" className={pagerBtn} disabled={safePage === 0} onClick={() => setPage(0)}><ChevronsLeft className="h-4 w-4" /></button>
                    <button type="button" aria-label="Previous page" className={pagerBtn} disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><ChevronLeft className="h-4 w-4" /></button>
                    <button type="button" aria-label="Next page" className={pagerBtn} disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}><ChevronRight className="h-4 w-4" /></button>
                    <button type="button" aria-label="Last page" className={pagerBtn} disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}><ChevronsRight className="h-4 w-4" /></button>
                </div>
            </div>
        </div>
    );
}

const addPageAnimations = `
@keyframes sa-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes sa-slide-down {
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes sa-banner-reveal {
  from { opacity: 0; transform: scaleX(0.92); clip-path: inset(0 50% 0 0 round 16px); }
  to   { opacity: 1; transform: scaleX(1);    clip-path: inset(0 0 0 0 round 16px); }
}
@keyframes sa-hang-swing {
  0%   { opacity: 0; transform: translateY(-60px) rotate(-6deg); }
  55%  { opacity: 1; transform: translateY(6px) rotate(3deg); }
  80%  { transform: translateY(0) rotate(-1.5deg); }
  100% { transform: translateY(0) rotate(0); }
}
@keyframes sa-pop {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes sa-invalid-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}
.sa-invalid-field {
  border-color: #ef4444 !important;
  background-color: #fef2f2 !important;
  animation: sa-invalid-shake 0.38s ease-in-out;
}
.sa-fade-up    { animation: sa-fade-up 0.6s cubic-bezier(.22,1,.36,1) backwards; }
.sa-slide-down { animation: sa-slide-down 0.55s cubic-bezier(.22,1,.36,1) backwards; }
.sa-banner     { animation: sa-banner-reveal 0.7s cubic-bezier(.22,1,.36,1) 0.15s backwards; transform-origin: left center; }
.sa-hang       { animation: sa-hang-swing 0.9s cubic-bezier(.22,1,.36,1) backwards; transform-origin: top center; }
.sa-pop        { animation: sa-pop 0.3s ease-out backwards; }
@media (prefers-reduced-motion: reduce) {
  .sa-fade-up, .sa-slide-down, .sa-banner, .sa-hang, .sa-pop, .sa-invalid-field { animation: none; }
}
`;

const formatDocDateForDisplay = (isoDate) => {
    const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : isoDate;
};

const formatDateInput = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
};

const parseDocDateInput = (value) => {
    const raw = formatDateInput(value);
    const ddmmyyyy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return ddmmyyyy ? `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}` : raw;
};

// The list API returns dates as DD-MM-YYYY; forms keep ISO (YYYY-MM-DD).
const toIsoDate = (value, fallback = '') => {
    const dm = String(value || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dm) return `${dm[3]}-${dm[2]}-${dm[1]}`;
    return value || fallback;
};

const InfoCard = ({ label, value, mono = false, className = '', valueClassName = '', enabled = true }) => (
    <div className={`rounded-xl border border-slate-200 px-4 py-3 transition-all duration-300 ${enabled ? 'border-slate-200 bg-slate-50 opacity-100' : 'border-slate-200 bg-slate-100 opacity-50'} ${className}`}>
        <p className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
            {label}
        </p>
        <p className={`mt-1 min-h-[28px] break-words ${valueClassName || 'text-xl'} font-extrabold text-black ${mono ? 'font-mono' : ''}`}>
            {value || ''}
        </p>
    </div>
);

const getLocalISODate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
// Include a work order only when its lifecycle status explicitly says Released.
// Work-order API versions may use different names for the status field.
const isReleasedWorkOrder = (order = {}) => {
    const status = [
        order.workOrderStatus, order.work_order_status,
        order.orderStatus, order.order_status, order.orderStatusName, order.order_status_name,
        order.productionOrderStatus, order.production_order_status,
        order.documentStatus, order.document_status, order.documentStatusName, order.document_status_name,
        order.docStatus, order.doc_status,
        order.statusName, order.status_name, order.statusText, order.status_text,
        order.status, order.Status, order.state, order.stateName, order.state_name,
        order.releaseStatus, order.release_status,
    ].find((value) => value !== undefined && value !== null && String(value).trim() !== '');

    const rawStatus = typeof status === 'object'
        ? (status.value ?? status.code ?? status.name ?? status.label ?? status.description ?? '')
        : status;
    const normalizedStatus = String(rawStatus).trim().toLowerCase();
    return normalizedStatus === 'r' || /(^|[^a-z])released([^a-z]|$)/.test(normalizedStatus);
};
// Stock Order Planning can return status in different top-level or nested fields.
// Fail closed: include a stock order only if every discovered status/state says Released.
const isReleasedStockOrder = (order = {}) => {
    const statusValues = [];
    const readValues = (value) => {
        if (value === null || value === undefined) return;
        if (Array.isArray(value)) {
            value.forEach(readValues);
            return;
        }
        if (typeof value === 'object') {
            const preferred = value.value ?? value.code ?? value.name ?? value.label ?? value.description;
            if (preferred !== undefined && preferred !== null) readValues(preferred);
            else Object.values(value).forEach(readValues); return;
        }
        if (typeof value === 'string') statusValues.push(value.trim().toLowerCase());
    };
    const visit = (value) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }
        Object.entries(value).forEach(([key, child]) => {
            if (/status|state/i.test(key)) readValues(child);
            else visit(child);
        });
    };
    visit(order);
    return statusValues.length > 0 && statusValues.every((status) =>
        status === 'r' || /(^|[^a-z])released([^a-z]|$)/.test(status)
    );
};

// Fallback only: the server's next-document-no endpoint is the source of truth.
// Keeps the same zero-padding width as the numbers already in the table.
const getNextStockAllocationDocNo = (rows = []) => {
    let highest = 0;
    let width = 4; // default width if the table is empty
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const value = row.documentNo ?? row.document_no ?? row.docNo ?? row.doc_no ?? '';
        const match = String(value).trim().match(/^SA-(\d+)$/i);
        if (!match) return;
        const sequence = Number(match[1]);
        if (!Number.isSafeInteger(sequence)) return;
        highest = Math.max(highest, sequence);
        width = Math.max(width, match[1].length); // follow the table's existing width
    });
    return `SA-${String(highest + 1).padStart(width, '0')}`;
};

const INITIAL_FORM = {
    jobCardNo: '',
    jobCardStatus: '',
    workOrderNo: '',
    processType: '',
    bpCode: '',
    bpName: '',
    fgItemCode: '',
    fgItemName: '',
    opItem: '',
    opItemName: '',
    toUnit: '',
    status: 'Open',
    toWhs: '',
    targetWhs: '',
    machineName: '',
    docNo: '',
    docDate: getLocalISODate(),
    plannedQty: '',
    remarks: '',
};

const INITIAL_PO_FORM = { dcDate: '', poRefNo: '', poNum: '' };

/* One RM batch per line: prefers the batches array, otherwise splits a "B1, B2" string.
   Every batch (1st, 2nd, 3rd ...) is returned so each one is listed beneath the previous.
   A single batch with no qty of its own takes the total allocation qty. */
const getBatchLines = (stock) => {
    if (!stock) return [];
    const lines = [];
    const seen = new Set();
    const push = (batchNo, allocationQty) => {
        if (!batchNo || seen.has(batchNo)) return;
        seen.add(batchNo);
        lines.push({ batchNo, allocationQty });
    };

    if (Array.isArray(stock.batches) && stock.batches.length) {
        stock.batches.forEach((b) => {
            const entry = readBatchEntry(b);
            // A single entry may still hold "B1, B2, B3" - split it into separate lines.
            const names = entry.batchNo.split(',').map((s) => s.trim()).filter(Boolean);
            names.forEach((name) => push(name, names.length === 1 ? entry.allocationQty : undefined));
        });
    }

    if (!lines.length) {
        const names = String(stock.batchNo || '').split(',').map((s) => s.trim()).filter(Boolean);
        names.forEach((batchNo) =>
            // Only a single batch can safely show the total qty
            push(batchNo, names.length === 1 ? stock.allocationQty : undefined)
        );
    }

    // One batch only: its quantity is the total allocation quantity.
    if (lines.length === 1 && (lines[0].allocationQty === undefined || lines[0].allocationQty === '')) {
        lines[0].allocationQty = stock.allocationQty;
    }
    return lines;
};

export default function StockAllocation() {
    const [view, setView] = useState('list');
    const [form, setForm] = useState(INITIAL_FORM);
    const [orderOptions, setOrderOptions] = useState([]);
    const [jobCardOptions, setJobCardOptions] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [jobCardsLoading, setJobCardsLoading] = useState(false);
    const [orderLoadError, setOrderLoadError] = useState('');
    const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
    const [orderSearch, setOrderSearch] = useState('');
    const [allocationToast, setAllocationToast] = useState(false);
    const [allocationSuccessToast, setAllocationSuccessToast] = useState(false);
    const [allocationValidationToast, setAllocationValidationToast] = useState(false);
    const [showBomValidation, setShowBomValidation] = useState(false);
    const [allocationSaved, setAllocationSaved] = useState(false);
    const [bomAllocatedQty, setBomAllocatedQty] = useState('');
    const [bomQtyInputMessage, setBomQtyInputMessage] = useState('');
    const [bomFromUnit, setBomFromUnit] = useState('');
    const [bomRemarks, setBomRemarks] = useState('');
    const [activeAllocationSection, setActiveAllocationSection] = useState(null);
    const [bomGuideVisible, setBomGuideVisible] = useState(false);
    const bomAutoOpenTimerRef = useRef(null);
    const [bomItemExpanded, setBomItemExpanded] = useState(false);
    const [stockDetailsExpanded, setStockDetailsExpanded] = useState(false);
    const [poDetailsExpanded, setPoDetailsExpanded] = useState(false);
    const [stockPanelMode, setStockPanelMode] = useState(null);
    // Multi-batch selection for Load Stock [BOM]: { [batchNo]: allocationQtyString }.
    // A batch is "selected" when it has a key in this map.
    const [batchSelections, setBatchSelections] = useState({});
    const [loadStockBom, setLoadStockBom] = useState([]);
    const [loadStockBomLoading, setLoadStockBomLoading] = useState(false);
    const [loadStockBomError, setLoadStockBomError] = useState('');
    const [showBatchQtyValidation, setShowBatchQtyValidation] = useState(false);
    const [loadedStock, setLoadedStock] = useState(null);
    const [bomStockLoadedKeys, setBomStockLoadedKeys] = useState(() => new Set());
    const [loadStockToast, setLoadStockToast] = useState(null);
    const loadStockToastTimerRef = useRef(null);
    const [stockPanelVisible, setStockPanelVisible] = useState(false);
    const [bomStageOpen, setBomStageOpen] = useState(false);
    const [bomItems, setBomItems] = useState([]);
    const [bomItemsLoading, setBomItemsLoading] = useState(false);
    const [bomItemsError, setBomItemsError] = useState('');
    const [selectedBomId, setSelectedBomId] = useState('');
    const [bomFromWhs, setBomFromWhs] = useState('');
    const [allocationRows, setAllocationRows] = useState([]);
    const [posting, setPosting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    // Signature of the allocation as it was when opened; Update Transfer needs it to differ.
    const [editBaseline, setEditBaseline] = useState(null);

    // Purchase Order Info's card: snapshot of the posted transfer + PO inputs.
    const [postedAllocation, setPostedAllocation] = useState(null);
    const [poForm, setPoForm] = useState(INITIAL_PO_FORM);
    const [postingPo, setPostingPo] = useState(false);
    const [cancellingTransfer, setCancellingTransfer] = useState(false);
    const [cancellingPo, setCancellingPo] = useState(false);
    const poRedirectTimerRef = useRef(null);

    // In-app confirmation toast (replaces window.confirm): { title, message, confirmLabel, onConfirm }
    const [confirmToast, setConfirmToast] = useState(null);

    const selectedBom = bomItems.find((b) => String(b.id) === String(selectedBomId)) || null;

    // Sub-Con: the I/P item is the output of the PREVIOUS operation (e.g. OP050 -> OP040).
    // The previous operation is the job card just before the selected one.
    const bomIsSubCon = isSubConRoute(form.processType, form.targetWhs || form.toWhs);
    const previousOperation = (() => {
        const idx = jobCardOptions.findIndex((c) => c.jobCardNo === form.jobCardNo);
        const prev = idx > 0 ? jobCardOptions[idx - 1] : null;
        if (!prev) return null;
        const code = prev.opItemCode || prev.itemCode || prev.code || '';
        const name = prev.opItemName || prev.itemName || prev.subtitle || '';
        return code ? { code, name } : null;
    })();
    const useSubConIpItem = bomIsSubCon && Boolean(previousOperation);
    const bomIpItemCode = useSubConIpItem ? previousOperation.code : (selectedBom?.ipItemCode || '');
    const bomIpItemName = useSubConIpItem ? previousOperation.name : (selectedBom?.ipItemName || '');

    const currentBomStockKey = JSON.stringify([form.workOrderNo, form.jobCardNo]);
    const currentBomStockAlreadyLoaded = bomStockLoadedKeys.has(currentBomStockKey);
    const docDateInputRef = useRef(null);
    const [dcCalendarOpen, setDcCalendarOpen] = useState(false);
    const [dcCalendarMonth, setDcCalendarMonth] = useState(() => {
        const current = new Date();
        return new Date(current.getFullYear(), current.getMonth(), 1);
    });
    const allocationToastTimerRef = useRef(null);
    const allocationSuccessToastTimerRef = useRef(null);
    const allocationValidationToastTimerRef = useRef(null);

    // Cancelled allocations are fully read-only: nothing can be changed, posted or cancelled again.
    const isLocked = editMode && (editingRow?.status === 'Cancelled' || postedAllocation?.allocationStatus === 'Cancelled');

    // Update Transfer is enabled only after something was changed on the opened allocation.
    const hasEditChanges = editMode && editBaseline !== null && editBaseline !== buildEditSignature({
        qty: bomAllocatedQty,
        fromUnit: bomFromUnit,
        fromWhs: bomFromWhs,
        remarks: bomRemarks,
        batches: getBatchLines(loadedStock),
    });

    // PO grid is read-only once the PO is posted or cancelled (or the whole allocation is Cancelled).
    const poLocked = isLocked || ['Posted', 'Cancelled'].includes(postedAllocation?.poStatus);
    // Cancel Transfer is only possible while the PO is not posted and the allocation is not already cancelled.
    const transferLocked = isLocked || postedAllocation?.poStatus === 'Posted' || postedAllocation?.allocationStatus === 'Cancelled';

    // Load posted Stock Allocations for the main-page "Stock Allocated" table.
    const loadAllocations = async () => {
        try {
            const res = await fetch('/api/stock-allocations');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setAllocationRows(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('[STOCK ALLOCATIONS] load failed:', err);
            showLoadStockToast('error', 'Could not load stock allocations. Please refresh and try again.');
        }
    };

    useEffect(() => { loadAllocations(); }, []);

    // Next Doc. No: ask the server first (source of truth), then fall back to a fresh
    // list fetch, and only then to the rows already in state. Never hardcoded.
    const fetchNextDocNo = async () => {
        try {
            const res = await fetch('/api/stock-allocations/next-document-no');
            if (res.ok) {
                const { documentNo } = await res.json();
                if (documentNo) return documentNo;
            }
        } catch (err) {
            console.warn('[DOC NO] server lookup failed, falling back:', err);
        }
        try {
            const res = await fetch('/api/stock-allocations');
            const data = res.ok ? await res.json() : [];
            return getNextStockAllocationDocNo(data);
        } catch {
            return getNextStockAllocationDocNo(allocationRows);
        }
    };

    const applyNextDocNo = async () => {
        const next = await fetchNextDocNo();
        // Only fill it if the form is still empty (don't touch an already-set number)
        setForm((prev) => (prev.docNo ? prev : { ...prev, docNo: next }));
    };

    // Load real Work Orders and Stock Orders from their existing planning tables.
    useEffect(() => {
        let cancelled = false;
        const loadOrders = async () => {
            setOrdersLoading(true);
            setOrderLoadError('');
            try {
                const [woRes, stockRes] = await Promise.all([
                    fetch('/api/work-orders'),
                    fetch('/api/stock-order-planning/stock-orders'),
                ]);
                if (!woRes.ok) throw new Error('Unable to load Work Orders.');
                if (!stockRes.ok) throw new Error('Unable to load Stock Orders.');
                const [workOrders, stockOrders] = await Promise.all([woRes.json(), stockRes.json()]);
                if (cancelled) return;
                const woOptions = (Array.isArray(workOrders) ? workOrders : []).filter(isReleasedWorkOrder).map((o) => ({
                    kind: 'work', value: o.workOrderNo ?? o.work_order_no ?? '',
                    label: o.workOrderNo ?? o.work_order_no ?? '',
                    itemCode: o.itemCode ?? o.item_code ?? o.fgItemCode ?? o.fgitem_code ?? '',
                    itemName: o.itemName ?? o.itemDescription ?? o.item_description ?? o.fgItemName ?? '',
                    unit: o.unit ?? o.toUnit ?? '', plannedQty: o.plannedQty ?? o.planned_qty ?? '',
                    cardCode: o.cardCode ?? o.card_code ?? '', cardName: o.cardName ?? o.card_name ?? '',
                    order: o,
                })).filter((o) => o.value);
                const stockOptions = (Array.isArray(stockOrders) ? stockOrders : []).filter(isReleasedStockOrder).map((o) => ({
                    kind: 'stock', value: o.number ?? o.stockOrderNo ?? o.stock_order_no ?? '',
                    label: o.number ?? o.stockOrderNo ?? o.stock_order_no ?? '',
                    itemCode: o.itemCode ?? o.item_code ?? '',
                    itemName: o.itemDescription ?? o.item_description ?? o.itemName ?? '',
                    unit: o.unit ?? '', plannedQty: o.plannedQty ?? o.planned_qty ?? '', order: o,
                })).filter((o) => o.value);
                setOrderOptions([...woOptions, ...stockOptions]);
            } catch (err) {
                if (!cancelled) setOrderLoadError(err.message || 'Failed to load order numbers.');
            } finally {
                if (!cancelled) setOrdersLoading(false);
            }
        };
        loadOrders();
        return () => { cancelled = true; };
    }, []);

    const selectOrder = async (orderNo) => {
        setAllocationSaved(false);
        setLoadedStock(null);
        const selected = orderOptions.find((o) => o.value === orderNo);
        setJobCardOptions([]);
        setForm((prev) => ({
            ...prev, workOrderNo: orderNo, jobCardNo: '', jobCardStatus: '',
            fgItemCode: selected?.itemCode || '', fgItemName: selected?.itemName || '',
            toUnit: selected?.unit || '', plannedQty: selected?.plannedQty == null ? '' : String(selected.plannedQty),
            bpCode: selected?.cardCode || selected?.order?.cardCode || selected?.order?.card_code || '', bpName: selected?.cardName || selected?.order?.cardName || selected?.order?.card_name || '',
            opItem: '', opItemName: '', processType: '', targetWhs: '', toWhs: '', machineName: '',
        }));
        if (!selected || !selected.itemCode) return;

        setJobCardsLoading(true);
        try {
            // Job cards saved when the order was released/updated (update_salerouting / update_stockrouting).
            let cards = [];
            try {
                const savedRes = await fetch(
                    `/api/stock-allocation/job-cards?${new URLSearchParams({ kind: selected.kind, orderNo })}`
                );
                if (savedRes.ok) {
                    const savedCards = await savedRes.json();
                    if (Array.isArray(savedCards)) cards = savedCards;
                }
            } catch (savedErr) {
                console.warn('Saved routing lookup failed, using planning routing:', savedErr);
            }
            if (cards.length > 0) {
                // use the saved job cards as they are
            } else if (selected.kind === 'stock') {
                // Stock orders keep their routing in routing_stocks (same source as StockOrderPlanning).
                const res = await fetch(
                    `/api/stock-order-planning/routing/${encodeURIComponent(selected.itemCode)}`
                );
                if (!res.ok) throw new Error('Unable to load stock routing.');
                const rows = await res.json();
                const base = String(orderNo).replace(/^WO-ST-/i, '');
                cards = (Array.isArray(rows) ? rows : []).map((r, i) => ({
                    jobCardNo: `${base}-${String(i + 1).padStart(2, '0')}`,
                    opItemCode: r.code ?? r.item_code ?? '',
                    opItemName: r.subtitle ?? r.item_name ?? '',
                    operationName: r.operation ?? r.bom_operation ?? '',
                    machineName: r.machineName ?? r.machine_name ?? '',
                    // Preserve the process selected for this operation in Stock Order Planning.
                    processType: readProcessType(r),
                    plannedQty: selected.plannedQty,
                    jobCardStatus: i === 0 ? 'Open' : '',
                }));
            } else {
                // Routing endpoint returns the job cards and the details associated with this work order/item.
                const params = new URLSearchParams({ workOrderNo: orderNo, fgItemCode: selected.itemCode });
                const res = await fetch(`/api/routing?${params.toString()}`);
                if (!res.ok) throw new Error('Unable to load job cards for this order.');
                cards = await res.json();
            }
            // Only the first (Open) job card of each order is allocatable.
            setJobCardOptions((Array.isArray(cards) ? cards : []).slice(0, 1).map((card, i) => ({
                ...card,
                jobCardNo: card.jobCardNo || card.job_card_no || `${orderNo}-${String(i + 1).padStart(2, '0')}`,
            })));
        } catch (err) {
            console.error('Failed to load Stock Allocation job cards:', err);
            setJobCardOptions([]);
        } finally {
            setJobCardsLoading(false);
        }
    };

    const selectJobCard = (jobCardNo) => {
        setAllocationSaved(false);
        if (jobCardNo !== form.jobCardNo) setLoadedStock(null);
        const card = jobCardOptions.find((item) => item.jobCardNo === jobCardNo);
        const selectedOrder = orderOptions.find((o) => o.value === form.workOrderNo);
        const routingChanges =
            selectedOrder?.order?.routingChanges ?? selectedOrder?.order?.routing_changes ?? null;
        // To Unit always comes from the selected Work/Stock Order, never from the job card
        // (routing rows default to 'Unit-1', which was overwriting the order's real unit).
        const orderUnit = selectedOrder?.unit || form.toUnit || '';
        const { processType, unit, warehouse } = resolveRouting(
            { ...card, unit: orderUnit || card?.unit, toUnit: orderUnit || card?.toUnit },
            routingChanges
        );

        setForm((prev) => ({
            ...prev,
            jobCardNo,
            jobCardStatus: card?.jobCardStatus || card?.status || '',
            toUnit: orderUnit || unit || prev.toUnit,
            opItem: card?.opItemCode || card?.itemCode || card?.code || '',
            opItemName: card?.opItemName || card?.itemName || card?.subtitle || '',
            processType,
            targetWhs: warehouse,
            toWhs: warehouse,
            machineName: card?.plannedMachineName || card?.machineName || prev.machineName,
            plannedQty: card?.plannedQty ?? prev.plannedQty,
            remarks: card?.remarks ?? prev.remarks,
            // BP depends on the process: In-House = our own company,
            // Sub-Con = the Sub-Con vendor, anything else = the BP that came with the order.
            ...(/^in[-\s]?house$/i.test(String(processType).trim())
                ? { bpCode: 'C00065', bpName: 'AE-Autocrat Engineers' }
                : isSubConRoute(processType, warehouse)
                    ? { bpCode: SUB_CON_BP_CODE, bpName: SUB_CON_BP_NAME }
                    : {
                        bpCode: selectedOrder?.cardCode || selectedOrder?.order?.cardCode || selectedOrder?.order?.card_code || '',
                        bpName: selectedOrder?.cardName || selectedOrder?.order?.cardName || selectedOrder?.order?.card_name || '',
                    }),
        }));
    };

    const dcCalendarDays = (() => {
        const firstDay = new Date(dcCalendarMonth.getFullYear(), dcCalendarMonth.getMonth(), 1).getDay();
        const firstCell = new Date(dcCalendarMonth.getFullYear(), dcCalendarMonth.getMonth(), 1 - firstDay);
        return Array.from({ length: 42 }, (_, index) => {
            const date = new Date(firstCell);
            date.setDate(firstCell.getDate() + index);
            return date;
        });
    })();

    // DC Date belongs to the PO, so it writes to poForm (not the allocation's Doc. Date).
    const selectDcCalendarDate = (date) => {
        if (isLocked) return;
        const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        setPoForm((prev) => ({ ...prev, dcDate: isoDate }));
        setDcCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
        setDcCalendarOpen(false);
    };

    useEffect(() => {
        if (stockPanelMode) {
            setStockPanelVisible(false);
            const raf = requestAnimationFrame(() => setStockPanelVisible(true));
            return () => cancelAnimationFrame(raf);
        }
        setStockPanelVisible(false);
    }, [stockPanelMode]);

    const REQUIRED_FIELDS = [
        'workOrderNo', 'jobCardNo', 'toUnit', 'bpCode', 'bpName',
        'toWhs', 'targetWhs', 'machineName', 'docNo', 'docDate', 'plannedQty'
    ];

    const hasWorkOrderAndJobCard = Boolean(form.workOrderNo && form.jobCardNo);
    const isMainFormComplete = REQUIRED_FIELDS.every((key) => form[key] && form[key].toString().trim() !== '');
    const isFormComplete = editMode || isMainFormComplete;

    // Allocated Qty is independent of Req Qty (they can be equal or different).
    // It only needs to be a number greater than zero.
    const allocatedBomQtyNumber = Number(bomAllocatedQty);
    const isBomQtyValid = Number.isFinite(allocatedBomQtyNumber) && allocatedBomQtyNumber > 0;
    const isBomAllocationComplete = Boolean(selectedBom && isBomQtyValid && bomFromUnit && bomFromWhs);

    // RM batches picked in Load Stock [BOM] must add up to the Allocated Qty.
    const bomTargetQty = roundQty(bomAllocatedQty);
    const selectedBatchTotal = roundQty(
        Object.values(batchSelections).reduce((s, v) => s + (Number(v) || 0), 0)
    );
    const remainingBatchQty = roundQty(bomTargetQty - selectedBatchTotal);
    const batchTotalMatches = bomTargetQty > 0 && selectedBatchTotal === bomTargetQty;

    const handleBomAllocatedQtyInput = (value) => {
        if (isLocked) return;
        setAllocationSaved(false);
        setAllocationSuccessToast(false);
        setAllocationValidationToast(false);
        if (!/^\d*\.?\d*$/.test(value)) {
            setBomQtyInputMessage('Numbers only; use digits and an optional decimal point.');
            return;
        }
        setBomQtyInputMessage('');
        setBomAllocatedQty(value);
    };

    const update = (key, value) => {
        if (isLocked) return;
        setAllocationSaved(false);
        setAllocationSuccessToast(false);
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const closeStockPanel = () => {
        setStockPanelMode(null);
        setBatchSelections({});
        setShowBatchQtyValidation(false);
    };

    const openAllocationSection = (section) => {
        setActiveAllocationSection(section);
        if (section === 'bom') {
            setBomItemExpanded(true);
            setStockDetailsExpanded(false);
            setPoDetailsExpanded(false);
            setBomGuideVisible(true);
            window.setTimeout(() => setBomGuideVisible(false), 3200);
        } else if (section === 'stock') {
            setBomItemExpanded(false);
            setStockDetailsExpanded(true);
            setPoDetailsExpanded(false);
            setBomGuideVisible(false);
        } else {
            setBomItemExpanded(false);
            setStockDetailsExpanded(false);
            setPoDetailsExpanded(true);
            setDcCalendarOpen(false);
            setBomGuideVisible(false);
        }
    };

    const clearBomAutoOpenTimer = () => {
        if (bomAutoOpenTimerRef.current) {
            window.clearTimeout(bomAutoOpenTimerRef.current);
            bomAutoOpenTimerRef.current = null;
        }
    };

    const clearPoRedirectTimer = () => {
        if (poRedirectTimerRef.current) {
            window.clearTimeout(poRedirectTimerRef.current);
            poRedirectTimerRef.current = null;
        }
    };

    const openAddNew = () => {
        clearPoRedirectTimer();
        setConfirmToast(null);
        setEditBaseline(null);
        setEditMode(false);
        setEditingRow(null);
        setPostedAllocation(null);
        setPoForm(INITIAL_PO_FORM);
        clearBomAutoOpenTimer();
        setAllocationSaved(false);
        // Doc. No is filled by applyNextDocNo() below (server-generated, not hardcoded).
        setForm({ ...INITIAL_FORM, docNo: '', docDate: getLocalISODate() });
        setOrderSearch('');
        setOrderDropdownOpen(false);
        setBomStageOpen(false);
        setBomItems([]);
        setSelectedBomId('');
        setBomFromWhs('');
        setBomAllocatedQty('');
        setBomQtyInputMessage('');
        setBomFromUnit('');
        setBomRemarks('');
        setLoadedStock(null);
        setBomStockLoadedKeys(new Set());
        setBatchSelections({});
        setShowBatchQtyValidation(false);
        setLoadStockToast(null);
        setAllocationSuccessToast(false);
        setShowBomValidation(false);
        if (allocationSuccessToastTimerRef.current) clearTimeout(allocationSuccessToastTimerRef.current);
        setDcCalendarOpen(false);
        setActiveAllocationSection(null);
        setBomItemExpanded(false);
        setStockDetailsExpanded(false);
        setPoDetailsExpanded(false);
        setAllocationToast(true);
        setView('add');
        applyNextDocNo();

        if (allocationToastTimerRef.current) {
            clearTimeout(allocationToastTimerRef.current);
        }
        allocationToastTimerRef.current = setTimeout(() => {
            setAllocationToast(false);
        }, 3000);
    };

    const openModify = (row) => {
        clearBomAutoOpenTimer();
        setConfirmToast(null);
        const isoDocDate = toIsoDate(row.docDate, getLocalISODate());

        // Gather ALL batches of this allocation (1st, 2nd, 3rd ...), not just the first one.
        const { batches: savedBatches, totalQty: savedTotalQty } = collectAllocationBatches(row, allocationRows);
        const savedBatchNo = savedBatches.map((b) => b.batchNo).join(', ');

        setEditBaseline(buildEditSignature({
            qty: savedTotalQty,
            fromUnit: row.fromUnit,
            fromWhs: row.fromWhs,
            remarks: row.remarks,
            batches: savedBatches,
        }));
        setEditMode(true);
        setOrderDropdownOpen(false);
        setOrderSearch('');
        setEditingRow(row);
        setForm({
            ...INITIAL_FORM,
            docNo: row.documentNo ?? '',
            docDate: isoDocDate,
            workOrderNo: row.workOrderNo ?? '',
            jobCardNo: row.jobCardNo ?? '',
            processType: row.processType ?? '',
            bpCode: row.bpCode ?? '',
            bpName: row.bpName ?? '',
            fgItemCode: row.fgItemCode ?? '',
            fgItemName: row.fgItemName ?? '',
            opItem: row.operationItem ?? '',
            opItemName: row.operationItemName ?? '',
            toUnit: row.toUnit ?? '',
            toWhs: row.toWhs ?? '',
            targetWhs: row.toWhs ?? '',
            plannedQty: row.plannedQty != null ? String(row.plannedQty) : '',
            remarks: row.remarks ?? '',
        });
        // Lets the (locked) Job Card select show the saved value.
        setJobCardOptions([{ jobCardNo: row.jobCardNo }]);
        setBomFromUnit(row.fromUnit ?? '');
        setBomFromWhs(row.fromWhs ?? '');
        setBomAllocatedQty(savedTotalQty !== '' && savedTotalQty != null ? String(savedTotalQty) : '');
        setBomRemarks(row.remarks ?? '');
        setBomQtyInputMessage('');
        setLoadedStock({
            itemCode: row.itemCode,
            itemName: row.itemName,
            // "B1, B2, B3" - every saved batch
            batchNo: savedBatchNo || row.batchNo,
            // Multi-batch: every saved batch is listed beneath the previous one in Stock Details.
            batches: savedBatches,
            allocationQty: savedTotalQty,
            allocationType: row.allocationType,
            processType: row.processType,
            fromUnit: row.fromUnit,
            fromWhs: row.fromWhs,
            toUnit: row.toUnit,
            toWhs: row.toWhs,
        });
        // Purchase Order Info's card: restore saved values (needs these fields from the list API).
        setPostedAllocation({
            id: row.id,
            inventoryNo: row.inventoryNo ?? row.documentNo,
            bpCode: row.bpCode,
            bpName: row.bpName,
            processType: row.processType,
            allocationType: row.allocationType,
            poStatus: row.poStatus ?? 'Pending',
            allocationStatus: row.status,
        });
        setPoForm({
            dcDate: toIsoDate(row.dcDate, ''),
            poRefNo: row.poReferenceNo ?? '',
            poNum: row.poNumber ?? '',
        });
        // A saved allocation that already has stock loaded reopens as "stock loaded".
        setBomStockLoadedKeys(
            row.itemCode && savedBatches.length
                ? new Set([JSON.stringify([row.workOrderNo ?? '', row.jobCardNo ?? ''])])
                : new Set()
        );
        setAllocationSaved(true);           // enables the Load Stock buttons
        setShowBomValidation(false);
        setAllocationToast(false);
        setAllocationSuccessToast(false);
        setAllocationValidationToast(false);
        setBatchSelections({});
        setShowBatchQtyValidation(false);
        setStockPanelMode(null);
        setStockDetailsExpanded(false);
        setPoDetailsExpanded(false);
        setDcCalendarOpen(false);
        setActiveAllocationSection(null);
        setBomItemExpanded(false);
        setBomStageOpen(false);   // first screen first; "Proceed to BOM Inputs" opens the three cards
        setView('add');
    };

    const closeAddNew = () => {
        clearPoRedirectTimer();
        setConfirmToast(null);
        setEditBaseline(null);
        setEditMode(false);
        setEditingRow(null);
        setPostedAllocation(null);
        setPoForm(INITIAL_PO_FORM);
        clearBomAutoOpenTimer();
        setBomStageOpen(false);
        setView('list');
    };

    const loadLoadStockBom = async () => {
        setLoadStockBomLoading(true);
        setLoadStockBomError('');
        try {
            const res = await fetch('/api/load-stock-bom');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const rows = await res.json();
            setLoadStockBom(Array.isArray(rows) ? rows : []);
        } catch (err) {
            console.error('[LOAD STOCK BOM] load failed:', err);
            setLoadStockBom([]);
            setLoadStockBomError('Could not load batch stock');
            showLoadStockToast('error', 'Could not load batch stock. Please try again.');
        } finally {
            setLoadStockBomLoading(false);
        }
    };

    const loadBomItems = async () => {
        setBomItemsLoading(true);
        setBomItemsError('');
        try {
            const res = await fetch('/api/bom-stock');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const rows = await res.json();
            const list = Array.isArray(rows) ? rows : [];
            setBomItems(list);
            const preferredBom = editMode ? list.find((b) => b.ipItemCode === editingRow?.itemCode) : null;
            setSelectedBomId(list.length ? String((preferredBom || list[0]).id) : '');
        } catch (err) {
            console.error('[BOM STOCK] load failed:', err);
            setBomItems([]);
            setSelectedBomId('');
            setBomItemsError('Could not load BOM items');
            showLoadStockToast('error', 'Could not load BOM items. Please try again.');
        } finally {
            setBomItemsLoading(false);
        }
    };

    const handleProceed = () => {
        if (!hasWorkOrderAndJobCard) {
            setAllocationToast(true);
            if (allocationToastTimerRef.current) clearTimeout(allocationToastTimerRef.current);
            allocationToastTimerRef.current = setTimeout(() => setAllocationToast(false), 3500);
            return;
        }
        setAllocationToast(false);
        clearBomAutoOpenTimer();

        // Show only the 3 cards; nothing opens until the user clicks one.
        setActiveAllocationSection(null);
        setBomItemExpanded(false);
        setStockDetailsExpanded(false);
        setPoDetailsExpanded(false);
        setBomStageOpen(true);

        loadBomItems();
        loadLoadStockBom();
    };

    const handleBack = () => {
        if (bomStageOpen) {
            clearBomAutoOpenTimer();
            closeStockPanel();
            setBomItemExpanded(false);
            setStockDetailsExpanded(false);
            setPoDetailsExpanded(false);
            setDcCalendarOpen(false);
            setBomGuideVisible(false);
            setActiveAllocationSection(null);
            setBomStageOpen(false);
            return;
        }
        closeAddNew();
    };

    const showLoadStockToast = (type, message) => {
        setLoadStockToast({ type, message });
        if (loadStockToastTimerRef.current) clearTimeout(loadStockToastTimerRef.current);
        loadStockToastTimerRef.current = setTimeout(() => setLoadStockToast(null), 5000);
    };

    // Select / unselect a batch by clicking its card in the Load Stock [BOM] panel.
    // Selecting auto-fills min(remaining Allocated Qty, this batch's available stock),
    // so one big batch fills the whole quantity and further batches only fill what is left.
    const toggleBatch = (batchNo, available) => {
        if (isLocked) return;
        setShowBatchQtyValidation(false);
        setBatchSelections((prev) => {
            const next = { ...prev };
            if (batchNo in next) { delete next[batchNo]; return next; }
            const used = roundQty(Object.values(prev).reduce((s, v) => s + (Number(v) || 0), 0));
            const remaining = Math.max(0, roundQty(bomTargetQty - used));
            const suggested = Math.min(remaining, Number(available) || 0);
            next[batchNo] = suggested > 0 ? String(roundQty(suggested)) : '';
            return next;
        });
    };

    // Per-batch Allocation Qty input: numbers only, never above that batch's available stock,
    // and the total across all batches can never exceed the Allocated Qty.
    const changeBatchQty = (batchNo, value, available) => {
        if (isLocked) return;
        if (!/^\d*\.?\d*$/.test(value)) {
            showLoadStockToast('error', 'Allocation Qty accepts numbers only.');
            return;
        }
        if (value !== '' && value !== '.' && (!Number.isFinite(Number(available)) || Number(value) > Number(available))) {
            showLoadStockToast('error', `Allocation Qty for ${batchNo} cannot be more than the available stock (${available}).`);
            return;
        }
        const othersTotal = roundQty(
            Object.entries(batchSelections)
                .filter(([key]) => key !== batchNo)
                .reduce((s, [, v]) => s + (Number(v) || 0), 0)
        );
        if (roundQty(othersTotal + (Number(value) || 0)) > bomTargetQty) {
            showLoadStockToast(
                'error',
                `Total batch qty cannot exceed the Allocated Qty (${bomTargetQty}). You can add up to ${Math.max(0, roundQty(bomTargetQty - othersTotal))} for ${batchNo}.`
            );
            return;
        }
        setShowBatchQtyValidation(false);
        setBatchSelections((prev) => ({ ...prev, [batchNo]: value }));
    };

    const handleAllocateBatch = () => {
        if (isLocked) return;
        const entries = Object.entries(batchSelections);
        const fail = (msg) => {
            setShowBatchQtyValidation(false);
            window.requestAnimationFrame(() => setShowBatchQtyValidation(true));
            showLoadStockToast('error', msg);
        };
        if (entries.length === 0) return fail('Select at least one batch before allocating.');

        const batches = [];
        for (const [batchNo, qtyStr] of entries) {
            const qty = Number(qtyStr);
            const available = Number(loadStockBom.find((b) => b.batch === batchNo)?.availableStock);
            if (!Number.isFinite(qty) || qty <= 0) return fail(`Enter an Allocation Qty greater than zero for batch ${batchNo}.`);
            if (!Number.isFinite(available) || available <= 0) return fail(`Batch ${batchNo} has no valid available stock.`);
            if (qty > available) return fail(`Allocation Qty for ${batchNo} cannot be more than its available stock (${available}).`);
            batches.push({ batchNo, allocationQty: qty, availableStock: available });
        }

        const total = roundQty(batches.reduce((sum, b) => sum + b.allocationQty, 0));

        // The RM batch total must equal the Allocated Qty from BOM I/P Item Details.
        if (!(bomTargetQty > 0)) return fail('Enter the Allocated Qty in BOM I/P Item Details first.');
        if (total !== bomTargetQty) {
            return fail(
                total < bomTargetQty
                    ? `Selected batches total ${total}, but the Allocated Qty is ${bomTargetQty}. ${roundQty(bomTargetQty - total)} more is needed.`
                    : `Selected batches total ${total}, which is more than the Allocated Qty ${bomTargetQty}. Reduce it by ${roundQty(total - bomTargetQty)}.`
            );
        }

        setLoadedStock({
            itemCode: bomIpItemCode,
            itemName: bomIpItemName,
            batches,
            batchNo: batches.map((b) => b.batchNo).join(', '),
            allocationQty: String(total),
            allocationType: 'BOM',
            processType: form.processType,
            fromUnit: bomFromUnit,
            fromWhs: bomFromWhs,
            toUnit: form.toUnit,
            toWhs: form.targetWhs || form.toWhs,
        });
        setBomStockLoadedKeys((previous) => new Set(previous).add(currentBomStockKey));
        closeStockPanel();
        showLoadStockToast('success', `Load stock is done for ${batches.length} batch${batches.length > 1 ? 'es' : ''} (total ${total}).`);
    };

    // Deleting the inventory share also clears the "loaded" flag so stock can be loaded again.
    const handleDeleteInventoryShare = () => {
        if (isLocked) return;
        setLoadedStock(null);
        setBomStockLoadedKeys((previous) => {
            const next = new Set(previous);
            next.delete(currentBomStockKey);
            return next;
        });
        showLoadStockToast('success', 'Inventory share removed. You can load stock again.');
    };

    const handleSave = () => {
        if (isLocked) return;
        if (!isFormComplete) return;
        if (!isBomAllocationComplete) {
            setShowBomValidation(false);
            window.requestAnimationFrame(() => setShowBomValidation(true));
            setAllocationValidationToast(true);
            if (allocationValidationToastTimerRef.current) clearTimeout(allocationValidationToastTimerRef.current);
            allocationValidationToastTimerRef.current = setTimeout(() => setAllocationValidationToast(false), 4000);
            return;
        }
        setAllocationValidationToast(false);
        setShowBomValidation(false);
        console.log('Saving stock allocation record:', {
            ...form,
            bomItem: selectedBom,
            fromWhs: bomFromWhs,
            allocatedQty: bomAllocatedQty,
            fromUnit: bomFromUnit,
            bomRemarks,
        });
        setAllocationSaved(true);
        setAllocationSuccessToast(true);
        if (allocationSuccessToastTimerRef.current) clearTimeout(allocationSuccessToastTimerRef.current);
        allocationSuccessToastTimerRef.current = setTimeout(() => setAllocationSuccessToast(false), 4000);
    };

    // Post the loaded inventory share to the DB, then return to the list (row shows Released).
    const handlePostTransfer = async () => {
        if (isLocked) return;
        if (posting) return;
        if (editMode && !hasEditChanges) {
            showLoadStockToast('error', 'No changes to update. Change something first.');
            return;
        }
        if (!loadedStock) {
            showLoadStockToast('error', 'There is no inventory share to post. Load stock first.');
            return;
        }
        // If the Allocated Qty was changed after loading stock, the loaded batches no longer match.
        if (roundQty(loadedStock.allocationQty) !== roundQty(bomAllocatedQty)) {
            showLoadStockToast(
                'error',
                `Loaded batch total (${loadedStock.allocationQty}) does not match the Allocated Qty (${bomAllocatedQty}). Reload the stock.`
            );
            return;
        }
        setPosting(true);
        try {
            const isEdit = editMode && editingRow?.id != null;
            const res = await fetch(isEdit ? `/api/stock-allocations/${editingRow.id}` : '/api/stock-allocations', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    docDate: form.docDate,
                    documentNo: form.docNo,
                    workOrderNo: form.workOrderNo,
                    jobCardNo: form.jobCardNo,
                    processType: loadedStock.processType,
                    bpCode: form.bpCode,
                    bpName: form.bpName,
                    fgItemCode: form.fgItemCode,
                    fgItemName: form.fgItemName,
                    opItemCode: form.opItem,
                    opItemName: form.opItemName,
                    plannedQty: form.plannedQty,
                    itemCode: loadedStock.itemCode,
                    itemName: loadedStock.itemName,
                    batchNo: loadedStock.batchNo,           // "B1, B2" (kept for compatibility)
                    batches: (loadedStock.batches || []).map(({ batchNo, allocationQty }) => ({ batchNo, allocationQty })),
                    allocationQty: loadedStock.allocationQty, // total across all batches
                    allocationType: loadedStock.allocationType,
                    fromUnit: bomFromUnit || loadedStock.fromUnit,
                    fromWhs: bomFromWhs || loadedStock.fromWhs,
                    toUnit: loadedStock.toUnit,
                    toWhs: loadedStock.toWhs,
                    remarks: bomRemarks || form.remarks,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `HTTP ${res.status}`);
            }
            const saved = await res.json().catch(() => ({}));
            const wasEdit = isEdit;

            // The posted allocation now shows on the main page with status "Released".
            // The PO details are reached later by opening that Released row.
            await loadAllocations();
            closeAddNew();
            showLoadStockToast(
                'success',
                wasEdit
                    ? `Transfer ${saved.documentNo || form.docNo} updated. Status: Released.`
                    : `Transfer ${saved.documentNo || form.docNo} posted. Status: Released. Open it from the list to view the Purchase Order Info's.`
            );
        } catch (err) {
            console.error('[POST TRANSFER] failed:', err);
            showLoadStockToast('error', err.message || 'Could not post the transfer.');
        } finally {
            setPosting(false);
        }
    };

    // Post PO: stores the PO details and releases the allocation for Production Execution.
    const handlePostPo = async () => {
        if (isLocked) return;
        if (postingPo || !postedAllocation?.id) return;
        if (!poForm.dcDate || !poForm.poRefNo.trim() || !poForm.poNum.trim()) {
            showLoadStockToast('error', 'Enter DC Date, PO Reference No and PO Num before posting the PO.');
            return;
        }
        setPostingPo(true);
        try {
            const res = await fetch(`/api/stock-allocations/${postedAllocation.id}/post-po`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dcDate: poForm.dcDate,
                    poReferenceNo: poForm.poRefNo.trim(),
                    poNumber: poForm.poNum.trim(),
                    remarks: form.remarks,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `HTTP ${res.status}`);
            }
            setPostedAllocation((prev) => ({ ...prev, poStatus: 'Posted' }));
            setDcCalendarOpen(false);
            await loadAllocations();
            showLoadStockToast('success', 'PO posted successfully. PO Cancel is now enabled.');
        } catch (err) {
            console.error('[POST PO] failed:', err);
            showLoadStockToast('error', err.message || 'Could not post the PO.');
        } finally {
            setPostingPo(false);
        }
    };

    // PO Cancel (step 2): runs only after the user clicks "Yes" in the confirmation toast.
    // Cancels only the PO, makes the PO grid read-only, then returns to Stock Details after 2 seconds.
    const handlePoCancel = async () => {
        if (isLocked) return;
        if (cancellingPo || !postedAllocation?.id) return;
        if (postedAllocation.poStatus !== 'Posted') {
            showLoadStockToast('error', 'PO Cancel is available only after the PO has been posted.');
            return;
        }
        setCancellingPo(true);
        try {
            const res = await fetch(`/api/stock-allocations/${postedAllocation.id}/cancel-po`, { method: 'POST' });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `HTTP ${res.status}`);
            }
            setPostedAllocation((prev) => ({ ...prev, poStatus: 'Cancelled' }));
            setDcCalendarOpen(false);
            await loadAllocations();
            showLoadStockToast('success', 'PO cancelled. Returning to Stock Details...');
            clearPoRedirectTimer();
            poRedirectTimerRef.current = window.setTimeout(() => {
                poRedirectTimerRef.current = null;
                openAllocationSection('stock');
            }, 2000);
        } catch (err) {
            console.error('[PO CANCEL] failed:', err);
            showLoadStockToast('error', err.message || 'Could not cancel the PO.');
        } finally {
            setCancellingPo(false);
        }
    };

    // PO Cancel (step 1): the button only opens the confirmation toast.
    const requestPoCancel = () => {
        if (isLocked) return;
        if (cancellingPo || !postedAllocation?.id) return;
        if (postedAllocation.poStatus !== 'Posted') {
            showLoadStockToast('error', 'PO Cancel is available only after the PO has been posted.');
            return;
        }
        setConfirmToast({
            title: 'Cancel PO?',
            message: `Do you want to cancel the PO for ${postedAllocation.inventoryNo}?`,
            confirmLabel: 'Yes, Cancel PO',
            onConfirm: handlePoCancel,
        });
    };

    // Cancel Transfer (step 2): runs only after the user clicks "Yes" in the confirmation toast.
    // Only available when modifying an existing stock allocation.
    const handleCancelTransfer = async () => {
        if (isLocked) return;
        if (!editMode || cancellingTransfer || !postedAllocation?.id) return;
        setCancellingTransfer(true);
        try {
            const res = await fetch(`/api/stock-allocations/${postedAllocation.id}/cancel`, { method: 'POST' });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `HTTP ${res.status}`);
            }
            await loadAllocations();   // row now shows status "Cancelled"
            closeAddNew();
            showLoadStockToast('success', 'Transfer cancelled. The stock allocation now shows status Cancelled.');
        } catch (err) {
            console.error('[CANCEL TRANSFER] failed:', err);
            showLoadStockToast('error', err.message || 'Could not cancel the transfer.');
        } finally {
            setCancellingTransfer(false);
        }
    };

    // Cancel Transfer (step 1): the button only opens the confirmation toast.
    const requestCancelTransfer = () => {
        if (isLocked) return;
        if (!editMode || cancellingTransfer || !postedAllocation?.id) return;
        setConfirmToast({
            title: 'Cancel Transfer?',
            message: `Do you want to cancel stock allocation ${postedAllocation.inventoryNo}? This cannot be undone.`,
            confirmLabel: 'Yes, Cancel Transfer',
            onConfirm: handleCancelTransfer,
        });
    };

    if (view === 'add') {
        return (
            <div className="min-h-screen bg-white" id="add-stock-allocation-page">
                <style>{addPageAnimations}</style>
                <div className="px-6 pt-6">
                    <div
                        className="sa-slide-down bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                        id="page-heading-card">
                        <div>
                            <nav className="flex items-center gap-2 text-sm text-slate-500 font-semibold mb-2" id="breadcrumb-trail">
                                <span>PPC</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                <span>Stock Allocation</span>
                            </nav>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-extrabold text-slate-700">
                                    Inventory Allocation Management console
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={handleBack}
                                title={bomStageOpen ? 'Back to form' : 'Back to list'}
                                className="flex items-center gap-2 px-3 py-3.5 border border-slate-300 rounded-xl bg-white text-sm font-bold text-slate-900 cursor-pointer transition hover:bg-slate-100 active:scale-95"
                                id="btn-back">
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <div
                                className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm font-bold text-slate-900"
                                id="step-indicator">
                                <span className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-200 text-black-700">
                                    Inventory Allocations
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 pt-4">
                    <div
                        className="sa-banner rounded-2xl px-6 py-5 md:px-8 flex items-center justify-between"
                        style={{ backgroundColor: '#32343aff' }}
                        id="stage-banner">
                        <div>
                            <h2 className="text-[28px] font-bold text-white">
                                {editMode ? 'Modify Stock Allocation Master Configuration' : 'Create Stock Allocation Master Configuration'}
                            </h2>
                            <p className="text-[16px] text-slate-400 mt-0">Integrated Live Database</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 pt-6 pb-8" id="form-body">
                    {!bomStageOpen && (
                        <div className="sa-fade-up bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-6 md:px-8 md:py-7"
                            style={{ animationDelay: '0.3s' }}>
                            <div className="space-y-6">
                                <div className="sa-fade-up grid grid-cols-1 md:grid-cols-12 gap-6" style={{ animationDelay: '0.45s' }}>
                                    <div className="md:col-span-2">
                                        <label htmlFor="input-work-order-no" className="block text-[14px] font-bold text-slate-600 tracking-wide mb-1.5">WORK ORDER NO <span className="text-red-500 ml-1">*</span></label>
                                        {editMode ? (
                                            <input
                                                id="input-work-order-no"
                                                type="text"
                                                value={`${form.workOrderNo}${form.fgItemCode ? ` — ${form.fgItemCode}` : ''}`}
                                                readOnly
                                                disabled
                                                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2.5 text-[15px] font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                                            />
                                        ) : (
                                            <div className="relative">
                                                <div className="relative">
                                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                                                    <button type="button" id="input-work-order-no" aria-haspopup="listbox" aria-expanded={orderDropdownOpen}
                                                        onClick={() => { setOrderDropdownOpen((open) => !open); setOrderSearch(''); }}
                                                        className="relative w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-8 text-left text-[15px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500">
                                                        <span className={form.workOrderNo ? 'block truncate' : 'block truncate text-slate-500'}>
                                                            {form.workOrderNo ? (() => { const selected = orderOptions.find((o) => o.value === form.workOrderNo); return selected ? `${selected.label}${selected.itemCode ? ` — ${selected.itemCode}` : ''}` : form.workOrderNo; })() : ordersLoading ? 'Loading orders...' : 'Select Work / Stock orders'}
                                                        </span>
                                                        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                                    </button>
                                                </div>
                                                {!editMode && orderDropdownOpen && (
                                                    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl">
                                                        <div className="border-b border-slate-200 bg-white p-2">
                                                            <div className="relative">
                                                                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                                                <input autoComplete="off" autoFocus value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)}
                                                                    onKeyDown={(e) => { if (e.key === 'Escape') setOrderDropdownOpen(false); }}
                                                                    placeholder="Search order or part..." className="w-full rounded-md border border-slate-200 py-2 pl-8 pr-2 text-xs outline-none focus:border-slate-400" />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-[200px] overflow-y-auto overscroll-contain" role="listbox" aria-label="Work and stock orders">
                                                            {['work', 'stock'].map((kind) => {
                                                                const query = orderSearch.trim().toLowerCase();
                                                                const filteredOptions = orderOptions.filter((o) => o.kind === kind && (!query || [o.value, o.itemCode, o.itemName].some((v) => String(v ?? '').toLowerCase().includes(query))));
                                                                if (!filteredOptions.length) return null;
                                                                return <div key={kind}>
                                                                    <div className="sticky top-0 z-10 border-y border-slate-100 bg-slate-50 px-3 py-1.5 text-[17px] font-extrabold text-slate-700">{kind === 'work' ? 'Work Orders (WO)' : 'Stock Orders (WO-ST)'}</div>
                                                                    {filteredOptions.map((o) => <button type="button" role="option" aria-selected={form.workOrderNo === o.value} key={`${kind}-${o.value}`}
                                                                        onClick={() => { selectOrder(o.value); setOrderDropdownOpen(false); setOrderSearch(''); }}
                                                                        className={`block w-full px-3 py-1.5 text-left text-sm leading-5 transition hover:bg-blue-50 ${form.workOrderNo === o.value ? 'bg-blue-500 text-white hover:bg-blue-500' : 'text-slate-800'}`}>
                                                                        <span className="font-semibold">{o.label}</span>{o.itemCode && <span> — {o.itemCode}</span>}
                                                                        {o.itemName && <span className={`ml-1 text-xs ${form.workOrderNo === o.value ? 'text-slate-100' : 'text-slate-500'}`}>({o.itemName})</span>}
                                                                    </button>)}
                                                                </div>;
                                                            })}
                                                            {ordersLoading ? (
                                                                <p className="px-3 py-4 text-center text-xs text-slate-500">Loading orders...</p>
                                                            ) : orderOptions.filter((o) => [o.value, o.itemCode, o.itemName].some((v) => String(v ?? '').toLowerCase().includes(orderSearch.trim().toLowerCase()))).length === 0 &&
                                                            <p className="px-3 py-4 text-center text-xs text-slate-500">No matching orders found</p>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {orderLoadError && <p className="mt-1 text-xs text-red-600">{orderLoadError}</p>}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="select-job-card-no" className="block text-[14px] font-bold text-slate-600 tracking-wide mb-1.5">JOB CARD NO <span className="text-red-500 ml-1">*</span></label>
                                        <select autoComplete="off" id="select-job-card-no" value={form.jobCardNo} onChange={(e) => selectJobCard(e.target.value)} disabled={editMode || !form.workOrderNo || jobCardsLoading}
                                            className="w-full px-3.5 py-2.5 text-[16px] font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-slate-800 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70">
                                            <option value="">{jobCardsLoading ? 'Loading job cards...' : !form.workOrderNo ? 'Select an order first' : '-- Select Job Card --'}</option>
                                            {jobCardOptions.map((jc) => (<option key={jc.jobCardNo} value={jc.jobCardNo}>{jc.jobCardNo}</option>))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <InfoCard label="To Unit" value={form.toUnit} />
                                    </div>

                                    <div className="md:col-span-3">
                                        <InfoCard key={`op-code-${form.jobCardNo}`} label="Operation Code" value={form.opItem} enabled={Boolean(form.jobCardNo)} className={form.jobCardNo ? 'sa-pop' : ''} valueClassName="text-[16px]" />
                                    </div>

                                    <div className="md:col-span-3">
                                        <InfoCard key={`op-name-${form.jobCardNo}`} label="Operation Name" value={form.opItemName} enabled={Boolean(form.jobCardNo)} className={form.jobCardNo ? 'sa-pop' : ''} valueClassName="text-[16px]" />
                                    </div>
                                </div>

                                <div className="sa-fade-up grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch" style={{ animationDelay: '0.6s' }}>
                                    <div className="md:col-span-4">
                                        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20">
                                            <div className="border-b border-slate-200 px-4 pb-5 pt-3">
                                                <label htmlFor="input-bp-code" className="block text-[13px] font-bold uppercase tracking-wide text-slate-600">
                                                    BP CODE
                                                </label>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <input
                                                        autoComplete="off"
                                                        id="input-bp-code"
                                                        type="text"
                                                        value={form.bpCode}
                                                        disabled
                                                        onChange={(e) => update('bpCode', e.target.value)}
                                                        placeholder="e.g. C00065"
                                                        className="w-full bg-transparent text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 px-4 pb-3 pt-2.5">
                                                <label htmlFor="input-bp-name" className="block text-[13px] font-bold uppercase tracking-wide text-slate-600">
                                                    BP NAME
                                                </label>
                                                <input
                                                    autoComplete="off"
                                                    id="input-bp-name"
                                                    type="text"
                                                    value={form.bpName}
                                                    disabled
                                                    onChange={(e) => update('bpName', e.target.value)}
                                                    placeholder="Business Partner name"
                                                    className="mt-1 w-full bg-transparent text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 flex flex-col gap-4">
                                        <InfoCard label="Process Type" value={form.processType} />
                                        <InfoCard label="Target Whs" value={form.targetWhs} />
                                    </div>

                                    <div className="md:col-span-4">
                                        <div key={`fg-details-${form.workOrderNo}`} className={`flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-500/20 ${form.workOrderNo ? 'sa-pop' : ''}`}>
                                            <div className="border-b border-slate-200 px-4 pb-6 pt-3">
                                                <label htmlFor="input-fg-item-code" className="block text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                                                    FG ITEM CODE
                                                </label>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <input
                                                        autoComplete="off"
                                                        id="input-fg-item-code"
                                                        type="text"
                                                        value={form.fgItemCode}
                                                        disabled
                                                        onChange={(e) => update('fgItemCode', e.target.value)}
                                                        className="w-full bg-transparent text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 px-4 pb-3 pt-2.5">
                                                <label htmlFor="input-fg-item-name" className="block text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                                                    FG ITEM NAME
                                                </label>
                                                <input
                                                    autoComplete="off"
                                                    id="input-fg-item-name"
                                                    type="text"
                                                    value={form.fgItemName}
                                                    disabled
                                                    onChange={(e) => update('fgItemName', e.target.value)}
                                                    className="mt-1 w-full bg-transparent text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="sa-fade-up grid grid-cols-1 md:grid-cols-12 gap-6" style={{ animationDelay: '0.75s' }}>
                                    <div className="md:col-span-4">
                                        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20">
                                            <div className="border-b border-slate-200 px-4 pb-2.5 pt-3">
                                                <label htmlFor="input-doc-no" className="block text-[12px] font-bold uppercase tracking-wide text-slate-600">
                                                    DOC. NO.
                                                </label>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <Hash className="h-4 w-4 shrink-0 text-slate-600" />
                                                    <input
                                                        autoComplete="off"
                                                        id="input-doc-no"
                                                        type="text"
                                                        value={form.docNo}
                                                        disabled
                                                        className="w-full bg-transparent font-mono text-base font-bold text-slate-900 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 px-4 pb-3 pt-2.5">
                                                <label htmlFor="input-doc-date" className="block text-[12px] font-bold uppercase tracking-wide text-slate-600">
                                                    DOC. DATE
                                                </label>
                                                <div className="relative mt-1 flex items-center gap-2">
                                                    <Calendar
                                                        className="h-4 w-4 shrink-0 cursor-pointer text-slate-400 hover:text-slate-600"
                                                        onClick={() => !isLocked && docDateInputRef.current?.showPicker?.()}
                                                        aria-label="Choose document date"
                                                    />
                                                    <input
                                                        autoComplete="off"
                                                        id="input-doc-date"
                                                        type="text"
                                                        value={formatDocDateForDisplay(form.docDate)}
                                                        placeholder="DD-MM-YYYY"
                                                        disabled
                                                        onChange={(e) => update('docDate', parseDocDateInput(e.target.value))}
                                                        className="w-full bg-transparent font-mono text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                                                    />
                                                    <input
                                                        autoComplete="off"
                                                        ref={docDateInputRef}
                                                        type="date"
                                                        value={form.docDate}
                                                        disabled={isLocked}
                                                        onChange={(e) => update('docDate', e.target.value)}
                                                        tabIndex={-1}
                                                        aria-hidden="true"
                                                        className="absolute h-0 w-0 opacity-0 pointer-events-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <InfoCard label="Planned Qty" value={form.plannedQty} mono />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {bomStageOpen && (
                        <div
                            className="flex flex-wrap items-start gap-6 pt-2"
                            role="tablist"
                            aria-label="Stock allocation sections"
                            id="allocation-section-cards"
                        >
                            <div className="sa-hang relative flex w-[260px] justify-center" id="bom-hanging-tab" style={{ animationDelay: '0.1s' }}>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeAllocationSection === 'bom'}
                                    onClick={() => openAllocationSection('bom')}
                                    title="Open BOM I/P Item Details"
                                    className={`group relative z-10 flex h-[190px] w-full origin-top cursor-pointer flex-col justify-between rounded-xl border bg-white px-5 py-5 text-left shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 hover:rotate-[1deg] hover:scale-[1.02] hover:shadow-xl ${activeAllocationSection === 'bom' && bomItemExpanded ? 'border-slate-800 ring-2 ring-slate-800/30' : 'border-slate-200'}`}
                                >
                                    <h2 className="mt-1 origin-left text-[22px] font-extrabold tracking-tight text-slate-900 transition-transform duration-300 group-hover:scale-[1.02]">
                                        BOM I/P Item Details
                                    </h2>
                                    <p className="mt-2 text-[12px] font-bold leading-relaxed text-slate-500">
                                        List of raw materials, components, and sub-assemblies required to manufacture a product
                                        <br />
                                        <span className="text-blue-500 transition-colors group-hover:text-blue-600">+ Open BOM Details</span>
                                    </p>
                                </button>
                            </div>

                            <div className="sa-hang relative flex w-[260px] justify-center" id="stock-hanging-tab" style={{ animationDelay: '0.25s' }}>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeAllocationSection === 'stock'}
                                    onClick={() => openAllocationSection('stock')}
                                    title="Open Stock Details"
                                    className={`group relative z-10 flex h-[190px] w-full cursor-pointer flex-col justify-between rounded-xl border bg-white px-5 py-5 text-left shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 hover:rotate-[1deg] hover:scale-[1.02] hover:shadow-xl ${activeAllocationSection === 'stock' && stockDetailsExpanded ? 'border-slate-800 ring-2 ring-slate-800/30' : 'border-slate-200'}`}
                                >
                                    <h2 className="mt-1 origin-left text-[25px] font-extrabold tracking-tight text-slate-900 transition-transform duration-300 group-hover:scale-[1.02]">
                                        Stock Details
                                    </h2>
                                    <p className="mt-2 text-[12px] font-bold leading-relaxed text-slate-500">
                                        Exact raw material quantities digitally locked and allocated by the BOM -- Committed Stock
                                        <br />
                                        <span className="text-blue-500 transition-colors group-hover:text-blue-600">+ Open Stock Details</span>
                                    </p>
                                </button>
                            </div>

                            <div className="sa-hang relative flex w-[260px] justify-center" id="summary-hanging-tab" style={{ animationDelay: '0.4s' }}>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeAllocationSection === 'summary'}
                                    onClick={() => openAllocationSection('summary')}
                                    title="Open PO info's"
                                    className={`group relative z-10 flex h-[190px] w-full cursor-pointer flex-col justify-between rounded-xl border bg-white px-5 py-5 text-left shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 hover:rotate-[1deg] hover:scale-[1.02] hover:shadow-xl ${activeAllocationSection === 'summary' && poDetailsExpanded ? 'border-slate-500 ring-2 ring-slate-500/30' : 'border-slate-200'}`}>
                                    <h2 className="mt-1 origin-left text-[21px] font-extrabold tracking-tight text-slate-900 transition-transform duration-300 group-hover:scale-[1.02]">
                                        Purchase Order Info's
                                    </h2>
                                    <p className="mt-2 text-[12px] font-bold leading-relaxed text-slate-500">
                                        Tracks the quantity of raw materials currently on procurement documents that have been requested from suppliers.
                                        <br />
                                        <span className="text-blue-500 transition-colors group-hover:text-blue-600">+ Open PO Info's</span>
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}

                    {bomStageOpen && activeAllocationSection === 'bom' && bomItemExpanded && (
                        <div
                            className={`sa-fade-up mt-8 ${stockPanelMode
                                ? "grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.13fr)_minmax(320px,1fr)]"
                                : "space-y-6"
                                }`}
                            id="bom-inline-section"
                        >
                            <div className={`rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm ${stockPanelMode ? "w-full min-w-0" : "md:w-[53%]"
                                } md:px-8 md:py-7`} id="bom-item-card">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[20px] font-bold uppercase tracking-[0.08em] text-slate-600">BOM I/P Item Details</p>
                                        <h2 id="bom-modal-title" className="mt-1 text-[19px] font-extrabold text-slate-800">Input material allocation</h2>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-7">
                                        <div className="md:col-span-3 md:col-start-1 md:row-span-2 md:row-start-1">
                                            <div className={`flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 ${showBomValidation && !selectedBom ? 'sa-invalid-field' : ''}`}>
                                                <div className="flex-1 border-b border-slate-200 px-4 pb-4 pt-3">
                                                    <p className="block text-[12px] font-bold uppercase tracking-wide text-slate-700">I/P Item Code</p>
                                                    {bomItems.length > 1 && !useSubConIpItem && (
                                                        <select
                                                            value={selectedBomId}
                                                            disabled={isLocked}
                                                            onChange={(e) => { setAllocationSaved(false); setAllocationSuccessToast(false); setAllocationValidationToast(false); setSelectedBomId(e.target.value); setBomAllocatedQty(''); setBomQtyInputMessage(''); }}
                                                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"
                                                        >
                                                            {bomItems.map((b) => (
                                                                <option key={b.id} value={b.id}>{b.ipItemCode} - {b.ipItemName}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    <p className="mt-1 min-h-[28px] break-all text-base font-extrabold text-slate-900">{bomItemsLoading ? 'Loading...' : bomIpItemCode}</p>
                                                </div>
                                                <div className="flex-1 px-4 pb-3 pt-2.5">
                                                    <p className="block text-[12px] font-bold uppercase tracking-wide text-slate-700">I/P Item Name</p>
                                                    <p className="mt-1 min-h-[28px] break-words text-base font-extrabold text-slate-900">{bomIpItemName || bomItemsError}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 md:col-start-4 md:row-start-1">
                                            <InfoCard label="UoM" value={getBomUom(bomIpItemCode, bomIsSubCon)} />
                                        </div>
                                        <div className="md:col-span-2 md:col-start-6 md:row-start-1">
                                            <InfoCard label="Base Qty" value={selectedBom?.baseQty ?? ''} mono />
                                        </div>

                                        <div className="md:col-span-2 md:col-start-4 md:row-start-2">
                                            <InfoCard label="Req Qty" value={selectedBom?.reqQty ?? ''} mono />
                                        </div>
                                        <div className="md:col-span-2 md:col-start-6 md:row-start-2">
                                            <label className={`block h-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 ${showBomValidation && !isBomQtyValid ? 'sa-invalid-field' : ''}`} >
                                                <span className="block text-[12px] font-bold uppercase tracking-wide text-slate-700">Allocated Qty</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    pattern="[0-9]*\.?[0-9]*"
                                                    autoComplete="off"
                                                    value={bomAllocatedQty}
                                                    disabled={isLocked}
                                                    onChange={(e) => handleBomAllocatedQtyInput(e.target.value)}
                                                    placeholder="Enter Quantity"
                                                    aria-invalid={showBomValidation && !isBomQtyValid}
                                                    className="mt-1 w-full bg-transparent text-[20px] font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                                                />
                                                {bomQtyInputMessage && (
                                                    <span role="alert" className="mt-1 block text-xs font-bold text-rose-600">{bomQtyInputMessage}</span>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-8">
                                        <div className="md:col-span-2">
                                            <label className={`block h-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 ${showBomValidation && !bomFromUnit ? 'sa-invalid-field' : ''}`} >
                                                <span className="block text-[12px] font-bold uppercase tracking-wide text-slate-700">From Unit</span>
                                                <select value={bomFromUnit} disabled={isLocked} onChange={(e) => { setAllocationSaved(false); setAllocationSuccessToast(false); setAllocationValidationToast(false); setBomFromUnit(e.target.value); }} className="mt-1 w-full bg-transparent text-[18px] font-bold text-slate-900 focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"><option value="">--Select Unit--</option><option value="Unit-1">Unit-1</option><option value="Unit-2">Unit-2</option><option value="Unit-3">Unit-3</option></select>
                                            </label>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={`block h-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 ${showBomValidation && !bomFromWhs ? 'sa-invalid-field' : ''}`} >
                                                <span className="block text-[12px] font-bold uppercase tracking-wide text-slate-700">From Whs</span>
                                                <select
                                                    value={bomFromWhs}
                                                    disabled={isLocked}
                                                    onChange={(e) => { setAllocationSaved(false); setAllocationSuccessToast(false); setAllocationValidationToast(false); setBomFromWhs(e.target.value); }}
                                                    className="mt-1 w-full bg-transparent text-[18px] font-bold text-slate-900 focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <option value="">--Select Whse--</option>
                                                    {BOM_FROM_WHS_OPTIONS.map((w) => (
                                                        <option key={w} value={w}>{w}</option>
                                                    ))}
                                                </select>
                                            </label>
                                        </div>
                                        <div className="md:col-span-2">
                                            <InfoCard label="To Whs" value={form.targetWhs || form.toWhs} />
                                        </div>
                                        <div className="md:col-span-6 md:col-start-1">
                                            <label className="block h-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-500/20">
                                                <span className="block text-[12px] font-bold uppercase tracking-wide text-slate-700">Remarks</span>
                                                <input type="text" autoComplete="off" value={bomRemarks} disabled={isLocked} onChange={(e) => { setAllocationSaved(false); setAllocationSuccessToast(false); setBomRemarks(e.target.value); }} placeholder="Add Remarks..." className="mt-1 w-full bg-transparent text-[1] font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="mt-6 flex w-full flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between"
                                    id="stock-loading-actions">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isLocked) return;
                                                // Re-open with already-loaded batches pre-selected, so more can be added or changed.
                                                const existing = {};
                                                getBatchLines(loadedStock).forEach((b) => { existing[b.batchNo] = String(b.allocationQty ?? ''); });
                                                setBatchSelections(existing);
                                                setShowBatchQtyValidation(false);
                                                setStockPanelMode('bom');
                                                loadLoadStockBom();
                                            }}
                                            disabled={!allocationSaved || isLocked || stockPanelMode === 'bom'}
                                            title="Load BOM stock"
                                            className={`rounded-md px-3 py-3 text-sm font-extrabold shadow-sm transition ${!allocationSaved || isLocked || stockPanelMode === 'bom' ? 'cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-500 opacity-80' : 'border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.98]'}`}>
                                            Load Stock [BOM]
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => !isLocked && setStockPanelMode('rework')}
                                            disabled={!allocationSaved || isLocked || stockPanelMode === 'rework'}
                                            title="Load Rework stock"
                                            className={`rounded-md px-3 py-3 text-sm font-semibold shadow-sm transition ${!allocationSaved || isLocked || stockPanelMode === 'rework' ? 'cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-500 opacity-80' : 'border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.98]'}`}
                                        >
                                            Load Stock [Rework]
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => !isLocked && setStockPanelMode('manual')}
                                            disabled={!allocationSaved || isLocked || stockPanelMode === 'manual'}
                                            title="Load Manual stock"
                                            className={`rounded-md px-3 py-3 text-sm font-semibold shadow-sm transition ${!allocationSaved || isLocked || stockPanelMode === 'manual' ? 'cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-500 opacity-80' : 'border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.98]'}`}
                                        >
                                            Load Stock [Manual]
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={isLocked}
                                            className="rounded-md bg-gray-700 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-gray-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-gray-700">
                                            Save Allocation
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { closeStockPanel(); setBomItemExpanded(false); }}
                                            className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-100 active:scale-95">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {stockPanelMode && (
                                <div
                                    className={`sa-fade-up w-full min-w-0 ${stockPanelMode === "bom" ? "max-w-[560px]" : stockPanelMode === "rework" ? "max-w-[570px]" : "max-w-[580px]"} rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm md:px-8 md:py-7`}
                                    id="stock-detail-panel"
                                >
                                    <div className="mb-2 flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                                        <h3 className="text-[18px] font-extrabold uppercase tracking-[0.02em] text-slate-900">
                                            {stockPanelMode === 'bom' ? 'Load Stock [BOM]' : stockPanelMode === 'rework' ? 'Load Stock [Rework]' : 'Load Stock [Manual]'}
                                        </h3>
                                    </div>
                                    <div className="space-y-3">
                                        {stockPanelMode === 'bom' ? (
                                            <>
                                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                                                    <div className="border-b border-slate-200 px-3 py-3">
                                                        <p className="text-[12px] font-extrabold uppercase tracking-wide text-slate-700">Select Batches</p>
                                                        <p className="mt-1 text-xs font-semibold text-slate-500">Click one or more batches and enter the Allocation Qty for each. The total must equal the Allocated Qty ({bomTargetQty}).</p>
                                                    </div>

                                                    {/* Batch cards grid */}
                                                    <div className="max-h-[300px] overflow-y-auto bg-slate-50 p-2">
                                                        {loadStockBomLoading && (
                                                            <p className="px-3 py-4 text-center text-sm font-semibold text-slate-500">Loading batches...</p>
                                                        )}
                                                        {!loadStockBomLoading && loadStockBomError && (
                                                            <p className="px-3 py-4 text-center text-sm font-semibold text-red-600">{loadStockBomError}</p>
                                                        )}
                                                        {!loadStockBomLoading && !loadStockBomError && loadStockBom.length === 0 && (
                                                            <p className="px-3 py-4 text-center text-sm font-semibold text-slate-500">No batches available</p>
                                                        )}

                                                        {!loadStockBomLoading && loadStockBom.length > 0 && (
                                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                                {loadStockBom.map((batch) => {
                                                                    const checked = batch.batch in batchSelections;
                                                                    const qty = batchSelections[batch.batch] ?? '';
                                                                    const invalid = showBatchQtyValidation && checked && !(Number(qty) > 0);
                                                                    return (
                                                                        <div
                                                                            key={batch.id}
                                                                            onClick={() => toggleBatch(batch.batch, batch.availableStock)}
                                                                            className={`group relative flex flex-col justify-between gap-2 rounded-lg border bg-white px-3 py-2.5 text-left shadow-sm transition-all duration-300 ease-out hover:shadow-md ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'} ${checked ? 'border-slate-800 ring-2 ring-slate-800/30' : 'border-slate-200'}`}
                                                                        >
                                                                            {/* Batch no */}
                                                                            <div className="min-w-0">
                                                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Batch</p>
                                                                                <p className="break-all text-[17px] font-extrabold tracking-tight text-slate-900">{batch.batch}</p>
                                                                            </div>

                                                                            {/* Available stock */}
                                                                            <div className="flex items-center justify-between rounded-md bg-slate-100 px-2.5 py-1.5">
                                                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Available</p>
                                                                                <p className="text-[14px] font-extrabold text-slate-900">{batch.availableStock}</p>
                                                                            </div>

                                                                            {/* Allocation qty */}
                                                                            <div onClick={(e) => { if (checked) e.stopPropagation(); }}>
                                                                                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                                                    Allocation Qty
                                                                                    <input
                                                                                        type="text"
                                                                                        inputMode="decimal"
                                                                                        autoComplete="off"
                                                                                        disabled={!checked || isLocked}
                                                                                        value={qty}
                                                                                        onChange={(e) => changeBatchQty(batch.batch, e.target.value, batch.availableStock)}
                                                                                        placeholder="Qty"
                                                                                        className={`mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[13px] font-semibold normal-case text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 ${!checked ? 'pointer-events-none' : ''} ${invalid ? 'sa-invalid-field' : ''}`}
                                                                                    />
                                                                                </label>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Summary footer (unchanged) */}
                                                    <div className="border-t border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-600">
                                                        <div className="flex items-center justify-between">
                                                            <span>{Object.keys(batchSelections).length} batch(es) selected</span>
                                                            <span>Required (Allocated Qty): {bomTargetQty}</span>
                                                        </div>
                                                        <div className="mt-1 flex items-center justify-between">
                                                            <span>Selected: {selectedBatchTotal}</span>
                                                            <span className={batchTotalMatches ? 'text-emerald-600' : remainingBatchQty < 0 ? 'text-rose-600' : 'text-amber-600'}>
                                                                {batchTotalMatches ? 'Matched ✓' : remainingBatchQty > 0 ? `Remaining: ${remainingBatchQty}` : `Excess: ${Math.abs(remainingBatchQty)}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex w-full items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleAllocateBatch}
                                                        disabled={!batchTotalMatches || isLocked}
                                                        className="flex flex-1 items-center justify-center rounded-lg bg-slate-800 px-3 py-3 text-sm font-bold text-white shadow transition hover:bg-slate-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        Allocate
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={closeStockPanel}
                                                        className="flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-3 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-100 active:scale-95"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </>
                                        ) : stockPanelMode === 'rework' ? (
                                            <>
                                                <div className="rounded-xl border border-gray-200 bg-gray-200 p-2">
                                                    <p className="text-[12px] font-extrabold uppercase tracking-wide text-gray-700">Selected stock source</p>
                                                    <p className="mt-1 text-sm font-extrabold text-slate-700">
                                                        Rework Stock
                                                    </p>
                                                </div>
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Item Code<input type="text" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" /></label>
                                                    <label className="block w-full max-w-[12rem] text-xs font-bold uppercase tracking-wide text-slate-500">Process Type<input type="text" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" /></label>
                                                </div>
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Item name<input type="text" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" /></label>
                                                    <label className="block w-full max-w-[12rem] text-xs font-bold uppercase tracking-wide text-slate-500">Allocation Type<input type="text" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" /></label>
                                                </div>
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <label className="block w-full max-w-[12rem] text-xs font-bold uppercase tracking-wide text-slate-500">Batch No<input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" /></label>
                                                    <label className="block w-full max-w-[12rem] text-xs font-bold uppercase tracking-wide text-slate-500">Batch Qty<input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" /></label>
                                                </div>
                                                <label className="block w-[10rem] text-xs font-bold uppercase tracking-wide text-slate-500">Selected Qty<input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" /></label>
                                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">From Unit<select className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none"></select></label>
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">From WHS<select className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none"></select></label>
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">To Unit<input type="text" autoComplete="off" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" /></label>
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">To WHS<input type="text" autoComplete="off" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" /></label>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="rounded-xl border border-gray-200 bg-gray-200 p-2">
                                                    <p className="text-[12px] font-extrabold uppercase tracking-wide text-gray-700">Selected stock source</p>
                                                    <p className="mt-1 text-sm font-extrabold text-slate-700">Manual Stock</p>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Original Item
                                                        <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" />
                                                    </label>
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Alternate Item
                                                        <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" />
                                                    </label>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Item name
                                                        <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" />
                                                    </label>
                                                    <div className="hidden sm:block" aria-hidden="true"></div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        batch
                                                        <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" />
                                                    </label>
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Whs Code
                                                        <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" />
                                                    </label>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Quantity
                                                        <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" />
                                                    </label>
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Unit
                                                        <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" />
                                                    </label>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Used Qty
                                                        <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" />
                                                    </label>
                                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                        Available Qty
                                                        <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-slate-500 focus:outline-none" />
                                                    </label>
                                                </div>
                                            </>
                                        )}
                                        {stockPanelMode === 'rework' && (
                                            <div className="flex w-full items-center justify-end gap-2 border-t border-slate-200 pt-3" id="rework-panel-actions">
                                                <button
                                                    type="button"
                                                    onClick={handleSave}
                                                    disabled={isLocked}
                                                    className="rounded-md bg-slate-800 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    Allocate
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setStockPanelMode(null);
                                                        setActiveAllocationSection('bom');
                                                        setBomItemExpanded(true);
                                                    }}
                                                    className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-100 active:scale-95"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                        {stockPanelMode === 'manual' && (
                                            <div className="flex w-full items-center justify-end gap-2 border-t border-slate-200 pt-3" id="manual-panel-actions">
                                                <button
                                                    type="button"
                                                    onClick={handleSave}
                                                    disabled={isLocked}
                                                    className="rounded-md bg-slate-800 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                                                    Allocate
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setStockPanelMode(null);
                                                        setActiveAllocationSection('bom');
                                                        setBomItemExpanded(true);
                                                    }}
                                                    className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-100 active:scale-95">
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeAllocationSection === 'stock' && stockDetailsExpanded && (
                        <div
                            className="sa-fade-up mt-6 max-w-[825px] min-h-[880px]"
                            role="region"
                            aria-labelledby="stock-details-modal-title">
                            <div className="w-full">
                                <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                                        <div>
                                            <p className="text-[22px] font-extrabold uppercase tracking-[0.02em] text-slate-600">Stock Details</p>
                                            <h2 id="stock-details-modal-title" className="mt-1 text-lg font-extrabold text-slate-600 sm:text-xl">[Inventory Shares]</h2>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleDeleteInventoryShare}
                                            disabled={!loadedStock || isLocked}
                                            className="shrink-0 rounded-lg border border-slate-200 bg-red-600 px-2 py-1.5 text-lg font-extrabold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                            title="Delete inventory share"
                                            aria-label="Delete inventory share"
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    <div className="p-3 sm:p-6">
                                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" id="stock-details-card">
                                            <div className="flex items-start gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="text-[12px] font-extrabold uppercase tracking-wide text-slate-400">Item Code</p>
                                                            <p className="break-all text-md font-extrabold text-slate-700">{loadedStock?.itemCode || ''}</p>
                                                        </div>
                                                        <span className="w-fit rounded-full bg-gray-200 px-4 py-3 text-[14px] font-bold text-gray-900">Stock</span>
                                                    </div>
                                                    <p className="mt-3 text-[12px] font-extrabold uppercase tracking-wide text-slate-400">Item Name</p>
                                                    <p className="text-md font-extrabold text-slate-700">{loadedStock?.itemName || ''}</p>
                                                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                        <div className="rounded-lg bg-slate-100 p-3">
                                                            <p className="text-[13px] font-bold uppercase text-slate-500">Batch No</p>
                                                            {/* Every batch is listed one beneath the other: 1st, 2nd, 3rd ... */}
                                                            <div className="mt-3 space-y-1 text-[14px] font-bold text-slate-900">
                                                                {getBatchLines(loadedStock).map((b) => (
                                                                    <p key={b.batchNo} className="break-all">
                                                                        {b.batchNo}
                                                                        {b.allocationQty !== undefined && b.allocationQty !== '' && b.allocationQty !== null && (
                                                                            <span className="text-slate-500"> = {b.allocationQty}</span>
                                                                        )}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-lg bg-slate-100 p-3"><p className="text-[13px] font-bold uppercase text-slate-500">Allocation Qty</p><p className="mt-5 text-[20px] font-bold text-slate-900">{loadedStock?.allocationQty || ''}</p></div>
                                                        <div className="rounded-lg bg-slate-100 p-3"><p className="text-[13px] font-bold uppercase text-slate-500">Allocation Type</p><p className="mt-5 text-[18px] font-bold text-slate-900 uppercase">{loadedStock?.allocationType || ''}</p></div>
                                                        <div className="rounded-lg bg-slate-100 p-3"><p className="text-[13px] font-bold uppercase text-slate-500">Process Type</p><p className="mt-5 text-[18px] font-bold text-slate-900 uppercase">{loadedStock?.processType || ''}</p></div>
                                                    </div>

                                                    {/* Read-only: all values come from the previous BOM / Load Stock step */}
                                                    <div className="mt-4 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-4">
                                                        <InfoCard label="From Unit" value={loadedStock?.fromUnit || ''} valueClassName="text-[18px]" />
                                                        <InfoCard label="From Whs" value={loadedStock?.fromWhs || ''} valueClassName="text-[18px]" />
                                                        <InfoCard label="To Unit" value={loadedStock?.toUnit || ''} valueClassName="text-[18px]" />
                                                        <InfoCard label="To Whs" value={loadedStock?.toWhs || ''} valueClassName="text-[18px]" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex w-full flex-wrap items-start justify-end gap-6" id="stock-details-actions">

                                    {!editMode && (
                                        <button
                                            type="button"
                                            onClick={handlePostTransfer}
                                            disabled={!loadedStock || posting || poLocked}
                                            title="Post Transfer"
                                            className="group relative z-10 flex h-[140px] w-[260px] origin-top cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-green px-5 py-5 text-left shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 hover:rotate-[1deg] hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:rotate-0 disabled:hover:scale-100 disabled:hover:shadow-lg">
                                            <h2 className="mt-1 origin-left text-[22px] font-extrabold tracking-tight text-slate-900 transition-transform duration-300 group-hover:scale-[1.02]">
                                                + Post Transfer
                                            </h2>
                                            <p className="mt-2 text-[12px] font-bold leading-relaxed text-slate-500">
                                                Posts the loaded inventory share and releases the stock allocation.
                                                <br />
                                                <span className="text-green-500 transition-colors group-hover:text-green-600">{posting ? 'Posting...' : '+ Post Transfer'}</span>
                                            </p>
                                        </button>
                                    )}

                                    {editMode && (
                                        <>

                                            <button
                                                type="button"
                                                onClick={requestCancelTransfer}
                                                disabled={!postedAllocation?.id || cancellingTransfer || transferLocked}
                                                title="Cancel Transfer"
                                                className="group relative z-10 flex h-[155px] w-[260px] origin-top cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white px-5 py-5 text-left shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 hover:rotate-[1deg] hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:rotate-0 disabled:hover:scale-100 disabled:hover:shadow-lg">
                                                <h2 className="mt-1 origin-left text-[22px] font-extrabold tracking-tight text-slate-900 transition-transform duration-300 group-hover:scale-[1.02]">
                                                    Cancel Transfer
                                                </h2>
                                                <p className="mt-2 text-[12px] font-bold leading-relaxed text-slate-500">
                                                    Cancels the released stock allocation. This cannot be undone.
                                                    <br />
                                                    <span className="text-red-500 transition-colors group-hover:text-red-600">{cancellingTransfer ? 'Cancelling...' : '+ Cancel Transfer'}</span>
                                                </p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handlePostTransfer}
                                                disabled={!loadedStock || posting || poLocked || !hasEditChanges}
                                                title="Update Transfer"
                                                className="group relative z-10 flex h-[155px] w-[260px] origin-top cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white px-5 py-5 text-left shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 hover:rotate-[1deg] hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:rotate-0 disabled:hover:scale-100 disabled:hover:shadow-lg">
                                                <h2 className="mt-1 origin-left text-[22px] font-extrabold tracking-tight text-slate-900 transition-transform duration-300 group-hover:scale-[1.02]">
                                                    Update Transfer
                                                </h2>
                                                <p className="mt-2 text-[12px] font-bold leading-relaxed text-slate-500">
                                                    Updates the released stock allocation with the latest batch details.
                                                    <br />
                                                    <span className="text-green-500 transition-colors group-hover:text-green-600">{posting ? 'Updating...' : hasEditChanges ? '+ Update Transfer' : 'No changes yet'}</span>
                                                </p>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeAllocationSection === 'summary' && poDetailsExpanded && (
                        <div
                            className="sa-fade-up mt-8 max-w-[830px]"
                            role="region"
                            aria-labelledby="po-details-modal-title"
                        >
                            <div className="w-full">
                                <div className="relative w-full overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                                        <div>
                                            <p className="text-[22px] font-extrabold uppercase tracking-[0.02em] text-slate-600">PO Details</p>
                                            <h2 id="po-details-modal-title" className="mt-1 text-lg font-extrabold text-slate-600 sm:text-xl">[Purchase Order Information]</h2>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPoDetailsExpanded(false)}
                                            className="shrink-0 rounded-lg border border-slate-200 bg-red-500 px-2 py-0.22 text-lg font-extrabold text-white transition hover:bg-red-600"
                                            aria-label="Close PO Details"
                                        >
                                            X
                                        </button>
                                    </div>

                                    <div className="p-3 sm:p-6">
                                        <div
                                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                                            id="po-details-card"
                                            onMouseDown={(event) => {
                                                const target = event.target;
                                                if (target.closest('[data-dc-calendar="true"]')) {
                                                    return;
                                                }
                                                if (dcCalendarOpen) {
                                                    setDcCalendarOpen(false);
                                                }
                                            }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="text-[13px] font-extrabold uppercase tracking-wide text-slate-400">BP Code</p>
                                                            <p className="break-all text-md font-extrabold text-slate-700">{postedAllocation?.bpCode || ''}</p>
                                                        </div>
                                                        <span className="w-fit rounded-full bg-gray-200 px-4 py-3 text-[14px] font-bold text-gray-900">PO</span>
                                                    </div>
                                                    <p className="mt-3 text-[13px] font-extrabold uppercase tracking-wide text-slate-400">BP Name</p>
                                                    <p className="text-md font-extrabold uppercase text-slate-700">{postedAllocation?.bpName || ''}</p>

                                                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                        <div className="rounded-lg bg-slate-100 p-3"><p className="text-[13px] font-bold uppercase text-slate-500">Process Type</p><p className="mt-5 text-[16px] font-bold uppercase text-slate-900">{postedAllocation?.processType || ''}</p></div>
                                                        <div className="rounded-lg bg-slate-100 p-3"><p className="text-[13px] font-bold uppercase text-slate-500">Allocation Type</p><p className="mt-5 text-[16px] font-bold uppercase text-slate-900"></p></div>
                                                        <div className="rounded-lg bg-slate-100 p-3"><p className="text-[13px] font-bold uppercase text-slate-500">Inventory No</p><p className="mt-5 text-[16px] font-bold text-slate-900"></p></div>
                                                        <div className="rounded-lg bg-slate-100 p-3"><p className="text-[13px] font-bold uppercase text-slate-500">PO Status</p><p className="mt-5 text-[16px] font-bold uppercase text-slate-900">{postedAllocation?.poStatus || ''}</p></div>
                                                    </div>

                                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                        <label className="text-[14px] font-extrabold uppercase tracking-wide text-slate-400">
                                                            DC Date
                                                            <div className="relative mt-1.5">
                                                                <button
                                                                    type="button"
                                                                    disabled={poLocked}
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDcCalendarOpen((open) => !open);
                                                                    }}
                                                                    className={`flex h-[42px] w-full items-center gap-2 rounded-lg border bg-white px-3 text-left text-sm transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70
                                                                        ${dcCalendarOpen
                                                                            ? 'border-slate-400 ring-1 ring-slate-500/25'
                                                                            : 'border-slate-300 hover:border-slate-400'
                                                                        }`}
                                                                >
                                                                    <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                                                                    <span className={poForm.dcDate ? 'font-medium text-slate-800' : 'text-slate-400'}>
                                                                        {poForm.dcDate ? formatDocDateForDisplay(poForm.dcDate) : 'DD-MM-YYYY'}
                                                                    </span>
                                                                </button>

                                                                {dcCalendarOpen && !poLocked && (
                                                                    <div
                                                                        data-dc-calendar="true"
                                                                        className="sa-pop absolute left-0 top-[calc(100%+2px)] z-[80] w-[220px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
                                                                    >
                                                                        {/* Month header */}
                                                                        <div className="mb-1 flex items-center justify-between">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setDcCalendarMonth(new Date(dcCalendarMonth.getFullYear(), dcCalendarMonth.getMonth() - 1, 1))}
                                                                                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                                                                                aria-label="Previous month"
                                                                            >
                                                                                <ChevronLeft className="h-4 w-4" />
                                                                            </button>
                                                                            <span className="text-sm font-bold text-slate-800">
                                                                                {dcCalendarMonth.toLocaleString('en-US', { month: 'long' })} {dcCalendarMonth.getFullYear()}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setDcCalendarMonth(new Date(dcCalendarMonth.getFullYear(), dcCalendarMonth.getMonth() + 1, 1))}
                                                                                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                                                                                aria-label="Next month"
                                                                            >
                                                                                <ChevronRightIcon className="h-4 w-4" />
                                                                            </button>
                                                                        </div>

                                                                        {/* Day headers */}
                                                                        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400">
                                                                            {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d) => (
                                                                                <span key={d}>{d}</span>
                                                                            ))}
                                                                        </div>

                                                                        {/* Days */}
                                                                        <div className="grid grid-cols-7 text-center text-[12px]">
                                                                            {dcCalendarDays.map((date) => {
                                                                                const isCurrentMonth = date.getMonth() === dcCalendarMonth.getMonth();
                                                                                const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                                                                const isSelected = poForm.dcDate === isoDate;

                                                                                return (
                                                                                    <button
                                                                                        key={isoDate}
                                                                                        type="button"
                                                                                        onClick={() => selectDcCalendarDate(date)}
                                                                                        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full font-medium transition
                                                                                            ${isSelected
                                                                                                ? 'bg-purple-600 text-white'
                                                                                                : isCurrentMonth
                                                                                                    ? 'text-slate-800 hover:bg-slate-100'
                                                                                                    : 'text-slate-300 hover:bg-slate-50'
                                                                                            }`}
                                                                                    >
                                                                                        {date.getDate()}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </label>

                                                        <label className="text-[14px] font-extrabold uppercase tracking-wide text-slate-400">
                                                            PO Reference No
                                                            <input
                                                                type="text"
                                                                autoComplete="off"
                                                                value={poForm.poRefNo}
                                                                disabled={poLocked}
                                                                onChange={(e) => setPoForm((prev) => ({ ...prev, poRefNo: e.target.value }))}
                                                                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                                                            />
                                                        </label>
                                                        <label className="text-[14px] font-extrabold uppercase tracking-wide text-slate-400">
                                                            PO Num
                                                            <input
                                                                type="text"
                                                                autoComplete="off"
                                                                value={poForm.poNum}
                                                                disabled={poLocked}
                                                                onChange={(e) => setPoForm((prev) => ({ ...prev, poNum: e.target.value }))}
                                                                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                                                            />
                                                        </label>
                                                    </div>

                                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-1">
                                                        <div className="sm:col-span-1">
                                                            <label className="text-[14px] font-extrabold uppercase tracking-wide text-slate-400">
                                                                Remarks
                                                                <input
                                                                    type="text"
                                                                    autoComplete="off"
                                                                    value={form.remarks}
                                                                    disabled={poLocked}
                                                                    onChange={(event) => update('remarks', event.target.value)}
                                                                    placeholder="Add Remarks..."
                                                                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end" id="po-details-actions">
                                    <button
                                        type="button"
                                        onClick={handlePostPo}
                                        disabled={!postedAllocation?.id || postingPo || poLocked}
                                        className="rounded-md bg-green-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                                        {postingPo ? 'Posting...' : 'Post PO'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={requestPoCancel}
                                        disabled={!postedAllocation?.id || cancellingPo || isLocked || postedAllocation?.poStatus !== 'Posted'}
                                        className="rounded-md bg-red-500 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-red-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {cancellingPo ? 'Cancelling...' : 'PO Cancel'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!bomStageOpen && (
                        <div className="mt-4 flex items-center justify-end px-1" id="form-footer">
                            <div className="sa-pop flex items-center justify-end gap-3 md:ml-auto" id="form-actions" style={{ animationDelay: '0.9s' }}>
                                <button
                                    type="button"
                                    onClick={closeAddNew}
                                    className="rounded-xl border border-slate-300 bg-white px-8 py-3 text-sm uppercase font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-100 active:scale-95"
                                    id="btn-cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleProceed}
                                    disabled={!hasWorkOrderAndJobCard}
                                    className="rounded-xl bg-slate-800 px-8 py-3 text-sm font-extrabold uppercase text-white shadow-sm transition hover:bg-slate-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800"
                                    id="btn-proceed"
                                >
                                    Proceed to BOM Inputs
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {allocationValidationToast && (
                    <div role="alert" aria-live="assertive" className="fixed bottom-6 right-6 z-50 w-[min(92vw,420px)] rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-lg">
                        <p className="font-extrabold">Complete the BOM I/P Item Details</p>
                        <p className="mt-1 leading-relaxed">Select an input item, enter a numeric allocated quantity greater than zero, and choose the From Unit and From Warehouse before saving.</p>
                    </div>
                )}

                {allocationSuccessToast && (
                    <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 w-[min(92vw,420px)] rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-lg">
                        <p className="font-extrabold">Allocation saved successfully</p>
                        <p className="mt-1 leading-relaxed">You can now proceed with Load Stocks.</p>
                    </div>
                )}

                {loadStockToast && (
                    <div
                        role={loadStockToast.type === 'error' ? 'alert' : 'status'}
                        aria-live={loadStockToast.type === 'error' ? 'assertive' : 'polite'}
                        className="fixed bottom-6 right-6 z-50 w-[min(92vw,420px)] rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-lg"
                    >
                        <p className="font-extrabold">{loadStockToast.type === 'error' ? 'Action needed' : 'Done'}</p>
                        <p className="mt-1 leading-relaxed">{loadStockToast.message}</p>
                    </div>
                )}

                {allocationToast && (
                    <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 w-[min(92vw,420px)] rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-lg">
                        <p className="font-extrabold">Select a Work Order and Job Card to continue</p>
                        <p className="mt-1 leading-relaxed">Choose the Work Order No. first, then select the matching Job Card No. The FG item details will load from the work order, and the output item, process type, and warehouse will load from the job card. Once both are selected, you can proceed to BOM Inputs.</p>
                    </div>
                )}

                {confirmToast && (
                    <div
                        role="alertdialog"
                        aria-live="assertive"
                        aria-labelledby="confirm-toast-title"
                        className="sa-pop fixed bottom-6 right-10 z-[70] w-[min(70vw,400px)] rounded-2xl border-2 border-amber-300 bg-amber-50 px-8 py-7 text-base text-amber-950 shadow-2xl"
                    >
                        <p id="confirm-toast-title" className="text-2xl font-extrabold">{confirmToast.title}</p>
                        <p className="mt-3 text-base font-semibold leading-relaxed">{confirmToast.message}</p>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmToast(null)}
                                className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-extrabold text-slate-600 transition hover:bg-slate-100 active:scale-95"
                            >
                                No
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const run = confirmToast.onConfirm;
                                    setConfirmToast(null);
                                    run?.();
                                }}
                                className="rounded-lg bg-red-600 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-red-700 active:scale-95"
                            >
                                {confirmToast.confirmLabel}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50" id="stock-allocation-page">
            <div className="w-full px-1 pt-1">
                <div
                    className="relative w-full rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm md:px-7 md:py-6"
                    id="page-heading-card"
                >
                    <nav className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500" id="breadcrumb-trail">
                        <span className="text-[18px] text-slate-600">PPC</span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                        <span className="text-[18px] text-slate-600">Stock Allocation</span>
                    </nav>
                    <div className="flex items-center">
                        <h1 className="whitespace-nowrap font-sans text-[28px] font-extrabold tracking-[-0.02em] text-gray-950">
                            Stock Allocation Management Console
                        </h1>
                    </div>
                </div>
            </div>
            <div className="grid w-full grid-cols-1 items-stretch gap-4 px-1 md:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="mt-6 flex min-w-0 flex-col gap-4">
                    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:max-w-[650px]">
                        <div className="group relative h-[205px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 p-6 text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-slate-300 hover:shadow-xl">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Total Stock Allocated</p>
                                    <p className="mt-4 text-6xl font-light tracking-tight text-slate-800">{allocationRows.length}</p>
                                </div>
                                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-transform duration-300 group-hover:rotate-12 group-hover:bg-white group-hover:shadow-sm">
                                    <ArrowDown className="h-4 w-4 rotate-[-45deg]" />
                                </span>
                            </div>
                        </div>
                        <div className="group relative h-[205px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 p-6 text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-slate-300 hover:shadow-xl">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Released Stock Allocations</p>
                                    <p className="mt-4 text-6xl font-light tracking-tight text-slate-800">{allocationRows.filter((row) => row.status === 'Released').length}</p>
                                </div>
                                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-transform duration-300 group-hover:rotate-12 group-hover:bg-white group-hover:shadow-sm">
                                    <ArrowDown className="h-4 w-4 rotate-[-45deg]" />
                                </span>
                            </div>
                            <div className="absolute bottom-5 left-6 flex items-center gap-2">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 text-slate-500 text-xs">↗</span>
                                <span className="text-xs font-bold text-slate-500">Released Allocations</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-stretch" id="stock-allocation-charts">
                        <div className="min-w-0 md:max-w-[840px] md:flex-1" id="stock-allocation-chart">
                            <ChartBarStacked />
                        </div>
                        <div className="min-w-0 md:w-[520px] md:shrink-0" id="stock-allocation-radial-chart">
                            <ChartRadialGrid />
                        </div>
                    </div>
                </div>
                <div className="relative flex justify-end pt-10">
                    <div className="absolute top-0 left-1/2 z-0 flex -translate-x-1/2 flex-col items-center">
                        <div className="h-1.5 w-16 rounded-full bg-slate-700 shadow-sm" />
                        <div className="mt-[-3px] h-3 w-3 rounded-full border-2 border-slate-500 bg-slate-800 shadow" />
                        <div className="h-8 w-[3px] rounded-full bg-gradient-to-b from-slate-700 to-slate-500" />
                    </div>
                    <button
                        type="button"
                        onClick={openAddNew}
                        className="group relative z-10 flex h-[176px] w-full origin-top rotate-[2.5deg] cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white px-6 py-6 text-left shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 hover:rotate-[1deg] hover:scale-[1.02] hover:shadow-xl"
                        title="Open Stock Allocation Console">
                        <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-slate-400 bg-slate-200 shadow-inner" />
                        <h2 className="mt-1 origin-left text-[26px] font-extrabold tracking-tight text-slate-900 transition-transform duration-300 group-hover:scale-[1.02]">
                            Stock Allocation
                        </h2>
                        <p className="mt-2 text-[15px] font-bold leading-relaxed text-slate-500">
                            Manage Stock Allocation
                            <br />
                            <span className="text-indigo-500 transition-colors group-hover:text-indigo-600">+ Add New Stock Allocation</span>
                        </p>
                    </button>
                </div>
                <div className="min-w-0 md:col-span-2" id="stock-orders-section">
                    <StockOrdersTable rows={allocationRows} onRefresh={loadAllocations} onView={openModify} />
                </div>
            </div>
            {loadStockToast && (
                <div
                    role={loadStockToast.type === 'error' ? 'alert' : 'status'}
                    aria-live={loadStockToast.type === 'error' ? 'assertive' : 'polite'}
                    className="fixed bottom-6 right-6 z-50 w-[min(92vw,420px)] rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-lg">
                    <p className="font-extrabold">{loadStockToast.type === 'error' ? 'Action needed' : 'Done'}</p>
                    <p className="mt-1 leading-relaxed">{loadStockToast.message}</p>
                </div>
            )}
        </div>
    );
}