import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronRight,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    ChevronDown,
    ArrowDown,
    Search,
    Filter,
    RefreshCw,
    Eye,
    FolderOpen,
    Hash,
    Calendar,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart } from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/Charts/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/Charts/ui/chart";

/* ---------------------------- Bar chart ---------------------------- */

const chartData = [
    { month: "January", desktop: 186, mobile: 80 },
    { month: "February", desktop: 305, mobile: 200 },
    { month: "March", desktop: 237, mobile: 120 },
    { month: "April", desktop: 73, mobile: 190 },
    { month: "May", desktop: 209, mobile: 130 },
    { month: "June", desktop: 214, mobile: 140 },
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

function ChartBarMultiple() {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Bar Chart - Multiple</CardTitle>
                <CardDescription>January - June 2024</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <BarChart accessibilityLayer data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 3)}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dashed" />}
                        />
                        <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
                        <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

/* ---------------------------- Pie chart ---------------------------- */
/* One slice per month, January - December. */

const pieChartData = [
    { month: "january", visitors: 275, fill: "var(--color-january)" },
    { month: "february", visitors: 200, fill: "var(--color-february)" },
    { month: "march", visitors: 187, fill: "var(--color-march)" },
    { month: "april", visitors: 173, fill: "var(--color-april)" },
    { month: "may", visitors: 90, fill: "var(--color-may)" },
    { month: "june", visitors: 240, fill: "var(--color-june)" },
    { month: "july", visitors: 210, fill: "var(--color-july)" },
    { month: "august", visitors: 160, fill: "var(--color-august)" },
    { month: "september", visitors: 195, fill: "var(--color-september)" },
    { month: "october", visitors: 130, fill: "var(--color-october)" },
    { month: "november", visitors: 220, fill: "var(--color-november)" },
    { month: "december", visitors: 260, fill: "var(--color-december)" },
];

const pieChartConfig = {
    visitors: { label: "Visitors" },
    january: { label: "January", color: "var(--chart-1)" },
    february: { label: "February", color: "var(--chart-2)" },
    march: { label: "March", color: "var(--chart-3)" },
    april: { label: "April", color: "var(--chart-4)" },
    may: { label: "May", color: "var(--chart-5)" },
    june: { label: "June", color: "var(--chart-1)" },
    july: { label: "July", color: "var(--chart-2)" },
    august: { label: "August", color: "var(--chart-3)" },
    september: { label: "September", color: "var(--chart-4)" },
    october: { label: "October", color: "var(--chart-5)" },
    november: { label: "November", color: "var(--chart-1)" },
    december: { label: "December", color: "var(--chart-2)" },
};

function ChartPieSeparatorNone() {
    return (
        <Card className="flex h-full flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Pie Chart - Separator None</CardTitle>
                <CardDescription>January - December 2024</CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 items-center justify-center pb-4">
                <ChartContainer
                    config={pieChartConfig}
                    className="mx-auto aspect-auto h-full min-h-[380px] w-full max-w-[280px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={pieChartData}
                            dataKey="visitors"
                            nameKey="month"
                            outerRadius="90%"
                            stroke="0"
                        />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

/* ------------------- "+ Production Order" container button ------------------- */

const RedContainerButton = ({ onClick }) => (
    <button
        type="button"
        onClick={onClick}
        title="Create production order"
        aria-label="Create production order"
        className="group relative flex h-[255px] w-full flex-col items-center overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm outline-none transition-all duration-300 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-slate-300"
    >
        {/* crane animation keyframes */}
        <style>{`
            @keyframes craneLift {
                0%   { transform: translateY(0); }
                45%  { transform: translateY(-14px); }  /* rope pulls up */
                60%  { transform: translateY(-14px); }  /* short hold */
                100% { transform: translateY(0); }      /* lowers back */
            }
            @keyframes craneSway {
                0%, 100% { transform: rotate(-1.2deg); }
                50%      { transform: rotate(1.2deg); }
            }
            .crane-lift { animation: craneLift 3.2s ease-in-out infinite; }
            .crane-sway {
                animation: craneSway 3.2s ease-in-out infinite;
                transform-box: view-box;
                transform-origin: 120px 0px;
            }
            @media (prefers-reduced-motion: reduce) {
                .crane-lift, .crane-sway { animation: none; }}
        `}</style>

        {/* crane hook + hanging container (lifts up/down, swings slightly on hover) */}
        <svg
            viewBox="0 0 240 150"
            className="h-[200px] w-full origin-top overflow-visible transition-transform duration-500 ease-out group-hover:rotate-[2.5deg]"
            aria-hidden="true">
            <g className="crane-sway">
                <g className="crane-lift">
                    {/* rope coming from above the card (clipped by the card's top edge) */}
                    <rect x="119" y="-80" width="2" height="82" fill="#64748b" />
                    {/* hook */}
                    <rect x="114" y="0" width="12" height="12" rx="2" fill="#475569" />
                    <path d="M120 12 v8 a5 5 0 1 1 -5 5" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
                    {/* cables */}
                    <g stroke="#94a3b8" strokeWidth="1">
                        <line x1="120" y1="22" x2="38" y2="62" />
                        <line x1="120" y1="22" x2="176" y2="48" />
                        <line x1="120" y1="22" x2="120" y2="58" />
                    </g>

                    {/* container (slightly tilted) */}
                    <g transform="rotate(-6 120 95)">
                        {/* front face */}
                        <rect x="30" y="60" width="150" height="70" rx="2" fill="#dc2626" />
                        {/* corrugation ribs */}
                        {Array.from({ length: 15 }).map((_, i) => (
                            <rect
                                key={i}
                                x={34 + i * 9.8}
                                y="62"
                                width="4.5"
                                height="66"
                                fill={i % 2 ? "#b91c1c" : "#e84545"}
                                opacity="0.9" />))}
                        {/* top & bottom rails */}
                        <rect x="30" y="58" width="150" height="5" fill="#b91c1c" />
                        <rect x="30" y="127" width="150" height="5" fill="#b91c1c" />
                        {/* end face (door side) */}
                        <polygon points="180,60 204,66 204,134 180,130" fill="#ef6b6b" />
                        {Array.from({ length: 5 }).map((_, i) => (
                            <line
                                key={i}
                                x1={184 + i * 4.5}
                                y1={62 + i * 1.3}
                                x2={184 + i * 4.5}
                                y2={130 + i * 1.3}
                                stroke="#b91c1c"
                                strokeWidth="1.5"
                            />
                        ))}
                        {/* corner castings */}
                        <rect x="28" y="57" width="6" height="6" fill="#7f1d1d" />
                        <rect x="28" y="127" width="6" height="6" fill="#7f1d1d" />
                    </g>

                    {/* + badge on the container */}
                    <g className="transition-transform duration-300 group-hover:scale-110" style={{ transformOrigin: "105px 97px" }}>
                        <circle cx="105" cy="97" r="16" fill="#fef2f2" stroke="#991b1b" strokeWidth="2" />
                        <path d="M105 89 v16 M97 97 h16" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" />
                    </g>
                </g>
            </g>
        </svg>

        <span className="mt-1 text-[15px] font-bold uppercase tracking-wider text-red-400 group-hover:text-red-900">
            + Create Production Order
        </span>
    </button>
);
const statusStyles = {
    Released: "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-rose-100 text-rose-600",
};

const tabs = ["All", "Released", "Cancelled"];
const columns = [
    "Prd Entry No.",
    "JobCard No.",
    "Operation Item Code",
    "Operation Item Name",
    "Production Type",
    "Unit",
];
const productionTypeOptions = ["All Types", "Sub-Con", "In-House", "Inter-Unit"];
const unitOptions = ["All Units", "Unit-1", "Unit-2", "Unit-3"];
const jobCardStatusOptions = ["Released", "In-Progress", "Completed"];

const ProductionEntriesTable = ({ entries = [], onView, onRefresh, refreshing = false }) => {
    const [activeTab, setActiveTab] = useState("All");
    const [query, setQuery] = useState("");
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterOpen, setFilterOpen] = useState(false);
    const [unitFilter, setUnitFilter] = useState("All Units");
    const [typeFilter, setTypeFilter] = useState("All Types");
    const filterRef = useRef(null);

    useEffect(() => {
        const onClick = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const filtersActive = unitFilter !== "All Units" || typeFilter !== "All Types";

    const counts = useMemo(() => {
        const c = { All: entries.length };
        entries.forEach((e) => (c[e.status] = (c[e.status] ?? 0) + 1));
        return c;
    }, [entries]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return entries.filter(
            (e) =>
                (activeTab === "All" || e.status === activeTab) &&
                (unitFilter === "All Units" || e.unit === unitFilter) &&
                (typeFilter === "All Types" || e.productionType === typeFilter) &&
                (!q ||
                    [e.entryNo, e.jobCardNo, e.itemCode, e.itemName, e.productionType, e.unit]
                        .join(" ")
                        .toLowerCase()
                        .includes(q))
        );
    }, [entries, activeTab, query, unitFilter, typeFilter]);

    const visible = filtered.slice(0, rowsPerPage);

    const selectCls =
        "w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

    return (
        <div className="w-full rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 pt-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-[22px] font-extrabold tracking-tight text-slate-900">Production Entries</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                        {counts.All}
                    </span>
                </div>
                <div className="flex items-center gap-4 text-slate-500">
                    <button
                        type="button"
                        title={refreshing ? "Refreshing production entries..." : "Refresh"}
                        aria-label="Refresh production entries"
                        onClick={onRefresh}
                        disabled={refreshing}
                        className="hover:text-slate-800 disabled:cursor-wait disabled:opacity-60"
                    >
                        <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                    <div ref={filterRef} className="relative">
                        <button
                            type="button"
                            title="Filter"
                            onClick={() => setFilterOpen((o) => !o)}
                            className={`relative hover:text-slate-800 ${filterOpen || filtersActive ? "text-slate-900" : ""}`}>
                            <Filter className="h-5 w-5" />
                            {filtersActive && (
                                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-indigo-500" />
                            )}
                        </button>
                        {filterOpen && (
                            <div className="absolute right-0 top-9 z-20 w-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-[15px] font-extrabold text-slate-900">Filter Records</h3>
                                    {filtersActive && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUnitFilter("All Units");
                                                setTypeFilter("All Types");
                                            }}
                                            className="text-xs font-bold text-indigo-500 hover:text-indigo-600"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>

                                <label className="mb-1.5 block text-xs font-bold text-slate-500" htmlFor="prd-unit-filter">
                                    Unit
                                </label>
                                <div className="relative mb-4">
                                    <select
                                        id="prd-unit-filter"
                                        value={unitFilter}
                                        onChange={(e) => setUnitFilter(e.target.value)}
                                        className={selectCls}
                                    >
                                        {unitOptions.map((u) => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                </div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-500" htmlFor="prd-type-filter">
                                    Production Type
                                </label>
                                <div className="relative">
                                    <select
                                        id="prd-type-filter"
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className={selectCls}
                                    >
                                        {productionTypeOptions.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                    {tabs.map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setActiveTab(t)}
                            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${activeTab === t
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {t} <span className="ml-1">{counts[t] ?? 0}</span>
                        </button>
                    ))}
                </div>
                <div className="flex w-full max-w-sm items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 md:w-80">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search production entries..."
                        className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full min-w-[960px] text-left">
                    <thead>
                        <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            {columns.map((c) => (
                                <th key={c} className="px-6 py-4">{c}</th>
                            ))}
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((e) => (
                            <tr key={e.entryNo} className="border-t border-slate-100 text-sm text-slate-600 hover:bg-slate-50">
                                <td className="px-6 py-5 font-bold text-slate-900">{e.entryNo}</td>
                                <td className="px-6 py-5">{e.jobCardNo}</td>
                                <td className="px-6 py-5">{e.itemCode}</td>
                                <td className="px-6 py-5">{e.itemName}</td>
                                <td className="px-6 py-5">{e.productionType}</td>
                                <td className="px-6 py-5">{e.unit}</td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center justify-end gap-4 text-slate-400">
                                        {e.status && statusStyles[e.status] && (
                                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[e.status]}`}>
                                                {e.status}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            title="View production entry"
                                            onClick={() => onView?.(e)}
                                            className="hover:text-slate-700"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {visible.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-6 py-10">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <FolderOpen className="h-9 w-9 text-slate-300" />
                                        <span className="font-semibold text-slate-500">No production entries matching database criteria</span>
                                        <p className="text-xs text-slate-400">Try relaxing your search terms or filters.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-xs font-semibold text-slate-500">
                <label className="flex items-center gap-2">
                    Rows per page:
                    <span className="relative flex items-center">
                        <select
                            value={rowsPerPage}
                            onChange={(e) => setRowsPerPage(Number(e.target.value))}
                            className="cursor-pointer appearance-none bg-transparent pr-5 font-bold text-slate-800 outline-none"
                        >
                            {[10, 15].map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-0 h-3.5 w-3.5 text-slate-700" />
                    </span>
                </label>
                <div className="flex items-center gap-5">
                    <span className="text-slate-600">
                        {filtered.length === 0 ? "0" : `1-${visible.length}`} of {filtered.length}
                    </span>
                    <div className="flex items-center gap-3 text-slate-300">
                        <ChevronsLeft className="h-4 w-4" />
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4" />
                        <ChevronsRight className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ------------------- Create Production Order (first screen) ------------------- */
/* Same layout + entrance animations as the Stock Allocation "add" screen. */

const createScreenAnimations = `
@keyframes pe-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pe-slide-down {
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pe-banner-reveal {
  from { opacity: 0; transform: scaleX(0.92); clip-path: inset(0 50% 0 0 round 16px); }
  to   { opacity: 1; transform: scaleX(1);    clip-path: inset(0 0 0 0 round 16px); }
}
@keyframes pe-pop {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}
.pe-fade-up    { animation: pe-fade-up 0.6s cubic-bezier(.22,1,.36,1) backwards; }
.pe-slide-down { animation: pe-slide-down 0.55s cubic-bezier(.22,1,.36,1) backwards; }
.pe-banner     { animation: pe-banner-reveal 0.7s cubic-bezier(.22,1,.36,1) 0.15s backwards; transform-origin: left center; }
.pe-pop        { animation: pe-pop 0.3s ease-out backwards; }
@media (prefers-reduced-motion: reduce) {
  .pe-fade-up, .pe-slide-down, .pe-banner, .pe-pop { animation: none; }
}
`;

const getLocalISODate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatDocDateForDisplay = (isoDate) => {
    const match = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : isoDate;
};

const InfoCard = ({ label, value, mono = false, className = "", valueClassName = "", enabled = true }) => (
    <div className={`rounded-xl border border-slate-200 px-4 py-3 transition-all duration-300 ${enabled ? "border-slate-200 bg-slate-50 opacity-100" : "border-slate-200 bg-slate-100 opacity-50"} ${className}`}>
        <p className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
            {label}
        </p>
        <p className={`mt-1 min-h-[28px] break-words ${valueClassName || "text-xl"} font-extrabold text-black ${mono ? "font-mono" : ""}`}>
            {value || ""}
        </p>
    </div>
);

const INITIAL_PRODUCTION_FORM = {
    workOrderNo: "",
    jobCardNo: "",
    toUnit: "",
    opItem: "",
    opItemName: "",
    bpCode: "",
    bpName: "",
    jobCardStatus: "",
    processType: "",
    targetWhs: "",
    issueWhs: "",
    receiptWhs: "",
    itemType: "",
    workOrderType: "",
    targetTime: "",
    fgItemCode: "",
    fgItemName: "",
    docDate: getLocalISODate(),
    plannedQty: "",
};

/*
 * orderOptions rows:   { value, label, kind: "work" | "stock", itemCode, itemName, bpCode, bpName, plannedQty, workOrderType, itemType }
 * jobCardOptions rows: { jobCardNo, opItem, opItemName, processType, toUnit, targetWhs, issueWhs, receiptWhs, targetTime, jobCardStatus }
 * docEntry: the next DocEntry (generated by the server, read-only here).
 */
const CreateProductionOrderScreen = ({
    onBack,
    docEntry = "",
    orderOptions = [],
    ordersLoading = false,
    orderLoadError = "",
    jobCardOptions = [],
    jobCardsLoading = false,
    onOrderSelected,
    onLoadInputDetails,
    inputDetailsLoading = false,
}) => {
    const [form, setForm] = useState(INITIAL_PRODUCTION_FORM);
    const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
    const [orderSearch, setOrderSearch] = useState("");
    const orderDropdownRef = useRef(null);

    useEffect(() => {
        const onClick = (e) => {
            if (orderDropdownRef.current && !orderDropdownRef.current.contains(e.target)) {
                setOrderDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const selectOrder = (value) => {
        const o = orderOptions.find((opt) => opt.value === value);
        setForm((f) => ({
            ...INITIAL_PRODUCTION_FORM,
            docDate: f.docDate,
            workOrderNo: value,
            fgItemCode: o?.itemCode ?? "",
            fgItemName: o?.itemName ?? "",
            bpCode: o?.bpCode ?? "",
            bpName: o?.bpName ?? "",
            plannedQty: o?.plannedQty ?? "",
            workOrderType: o?.workOrderType ?? "",
            itemType: o?.itemType ?? "",
        }));
        onOrderSelected?.(value);
    };

    const selectJobCard = (jobCardNo) => {
        const jc = jobCardOptions.find((opt) => opt.jobCardNo === jobCardNo);
        setForm((f) => ({
            ...f,
            jobCardNo,
            opItem: jc?.opItem ?? "",
            opItemName: jc?.opItemName ?? "",
            processType: jc?.processType ?? "",
            toUnit: jc?.toUnit ?? "",
            targetWhs: jc?.targetWhs ?? "",
            issueWhs: jc?.issueWhs ?? "",
            receiptWhs: jc?.receiptWhs ?? "",
            targetTime: jc?.targetTime ?? "",
            jobCardStatus: jc?.jobCardStatus ?? "",
        }));
    };

    const selectedOrder = orderOptions.find((o) => o.value === form.workOrderNo);
    const orderQuery = orderSearch.trim().toLowerCase();
    const matchesOrder = (o) =>
        !orderQuery || [o.value, o.itemCode, o.itemName].some((v) => String(v ?? "").toLowerCase().includes(orderQuery));

    return (
        <div className="min-h-screen bg-white" id="create-production-order-page">
            <style>{createScreenAnimations}</style>

            {/* Heading card (slides down) */}
            <div className="px-6 pt-6">
                <div
                    className="pe-slide-down flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between md:px-8 md:py-6"
                    id="page-heading-card">
                    <div>
                        <nav className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500" id="breadcrumb-trail">
                            <span>Production</span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            <span>Production Execution</span>
                        </nav>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-extrabold text-slate-700">
                                Production Execution Management Console
                            </h1>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={onBack}
                            title="Back to list"
                            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100 active:scale-95"
                            id="btn-back">
                            <ChevronLeft className="h-8 w-8" />
                        </button>
                        <div
                            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                            id="step-indicator"
                        >
                            <span className="flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-3 text-black">
                                Production Orders
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dark banner (reveals left to right) */}
            <div className="px-6 pt-4">
                <div
                    className="pe-banner flex items-center justify-between rounded-2xl px-6 py-5 md:px-8"
                    style={{ backgroundColor: "#32343aff" }}
                    id="stage-banner"
                >
                    <div>
                        <h2 className="text-[28px] font-bold text-white">Create Production Order Master Configuration</h2>
                        <p className="mt-0 text-[16px] text-slate-400">Integrated Live Database</p>
                    </div>
                </div>
            </div>

            {/* Form card (fades up, rows stagger in) */}
            <div className="px-6 pb-8 pt-6" id="form-body">
                <div className="pe-fade-up rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm md:px-8 md:py-7" style={{ animationDelay: "0.3s" }}>
                    <div className="space-y-6">
                        {/* Row 1: Work Order / Job Card / To Unit / Operation */}
                        <div className="pe-fade-up grid grid-cols-1 gap-6 md:grid-cols-12" style={{ animationDelay: "0.45s" }}>
                            <div className="md:col-span-2">
                                <label htmlFor="input-work-order-no" className="mb-1.5 block text-[14px] font-bold tracking-wide text-slate-600">
                                    WORK ORDER NO <span className="ml-1 text-red-500">*</span>
                                </label>
                                <div ref={orderDropdownRef} className="relative">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <button
                                            type="button"
                                            id="input-work-order-no"
                                            aria-haspopup="listbox"
                                            aria-expanded={orderDropdownOpen}
                                            onClick={() => { setOrderDropdownOpen((open) => !open); setOrderSearch(""); }}
                                            className="relative w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-8 text-left text-[15px] font-bold text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                                        >
                                            <span className={form.workOrderNo ? "block truncate" : "block truncate text-slate-500"}>
                                                {form.workOrderNo
                                                    ? selectedOrder
                                                        ? `${selectedOrder.label}${selectedOrder.itemCode ? ` — ${selectedOrder.itemCode}` : ""}`
                                                        : form.workOrderNo
                                                    : ordersLoading ? "Loading orders..." : "Select Work / Stock orders"}
                                            </span>
                                            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        </button>
                                    </div>
                                    {orderDropdownOpen && (
                                        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl">
                                            <div className="border-b border-slate-200 bg-white p-2">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        autoComplete="off"
                                                        autoFocus
                                                        value={orderSearch}
                                                        onChange={(e) => setOrderSearch(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === "Escape") setOrderDropdownOpen(false); }}
                                                        placeholder="Search order or part..."
                                                        className="w-full rounded-md border border-slate-200 py-2 pl-8 pr-2 text-xs outline-none focus:border-slate-400"
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-[200px] overflow-y-auto overscroll-contain" role="listbox" aria-label="Work and stock orders">
                                                {["work", "stock"].map((kind) => {
                                                    const options = orderOptions.filter((o) => o.kind === kind && matchesOrder(o));
                                                    if (!options.length) return null;
                                                    return (
                                                        <div key={kind}>
                                                            <div className="sticky top-0 z-10 border-y border-slate-100 bg-slate-50 px-3 py-1.5 text-[17px] font-extrabold text-slate-700">
                                                                {kind === "work" ? "Work Orders (WO)" : "Stock Orders (WO-ST)"}
                                                            </div>
                                                            {options.map((o) => (
                                                                <button
                                                                    type="button"
                                                                    role="option"
                                                                    aria-selected={form.workOrderNo === o.value}
                                                                    key={`${kind}-${o.value}`}
                                                                    onClick={() => { selectOrder(o.value); setOrderDropdownOpen(false); setOrderSearch(""); }}
                                                                    className={`block w-full px-3 py-1.5 text-left text-sm leading-5 transition hover:bg-blue-50 ${form.workOrderNo === o.value ? "bg-blue-500 text-white hover:bg-blue-500" : "text-slate-800"}`}
                                                                >
                                                                    <span className="font-semibold">{o.label}</span>
                                                                    {o.itemCode && <span> — {o.itemCode}</span>}
                                                                    {o.itemName && (
                                                                        <span className={`ml-1 text-xs ${form.workOrderNo === o.value ? "text-slate-100" : "text-slate-500"}`}>({o.itemName})</span>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                                {ordersLoading ? (
                                                    <p className="px-3 py-4 text-center text-xs text-slate-500">Loading orders...</p>
                                                ) : orderOptions.filter(matchesOrder).length === 0 && (
                                                    <p className="px-3 py-4 text-center text-xs text-slate-500">No matching orders found</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {orderLoadError && <p className="mt-1 text-xs text-red-600">{orderLoadError}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="select-job-card-no" className="mb-1.5 block text-[14px] font-bold tracking-wide text-slate-600">
                                    JOB CARD NO <span className="ml-1 text-red-500">*</span>
                                </label>
                                <select
                                    autoComplete="off"
                                    id="select-job-card-no"
                                    value={form.jobCardNo}
                                    onChange={(e) => selectJobCard(e.target.value)}
                                    disabled={!form.workOrderNo || jobCardsLoading}
                                    className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[16px] font-bold text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                                >
                                    <option value="">
                                        {jobCardsLoading ? "Loading job cards..." : !form.workOrderNo ? "Select an order first" : "-- Select Job Card --"}
                                    </option>
                                    {jobCardOptions.map((jc) => (
                                        <option key={jc.jobCardNo} value={jc.jobCardNo}>{jc.jobCardNo}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <InfoCard label="Unit" value={form.toUnit} />
                            </div>

                            <div className="md:col-span-3">
                                <InfoCard
                                    key={`op-code-${form.jobCardNo}`}
                                    label="Operation Code"
                                    value={form.opItem}
                                    enabled={Boolean(form.jobCardNo)}
                                    className={form.jobCardNo ? "pe-pop" : ""}
                                    valueClassName="text-[16px]"
                                />
                            </div>

                            <div className="md:col-span-3">
                                <InfoCard
                                    key={`op-name-${form.jobCardNo}`}
                                    label="Operation Name"
                                    value={form.opItemName}
                                    enabled={Boolean(form.jobCardNo)}
                                    className={form.jobCardNo ? "pe-pop" : ""}
                                    valueClassName="text-[16px]"
                                />
                            </div>
                        </div>

                        {/* Row 2: Job card status / Process + Issue Whs / Target + Receipt Whs / FG code + name */}
                        <div className="pe-fade-up grid grid-cols-1 items-stretch gap-6 md:grid-cols-12" style={{ animationDelay: "0.6s" }}>
                            <div className="md:col-span-2">
                                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20">
                                    <div className="border-b border-slate-200 px-4 pb-4 pt-3">
                                        <label htmlFor="select-job-card-status" className="block text-[13px] font-bold uppercase tracking-wide text-slate-600">
                                            Job Card Status <span className="ml-0.5 text-red-500">*</span>
                                        </label>
                                        {/* white field for the status dropdown */}
                                        <div className="relative mt-2">
                                            <select
                                                id="select-job-card-status"
                                                required
                                                aria-required="true"
                                                value={form.jobCardStatus}
                                                onChange={(e) => setForm((f) => ({ ...f, jobCardStatus: e.target.value }))}
                                                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2 pr-9 text-[15px] font-bold text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                                            >
                                                <option value="">-- Select Status --</option>
                                                {jobCardStatusOptions.map((st) => (
                                                    <option key={st} value={st}>{st}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        </div>
                                    </div>
                                    <div className="flex-1 px-4 pb-3 pt-2.5">
                                        <label htmlFor="input-bp-name" className="block text-[13px] font-bold uppercase tracking-wide text-slate-600">
                                            Next Job Card No.
                                        </label>
                                        <input
                                            autoComplete="off"
                                            id="input-bp-name"
                                            type="text"
                                            value={form.bpName}
                                            disabled
                                            readOnly
                                            placeholder=""
                                            className="w-full bg-transparent text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Process Type | Issue Whs  /  Item Type | Receipt Whs */}
                            <div className="grid grid-cols-2 content-start gap-4 md:col-span-4">
                                <InfoCard label="Process Type" value={form.processType} />
                                <InfoCard label="Issue Whs" value={form.issueWhs} />
                                <InfoCard label="Item Type" value={form.itemType} />
                                <InfoCard label="Receipt Whs" value={form.receiptWhs} />
                            </div>

                            <div className="md:col-span-3">
                                <InfoCard
                                    key={`fg-code-${form.workOrderNo}`}
                                    label="FG Item Code"
                                    value={form.fgItemCode}
                                    enabled={Boolean(form.workOrderNo)}
                                    className={form.workOrderNo ? "pe-pop" : ""}
                                    valueClassName="text-[16px]"
                                />
                            </div>

                            <div className="md:col-span-3">
                                <InfoCard
                                    key={`fg-name-${form.workOrderNo}`}
                                    label="FG Item Name"
                                    value={form.fgItemName}
                                    enabled={Boolean(form.workOrderNo)}
                                    className={form.workOrderNo ? "pe-pop" : ""}
                                    valueClassName="text-[16px]"
                                />
                            </div>
                        </div>

                        {/* Row 3: DocEntry + Doc Date / Work Order Type + Target Time / Planned Qty */}
                        <div className="pe-fade-up grid grid-cols-1 gap-6 md:grid-cols-12" style={{ animationDelay: "0.75s" }}>
                            <div className="md:col-span-2">
                                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20">
                                    <div className="border-b border-slate-200 px-4 pb-2.5 pt-3">
                                        <label htmlFor="input-doc-entry" className="block text-[12px] font-bold uppercase tracking-wide text-slate-600">
                                            DOC ENTRY
                                        </label>
                                        <div className="mt-1 flex items-center gap-2">
                                            <Hash className="h-4 w-4 shrink-0 text-slate-600" />
                                            <input
                                                autoComplete="off"
                                                id="input-doc-entry"
                                                type="text"
                                                value={docEntry}
                                                disabled
                                                readOnly
                                                className="w-full bg-transparent font-mono text-base font-bold text-slate-900 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 px-4 pb-3 pt-2.5">
                                        <label htmlFor="input-doc-date" className="block text-[12px] font-bold uppercase tracking-wide text-slate-600">
                                            DOC. DATE
                                        </label>
                                        <div className="relative mt-1 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                                            <input
                                                autoComplete="off"
                                                id="input-doc-date"
                                                type="text"
                                                value={formatDocDateForDisplay(form.docDate)}
                                                placeholder="DD-MM-YYYY"
                                                disabled
                                                readOnly
                                                className="w-full bg-transparent font-mono text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Work Order Type with Target Time beneath it */}
                            <div className="flex flex-col gap-4 md:col-span-2">
                                <InfoCard label="Work Order Type" value={form.workOrderType} />
                                <InfoCard label="Target Time" value={form.targetTime} mono />
                            </div>

                            <div className="md:col-span-2">
                                <InfoCard label="Planned Qty" value={form.plannedQty} mono />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Load input details button (bottom right, outside the form card) */}
                <div className="pe-fade-up mt-6 flex justify-end" style={{ animationDelay: "0.9s" }}>
                    <button
                        type="button"
                        id="btn-load-input-details"
                        onClick={() => onLoadInputDetails?.(form)}
                        disabled={!form.jobCardNo || inputDetailsLoading}
                        title={form.jobCardNo ? "Load input details" : "Select a job card first"}
                        className="group w-full max-w-[280px] rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm outline-none transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                    >
                        <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">Load Input Details</h3>
                        <p className="mt-4 text-[15px] font-semibold leading-relaxed text-slate-500">
                            Click this button to load the input details for the output execution.
                        </p>
                        <span className="mt-1 inline-block text-[15px] font-bold text-blue-600 group-hover:text-blue-700">
                            {inputDetailsLoading ? "Loading input details..." : "+ Load Input Details"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ------------------------------ Page ------------------------------ */

export default function Productionexecution() {
    const allocationRows = [];

    // TODO: load these from your API (like fetchStockOrdersRDBMS in stock order planning).
    const [entries, setEntries] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [view, setView] = useState("list"); // "list" | "add"

    const refreshEntries = async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            // const rows = await fetchProductionEntriesRDBMS();
            // setEntries(Array.isArray(rows) ? rows : []);
        } finally {
            setRefreshing(false);
        }
    };

    const handleCreateProductionOrder = () => {
        window.scrollTo?.({ top: 0 });
        setView("add");
    };

    // "+ Create Production Order" opens the first screen of the Stock Allocation flow.
    if (view === "add") {
        return (
            <CreateProductionOrderScreen
                onBack={() => setView("list")}
            // TODO: pass the next DocEntry from your API, e.g. docEntry={nextDocEntry}
            // TODO: pass orderOptions / jobCardOptions loaded from your API
            // and load job cards in onOrderSelected(workOrderNo).
            // TODO: pass onLoadInputDetails(form) to fetch the input details for the output execution.
            />
        );
    }

    return (
        <div className="w-full bg-slate-50 font-sans text-slate-900">
            <header className="rounded-2xl border border-slate-200 bg-white px-7 py-6 shadow-sm">
                <nav className="mb-2 flex items-center gap-2 text-xl font-bold text-slate-400" id="breadcrumb-trail">
                    <span>Production</span>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                    <span>Production Execution</span>
                </nav>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                    Production Execution Management Console
                </h1>
            </header>
            <div className="grid w-full grid-cols-1 items-stretch gap-4 px-1 md:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="mt-6 flex min-w-0 flex-col gap-4">
                    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:max-w-[674px]">
                        <div className="group relative h-[205px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 p-6 text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-slate-300 hover:shadow-xl">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Total Production Orders</p>
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
                                    <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Released Production Orders</p>
                                    <p className="mt-4 text-6xl font-light tracking-tight text-slate-800">{allocationRows.filter((row) => row.status === "Released").length}</p>
                                </div>
                                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-transform duration-300 group-hover:rotate-12 group-hover:bg-white group-hover:shadow-sm">
                                    <ArrowDown className="h-4 w-4 rotate-[-45deg]" />
                                </span>
                            </div>
                            <div className="absolute bottom-5 left-6 flex items-center gap-2">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 text-slate-500 text-xs">↗</span>
                                <span className="text-xs font-bold text-slate-500">Released Orders</span>
                            </div>
                        </div>
                    </div>

                    {/* Bar chart + pie chart side by side beneath the KPI cards */}
                    <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,790px)_minmax(0,520px)]">
                        <div className="min-w-0">
                            <ChartBarMultiple />
                        </div>
                        <div className="min-w-0">
                            <ChartPieSeparatorNone />
                        </div>
                    </div>
                </div>

                {/* Right column: "+ Production Order" container button */}
                <div className="mt-6">
                    <RedContainerButton onClick={handleCreateProductionOrder} />
                </div>
            </div>
            {/* Production entries table beneath the charts */}
            <div className="mt-6 px-1 pb-6">
                <ProductionEntriesTable
                    entries={entries}
                    onRefresh={refreshEntries}
                    refreshing={refreshing}
                    onView={(entry) => console.log("View production entry", entry)}
                />
            </div>
        </div>
    );
}