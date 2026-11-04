import React, {
    useState,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import {
    ChevronRight,
    ChevronDown,
    Eye,
    Factory,
    Boxes,
    ArrowDown,
    ChevronLeft,
    X,
    Search,
} from 'lucide-react';
const API_BASE = import.meta.env?.VITE_API_URL || '';

async function fetchSaleOrders() {
    const res = await fetch(`${API_BASE}/api/sale-orders`);
    if (!res.ok) throw new Error('Failed to load sale orders');
    return res.json();
}

async function fetchSaleOrderSummary() {
    const res = await fetch(`${API_BASE}/api/sale-orders/summary`);
    if (!res.ok) throw new Error('Failed to load sale order summary');
    return res.json();
}

// Logo width comes from the DB as e.g. "w-[88px]". Tailwind can't see classes that
// only exist in server data, so apply the width inline (same size as before).
const logoWidthStyle = (logoWidth) => {
    const m = String(logoWidth || '').match(/(\d+(?:\.\d+)?)/);
    return { width: `${m ? m[1] : 88}px` };
};

// Convert the selected SO line(s) into the shape CardPlanning.jsx expects.
// Original SO fields are kept too, so any existing parent handler keeps working.
function buildPlanningPayload(cards) {
    const first = cards[0];
    const total = cards.reduce((sum, c) => sum + Number(c.quantity || 0), 0);
    return {
        ...first,
        quantity: total,
        selectedLines: cards,
        // CardPlanning fields
        fgItemCode: first.partNo,
        fgItemName: first.partDescription,
        itemType: first.itemType || 'Customer_PO',
        drawingRev: first.drawingRev || '',
        cardCode: first.cardCode || '',
        cardName: first.customerName || '',
        orderType: 'For Order (Sales)',
        orderedQty: total,
        plannedQty: total,
        openQty: first.openQty,
        pendingQty: first.pendingQty,
        unit: '',
        status: 'Planned',
        priority: 'Normal',
        planner: '',
        remarks: '',
        projCompDate: '',
    };
}

const ALLOCATION_STYLES = {
    ALLOCATED: 'bg-green-50 text-green-700 border border-green-200',
    PARTIAL: 'bg-amber-50 text-amber-800 border border-amber-200',
    SHORTAGE: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const ALLOCATION_DOT = {
    ALLOCATED: 'bg-green-500',
    PARTIAL: 'bg-amber-500',
    SHORTAGE: 'bg-rose-500',
};

const STATUS_STYLES = {
    PLANNED: 'bg-slate-100 text-slate-600 border border-slate-200',
    RELEASED: 'bg-blue-50 text-blue-700 border border-blue-200',
    COMPLETED: 'bg-green-50 text-green-700 border border-green-200',
    CANCELLED: 'bg-gray-100 text-gray-400 border border-gray-200',
};

function ActionDropdown({ order, onViewOrder }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handle = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [open]);

    return (
        <div className="inline-flex items-center gap-1.5" ref={ref}>
            <button
                onClick={() => onViewOrder?.(order.poId)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 border border-slate-200
                    hover:bg-indigo-50 hover:border-indigo-300 text-slate-500 hover:text-indigo-600
                    transition-all duration-150 cursor-pointer"
                title="View production order details"
            >
                <Eye className="w-3.5 h-3.5" />
            </button>
            <div className="relative">
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#484f4f] hover:bg-[#3a4040]
                        text-white text-[11px] font-bold transition-all duration-150 cursor-pointer border border-[#343434]"
                >
                    <span>Proceed</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                    <div
                        className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden"
                        style={{ animation: 'dropIn 0.15s ease-out' }}
                    >
                        <button
                            onClick={() => { setOpen(false); console.log('Prod Plan', order.poId); }}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors duration-100 cursor-pointer"
                        >
                            <Factory className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                            <span>1. Prod Plan</span>
                        </button>
                        <div className="mx-3 h-px bg-slate-100" />
                        <button
                            onClick={() => { setOpen(false); console.log('Make to Stock', order.poId); }}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors duration-100 cursor-pointer"
                        >
                            <Boxes className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                            <span>2. Make to Stock</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function SOLoadPlanningPage({ onBack, onProceedToPlanning }) {
    const [selectedSO, setSelectedSO] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState('all');

    const [dispatchFilter, setDispatchFilter] = useState('All Dispatches');

    // Sale orders come from the database (public.sale_orders)
    const [saleOrders, setSaleOrders] = useState([]);
    const [loadingSO, setLoadingSO] = useState(true);
    const [soError, setSoError] = useState('');

    useEffect(() => {
        let active = true;
        fetchSaleOrders()
            .then((rows) => { if (active) setSaleOrders(rows); })
            .catch((e) => { if (active) setSoError(e.message); })
            .finally(() => { if (active) setLoadingSO(false); });
        return () => { active = false; };
    }, []);

    // -----------------------------------------------------------
    // Multi-PO selection toast state
    // -----------------------------------------------------------
    const [multiPoPrompt, setMultiPoPrompt] = useState(null); // { matches, selectedIds }
    const [successToast, setSuccessToast] = useState(null); // { count, total, poNumber }
    const navTimerRef = useRef(null);

    // Clear any pending navigation timer when the page unmounts
    useEffect(() => {
        return () => {
            if (navTimerRef.current) clearTimeout(navTimerRef.current);
        };
    }, []);

    // Same Customer PO + Customer Name + Ship Date
    const findSiblingPOs = (so) =>
        saleOrders.filter(
            (c) =>
                c.poNumber === so.poNumber &&
                c.customerName === so.customerName &&
                c.shipDate === so.shipDate
        );

    const proceedWith = (cards) => {
        // Only PO Quantity is added up. Open Qty and Pending Qty stay the same
        // because all the selected lines are the same part.
        const payload = buildPlanningPayload(cards);
        const total = payload.quantity;

        setMultiPoPrompt(null);
        setSuccessToast({
            count: cards.length,
            total,
            poNumber: cards[0].poNumber,
            cards,
        });

        // Let the success toast be seen before navigating
        if (navTimerRef.current) clearTimeout(navTimerRef.current);
        navTimerRef.current = setTimeout(() => {
            setSuccessToast(null);
            onProceedToPlanning?.(payload);
        }, 1500);
    };

    const handleProceedClick = () => {
        if (!selectedSO) return;
        const siblings = findSiblingPOs(selectedSO);

        if (siblings.length > 1) {
            setMultiPoPrompt({ matches: siblings, selectedIds: [selectedSO.id] });
        } else {
            // Only one PO: go straight to planning, no toast, no delay
            onProceedToPlanning?.(buildPlanningPayload([selectedSO]));
        }
    };

    const toggleSelectedPO = (id) =>
        setMultiPoPrompt((prev) =>
            prev
                ? {
                    ...prev,
                    selectedIds: prev.selectedIds.includes(id)
                        ? prev.selectedIds.filter((x) => x !== id)
                        : [...prev.selectedIds, id],
                }
                : prev
        );

    const confirmSelectedPOs = () => {
        if (!multiPoPrompt) return;
        const chosen = multiPoPrompt.matches.filter((c) =>
            multiPoPrompt.selectedIds.includes(c.id)
        );
        if (chosen.length) proceedWith(chosen);
    };

    const filteredSOs = useMemo(() => {
        const query = searchTerm.toLocaleLowerCase();

        return saleOrders.filter((card) => {
            // -----------------------------------------
            // Search filter
            // -----------------------------------------
            const matchesSearch = !query
                ? true
                : (
                    searchField === 'all'
                        ? [card.customerName, card.poNumber, card.partNo]
                        : [card[searchField]]
                ).some((value) =>
                    String(value || '').toLocaleLowerCase().includes(query)
                );

            // -----------------------------------------
            // Dispatch filter
            // -----------------------------------------
            const matchesDispatch =
                dispatchFilter === 'All Dispatches'
                    ? true
                    : card.modeOfDispatch === dispatchFilter;

            return matchesSearch && matchesDispatch;
        });
    }, [saleOrders, searchField, searchTerm, dispatchFilter]);

    useEffect(() => {
        if (selectedSO && !filteredSOs.some((card) => card.id === selectedSO.id)) {
            setSelectedSO(null);
        }
    }, [filteredSOs, selectedSO]);

    // Close the multi-PO toast if the user picks a different card / closes the panel
    useEffect(() => {
        setMultiPoPrompt(null);
    }, [selectedSO?.id]);

    return (
        <div
            className="min-h-[calc(100vh-120px)] rounded-3xl bg-gradient-to-br from-[#f5f8ee] via-[#eef3f4] to-[#e9eff7] p-4 md:p-6"
            id="so-load-planning-placeholder"
        >
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInSoft {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-28px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes logoBlink {
                    0%   { opacity: 0; transform: scale(0.65); }
                    35%  { opacity: 1; transform: scale(1.18); }
                    60%  { opacity: 0.55; transform: scale(0.92); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes cardEntrance {
                    from { opacity: 0; transform: translateY(18px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes panelSlideIn {
                    from { opacity: 0; transform: translateX(40px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                .so-breadcrumb { animation: fadeInSoft 0.4s ease-out both; }
                .so-title { animation: fadeSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
                .so-card { animation: cardEntrance 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
                .so-card-title { animation: slideInLeft 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
                .so-card-label { animation: slideInLeft 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
                .so-card-logo { animation: logoBlink 0.85s ease-out both; }
                .so-detail-panel { animation: panelSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
                .so-detail-title { animation: slideInLeft 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
                .so-detail-label { animation: slideInLeft 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
                .so-detail-logo { animation: logoBlink 0.9s ease-out 0.15s both; }
                .so-card:nth-child(1)  { animation-delay: 0.05s; }
                .so-card:nth-child(2)  { animation-delay: 0.10s; }
                .so-card:nth-child(3)  { animation-delay: 0.15s; }
                .so-card:nth-child(4)  { animation-delay: 0.20s; }
                .so-card:nth-child(5)  { animation-delay: 0.25s; }
                .so-card:nth-child(6)  { animation-delay: 0.30s; }
                .so-card:nth-child(7)  { animation-delay: 0.35s; }
                .so-card:nth-child(8)  { animation-delay: 0.40s; }
                .so-card:nth-child(9)  { animation-delay: 0.45s; }
                .so-card:nth-child(10) { animation-delay: 0.50s; }
                .so-card:nth-child(11) { animation-delay: 0.55s; }
                .so-card:nth-child(12) { animation-delay: 0.60s; }
                .so-card:nth-child(13) { animation-delay: 0.65s; }
                .so-card:nth-child(14) { animation-delay: 0.70s; }
                .so-card:nth-child(15) { animation-delay: 0.75s; }
                .so-card:nth-child(16) { animation-delay: 0.80s; }
                .so-card:nth-child(17) { animation-delay: 0.85s; }
                .so-card:nth-child(18) { animation-delay: 0.90s; }
                .so-card:nth-child(19) { animation-delay: 0.95s; }
                .so-card:nth-child(20) { animation-delay: 1.00s; }
                .so-card:nth-child(21) { animation-delay: 1.05s; }
                .so-card:nth-child(22) { animation-delay: 1.10s; }

                .production-plan-button {
             -webkit-tap-highlight-color: transparent;
               background-color: #333;
             border: 0;
                border-radius: 8px;
                color: #e1e1e1;
              cursor: pointer;
            font-family: inherit;
            font-size: 16px;        
             font-weight: 800;
            margin: 0;
            overflow: hidden;
            outline: none;
           padding: 0.55em 1em; 
           position: relative;
            display: flex;
            align-items: center;
               justify-content: center;
            gap: 6px;
              text-decoration: none;
             text-transform: uppercase;
                    transition: color 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
                      z-index: 0;
                    width: 60%;
            }
                .production-plan-button:hover,
                .production-plan-button:focus { color: #fff; }
                .production-plan-button::after {
                    content: "";
                    pointer-events: none;
                    bottom: 8px;
                    left: 50%;
                    position: absolute;
                    width: 0%;
                    height: 2px;
                    background-color: #fff;
                    transition: width 400ms cubic-bezier(0.25, 0.8, 0.25, 1),
                                left 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                .production-plan-button:hover::after,
                .production-plan-button:focus::after {
                    width: 70%;
                    left: 15%;
                }
            `}</style>

            {/* Page Header */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5 mb-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="group inline-flex items-center justify-center rounded-xl border border-slate-200
                                bg-white px-1 py-3 text-slate-600 shadow-sm
                                transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-lg cursor-pointer"
                            title="Back to Production Orders"
                        >
                            <ChevronLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
                        </button>
                        <div>
                            <div className="so-breadcrumb flex items-center gap-1.5 text-lg font-bold text-slate-400">
                                <span>PPC</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                <span>Sale Order List</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-slate-500">Console</span>
                            </div>
                            <h1 className="so-title mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
                                Sale Order Management Console
                            </h1>
                        </div>
                    </div>
                    <form
                        role="search"
                        onSubmit={(e) => {
                            e.preventDefault();
                            setSearchTerm(searchInput.trim());
                        }}
                        className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-2xl"
                    >
                        <div className="flex flex-wrap items-center justify-end gap-3 w-full">
                            <div className="flex min-w-0 flex-1 lg:flex-none lg:w-80 items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-4 py-1.5 shadow-inner shadow-slate-100 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="h-5 w-px shrink-0 bg-slate-200" />
                                <input
                                    type="search"
                                    value={searchInput}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearchInput(value);
                                        setSearchTerm(value.trim());
                                    }}
                                    placeholder="Search customer, PO no..."
                                    className="min-w-0 flex-1 border-0 bg-transparent py-1 text-[13px] font-semibold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium focus:ring-0"
                                />

                                {searchInput && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchInput('');
                                            setSearchTerm('');
                                        }}
                                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="relative w-full sm:w-auto">
                                <select
                                    value={dispatchFilter}
                                    onChange={(e) =>
                                        setDispatchFilter(e.target.value)
                                    }
                                    className="
                    w-full sm:w-[158px]
                    appearance-none
                    rounded-full
                    border border-slate-200
                    bg-white
                    px-5 py-2.5 pr-9
                    text-[13px]
                    font-bold
                    text-slate-700
                    shadow-sm
                    outline-none
                    cursor-pointer
                    transition-all duration-200
                    hover:border-indigo-300
                    focus:border-indigo-400
                    focus:ring-4
                    focus:ring-indigo-500/10">
                                    <option value="All Dispatches">
                                        All Dispatches
                                    </option>

                                    <option value="Air">
                                        Air
                                    </option>

                                    <option value="Sea">
                                        Sea
                                    </option>

                                    <option value="Road">
                                        Road
                                    </option>
                                </select>

                                {/* Dropdown arrow */}
                                <ChevronDown
                                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                />
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Main content */}
            <div className={`flex flex-col gap-5 lg:flex-row ${selectedSO ? 'items-start' : ''}`}>
                {/* LEFT – Cards Grid */}
                <div className={`grid gap-4 transition-all duration-500 ease-out ${selectedSO ? 'grid-cols-1 md:grid-cols-2 w-full lg:w-1/2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 w-full'}`}>
                    {loadingSO ? (
                        <div className="col-span-full rounded-2xl border border-slate-200 bg-white/70 px-6 py-12 text-center">
                            <p className="text-base font-bold text-slate-600">Loading sale orders…</p>
                        </div>
                    ) : soError ? (
                        <div className="col-span-full rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
                            <p className="text-base font-bold text-rose-700">Could not load sale orders</p>
                            <p className="mt-1 text-sm text-rose-600">{soError}</p>
                        </div>
                    ) : filteredSOs.length > 0 ? (
                        filteredSOs.map((card, index) => (
                            <div
                                key={card.id}
                                onClick={() => setSelectedSO(card)}
                                className={`so-card rounded-2xl inline-flex border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-lg cursor-pointer ${selectedSO?.id === card.id ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-200'}`}
                                style={{ animationDelay: `${0.05 + index * 0.05}s` }}
                            >
                                <div>
                                    <h3 className="so-card-title text-[15px] font-extrabold text-slate-800">Cust. PO No:{card.poNumber}</h3>
                                    <div className="mt-3 h-[48px] flex items-center">
                                        <img src={card.logoSrc} alt={card.logoAlt} className="so-card-logo h-auto object-contain" style={logoWidthStyle(card.logoWidth)} />
                                    </div>
                                </div>
                                <div className="mt-1 ml-6 space-y-2 text-xs font-semibold text-slate-600">
                                    <label className="so-card-label text-[13px] font-bold flex items-center gap-2">Customer Name : {card.customerName}</label>
                                    <label className="so-card-label text-[13px] font-bold flex items-center gap-2">Part No : {card.partNo}</label>
                                    <label className="so-card-label text-[13px] font-bold flex items-center gap-2">PO Quantity : {card.quantity}</label>
                                    <label className="so-card-label text-[13px] font-bold flex items-center gap-2">Ship Date : {card.shipDate}</label>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
                            <p className="text-base font-bold text-slate-700">No sale orders found</p>
                            <p className="mt-1 text-sm text-slate-500">Try a different customer name, customer PO number, or part number.</p>
                        </div>
                    )}
                </div>

                {/* RIGHT – Detail Panel */}
                {selectedSO && (
                    <div className="so-detail-panel w-full lg:w-1/2 sticky top-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg relative min-h-[480px]">
                            <button
                                onClick={() => setSelectedSO(null)}
                                className="absolute top-4 right-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-200 hover:bg-red-300 text-slate-700 hover:text-red-800 transition-all duration-500 cursor-pointer border border-slate-200 hover:border-red-200 z-10"
                                title="Close details"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(88px,140px)] gap-x-5 gap-y-6 pr-12">
                                <div className="min-w-0">
                                    <h2 className="so-detail-title break-words text-xl font-extrabold text-slate-900">
                                        Cust. PO No: {selectedSO.poNumber}
                                    </h2>
                                    <p className="mt-1 text-sm font-medium text-slate-500">Sale Order Details</p>

                                    <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
                                        {/* Customer Name */}
                                        <div className="so-detail-label min-w-0">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">Customer Name</p>
                                            <p className="break-words text-[17px] font-bold leading-snug text-slate-800">{selectedSO.customerName}</p>
                                        </div>

                                        {/* Card Code – beside Customer Name */}
                                        <div className="so-detail-label min-w-0">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">Card Code</p>
                                            <p className="text-[17px] font-bold text-slate-800">{selectedSO.cardCode || '—'}</p>
                                        </div>

                                        {/* Item Type */}
                                        <div className="so-detail-label min-w-0">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">Item Type</p>
                                            <p className="text-[17px] font-bold text-slate-800">{selectedSO.itemType || 'Customer_PO'}</p>
                                        </div>

                                        {/* PO Date */}
                                        <div className="so-detail-label min-w-0">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">PO Date</p>
                                            <p className="text-[17px] font-bold text-slate-800">{selectedSO.poDate || '12/11/2026'}</p>
                                        </div>

                                        {/* Ship Date */}
                                        <div className="so-detail-label min-w-0">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">Ship Date</p>
                                            <p className="text-[17px] font-bold text-slate-800">{selectedSO.shipDate}</p>
                                        </div>

                                        {/* PO Line ID */}
                                        <div className="so-detail-label min-w-0">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">PO Line ID</p>
                                            <p className="text-[17px] font-bold text-slate-800">{selectedSO.poLineId}</p>
                                        </div>

                                        {/* Part No */}
                                        <div className="so-detail-label min-w-0">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">Part No</p>
                                            <p className="break-words text-[17px] font-bold text-slate-800">{selectedSO.partNo}</p>
                                        </div>

                                        {/* Part Description */}
                                        <div className="so-detail-label min-w-0">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">Part Description</p>
                                            <p className="break-words text-[17px] font-bold text-slate-800">{selectedSO.partDescription}</p>
                                        </div>

                                        {/* Drawing Revision – beside Part Description */}
                                        <div className="so-detail-label min-w-0">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">Drawing Revision</p>
                                            <p className="text-[17px] font-bold text-slate-800">{selectedSO.drawingRev?.replace(/^Rev\s*/i, '').trim().split(/\s+/)[0] || '—'}</p>
                                        </div>

                                        {/* Dock Date */}
                                        <div className="so-detail-label min-w-0">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">Dock Date</p>
                                            <p className="text-[17px] font-bold text-slate-800">{selectedSO.dockDate}</p>
                                        </div>

                                        {/* Mode of Dispatch */}
                                        <div className="so-detail-label min-w-0">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">Mode of Dispatch</p>
                                            <p className="text-[17px] font-bold text-slate-800">{selectedSO.modeOfDispatch}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex min-w-0 items-start justify-center pt-1">
                                    <img
                                        src={selectedSO.logoSrc}
                                        alt={selectedSO.logoAlt}
                                        className="so-detail-logo h-auto max-h-[100px] w-full max-w-[140px] object-contain"
                                    />
                                </div>

                                {/* Quantities + Proceed Button */}
                                <div className="so-detail-label col-span-2 border-t border-slate-100 pt-4">
                                    <div className="grid grid-cols-5 gap-3 mb-4">
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">PO Quantity</p>
                                            <p className="text-xl font-extrabold text-slate-800">{selectedSO.quantity}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">Open Qty</p>
                                            <p className="text-xl font-extrabold text-slate-800">{selectedSO.openQty}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl">
                                            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">Pending Qty</p>
                                            <p className="text-xl font-extrabold text-slate-700">{selectedSO.pendingQty}</p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleProceedClick}
                                        className="production-plan-button"
                                    >
                                        <span className="production-plan-button__label">Proceed to Planning</span>
                                        <span className="production-plan-button__icon" aria-hidden="true">
                                            <ChevronRight className="w-6 h-6" />
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Multi-PO selection toast – bottom right */}
            {multiPoPrompt && (
                <div
                    className="fixed bottom-14 right-14 z-[100] w-[480px] max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-200 bg-white shadow-2xl"
                    style={{ animation: 'panelSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both' }}
                    role="alertdialog"
                >
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-extrabold text-slate-900">
                                    Multiple POs found
                                </p>
                                <span
                                    className="inline-flex min-w-[26px] items-center justify-center rounded-full bg-green-600 px-2 py-0.5 text-xs font-extrabold text-white"
                                    style={{ animation: 'logoBlink 0.7s ease-out 0.1s both' }}
                                    title="Number of POs"
                                >
                                    {multiPoPrompt.matches.length}
                                </span>
                            </div>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                                Cust. PO <b>{multiPoPrompt.matches[0].poNumber}</b> has{' '}
                                {multiPoPrompt.matches.length} entries with the same customer
                                and ship date. Select the required PO(s).
                            </p>
                        </div>
                        <button
                            onClick={() => setMultiPoPrompt(null)}
                            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer" title="Cancel"><X className="h-4 w-4" /></button>
                    </div>

                    <div className="max-h-[420px] space-y-3 overflow-y-auto px-5 py-3">
                        {multiPoPrompt.matches.map((c, i) => {
                            const checked = multiPoPrompt.selectedIds.includes(c.id);
                            return (
                                <div
                                    key={c.id}
                                    style={{
                                        // "backwards" (not "both") so the hover transform still works after the entrance
                                        animation: `cardEntrance 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${0.25 + i * 0.15}s backwards`,
                                    }}
                                    onClick={() => toggleSelectedPO(c.id)}
                                    className={`relative flex cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${checked
                                        ? 'border-green-400 ring-2 ring-green-200'
                                        : 'border-slate-200 hover:border-green-200'
                                        }`}
                                >
                                    <div className="shrink-0">
                                        <h3 className="text-[15px] font-extrabold text-slate-800">
                                            Cust. PO No:{c.poNumber}
                                        </h3>
                                        <div className="mt-3 flex h-[48px] items-center">
                                            <img
                                                src={c.logoSrc}
                                                alt={c.logoAlt}
                                                className="h-auto object-contain"
                                                style={logoWidthStyle(c.logoWidth)}
                                            />
                                        </div>
                                    </div>
                                    <div className="ml-5 mt-1 min-w-0 space-y-2 text-xs font-semibold text-slate-600">
                                        <p className="text-[13px] font-bold">Customer Name : {c.customerName}</p>
                                        <p className="text-[13px] font-bold">Part No : {c.partNo}</p>
                                        <p className="text-[13px] font-bold">PO Quantity : {c.quantity}</p>
                                        <p className="text-[13px] font-bold">Ship Date : {c.shipDate}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                        <p className="text-2xs font-bold text-slate-500">
                            Total Qty:{' '}
                            <span className="text-slate-900">
                                {multiPoPrompt.matches
                                    .filter((c) => multiPoPrompt.selectedIds.includes(c.id))
                                    .reduce((s, c) => s + Number(c.quantity || 0), 0)}
                            </span>
                        </p>
                        <button
                            onClick={confirmSelectedPOs}
                            disabled={multiPoPrompt.selectedIds.length === 0}
                            className="rounded-lg bg-[#484f4f] px-4 py-2 text-2xs font-bold text-white transition hover:bg-[#3a4040] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                        >
                            Confirm &amp; Proceed
                        </button>
                    </div>
                </div>
            )}

            {/* Success toast – same bottom-right position */}
            {successToast && (
                <div
                    className="fixed bottom-6 right-6 z-[100] w-[480px] max-w-[calc(100vw-2rem)] rounded-2xl border border-green-200 bg-white px-5 py-4 shadow-2xl"
                    style={{ animation: 'panelSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both' }}
                    role="status"
                >
                    <p className="text-sm font-extrabold text-green-700">PO selection added</p>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                        {successToast.count} line(s) of Cust. PO {successToast.poNumber} added.
                        Total PO Quantity: <b>{successToast.total}</b>. Opening planning…
                    </p>
                    <div className="mt-3 max-h-[300px] space-y-3 overflow-y-auto">
                        {successToast.cards.map((c) => (
                            <div
                                key={c.id}
                                className="flex rounded-2xl border border-green-200 bg-green-50/40 p-4"
                            >
                                <div className="shrink-0">
                                    <h3 className="text-[15px] font-extrabold text-slate-800">
                                        Cust. PO No:{c.poNumber}
                                    </h3>
                                    <div className="mt-3 flex h-[48px] items-center">
                                        <img
                                            src={c.logoSrc}
                                            alt={c.logoAlt}
                                            className="h-auto object-contain"
                                            style={logoWidthStyle(c.logoWidth)}
                                        />
                                    </div>
                                </div>
                                <div className="ml-5 mt-1 min-w-0 space-y-2 text-xs font-semibold text-slate-600">
                                    <p className="text-[13px] font-bold">Customer Name : {c.customerName}</p>
                                    <p className="text-[13px] font-bold">Part No : {c.partNo}</p>
                                    <p className="text-[13px] font-bold">PO Quantity : {c.quantity}</p>
                                    <p className="text-[13px] font-bold">Ship Date : {c.shipDate}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------
export default function ProductionOrderList({
    onViewOrder,
    onViewSalesOrders,
    onProceedToPlanning,
    initialPage,
    onBackToProduction
}) {
    const [page, setPage] = useState(initialPage);
    const [summary, setSummary] = useState({ total: 0, completed: 0 });

    useEffect(() => { window.scrollTo({ top: 0 }); }, [page]);
    useEffect(() => {
        fetchSaleOrderSummary().then(setSummary).catch(() => { });
    }, []);

    if (page === 2) {
        return (
            <div id="production-order-page-2">
                <SOLoadPlanningPage
                    onBack={() => {
                        if (onBackToProduction) onBackToProduction();
                        else setPage(1);
                    }}
                    onProceedToPlanning={onProceedToPlanning}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6" id="production-order-dashboard-list">
            <style>{`
                @keyframes dropIn {
                    from { opacity: 0; transform: translateY(-9px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-6">
                <div className="flex items-center gap-1 text-[19px] font-bold text-slate-500">
                    <span>Orders</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">Sale Order List</span>
                </div>
                <h1 className="mt-1 text-3xl font-extrabold text-slate-900 tracking-tight">
                    Sale Order Management Console
                </h1>
            </div>

            <div className="grid w-full grid-cols-1 items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="group relative h-[205px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 p-6 text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:border-slate-300">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Total Production Orders</p>
                                <p className="mt-4 text-6xl font-light tracking-tight text-slate-800">{summary.total}</p>
                            </div>
                            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-transform duration-300 group-hover:rotate-12 group-hover:bg-white group-hover:shadow-sm">
                                <ArrowDown className="h-4 w-4 rotate-[-45deg]" />
                            </span>
                        </div>
                        <div className="absolute bottom-5 left-6 flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 text-slate-500 text-xs">↗</span>
                            <span className="text-xs font-bold text-slate-500">Active documents</span>
                        </div>
                    </div>

                    <div className="group relative h-[205px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 p-6 text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:border-slate-300">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Completed Orders</p>
                                <p className="mt-4 text-6xl font-light tracking-tight text-slate-800">{summary.completed}</p>
                            </div>
                            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-transform duration-300 group-hover:rotate-12 group-hover:bg-white group-hover:shadow-sm">
                                <ArrowDown className="h-4 w-4 rotate-[-45deg]" />
                            </span>
                        </div>
                        <div className="absolute bottom-5 left-6 flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 text-slate-500 text-xs">↗</span>
                            <span className="text-xs font-bold text-slate-500">Completed documents</span>
                        </div>
                    </div>
                </div>

                <div className="relative flex justify-end pt-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-0 flex flex-col items-center">
                        <div className="h-1.5 w-16 rounded-full bg-slate-700 shadow-sm" />
                        <div className="mt-[-3px] h-3 w-3 rounded-full bg-slate-800 border-2 border-slate-500 shadow" />
                        <div className="h-8 w-[3px] bg-gradient-to-b from-slate-700 to-slate-500 rounded-full" />
                    </div>
                    <button
                        type="button"
                        onClick={() => { if (onViewSalesOrders) onViewSalesOrders(); else setPage(2); }}
                        className="group relative z-10 flex h-[176px] w-full flex-col justify-between rounded-xl border border-slate-200 bg-white px-6 py-6 text-left shadow-lg transition-all duration-300 ease-out rotate-[2.5deg] origin-top hover:-translate-y-1 hover:rotate-[1deg] hover:scale-[1.02] hover:shadow-xl cursor-pointer"
                        title="Open Sale Order Console"
                    >
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-slate-200 border border-slate-400 shadow-inner" />
                        <h2 className="mt-1 text-[28px] font-extrabold tracking-tight text-slate-900 transition-transform duration-300 group-hover:scale-[1.02] origin-left">
                            Sale Orders
                        </h2>
                        <p className="mt-2 text-[13px] font-bold text-slate-500 leading-relaxed">
                            Logistics: Delivery dates and shipping methods.<br /><br />
                            <span className="text-indigo-500 group-hover:text-indigo-600 transition-colors">Click for more SO&apos;s ----</span>
                        </p>
                    </button>
                </div>
            </div>
        </div>
    );
}