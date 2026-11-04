import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronRight,
  CircleAlert,
  ListChecks,
  ArrowDown,
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
  X
} from "lucide-react";
import { fetchStockFgItemsRDBMS, fetchStockRoutingRDBMS } from "../api";
import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, Rectangle, Sector, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
const chartData = [
  { status: "draft", orders: 187, fill: "#6b7280" },
  { status: "released", orders: 200, fill: "#737985" },
  { status: "completed", orders: 173, fill: "#858b96" },
  { status: "planned", orders: 173, fill: "#969ba5" },
  { status: "cancelled", orders: 90, fill: "#a7acb5" }
];
const chartConfig = {
  orders: { label: "Orders" },
  draft: { label: "Draft", color: "#4b5563" },
  released: { label: "Released", color: "#6b7280" },
  completed: { label: "Completed", color: "#858b96" },
  planned: { label: "Planned", color: "#a3a8b0" },
  cancelled: { label: "Cancelled", color: "#c5c9cf" }
};
const ACTIVE_INDEX = 1;
const StockOrderChart = () => /* @__PURE__ */ jsxs(Card, {
  className: "rounded-3xl border-slate-200 shadow-sm", children: [
  /* @__PURE__ */ jsxs(CardHeader, {
    children: [
    /* @__PURE__ */ jsx(CardTitle, { children: "Stock Orders by Status" }),
    /* @__PURE__ */ jsx(CardDescription, { children: "Overall Orders" })
    ]
  }),
  /* @__PURE__ */ jsx(CardContent, {
    children: /* @__PURE__ */ jsx(ChartContainer, {
      config: chartConfig, className: "h-[340px] w-full", children: /* @__PURE__ */ jsxs(BarChart, {
        data: chartData, children: [
    /* @__PURE__ */ jsx(CartesianGrid, { vertical: false }),
    /* @__PURE__ */ jsx(
          XAxis,
          {
            dataKey: "status",
            tickLine: false,
            tickMargin: 10,
            axisLine: false,
            tickFormatter: (value) => chartConfig[value]?.label
          }
        ),
    /* @__PURE__ */ jsx(ChartTooltip, { cursor: false, content: /* @__PURE__ */ jsx(ChartTooltipContent, { hideLabel: true }) }),
    /* @__PURE__ */ jsx(
          Bar,
          {
            dataKey: "orders",
            strokeWidth: 2,
            radius: 8,
            shape: ({ index, ...props }) => index === ACTIVE_INDEX ? /* @__PURE__ */ jsx(
              Rectangle,
              {
                ...props,
                fill: props.payload.fill,
                fillOpacity: 0.8,
                stroke: props.payload.fill,
                strokeDasharray: 4,
                strokeDashoffset: 4
              }
            ) : /* @__PURE__ */ jsx(
              Rectangle,
              {
                ...props,
                fill: props.payload.fill
              }
            ),
            children: chartData.map((entry) => /* @__PURE__ */ jsx(Cell, { fill: entry.fill }, entry.status))
          }
        )
        ]
      })
    })
  }),
  /* @__PURE__ */ jsx(CardFooter, {
    className: "flex-col items-start gap-2 text-sm", children: /* @__PURE__ */ jsxs("div", {
      className: "flex gap-2 leading-none font-medium", children: [
        "Showing stock orders by status",
    /* @__PURE__ */ jsx(TrendingUp, { className: "h-4 w-4" })
      ]
    })
  })
  ]
});
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
  { month: "december", desktop: 190, fill: "#e1e4e8" }
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
  december: { label: "December", color: "#e1e4e8" }
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
        return /* @__PURE__ */ jsxs("g", {
          children: [
          /* @__PURE__ */ jsx(Sector, { ...props, outerRadius: outerRadius + 10 }),
          /* @__PURE__ */ jsx(
            Sector,
            {
              ...props,
              outerRadius: outerRadius + 25,
              innerRadius: outerRadius + 12
            }
          )
          ]
        });
      }
      return /* @__PURE__ */ jsx(Sector, { ...props, outerRadius });
    },
    [activeIndex]
  );
  return /* @__PURE__ */ jsxs(Card, {
    "data-chart": id, className: "flex flex-col", children: [
    /* @__PURE__ */ jsx(ChartStyle, { id, config: pieChartConfig }),
    /* @__PURE__ */ jsxs(CardHeader, {
      className: "flex-row items-start space-y-0 pb-0", children: [
      /* @__PURE__ */ jsxs("div", {
        className: "grid gap-1", children: [
        /* @__PURE__ */ jsx(CardTitle, { children: "Pie Chart - Interactive" }),
        /* @__PURE__ */ jsx(CardDescription, { children: "January - December" })
        ]
      }),
      /* @__PURE__ */ jsxs(Select, {
        value: activeMonth, onValueChange: setActiveMonth, children: [
        /* @__PURE__ */ jsx(
          SelectTrigger,
          {
            className: "ml-auto h-7 w-[170px] rounded-lg pl-2.5",
            "aria-label": "Select a value",
            children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select month" })
          }
        ),
        /* @__PURE__ */ jsx(SelectContent, {
          align: "end", className: "rounded-xl", children: months.map((key) => {
            const config = pieChartConfig[key];
            if (!config) {
              return null;
            }
            return /* @__PURE__ */ jsx(
              SelectItem,
              {
                value: key,
                className: "rounded-lg [&_span]:flex",
                children: /* @__PURE__ */ jsxs("div", {
                  className: "flex items-center gap-2 text-xs", children: [
                /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: "flex h-3 w-3 shrink-0 rounded-xs",
                      style: {
                        backgroundColor: pieChartConfig[key]?.color
                      }
                    }
                  ),
                    config?.label
                  ]
                })
              },
              key
            );
          })
        })
        ]
      })
      ]
    }),
    /* @__PURE__ */ jsx(CardContent, {
      className: "flex flex-1 justify-center pb-0", children: /* @__PURE__ */ jsx(
        ChartContainer,
        {
          id,
          config: pieChartConfig,
          className: "mx-auto aspect-square w-full w-[320px]",
          children: /* @__PURE__ */ jsxs(PieChart, {
            children: [
          /* @__PURE__ */ jsx(
              ChartTooltip,
              {
                cursor: false,
                content: /* @__PURE__ */ jsx(ChartTooltipContent, { hideLabel: true })
              }
            ),
          /* @__PURE__ */ jsx(
              Pie,
              {
                data: desktopData,
                dataKey: "desktop",
                nameKey: "month",
                innerRadius: 60,
                strokeWidth: 5,
                shape: renderPieShape,
                children: /* @__PURE__ */ jsx(
                  Label,
                  {
                    content: ({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return /* @__PURE__ */ jsxs(
                          "text",
                          {
                            x: viewBox.cx,
                            y: viewBox.cy,
                            textAnchor: "middle",
                            dominantBaseline: "middle",
                            children: [
                            /* @__PURE__ */ jsx(
                              "tspan",
                              {
                                x: viewBox.cx,
                                y: viewBox.cy,
                                className: "fill-foreground text-3xl font-bold",
                                children: desktopData[activeIndex].desktop.toLocaleString()
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "tspan",
                              {
                                x: viewBox.cx,
                                y: (viewBox.cy || 0) + 24,
                                className: "fill-muted-foreground",
                                children: "Visitors"
                              }
                            )
                            ]
                          }
                        );
                      }
                    }
                  }
                )
              }
            )
            ]
          })
        }
      )
    })
    ]
  });
}
const statusStyles = {
  Released: "bg-emerald-100 text-emerald-700",
  Draft: "bg-slate-100 text-slate-700",
  Planned: "bg-amber-100 text-amber-700",
  Cancelled: "bg-rose-100 text-rose-600"
};
const tabs = ["All", "Draft", "Planned", "Released", "Cancelled"];
const columns = ["Stock Order Number", "Creation Date", "Item Code", "Item Description", "Planned Qty", "Order Type", "Unit", "Status"];
const StockOrdersTable = ({ orders = [], onDelete }) => {
  const [activeTab, setActiveTab] = useState("All");
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
    orders.forEach((w) => c[w.status] = (c[w.status] ?? 0) + 1);
    return c;
  }, [orders]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter(
      (w) => (activeTab === "All" || w.status === activeTab) && (unitFilter === "All Units" || w.unit === unitFilter) && (!q || [w.number, w.itemCode, w.itemDescription, w.orderType, w.unit].join(" ").toLowerCase().includes(q))
    );
  }, [orders, activeTab, query, unitFilter]);
  const visible = filtered.slice(0, rowsPerPage);
  return /* @__PURE__ */ jsxs("div", {
    className: "w-full rounded-3xl border border-slate-200 bg-white shadow-sm", children: [
    /* @__PURE__ */ jsxs("div", {
      className: "flex items-center justify-between px-6 pt-6", children: [
      /* @__PURE__ */ jsxs("div", {
        className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-[22px] font-extrabold tracking-tight text-slate-900", children: "Stock Orders" }),
        /* @__PURE__ */ jsx("span", { className: "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600", children: counts.All })
        ]
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "flex items-center gap-4 text-slate-500", children: [
        /* @__PURE__ */ jsx("button", { type: "button", title: "Refresh", className: "hover:text-slate-800", children: /* @__PURE__ */ jsx(RefreshCw, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsxs("div", {
          ref: filterRef, className: "relative", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              title: "Filter",
              onClick: () => setFilterOpen((o) => !o),
              className: `relative hover:text-slate-800 ${filterOpen || unitFilter !== "All Units" ? "text-slate-900" : ""}`,
              children: [
                /* @__PURE__ */ jsx(Filter, { className: "h-5 w-5" }),
                unitFilter !== "All Units" && /* @__PURE__ */ jsx("span", { className: "absolute -right-1 -top-1 h-2 w-2 rounded-full bg-indigo-500" })
              ]
            }
          ),
            filterOpen && /* @__PURE__ */ jsxs("div", {
              className: "absolute right-0 top-9 z-20 w-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl", children: [
            /* @__PURE__ */ jsxs("div", {
                className: "mb-4 flex items-center justify-between", children: [
              /* @__PURE__ */ jsx("h3", { className: "text-[15px] font-extrabold text-slate-900", children: "Filter Database Records" }),
                  unitFilter !== "All Units" && /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setUnitFilter("All Units"),
                      className: "text-xs font-bold text-indigo-500 hover:text-indigo-600",
                      children: "Reset"
                    }
                  )
                ]
              }),
            /* @__PURE__ */ jsx("label", { className: "mb-1.5 block text-xs font-bold text-slate-500", htmlFor: "unit-filter", children: "Unit" }),
            /* @__PURE__ */ jsxs("div", {
                className: "relative", children: [
              /* @__PURE__ */ jsx(
                  "select",
                  {
                    id: "unit-filter",
                    value: unitFilter,
                    onChange: (e) => setUnitFilter(e.target.value),
                    className: "w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
                    children: ["All Units", "Unit-1", "Unit-2", "Unit-3"].map((u) => /* @__PURE__ */ jsx("option", { value: u, children: u }, u))
                  }
                ),
              /* @__PURE__ */ jsx(ChevronDown, { className: "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" })
                ]
              })
              ]
            })
          ]
        })
        ]
      })
      ]
    }),
    /* @__PURE__ */ jsxs("div", {
      className: "flex flex-wrap items-center justify-between gap-3 px-6 py-4", children: [
      /* @__PURE__ */ jsx("div", {
        className: "flex items-center gap-1 rounded-xl bg-slate-100 p-1", children: tabs.map((t) => /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: () => setActiveTab(t),
            className: `rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${activeTab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`,
            children: [
              t,
              " ",
            /* @__PURE__ */ jsx("span", { className: "ml-1", children: counts[t] ?? 0 })
            ]
          },
          t
        ))
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "flex w-full max-w-sm items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 md:w-80", children: [
        /* @__PURE__ */ jsx(Search, { className: "h-4 w-4 text-slate-400" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            value: query,
            onChange: (e) => setQuery(e.target.value),
            placeholder: "Search stock orders...",
            className: "w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          }
        )
        ]
      })
      ]
    }),
    /* @__PURE__ */ jsx("div", {
      className: "overflow-x-auto border-t border-slate-100", children: /* @__PURE__ */ jsxs("table", {
        className: "w-full min-w-[960px] text-left", children: [
      /* @__PURE__ */ jsx("thead", {
          children: /* @__PURE__ */ jsxs("tr", {
            className: "text-[11px] font-bold uppercase tracking-wider text-slate-500", children: [
              columns.map((c) => /* @__PURE__ */ jsx("th", { className: "px-6 py-4", children: c }, c)),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-4 text-right", children: "Actions" })
            ]
          })
        }),
      /* @__PURE__ */ jsxs("tbody", {
          children: [
            visible.map((w) => /* @__PURE__ */ jsxs("tr", {
              className: "border-t border-slate-100 text-sm text-slate-600 hover:bg-slate-50", children: [
          /* @__PURE__ */ jsx("td", { className: "px-6 py-5 font-bold text-slate-900", children: w.number }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-5", children: w.created }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-5", children: w.itemCode }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-5", children: w.itemDescription }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-5 font-semibold text-slate-800", children: w.plannedQty }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-5", children: w.orderType }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-5", children: w.unit }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-5", children: /* @__PURE__ */ jsx("span", { className: `rounded-full px-3 py-1 text-xs font-bold ${statusStyles[w.status]}`, children: w.status }) }),
          /* @__PURE__ */ jsx("td", {
                className: "px-6 py-5", children: /* @__PURE__ */ jsxs("div", {
                  className: "flex items-center justify-end gap-4 text-slate-400", children: [
            /* @__PURE__ */ jsx("button", { type: "button", title: "View", className: "hover:text-slate-700", children: /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4" }) }),
                    (w.status === "Draft" || w.status === "Planned") && /* @__PURE__ */ jsx("button", { type: "button", title: "Delete", onClick: () => onDelete?.(w.number), className: "hover:text-rose-600", children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
                  ]
                })
              })
              ]
            }, w.number)),
            visible.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: columns.length + 1, className: "px-6 py-10 text-center text-sm text-slate-500", children: orders.length === 0 ? "No stock orders yet." : "No stock orders match your search." }) })
          ]
        })
        ]
      })
    }),
    /* @__PURE__ */ jsxs("div", {
      className: "flex items-center justify-between border-t border-slate-100 px-6 py-4 text-xs font-semibold text-slate-500", children: [
      /* @__PURE__ */ jsxs("label", {
        className: "flex items-center gap-2", children: [
          "Rows per page:",
        /* @__PURE__ */ jsxs("span", {
            className: "relative flex items-center", children: [
          /* @__PURE__ */ jsx(
              "select",
              {
                value: rowsPerPage,
                onChange: (e) => setRowsPerPage(Number(e.target.value)),
                className: "cursor-pointer appearance-none bg-transparent pr-5 font-bold text-slate-800 outline-none",
                children: [15, 30, 50].map((n) => /* @__PURE__ */ jsx("option", { value: n, children: n }, n))
              }
            ),
          /* @__PURE__ */ jsx(ChevronDown, { className: "pointer-events-none absolute right-0 h-3.5 w-3.5 text-slate-700" })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "flex items-center gap-5", children: [
        /* @__PURE__ */ jsxs("span", {
          className: "text-slate-600", children: [
            filtered.length === 0 ? "0" : `1-${visible.length}`,
            " of ",
            filtered.length
          ]
        }),
        /* @__PURE__ */ jsxs("div", {
          className: "flex items-center gap-3 text-slate-300", children: [
          /* @__PURE__ */ jsx(ChevronsLeft, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx(ChevronsRight, { className: "h-4 w-4" })
          ]
        })
        ]
      })
      ]
    })
    ]
  });
};
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
function useTypewriter(text, start, speed = 55) {
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
  { id: 2, label: "Routing & Allocation" }
];
const ORDER_TYPE_LABEL = "For Stock (Sales)";
const unitOptions = ["Unit-1", "Unit-2", "Unit-3"];
const priorityOptions = ["Low", "Normal", "High", "Urgent"];
const plannerOptions = ["Opshead", "Planner-1", "Planner-2"];
const today = () => (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA");
const tomorrow = () => {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA");
};
const labelCls = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500";
const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100";
const readOnlyCls = "w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none";
const Field = ({ label, required, className = "", children }) => /* @__PURE__ */ jsxs("div", {
  className, children: [
  /* @__PURE__ */ jsxs("label", {
    className: labelCls, children: [
      label,
      required && /* @__PURE__ */ jsx("span", { className: "ml-1 text-rose-500", children: "*" })
    ]
  }),
    children
  ]
});
const SelectField = ({
  value,
  onChange,
  options,
  placeholder,
  invalid = false,
  shakeKey = 0
}) => /* @__PURE__ */ jsxs("div", {
  className: "relative", children: [
  /* @__PURE__ */ jsxs(
    "select",
    {
      value: value ?? "",
      onChange: (e) => onChange(e.target.value),
      className: `${inputCls} cursor-pointer appearance-none pr-10 ${value ? "" : "text-slate-400"} ${invalid ? "required-field-error !ring-2 !ring-red-100" : ""}`,
      children: [
        placeholder && /* @__PURE__ */ jsx("option", { value: "", disabled: true, children: placeholder }),
        options.map((o) => /* @__PURE__ */ jsx("option", { value: o, className: "text-slate-800", children: o }, o))
      ]
    },
    shakeKey
  ),
  /* @__PURE__ */ jsx(ChevronDown, { className: "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" })
  ]
});
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
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const DatePickerField = ({ value, onChange, min, invalid = false, shakeKey = 0 }) => {
  const [open, setOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const calendarRef = useRef(null);
  const initial = value ? /* @__PURE__ */ new Date(value + "T00:00:00") : /* @__PURE__ */ new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  useEffect(() => {
    if (value) {
      const d = /* @__PURE__ */ new Date(value + "T00:00:00");
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
      overflowY: "auto"
    });
  };
  useEffect(() => {
    if (!open) return void 0;
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
    if (!open) updateCalendarPosition();
    setOpen((o) => !o);
  };
  return /* @__PURE__ */ jsxs("div", {
    className: "relative", ref: containerRef, children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        ref: triggerRef,
        type: "button",
        onClick: toggleCalendar,
        className: `${inputCls} flex items-center gap-2.5 text-left ${invalid ? "required-field-error !ring-2 !ring-red-100" : ""}`,
        children: [
          /* @__PURE__ */ jsx(CalendarDays, { className: "h-4 w-4 shrink-0 text-slate-400" }),
          /* @__PURE__ */ jsx("span", { className: value ? "text-slate-800" : "text-slate-400", children: value ? formatDisplayDate(value) : "Select date" })
        ]
      },
      shakeKey
    ),
      open && calendarPosition && createPortal(
      /* @__PURE__ */ jsxs(
        "div",
        {
          ref: calendarRef,
          style: calendarPosition,
          className: "fixed z-[100] w-[240px] h-[275px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_11px_40px_rgba(15,23,42,0.12)]",
          children: [
            /* @__PURE__ */ jsxs("div", {
            className: "mb-2 flex items-center justify-between", children: [
              /* @__PURE__ */ jsxs("span", {
              className: "text-[15px] font-bold text-slate-900", children: [
                MONTH_NAMES[viewMonth],
                " ",
                viewYear
              ]
            }),
              /* @__PURE__ */ jsxs("div", {
              className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: prevMonth,
                  className: "flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800",
                  children: /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" })
                }
              ),
                /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: nextMonth,
                  className: "flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800",
                  children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" })
                }
              )
              ]
            })
            ]
          }),
            /* @__PURE__ */ jsx("div", {
            className: "grid grid-cols-7", children: WEEKDAYS.map((wd) => /* @__PURE__ */ jsx(
              "div",
              {
                className: "py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400",
                children: wd
              },
              wd
            ))
          }),
            /* @__PURE__ */ jsx("div", {
            className: "grid grid-cols-7 gap-0", children: cells.map((cell, idx) => {
              if (cell.day === null) {
                return /* @__PURE__ */ jsx("div", { className: "h-9" }, `empty-${idx}`);
              }
              const selected = cell.iso === value;
              const disabled = isDisabled(cell.iso);
              return /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  disabled,
                  onClick: () => {
                    if (!disabled) {
                      onChange(cell.iso);
                      setOpen(false);
                    }
                  },
                  className: `flex h-6 w-full items-center justify-center rounded-full text-sm font-medium transition-colors
                                        ${selected ? "bg-blue-600 text-white shadow-sm" : disabled ? "cursor-not-allowed text-slate-300" : "text-slate-700 hover:bg-slate-100"}`,
                  children: cell.day
                },
                cell.iso
              );
            })
          }),
            /* @__PURE__ */ jsx("div", {
            className: "mt-3 flex justify-end", children: /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setOpen(false),
                className: "rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800",
                children: "Close"
              }
            )
          })
          ]
        }
      ),
        document.body
      )
    ]
  });
};
const Stage1Form = ({ onProceed, onSchedule, apiRef }) => {
  const [fgItemCode, setFgItemCode] = useState("");
  const [fgItemName, setFgItemName] = useState("");
  const [fgQuantity, setFgQuantity] = useState("");
  const [fgItemLoaded, setFgItemLoaded] = useState(false);
  const [detailsScreen, setDetailsScreen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [drawingRevision, setDrawingRevision] = useState("");
  const [unit, setUnit] = useState("");
  const [priority, setPriority] = useState("");
  const [plannedQty, setPlannedQty] = useState("");
  const [woDate, setWoDate] = useState(today());
  const [completionDate, setCompletionDate] = useState("");
  const [planner, setPlanner] = useState("");
  const [remarks, setRemarks] = useState("");
  const [invalidFields, setInvalidFields] = useState([]);
  const [shakeAttempt, setShakeAttempt] = useState(0);
  const [fgDropdownOpen, setFgDropdownOpen] = useState(false);
  const [fgOptions, setFgOptions] = useState([]);
  const [fgOptionsLoading, setFgOptionsLoading] = useState(false);
  const fgDropdownRef = useRef(null);
  const [workOrderNo] = useState(() => `WO-ST-${Date.now().toString().slice(-5)}`);
  useEffect(() => {
    if (!fgDropdownOpen) return void 0;
    const q = fgItemCode.trim();
    let cancelled = false;
    setFgOptionsLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const rows = await fetchStockFgItemsRDBMS(q);
        if (!cancelled) setFgOptions(Array.isArray(rows) ? rows : []);
      } catch (error) {
        if (!cancelled) setFgOptions([]);
        console.error("Failed to load FG items:", error);
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
    if (!fgItemLoaded) {
      setLoadingProgress(0);
      setDetailsScreen(false);
      return void 0;
    }
    setDetailsScreen(false);
    setLoadingProgress(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const next = Math.min(100, Math.round((Date.now() - startedAt) / 3e3 * 100));
      setLoadingProgress(next);
      if (next >= 100) {
        window.clearInterval(timer);
        setDetailsScreen(true);
      }
    }, 30);
    return () => window.clearInterval(timer);
  }, [fgItemLoaded]);
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
    // extra details kept with the order for later use
    priority,
    completionDate,
    planner,
    remarks,
    drawingRevision,
    fgQuantity
  });
  useEffect(() => {
    if (apiRef) apiRef.current = { getDraft: () => fgItemLoaded ? buildOrder("Draft") : null };
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
    if (!validate()) return;
    onSchedule?.(buildOrder("Planned"));
  };
  const handleProceedToRouting = () => {
    if (!validate()) return;
    onProceed({ fgItemCode, fgItemName, fgQuantity, unit, plannedQty, completionDate, planner, workOrderNo });
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
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [
    /* @__PURE__ */ jsx("style", {
      children: `
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
        ` }),
    /* @__PURE__ */ jsxs("div", {
        className: "relative space-y-6 p-6 md:p-8", children: [
      /* @__PURE__ */ jsxs("div", {
          className: "grid grid-cols-1 gap-5 md:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", {
            className: "relative min-w-0 overflow-visible rounded-2xl border border-slate-200 bg-slate-50 transition-colors focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100", children: [
          /* @__PURE__ */ jsxs("div", {
              className: "px-4 pb-2 pt-3", children: [
            /* @__PURE__ */ jsxs("label", {
                className: "block text-[10px] font-bold uppercase tracking-wider text-slate-400", children: [
                  "FG Item Code",
              /* @__PURE__ */ jsx("span", { className: "ml-1 text-rose-500", children: "*" })
                ]
              }),
            /* @__PURE__ */ jsxs("div", {
                className: "relative mt-1", ref: fgDropdownRef, children: [
              /* @__PURE__ */ jsx(Search, { className: "absolute left-0 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" }),
              /* @__PURE__ */ jsx(
                  "input",
                  {
                    value: fgItemCode,
                    role: "combobox",
                    "aria-autocomplete": "list",
                    "aria-controls": "fg-item-code-options",
                    "aria-expanded": fgDropdownOpen,
                    onChange: (e) => {
                      setFgItemCode(e.target.value);
                      setFgItemLoaded(false);
                      setDetailsScreen(false);
                      setLoadingProgress(0);
                      setFgItemName("");
                      setFgQuantity("");
                      setDrawingRevision("");
                      setPlannedQty("");
                      setFgDropdownOpen(true);
                    },
                    onFocus: () => setFgDropdownOpen(true),
                    placeholder: "Search FG item code",
                    autoComplete: "off",
                    className: "w-full min-w-0 truncate bg-transparent py-1 pl-6 pr-7 text-base font-bold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
                  }
                ),
              /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    "aria-label": fgDropdownOpen ? "Close FG item list" : "Open FG item list",
                    "aria-expanded": fgDropdownOpen,
                    onMouseDown: (event) => event.preventDefault(),
                    onClick: () => setFgDropdownOpen((open) => !open),
                    className: "absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700",
                    children: /* @__PURE__ */ jsx(
                      ChevronDown,
                      {
                        className: `h-4 w-4 transition-transform ${fgDropdownOpen ? "rotate-180" : ""}`
                      }
                    )
                  }
                ),
                  fgDropdownOpen && /* @__PURE__ */ jsx(
                    "div",
                    {
                      id: "fg-item-code-options",
                      className: "absolute left-0 right-0 top-full z-50 mt-2 max-h-64 min-w-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.18)]",
                      role: "listbox",
                      "aria-label": "Matching FG items",
                      children: fgOptionsLoading ? /* @__PURE__ */ jsx("div", { className: "px-4 py-4 text-center text-xs font-medium text-slate-500", role: "status", children: "Searching FG items\u2026" }) : fgOptions.length === 0 ? /* @__PURE__ */ jsx("div", { className: "px-4 py-4 text-center text-xs font-medium text-slate-400", children: "No matching items found" }) : fgOptions.map((option) => {
                        const isSelected = option.code === fgItemCode;
                        return /* @__PURE__ */ jsxs(
                          "button",
                          {
                            type: "button",
                            role: "option",
                            "aria-selected": isSelected,
                            onMouseDown: (event) => event.preventDefault(),
                            onClick: () => selectFgItem(option),
                            className: `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${isSelected ? "bg-indigo-50 text-slate-900" : "text-slate-700 hover:bg-slate-50"}`,
                            children: [
                          /* @__PURE__ */ jsxs("span", {
                              className: "min-w-0 flex-1 overflow-hidden", children: [
                            /* @__PURE__ */ jsx("span", { className: "block max-w-full truncate text-sm font-semibold", children: option.code }),
                                option.name && /* @__PURE__ */ jsx("span", { className: "mt-0.5 block max-w-full truncate text-xs font-medium text-slate-500", children: option.name })
                              ]
                            }),
                              isSelected && /* @__PURE__ */ jsx("span", { className: "shrink-0 text-sm font-bold text-indigo-600", children: "\u2713" })
                            ]
                          },
                          option.code
                        );
                      })
                    }
                  )
                ]
              })
              ]
            }),
              detailsScreen && /* @__PURE__ */ jsxs("div", {
                className: "scd-details-enter border-t border-slate-200 px-4 pb-3 pt-3", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-400", children: "FG Item Name" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 min-h-[24px] min-w-0 break-words text-base font-bold text-slate-900 [overflow-wrap:anywhere]", children: fgItemName })
                ]
              })
            ]
          }),
        /* @__PURE__ */ jsxs("div", {
            className: `grid grid-cols-1 gap-5 sm:grid-cols-2 md:col-span-2 ${detailsScreen ? "scd-details-enter" : ""}`, children: [
          /* @__PURE__ */ jsx(Field, { label: "Order Type", required: true, children: /* @__PURE__ */ jsx("input", { readOnly: true, value: ORDER_TYPE_LABEL, className: readOnlyCls }) }),
              detailsScreen && /* @__PURE__ */ jsxs(Fragment, {
                children: [
            /* @__PURE__ */ jsx(Field, {
                  label: "Unit Selection (MFG Location)", required: true, children: /* @__PURE__ */ jsx(
                    SelectField,
                    {
                      value: unit,
                      onChange: (value) => {
                        setUnit(value);
                        clearInvalidField("unit");
                      },
                      options: unitOptions,
                      placeholder: "Select unit",
                      invalid: invalidFields.includes("unit"),
                      shakeKey: shakeAttempt
                    }
                  )
                }),
            /* @__PURE__ */ jsxs("div", {
                  className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-400", children: "Drawing Revision" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 min-h-[20px] text-sm font-bold text-slate-900", children: drawingRevision || "" })
                  ]
                }),
            /* @__PURE__ */ jsxs("div", {
                  className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-400", children: "FG Quantity" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 min-h-[20px] text-sm font-bold text-slate-900", children: fgQuantity || "0" })
                  ]
                })
                ]
              })
            ]
          })
          ]
        }),
          detailsScreen && /* @__PURE__ */ jsxs(Fragment, {
            children: [
        /* @__PURE__ */ jsxs("div", {
              className: "scd-details-enter grid grid-cols-1 gap-5 md:grid-cols-3", children: [
          /* @__PURE__ */ jsx(Field, { label: "Work Order No", children: /* @__PURE__ */ jsx("input", { readOnly: true, value: workOrderNo, className: readOnlyCls }) }),
          /* @__PURE__ */ jsx(Field, { label: "W/O Priority", children: /* @__PURE__ */ jsx(SelectField, { value: priority, onChange: setPriority, options: priorityOptions }) }),
          /* @__PURE__ */ jsx(Field, {
                label: "Planned Qty", required: true, children: /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "number",
                    min: 1,
                    value: plannedQty,
                    onChange: (e) => {
                      setPlannedQty(e.target.value);
                      clearInvalidField("plannedQty");
                    },
                    placeholder: "0",
                    className: `${inputCls} ${invalidFields.includes("plannedQty") ? "required-field-error !ring-2 !ring-red-100" : ""}`
                  },
                  shakeAttempt
                )
              })
              ]
            }),
        /* @__PURE__ */ jsxs("div", {
              className: "scd-details-enter grid grid-cols-1 gap-5 md:grid-cols-3", children: [
          /* @__PURE__ */ jsx(Field, {
                label: "Work Order Date", children: /* @__PURE__ */ jsxs("div", {
                  className: `${inputCls} flex cursor-not-allowed items-center gap-2.5 bg-slate-50 text-slate-700`, children: [
            /* @__PURE__ */ jsx(CalendarDays, { className: "h-4 w-4 shrink-0 text-slate-400" }),
            /* @__PURE__ */ jsx("span", { children: formatDisplayDate(woDate) })
                  ]
                })
              }),
          /* @__PURE__ */ jsx(Field, {
                label: "Proj. Completion Date", required: true, children: /* @__PURE__ */ jsx(
                  DatePickerField,
                  {
                    value: completionDate,
                    onChange: (value) => {
                      setCompletionDate(value);
                      clearInvalidField("completionDate");
                    },
                    min: woDate,
                    invalid: invalidFields.includes("completionDate"),
                    shakeKey: shakeAttempt
                  },
                  shakeAttempt
                )
              }),
          /* @__PURE__ */ jsx(Field, {
                label: "Planner", required: true, children: /* @__PURE__ */ jsx(
                  SelectField,
                  {
                    value: planner,
                    onChange: (value) => {
                      setPlanner(value);
                      clearInvalidField("planner");
                    },
                    options: plannerOptions,
                    placeholder: "Select planner",
                    invalid: invalidFields.includes("planner"),
                    shakeKey: shakeAttempt
                  }
                )
              })
              ]
            }),
        /* @__PURE__ */ jsx(Field, {
              label: "Production Remarks / Directives", className: "scd-details-enter", children: /* @__PURE__ */ jsx(
                "textarea",
                {
                  rows: 3,
                  value: remarks,
                  onChange: (e) => setRemarks(e.target.value),
                  placeholder: "Add production remarks or directives...",
                  className: `${inputCls} resize-none font-medium`
                }
              )
            }),
        /* @__PURE__ */ jsxs("div", {
              className: "scd-details-enter flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 md:px-8", children: [
          /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: handleSchedule,
                  className: "rounded-xl bg-amber-400 px-6 py-3 text-[13px] font-extrabold text-slate-900 shadow-sm transition-colors hover:bg-amber-300",
                  children: "Schedule"
                }
              ),
          /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: handleProceedToRouting,
                  className: "flex items-center gap-2 rounded-xl bg-[#1f2937] px-6 py-3 text-[13px] font-extrabold text-white shadow-sm transition-colors hover:bg-[#111827]",
                  children: [
                    "Proceed to Routing Stage Planning",
                /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })
                  ]
                }
              )
              ]
            })
            ]
          }),
          fgItemLoaded && !detailsScreen && /* @__PURE__ */ jsxs("div", {
            className: "absolute bottom-5 right-6 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg", "aria-live": "polite", children: [
        /* @__PURE__ */ jsxs("div", {
              className: "mb-2 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide text-slate-500", children: [
          /* @__PURE__ */ jsx("span", { children: "Loading FG item" }),
          /* @__PURE__ */ jsxs("span", {
                className: "text-slate-900", children: [
                  loadingProgress,
                  "%"
                ]
              })
              ]
            }),
        /* @__PURE__ */ jsx("div", { className: "h-2 overflow-hidden rounded-full bg-slate-200", children: /* @__PURE__ */ jsx("div", { className: "h-full rounded-full bg-[#211456] transition-[width] duration-75", style: { width: `${loadingProgress}%` } }) })
            ]
          })
        ]
      })
    ]
  });
};
const routingStepsFallback = [
  { code: "BB-52-OP010-SFG", subtitle: "Dia 40 mm x L 130 mm", qty: 120, operation: "CUTTING OPERATION", jobCard: "855720-01", machineCode: "CUTTING", machineName: "CUT-01" },
  { code: "BB-52-OP020-SFG", subtitle: "CNC TURNING 2nd OPERATION", qty: 120, operation: "CNC TURNING 2nd OPERATION", jobCard: "855720-02", machineCode: "CNC-TURN", machineName: "CNC-01" },
  { code: "BB-52-OP030-SFG", subtitle: "VMC MILLING 1st OPERATION", qty: 120, operation: "VMC MILLING 1st OPERATION", jobCard: "855720-03", machineCode: "VMC-MILL", machineName: "VMC-01" },
  { code: "BB-52-OP040-SFG", subtitle: "DEBURRING", qty: 120, operation: "DEBURRING", jobCard: "855720-04", machineCode: "DEBURR", machineName: "DBR-01" },
  { code: "BB-52-OP050-SFG", subtitle: "HEAT TREATMENT (OUTSOURCING)", qty: 120, operation: "HEAT TREATMENT (OUTSOURCING)", jobCard: "855720-05", machineCode: "HEAT-TREAT", machineName: "OUT-01" },
  { code: "BB-52-OP060-SFG", subtitle: "CENTERLESS GRINDING 1st OPERATION", qty: 120, operation: "CENTERLESS GRINDING 1st OPERATION", jobCard: "855720-06", machineCode: "CL-GRIND", machineName: "CLG-01" },
  { code: "BB-52-OP070-SFG", subtitle: "HARD CHROME PLATING (OUTSOURCING)", qty: 120, operation: "HARD CHROME PLATING (OUTSOURCING)", jobCard: "855720-07", machineCode: "CHROME", machineName: "HCP-01" }
];
const processTypeOptions = ["In-House", "Inter-Unit", "Sub Con"];
const PROCESS_UNIT_RULES = {
  "In-House": { units: ["Unit-1"], warehouses: { "Unit-1": "QC-U1" } },
  "Inter-Unit": { units: ["Unit-2", "Unit-3"], warehouses: { "Unit-2": "QC-U2", "Unit-3": "QC-U3" } },
  "Sub Con": { units: ["Unit-1"], warehouses: { "Unit-1": "SC-U1" } }
};
const getUnitOptions = (processType) => (PROCESS_UNIT_RULES[processType] ?? PROCESS_UNIT_RULES["In-House"]).units;
const getWarehouse = (processType, unit) => (PROCESS_UNIT_RULES[processType] ?? PROCESS_UNIT_RULES["In-House"]).warehouses[unit] ?? "";
const darkLabelCls = "text-[11px] text-slate-400 block uppercase font-extrabold";
const darkSelectCls = "w-full cursor-pointer rounded-md border border-slate-750 bg-black/20 px-1 py-1 text-[12px] font-semibold text-slate-300 outline-none transition-colors focus:outline-none focus:border-slate-400 [color-scheme:dark]";
const modalLabelCls = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-slate-200";
const modalInputCls = "w-full rounded-lg border border-slate-700 bg-[#0f1014] px-3 py-2 text-xs font-semibold text-white outline-none transition-colors placeholder:text-slate-500 hover:border-slate-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-600/60 disabled:text-slate-300 [color-scheme:dark]";
const pad2 = (n) => String(n).padStart(2, "0");
const computeSchedule = (d, qty) => {
  const totalMins = Math.max(0, Math.round((Number(d.settingTime) || 0) + (Number(d.processTime) || 0) * qty));
  const totalTime = `${pad2(Math.floor(totalMins / 60))}:${pad2(totalMins % 60)}`;
  if (!d.startDate || !d.startTime) return { endDate: "", endTime: "", totalTime };
  const end = new Date((/* @__PURE__ */ new Date(`${d.startDate}T${d.startTime}`)).getTime() + totalMins * 6e4);
  return {
    endDate: `${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}`,
    endTime: `${pad2(end.getHours())}:${pad2(end.getMinutes())}`,
    totalTime
  };
};
const RoutingDetailsModal = ({ step, initial, onClose, onSave }) => {
  const [form, setForm] = useState(initial);
  const remarksRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  useEffect(() => {
    const el = remarksRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [form.remarks]);
  const schedule = computeSchedule(form, step.qty);
  const finalForm = { ...form, endDate: schedule.endDate, endTime: schedule.endTime };
  const dirty = JSON.stringify(finalForm) !== JSON.stringify(initial);
  return createPortal(
    /* @__PURE__ */ jsx(
    "div",
    {
      className: "fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-[1px]",
      onMouseDown: (e) => {
        if (e.target === e.currentTarget) onClose();
      },
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          role: "dialog",
          "aria-modal": "true",
          className: "scd-fade max-h-[92vh] w-full max-w-[512px] overflow-y-auto rounded-2xl border border-slate-700 bg-[#15161b] text-white shadow-2xl",
          children: [
              /* @__PURE__ */ jsxs("div", {
            className: "flex items-start justify-between border-b border-slate-700/70 px-5 pb-4 pt-5", children: [
                /* @__PURE__ */ jsxs("div", {
              className: "min-w-0", children: [
                  /* @__PURE__ */ jsx("span", { className: "inline-block rounded border border-slate-600 bg-black/40 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide text-slate-100", children: step.code }),
                  /* @__PURE__ */ jsx("h3", { className: "mt-1.5 text-[15px] font-extrabold text-white", children: step.subtitle })
              ]
            }),
                /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                "aria-label": "Close",
                onClick: onClose,
                className: "rounded-md p-1 text-slate-300 transition-colors hover:bg-white/10 hover:text-white",
                children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
              }
            )
            ]
          }),
              /* @__PURE__ */ jsxs("div", {
            className: "grid grid-cols-1 gap-x-5 gap-y-4 px-5 py-5 sm:grid-cols-2", children: [
                /* @__PURE__ */ jsxs("div", {
              children: [
                  /* @__PURE__ */ jsx("label", { className: modalLabelCls, children: "Warehouse" }),
                  /* @__PURE__ */ jsx("input", { disabled: true, value: form.warehouse ?? "", className: modalInputCls })
              ]
            }),
                /* @__PURE__ */ jsxs("div", {
              children: [
                  /* @__PURE__ */ jsx("label", { className: modalLabelCls, children: "Machine Code" }),
                  /* @__PURE__ */ jsx("input", { value: form.machineCode, onChange: set("machineCode"), className: modalInputCls })
              ]
            }),
                /* @__PURE__ */ jsxs("div", {
              children: [
                  /* @__PURE__ */ jsx("label", { className: modalLabelCls, children: "Machine Name" }),
                  /* @__PURE__ */ jsx("input", { value: form.machineName, onChange: set("machineName"), className: modalInputCls })
              ]
            }),
                /* @__PURE__ */ jsxs("div", {
              children: [
                  /* @__PURE__ */ jsx("label", { className: modalLabelCls, children: "Setting Time (Mins)" }),
                  /* @__PURE__ */ jsx("input", { type: "number", min: 0, value: form.settingTime, onChange: set("settingTime"), className: modalInputCls })
              ]
            }),
                /* @__PURE__ */ jsxs("div", {
              children: [
                  /* @__PURE__ */ jsx("label", { className: modalLabelCls, children: "Process Time/Unit (Mins)" }),
                  /* @__PURE__ */ jsx("input", { type: "number", min: 0, value: form.processTime, onChange: set("processTime"), className: modalInputCls })
              ]
            }),
                /* @__PURE__ */ jsxs("div", {
              children: [
                  /* @__PURE__ */ jsx("label", { className: modalLabelCls, children: "Start Date" }),
                  /* @__PURE__ */ jsx("input", { type: "date", value: form.startDate ?? "", onChange: set("startDate"), className: modalInputCls })
              ]
            }),
                /* @__PURE__ */ jsxs("div", {
              children: [
                  /* @__PURE__ */ jsx("label", { className: modalLabelCls, children: "Start Time" }),
                  /* @__PURE__ */ jsx("input", { type: "time", value: form.startTime ?? "", onChange: set("startTime"), className: modalInputCls })
              ]
            }),
                /* @__PURE__ */ jsxs("div", {
              children: [
                  /* @__PURE__ */ jsx("label", { className: modalLabelCls, children: "End Date" }),
                  /* @__PURE__ */ jsx("input", { type: "date", disabled: true, value: schedule.endDate ?? "", className: modalInputCls })
              ]
            }),
                /* @__PURE__ */ jsxs("div", {
              children: [
                  /* @__PURE__ */ jsx("label", { className: modalLabelCls, children: "End Time" }),
                  /* @__PURE__ */ jsx("input", { type: "text", disabled: true, value: schedule.endTime ?? "", placeholder: "--:--", className: modalInputCls })
              ]
            }),
                /* @__PURE__ */ jsxs("div", {
              children: [
                  /* @__PURE__ */ jsx("label", { className: modalLabelCls, children: "Total Time" }),
                  /* @__PURE__ */ jsx("input", { type: "text", disabled: true, value: schedule.totalTime ?? "", className: modalInputCls })
              ]
            }),
                /* @__PURE__ */ jsxs("div", {
              className: "sm:col-span-2", children: [
                  /* @__PURE__ */ jsx("label", { className: modalLabelCls, children: "Remarks" }),
                  /* @__PURE__ */ jsx(
                "textarea",
                {
                  ref: remarksRef,
                  rows: 1,
                  value: form.remarks ?? "",
                  onChange: (e) => setForm((prev) => ({ ...prev, remarks: e.target.value })),
                  className: `${modalInputCls} min-h-[38px] resize-y`
                }
              )
              ]
            })
            ]
          }),
              /* @__PURE__ */ jsx("div", {
            className: "flex items-center justify-end gap-3 px-5 pb-5", children: /* @__PURE__ */ jsxs("div", {
              className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: onClose,
                  className: "rounded-lg bg-slate-600 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-500",
                  children: "Cancel"
                }
              ),
                /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  disabled: !dirty,
                  onClick: () => onSave(finalForm),
                  className: "rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:hover:bg-slate-700",
                  children: "Save"
                }
              )
              ]
            })
          })
          ]
        }
      )
    }
  ),
    document.body
  );
};
const RoutingStepsGrid = ({ context }) => {
  const [routingStepsData, setRoutingStepsData] = useState([]);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const loadRouting = async () => {
      const fgCode = String(context?.fgItemCode || "").trim();
      if (!fgCode) {
        setRoutingStepsData([]);
        return;
      }
      setRoutingLoading(true);
      setRoutingError("");
      try {
        const rows = await fetchStockRoutingRDBMS(fgCode);
        if (!cancelled) setRoutingStepsData((Array.isArray(rows) ? rows : []).map((row, index) => ({
          ...row,
          qty: Number(row.qty || context?.plannedQty || 0),
          // Generate each job card from the current work order number.
          // Example: work order 12324 -> job cards 12324-01, 12324-02, ...
          jobCard: `${String(context?.workOrderNo || "").trim().replace(/^WO-ST-/i, "")}-${String(index + 1).padStart(2, "0")}`
        })));
      } catch (error) {
        if (!cancelled) {
          setRoutingError("Unable to load routing steps from routing_stocks.");
          setRoutingStepsData([]);
        }
      } finally {
        if (!cancelled) setRoutingLoading(false);
      }
    };
    loadRouting();
    return () => {
      cancelled = true;
    };
  }, [context?.fgItemCode, context?.plannedQty, context?.workOrderNo]);
  const [selections, setSelections] = useState({});
  const [openJobCard, setOpenJobCard] = useState(null);
  const [details, setDetails] = useState({});
  const changeProcessType = (jobCard, processType) => {
    const unit = getUnitOptions(processType)[0];
    setSelections((prev) => ({ ...prev, [jobCard]: { ...prev[jobCard], processType, unit } }));
    setDetails((prev) => ({
      ...prev,
      [jobCard]: { ...prev[jobCard], warehouse: getWarehouse(processType, unit) }
    }));
  };
  const changeUnit = (jobCard, unit) => {
    const processType = selections[jobCard]?.processType ?? "In-House";
    setSelections((prev) => ({ ...prev, [jobCard]: { ...prev[jobCard], unit } }));
    setDetails((prev) => ({
      ...prev,
      [jobCard]: { ...prev[jobCard], warehouse: getWarehouse(processType, unit) }
    }));
  };
  useEffect(() => {
    setSelections((prev) => Object.fromEntries(routingStepsData.map((st) => [
      st.jobCard,
      prev[st.jobCard] || { processType: "In-House", unit: "Unit-1" }
    ])));
    setDetails((prev) => Object.fromEntries(routingStepsData.map((st) => [
      st.jobCard,
      prev[st.jobCard] || {
        warehouse: getWarehouse("In-House", "Unit-1"),
        // QC-U1
        machineCode: st.machineCode || "",
        machineName: st.machineName || "",
        settingTime: "0",
        processTime: "0",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        remarks: ""
      }
    ])));
  }, [routingStepsData]);
  const openStep = routingStepsData.find((st) => st.jobCard === openJobCard);
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [
      routingLoading && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600", children: "Loading routing steps from routing_stocks..." }),
      routingError && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700", children: routingError }),
      !routingLoading && !routingError && routingStepsData.length === 0 && /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700", children: "No routing steps found for this FG item." }),
    /* @__PURE__ */ jsx("div", {
        className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5", children: routingStepsData.map((step) => {
          const processType = selections[step.jobCard]?.processType ?? "In-House";
          const unitChoices = getUnitOptions(processType);
          const unitValue = unitChoices.includes(selections[step.jobCard]?.unit) ? selections[step.jobCard].unit : unitChoices[0];
          return /* @__PURE__ */ jsx(
            "div",
            {
              className: "relative min-w-0 w-full max-w-[300px] overflow-visible rounded-xl border border-slate-400 bg-[#1f2229]",
              children: /* @__PURE__ */ jsxs("div", {
                className: "h-full min-h-[260px] overflow-hidden rounded-xl p-3 pb-5", children: [
            /* @__PURE__ */ jsxs("div", {
                  className: "mb-3 flex items-start justify-between gap-2", children: [
              /* @__PURE__ */ jsxs("div", {
                    className: "min-w-0", children: [
                /* @__PURE__ */ jsx("span", { className: "rounded bg-black/30 px-1 py-0.5 font-mono text-[12.5px] font-extrabold text-slate-200", children: step.code }),
                /* @__PURE__ */ jsx("h5", { className: "mt-0.5 truncate text-[11px] font-bold leading-snug text-white", children: step.subtitle })
                    ]
                  }),
              /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => setOpenJobCard(step.jobCard),
                      className: "flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-black/30 px-2 py-1 text-[10px] font-medium text-slate-300 transition-all hover:bg-black/50",
                      children: [
                        "Details",
                    /* @__PURE__ */ jsx(ChevronRight, { className: "h-3 w-3" })
                      ]
                    }
                  )
                  ]
                }),
            /* @__PURE__ */ jsxs("div", {
                  className: "grid grid-cols-1 gap-y-1.5 text-[13px]", children: [
              /* @__PURE__ */ jsxs("div", {
                    className: "min-w-0", children: [
                /* @__PURE__ */ jsx("span", { className: darkLabelCls, children: "Planned Qty" }),
                /* @__PURE__ */ jsx("span", { className: "block truncate text-[13.5px] font-semibold text-slate-100", children: step.qty })
                    ]
                  }),
              /* @__PURE__ */ jsxs("div", {
                    className: "grid grid-cols-2 gap-2", children: [
                /* @__PURE__ */ jsxs("div", {
                      children: [
                  /* @__PURE__ */ jsx("span", { className: `${darkLabelCls} mb-1`, children: "Process Type" }),
                  /* @__PURE__ */ jsx(
                        "select",
                        {
                          value: processType,
                          onChange: (e) => changeProcessType(step.jobCard, e.target.value),
                          className: darkSelectCls,
                          children: processTypeOptions.map((o) => /* @__PURE__ */ jsx("option", { value: o, children: o }, o))
                        }
                      )
                      ]
                    }),
                /* @__PURE__ */ jsxs("div", {
                      children: [
                  /* @__PURE__ */ jsx("span", { className: `${darkLabelCls} mb-1`, children: "Unit" }),
                  /* @__PURE__ */ jsx(
                        "select",
                        {
                          value: unitValue,
                          onChange: (e) => changeUnit(step.jobCard, e.target.value),
                          disabled: unitChoices.length === 1,
                          className: `${darkSelectCls} border-sky-700 bg-black/30 disabled:cursor-not-allowed disabled:opacity-80`,
                          children: unitChoices.map((o) => /* @__PURE__ */ jsx("option", { value: o, children: o }, o))
                        }
                      )
                      ]
                    })
                    ]
                  }),
              /* @__PURE__ */ jsxs("div", {
                    className: "min-w-0", children: [
                /* @__PURE__ */ jsx("span", { className: darkLabelCls, children: "Operation Name" }),
                /* @__PURE__ */ jsx("span", { className: "block truncate text-[13.5px] font-semibold text-slate-100", title: step.operation, children: step.operation })
                    ]
                  }),
              /* @__PURE__ */ jsxs("div", {
                    className: "min-w-0", children: [
                /* @__PURE__ */ jsx("span", { className: darkLabelCls, children: "Job Card No" }),
                /* @__PURE__ */ jsx("span", { className: "block truncate text-[13.5px] font-semibold text-slate-100", children: step.jobCard })
                    ]
                  }),
              /* @__PURE__ */ jsxs("div", {
                    className: "min-w-0", children: [
                /* @__PURE__ */ jsx("span", { className: darkLabelCls, children: "Job Card Status" }),
                /* @__PURE__ */ jsx("span", { className: "mt-0.5 inline-block rounded-full border border-blue-900 bg-blue-950 px-2.5 py-1 text-[10px] font-bold text-blue-300", children: "Open" })
                    ]
                  })
                  ]
                })
                ]
              })
            },
            step.jobCard
          );
        })
      }),
      openStep && /* @__PURE__ */ jsx(
        RoutingDetailsModal,
        {
          step: openStep,
          initial: details[openStep.jobCard],
          onClose: () => setOpenJobCard(null),
          onSave: (d) => {
            setDetails((prev) => ({ ...prev, [openStep.jobCard]: d }));
            setOpenJobCard(null);
          }
        },
        openStep.jobCard
      )
    ]
  });
};
const StockOrderConfigurationDesk = ({ onBack, onSaveOrder }) => {
  const [activeStep, setActiveStep] = useState(1);
  const stage1Ref = useRef(null);
  const [routingContext, setRoutingContext] = useState(null);
  const title = useTypewriter("Create Stock Order Planning", true);
  const routingTitle = useTypewriter("Manufacturing Routing", activeStep === 2, 42);
  return /* @__PURE__ */ jsxs("div", {
    className: "min-h-full bg-slate-50 p-1", children: [
    /* @__PURE__ */ jsx("style", {
      children: `
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
            ` }),
    /* @__PURE__ */ jsxs(Fragment, {
        children: [
      /* @__PURE__ */ jsxs("div", {
          className: "relative flex w-full flex-wrap items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm md:px-7 md:py-6", children: [
        /* @__PURE__ */ jsxs("div", {
            children: [
          /* @__PURE__ */ jsxs("nav", {
              className: "mb-3 flex items-center gap-2 text-[13px] font-semibold text-slate-500", children: [
            /* @__PURE__ */ jsx("span", { className: "scd-fade", children: "Stock Order Planning" }),
            /* @__PURE__ */ jsx(ChevronRight, { className: "h-3.5 w-3.5 text-slate-400" }),
            /* @__PURE__ */ jsx("span", { className: "scd-fade", style: { animationDelay: "120ms" }, children: "Stock Orders" }),
            /* @__PURE__ */ jsx(ChevronRight, { className: "h-3.5 w-3.5 text-slate-400" }),
            /* @__PURE__ */ jsx(
                "span",
                {
                  className: "scd-fade font-bold text-slate-900",
                  style: { animationDelay: "240ms" },
                  children: "Planning Configuration Desk"
                }
              ),
                activeStep === 2 && /* @__PURE__ */ jsxs(Fragment, {
                  children: [
              /* @__PURE__ */ jsx(ChevronRight, { className: "h-3.5 w-3.5 text-slate-400" }),
              /* @__PURE__ */ jsx("span", { className: "scd-fade font-bold text-purple-800", children: "Routing & Allocation" })
                  ]
                })
              ]
            }),
          /* @__PURE__ */ jsxs("h1", {
              className: "min-h-[42px] whitespace-nowrap text-[32px] font-extrabold tracking-[-0.02em] text-gray-950", children: [
                title.shown,
                !title.done && /* @__PURE__ */ jsx("span", { className: "scd-caret ml-0.5 text-purple-800", children: "|" })
              ]
            })
            ]
          }),
            title.done && /* @__PURE__ */ jsxs("div", {
              className: "scd-fade flex flex-wrap items-center gap-4", children: [
          /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    if (activeStep === 2) {
                      setActiveStep(1);
                      return;
                    }
                    const draft = stage1Ref.current?.getDraft();
                    if (draft) onSaveOrder?.(draft);
                    onBack();
                  },
                  className: "flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-300 px-3 py-3 text-[13px] font-bold text-slate-700 transition-colors hover:bg-slate-100",
                  children: /* @__PURE__ */ jsx(Undo2, { className: "h-6 w-6" })
                }
              ),
          /* @__PURE__ */ jsx("div", {
                className: "flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2", children: configSteps.map((s, i) => {
                  const active = activeStep === s.id;
                  return /* @__PURE__ */ jsxs(React.Fragment, {
                    children: [
                      i > 0 && /* @__PURE__ */ jsx(ChevronRight, { className: "h-3.5 w-3.5 text-slate-300" }),
              /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          disabled: activeStep === 1 && s.id === 2,
                          "aria-disabled": activeStep === 1 && s.id === 2,
                          onClick: () => {
                            if (!(activeStep === 1 && s.id === 2)) {
                              setActiveStep(s.id);
                            }
                          },
                          className: `flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all ${active ? "border border-slate-200 bg-white text-purple-900 shadow-sm" : activeStep === 1 && s.id === 2 ? "cursor-not-allowed text-slate-300 opacity-60" : "text-slate-500 hover:text-slate-700"}`,
                          children: [
                    /* @__PURE__ */ jsx(
                            "span",
                            {
                              className: `flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${active ? "bg-purple-800 text-white" : "bg-slate-200 text-slate-600"}`,
                              children: s.id
                            }
                          ),
                            s.label
                          ]
                        }
                      )
                    ]
                  }, s.id);
                })
              })
              ]
            })
          ]
        }),
          title.done && /* @__PURE__ */ jsxs(
            "div",
            {
              className: `${activeStep === 1 ? "scd-fade" : "hidden"} relative z-20 mt-4 overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm`,
              "aria-hidden": activeStep !== 1,
              children: [
            /* @__PURE__ */ jsxs("div", {
                className: "rounded-t-2xl bg-[#111527] px-8 py-5", children: [
              /* @__PURE__ */ jsx("h2", { className: "text-[24px] font-extrabold tracking-[-0.01em] text-white", children: "Stage 1: Stock Order Master Planning & Configuration" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm font-medium text-slate-400", children: "Integrated Live Database" })
                ]
              }),
            /* @__PURE__ */ jsx(
                Stage1Form,
                {
                  apiRef: stage1Ref,
                  onProceed: (data) => {
                    setRoutingContext(data);
                    setActiveStep(2);
                  },
                  onSchedule: (order) => {
                    onSaveOrder?.(order);
                    onBack();
                  }
                }
              )
              ]
            }
          ),
          title.done && activeStep === 2 && /* @__PURE__ */ jsxs("div", {
            className: "scd-route-enter mt-4 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", {
              className: "flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#55575e] px-8 py-6 shadow-sm", children: [
          /* @__PURE__ */ jsxs("div", {
                children: [
            /* @__PURE__ */ jsx("span", { className: "inline-block rounded-md border border-white/25 bg-white/10 px-3 py-1 text-[17px] font-extrabold text-white", children: "Stage 2 of 2" }),
            /* @__PURE__ */ jsxs(
                  "h2",
                  {
                    className: "mt-1 min-h-[41px] text-[34px] font-extrabold leading-tight tracking-[-0.02em] text-white",
                    "aria-live": "polite",
                    children: [
                      routingTitle.shown,
                      !routingTitle.done && /* @__PURE__ */ jsx("span", { className: "scd-caret ml-1 text-white", children: "|" })
                    ]
                  }
                ),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm font-medium text-slate-200", children: "Integrated Live Database" })
                ]
              }),
          /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => void 0,
                  className: "flex items-center gap-2.5 rounded-xl bg-[#1a7fd4] px-6 py-3 text-[13px] font-extrabold text-white shadow-sm transition-colors hover:bg-[#1670bd]",
                  children: [
                /* @__PURE__ */ jsx(FileCheck, { className: "h-4 w-4" }),
                    "Release Work Order to Shop Floor"
                  ]
                }
              )
              ]
            }),
        /* @__PURE__ */ jsxs("div", {
              className: "rounded-2xl border border-slate-200 bg-white shadow-sm", children: [
          /* @__PURE__ */ jsxs("div", {
                className: "flex items-center gap-3 px-6 py-5", children: [
            /* @__PURE__ */ jsx(Cpu, { className: "h-7 w-7 text-purple-800", strokeWidth: 1.75 }),
            /* @__PURE__ */ jsx("h3", { className: "text-[20px] font-extrabold tracking-tight text-slate-800", children: "Manufacturing Routing Steps" })
                ]
              }),
          /* @__PURE__ */ jsx("div", { className: "px-6 pb-6", children: /* @__PURE__ */ jsx(RoutingStepsGrid, { context: routingContext }) })
              ]
            })
            ]
          })
        ]
      })
    ]
  });
};
const StockOrderPlanning = () => {
  const [view, setView] = useState("main");
  const [orders, setOrders] = useState([]);
  const saveOrder = (order) => setOrders((prev) => [order, ...prev.filter((o) => o.number !== order.number)]);
  const deleteOrder = (number) => setOrders((prev) => prev.filter((o) => o.number !== number));
  if (view === "config") {
    return /* @__PURE__ */ jsx(StockOrderConfigurationDesk, { onBack: () => setView("main"), onSaveOrder: saveOrder });
  }
  return /* @__PURE__ */ jsxs("div", {
    className: "h-full bg-slate-50", children: [
    /* @__PURE__ */ jsx("div", {
      className: "w-full px-1 pt-1", children: /* @__PURE__ */ jsxs(
        "div",
        {
          className: "relative w-full rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm md:px-7 md:py-6",
          id: "page-heading-card",
          children: [
          /* @__PURE__ */ jsxs(
            "nav",
            {
              className: "mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500",
              id: "breadcrumb-trail",
              children: [
                /* @__PURE__ */ jsx("span", { className: "text-[18px] text-slate-600", children: "PPC" }),
                /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4 text-slate-400" }),
                /* @__PURE__ */ jsx("span", { className: "text-[18px] text-slate-600", children: "Stock Order Planning" })
              ]
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "flex items-center", children: /* @__PURE__ */ jsx("h1", { className: "whitespace-nowrap font-sans text-[28px] font-extrabold tracking-[-0.02em] text-gray-950", children: "Make to Stock Management Console" }) })
          ]
        }
      )
    }),
    /* @__PURE__ */ jsxs("div", {
      className: "grid w-full grid-cols-1 items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_16rem]", children: [
      /* @__PURE__ */ jsxs("div", {
        className: "mt-6 flex min-w-0 flex-col gap-4", children: [
        /* @__PURE__ */ jsxs("div", {
          className: "grid min-w-0 grid-cols-1 gap-4 md:grid-cols-4", children: [
          /* @__PURE__ */ jsx("div", {
            className: "group relative h-[205px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 p-6 text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:border-slate-300", children: /* @__PURE__ */ jsxs("div", {
              className: "flex items-start justify-between", children: [
            /* @__PURE__ */ jsxs("div", {
                children: [
              /* @__PURE__ */ jsx("p", { className: "text-[13px] font-bold uppercase tracking-wider text-slate-500", children: "Total Stock Orders" }),
              /* @__PURE__ */ jsx("p", { className: "mt-4 text-6xl font-light tracking-tight text-slate-800", children: orders.length })
                ]
              }),
            /* @__PURE__ */ jsx("span", { className: "flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-transform duration-300 group-hover:rotate-12 group-hover:bg-white group-hover:shadow-sm", children: /* @__PURE__ */ jsx(ArrowDown, { className: "h-4 w-4 rotate-[-45deg]" }) })
              ]
            })
          }),
          /* @__PURE__ */ jsxs("div", {
            className: "group relative h-[205px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 p-6 text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:border-slate-300", children: [
            /* @__PURE__ */ jsxs("div", {
              className: "flex items-start justify-between", children: [
              /* @__PURE__ */ jsxs("div", {
                children: [
                /* @__PURE__ */ jsx("p", { className: "text-[13px] font-bold uppercase tracking-wider text-slate-500", children: "Released Stock Orders" }),
                /* @__PURE__ */ jsx("p", { className: "mt-4 text-6xl font-light tracking-tight text-slate-800", children: orders.filter((o) => o.status === "Released").length })
                ]
              }),
              /* @__PURE__ */ jsx("span", { className: "flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-transform duration-300 group-hover:rotate-12 group-hover:bg-white group-hover:shadow-sm", children: /* @__PURE__ */ jsx(ArrowDown, { className: "h-4 w-4 rotate-[-45deg]" }) })
              ]
            }),
            /* @__PURE__ */ jsxs("div", {
              className: "absolute bottom-5 left-6 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 text-slate-500 text-xs", children: "\u2197" }),
              /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-slate-500", children: "Released Orders" })
              ]
            })
            ]
          })
          ]
        }),
        /* @__PURE__ */ jsxs("div", {
          className: "grid w-410 grid-cols-1 gap-4 md:grid-cols-2", children: [
          /* @__PURE__ */ jsx("div", { className: "min-w-0 md:col-span-1", children: /* @__PURE__ */ jsx(StockOrderChart, {}) }),
          /* @__PURE__ */ jsx("div", { className: "w-200 md:col-span-1", children: /* @__PURE__ */ jsx(ChartPieInteractive, {}) })
          ]
        })
        ]
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "relative flex justify-end pt-10", children: [
        /* @__PURE__ */ jsxs("div", {
          className: "absolute top-0 left-1/2 -translate-x-1/2 z-0 flex flex-col items-center", children: [
          /* @__PURE__ */ jsx("div", { className: "h-1.5 w-16 rounded-full bg-slate-700 shadow-sm" }),
          /* @__PURE__ */ jsx("div", { className: "mt-[-3px] h-3 w-3 rounded-full bg-slate-800 border-2 border-slate-500 shadow" }),
          /* @__PURE__ */ jsx("div", { className: "h-8 w-[3px] bg-gradient-to-b from-slate-700 to-slate-500 rounded-full" })
          ]
        }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: () => setView("config"),
            className: "group relative z-10 flex h-[176px] w-full flex-col justify-between rounded-xl border border-slate-200 bg-white px-6 py-6 text-left shadow-lg transition-all duration-300 ease-out rotate-[2.5deg] origin-top hover:-translate-y-1 hover:rotate-[1deg] hover:scale-[1.02] hover:shadow-xl cursor-pointer",
            title: "Open Stock Order Console",
            children: [
              /* @__PURE__ */ jsx("div", { className: "absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-slate-200 border border-slate-400 shadow-inner" }),
              /* @__PURE__ */ jsx("h2", { className: "mt-1 text-[28px] font-extrabold tracking-tight text-slate-900 transition-transform duration-300 group-hover:scale-[1.02] origin-left", children: "Stock Orders" }),
              /* @__PURE__ */ jsxs("p", {
              className: "mt-2 text-[13px] font-bold text-slate-500 leading-relaxed", children: [
                "Manage Make-to-Stock (MTS) Stock Orders",
                /* @__PURE__ */ jsx("br", {}),
                /* @__PURE__ */ jsx("span", { className: "text-indigo-500 group-hover:text-indigo-600 transition-colors", children: "+ Add New Stock Order" })
              ]
            })
            ]
          }
        )
        ]
      })
      ]
    }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 pb-6", children: /* @__PURE__ */ jsx(StockOrdersTable, { orders, onDelete: deleteOrder }) })
    ]
  });
};
export default StockOrderPlanning;
