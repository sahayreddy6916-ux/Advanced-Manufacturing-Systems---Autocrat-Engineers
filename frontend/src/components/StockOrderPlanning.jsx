import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";
import {
    XCircle,
    CalendarDays,
    ChevronRight,
    CircleAlert,
    ListChecks,
    ArrowDown,
    FolderOpen,
    Search,
    SlidersHorizontal,
    TrendingUp,
    RefreshCw,
    Filter,
    Eye,
    Trash2,
    ChevronDown,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    Undo2,
    ArrowRight,
    FileCheck,
    Cpu,
    X,
    Check,
    Loader2,
} from "lucide-react";
import {
    fetchStockFgItemsRDBMS,
    fetchStockRoutingRDBMS,
    fetchStockOrdersRDBMS,
    saveStockPlanningRDBMS,
    deleteStockOrderRDBMS,
    getNextStockOrderNo
} from "../api";
import Toast, { useToasts } from "./Toast";
import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, Rectangle, Sector, XAxis } from "recharts";
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
    ChartStyle,
    ChartTooltip,
    ChartTooltipContent,
} from "@/Charts/ui/chart";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const chartData = [
    { status: "draft", orders: 187, fill: "#6b7280" },
    { status: "released", orders: 200, fill: "#737985" },
    { status: "completed", orders: 173, fill: "#858b96" },
    { status: "planned", orders: 173, fill: "#969ba5" },
    { status: "cancelled", orders: 90, fill: "#a7acb5" },
];

const chartConfig = {
    orders: { label: "Orders" },
    draft: { label: "Draft", color: "#4b5563" },
    released: { label: "Released", color: "#6b7280" },
    completed: { label: "Completed", color: "#858b96" },
    planned: { label: "Planned", color: "#a3a8b0" },
    cancelled: { label: "Cancelled", color: "#c5c9cf" },
};

const ACTIVE_INDEX = 1;

const StockOrderChart = () => (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardHeader>
            <CardTitle>Stock Orders by Status</CardTitle>
            <CardDescription>Overall Orders</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="h-[340px] w-full">
                <BarChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="status"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) =>
                            chartConfig[value]?.label
                        }
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar
                        dataKey="orders"
                        strokeWidth={2}
                        radius={8}
                        shape={({ index, ...props }) =>
                            index === ACTIVE_INDEX ? (
                                <Rectangle
                                    {...props}
                                    fill={props.payload.fill}
                                    fillOpacity={0.8}
                                    stroke={props.payload.fill}
                                    strokeDasharray={4}
                                    strokeDashoffset={4} />) : (
                                <Rectangle
                                    {...props}
                                    fill={props.payload.fill}
                                />)}
                    >
                        {chartData.map((entry) => (
                            <Cell key={entry.status} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium">
                Showing stock orders by status<TrendingUp className="h-4 w-4" />
            </div>
        </CardFooter>
    </Card>
);

const desktopData = [
    { month: "january", desktop: 186, fill: "#374151" },
    { month: "february", desktop: 305, fill: "#4b5563" },
    { month: "march", desktop: 237, fill: "#5f6672" },
    { month: "april", desktop: 173, fill: "#737985" },
    { month: "may", desktop: 209, fill: "#858b96" },
    { month: "june", desktop: 214, fill: "#969ba5" },
    { month: "july", desktop: 198, fill: "#a7acb5" },
    { month: "august", desktop: 262, fill: "#b5bac2" },
    { month: "september", desktop: 241, fill: "#c1c5cc" },
    { month: "october", desktop: 280, fill: "#cbd0d6" },
    { month: "november", desktop: 225, fill: "#d5d9de" },
    { month: "december", desktop: 190, fill: "#e1e4e8" },
];

const pieChartConfig = {
    visitors: { label: "Visitors" },
    desktop: { label: "Desktop" },
    mobile: { label: "Mobile" },
    january: { label: "January", color: "#374151" },
    february: { label: "February", color: "#4b5563" },
    march: { label: "March", color: "#5f6672" },
    april: { label: "April", color: "#737985" },
    may: { label: "May", color: "#858b96" },
    june: { label: "June", color: "#969ba5" },
    july: { label: "July", color: "#a7acb5" },
    august: { label: "August", color: "#b5bac2" },
    september: { label: "September", color: "#c1c5cc" },
    october: { label: "October", color: "#cbd0d6" },
    november: { label: "November", color: "#d5d9de" },
    december: { label: "December", color: "#e1e4e8" },
};

export function ChartPieInteractive() {
    const id = "pie-interactive";
    const [activeMonth, setActiveMonth] = React.useState(desktopData[0].month);

    const activeIndex = React.useMemo(
        () => desktopData.findIndex((item) => item.month === activeMonth),
        [activeMonth]
    );
    const months = React.useMemo(() => desktopData.map((item) => item.month), []);

    const renderPieShape = React.useCallback(
        ({ index, outerRadius = 0, ...props }) => {
            if (index === activeIndex) {
                return (
                    <g>
                        <Sector {...props} outerRadius={outerRadius + 10} />
                        <Sector
                            {...props}
                            outerRadius={outerRadius + 25}
                            innerRadius={outerRadius + 12}
                        />
                    </g>
                );
            }

            return <Sector {...props} outerRadius={outerRadius} />;
        },
        [activeIndex]
    );

    return (
        <Card data-chart={id} className="flex flex-col">
            <ChartStyle id={id} config={pieChartConfig} />
            <CardHeader className="flex-row items-start space-y-0 pb-0">
                <div className="grid gap-1">
                    <CardTitle>Pie Chart - Interactive</CardTitle>
                    <CardDescription>January - December</CardDescription>
                </div>
                <Select value={activeMonth} onValueChange={setActiveMonth}>
                    <SelectTrigger
                        className="ml-auto h-7 w-[170px] rounded-lg pl-2.5"
                        aria-label="Select a value"
                    >
                        <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent align="end" className="rounded-xl">
                        {months.map((key) => {
                            const config = pieChartConfig[key];

                            if (!config) {
                                return null;
                            }

                            return (
                                <SelectItem
                                    key={key}
                                    value={key}
                                    className="rounded-lg [&_span]:flex"
                                >
                                    <div className="flex items-center gap-2 text-xs">
                                        <span
                                            className="flex h-3 w-3 shrink-0 rounded-xs"
                                            style={{
                                                backgroundColor: pieChartConfig[key]?.color,
                                            }}
                                        />
                                        {config?.label}
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="flex flex-1 justify-center pb-0">
                <ChartContainer
                    id={id}
                    config={pieChartConfig}
                    className="mx-auto aspect-square w-full w-[320px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={desktopData}
                            dataKey="desktop"
                            nameKey="month"
                            innerRadius={60}
                            strokeWidth={5}
                            shape={renderPieShape}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-3xl font-bold"
                                                >
                                                    {desktopData[activeIndex].desktop.toLocaleString()}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-muted-foreground"
                                                >
                                                    Visitors
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

const statusStyles = {
    Released: "bg-emerald-100 text-emerald-700",
    Draft: "bg-slate-100 text-slate-700",
    Planned: "bg-amber-100 text-amber-700",
    Cancelled: "bg-rose-100 text-rose-600",
    Completed: "bg-blue-100 text-blue-700",
};

const tabs = ["All", "Draft", "Planned", "Released", "Cancelled", "Completed"];
const columns = ["Stock Order Number", "Creation Date", "Item Code", "Item Description", "Planned Qty", "Order Type", "Unit", "Status"];

const StockOrdersTable = ({ orders = [], onDelete, onView, onRefresh, refreshing = false }) => {
    const [activeTab, setActiveTab] = useState("All");
    const [pendingDelete, setPendingDelete] = useState(null);
    const [query, setQuery] = useState("");
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [filterOpen, setFilterOpen] = useState(false);
    const [unitFilter, setUnitFilter] = useState("All Units");
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

    const counts = useMemo(() => {
        const c = { All: orders.length };
        orders.forEach((w) => (c[w.status] = (c[w.status] ?? 0) + 1));
        return c;
    }, [orders]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return orders.filter(
            (w) =>
                (activeTab === "All" || w.status === activeTab) &&
                (unitFilter === "All Units" || w.unit === unitFilter) &&
                (!q ||
                    [w.number, w.itemCode, w.itemDescription, w.orderType, w.unit]
                        .join(" ")
                        .toLowerCase()
                        .includes(q))
        );
    }, [orders, activeTab, query, unitFilter]);

    const visible = filtered.slice(0, rowsPerPage);

    return (
        <div className="w-full rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 pt-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-[22px] font-extrabold tracking-tight text-slate-900">Stock Orders</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                        {counts.All}
                    </span>
                </div>
                <div className="flex items-center gap-4 text-slate-500">
                    <button
                        type="button"
                        title={refreshing ? "Refreshing stock orders..." : "Refresh"}
                        aria-label="Refresh stock orders"
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
                            className={`relative hover:text-slate-800 ${filterOpen || unitFilter !== "All Units" ? "text-slate-900" : ""}`}>
                            <Filter className="h-5 w-5" />
                            {unitFilter !== "All Units" && (
                                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-indigo-500" />
                            )}
                        </button>
                        {filterOpen && (
                            <div className="absolute right-0 top-9 z-20 w-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-[15px] font-extrabold text-slate-900">Filter Database Records</h3>
                                    {unitFilter !== "All Units" && (
                                        <button
                                            type="button"
                                            onClick={() => setUnitFilter("All Units")}
                                            className="text-xs font-bold text-indigo-500 hover:text-indigo-600">
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-500" htmlFor="unit-filter">
                                    Unit
                                </label>
                                <div className="relative">
                                    <select
                                        id="unit-filter"
                                        value={unitFilter}
                                        onChange={(e) => setUnitFilter(e.target.value)}
                                        className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                                        {["All Units", "Unit-1", "Unit-2", "Unit-3"].map((u) => (
                                            <option key={u} value={u}>{u}</option>
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
                                }`}>
                            {t} <span className="ml-1">{counts[t] ?? 0}</span>
                        </button>
                    ))}
                </div>
                <div className="flex w-full max-w-sm items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 md:w-80">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search stock orders..."
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
                        {visible.map((w) => (
                            <tr key={w.number} className="border-t border-slate-100 text-sm text-slate-600 hover:bg-slate-50">
                                <td className="px-6 py-5 font-bold text-slate-900">{w.number}</td>
                                <td className="px-6 py-5">{w.created}</td>
                                <td className="px-6 py-5">{w.itemCode}</td>
                                <td className="px-6 py-5">{w.itemDescription}</td>
                                <td className="px-6 py-5 font-semibold text-slate-800">{w.plannedQty}</td>
                                <td className="px-6 py-5">{w.orderType}</td>
                                <td className="px-6 py-5">{w.unit}</td>
                                <td className="px-6 py-5">
                                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[w.status]}`}>
                                        {w.status}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center justify-end gap-4 text-slate-400">
                                        <button
                                            type="button"
                                            title="Modify stock order"
                                            onClick={() => onView?.(w)}
                                            className="hover:text-slate-700"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        {(w.status === "Draft" || w.status === "Planned") && (
                                            <button type="button" title="Delete" onClick={() => onDelete?.(w.number)} className="hover:text-rose-600">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {visible.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-6 py-10">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <FolderOpen className="w-9 h-9 text-slate-300" />
                                        <span className="font-semibold text-slate-500">No Stock orders matching database criteria</span>
                                        <p className="text-xs text-slate-400">Try relaxing your search terms or filters.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {pendingDelete && (
                <div
                    role="alertdialog"
                    aria-live="assertive"
                    className="fixed bottom-6 right-6 z-[180] w-[min(92vw,390px)] rounded-2xl border border-rose-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.22)]"
                >
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                            <Trash2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-slate-900">Delete stock order?</p>
                            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                {pendingDelete.number} will be permanently removed from the database.
                            </p>
                        </div>
                        <button
                            type="button"
                            aria-label="Close delete confirmation"
                            onClick={() => setPendingDelete(null)}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setPendingDelete(null)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-600 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const number = pendingDelete.number;
                                setPendingDelete(null);
                                onDelete?.(number);
                            }}
                            className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-rose-700"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-xs font-semibold text-slate-500">
                <label className="flex items-center gap-2">
                    Rows per page:
                    <span className="relative flex items-center">
                        <select
                            value={rowsPerPage}
                            onChange={(e) => setRowsPerPage(Number(e.target.value))}
                            className="cursor-pointer appearance-none bg-transparent pr-5 font-bold text-slate-800 outline-none">
                            {[15, 30, 50].map((n) => (
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

/* ---------- Configuration desk ---------- */

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useTypewriter(text, start, speed = 25) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!start) {
            setCount(0);
            return;
        }
        if (prefersReducedMotion()) {
            setCount(text.length);
            return;
        }
        setCount(0);
        const id = window.setInterval(() => {
            setCount((c) => {
                if (c >= text.length) {
                    window.clearInterval(id);
                    return c;
                }
                return c + 1;
            });
        }, speed);
        return () => window.clearInterval(id);
    }, [text, start, speed]);

    return { shown: text.slice(0, count), done: count >= text.length };
}
const configSteps = [
    { id: 1, label: "Planning Blueprint" },
    { id: 2, label: "Routing & Allocation" },
];

const ORDER_TYPE_LABEL = "For Stock (FG)";
const unitOptions = ["Unit-1", "Unit-2", "Unit-3"];
const priorityOptions = ["Low", "Normal", "High", "Urgent"];
const plannerOptions = ["Opshead", "Planner-1", "Planner-2"];

const today = () => new Date().toLocaleDateString("en-CA");
const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-CA");
};

const labelCls = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500";
const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100";
const readOnlyCls =
    "w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none";

const Field = ({ label, required, className = "", children }) => (
    <div className={className}>
        <label className={labelCls}>{label}{required && <span className="ml-1 text-rose-500">*</span>}</label>
        {children}</div>);

const SelectField = ({
    value,
    onChange,
    options,
    placeholder,
    invalid = false,
    shakeKey = 0,
    disabled = false,
}) => (
    <div className="relative">
        <select
            key={shakeKey}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`${inputCls} cursor-pointer appearance-none pr-10 ${value ? "" : "text-slate-400"} ${invalid ? "required-field-error !ring-2 !ring-red-100" : ""} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`}>
            {placeholder && (
                <option value="" disabled>
                    {placeholder}
                </option>
            )}
            {options.map((o) => (
                <option key={o} value={o} className="text-slate-800">
                    {o}
                </option>
            ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>);

const formatDisplayDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}-${m}-${y}`;
};

const toISODate = (year, month, day) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
};

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const DatePickerField = ({ value, onChange, min, invalid = false, shakeKey = 0, disabled = false, dark = false }) => {
    const [open, setOpen] = useState(false);
    const [calendarPosition, setCalendarPosition] = useState(null);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const calendarRef = useRef(null);

    const initial = value ? new Date(value + "T00:00:00") : new Date();
    const [viewYear, setViewYear] = useState(initial.getFullYear());
    const [viewMonth, setViewMonth] = useState(initial.getMonth());

    useEffect(() => {
        if (value) {
            const d = new Date(value + "T00:00:00");
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
        }
    }, [value]);

    const updateCalendarPosition = () => {
        const trigger = triggerRef.current;
        if (!trigger || typeof window === "undefined") return;

        const rect = trigger.getBoundingClientRect();
        const padding = 8;
        const gap = 4;
        const width = Math.min(240, Math.max(0, window.innerWidth - padding * 2));
        const height = Math.min(275, Math.max(0, window.innerHeight - padding * 2));
        const spaceBelow = window.innerHeight - rect.bottom - gap - padding;
        const spaceAbove = rect.top - gap - padding;
        const openBelow = spaceBelow >= height || spaceBelow >= spaceAbove;
        const requestedTop = openBelow ? rect.bottom + gap : rect.top - height - gap;
        const maxTop = Math.max(padding, window.innerHeight - height - padding);
        const maxLeft = Math.max(padding, window.innerWidth - width - padding);

        setCalendarPosition({
            position: "fixed",
            top: Math.min(Math.max(padding, requestedTop), maxTop),
            left: Math.min(Math.max(padding, rect.left), maxLeft),
            width,
            height,
            overflowY: "auto",
        });
    };

    useEffect(() => {
        if (!open) return undefined;

        const handleOutside = (event) => {
            const clickedInsideTrigger = containerRef.current?.contains(event.target);
            const clickedInsideCalendar = calendarRef.current?.contains(event.target);
            if (!clickedInsideTrigger && !clickedInsideCalendar) setOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        const reposition = () => updateCalendarPosition();

        updateCalendarPosition();
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleKeyDown);
        window.addEventListener("resize", reposition);
        window.addEventListener("scroll", reposition, true);

        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("resize", reposition);
            window.removeEventListener("scroll", reposition, true);
        };
    }, [open]);

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, iso: null });
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, iso: toISODate(viewYear, viewMonth, d) });
    }

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear((y) => y - 1);
        } else {
            setViewMonth((m) => m - 1);
        }
    };

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear((y) => y + 1);
        } else {
            setViewMonth((m) => m + 1);
        }
    };

    const isDisabled = (iso) => {
        if (!min) return false;
        return iso < min;
    };

    const toggleCalendar = () => {
        if (disabled) return;
        if (!open) updateCalendarPosition();
        setOpen((o) => !o);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                key={shakeKey}
                ref={triggerRef}
                type="button"
                onClick={toggleCalendar}
                disabled={disabled}
                className={`${dark
                    ? "flex w-full items-center gap-2.5 rounded-lg border border-slate-800 bg-black/45 px-3 py-3 text-left text-[15px] text-white focus:border-slate-600 focus:outline-none"
                    : `${inputCls} flex items-center gap-2.5 text-left`} ${invalid ? "required-field-error !ring-2 !ring-red-100" : ""} disabled:cursor-not-allowed disabled:bg-slate-100`}
            >
                <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                <span className={value ? (dark ? "text-white" : "text-slate-800") : "text-slate-400"}>
                    {value ? formatDisplayDate(value) : "DD-MM-YYYY"}
                </span>
            </button>

            {open && calendarPosition && createPortal(
                <div
                    ref={calendarRef}
                    style={calendarPosition}
                    className="fixed z-[100] w-[240px] h-[275px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_11px_40px_rgba(15,23,42,0.12)]"
                >
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[15px] font-bold text-slate-900">
                            {MONTH_NAMES[viewMonth]} {viewYear}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={prevMonth}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={nextMonth}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7">
                        {WEEKDAYS.map((wd) => (
                            <div
                                key={wd}
                                className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                            >
                                {wd}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0">
                        {cells.map((cell, idx) => {
                            if (cell.day === null) {
                                return <div key={`empty-${idx}`} className="h-9" />;
                            }
                            const selected = cell.iso === value;
                            const disabled = isDisabled(cell.iso);
                            return (
                                <button
                                    key={cell.iso}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                        if (!disabled) {
                                            onChange(cell.iso);
                                            setOpen(false);
                                        }
                                    }}
                                    className={`flex h-6 w-full items-center justify-center rounded-full text-sm font-medium transition-colors
                                        ${selected
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : disabled
                                                ? "cursor-not-allowed text-slate-300"
                                                : "text-slate-700 hover:bg-slate-100"
                                        }`}
                                >
                                    {cell.day}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                        >
                            Close
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const Stage1Form = ({ onProceed, onSchedule, apiRef, initialOrder, isModify, isReadOnly = false, isReleased = false, newOrderNo = "" }) => {
    const [fgItemCode, setFgItemCode] = useState(initialOrder?.itemCode || "");
    const [fgItemName, setFgItemName] = useState(initialOrder?.itemDescription || "");
    const [fgQuantity, setFgQuantity] = useState(String(initialOrder?.fgQuantity ?? ""));
    const [fgItemLoaded, setFgItemLoaded] = useState(Boolean(initialOrder?.itemCode));
    const [detailsScreen, setDetailsScreen] = useState(Boolean(initialOrder?.itemCode));
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [drawingRevision, setDrawingRevision] = useState(initialOrder?.drawingRevision ?? initialOrder?.drawing_revision ?? initialOrder?.drawingRevisionNo ?? "");
    const [unit, setUnit] = useState(initialOrder?.unit && initialOrder.unit !== "-" ? initialOrder.unit : "");
    const [priority, setPriority] = useState(initialOrder?.priority || "");
    const [plannedQty, setPlannedQty] = useState(initialOrder?.plannedQty && initialOrder.plannedQty !== "-" ? String(initialOrder.plannedQty) : "");
    const [woDate, setWoDate] = useState(today());
    const [completionDate, setCompletionDate] = useState(initialOrder?.completionDate || "");
    const [planner, setPlanner] = useState(initialOrder?.planner || "");
    const [remarks, setRemarks] = useState(initialOrder?.remarks || "");
    const [invalidFields, setInvalidFields] = useState([]);
    const [shakeAttempt, setShakeAttempt] = useState(0);
    const [fgDropdownOpen, setFgDropdownOpen] = useState(false);
    const [fgOptions, setFgOptions] = useState([]);
    const [fgOptionsLoading, setFgOptionsLoading] = useState(false);
    const fgDropdownRef = useRef(null);
    const [workOrderNo] = useState(() => initialOrder?.number || newOrderNo);

    useEffect(() => {
        if (!fgDropdownOpen) return undefined;

        const q = fgItemCode.trim();
        let cancelled = false;
        setFgOptionsLoading(true);

        const t = window.setTimeout(async () => {
            try {
                const rows = await fetchStockFgItemsRDBMS(q);
                if (!cancelled) setFgOptions(Array.isArray(rows) ? rows : []);
            } catch (error) {
                if (!cancelled) setFgOptions([]);
                console.error('Failed to load FG items:', error);
            } finally {
                if (!cancelled) setFgOptionsLoading(false);
            }
        }, q ? 250 : 0);

        return () => {
            cancelled = true;
            window.clearTimeout(t);
        };
    }, [fgDropdownOpen, fgItemCode]);

    useEffect(() => {
        if (isModify && fgItemLoaded) {
            setDetailsScreen(true);
            setLoadingProgress(100);
            return undefined;
        }
        if (!fgItemLoaded) {
            setLoadingProgress(0);
            setDetailsScreen(false);
            return undefined;
        }

        setDetailsScreen(false);
        setLoadingProgress(0);
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            const next = Math.min(100, Math.round(((Date.now() - startedAt) / 1500) * 100));
            setLoadingProgress(next);
            if (next >= 100) {
                window.clearInterval(timer);
                setDetailsScreen(true);
            }
        }, 30);
        return () => window.clearInterval(timer);
    }, [fgItemLoaded, isModify]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (fgDropdownRef.current && !fgDropdownRef.current.contains(event.target)) {
                setFgDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const buildOrder = (status) => ({
        number: workOrderNo,
        created: formatDisplayDate(woDate),
        itemCode: fgItemCode,
        itemDescription: fgItemName,
        plannedQty: plannedQty || "-",
        orderType: ORDER_TYPE_LABEL,
        unit: unit || "-",
        status,
        priority,
        completionDate,
        planner,
        remarks,
        drawingRevision,
        fgQuantity,
    });

    useEffect(() => {
        if (apiRef) apiRef.current = { getDraft: () => (fgItemLoaded ? buildOrder("Draft") : null) };
    });

    const validate = () => {
        const missing = [];
        if (!unit) missing.push("unit");
        if (!plannedQty.trim() || !Number.isFinite(Number(plannedQty)) || Number(plannedQty) <= 0) missing.push("plannedQty");
        if (!completionDate) missing.push("completionDate");
        if (!planner) missing.push("planner");

        if (missing.length) {
            setInvalidFields(missing);
            setShakeAttempt((attempt) => attempt + 1);
            return false;
        }

        setInvalidFields([]);
        return true;
    };

    const handleSchedule = () => {
        if (isReleased) {
            const missing = [];
            if (!unit) missing.push("unit");
            if (!plannedQty.trim() || !Number.isFinite(Number(plannedQty)) || Number(plannedQty) <= 0) {
                missing.push("plannedQty");
            }
            if (!completionDate) missing.push("completionDate");

            if (missing.length) {
                setInvalidFields(missing);
                setShakeAttempt((attempt) => attempt + 1);
                return;
            }
            setInvalidFields([]);
        } else if (!validate()) {
            return;
        }

        onSchedule?.(buildOrder(isReleased ? "Released" : "Planned"));
    };

    const handleProceedToRouting = () => {
        if (!isReadOnly && !validate()) return;
        onProceed({
            fgItemCode, fgItemName, fgQuantity, unit, plannedQty, completionDate, planner, workOrderNo,
            routingChanges: initialOrder?.routingChanges ?? initialOrder?.routing_changes ?? null,
        });
    };

    const clearInvalidField = (field) => {
        setInvalidFields((current) => current.filter((name) => name !== field));
    };

    const selectFgItem = (option) => {
        setFgItemCode(option.code || "");
        setFgItemName(option.name || "");
        setFgQuantity(option.fgQuantity != null && option.fgQuantity !== "" ? String(option.fgQuantity) : "");
        setFgItemLoaded(true);
        setDrawingRevision(option.revision || "");
        setPlannedQty("");
        setFgDropdownOpen(false);
    };

    return (<>
        <style>{`
            @keyframes requiredFieldShake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-3px); }
                40%, 80% { transform: translateX(3px); }
            }
            .required-field-error,
            .schedule-validation-error {
                border: 1px solid #ef4444 !important;
                animation: requiredFieldShake 0.8s ease-in-out 0s 2 !important;
                border-radius: 0.75rem;
                transform-origin: center;
            }
            .required-field-error select,
            .required-field-error input,
            .required-field-error textarea,
            select.required-field-error,
            input.required-field-error,
            textarea.required-field-error {
                border: 1px solid #ef4444 !important;
                animation: requiredFieldShake 0.8s ease-in-out 0s 2 !important;
                border-radius: 0.75rem;
            }
        `}</style>
        <div className="relative space-y-6 p-6 md:p-8">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]">
                <div className="relative min-w-0 overflow-visible rounded-2xl border border-slate-200 bg-slate-50 transition-colors focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100">
                    <div className="px-4 pb-2 pt-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            FG Item Code<span className="ml-1 text-rose-500">*</span>
                        </label>
                        <div className="relative mt-1" ref={fgDropdownRef}>
                            <Search className="absolute left-0 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={fgItemCode}
                                readOnly={isReadOnly}
                                role="combobox"
                                aria-autocomplete="list"
                                aria-controls="fg-item-code-options"
                                aria-expanded={fgDropdownOpen}
                                onChange={(e) => {
                                    setFgItemCode(e.target.value);
                                    setFgItemLoaded(false);
                                    setDetailsScreen(false);
                                    setLoadingProgress(0);
                                    setFgItemName("");
                                    setFgQuantity("");
                                    setDrawingRevision("");
                                    setPlannedQty("");
                                    setFgDropdownOpen(true);
                                }}
                                onFocus={() => { if (!isReadOnly) setFgDropdownOpen(true); }}
                                placeholder="Search FG item code"
                                autoComplete="off"
                                className="w-full min-w-0 truncate bg-transparent py-1 pl-6 pr-7 text-base font-bold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
                            />
                            <button
                                type="button"
                                aria-label={fgDropdownOpen ? "Close FG item list" : "Open FG item list"}
                                aria-expanded={fgDropdownOpen}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => setFgDropdownOpen((open) => !open)}
                                disabled={isReadOnly}
                                className="absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                            >
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform ${fgDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {fgDropdownOpen && !isReadOnly && (
                                <div
                                    id="fg-item-code-options"
                                    className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 min-w-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
                                    role="listbox"
                                    aria-label="Matching FG items"
                                >
                                    {fgOptionsLoading ? (
                                        <div className="px-4 py-4 text-center text-xs font-medium text-slate-500" role="status">
                                            Searching FG items…
                                        </div>
                                    ) : fgOptions.length === 0 ? (
                                        <div className="px-4 py-4 text-center text-xs font-medium text-slate-400">
                                            No matching items found
                                        </div>
                                    ) : (
                                        fgOptions.map((option) => {
                                            const isSelected = option.code === fgItemCode;
                                            return (
                                                <button
                                                    key={option.code}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => selectFgItem(option)}
                                                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${isSelected
                                                        ? "bg-indigo-50 text-slate-900"
                                                        : "text-slate-700 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    <span className="min-w-0 flex-1 overflow-hidden">
                                                        <span className="block max-w-full truncate text-sm font-semibold">{option.code}</span>
                                                        {option.name && (
                                                            <span className="mt-0.5 block max-w-full truncate text-xs font-medium text-slate-500">
                                                                {option.name}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {isSelected && <span className="shrink-0 text-sm font-bold text-indigo-600">✓</span>}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {detailsScreen && (
                        <div className="scd-details-enter border-t border-slate-200 px-4 pb-3 pt-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">FG Item Name</p>
                            <p className="mt-1 min-h-[24px] min-w-0 break-words text-base font-bold text-slate-900 [overflow-wrap:anywhere]">{fgItemName}</p>
                        </div>
                    )}
                </div>

                <div className={`flex min-w-0 flex-col gap-2 md:col-span-2 md:w-[78%] md:justify-self-start ${detailsScreen ? "scd-details-enter" : ""}`}>
                    {/* First grid row: Order Type and Unit Selection */}
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order Type</p>
                            <p className="mt-1 min-h-[20px] text-sm font-bold text-slate-900">{ORDER_TYPE_LABEL}</p>
                        </div>
                        {detailsScreen && (
                            <Field label="Unit Selection (MFG Location)" required>
                                <SelectField
                                    value={unit}
                                    onChange={(value) => { setUnit(value); clearInvalidField("unit"); }}
                                    options={unitOptions}
                                    disabled={isReadOnly && !isReleased}
                                    placeholder="Select unit"
                                    invalid={invalidFields.includes("unit")}
                                    shakeKey={shakeAttempt}
                                />
                            </Field>
                        )}
                    </div>

                    {/* Second grid row: Drawing Revision and FG Quantity */}
                    {detailsScreen && (
                        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Drawing Revision</p>
                                <p className="mt-1 min-h-[20px] text-sm font-bold text-slate-900">{drawingRevision || ""}</p>
                            </div>
                            <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">FG Quantity</p>
                                <p className="mt-1 min-h-[20px] text-sm font-bold text-slate-900">{fgQuantity || "0"}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {detailsScreen && (
                <>
                    <div className="scd-details-enter grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Work Order No</p>
                            <p className="mt-1 min-h-[20px] break-words text-sm font-bold text-slate-900">{workOrderNo}</p>
                        </div>
                        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Work Order Date</p>
                            <div className="mt-1 flex min-h-[20px] items-center gap-2">
                                <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                                <p className="text-sm font-bold text-slate-900">{formatDisplayDate(woDate)}</p>
                            </div>
                        </div>
                        <Field label="Proj. Completion Date" required>
                            <DatePickerField
                                key={shakeAttempt}
                                value={completionDate}
                                disabled={isReadOnly && !isReleased}
                                onChange={(value) => { setCompletionDate(value); clearInvalidField("completionDate"); }}
                                min={woDate}
                                invalid={invalidFields.includes("completionDate")}
                                shakeKey={shakeAttempt}
                            />
                        </Field>
                        <Field label="W/O Priority">
                            <SelectField value={priority} onChange={setPriority} options={priorityOptions} disabled={isReadOnly} />
                        </Field>
                        <Field label="Planned Qty" required>
                            <input
                                type="number"
                                min={1}
                                value={plannedQty}
                                disabled={isReadOnly && !isReleased}
                                onChange={(e) => { setPlannedQty(e.target.value); clearInvalidField("plannedQty"); }}
                                placeholder="0"
                                key={shakeAttempt}
                                className={`${inputCls} ${invalidFields.includes("plannedQty") ? "required-field-error !ring-2 !ring-red-100" : ""}`}
                            />
                        </Field>
                        <Field label="Planner" required>
                            <SelectField
                                value={planner}
                                onChange={(value) => { setPlanner(value); clearInvalidField("planner"); }}
                                options={plannerOptions}
                                disabled={isReadOnly}
                                placeholder="Select planner"
                                invalid={invalidFields.includes("planner")}
                                shakeKey={shakeAttempt}
                            />
                        </Field>
                    </div>

                    <Field label="Production Remarks / Directives" className="scd-details-enter">
                        <textarea
                            rows={3}
                            value={remarks}
                            readOnly={isReadOnly}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Add production remarks or directives..."
                            className={`${inputCls} resize-none font-medium`}
                        />
                    </Field>

                    <div className="scd-details-enter flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 md:px-8">
                        {(!isReadOnly || isReleased) && (
                            <button
                                type="button"
                                onClick={handleSchedule}
                                className="rounded-xl bg-amber-400 px-6 py-3 text-[13px] font-extrabold text-slate-900 shadow-sm transition-colors hover:bg-amber-300">
                                {isReleased ? "Save Changes" : isModify ? "Modify" : "Schedule"}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleProceedToRouting}
                            className="flex items-center gap-2 rounded-xl bg-[#1f2937] px-6 py-3 text-[13px] font-extrabold text-white shadow-sm transition-colors hover:bg-[#111827]">
                            Proceed to Routing Stage Planning
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </>
            )}

            {fgItemLoaded && !detailsScreen && (
                <div className="absolute bottom-5 right-6 w-120 rounded-xl border border-slate-200 bg-white p-3 shadow-lg" aria-live="polite">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                        <span>Loading FG item</span>
                        <span className="text-slate-900">{loadingProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-[#211456] transition-[width] duration-60" style={{ width: `${loadingProgress}%` }} />
                    </div>
                </div>
            )}
        </div>
    </>
    );
};

/* ---------- Stage 2: routing ---------- */

const routingStepsFallback = [
    { code: "BB-52-OP010-SFG", subtitle: "Dia 40 mm x L 130 mm", qty: 120, operation: "CUTTING OPERATION", jobCard: "855720-01", machineCode: "CUTTING", machineName: "CUT-01" },
    { code: "BB-52-OP020-SFG", subtitle: "CNC TURNING 2nd OPERATION", qty: 120, operation: "CNC TURNING 2nd OPERATION", jobCard: "855720-02", machineCode: "CNC-TURN", machineName: "CNC-01" },
    { code: "BB-52-OP030-SFG", subtitle: "VMC MILLING 1st OPERATION", qty: 120, operation: "VMC MILLING 1st OPERATION", jobCard: "855720-03", machineCode: "VMC-MILL", machineName: "VMC-01" },
    { code: "BB-52-OP040-SFG", subtitle: "DEBURRING", qty: 120, operation: "DEBURRING", jobCard: "855720-04", machineCode: "DEBURR", machineName: "DBR-01" },
    { code: "BB-52-OP050-SFG", subtitle: "HEAT TREATMENT (OUTSOURCING)", qty: 120, operation: "HEAT TREATMENT (OUTSOURCING)", jobCard: "855720-05", machineCode: "HEAT-TREAT", machineName: "OUT-01" },
    { code: "BB-52-OP060-SFG", subtitle: "CENTERLESS GRINDING 1st OPERATION", qty: 120, operation: "CENTERLESS GRINDING 1st OPERATION", jobCard: "855720-06", machineCode: "CL-GRIND", machineName: "CLG-01" },
    { code: "BB-52-OP070-SFG", subtitle: "HARD CHROME PLATING (OUTSOURCING)", qty: 120, operation: "HARD CHROME PLATING (OUTSOURCING)", jobCard: "855720-07", machineCode: "CHROME", machineName: "HCP-01" },
];

const processTypeOptions = ["In-House", "Inter-Unit", "Sub Con"];

const PROCESS_UNIT_RULES = {
    "In-House": { units: ["Unit-1"], warehouses: { "Unit-1": "QC-U1" } },
    "Inter-Unit": { units: ["Unit-2", "Unit-3"], warehouses: { "Unit-2": "QC-U2", "Unit-3": "QC-U3" } },
    "Sub Con": { units: ["Unit-1"], warehouses: { "Unit-1": "SC-U1" } },
};

const getUnitOptions = (processType) =>
    (PROCESS_UNIT_RULES[processType] ?? PROCESS_UNIT_RULES["In-House"]).units;

const getWarehouse = (processType, unit) =>
    (PROCESS_UNIT_RULES[processType] ?? PROCESS_UNIT_RULES["In-House"]).warehouses[unit] ?? "";

const darkLabelCls = "text-[11px] text-slate-400 block uppercase font-extrabold";
const darkSelectCls = "w-full cursor-pointer rounded-md border border-slate-750 bg-black/20 px-1 py-1 text-[12px] font-semibold text-slate-300 outline-none transition-colors focus:outline-none focus:border-slate-400 [color-scheme:dark]";

const modalLabelCls = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-200";
const modalInputCls =
    "w-full rounded-lg border border-slate-700 bg-[#0f1014] px-3 py-2 text-xs font-semibold text-white outline-none transition-colors placeholder:text-slate-500 hover:border-slate-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-600/60 disabled:text-slate-300 [color-scheme:dark]";

const pad2 = (n) => String(n).padStart(2, "0");

const computeSchedule = (d, qty) => {
    const totalMins = Math.max(0, Math.round((Number(d.settingTime) || 0) + (Number(d.processTime) || 0) * qty));
    const totalTime = `${pad2(Math.floor(totalMins / 60))}:${pad2(totalMins % 60)}`;
    if (!d.startDate || !d.startTime) return { endDate: "", endTime: "", totalTime };
    const end = new Date(new Date(`${d.startDate}T${d.startTime}`).getTime() + totalMins * 60000);
    return {
        endDate: `${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}`,
        endTime: `${pad2(end.getHours())}:${pad2(end.getMinutes())}`,
        totalTime,
    };
};

const RoutingCardField = ({ label, children }) => (
    <div className="min-w-0">
        <span className={darkLabelCls}>{label}</span>
        {children}
    </div>
);

const REQUIRED_ROUTING_DETAIL_FIELDS = ["machineCode", "machineName", "settingTime", "processTime", "startDate", "startTime"];

const ROUTING_DETAIL_FIELDS = [
    { key: "warehouse", label: "Warehouse" },
    { key: "machineCode", label: "Machine Code" },
    { key: "machineName", label: "Machine Name" },
    { key: "settingTime", label: "Setting Time (mins)" },
    { key: "processTime", label: "Process Time (mins)" },
    { key: "startDate", label: "Start Date" },
    { key: "startTime", label: "Start Time" },
    { key: "endDate", label: "End Date" },
    { key: "endTime", label: "End Time" },
    { key: "totalTime", label: "Total Time [HR:MIN]" },
    { key: "remarks", label: "Remarks" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const formatTimeHHMM = (value) => {
    const raw = String(value ?? "").trim();
    const m = raw.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return raw;
    return `${pad2(Number(m[1]))}:${pad2(Number(m[2]))}`;
};

// "YYYY-MM-DD HH:MM" so two moments can be compared as plain strings.
const toMoment = (date, time) => (date ? `${date} ${formatTimeHHMM(time || "00:00")}` : "");

const RoutingStepsGrid = ({ context, onRoutingChange, showToast, isReleased = false, onDetailOpenChange }) => {
    const [routingStepsData, setRoutingStepsData] = useState([]);
    const [routingLoading, setRoutingLoading] = useState(false);
    const [routingError, setRoutingError] = useState("");
    const [jobCardStatuses, setJobCardStatuses] = useState({});

    // Real job card statuses (Open / Released ...) saved by Stock Allocation.
    useEffect(() => {
        const orderNo = String(context?.workOrderNo || "").trim();
        if (!isReleased || !orderNo) { setJobCardStatuses({}); return undefined; }
        let cancelled = false;
        fetch(`/api/stock-order-planning/job-card-status/${encodeURIComponent(orderNo)}`)
            .then((r) => (r.ok ? r.json() : {}))
            .then((data) => { if (!cancelled) setJobCardStatuses(data && typeof data === "object" ? data : {}); })
            .catch(() => { if (!cancelled) setJobCardStatuses({}); });
        return () => { cancelled = true; };
    }, [isReleased, context?.workOrderNo]);

    useEffect(() => {
        let cancelled = false;
        const loadRouting = async () => {
            const fgCode = String(context?.fgItemCode || "").trim();
            if (!fgCode) { setRoutingStepsData([]); return; }
            setRoutingLoading(true);
            setRoutingError("");
            try {
                const rows = await fetchStockRoutingRDBMS(fgCode);
                if (!cancelled) setRoutingStepsData((Array.isArray(rows) ? rows : []).map((row, index) => ({
                    ...row,
                    qty: Number(row.qty || context?.plannedQty || 0),
                    jobCard: `${String(context?.workOrderNo || "").trim().replace(/^WO-ST-/i, "")}-${String(index + 1).padStart(2, "0")}`,
                })));
            } catch (error) {
                if (!cancelled) { setRoutingError("Unable to load routing steps from routing_stocks."); setRoutingStepsData([]); }
            } finally {
                if (!cancelled) setRoutingLoading(false);
            }
        };
        loadRouting();
        return () => { cancelled = true; };
    }, [context?.fgItemCode, context?.plannedQty, context?.workOrderNo]);

    const [selections, setSelections] = useState({});
    const [details, setDetails] = useState({});
    // Always holds the newest details so the next job card can read the previous
    // card's End Date/Time right after a save (before React has re-rendered).
    const detailsRef = useRef({});
    useEffect(() => { detailsRef.current = details; }, [details]);

    // Selected job card + an editable copy of its details.
    const [selectedJobCard, setSelectedJobCard] = useState(null);
    const [detailForm, setDetailForm] = useState({});
    const [saveFeedback, setSaveFeedback] = useState("");
    const [saveFeedbackType, setSaveFeedbackType] = useState("success");
    // 1 = moving forward (slides in from the right), -1 = moving back (from the left)
    const [slideDir, setSlideDir] = useState(1);

    const changeProcessType = (jobCard, processType) => {
        const unit = getUnitOptions(processType)[0];
        const nextSelections = { ...selections, [jobCard]: { ...selections[jobCard], processType, unit } };
        const nextDetails = {
            ...details,
            [jobCard]: { ...details[jobCard], warehouse: getWarehouse(processType, unit) },
        };
        setSelections(nextSelections);
        setDetails(nextDetails);
        onRoutingChange?.({ selections: nextSelections, details: nextDetails });
    };

    const changeUnit = (jobCard, unit) => {
        const processType = selections[jobCard]?.processType ?? "In-House";
        const nextSelections = { ...selections, [jobCard]: { ...selections[jobCard], unit } };
        const nextDetails = {
            ...details,
            [jobCard]: { ...details[jobCard], warehouse: getWarehouse(processType, unit) },
        };
        setSelections(nextSelections);
        setDetails(nextDetails);
        onRoutingChange?.({ selections: nextSelections, details: nextDetails });
    };

    useEffect(() => {
        const saved = context?.routingChanges || {};
        setSelections((prev) => Object.fromEntries(routingStepsData.map((st) => [
            st.jobCard,
            prev[st.jobCard] || saved.selections?.[st.jobCard] || { processType: "In-House", unit: "Unit-1" },
        ])));
        setDetails((prev) => Object.fromEntries(routingStepsData.map((st) => [
            st.jobCard,
            prev[st.jobCard] || saved.details?.[st.jobCard] || {
                warehouse: getWarehouse("In-House", "Unit-1"),
                machineCode: st.machineCode || "", machineName: st.machineName || "", settingTime: "0", processTime: "0",
                startDate: "", startTime: "", endDate: "", endTime: "", remarks: "",
            },
        ])));
    }, [routingStepsData, context?.routingChanges]);

    const selectedStep = routingStepsData.find((st) => st.jobCard === selectedJobCard) || null;
    const selectedIndex = selectedStep ? routingStepsData.findIndex((st) => st.jobCard === selectedStep.jobCard) : -1;
    const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : -1;
    const nextIndex = selectedIndex >= 0 && selectedIndex < routingStepsData.length - 1 ? selectedIndex + 1 : -1;
    const isSecondLast = nextIndex >= 0 && nextIndex === routingStepsData.length - 1;
    const isLastStage = isSecondLast || nextIndex < 0;

    const getStepLabel = (step) => step?.code || step?.subtitle || "Operation";
    const prevLabel = prevIndex >= 0 ? getStepLabel(routingStepsData[prevIndex]) : "";
    const nextLabel = nextIndex >= 0 ? getStepLabel(routingStepsData[nextIndex]) : "";
    const nextSlideLabel = nextIndex < 0
        ? "Last operation"
        : isSecondLast
            ? `Proceed to Last Operation · ${nextLabel}`
            : `Proceed to Next · ${nextLabel}`;

    // Tell the desk whether a job card panel is open (it hides Release / Update / Cancel).
    useEffect(() => {
        onDetailOpenChange?.(Boolean(selectedJobCard));
    }, [selectedJobCard]);
    useEffect(() => () => onDetailOpenChange?.(false), []);

    const closePanel = () => {
        setSelectedJobCard(null);
        setDetailForm({});
        setSaveFeedback("");
    };

    // Opens a job card. Job card N+1 starts when job card N ends (never earlier).
    const openCard = (jobCard, dir = 1, quiet = false) => {
        const idx = routingStepsData.findIndex((st) => st.jobCard === jobCard);
        if (idx < 0) return;
        const base = { ...(detailsRef.current[jobCard] || {}) };
        const prev = idx > 0 ? detailsRef.current[routingStepsData[idx - 1].jobCard] : null;
        if (prev?.endDate && prev?.endTime) {
            const prevEnd = toMoment(prev.endDate, prev.endTime);
            const ownStart = base.startDate ? toMoment(base.startDate, base.startTime) : "";
            if (!ownStart || ownStart < prevEnd) {
                base.startDate = prev.endDate;
                base.startTime = formatTimeHHMM(prev.endTime);
            }
        }
        setSlideDir(dir);
        setSelectedJobCard(jobCard);
        setDetailForm(base);
        setSaveFeedback("");
        if (!quiet) {
            showToast?.(
                "Job Card Selected",
                "info",
                "Complete the required routing details to enable Save Details. Machine code, machine name, setting time, process time, start date, and start time are required."
            );
        }
    };

    const selectCard = (jobCard) => {
        if (jobCard === selectedJobCard) return;
        openCard(jobCard, 1);
    };

    // Close the panel if its job card disappears (e.g. a different FG item was loaded).
    useEffect(() => {
        if (selectedJobCard && !routingStepsData.some((st) => st.jobCard === selectedJobCard)) {
            setSelectedJobCard(null);
            setDetailForm({});
        }
    }, [routingStepsData, selectedJobCard]);

    useEffect(() => {
        if (!selectedJobCard) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape") closePanel();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [selectedJobCard]);

    // End date / end time / total time are always calculated from the form values.
    const schedule = selectedStep ? computeSchedule(detailForm, selectedStep.qty) : { endDate: "", endTime: "", totalTime: "" };
    const liveWarehouse = selectedStep ? (details[selectedStep.jobCard]?.warehouse ?? "") : "";
    const finalDetailForm = { ...detailForm, warehouse: liveWarehouse, endDate: schedule.endDate, endTime: schedule.endTime };
    const detailDirty = Boolean(selectedStep) &&
        JSON.stringify(finalDetailForm) !== JSON.stringify(details[selectedStep.jobCard] || {});
    const missingRequiredDetailFields = selectedStep
        ? REQUIRED_ROUTING_DETAIL_FIELDS.filter((key) => {
            const value = finalDetailForm[key];
            if (value === undefined || value === null || String(value).trim() === "") return true;
            if (key === "settingTime" || key === "processTime") {
                const numericValue = Number(value);
                return !Number.isFinite(numericValue) || numericValue < 0;
            }
            return false;
        })
        : REQUIRED_ROUTING_DETAIL_FIELDS;

    // Start Date cannot be earlier than the previous job card's End Date (or today).
    const prevSaved = prevIndex >= 0 ? details[routingStepsData[prevIndex]?.jobCard] : null;
    const minStartDate = prevSaved?.endDate && prevSaved.endDate > today() ? prevSaved.endDate : today();

    const handleDetailChange = (key, value) => {
        setSaveFeedback("");
        setDetailForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleResetDetails = () => {
        if (!selectedStep) return;
        openCard(selectedStep.jobCard, slideDir, true);
    };

    // Walk forward from fromIdx: any following card whose start is empty or before the
    // previous card's end is moved to start exactly when the previous card ends.
    const chainFollowingDetails = (all, fromIdx) => {
        const out = { ...all };
        for (let j = fromIdx + 1; j < routingStepsData.length; j += 1) {
            const prev = out[routingStepsData[j - 1].jobCard];
            if (!prev?.endDate || !prev?.endTime) break;
            const step = routingStepsData[j];
            const cur = out[step.jobCard] || {};
            const prevEnd = toMoment(prev.endDate, prev.endTime);
            const curStart = cur.startDate ? toMoment(cur.startDate, cur.startTime) : "";
            if (curStart && curStart >= prevEnd) continue;

            const startDate = prev.endDate;
            const startTime = formatTimeHHMM(prev.endTime);
            const hasTimes = (Number(cur.settingTime) || 0) > 0 || (Number(cur.processTime) || 0) > 0;
            const end = hasTimes
                ? computeSchedule({ ...cur, startDate, startTime }, step.qty)
                : { endDate: "", endTime: "" };
            out[step.jobCard] = { ...cur, startDate, startTime, endDate: end.endDate, endTime: end.endTime };
        }
        return out;
    };

    // Returns true when saved (or nothing to save and silentIfClean), false on failure.
    const handleSaveDetails = ({ silentIfClean = false } = {}) => {
        if (!selectedStep) return false;
        if (missingRequiredDetailFields.length > 0) {
            const message = "Complete machine code, machine name, setting time, process time, start date, and start time before saving.";
            setSaveFeedbackType("error");
            setSaveFeedback(message);
            showToast?.("Required Details Missing", "error", message);
            return false;
        }

        // A job card cannot start before the previous job card ends.
        const prev = prevIndex >= 0 ? detailsRef.current[routingStepsData[prevIndex].jobCard] : null;
        if (prev?.endDate && prev?.endTime) {
            const prevEnd = toMoment(prev.endDate, prev.endTime);
            const ownStart = toMoment(finalDetailForm.startDate, finalDetailForm.startTime);
            if (ownStart < prevEnd) {
                const [py, pm, pd] = prevEnd.slice(0, 10).split("-");
                const message = `Start Date/Time must be on or after the previous job card's end (${pd}-${pm}-${py} ${prevEnd.slice(11)}).`;
                setSaveFeedbackType("error");
                setSaveFeedback(message);
                showToast?.("Start Before Previous End", "error", message);
                return false;
            }
        }

        if (!detailDirty) {
            if (silentIfClean) return true;
            const message = `There are no unsaved changes for job card ${selectedStep.jobCard}.`;
            setSaveFeedbackType("info");
            setSaveFeedback(message);
            showToast?.("Nothing to Save", "info", message);
            return true;
        }

        const nextDetails = chainFollowingDetails(
            { ...detailsRef.current, [selectedStep.jobCard]: finalDetailForm },
            selectedIndex
        );
        detailsRef.current = nextDetails;
        setDetails(nextDetails);
        setDetailForm({ ...finalDetailForm });
        onRoutingChange?.({ selections, details: nextDetails });
        const message = `Routing details for job card ${selectedStep.jobCard} were saved.`;
        setSaveFeedbackType("success");
        setSaveFeedback(message);
        showToast?.("Details Saved", "success", message);
        return true;
    };

    // ---- Slide controls ----
    // Next: save first; throw on failure so the control turns red and stays here.
    const handleSlideSave = async () => {
        if (!handleSaveDetails({ silentIfClean: true })) throw new Error("Save failed");
    };
    const handleSlideDone = () => {
        const step = routingStepsData[nextIndex];
        if (step) openCard(step.jobCard, 1, true);
    };
    // Previous: only save when something was edited, so an untouched card never blocks going back.
    const handleSlidePrevSave = async () => {
        if (!detailDirty) return;
        if (!handleSaveDetails({ silentIfClean: true })) throw new Error("Save failed");
    };
    const handleSlidePrevDone = () => {
        const step = routingStepsData[prevIndex];
        if (step) openCard(step.jobCard, -1, true);
    };

    // Optional shortcuts: Alt + Right / Alt + Left move between operations.
    useEffect(() => {
        if (!selectedStep) return undefined;
        const onKey = (e) => {
            if (!e.altKey) return;
            if (e.key === "ArrowRight" && nextIndex >= 0) {
                e.preventDefault();
                if (handleSaveDetails({ silentIfClean: true })) openCard(routingStepsData[nextIndex].jobCard, 1, true);
            } else if (e.key === "ArrowLeft" && prevIndex >= 0) {
                e.preventDefault();
                if (!detailDirty || handleSaveDetails({ silentIfClean: true })) openCard(routingStepsData[prevIndex].jobCard, -1, true);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [selectedStep, nextIndex, prevIndex, detailForm, details, detailDirty, routingStepsData]);

    const renderRoutingCard = (step, stepIndex, isSelected = false, isDisabled = false) => {
        const processType = selections[step.jobCard]?.processType ?? "In-House";
        const unitChoices = getUnitOptions(processType);
        const unitValue = unitChoices.includes(selections[step.jobCard]?.unit)
            ? selections[step.jobCard].unit
            : unitChoices[0];
        // Blank before release. After release: first card Open; a card becomes Released once stock is allocated.
        const status = isReleased
            ? (jobCardStatuses[step.jobCard] || (stepIndex === 0 ? "Open" : ""))
            : "";
        const statusCls = status === "Released"
            ? "border-emerald-900 bg-emerald-950 text-emerald-300"
            : "border-blue-900 bg-blue-950 text-blue-300";

        return (
            <div
                key={step.jobCard}
                role="button"
                aria-pressed={isSelected}
                aria-disabled={isDisabled}
                tabIndex={isDisabled ? -1 : 0}
                onClick={() => { if (!isDisabled) selectCard(step.jobCard); }}
                onKeyDown={(event) => {
                    if (!isDisabled && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        selectCard(step.jobCard);
                    }
                }}
                className={`relative min-w-0 w-full max-w-[300px] overflow-visible rounded-xl border bg-[#1f2229] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isDisabled
                    ? "pointer-events-none cursor-not-allowed border-indigo-300 opacity-45 grayscale"
                    : isSelected
                        ? "z-30 origin-top-left scale-125 cursor-pointer border-indigo-400 shadow-2xl shadow-indigo-950/40"
                        : "cursor-pointer border-slate-400 hover:-translate-y-0.5 hover:border-indigo-300"
                    }`}
            >
                <div className="h-full min-h-[260px] overflow-hidden rounded-xl p-3 pb-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <span className="rounded bg-black/30 px-1 py-0.5 font-mono text-[12.5px] font-extrabold text-slate-200">
                                {step.code}
                            </span>
                            <h5 className="mt-0.5 truncate text-[11px] font-bold leading-snug text-white">
                                {step.subtitle}
                            </h5>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-y-1.5 text-[13px]">
                        <RoutingCardField label="Planned Qty">
                            <span className="block truncate text-[13.5px] font-semibold text-slate-100">{step.qty}</span>
                        </RoutingCardField>

                        {/* Process Type / Unit are only shown after the card is clicked */}
                        {isSelected && (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className={`${darkLabelCls} mb-1`}>Process Type</span>
                                    <select
                                        value={processType}
                                        onChange={(e) => changeProcessType(step.jobCard, e.target.value)}
                                        disabled={isDisabled}
                                        className={darkSelectCls}
                                    >
                                        {processTypeOptions.map((o) => (
                                            <option key={o} value={o} style={{ backgroundColor: "#1f2229", color: "#e2e8f0" }}>{o}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <span className={`${darkLabelCls} mb-1`}>Unit</span>
                                    <select
                                        value={unitValue}
                                        onChange={(e) => changeUnit(step.jobCard, e.target.value)}
                                        disabled={isDisabled || unitChoices.length === 1}
                                        className={`${darkSelectCls} border-sky-700 bg-black/30 disabled:cursor-not-allowed disabled:opacity-80`}
                                    >
                                        {unitChoices.map((o) => (
                                            <option key={o} value={o} style={{ backgroundColor: "#1f2229", color: "#e2e8f0" }}>{o}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <RoutingCardField label="Operation Name">
                            <span className="block truncate text-[13.5px] font-semibold text-slate-100" title={step.operation}>
                                {step.operation}
                            </span>
                        </RoutingCardField>

                        <RoutingCardField label="Job Card No">
                            <span className="block truncate text-[13.5px] font-semibold text-slate-100">{step.jobCard}</span>
                        </RoutingCardField>

                        <RoutingCardField label="Job Card Status">
                            {status ? (
                                <span className={`mt-0.5 inline-block rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusCls}`}>
                                    {status}
                                </span>
                            ) : (
                                <span className="mt-0.5 block h-[26px]" />
                            )}
                        </RoutingCardField>
                    </div>
                </div>
            </div>
        );
    };

    const detailInputCls = "w-full rounded-lg border border-slate-800 bg-black/45 px-3 py-3 text-[15px] text-white placeholder-slate-400 focus:border-slate-600 focus:outline-none read-only:opacity-70 [color-scheme:dark]";

    const detailValue = (key) => {
        if (key === "warehouse") return liveWarehouse;
        if (key === "endDate") return schedule.endDate ?? "";
        if (key === "endTime") return schedule.endTime ?? "";
        if (key === "totalTime") return schedule.totalTime ?? "";
        return detailForm[key] ?? "";
    };

    const detailInputType = (key) => {
        if (key === "startDate" || key === "endDate") return "date";
        if (key === "startTime" || key === "endTime") return "time";
        if (key === "settingTime" || key === "processTime") return "number";
        return "text";
    };

    // When a card is selected, only that card stays in the left column.
    const visibleEntries = routingStepsData
        .map((step, stepIndex) => ({ step, stepIndex }))
        .filter(({ step }) => !selectedStep || step.jobCard === selectedStep.jobCard);

    const detailFields = [
        ...ROUTING_DETAIL_FIELDS.filter((f) => f.key !== "remarks"),
        { key: "nextJobCardNo", label: "Next Job Card No" },
        ...ROUTING_DETAIL_FIELDS.filter((f) => f.key === "remarks"),
    ];

    return (
        <>
            <style>{`
                @keyframes sa-pop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
                .sa-pop { animation: sa-pop 0.3s ease-out backwards; }
                @media (prefers-reduced-motion: reduce) { .sa-pop { animation: none; } }
            `}</style>

            {/* Header row: title when nothing is selected, Previous / Next slide controls when a card is open */}
            <div className="mb-4 flex items-center justify-between gap-3">
                {selectedStep ? (
                    prevIndex < 0 ? (
                        <span aria-hidden="true" />
                    ) : (
                        <SlideCommit
                            key={`prev-${selectedStep.jobCard}`}
                            direction="left"
                            label={`Proceed to Previous · ${prevLabel}`}
                            doneLabel="Done Moving"
                            errorLabel="Try Again"
                            onConfirm={handleSlidePrevSave}
                            onDone={handleSlidePrevDone}
                            trackColor="#28282fff"
                            handleColor="#ffffff"
                            successColor="#22c55e"
                            dangerColor="#e5484d"
                            width={300}
                            height={52}
                            radius={26}
                            speed={50}
                            returnBounce={0.38}
                            landingDip={0.026}
                            holdMs={700}
                            className="sa-pop shadow-md"
                        />
                    )
                ) : (
                    <div className="flex items-center gap-3">
                        <Cpu className="h-7 w-7 text-purple-800" strokeWidth={1.75} />
                        <h3 className="text-[20px] font-extrabold tracking-tight text-slate-800">
                            Manufacturing Routing Steps
                        </h3>
                    </div>
                )}

                {/* Hidden completely on the last operation */}
                {selectedStep && nextIndex >= 0 && (
                    <SlideCommit
                        key={selectedStep.jobCard}
                        label={nextSlideLabel}
                        doneLabel="Saved"
                        errorLabel="Try Again"
                        onConfirm={handleSlideSave}
                        onDone={handleSlideDone}
                        trackColor="#3c3838ff"
                        handleColor="#ffffff"
                        successColor="#22c55e"
                        dangerColor="#e5484d"
                        width={isSecondLast ? 360 : 300}
                        height={52}
                        radius={26}
                        speed={50}
                        returnBounce={0.38}
                        landingDip={0.026}
                        holdMs={700}
                        animateLabel={!isLastStage}
                        className={`${isLastStage ? "" : "sa-pop"} ml-auto shadow-md`}
                    />
                )}
            </div>

            {routingLoading && <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">Loading routing steps from routing_stocks...</div>}
            {routingError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{routingError}</div>}
            {!routingLoading && !routingError && routingStepsData.length === 0 && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">No routing steps found for this FG item.</div>}

            <div
                id="routing-flow-wrapper"
                className={`grid items-start gap-6 overflow-visible ${selectedStep
                    ? "mx-auto w-full grid-cols-1 justify-center justify-items-center lg:grid-cols-[400px_minmax(0,880px)] lg:justify-items-stretch"
                    : "grid-cols-1"
                    }`}
            >
                {/* Left column: all cards, or only the selected card */}
                <motion.div
                    id="routing-card-grid"
                    className={`grid grid-cols-1 gap-4 overflow-visible ${selectedStep
                        ? "relative z-20 mb-24 min-h-[400px] lg:-ml-7 lg:mb-12 lg:mt-35"
                        : "sm:grid-cols-2 lg:grid-cols-5"
                        }`}
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
                    }}
                >
                    <AnimatePresence mode="popLayout" custom={selectedStep ? slideDir : 0}>
                        {visibleEntries.map(({ step, stepIndex }) => (
                            <motion.div
                                key={step.jobCard}
                                className="min-w-0"
                                custom={selectedStep ? slideDir : 0}
                                exit="exit"
                                variants={{
                                    hidden: (dir = 0) => ({
                                        opacity: 0,
                                        x: dir * 90,
                                        y: dir ? 0 : 28,
                                        scale: 0.94,
                                        filter: "blur(4px)",
                                    }),
                                    visible: {
                                        opacity: 1,
                                        x: 0,
                                        y: 0,
                                        scale: 1,
                                        filter: "blur(0px)",
                                        transition: { type: "spring", stiffness: 280, damping: 24, mass: 0.85 },
                                    },
                                    exit: (dir = 0) => ({
                                        opacity: 0,
                                        x: dir * -90,
                                        scale: 0.9,
                                        transition: { duration: 0.25 },
                                    }),
                                }}
                            >
                                {renderRoutingCard(step, stepIndex, step.jobCard === selectedStep?.jobCard, false)}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>

                {/* Right column: wide details pane */}
                <AnimatePresence mode="wait" custom={slideDir}>
                    {selectedStep && (
                        <motion.aside
                            key={selectedStep.jobCard}
                            className="relative z-10 flex min-h-[590px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            aria-label="Selected job card details"
                            custom={slideDir}
                            variants={{
                                enter: (dir) => ({ opacity: 0, x: dir * 120, scale: 0.97 }),
                                center: { opacity: 1, x: 0, scale: 1 },
                                exit: (dir) => ({ opacity: 0, x: dir * -120, scale: 0.97 }),
                            }}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: "spring", stiffness: 320, damping: 30 }}
                        >
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-[16px] font-extrabold text-slate-800">Selected Job Card</h4>
                                    <p className="mt-0.5 text-[13px] text-slate-600">Close this panel to show all job cards again.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closePanel}
                                    aria-label="Close selected job card panel"
                                    title="Show all cards"
                                    className="shrink-0 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                                >
                                    <X className="h-8 w-8 cursor-pointer font-extrabold text-red-600" />
                                </button>
                            </div>

                            <section
                                className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#2f3138ff]"
                                aria-label="Routing card details"
                            >
                                <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-5 py-3">
                                    <div>
                                        <h5 className="text-[16px] font-extrabold text-white">Details</h5>
                                        <p className="mt-0.5 text-[15px] text-slate-100">
                                            {selectedStep.code} , {selectedStep.subtitle}
                                        </p>
                                    </div>
                                    {detailDirty && (
                                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-900">
                                            Unsaved changes
                                        </span>
                                    )}
                                </div>

                                <div className="grid flex-1 grid-cols-1 content-start gap-x-6 gap-y-6 p-5 sm:grid-cols-2 xl:grid-cols-4">
                                    {detailFields.map((field) => {
                                        const readOnly = ["warehouse", "machineCode", "machineName", "endDate", "endTime", "totalTime"].includes(field.key);
                                        const required = REQUIRED_ROUTING_DETAIL_FIELDS.includes(field.key);

                                        if (field.key === "nextJobCardNo") {
                                            // Sits under End Date: the job card that starts when this one ends.
                                            return (
                                                <label key={field.key} className="min-w-0 xl:col-start-4">
                                                    <span className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase text-blue-300">
                                                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                                                        {field.label}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={nextIndex >= 0 ? String(routingStepsData[nextIndex]?.jobCard ?? "") : ""}
                                                        placeholder={nextIndex >= 0 ? "—" : "Last operation"}
                                                        className="w-full cursor-default rounded-lg border-2 border-dashed border-blue-500 bg-blue-600/15 px-3 py-3 font-mono text-[15px] font-extrabold text-blue-100 shadow-[0_0_0_3px_rgba(59,130,246,0.18)] placeholder-blue-300/60 focus:outline-none"
                                                    />
                                                </label>
                                            );
                                        }

                                        if (field.key === "startDate") {
                                            return (
                                                <div key={field.key} className="min-w-0">
                                                    <span className="mb-2 block text-[11px] font-bold uppercase text-slate-300">
                                                        {field.label}
                                                        <span className="ml-1 text-rose-300" aria-hidden="true">*</span>
                                                    </span>
                                                    <DatePickerField
                                                        dark
                                                        value={detailForm.startDate || ""}
                                                        min={minStartDate}
                                                        onChange={(iso) => handleDetailChange("startDate", iso)}
                                                    />
                                                </div>
                                            );
                                        }

                                        return (
                                            <label
                                                key={field.key}
                                                className={`min-w-0 ${field.key === "remarks" ? "sm:col-span-2 xl:col-span-4" : ""}`}
                                            >
                                                <span className="mb-2 block text-[11px] font-bold uppercase text-slate-300">
                                                    {field.label}
                                                    {required && <span className="ml-1 text-rose-300" aria-hidden="true">*</span>}
                                                </span>
                                                <input
                                                    type={detailInputType(field.key)}
                                                    value={detailValue(field.key)}
                                                    placeholder={field.key === "endTime" || field.key === "totalTime" ? "00:00" : undefined}
                                                    readOnly={readOnly}
                                                    required={required}
                                                    min={field.key === "settingTime" || field.key === "processTime" ? "0" : undefined}
                                                    step={field.key === "settingTime" || field.key === "processTime" ? "any" : undefined}
                                                    onChange={(e) => handleDetailChange(field.key, e.target.value)}
                                                    className={`${detailInputCls} [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                                                />
                                            </label>
                                        );
                                    })}
                                </div>

                                {saveFeedback && (
                                    <div
                                        role={saveFeedbackType === "error" ? "alert" : "status"}
                                        className={`mx-4 mb-3 rounded-lg border px-3 py-2 text-sm font-semibold ${saveFeedbackType === "error"
                                            ? "border-rose-300 bg-rose-50 text-rose-700"
                                            : saveFeedbackType === "info"
                                                ? "border-sky-300 bg-sky-50 text-sky-700"
                                                : "border-emerald-300 bg-emerald-50 text-emerald-700"
                                            }`}
                                    >
                                        {saveFeedback}
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 px-4 py-3">
                                    <p className="text-xs text-slate-300" aria-live="polite">
                                        <span className="text-rose-300">*</span> Required. Fill all required fields before saving.
                                    </p>
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={handleResetDetails}
                                            className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSaveDetails()}
                                            disabled={!selectedStep}
                                            title="Save routing details"
                                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                                        >
                                            Save Details
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};

// Click-to-commit control. Click anywhere on it (or press Enter / Space / arrow key)
// and the handle slides to the end by itself, then runs onConfirm.
// onConfirm may be async; if it throws, the track turns red and the handle returns.
function SlideCommit({
    label = "Click to confirm",
    doneLabel = "Done",
    errorLabel = "Try Again",
    onConfirm,
    onDone,
    onError,
    trackColor = "#262626",
    handleColor = "#f5f5f5",
    successColor = "#22c55e",
    dangerColor = "#e5484d",
    width = 280,
    height = 56,
    radius = 28,
    speed = 50, // label shimmer speed, px/second
    returnBounce = 0.38,
    landingDip = 0.026,
    holdMs = 1500,
    disabled = false,
    direction = "right", // 'right' (next) or 'left' (previous)
    animateLabel = true, // false = static label (no shimmer)
    className = "",
}) {
    const isLeft = direction === "left";
    const PAD = 4;
    const handleSize = height - PAD * 2;
    const maxX = Math.max(0, width - handleSize - PAD * 2);

    const x = useMotionValue(0);
    const scale = useMotionValue(1);
    const [status, setStatus] = useState("idle"); // idle | loading | success | error

    const mounted = useRef(true);
    const running = useRef(false); // guards against double clicks
    const callbacks = useRef({});
    callbacks.current = { onConfirm, onDone, onError };

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const handleX = useTransform(x, (v) => (isLeft ? -v : v));
    const fillWidth = useTransform(x, (v) => v + handleSize + PAD * 2);
    const labelOpacity = useTransform(x, [0, maxX * 0.45], [1, 0]);

    const busy = status !== "idle";
    const locked = disabled || busy;
    const safeSet = (s) => { if (mounted.current) setStatus(s); };

    const springBack = () =>
        animate(x, 0, { type: "spring", bounce: returnBounce, duration: 0.55 });

    const commit = async () => {
        if (running.current) return;
        running.current = true;
        setStatus("loading");
        try {
            await animate(x, maxX, { type: "spring", stiffness: 260, damping: 28 });
            animate(scale, [1, 1 - landingDip * 3, 1], { duration: 0.28, ease: "easeOut" });

            if (callbacks.current.onConfirm) await callbacks.current.onConfirm();
            safeSet("success");
            await sleep(holdMs);
            callbacks.current.onDone?.();
        } catch (err) {
            safeSet("error");
            callbacks.current.onError?.(err?.message ?? err);
            await sleep(holdMs);
            if (!mounted.current) return;
            await springBack();
            safeSet("idle");
        } finally {
            running.current = false;
        }
    };

    const handleClick = () => { if (!locked) commit(); };

    const onKeyDown = (e) => {
        if (locked) return;
        if (e.key === "Enter" || e.key === " " || e.key === (isLeft ? "ArrowLeft" : "ArrowRight")) {
            e.preventDefault();
            commit();
        }
    };

    const fillColor =
        status === "success" ? successColor : status === "error" ? dangerColor : "rgba(255,255,255,0.10)";
    const resultText = status === "success" ? doneLabel : status === "error" ? errorLabel : null;

    return (
        <div
            role="button"
            tabIndex={locked ? -1 : 0}
            aria-label={label}
            aria-disabled={locked}
            onClick={handleClick}
            onKeyDown={onKeyDown}
            className={`relative select-none overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${className}`}
            style={{
                width,
                height,
                borderRadius: radius,
                backgroundColor: trackColor,
                opacity: disabled ? 0.45 : 1,
                cursor: locked ? "default" : "pointer",
            }}
        >
            <motion.div
                className="absolute top-0 h-full"
                style={{ width: fillWidth, borderRadius: radius, ...(isLeft ? { right: 0 } : { left: 0 }) }}
                animate={{ backgroundColor: fillColor }}
                transition={{ duration: 0.25 }}
            />

            <motion.div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                style={{
                    opacity: busy ? 0 : labelOpacity,
                    ...(isLeft ? { paddingRight: handleSize } : { paddingLeft: handleSize }),
                }}
            >
                <motion.span
                    className="truncate px-3 text-sm font-semibold"
                    style={
                        animateLabel
                            ? {
                                backgroundImage:
                                    "linear-gradient(90deg, rgba(255,255,255,.35) 0%, rgba(255,255,255,.95) 50%, rgba(255,255,255,.35) 100%)",
                                backgroundSize: "200% 100%",
                                WebkitBackgroundClip: "text",
                                backgroundClip: "text",
                                color: "transparent",
                            }
                            : { color: "rgba(255,255,255,.95)" }
                    }
                    animate={
                        !animateLabel || disabled || busy
                            ? undefined
                            : { backgroundPositionX: ["200%", "-200%"] }
                    }
                    transition={{
                        duration: Math.max(1, width / Math.max(1, speed)),
                        repeat: Infinity,
                        ease: "linear",
                    }}
                >
                    {label}
                </motion.span>
            </motion.div>

            {resultText && (
                <motion.div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-white"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="status"
                >
                    {resultText}
                </motion.div>
            )}
            <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute flex items-center justify-center"
                style={{
                    ...(isLeft ? { right: PAD } : { left: PAD }),
                    top: PAD,
                    width: handleSize,
                    height: handleSize,
                    borderRadius: radius - PAD,
                    backgroundColor: handleColor,
                    color: "#171717",
                    x: handleX,
                    scale,
                    boxShadow: "0 2px 8px rgba(0,0,0,.35)",
                }}
            >
                {status === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
                {status === "success" && <Check className="h-5 w-5" style={{ color: successColor }} />}
                {status === "error" && <X className="h-5 w-5" style={{ color: dangerColor }} />}
                {status === "idle" &&
                    (isLeft ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />)}
            </motion.div>
        </div>
    );
}

const StockOrderConfigurationDesk = ({ onBack, onSaveOrder, showToast, initialOrder, newOrderNo = "" }) => {
    const [activeStep, setActiveStep] = useState(1);
    const stage1Ref = useRef(null);
    const [routingContext, setRoutingContext] = useState(null);
    const [routingChanges, setRoutingChanges] = useState(
        initialOrder?.routingChanges ?? initialOrder?.routing_changes ?? null
    );
    const [routingHasChanges, setRoutingHasChanges] = useState(false);
    // True while a job card panel is open in Routing & Allocation (hides Release / Update / Cancel).
    const [routingDetailOpen, setRoutingDetailOpen] = useState(false);
    const isModify = Boolean(initialOrder?.number);
    const normalizedStatus = String(initialOrder?.status || "").trim().toLowerCase();
    const isReleased = normalizedStatus === "released";
    const isCancelled = normalizedStatus === "cancelled" || normalizedStatus === "canceled";
    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const handleRelease = async () => {
        // A cancelled stock order must never be released again from modify mode.
        if (isCancelled) return;
        const order = stage1Ref.current?.getDraft();
        if (!order) return;

        const saved = await onSaveOrder?.({ ...order, status: "Released", routingChanges });
        if (saved) onBack();
    };

    const handleCancelWorkOrder = () => {
        if (!isReleased || !initialOrder?.number) return;
        setShowCancelConfirmation(true);
    };

    const handleConfirmCancelWorkOrder = async () => {
        if (!isReleased || !initialOrder?.number || isCancelling) return;

        setIsCancelling(true);
        try {
            const saved = await onSaveOrder?.({ ...initialOrder, status: "Cancelled" });
            if (saved) {
                setShowCancelConfirmation(false);
                onBack();
            }
        } catch (error) {
            console.error("Failed to cancel stock order:", error);
        } finally {
            setIsCancelling(false);
        }
    };

    // Saves Stage 1 edits on an already Released order and keeps it Released.
    const handleUpdateWorkOrder = async () => {
        // Update is available only after a real change is made in Routing & Allocation.
        if (!isReleased || !initialOrder?.number || !routingHasChanges) return;
        const order = stage1Ref.current?.getDraft();
        if (!order) return;

        const saved = await onSaveOrder?.({
            ...order,
            status: "Released",
            routingChanges,
        });
        if (saved) onBack();
    };

    const title = useTypewriter(isModify ? "Modify Stock Order Planning" : "Create Stock Order Planning", true);
    const routingTitle = useTypewriter("Manufacturing Routing", activeStep === 2, 42);

    return (
        <div className="min-h-full bg-slate-50 p-1">
            <style>{`
                @keyframes scd-fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
                @keyframes scd-route-enter {
                    from { opacity: 0; transform: translateX(28px) scale(0.99); filter: blur(2px) }
                    to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0) }
                }
                @keyframes scd-details-enter {
                    from { opacity: 0; transform: translateY(12px); filter: blur(2px) }
                    to { opacity: 1; transform: translateY(0); filter: blur(0) }
                }
                @keyframes scd-caret { 50% { opacity: 0 } }
                .scd-fade { animation: scd-fade 450ms ease-out both }
                .scd-route-enter { animation: scd-route-enter 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both }
                .scd-details-enter { animation: scd-details-enter 560ms cubic-bezier(0.2, 0.8, 0.2, 1) both }
                .scd-caret { animation: scd-caret 800ms steps(1) infinite }
                @media (prefers-reduced-motion: reduce) {
                    .scd-fade, .scd-route-enter, .scd-details-enter, .scd-caret { animation: none }
                }
            `}</style>

            <>
                <div className="relative flex w-full flex-wrap items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm md:px-7 md:py-6">
                    <div>
                        <nav className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-slate-500">
                            <span className="scd-fade">Stock Order Planning</span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            <span className="scd-fade" style={{ animationDelay: "120ms" }}>
                                Stock Orders
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            <span
                                className="scd-fade font-bold text-slate-900"
                                style={{ animationDelay: "240ms" }}>
                                Planning Configuration Desk
                            </span>
                            {activeStep === 2 && (
                                <>
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="scd-fade font-bold text-purple-800">Routing &amp; Allocation</span>
                                </>
                            )}
                        </nav>

                        <h1 className="min-h-[42px] whitespace-nowrap text-[32px] font-extrabold tracking-[-0.02em] text-gray-950">
                            {title.shown}
                            {!title.done && <span className="scd-caret ml-0.5 text-purple-800">|</span>}
                        </h1>
                    </div>

                    {title.done && (
                        <div className="scd-fade flex flex-wrap items-center gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    if (activeStep === 2) {
                                        setActiveStep(1);
                                        return;
                                    }
                                    // Existing orders opened from the eye button must keep
                                    // their current status when returning to the main page.
                                    if (!isModify) {
                                        const draft = stage1Ref.current?.getDraft();
                                        if (draft) onSaveOrder?.(draft);
                                    }
                                    onBack();
                                }}
                                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-300 px-3 py-3 text-[13px] font-bold text-slate-700 transition-colors hover:bg-slate-100">
                                <Undo2 className="h-6 w-6" />
                            </button>

                            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                                {configSteps.map((s, i) => {
                                    const active = activeStep === s.id;
                                    return (
                                        <React.Fragment key={s.id}>
                                            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
                                            <button
                                                type="button"
                                                disabled={activeStep === 1 && s.id === 2}
                                                aria-disabled={activeStep === 1 && s.id === 2}
                                                onClick={() => {
                                                    if (!(activeStep === 1 && s.id === 2)) {
                                                        setActiveStep(s.id);
                                                    }
                                                }}
                                                className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all ${active
                                                    ? "border border-slate-200 bg-white text-purple-900 shadow-sm"
                                                    : activeStep === 1 && s.id === 2
                                                        ? "cursor-not-allowed text-slate-300 opacity-60"
                                                        : "text-slate-500 hover:text-slate-700"
                                                    }`}>
                                                <span
                                                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${active
                                                        ? "bg-purple-800 text-white"
                                                        : "bg-slate-200 text-slate-600"
                                                        }`}>
                                                    {s.id}
                                                </span>
                                                {s.label}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {title.done && (
                    <div
                        className={`${activeStep === 1 ? "scd-fade" : "hidden"} relative z-20 mt-4 overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm`}
                        aria-hidden={activeStep !== 1}
                    >
                        <div className="rounded-t-2xl bg-[#111527] px-8 py-7">
                            <h2 className="text-[26px] font-extrabold tracking-[-0.01em] text-white">
                                {isModify ? "Modify Stock Order Master Planning & Configuration" : "Stage 1: Stock Order Master Planning & Configuration"}
                            </h2>
                            <p className="mt-1 text-sm font-medium text-slate-400">Integrated Live Database</p>
                        </div>
                        <Stage1Form
                            apiRef={stage1Ref}
                            initialOrder={initialOrder}
                            newOrderNo={newOrderNo}
                            isModify={isModify}
                            isReadOnly={isReleased || isCancelled}
                            isReleased={isReleased}
                            onProceed={(data) => { setRoutingContext(data); setActiveStep(2); }}
                            onSchedule={async (order) => {
                                const saved = await onSaveOrder?.(order);
                                if (saved) onBack();
                            }}
                        /></div>)}

                {title.done && activeStep === 2 && (
                    <div className="scd-route-enter mt-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#55575e] px-8 py-6 shadow-sm">
                            {/* Left Header Title */}
                            <div>
                                <span className="inline-block rounded-md border border-white/25 bg-white/10 px-3 py-1 text-[17px] font-extrabold text-white">
                                    Stage 2 of 2
                                </span>
                                <h2
                                    className="mt-1 min-h-[41px] text-[34px] font-extrabold leading-tight tracking-[-0.02em] text-white"
                                    aria-live="polite">
                                    {routingTitle.shown}
                                    {!routingTitle.done && <span className="scd-caret ml-1 text-white">|</span>}
                                </h2>
                                <p className="mt-1 text-sm font-medium text-slate-200">Integrated Live Database</p>
                            </div>

                            {/* Right Action Block: hanging cards for Release / Update + Cancel / Cancelled states.
                                Hidden while a job card panel is open. */}
                            {!routingDetailOpen && (
                                <div className="flex items-start justify-end gap-5">
                                    {isReleased ? (
                                        <>
                                            {/* HANGING CANCEL CARD (Released order: mark as Cancelled) */}
                                            <div className="relative pt-5">
                                                <button
                                                    type="button"
                                                    onClick={handleCancelWorkOrder}
                                                    className="group relative z-10 flex h-[125px] w-[270px] flex-col justify-between rounded-xl border border-rose-200 bg-white px-5 py-4 text-left shadow-lg transition-all duration-300 ease-out origin-top hover:-translate-y-1 hover:rotate-[0deg] hover:scale-[1.02] hover:shadow-xl cursor-pointer"
                                                    title="Cancel Released Work Order">
                                                    <div>
                                                        <h2 className="text-[19px] font-extrabold tracking-tight text-rose-700 transition-transform duration-300 group-hover:scale-[1.02] origin-left">
                                                            Cancel Work Order
                                                        </h2>
                                                        <p className="mt-1 text-[12px] font-semibold text-slate-500 leading-relaxed">
                                                            Released Order: <span className="font-bold text-slate-800">{initialOrder?.number}</span>
                                                        </p>
                                                    </div>

                                                    <span className="text-[12px] font-bold text-rose-600 group-hover:text-rose-700 transition-colors flex items-center gap-1">
                                                        ✕ Cancel Released Work Order
                                                    </span>
                                                </button>
                                            </div>
                                            {/* Compact blue Update button vertically centered beside the Cancel Work Order card */}
                                            <div className="relative flex h-[164px] items-center pt-6">
                                                <button
                                                    type="button"
                                                    onClick={handleUpdateWorkOrder}
                                                    disabled={!routingHasChanges}
                                                    title={routingHasChanges ? "Update released work order with routing changes" : "Change something in Routing & Allocation to enable Update"}
                                                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition-colors ${routingHasChanges ? "cursor-pointer bg-[#2786d1] hover:bg-[#1976bd]" : "cursor-not-allowed bg-[#2786d1]/60"}`}
                                                >
                                                    <FileCheck className="h-4 w-4" />
                                                    Update
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="relative pt-6">

                                            {isCancelled ? (
                                                /* CANCELLED ORDER: show status only; do not offer release */
                                                <div
                                                    className="relative z-10 flex h-[140px] w-[270px] flex-col justify-between rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-left shadow-sm"
                                                    role="status"
                                                    aria-label="Stock order cancelled">
                                                    <div>
                                                        <h2 className="text-[19px] font-extrabold tracking-tight text-rose-700">
                                                            Stock Order Cancelled
                                                        </h2>
                                                        <p className="mt-1 text-[13px] font-semibold text-slate-600 leading-relaxed">
                                                            This order cannot be released again.
                                                        </p>
                                                    </div>
                                                    <span className="text-[12px] font-bold text-rose-600">
                                                        ✕ Release unavailable
                                                    </span>
                                                </div>
                                            ) : (
                                                /* HANGING RELEASE CARD (When Creating / Planning New Stock Order) */
                                                <button
                                                    type="button"
                                                    onClick={handleRelease}
                                                    className="group relative z-10 flex h-[140px] w-[270px] flex-col justify-between rounded-xl border border-sky-200 bg-white px-5 py-4 text-left shadow-lg transition-all duration-300 ease-out origin-top hover:-translate-y-1 hover:rotate-[0deg] hover:scale-[1.02] hover:shadow-xl cursor-pointer"
                                                    title="Release Stock Order to Shop Floor">

                                                    <div>
                                                        <h2 className="text-[22px] font-extrabold tracking-tight text-sky-700 transition-transform duration-300 group-hover:scale-[1.02] origin-left">
                                                            Release Stock Order
                                                        </h2>
                                                        <p className="mt-1 text-[15px] font-semibold text-slate-500 leading-relaxed">
                                                            Ready to deploy to shop floor
                                                        </p>
                                                    </div>

                                                    <span className="text-[12px] font-bold text-sky-600 group-hover:text-sky-700 transition-colors flex items-center gap-1">
                                                        ✓ Release Order to Shop Floor
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="px-6 py-5">
                                <RoutingStepsGrid
                                    isReleased={isReleased}
                                    context={routingContext}
                                    showToast={showToast}
                                    onDetailOpenChange={setRoutingDetailOpen}
                                    onRoutingChange={(changes) => { setRoutingChanges(changes); setRoutingHasChanges(true); }}
                                />
                            </div>
                        </div>
                    </div>
                )}</>
            {showCancelConfirmation && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="stock-order-cancel-title"
                >
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/60 cursor-default"
                        aria-label="Close cancellation confirmation"
                        onClick={() => {
                            if (!isCancelling) setShowCancelConfirmation(false);
                        }}
                    />
                    <div className="relative w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
                        <h2
                            id="stock-order-cancel-title"
                            className="text-xl font-extrabold text-rose-700"
                        >
                            Cancel Stock Order?
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                            Are you sure you want to cancel stock order{' '}
                            <span className="font-bold text-slate-900">
                                #{initialOrder?.number}
                            </span>
                            ? This will mark it as Cancelled in Stock Orders.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowCancelConfirmation(false)}
                                disabled={isCancelling}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                No
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCancelWorkOrder}
                                disabled={isCancelling}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isCancelling ? 'Cancelling…' : 'Yes, Cancel Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StockOrderPlanning = () => {
    const [view, setView] = useState("main");
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modifyOrder, setModifyOrder] = useState(null);
    const [newOrderNo, setNewOrderNo] = useState("");

    // Your existing toast system
    const { toasts, showToast, removeToast } = useToasts();

    const openModifyOrder = (order) => {
        setModifyOrder(order);
        setView("config");
        showToast(
            "Modify Stock Order",
            "info",
            `Opening stock order ${order.number} in modify mode.`
        );
    };

    // Load existing stock orders from PostgreSQL when the page opens
    useEffect(() => {
        let cancelled = false;

        const loadOrders = async () => {
            setLoading(true);
            try {
                const rows = await fetchStockOrdersRDBMS();
                if (!cancelled) {
                    setOrders(Array.isArray(rows) ? rows : []);
                }
            } catch (err) {
                console.error("Failed to load stock orders:", err);
                if (!cancelled) setOrders([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadOrders();
        return () => {
            cancelled = true;
        };
    }, []);

    // Refresh stock orders from the database without leaving the table.
    const refreshOrders = async () => {
        if (refreshing) return;

        setRefreshing(true);
        try {
            const rows = await fetchStockOrdersRDBMS();
            setOrders(Array.isArray(rows) ? rows : []);
            showToast("Stock Orders Refreshed", "success", "Stock orders have been refreshed from the database.");
        } catch (err) {
            console.error("Failed to refresh stock orders:", err);
            showToast(
                "Refresh Failed",
                "error",
                err instanceof Error ? err.message : "Could not refresh stock orders. Please try again."
            );
        } finally {
            setRefreshing(false);
        }
    };

    // Save to database + update local state + show toast
    const saveOrder = async (order) => {
        const payload = {
            number: order.number,
            stock_order_no: order.number,
            creation_date: order.created,
            item_code: order.itemCode,
            item_description: order.itemDescription,
            planned_qty: order.plannedQty === "-" ? 0 : Number(order.plannedQty) || 0,
            order_type: order.orderType,
            unit: order.unit === "-" ? "" : order.unit,
            completion_date: order.completionDate || null,
            drawing_revision: order.drawingRevision || null,
            fg_quantity: order.fgQuantity === "" || order.fgQuantity == null ? null : Number(order.fgQuantity) || 0,
            planner: order.planner || null,
            priority: order.priority || null,
            remarks: order.remarks || null,
            status: order.status,
            routingChanges: order.routingChanges ?? order.routing_changes ?? null,
        };

        try {
            const result = await saveStockPlanningRDBMS(payload);

            if (result) {
                setOrders((prev) => [
                    order,
                    ...prev.filter((o) => o.number !== order.number),
                ]);

                if (order.status === "Planned") {
                    showToast(
                        "Stock Order Planned",
                        "success",
                        `Order ${order.number} has been planned successfully.`
                    );
                } else if (order.status === "Draft") {
                    showToast(
                        "Draft Saved",
                        "success",
                        `Draft ${order.number} has been saved.`
                    );
                } else {
                    showToast(
                        "Order Saved",
                        "success",
                        `Order ${order.number} has been saved.`
                    );
                }
                return true;
            }

            showToast(
                "Save Failed",
                "error",
                "Could not save the stock order. Please try again."
            );
            return false;
        } catch (err) {
            console.error("Error saving stock order:", err);
            showToast(
                "Error",
                "error",
                "Something went wrong while saving. Check the console."
            );
            return false;
        }
    };

    const deleteOrder = async (number) => {
        try {
            const deleted = await deleteStockOrderRDBMS(number);
            if (!deleted) {
                showToast("Delete Failed", "error", `Stock order ${number} was not deleted from the database.`);
                return;
            }

            setOrders((prev) => prev.filter((o) => o.number !== number));
            showToast("Order Removed", "success", `Stock order ${number} was deleted permanently.`);
        } catch (error) {
            console.error("Failed to delete stock order:", error);
            showToast(
                "Delete Failed",
                "error",
                error instanceof Error ? error.message : "Could not delete the stock order from PostgreSQL."
            );
        }
    };

    if (view === "config") {
        return (
            <>
                <StockOrderConfigurationDesk
                    onBack={() => { setModifyOrder(null); setNewOrderNo(""); setView("main"); }}
                    onSaveOrder={saveOrder}
                    showToast={showToast}
                    initialOrder={modifyOrder}
                    newOrderNo={newOrderNo}
                />
                <Toast toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    return (
        <div className="h-full bg-slate-50">
            <div className="w-full px-1 pt-1">
                <div
                    className="relative w-full rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm md:px-7 md:py-6"
                    id="page-heading-card"
                >
                    <nav
                        className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500"
                        id="breadcrumb-trail"
                    >
                        <span className="text-[18px] text-slate-600">PPC</span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                        <span className="text-[18px] text-slate-600">Stock Order Planning</span>
                    </nav>
                    <div className="flex items-center">
                        <h1 className="whitespace-nowrap font-sans text-[28px] font-extrabold tracking-[-0.02em] text-gray-950">
                            Make to Stock Management Console
                        </h1>
                    </div>
                </div>
            </div>

            <div className="grid w-full grid-cols-1 items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="mt-6 flex min-w-0 flex-col gap-4">
                    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="group relative h-[205px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 p-6 text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:border-slate-300">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
                                        Total Stock Orders
                                    </p>
                                    <p className="mt-4 text-6xl font-light tracking-tight text-slate-800">
                                        {orders.length}
                                    </p>
                                </div>
                                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-transform duration-300 group-hover:rotate-12 group-hover:bg-white group-hover:shadow-sm">
                                    <ArrowDown className="h-4 w-4 rotate-[-45deg]" />
                                </span>
                            </div>
                        </div>
                        <div className="group relative h-[205px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 p-6 text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:border-slate-300">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
                                        Released Stock Orders
                                    </p>
                                    <p className="mt-4 text-6xl font-light tracking-tight text-slate-800">
                                        {orders.filter((o) => o.status === "Released").length}
                                    </p>
                                </div>
                                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-transform duration-300 group-hover:rotate-12 group-hover:bg-white group-hover:shadow-sm">
                                    <ArrowDown className="h-4 w-4 rotate-[-45deg]" />
                                </span>
                            </div>
                            <div className="absolute bottom-5 left-6 flex items-center gap-2">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 text-slate-500 text-xs">↗</span>
                                <span className="text-xs font-bold text-slate-500">Released Orders</span></div>
                        </div>
                    </div>
                    <div className="grid w-410 grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="min-w-0 md:col-span-1">
                            <StockOrderChart />
                        </div>
                        <div className="w-200 md:col-span-1">
                            <ChartPieInteractive />
                        </div></div></div>
                <div className="relative flex justify-end pt-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-0 flex flex-col items-center">
                        <div className="h-1.5 w-16 rounded-full bg-slate-700 shadow-sm" />
                        <div className="mt-[-3px] h-3 w-3 rounded-full bg-slate-800 border-2 border-slate-500 shadow" />
                        <div className="h-8 w-[3px] bg-gradient-to-b from-slate-700 to-slate-500 rounded-full" /></div>
                    <button
                        type="button"
                        onClick={async () => {
                            const nextNo = await getNextStockOrderNo();
                            if (!nextNo) {
                                showToast(
                                    "Stock Order Number Failed",
                                    "error",
                                    "Could not get the next stock order number from the server."
                                );
                                return;
                            }
                            setNewOrderNo(nextNo);
                            setModifyOrder(null);
                            setView("config");
                        }}
                        className="group relative z-10 flex h-[176px] w-full flex-col justify-between rounded-xl border border-slate-200 bg-white px-6 py-6 text-left shadow-lg transition-all duration-300 ease-out rotate-[2.5deg] origin-top hover:-translate-y-1 hover:rotate-[1deg] hover:scale-[1.02] hover:shadow-xl cursor-pointer"
                        title="Open Stock Order Console">
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-slate-200 border border-slate-400 shadow-inner" />
                        <h2 className="mt-1 text-[28px] font-extrabold tracking-tight text-slate-900 transition-transform duration-300 group-hover:scale-[1.02] origin-left">
                            Stock Orders
                        </h2>
                        <p className="mt-2 text-[13px] font-bold text-slate-500 leading-relaxed">
                            Manage Make-to-Stock (MTS) Stock Orders
                            <br />
                            <span className="text-indigo-500 group-hover:text-indigo-600 transition-colors">
                                + Add New Stock Order
                            </span>
                        </p>
                    </button>
                </div>
            </div>
            <div className="mt-6 pb-6">
                {loading ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                        Loading stock orders…
                    </div>
                ) : (
                    <StockOrdersTable orders={orders} onDelete={deleteOrder} onView={openModifyOrder} onRefresh={refreshOrders} refreshing={refreshing} />
                )}
            </div>
            <Toast toasts={toasts} removeToast={removeToast} />
        </div>
    );
};
export default StockOrderPlanning;