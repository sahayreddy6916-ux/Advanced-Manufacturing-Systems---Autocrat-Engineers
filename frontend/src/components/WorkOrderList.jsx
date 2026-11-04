import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  RefreshCw,
  FolderOpen,
  TrendingUp,
  Calendar,
  ArrowDown,
} from 'lucide-react';
import { formatDate } from './formatDate';
import { fetchWorkOrdersRDBMS, deleteWorkOrderRDBMS } from '../api';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

// All three UI imports point to the same folder (src/Charts/ui).
// If your folder is src/components/ui instead, replace "@/Charts/ui" with "@/components/ui" in all three.
import { Button } from "@/Charts/ui/button";
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/Charts/ui/chart";

function getWorkOrderDateTimestamp(value) {
  if (!value) return 0;

  const dateValue = String(value).trim();
  const ddmmyyyy = dateValue.match(/^(\d{2})-(\d{2})-(\d{4})/);

  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const timePart = dateValue.slice(10);

    if (timePart) {
      const timestampWithTime = new Date(
        `${year}-${month}-${day}${timePart}`
      ).getTime();
      if (!Number.isNaN(timestampWithTime)) return timestampWithTime;
    }

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).getTime();
  }

  const timestamp = new Date(dateValue).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getStatusSortRank(status) {
  return status === 'Cancelled' ? 1 : 0;
}

function getLatestWorkOrderTimestamp(order) {
  const record = order;
  const timestampFields = [
    record.updatedAt,
    record.updatedDate,
    record.lastUpdated,
    record.modifiedAt,
    record.modifiedDate,
    record.createdAt,
    record.createDate,
    record.workOrderDate,
  ];

  for (const field of timestampFields) {
    const timestamp = getWorkOrderDateTimestamp(
      typeof field === 'string' || field instanceof Date ? String(field) : null
    );
    if (timestamp > 0) return timestamp;
  }

  return 0;
}

const pages = [
  {
    label: "January - June 2024",
    data: [
      { month: "January", desktop: 186 },
      { month: "February", desktop: 305 },
      { month: "March", desktop: 237 },
      { month: "April", desktop: 73 },
      { month: "May", desktop: 209 },
      { month: "June", desktop: 214 },
    ],
  },
  {
    label: "July - December 2024",
    data: [
      { month: "July", desktop: 254 },
      { month: "August", desktop: 190 },
      { month: "September", desktop: 320 },
      { month: "October", desktop: 275 },
      { month: "November", desktop: 168 },
      { month: "December", desktop: 342 },
    ],
  },
];

const BAR_COLOR = "#292a26bd";

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "#ececec",
  },
};

// Radar chart now covers all 12 months (January - December)
const radarChartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 273 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
  { month: "July", desktop: 254 },
  { month: "August", desktop: 190 },
  { month: "September", desktop: 320 },
  { month: "October", desktop: 275 },
  { month: "November", desktop: 168 },
  { month: "December", desktop: 342 },
];

const radarChartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
};

const STATUS_PILL_STYLES = {
  Draft: 'bg-slate-100 text-slate-600',
  Planned: 'bg-orange-100 text-orange-700',
  Released: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-rose-100 text-rose-700',
};

const getStatusPillClass = (status) =>
  STATUS_PILL_STYLES[status] ?? 'bg-slate-100 text-slate-600';

export default function WorkOrderList({
  onAddNew,
  onEditWorkOrder,
  onRefreshNeeded,
  refreshKey = 0
}) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const currentChartPage = pages[pageIndex];
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [statusFilter, setStatusFilter] = useState('All');
  const [unitFilter, setUnitFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const loadWorkOrders = async () => {
    setLoading(true);
    const data = await fetchWorkOrdersRDBMS();
    const normalizedData = data.map(order => ({
      ...order,
      displayStatus: order.status || 'Draft',
    }));
    const sortedData = [...normalizedData].sort((a, b) => {
      const statusOrder =
        getStatusSortRank(a.status) - getStatusSortRank(b.status);
      if (statusOrder !== 0) return statusOrder;

      const newestFirst =
        getLatestWorkOrderTimestamp(b) - getLatestWorkOrderTimestamp(a);

      return newestFirst;
    });
    setWorkOrders(sortedData);
    setCurrentPage(1);
    setLoading(false);
  };

  useEffect(() => {
    loadWorkOrders();
  }, [refreshKey]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target)
      ) {
        setShowFilters(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDelete = async (woNo, e) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete Work Order ${woNo} from the database?`)) {
      const success = await deleteWorkOrderRDBMS(woNo);
      if (success) {
        setWorkOrders(prev => prev.filter(item => item.workOrderNo !== woNo));
        if (onRefreshNeeded) onRefreshNeeded();
      }
    }
  };

  const filteredOrders = workOrders.filter(order => {
    const matchesSearch =
      order.workOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.itemName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || order.displayStatus === statusFilter;

    const matchesUnit =
      unitFilter === "All" || order.unit === unitFilter;

    return matchesSearch && matchesStatus && matchesUnit;
  });

  const totalCount = filteredOrders.length;
  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + rowsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const totalWorkOrders = workOrders.length;
  const draftCount = workOrders.filter(order => order.displayStatus === 'Draft').length;
  const plannedCount = workOrders.filter(order => order.displayStatus === 'Planned').length;
  const releasedCount = workOrders.filter(order => order.displayStatus === 'Released').length;
  const cancelledCount = workOrders.filter(order => order.displayStatus === 'Cancelled').length;

  const getKpiShare = (count) =>
    totalWorkOrders > 0 ? Math.round((count / totalWorkOrders) * 100) : 0;

  const statusTabs = [
    { label: 'All', value: 'All', count: totalWorkOrders },
    { label: 'Draft', value: 'Draft', count: draftCount },
    { label: 'Planned', value: 'Planned', count: plannedCount },
    { label: 'Released', value: 'Released', count: releasedCount },
    { label: 'Cancelled', value: 'Cancelled', count: cancelledCount },
  ];

  return (
    <div className="space-y-6" id="work-order-dashboard-list">
      <div
        className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-5"
        id="work-order-kpi-summary"
      >
        <div className="group relative h-[205px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 p-6 text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:border-slate-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
                Total Work Orders
              </p>
              <p className="mt-4 text-6xl font-light tracking-tight text-slate-800">
                {totalWorkOrders.toLocaleString()}
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
                Planned Work Orders
              </p>
              <p className="mt-4 text-6xl font-light tracking-tight text-slate-800">
                {plannedCount.toLocaleString()}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-transform duration-300 group-hover:rotate-12 group-hover:bg-white group-hover:shadow-sm">
              <ArrowDown className="h-4 w-4 rotate-[-45deg]" />
            </span>
          </div>
          <div className="absolute bottom-5 left-6 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 text-slate-500 text-xs">↗</span>
            <span className="text-xs font-bold text-slate-500">
              {getKpiShare(plannedCount)}% of total
            </span>
          </div>
        </div>

        <div className="group relative h-[205px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 p-6 text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:border-slate-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
                Released Work Orders
              </p>
              <p className="mt-4 text-6xl font-light tracking-tight text-slate-800">
                {releasedCount.toLocaleString()}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-transform duration-300 group-hover:rotate-12 group-hover:bg-white group-hover:shadow-sm">
              <ArrowDown className="h-4 w-4 rotate-[-45deg]" />
            </span>
          </div>
          <div className="absolute bottom-5 left-6 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 text-slate-500 text-xs">↗</span>
            <span className="text-xs font-bold text-slate-500">
              {getKpiShare(releasedCount)}% of total
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="col-span-1 sm:col-span-2 xl:col-span-2">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="grid gap-1.5">
                  <CardTitle>Bar Chart - Label</CardTitle>
                  <CardDescription>{currentChartPage.label}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                    disabled={pageIndex === 0}
                    aria-label="Previous months"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setPageIndex((i) => Math.min(pages.length - 1, i + 1))
                    }
                    disabled={pageIndex === pages.length - 1}
                    aria-label="Next months"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="min-w-[255px]">
                <BarChart
                  data={currentChartPage.data}
                  margin={{ top: 20 }}
                >
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
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="desktop" fill={BAR_COLOR} radius={8}>
                    <LabelList
                      position="top"
                      offset={12}
                      className="fill-foreground"
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-1 sm:col-span-2 xl:col-span-2">
          <Card>
            <CardHeader className="items-center">
              <CardTitle>Radar Chart - Dots</CardTitle>
              <CardDescription>
                Showing total visitors for January - December 2024
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-0">
              <ChartContainer
                config={radarChartConfig}
                className="mx-auto aspect-square max-h-[410px]"
              >
                <RadarChart data={radarChartData}>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <PolarAngleAxis
                    dataKey="month"
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <PolarGrid />
                  <Radar
                    dataKey="desktop"
                    fill="var(--color-desktop)"
                    fillOpacity={0.6}
                    dot={{ r: 4, fillOpacity: 1 }}
                  />
                </RadarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 leading-none font-medium">
                Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 leading-none text-muted-foreground">
                January - December 2024
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div
        className="bg-white rounded-2xl border border-slate-100 shadow-sm"
        id="autocrat-table-container"
      >
        <div className="flex flex-col gap-4 px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-800">Work Orders</h2>
              <span className="inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1">
                {totalCount}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadWorkOrders}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-2.5 py-2 rounded-lg transition-colors cursor-pointer"
                title="Refresh database table"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 w-9 h-9 rounded-lg transition-colors cursor-pointer"
                  title="Filters"
                >
                  <Filter className="w-4 h-4" />
                </button>

                {showFilters && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-50">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">
                      Filter Database Records
                    </h3>

                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Unit
                      </label>

                      <select
                        value={unitFilter}
                        onChange={(e) => setUnitFilter(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="All">All Units</option>
                        <option value="Unit-1">Unit-1</option>
                        <option value="Unit-2">Unit-2</option>
                        <option value="Unit-3">Unit-3</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-1 bg-slate-50 rounded-xl p-1">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${statusFilter === tab.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {tab.label}
                  <span
                    className={`text-[11px] font-bold ${statusFilter === tab.value ? 'text-slate-900' : 'text-slate-400'
                      }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search work orders..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-800 placeholder-slate-400"
                id="search-work-orders"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="px-6 py-3.5 text-[11px] font-semibold tracking-wide uppercase text-slate-400">WorkOrder Number</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold tracking-wide uppercase text-slate-400">Creation Date</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold tracking-wide uppercase text-slate-400">Item Code</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold tracking-wide uppercase text-slate-400">Item Description</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold tracking-wide uppercase text-slate-400">Planned Qty</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold tracking-wide uppercase text-slate-400">Order Type</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold tracking-wide uppercase text-slate-400">Unit</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold tracking-wide uppercase text-slate-400">Status</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold tracking-wide uppercase text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-7 h-7 text-slate-300 animate-spin" />
                      <span className="font-semibold text-slate-500">Loading Work Orders from Database...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderOpen className="w-9 h-9 text-slate-300" />
                      <span className="font-semibold text-slate-500">No Sale orders matching database criteria</span>
                      <p className="text-xs text-slate-400">Try relaxing your search terms or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.workOrderNo}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                      {order.workOrderNo}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(order.createDate)}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {order.itemCode}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[220px]" title={order.itemName}>
                      {order.itemName}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {order.plannedQty ? order.plannedQty.toLocaleString() : 0}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {order.orderType}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500">
                      {order.unit}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusPillClass(order.displayStatus)}`}
                      >
                        {order.displayStatus}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEditWorkOrder(
                            order.workOrderNo,
                            order.itemCode,
                            order.orderType,
                            order.plannedQty,
                            order.unit,
                            order.status
                          )}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                          title="View work order"
                          id={`btn-edit-${order.workOrderNo}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {(order.displayStatus === 'Draft' || order.displayStatus === 'Planned') && (
                          <button
                            onClick={(e) => handleDelete(order.workOrderNo, e)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Delete work order from database"
                            id={`btn-delete-${order.workOrderNo}`}
                          >
                            <Trash2 className="w-4 h-4" />
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

        <div className="border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-slate-500 font-medium" id="table-pagination">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="bg-transparent border-none font-bold text-slate-700 focus:outline-none cursor-pointer"
              id="rows-per-page-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span>
              {totalCount === 0 ? '0-0' : `${startIndex + 1}-${Math.min(startIndex + rowsPerPage, totalCount)}`}{' '}
              of {totalCount}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}