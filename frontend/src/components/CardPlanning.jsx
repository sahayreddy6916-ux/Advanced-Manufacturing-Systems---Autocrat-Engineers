import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  MessageSquare,
  Hash,
  ArrowRight,
  Ban,
} from 'lucide-react';

import { MOCK_UNITS, MOCK_ORDER_TYPES } from '../mockData';

import AutocompleteSelect from './AutocompleteSelect';
import DatePicker from './DatePicker';

import {
  fetchFGItemsRDBMS,
  fetchPlannersRDBMS,
  saveWorkOrderRDBMS
} from '../api';

const WO_PRIORITY_OPTIONS = ['Low', 'Normal', 'High'];

// Item Type card always displays this value
const ITEM_TYPE_DISPLAY = 'PRO';

function hasLoadedDetails(wo) {
  const hasData = !!(wo.fgItemCode && wo.fgItemName);

  const fromViewAction =
    wo.status === 'Open' ||
    wo.status === 'Released' ||
    wo.status === 'Cancelled' ||
    (
      (wo.status === 'Draft' ||
        wo.status === 'Planned') &&
      hasData
    );

  return fromViewAction && hasData;
}

export default function CardPlanning({
  workOrder,
  setWorkOrder,
  onProceed,
  onDraftSaved,
  isEditMode = false,
  showToast
}) {

  const [fgItems, setFgItems] = useState([]);
  const [planners, setPlanners] = useState([]);

  const [isDetailsLoaded, setIsDetailsLoaded] = useState(() =>
    hasLoadedDetails(workOrder)
  );

  const [saving, setSaving] = useState(false);

  const [fieldErrors, setFieldErrors] = useState([]);
  const [errorAnimationKey, setErrorAnimationKey] = useState(0);

  const [scheduleFieldErrors, setScheduleFieldErrors] = useState([]);
  const [scheduleAnimationKey, setScheduleAnimationKey] = useState(0);

  const clearFieldError = (field) => {
    setFieldErrors(previousErrors =>
      previousErrors.filter(error => error !== field)
    );

    setScheduleFieldErrors(previousErrors =>
      previousErrors.filter(error => error !== field)
    );
  };

  const isCancelled = workOrder.status === 'Cancelled';
  const isReleased = workOrder.status === 'Released';
  const isLocked = isCancelled || isReleased;

  const hasSelectedFGItem = Boolean(workOrder.fgItemCode?.trim());
  const normalizedOrderType = String(workOrder.orderType ?? '').trim();
  const hasSelectedOrderType = Boolean(normalizedOrderType);

  const selectionProgress =
    hasSelectedFGItem && hasSelectedOrderType
      ? 100
      : hasSelectedFGItem || hasSelectedOrderType
        ? 50
        : 0;

  useEffect(() => {
    setIsDetailsLoaded(hasLoadedDetails(workOrder));
  }, [
    workOrder.workOrderNo,
    workOrder.status,
    workOrder.fgItemName,
    workOrder.fgItemCode
  ]);

  useEffect(() => {
    async function loadRDBMSMasters() {
      try {
        const items = await fetchFGItemsRDBMS();

        const normalizedItems = items
          .map((item) => ({
            code: String(item.code ?? item.itemno ?? '').trim(),
            name: String(item.name ?? item.item_description ?? '').trim(),
            type: String(item.type ?? item.itemtype ?? '').trim(),
            drawingRev: String(item.drawingRev ?? item.drawing_rev ?? '').trim(),
            defaultQty: Number(item.defaultQty ?? 0),
          }))
          .filter((item) => item.code !== '');

        if (
          workOrder.fgItemCode &&
          !normalizedItems.some((item) => item.code === workOrder.fgItemCode)
        ) {
          normalizedItems.unshift({
            code: workOrder.fgItemCode,
            name: workOrder.fgItemName || workOrder.fgItemCode,
            type: workOrder.itemType || 'Customer_PO',
            drawingRev: workOrder.drawingRev || '',
            defaultQty: Number(workOrder.orderedQty) || 0,
          });
        }

        setFgItems(normalizedItems);
      } catch (error) {
        console.error('Failed to load FG items', error);

        if (workOrder.fgItemCode) {
          setFgItems([
            {
              code: workOrder.fgItemCode,
              name: workOrder.fgItemName || workOrder.fgItemCode,
              type: workOrder.itemType || 'Customer_PO',
              drawingRev: workOrder.drawingRev || '',
              defaultQty: Number(workOrder.orderedQty) || 0,
            },
          ]);
        } else {
          setFgItems([]);
        }
      }

      try {
        const plannerList = await fetchPlannersRDBMS();
        if (plannerList.length > 0) {
          setPlanners(plannerList);
        }
      } catch (error) {
        console.error('Failed to load planners', error);
      }
    }

    loadRDBMSMasters();
  }, [showToast, workOrder.fgItemCode, workOrder.fgItemName]);

  const handleOrderTypeChange = (e) => {
    if (isDetailsLoaded) {
      return;
    }

    const val = e.target.value;

    setWorkOrder(prev => ({
      ...prev,
      orderType: val
    }));
  };

  const handleItemChange = (item) => {
    if (isDetailsLoaded) {
      return;
    }

    setWorkOrder(prev => ({
      ...prev,
      fgItemCode: item.code,
      fgItemName: item.name || '',
      itemType: item.type || prev.itemType || '',
      drawingRev: item.drawingRev || prev.drawingRev || '',
      orderedQty: Number(item.defaultQty || prev.orderedQty || 0)
    }));

    setIsDetailsLoaded(true);
  };

  const handleSchedule = async () => {
    const missingFields = [];

    const isBlank = (value) =>
      value === undefined ||
      value === null ||
      String(value).trim() === '';

    if (isBlank(workOrder.plannedQty) || Number(workOrder.plannedQty) <= 0) {
      missingFields.push('plannedQty');
    }

    if (isBlank(workOrder.unit)) {
      missingFields.push('unit');
    }

    if (isBlank(workOrder.projCompDate)) {
      missingFields.push('projCompDate');
    }

    if (isBlank(workOrder.planner)) {
      missingFields.push('planner');
    }

    setScheduleFieldErrors(missingFields);

    if (missingFields.length > 0) {
      setScheduleAnimationKey(key => key + 1);

      showToast(
        'Complete Required Fields',
        'warning',
        'Please complete all required fields before scheduling. Production Remarks is optional.'
      );

      return;
    }

    setSaving(true);

    try {
      setScheduleFieldErrors([]);

      const draftWorkOrder = {
        ...workOrder,
        status: 'Planned'
      };

      const success = await saveWorkOrderRDBMS(
        draftWorkOrder,
        !isEditMode
      );

      if (!success) {
        showToast(
          'Schedule Failed',
          'error',
          'The work order could not be scheduled.'
        );
        return;
      }

      showToast(
        'Work Order Scheduled',
        'success',
        `Work Order ${draftWorkOrder.workOrderNo} was saved as Planned.`
      );

      onDraftSaved();
    } catch (error) {
      console.error('Schedule failed', error);

      showToast(
        'Schedule Failed',
        'error',
        'An unexpected error occurred while scheduling the work order.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleProceedClick = async () => {
    const missingFields = [];

    const isBlank = (value) =>
      value === undefined ||
      value === null ||
      String(value).trim() === '';

    if (isBlank(workOrder.workOrderNo)) missingFields.push('workOrderNo');
    if (isBlank(workOrder.workOrderDate)) missingFields.push('workOrderDate');
    if (isBlank(workOrder.fgItemCode)) missingFields.push('fgItemCode');
    if (isBlank(workOrder.fgItemName)) missingFields.push('fgItemName');
    if (isBlank(workOrder.drawingRev)) missingFields.push('drawingRev');
    if (isBlank(workOrder.orderType)) missingFields.push('orderType');
    if (isBlank(workOrder.unit)) missingFields.push('unit');

    if (isBlank(workOrder.orderedQty) || Number(workOrder.orderedQty) <= 0) {
      missingFields.push('orderedQty');
    }

    if (isBlank(workOrder.plannedQty) || Number(workOrder.plannedQty) <= 0) {
      missingFields.push('plannedQty');
    }

    if (isBlank(workOrder.projCompDate)) missingFields.push('projCompDate');
    if (isBlank(workOrder.planner)) missingFields.push('planner');

    setFieldErrors(missingFields);

    if (missingFields.length > 0) {
      setErrorAnimationKey(key => key + 1);

      showToast(
        'Complete Required Fields',
        'warning',
        'Please complete all required fields before proceeding to Routing Stage Planning.'
      );

      return;
    }

    try {
      await saveWorkOrderRDBMS(workOrder, !isEditMode);
    } catch (error) {
      console.error('Proceed save failed', error);

      showToast(
        'Warning',
        'warning',
        'Could not save before proceeding. Continuing anyway.'
      );
    }

    setFieldErrors([]);
    onProceed();
  };

  const handleReset = () => {
    if (isEditMode) {
      return;
    }

    setWorkOrder({
      fgItemCode: '',
      fgItemName: '',
      itemType: '',
      drawingRev: '',
      unit: '',
      orderType: '',
      orderedQty: 0,
      plannedQty: 0,
      workOrderNo: '',
      workOrderDate: '',
      projCompDate: '',
      planner: '',
      remarks: '',
      status: 'Planned',
      priority: 'Normal'
    });

    setIsDetailsLoaded(false);
    setFieldErrors([]);
    setScheduleFieldErrors([]);

    showToast(
      'Module Reset',
      'info',
      'All planning inputs have been cleared.'
    );
  };

  function normalizeToDisplayDate(raw) {
    if (!raw) {
      return '';
    }

    const datePart = raw.includes('T') ? raw.slice(0, 10) : raw;
    const isoMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (isoMatch) {
      const [, yyyy, mm, dd] = isoMatch;
      return `${dd}-${mm}-${yyyy}`;
    }

    return datePart;
  }

  const displayWorkOrderDate = normalizeToDisplayDate(workOrder.workOrderDate);
  const displayProjCompDate = normalizeToDisplayDate(workOrder.projCompDate);

  return (
    <div className="space-y-6" id="planning-blueprint-view">
      <style>{`
        @keyframes requiredFieldShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .required-field-error {
          border: 1px solid #ffffffff !important;
          animation: requiredFieldShake 0.35s ease-in-out 0s 3 !important;
          border-radius: 0.75rem;
          transform-origin: center;
        }

        .schedule-validation-error {
          border: 1px solid #ffffffff !important;
          animation: requiredFieldShake 0.18s ease-in-out 0s 2 !important;
          border-radius: 0.75rem;
          transform-origin: center;
        }

        .required-field-error select,
        .required-field-error input,
        select.required-field-error,
        input.required-field-error,
        #select-unit.required-field-error,
        #input-ordered-qty.required-field-error,
        #input-planned-qty.required-field-error {
          border: 1px solid #ef4444 !important;
          animation: requiredFieldShake 0.35s ease-in-out 0s 3 !important;
          border-radius: 0.75rem;
          transform-origin: center;
        }
      `}</style>

      <section
        className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
        id="single-vertical-planning-card"
      >
        <div
          className="bg-slate-900 text-white p-5 md:px-8 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
          id="planning-card-header-banner"
        >
          <div>
            <h2 className="text-base md:text-2xl font-extrabold text-white">
              Stage 1: Sale Order Master Planning & Configuration
            </h2>
            <p className="text-md text-slate-400 mt-0.5">
              Integrated Live Database
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isCancelled ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold">
                <Ban className="w-3.5 h-3.5" />
                Work Order Cancelled
              </span>
            ) : !isEditMode && isDetailsLoaded ? (
              <button
                type="button"
                onClick={handleReset}
                className="shrink-0 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 px-4 py-2 rounded-xl border border-rose-500/20 transition-all cursor-pointer"
                id="btn-reset-planning-desk"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8" id="planning-card-body-scroll">
          {!isCancelled && (
            <div className="space-y-4" id="selection-group-segment">
              <div className={`grid grid-cols-1 md:grid-cols-16 gap-5 ${isDetailsLoaded ? 'items-start' : 'items-end'}`}>
                <div className={`${isDetailsLoaded ? 'md:col-span-4 md:row-span-2' : 'md:col-span-3'} ${isLocked || isDetailsLoaded ? 'pointer-events-none opacity-80' : ''}`}>
                  <div className="overflow-visible rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition-colors focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100">
                    <div className="px-4 pb-3 pt-3">
                      <AutocompleteSelect
                        items={fgItems}
                        selectedCode={workOrder.fgItemCode}
                        onChange={handleItemChange}
                        onClear={() => {
                          if (isDetailsLoaded) return;
                          setWorkOrder(prev => ({
                            ...prev,
                            fgItemCode: '',
                            fgItemName: ''
                          }));
                          setIsDetailsLoaded(false);
                        }}
                      />
                    </div>
                    <div className="border-t border-slate-200 px-4 pb-3 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FG Item Name</p>
                      <p className="mt-1 min-h-[24px] text-base font-bold text-slate-900">
                        {workOrder.fgItemName || ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`${isDetailsLoaded ? 'md:col-span-3' : 'md:col-span-4'}`}>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Order Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={workOrder.orderType}
                    onChange={handleOrderTypeChange}
                    disabled={isLocked || isDetailsLoaded}
                    className="w-full appearance-none px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 font-semibold disabled:bg-slate-100 disabled:cursor-not-allowed"
                    id="select-order-type"
                  >
                    <option value="">-- Select --</option>
                    {MOCK_ORDER_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Item Type: same row as Order Type and Unit, always shows PRO */}
                {isDetailsLoaded && (
                  <div className="md:col-span-3" id="card-item-type">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Item Type
                    </label>
                    <div className="w-full px-3 py-2.5 text-sm bg-sky-50 border border-sky-200/60 rounded-xl text-slate-800 font-mono font-bold">
                      {ITEM_TYPE_DISPLAY}
                    </div>
                  </div>
                )}

                {isDetailsLoaded ? (
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Unit Selection (Mfg Location)
                    </label>
                    <select
                      key={`unit-${scheduleAnimationKey}-${errorAnimationKey}`}
                      value={workOrder.unit}
                      disabled={isLocked}
                      onChange={(e) => {
                        const value = e.target.value;
                        setWorkOrder(prev => ({ ...prev, unit: value }));
                        if (value.trim()) clearFieldError('unit');
                      }}
                      className={`w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 font-semibold disabled:bg-slate-100 disabled:cursor-not-allowed ${scheduleFieldErrors.includes('unit') || fieldErrors.includes('unit') ? 'required-field-error' : ''
                        }`}
                      id="select-unit"
                    >
                      <option value="">-- Select --</option>
                      {MOCK_UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="md:col-span-3" aria-hidden="true" />
                )}

                {isDetailsLoaded && (
                  <>
                    <div className="md:col-span-4 bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Drawing Revision</span>
                      <span className="text-xs font-bold text-sky-700 font-mono">{workOrder.drawingRev || '—'}</span>
                    </div>

                    <div className="md:col-span-4 bg-sky-50 border border-sky-200/60 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Card Code</span>
                      <span className="text-xs font-bold text-slate-800 font-mono leading-snug">{String(workOrder.cardCode ?? workOrder.soDetails?.card_code ?? '—')}</span>
                    </div>

                    <div className="md:col-span-4 bg-sky-50 border border-sky-200/60 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Card Name</span>
                      <span className="text-xs font-bold text-slate-800 leading-snug">{String(workOrder.cardName ?? workOrder.soDetails?.card_name ?? '—')}</span>
                    </div>
                  </>
                )}

              </div>
            </div>
          )}

          {!isDetailsLoaded ? (
            !isCancelled && (
              <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50" id="empty-state-card-content">
                <div
                  className={`mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border-4 bg-white transition-colors duration-300 ${selectionProgress === 0
                    ? 'border-red-500 text-red-600'
                    : selectionProgress === 100
                      ? 'border-green-500 text-green-600'
                      : 'border-yellow-400 text-yellow-600'
                    }`}
                >
                  <span className="text-md font-extrabold">{selectionProgress}%</span>
                </div>

                <div className="mx-auto mb-4 h-2 max-w-md overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${selectionProgress === 0 ? 'bg-red-500' : selectionProgress === 100 ? 'bg-green-500' : 'bg-yellow-400'
                      }`}
                    style={{ width: `${selectionProgress}%` }}
                  />
                </div>

                <h4 className="text-sm font-bold text-slate-700">
                  {selectionProgress === 50 ? 'Selection Started' : 'Awaiting Order Initiation from Database'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {selectionProgress === 50
                    ? 'A selection has been made. Continue filling the required details.'
                    : 'Select an Order Type or FG Item Code from the database catalog above to populate the specifications.'}
                </p>
              </div>
            )
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`space-y-8 ${isCancelled ? 'opacity-60 pointer-events-none select-none' : ''}`}
              id="populated-form-details"
            >
              {isCancelled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Drawing Revision</span>
                      <span className="text-xs font-bold text-sky-700 font-mono">{workOrder.drawingRev || '—'}</span>
                    </div>

                    <div className="bg-sky-50 border border-sky-200/60 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Card Code</span>
                      <span className="text-xs font-bold text-slate-800 font-mono leading-snug">{String(workOrder.cardCode ?? workOrder.soDetails?.card_code ?? '—')}</span>
                    </div>

                    <div className="bg-sky-50 border border-sky-200/60 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Item Type</span>
                      <span className="text-xs font-bold text-slate-800 font-mono leading-snug">{ITEM_TYPE_DISPLAY}</span>
                    </div>

                    <div className="bg-sky-50 border border-sky-200/60 p-3 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Card Name</span>
                      <span className="text-xs font-bold text-slate-800 leading-snug">{String(workOrder.cardName ?? workOrder.soDetails?.card_name ?? '—')}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Work Order No</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Hash className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={workOrder.workOrderNo}
                          readOnly
                          className="w-full cursor-not-allowed bg-slate-100 pl-9 pr-4 py-2.5 text-sm text-slate-800 font-mono font-bold border border-slate-200 rounded-xl"
                          id="input-work-order-no"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">W/O Priority</label>
                      <select
                        value={workOrder.priority || 'Normal'}
                        disabled={isCancelled || isReleased}
                        onChange={(e) => setWorkOrder(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800 font-semibold"
                        id="select-wo-priority"
                      >
                        {WO_PRIORITY_OPTIONS.map(priority => (
                          <option key={priority} value={priority}>{priority}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className={`${isLocked ? 'pointer-events-none opacity-60' : ''} ${fieldErrors.includes('workOrderDate') ? 'required-field-error' : ''}`}>
                      <DatePicker
                        label="Work Order Date"
                        value={displayWorkOrderDate}
                        onChange={(date) => setWorkOrder(prev => ({ ...prev, workOrderDate: date }))}
                        id="wo-date-picker"
                        compact
                        disabled={!isEditMode || isCancelled || isReleased}
                      />
                    </div>

                    <div key={`proj-date-${scheduleAnimationKey}-${errorAnimationKey}`} className={scheduleFieldErrors.includes('projCompDate') || fieldErrors.includes('projCompDate') ? 'required-field-error' : ''}>
                      <DatePicker
                        label="Proj. Completion Date"
                        value={displayProjCompDate}
                        onChange={(date) => {
                          setWorkOrder(prev => ({ ...prev, projCompDate: date }));
                          if (date.trim()) clearFieldError('projCompDate');
                        }}
                        id="proj-comp-date-picker"
                        compact
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Ordered Qty</label>
                      <input
                        key={`ordered-qty-${errorAnimationKey}`}
                        type="number"
                        value={workOrder.orderedQty || ''}
                        disabled
                        readOnly
                        className={`w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 font-mono font-bold disabled:bg-slate-100 ${fieldErrors.includes('orderedQty') ? 'required-field-error' : ''
                          }`}
                        id="input-ordered-qty"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                        Planned Qty
                        {workOrder.plannedQty !== workOrder.orderedQty && (
                          <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.2 rounded font-sans">Δ</span>
                        )}
                      </label>
                      <input
                        key={`planned-qty-${scheduleAnimationKey}-${errorAnimationKey}`}
                        type="number"
                        value={workOrder.plannedQty || ''}
                        disabled={isLocked}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
                          // Planned Qty may be less than, equal to or greater than Ordered Qty.
                          const value = digits === '' ? 0 : Number(digits);
                          setWorkOrder(prev => ({ ...prev, plannedQty: value }));
                          if (value > 0) clearFieldError('plannedQty');
                        }}
                        className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none text-slate-800 font-mono font-bold transition-all disabled:bg-slate-100 ${scheduleFieldErrors.includes('plannedQty') || fieldErrors.includes('plannedQty')
                          ? 'required-field-error border-red-500 bg-white'
                          : workOrder.plannedQty !== workOrder.orderedQty
                            ? 'border-amber-300 bg-amber-50/20 text-amber-900'
                            : 'border-slate-200 bg-white'
                          }`}
                        min="1"
                        max="99999"
                        id="input-planned-qty"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">SO Open Qty</label>
                      <input
                        type="number"
                        value={workOrder.openQty || ''}
                        disabled
                        readOnly
                        className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 font-mono font-bold disabled:bg-slate-100"
                        id="input-open-qty"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">SO Pending Qty</label>
                      <input
                        type="number"
                        value={workOrder.pendingQty || ''}
                        disabled
                        readOnly
                        className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 font-mono font-bold disabled:bg-slate-100"
                        id="input-pending-qty"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Planner</label>
                    <select
                      key={`planner-${scheduleAnimationKey}-${errorAnimationKey}`}
                      value={workOrder.planner}
                      disabled={isLocked}
                      onChange={(e) => setWorkOrder(prev => ({ ...prev, planner: e.target.value }))}
                      className={`max-w-[415px] w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none text-slate-800 font-semibold disabled:bg-slate-100 ${scheduleFieldErrors.includes('planner') || fieldErrors.includes('planner') ? 'required-field-error border-red-500 bg-white' : ''
                        }`}
                      id="select-planner"
                    >
                      <option value="">-- Choose Planner --</option>
                      {planners.map(planner => (
                        <option key={planner.id} value={planner.name}>{planner.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Production Remarks / Directives</label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <textarea
                      rows={2}
                      value={workOrder.remarks ?? ''}
                      disabled={isCancelled}
                      onChange={(e) => setWorkOrder(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Enter specific production directives, machinery instructions, or packaging notes..."
                      className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none text-slate-800 font-medium leading-relaxed resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                      id="input-remarks"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            {isDetailsLoaded && (workOrder.status === 'Draft' || workOrder.status === 'Planned') && (
              <button
                key={`schedule-${scheduleAnimationKey}`}
                type="button"
                onClick={handleSchedule}
                disabled={saving}
                className={`px-6 py-3 font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer disabled:bg-slate-300 ${scheduleFieldErrors.length > 0
                  ? 'schedule-validation-error bg-red-600 text-white'
                  : 'bg-amber-400 text-slate-900 shadow-amber-500/20'
                  }`}
                id="btn-schedule-work-order"
              >
                Schedule
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleProceedClick}
            className={`px-6 py-3 bg-slate-700 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer ${!isDetailsLoaded ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            disabled={!isDetailsLoaded}
            id="btn-proceed-to-routing-allocation"
          >
            Proceed to Routing Stage Planning
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}