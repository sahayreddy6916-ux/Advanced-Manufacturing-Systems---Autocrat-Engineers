import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { Cpu, FileCheck2, ChevronRight, ChevronLeft, X, Check, Loader2, } from 'lucide-react';

import {
  fetchRoutingStepsRDBMS,
  saveRoutingStepsRDBMS,
  saveWorkOrderRDBMS,
} from '../api';
import DatePicker from './DatePicker';

const PROCESS_TYPE_OPTIONS = ['In-House', 'Inter-Unit', 'Sub-Con'];

const REQUIRED_ROUTING_DETAIL_FIELDS = [
  'plannedMachineCode',
  'plannedMachineName',
  'settingTimeMinutes',
  'cycleTimeMinutes',
  'startDate',
  'startTime',
];

const DETAIL_FIELDS = [
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'plannedMachineCode', label: 'Machine Code' },
  { key: 'plannedMachineName', label: 'Machine Name' },
  { key: 'settingTimeMinutes', label: 'Setting Time (mins)' },
  { key: 'cycleTimeMinutes', label: 'Process Time (mins)' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'startTime', label: 'Start Time' },
  { key: 'endDate', label: 'End Date' },
  { key: 'endTime', label: 'End Time' },
  { key: 'totalTimeMinutes', label: 'Total Time [HR:MIN]' },
  { key: 'remarks', label: 'Remarks' },
];

const READ_ONLY_DETAIL_KEYS = [
  'warehouse',
  'plannedMachineCode',
  'plannedMachineName',
  'totalTimeMinutes',
  'endDate',
  'endTime',
];

const getUnitOptionsForProcess = (processType) =>
  processType === 'Inter-Unit' ? ['Unit-2', 'Unit-3'] : ['Unit-1'];

const getWarehouseForRoute = (processType, unit) => {
  if (processType === 'Sub-Con' || processType === 'Sub Con') return 'SC-U1';
  if (unit === 'Unit-2') return 'QC-U2';
  if (unit === 'Unit-3') return 'QC-U3';
  return 'QC-U1';
};

// Stable key: prefer opItemCode + operation (jobCardNo is regenerated on every fetch)
const getStepKey = (step, idx) => {
  const op = String(step?.opItemCode || step?.item_code || '').trim();
  const operation = String(
    step?.operationName || step?.operation || step?.bom_operation || ''
  ).trim();
  if (op) return `${op}::${operation || idx}`;
  const fallback =
    step?.routingStepId ??
    step?.id ??
    step?.jobCardNo ??
    (idx != null ? `routing-${idx}` : '');
  return String(fallback).trim();
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Types the text out one character at a time (same effect as Stock Order Planning).
function useTypewriter(text, start, speed = 25) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) {
      setCount(0);
      return undefined;
    }
    if (prefersReducedMotion()) {
      setCount(text.length);
      return undefined;
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
.sa-fade-up    { animation: sa-fade-up 0.6s cubic-bezier(.22,1,.36,1) backwards; }
.sa-slide-down { animation: sa-slide-down 0.55s cubic-bezier(.22,1,.36,1) backwards; }
.sa-banner     { animation: sa-banner-reveal 0.7s cubic-bezier(.22,1,.36,1) 0.15s backwards; transform-origin: left center; }
.sa-hang       { animation: sa-hang-swing 0.9s cubic-bezier(.22,1,.36,1) backwards; transform-origin: top center; }
.sa-pop        { animation: sa-pop 0.3s ease-out backwards; }
@keyframes sa-caret { 50% { opacity: 0 } }
.sa-caret      { animation: sa-caret 800ms steps(1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .sa-fade-up, .sa-slide-down, .sa-banner, .sa-hang, .sa-pop, .sa-caret { animation: none; }
}
`;

export default function CardRouting({
  workOrder,
  setWorkOrder,
  onBack,
  onWorkOrderReleased,
  showToast,
  onDetailOpenChange,
}) {
  const itemCode = workOrder.fgItemCode || 'DEFAULT';
  const normalizedStatus = String(workOrder.status || '').trim().toLowerCase();
  const isCancelled =
    normalizedStatus === 'cancelled' || normalizedStatus === 'canceled';
  const isReleased = normalizedStatus === 'released';

  const [routes, setRoutes] = useState([]);
  const [originalRoutes, setOriginalRoutes] = useState([]);
  // Always holds the newest routes, so the next job card can read the previous card's
  // End Date/Time right after a save (before React has re-rendered).
  const latestRoutesRef = useRef([]);
  useEffect(() => {
    latestRoutesRef.current = routes;
  }, [routes]);
  const [loadingRDBMS, setLoadingRDBMS] = useState(true);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedStepKey, setSelectedStepKey] = useState(null);

  const [detailStep, setDetailStep] = useState(null);
  const [detailFormValues, setDetailFormValues] = useState({});
  const [detailFormDirty, setDetailFormDirty] = useState(false);
  const [detailSaveFeedback, setDetailSaveFeedback] = useState('');
  const [detailSaveFeedbackType, setDetailSaveFeedbackType] = useState('success');
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  // 1 = moving forward (slides in from the right), -1 = moving back (from the left)
  const [slideDir, setSlideDir] = useState(1);
  const routingTitle = useTypewriter('Manufacturing Routing', true, 42);

  // Tell the parent (Header) whether the selected job card panel is open.
  useEffect(() => {
    onDetailOpenChange?.(Boolean(selectedStepKey));
  }, [selectedStepKey]);

  // Make sure the Header is unlocked when leaving this page.
  useEffect(() => {
    return () => onDetailOpenChange?.(false);
  }, []);

  const hasRoutingChanges =
    JSON.stringify(routes) !== JSON.stringify(originalRoutes);

  const applyWorkOrderPlannedQty = (routeList) =>
    routeList.map((route) => {
      const processTime =
        Number(route.processTimePerUnitMins ?? route.cycleTimeMinutes ?? 0) || 0;
      const processType = route.processType || 'In-House';
      const unit =
        route.unit || getUnitOptionsForProcess(processType)[0] || 'Unit-1';

      return {
        ...route,
        plannedQty: Number(workOrder.plannedQty) || 0,
        fgItemCode: route.fgItemCode || workOrder.fgItemCode,
        fgItemName: route.fgItemName || workOrder.fgItemName,
        operation: route.operation || route.operationName || '',
        operationName: route.operationName || route.operation || '',
        processType,
        unit,
        warehouse:
          route.warehouse || getWarehouseForRoute(processType, unit),
        // Keep both names in sync so save/load never lose the value
        processTimePerUnitMins: processTime,
        cycleTimeMinutes: processTime,
        settingTimeMinutes: Number(route.settingTimeMinutes ?? 0) || 0,
        totalTimeMinutes: Number(route.totalTimeMinutes ?? 0) || 0,
        startDate: route.startDate || '',
        startTime: route.startTime || '',
        endDate: route.endDate || '',
        endTime: route.endTime || '',
      };
    });

  useEffect(() => {
    async function loadRDBMSRoutingData() {
      setLoadingRDBMS(true);
      try {
        const fetchedRoutes = await fetchRoutingStepsRDBMS(
          workOrder.workOrderNo,
          itemCode
        );
        const routesWithPlannedQty = applyWorkOrderPlannedQty(fetchedRoutes);
        setRoutes(routesWithPlannedQty);
        setOriginalRoutes(JSON.parse(JSON.stringify(routesWithPlannedQty)));
      } catch (error) {
        console.error('Failed to load routing:', error);
        setRoutes([]);
        setOriginalRoutes([]);
        showToast(
          'Routing Load Failed',
          'error',
          'Could not load routing_steps from the backend.'
        );
      } finally {
        setLoadingRDBMS(false);
      }
    }
    loadRDBMSRoutingData();
  }, [itemCode, workOrder.workOrderNo, workOrder.plannedQty]);

  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = () => setOpenMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [openMenuId]);

  const closeSelectedCard = () => {
    setSelectedStepKey(null);
    setDetailStep(null);
    setDetailFormValues({});
    setDetailFormDirty(false);
    setDetailSaveFeedback('');
  };

  useEffect(() => {
    if (!detailStep) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedStepKey(null);
        setDetailStep(null);
        setDetailFormValues({});
        setDetailFormDirty(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [detailStep]);

  const handleResetStep = (step, idx) => {
    if (isCancelled) return;
    const stepKey = getStepKey(step, idx);
    const original = originalRoutes.find(
      (r, i) => getStepKey(r, i) === stepKey
    );
    if (!original) {
      showToast(
        'Nothing to Reset',
        'info',
        'No original data found for this step.'
      );
      setOpenMenuId(null);
      return;
    }
    setRoutes((prev) =>
      prev.map((r, i) =>
        getStepKey(r, i) === stepKey
          ? JSON.parse(JSON.stringify(original))
          : r
      )
    );
    showToast(
      'Step Reset',
      'success',
      `${step.opItemCode || stepKey} restored to its original values.`
    );
    setOpenMenuId(null);
  };

  const handleProcessTypeChange = (stepId, newValue) => {
    if (isCancelled) return;
    const validUnits = getUnitOptionsForProcess(newValue);
    setRoutes((prev) =>
      prev.map((r, idx) => {
        if (getStepKey(r, idx) !== stepId) return r;
        const nextUnit = validUnits.includes(r.unit) ? r.unit : validUnits[0];
        return {
          ...r,
          processType: newValue,
          unit: nextUnit,
          warehouse: getWarehouseForRoute(newValue, nextUnit),
        };
      })
    );
  };

  const handleUnitChange = (stepId, newUnit) => {
    if (isCancelled) return;
    setRoutes((prev) =>
      prev.map((r, idx) => {
        if (getStepKey(r, idx) !== stepId) return r;
        return {
          ...r,
          unit: newUnit,
          warehouse: getWarehouseForRoute(r.processType, newUnit),
        };
      })
    );
  };

  const calculateTotalTime = (processTime, plannedQty, settingTime) => {
    const process = Number(processTime);
    const quantity = Number(plannedQty);
    const setting = Number(settingTime);
    if (
      !Number.isFinite(process) ||
      !Number.isFinite(quantity) ||
      !Number.isFinite(setting) ||
      process < 0 ||
      quantity < 0 ||
      setting < 0
    ) {
      return '00:00';
    }
    const totalMinutes = Math.round(process * quantity + setting);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const formatTimeHHMM = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const match = raw.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match) return raw;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return raw;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const durationToMinutes = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    const hhmm = raw.match(/^(\d+):(\d{1,2})$/);
    if (hhmm) return Number(hhmm[1]) * 60 + Number(hhmm[2]);
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const toDateInputValue = (value) => {
    if (!value) return '';
    const dateValue = String(value).trim();
    const ddmmyyyy = dateValue.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month}-${day}`;
    }
    return dateValue.includes('T') ? dateValue.slice(0, 10) : dateValue;
  };

  const calculateEndDateTime = (
    startDate,
    startTime,
    processTime,
    plannedQty,
    settingTime
  ) => {
    const normalizedDate = toDateInputValue(startDate);
    const normalizedTime = String(startTime ?? '').trim();
    if (!normalizedDate || !normalizedTime) return { endDate: '', endTime: '' };

    const dateMatch = normalizedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})$/);
    if (!dateMatch || !timeMatch) return { endDate: '', endTime: '' };

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      !Number.isFinite(hour) ||
      !Number.isFinite(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return { endDate: '', endTime: '' };
    }

    const process = Number(processTime);
    const quantity = Number(plannedQty);
    const setting = Number(settingTime);
    if (
      !Number.isFinite(process) ||
      !Number.isFinite(quantity) ||
      !Number.isFinite(setting) ||
      process < 0 ||
      quantity < 0 ||
      setting < 0
    ) {
      return { endDate: '', endTime: '' };
    }

    const totalMinutes = process * quantity + setting;
    const start = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (Number.isNaN(start.getTime())) return { endDate: '', endTime: '' };

    start.setMinutes(start.getMinutes() + totalMinutes);
    const yyyy = start.getFullYear();
    const mm = String(start.getMonth() + 1).padStart(2, '0');
    const dd = String(start.getDate()).padStart(2, '0');
    const hh = String(start.getHours()).padStart(2, '0');
    const min = String(start.getMinutes()).padStart(2, '0');
    return { endDate: `${yyyy}-${mm}-${dd}`, endTime: `${hh}:${min}` };
  };

  // Start Date uses the shared calendar (DD-MM-YYYY on screen, YYYY-MM-DD stored).
  const toDisplayDate = (value) => {
    const iso = toDateInputValue(value);
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  };

  const handleStartDatePick = (displayDate) => {
    const m = String(displayDate).match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) handleDetailFieldChange('startDate', `${m[3]}-${m[2]}-${m[1]}`);
  };

  // "YYYY-MM-DD HH:MM" so two moments can be compared as plain strings.
  const toMoment = (date, time) => {
    const d = toDateInputValue(date);
    if (!d) return '';
    return `${d} ${formatTimeHHMM(time || '00:00')}`;
  };

  // Job card N+1 starts when job card N ends (never earlier). Walk forward from
  // fromIdx and move any following card whose start is empty or before the previous end.
  const chainFollowingRoutes = (list, fromIdx) => {
    const out = [...list];
    for (let j = fromIdx + 1; j < out.length; j += 1) {
      const prev = out[j - 1];
      if (!prev?.endDate || !prev?.endTime) break;

      const cur = out[j];
      const prevEnd = toMoment(prev.endDate, prev.endTime);
      const curStart = cur.startDate ? toMoment(cur.startDate, cur.startTime) : '';
      if (curStart && curStart >= prevEnd) continue;

      const startDate = toDateInputValue(prev.endDate);
      const startTime = formatTimeHHMM(prev.endTime);
      const processTime = Number(cur.processTimePerUnitMins ?? cur.cycleTimeMinutes ?? 0) || 0;
      const settingTime = Number(cur.settingTimeMinutes ?? 0) || 0;
      const qty = cur.plannedQty ?? workOrder.plannedQty;
      const hasTimes = processTime > 0 || settingTime > 0;
      const end = hasTimes
        ? calculateEndDateTime(startDate, startTime, processTime, qty, settingTime)
        : { endDate: '', endTime: '' };

      out[j] = {
        ...cur,
        startDate,
        startTime,
        endDate: end.endDate,
        endTime: end.endTime,
        totalTimeMinutes: hasTimes
          ? durationToMinutes(calculateTotalTime(processTime, qty, settingTime))
          : cur.totalTimeMinutes,
      };
    }
    return out;
  };

  const handleDetailFieldChange = (key, value) => {
    if (isCancelled) return;
    setDetailSaveFeedback('');
    setDetailFormDirty(true);
    setDetailFormValues((prev) => {
      const nextValues = { ...prev, [key]: value };
      const processTime =
        key === 'cycleTimeMinutes' ? value : prev.cycleTimeMinutes;
      const settingTime =
        key === 'settingTimeMinutes' ? value : prev.settingTimeMinutes;
      const startDate = key === 'startDate' ? value : prev.startDate;
      const startTime = key === 'startTime' ? value : prev.startTime;

      if (
        key === 'cycleTimeMinutes' ||
        key === 'settingTimeMinutes' ||
        key === 'startDate' ||
        key === 'startTime'
      ) {
        nextValues.totalTimeMinutes = calculateTotalTime(
          processTime,
          workOrder.plannedQty ?? detailStep?.plannedQty,
          settingTime
        );
        const calculatedEnd = calculateEndDateTime(
          startDate,
          startTime,
          processTime,
          workOrder.plannedQty ?? detailStep?.plannedQty,
          settingTime
        );
        nextValues.endDate = calculatedEnd.endDate;
        nextValues.endTime = calculatedEnd.endTime;
      }
      return nextValues;
    });
  };

  const handleOpenDetails = (step, idx) => {
    const stepKey = getStepKey(step, idx);
    const reminderItemCode =
      step.opItemCode || step.item_code || workOrder.fgItemCode || 'Unknown';
    // Use the newest copy of this card and of the card before it.
    const latest = latestRoutesRef.current;
    const liveStep = latest.find((r, i) => getStepKey(r, i) === stepKey) || step;
    const previousCard = idx > 0 ? latest[idx - 1] : null;

    let chainedStartDate = liveStep.startDate || '';
    let chainedStartTime = liveStep.startTime || '';
    let startWasChained = false;
    if (previousCard?.endDate && previousCard?.endTime) {
      const prevEnd = toMoment(previousCard.endDate, previousCard.endTime);
      const ownStart = chainedStartDate ? toMoment(chainedStartDate, chainedStartTime) : '';
      if (!ownStart || ownStart < prevEnd) {
        chainedStartDate = toDateInputValue(previousCard.endDate);
        chainedStartTime = formatTimeHHMM(previousCard.endTime);
        startWasChained = true;
      }
    }

    setSelectedStepKey(stepKey);
    setDetailStep({ ...liveStep, __stepKey: stepKey });
    setDetailSaveFeedback('');
    setDetailFormDirty(startWasChained);
    showToast(
      'Job Card Opened',
      'info',
      `Item Code: ${reminderItemCode} — ${step.opItemName || step.operationName || 'Routing details are ready to edit.'} Complete machine code, machine name, setting time, process time, start date, and start time, then select Save Details.`
    );

    const plannedQty = step.plannedQty ?? workOrder.plannedQty;
    // Prefer processTimePerUnitMins (from API), fall back to cycleTimeMinutes
    const processTime =
      step.processTimePerUnitMins ?? step.cycleTimeMinutes ?? '';
    const settingTime = step.settingTimeMinutes ?? '';

    const calculatedTotalTime = calculateTotalTime(
      processTime,
      plannedQty,
      settingTime
    );
    const calculatedEnd = calculateEndDateTime(
      chainedStartDate,
      chainedStartTime,
      processTime,
      plannedQty,
      settingTime
    );

    setDetailFormValues({
      warehouse: getWarehouseForRoute(
        step.processType || 'In-House',
        step.unit ||
        getUnitOptionsForProcess(step.processType || 'In-House')[0]
      ),
      plannedMachineCode: step.plannedMachineCode || '',
      plannedMachineName: step.plannedMachineName || '',
      settingTimeMinutes:
        settingTime !== '' && settingTime != null ? String(settingTime) : '',
      cycleTimeMinutes:
        processTime !== '' && processTime != null ? String(processTime) : '',
      startDate: chainedStartDate,
      startTime: chainedStartTime,
      endDate: calculatedEnd.endDate || step.endDate || '',
      endTime: calculatedEnd.endTime || step.endTime || '',
      totalTimeMinutes: calculatedTotalTime,
      remarks: step.remarks || '',
    });
  };

  const handleSelectCard = (step, idx) => {
    const stepKey = getStepKey(step, idx);
    if (stepKey === selectedStepKey) return;
    setSlideDir(1);
    handleOpenDetails(step, idx);
  };

  // Returns true when the card is saved (or there was nothing to save and
  // silentIfClean is set), false when validation/saving failed.
  const handleSaveDetailForm = async ({ silentIfClean = false } = {}) => {
    if (!detailStep) return false;

    const missingRequiredFields = REQUIRED_ROUTING_DETAIL_FIELDS.filter((key) => {
      const value = detailFormValues[key];
      if (value === undefined || value === null || String(value).trim() === '') return true;
      if (key === 'settingTimeMinutes' || key === 'cycleTimeMinutes') {
        const numericValue = Number(value);
        return !Number.isFinite(numericValue) || numericValue < 0;
      }
      return false;
    });

    if (missingRequiredFields.length > 0) {
      const message = 'Complete machine code, machine name, setting time, process time, start date, and start time before saving.';
      setDetailSaveFeedbackType('error');
      setDetailSaveFeedback(message);
      showToast('Required Details Missing', 'error', message);
      return false;
    }

    // A job card cannot start before the previous job card ends.
    const ownIdx = routes.findIndex(
      (r, i) => getStepKey(r, i) === String(detailStep.__stepKey || getStepKey(detailStep)).trim()
    );
    const previousCard = ownIdx > 0 ? routes[ownIdx - 1] : null;
    if (previousCard?.endDate && previousCard?.endTime) {
      const prevEnd = toMoment(previousCard.endDate, previousCard.endTime);
      const ownStart = toMoment(detailFormValues.startDate, detailFormValues.startTime);
      if (ownStart < prevEnd) {
        const [py, pm, pd] = prevEnd.slice(0, 10).split('-');
        const message = `Start Date/Time must be on or after the previous job card's end (${pd}-${pm}-${py} ${prevEnd.slice(11)}).`;
        setDetailSaveFeedbackType('error');
        setDetailSaveFeedback(message);
        showToast('Start Before Previous End', 'error', message);
        return false;
      }
    }

    if (!detailFormDirty) {
      if (silentIfClean) return true;
      const message = 'There are no unsaved changes for this routing card.';
      setDetailSaveFeedbackType('info');
      setDetailSaveFeedback(message);
      showToast('Nothing to Save', 'info', message);
      return true;
    }

    const routingStepKey = String(
      detailStep.__stepKey || getStepKey(detailStep)
    ).trim();

    if (!routingStepKey) {
      const message = 'This routing card does not have a valid routing card identifier.';
      setDetailSaveFeedbackType('error');
      setDetailSaveFeedback(message);
      showToast('Save Failed', 'error', message);
      return false;
    }

    const numericRoutingStepId = Number(
      detailStep.routingStepId ?? detailStep.id
    );

    // Use the live route (so Process Type / Unit edits made on the card
    // while the details pane is open are not overwritten by stale data).
    const currentRoute =
      routes.find((r, i) => getStepKey(r, i) === routingStepKey) || detailStep;

    const processTime =
      Number(
        detailFormValues.cycleTimeMinutes ??
        detailFormValues.processTimePerUnitMins ??
        currentRoute.processTimePerUnitMins ??
        currentRoute.cycleTimeMinutes ??
        0
      ) || 0;

    const settingTime =
      Number(
        detailFormValues.settingTimeMinutes ??
        currentRoute.settingTimeMinutes ??
        0
      ) || 0;

    const updatedRoute = {
      ...currentRoute,
      ...detailFormValues,
      ...(Number.isFinite(numericRoutingStepId)
        ? { routingStepId: numericRoutingStepId }
        : {}),
      plannedQty:
        Number(
          detailFormValues.plannedQty ??
          currentRoute.plannedQty ??
          workOrder.plannedQty
        ) || 0,
      settingTimeMinutes: settingTime,
      cycleTimeMinutes: processTime,
      processTimePerUnitMins: processTime,
      totalTimeMinutes: durationToMinutes(
        detailFormValues.totalTimeMinutes ?? currentRoute.totalTimeMinutes ?? 0
      ),
      startDate: detailFormValues.startDate ?? currentRoute.startDate ?? '',
      startTime: detailFormValues.startTime ?? currentRoute.startTime ?? '',
      endDate: detailFormValues.endDate ?? currentRoute.endDate ?? '',
      endTime: detailFormValues.endTime ?? currentRoute.endTime ?? '',
      warehouse: getWarehouseForRoute(
        currentRoute.processType || 'In-House',
        currentRoute.unit ||
        getUnitOptionsForProcess(currentRoute.processType || 'In-House')[0]
      ),
    };

    delete updatedRoute.__stepKey;

    // Save this card and move the following cards so each one starts when the previous ends.
    const updatedRoutes = chainFollowingRoutes(
      routes.map((route, idx) =>
        getStepKey(route, idx) === routingStepKey ? updatedRoute : route
      ),
      ownIdx >= 0 ? ownIdx : routes.length
    );
    latestRoutesRef.current = updatedRoutes;

    try {
      const saved = await saveRoutingStepsRDBMS(
        updatedRoutes,
        workOrder.workOrderNo,
        workOrder.fgItemCode
      );

      if (!saved) {
        const message = 'Routing details were not saved to PostgreSQL.';
        setDetailSaveFeedbackType('error');
        setDetailSaveFeedback(message);
        showToast('Save Failed', 'error', message);
        return false;
      }

      try {
        const verified = await fetchRoutingStepsRDBMS(
          workOrder.workOrderNo,
          workOrder.fgItemCode
        );
        const verifiedRoutes = applyWorkOrderPlannedQty(verified);
        latestRoutesRef.current = verifiedRoutes;
        setRoutes(verifiedRoutes);
        setOriginalRoutes(JSON.parse(JSON.stringify(verifiedRoutes)));
      } catch (verifyError) {
        console.warn(
          'Post-save reload failed; keeping local state',
          verifyError
        );
        setRoutes(updatedRoutes);
        setOriginalRoutes(JSON.parse(JSON.stringify(updatedRoutes)));
      }

      showToast(
        'Details Saved',
        'success',
        `Item Code: ${updatedRoute.opItemCode || updatedRoute.item_code || workOrder.fgItemCode || 'Unknown'} — routing card ${routingStepKey} was saved to PostgreSQL.`
      );

      setDetailStep({ ...updatedRoute, __stepKey: routingStepKey });
      setDetailFormDirty(false);
      const confirmation = `Routing details for job card ${routingStepKey} were saved.`;
      setDetailSaveFeedbackType('success');
      setDetailSaveFeedback(confirmation);
      return true;
    } catch (error) {
      console.error('Routing detail save failed:', error);
      const message = 'An unexpected error occurred while saving routing details.';
      setDetailSaveFeedbackType('error');
      setDetailSaveFeedback(message);
      showToast('Save Failed', 'error', message);
      return false;
    }
  };

  const handleReleaseWorkOrder = async () => {
    if (isCancelled) return;

    if (!workOrder.workOrderNo) {
      showToast('Release Failed', 'error', 'Work Order number is missing.');
      return;
    }

    // Capture the routing values currently displayed, including process type and unit.
    const routesToSave = routes.map((route) => {
      const processType =
        route.processType === 'Sub Con'
          ? 'Sub-Con'
          : route.processType || 'In-House';

      const validUnits = getUnitOptionsForProcess(processType);
      const unit = validUnits.includes(route.unit) ? route.unit : validUnits[0];
      const processTime =
        Number(route.processTimePerUnitMins ?? route.cycleTimeMinutes ?? 0) || 0;

      return {
        ...route,
        processType,
        unit,
        warehouse: getWarehouseForRoute(processType, unit),
        plannedQty: Number(workOrder.plannedQty) || 0,
        processTimePerUnitMins: processTime,
        cycleTimeMinutes: processTime,
        settingTimeMinutes: Number(route.settingTimeMinutes ?? 0) || 0,
        totalTimeMinutes: Number(route.totalTimeMinutes ?? 0) || 0,
      };
    });

    try {
      // Persist routing edits before changing the work order status to Released.
      if (routesToSave.length > 0) {
        const routesSaved = await saveRoutingStepsRDBMS(
          routesToSave,
          workOrder.workOrderNo,
          workOrder.fgItemCode
        );

        if (!routesSaved) {
          showToast(
            'Release Failed',
            'error',
            'Routing changes, including Process Type, could not be saved. The Work Order was not released.'
          );
          return;
        }
      }

      const releasedWO = { ...workOrder, status: 'Released' };
      const workOrderSaved = await saveWorkOrderRDBMS(releasedWO, false);

      if (!workOrderSaved) {
        showToast(
          'Release Failed',
          'error',
          'Routing was saved, but the Work Order could not be released. Try again.'
        );
        return;
      }

      setWorkOrder(releasedWO);

      try {
        const fresh = await fetchRoutingStepsRDBMS(
          releasedWO.workOrderNo,
          releasedWO.fgItemCode
        );

        const withStatus = routesToSave.map((route, idx) => {
          const match =
            fresh.find(
              (item) => item.jobCardNo && item.jobCardNo === route.jobCardNo
            ) || fresh[idx];

          return {
            ...route,
            jobCardStatus: match?.jobCardStatus ?? '',
            jobCardNo: route.jobCardNo || match?.jobCardNo || '',
          };
        });

        setRoutes(withStatus);
        setOriginalRoutes(JSON.parse(JSON.stringify(withStatus)));
      } catch (statusError) {
        console.warn('Could not refresh job card status after release', statusError);
        setRoutes(routesToSave);
        setOriginalRoutes(JSON.parse(JSON.stringify(routesToSave)));
      }

      onWorkOrderReleased?.();

      showToast(
        `Work Order #${releasedWO.workOrderNo} Released to Database`,
        'success',
        `Dispatched routing traveler to ${releasedWO.planner || 'the default production supervisor'
        }. Ready for CNC queues.`,
        6000
      );
    } catch (error) {
      console.error('Release failed:', error);
      showToast(
        'Release Failed',
        'error',
        'An unexpected error occurred while releasing.'
      );
    }
  };

  const handleCancelWorkOrder = () => {
    if (!isReleased || !workOrder.workOrderNo) return;
    setShowCancelConfirmation(true);
  };

  const handleConfirmCancelWorkOrder = async () => {
    if (!isReleased || !workOrder.workOrderNo || isCancelling) return;

    setIsCancelling(true);
    try {
      const cancelledWO = { ...workOrder, status: 'Cancelled' };
      const saved = await saveWorkOrderRDBMS(cancelledWO, false);
      if (!saved) {
        showToast(
          'Cancel Failed',
          'error',
          'Could not update the database. Try again.'
        );
        return;
      }

      setWorkOrder(cancelledWO);
      setShowCancelConfirmation(false);
      onWorkOrderReleased?.();
      showToast(
        `Work Order #${cancelledWO.workOrderNo} Cancelled`,
        'success',
        'The released work order has been marked as Cancelled.'
      );
    } catch (error) {
      console.error('Cancel work order failed:', error);
      showToast(
        'Cancel Failed',
        'error',
        'An unexpected error occurred while cancelling the work order.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleUpdateWorkOrder = async () => {
    if (isCancelled) return;
    if (!workOrder.workOrderNo) {
      showToast('Update Failed', 'error', 'Work Order number is missing.');
      return;
    }
    if (!hasRoutingChanges) {
      showToast(
        'No Changes to Update',
        'info',
        'Change at least one routing-card value before clicking Update.'
      );
      return;
    }

    try {
      // Ensure every route has both process time fields before save
      const routesToSave = routes.map((r) => {
        const processTime =
          Number(r.processTimePerUnitMins ?? r.cycleTimeMinutes ?? 0) || 0;
        return {
          ...r,
          processType: r.processType || 'In-House',
          unit:
            r.unit ||
            getUnitOptionsForProcess(r.processType || 'In-House')[0] ||
            'Unit-1',
          processTimePerUnitMins: processTime,
          cycleTimeMinutes: processTime,
          settingTimeMinutes: Number(r.settingTimeMinutes ?? 0) || 0,
          totalTimeMinutes: Number(r.totalTimeMinutes ?? 0) || 0,
        };
      });

      const savedWorkOrder = await saveWorkOrderRDBMS(workOrder, false);
      if (!savedWorkOrder) {
        showToast(
          'Update Failed',
          'error',
          'Could not update the Work Order in PostgreSQL.'
        );
        return;
      }

      const savedRoutes = await saveRoutingStepsRDBMS(
        routesToSave,
        workOrder.workOrderNo,
        workOrder.fgItemCode
      );

      if (!savedRoutes) {
        showToast(
          'Update Failed',
          'error',
          'Work Order was saved, but routing cards were not saved to PostgreSQL.'
        );
        return;
      }

      const verifiedRoutesRaw = await fetchRoutingStepsRDBMS(
        workOrder.workOrderNo,
        workOrder.fgItemCode
      );
      const verifiedRoutes = applyWorkOrderPlannedQty(verifiedRoutesRaw);

      if (verifiedRoutes.length !== routesToSave.length) {
        showToast(
          'Update Failed',
          'error',
          `Database verification failed: saved ${routesToSave.length} routing cards but PostgreSQL returned ${verifiedRoutes.length}.`
        );
        return;
      }

      setRoutes(verifiedRoutes);
      setOriginalRoutes(JSON.parse(JSON.stringify(verifiedRoutes)));

      showToast(
        `Work Order #${workOrder.workOrderNo} Updated`,
        'success',
        'Work Order and all routing-card changes were saved and verified in PostgreSQL.'
      );
      onWorkOrderReleased?.();
    } catch (error) {
      console.error('Update failed:', error);
      showToast(
        'Update Failed',
        'error',
        'An unexpected error occurred while updating the Work Order.'
      );
    }
  };

  const renderRoutingCard = (step, idx, isSelected = false, isDisabled = false) => {
    const stepId = getStepKey(step, idx);

    const normalizedProcessType =
      step.processType === 'Sub Con'
        ? 'Sub-Con'
        : step.processType || PROCESS_TYPE_OPTIONS[0] || 'In-House';

    const normalizedUnit =
      step.unit ||
      getUnitOptionsForProcess(normalizedProcessType)[0] ||
      'Unit-1';

    return (
      <div
        key={stepId}
        role="button"
        aria-pressed={isSelected}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : 0}
        onClick={() => {
          if (!isDisabled) handleSelectCard(step, idx);
        }}
        onKeyDown={(event) => {
          if (!isDisabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            handleSelectCard(step, idx);
          }
        }}
        className={`relative border rounded-xl overflow-visible bg-[#1f2229] min-w-0 w-full max-w-[300px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isDisabled
          ? 'pointer-events-none cursor-not-allowed border-indigo-300 opacity-45 grayscale'
          : isSelected
            ? 'cursor-pointer border-indigo-400 shadow-2xl shadow-indigo-950/40 origin-top-left scale-125 z-30'
            : 'cursor-pointer border-slate-400 hover:border-indigo-300 hover:-translate-y-0.5'
          }`}
      >
        <div className="p-3 pb-5 rounded-xl h-full min-h-[260px] overflow-hidden">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <span className="text-[12.5px] font-extrabold font-mono text-slate-200 bg-black/30 px-1 py-0.5 rounded">
                {step.opItemCode}
              </span>
              <h5 className="text-[11px] font-bold text-white mt-0.5 leading-snug truncate">
                {step.opItemName}
              </h5>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-y-1.5 text-[13px]">
            <Field label="Planned Qty" value={step.plannedQty} dark />

            {/* Process Type / Unit are only shown after the card is clicked */}
            {isSelected && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-400 block uppercase font-extrabold mb-1">
                    Process Type
                  </span>
                  <select
                    value={normalizedProcessType ?? 'In-House'}
                    onChange={(e) => handleProcessTypeChange(stepId, e.target.value)}
                    disabled={isCancelled || isDisabled}
                    className="process-type-select w-[95px] bg-black/20 border border-slate-750 rounded-md px-1 py-1 text-[12px] font-semibold text-slate-300 focus:outline-none focus:border-slate-400 cursor-pointer"
                  >
                    {PROCESS_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block uppercase font-extrabold mb-1">
                    Unit
                  </span>
                  <select
                    value={normalizedUnit ?? 'Unit-1'}
                    onChange={(e) => handleUnitChange(stepId, e.target.value)}
                    disabled={isCancelled || isDisabled}
                    className="w-[100px] bg-black/30 border border-sky-700 rounded-md px-2 py-1 text-[12px] font-semibold text-slate-300 focus:outline-none focus:border-slate-400 cursor-pointer"
                  >
                    {getUnitOptionsForProcess(normalizedProcessType).map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <Field label="Operation Name" value={step.operationName} dark />
            <Field label="Job Card No" value={step.jobCardNo} dark />
            <Field
              label="Job Card Status"
              badge
              value={step.jobCardStatus}
              dark
            />
          </div>
        </div>
      </div>
    );
  };

  const selectedRouteEntry = selectedStepKey
    ? routes
      .map((step, idx) => ({ step, idx, key: getStepKey(step, idx) }))
      .find((entry) => entry.key === selectedStepKey) || null
    : null;
  const selectedItemCode = selectedRouteEntry
    ? selectedRouteEntry.step.opItemCode ||
    selectedRouteEntry.step.item_code ||
    workOrder.fgItemCode ||
    'Unknown'
    : '';

  // When a card is selected, only that card stays on the page.
  const visibleRouteEntries = routes
    .map((step, idx) => ({ step, idx, key: getStepKey(step, idx) }))
    .filter((entry) => !selectedRouteEntry || entry.key === selectedRouteEntry.key);

  // Warehouse follows the live Process Type / Unit chosen on the card.
  const selectedWarehouse = selectedRouteEntry
    ? getWarehouseForRoute(
      selectedRouteEntry.step.processType || 'In-House',
      selectedRouteEntry.step.unit ||
      getUnitOptionsForProcess(selectedRouteEntry.step.processType || 'In-House')[0]
    )
    : '';

  // ---- Next Operation ----
  const selectedIndex = selectedStepKey
    ? routes.findIndex((r, i) => getStepKey(r, i) === selectedStepKey)
    : -1;
  const nextIndex =
    selectedIndex >= 0 && selectedIndex < routes.length - 1
      ? selectedIndex + 1
      : -1;

  const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : -1;

  // Part / operation code shown on the Previous and Next controls, e.g. BB-52-OP020-SFG
  const getStepLabel = (step) =>
    step?.opItemCode || step?.item_code || step?.opItemName || 'Operation';
  const nextLabel = nextIndex >= 0 ? getStepLabel(routes[nextIndex]) : '';
  const prevLabel = prevIndex >= 0 ? getStepLabel(routes[prevIndex]) : '';
  // Start Date cannot be earlier than the previous job card's End Date.
  const minStartDate =
    prevIndex >= 0 && routes[prevIndex]?.endDate
      ? toDateInputValue(routes[prevIndex].endDate)
      : '';

  // True when the next operation is the final one (i.e. we're on the 2nd-last card)
  const isSecondLast = nextIndex >= 0 && nextIndex === routes.length - 1;
  // No entrance / shimmer animation on the "Proceed to Last Operation" and "Last operation" controls
  const isLastStage = isSecondLast || nextIndex < 0;
  const nextSlideLabel =
    nextIndex < 0
      ? 'Last operation'
      : isSecondLast
        ? `Proceed to Last Operation · ${nextLabel}`
        : `Proceed to Next · ${nextLabel}`;

  // Used by the Alt + Right shortcut (the on-screen control is the click-to-slide button).
  const handleNextOperation = async () => {
    if (nextIndex < 0 || isAdvancing) return;

    setIsAdvancing(true);
    try {
      if (!isCancelled) {
        // Save the current card first; stay here if it fails so the error is visible.
        const ok = await handleSaveDetailForm({ silentIfClean: true });
        if (!ok) return;
      }

      const nextStep = routes[nextIndex];
      if (nextStep) {
        setSlideDir(1);
        handleOpenDetails(nextStep, nextIndex);
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  const handlePreviousOperation = async () => {
    if (prevIndex < 0 || isAdvancing) return;

    setIsAdvancing(true);
    try {
      // Only save when something was edited; going back never blocks on an untouched card.
      if (!isCancelled && detailFormDirty) {
        const ok = await handleSaveDetailForm({ silentIfClean: true });
        if (!ok) return;
      }

      const prevStep = routes[prevIndex];
      if (prevStep) {
        setSlideDir(-1);
        handleOpenDetails(prevStep, prevIndex);
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  // Click-to-continue: save first, throw on failure so the control turns red.
  const handleSlideSave = async () => {
    if (isCancelled) return;
    const ok = await handleSaveDetailForm({ silentIfClean: true });
    if (!ok) throw new Error('Save failed');
  };

  // After the green "Saved" state: open the next operation.
  const handleSlideDone = () => {
    const nextStep = routes[nextIndex];
    if (nextStep) {
      setSlideDir(1);
      handleOpenDetails(nextStep, nextIndex);
    }
  };

  // Click-to-go-back: only save when something was edited, so an untouched card never blocks going back.
  const handleSlidePrevSave = async () => {
    if (isCancelled || !detailFormDirty) return;
    const ok = await handleSaveDetailForm({ silentIfClean: true });
    if (!ok) throw new Error('Save failed');
  };

  const handleSlidePrevDone = () => {
    const prevStep = routes[prevIndex];
    if (prevStep) {
      setSlideDir(-1);
      handleOpenDetails(prevStep, prevIndex);
    }
  };

  // Optional shortcuts: Alt + Right / Alt + Left move between operations.
  useEffect(() => {
    if (!detailStep) return;
    const onKey = (e) => {
      if (!e.altKey) return;
      if (e.key === 'ArrowRight' && nextIndex >= 0) {
        e.preventDefault();
        handleNextOperation();
      } else if (e.key === 'ArrowLeft' && prevIndex >= 0) {
        e.preventDefault();
        handlePreviousOperation();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [
    detailStep,
    nextIndex,
    prevIndex,
    routes,
    detailFormValues,
    detailFormDirty,
    isAdvancing,
    isCancelled,
  ]);

  return (
    <div className="space-y-2" id="routing-allocation-view">
      <style>{addPageAnimations}</style>
      <div
        className="sa-banner rounded-2xl px-8 py-5 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden relative"
        style={{ backgroundColor: '#53555aff' }}
        id="routing-stage-header"
      >
        {/* subtle manufacturing scan-line accent */}
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 3px, #fff 3px, #fff 4px)',
          }}
          initial={{ y: '-100%' }}
          animate={{ y: '100%' }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
        />

        <div className="relative z-10">
          <motion.div
            className="flex items-center gap-2 mb-1"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <span className="text-[19px] font-bold px-2 py-0.5 rounded bg-white/10 text-white border border-white/20">
              Stage 2 of 2
            </span>
          </motion.div>
          <h2
            className="min-h-[41px] text-3xl font-bold text-white"
            aria-live="polite"
            aria-label="Manufacturing Routing"
          >
            {routingTitle.shown}
            {!routingTitle.done && <span className="sa-caret ml-1 text-white">|</span>}
          </h2>
          <motion.p
            className="text-sm text-slate-200 mt-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            Integrated Live Database
          </motion.p>
        </div>

        <div
          className="sa-hang flex items-center gap-3 shrink-0 relative z-10"
          style={{ animationDelay: '0.35s' }}
        >
          {isCancelled ? (
            <div
              className="relative z-10 flex h-[140px] w-[270px] flex-col justify-between rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-left shadow-sm"
              role="status"
              aria-label="Work order cancelled"
            >
              <div>
                <h2 className="text-[19px] font-extrabold tracking-tight text-rose-700">
                  Work Order Cancelled
                </h2>
                <p className="mt-1 text-[13px] font-semibold text-slate-600 leading-relaxed">
                  This work order cannot be released again.
                </p>
              </div>
              <span className="text-[12px] font-bold text-rose-600">
                ✕ Work Order Cancelled
              </span>
            </div>
          ) : selectedRouteEntry ? null : isReleased ? (
            <button
              type="button"
              onClick={handleCancelWorkOrder}
              className="group relative z-10 flex h-[120px] w-[239px] flex-col justify-between rounded-xl border border-rose-200 bg-white px-3 py-5 text-left shadow-lg transition-all duration-300 ease-out origin-top hover:-translate-y-1 hover:rotate-[1deg] hover:scale-[1.02] hover:shadow-xl cursor-pointer"
              title="Cancel Released Work Order"
              id="btn-cancel-work-order"
            >
              <div>
                <h2 className="text-[23px] font-extrabold tracking-tight text-rose-700 transition-transform duration-300 group-hover:scale-[1.04] origin-left">
                  Cancel Work Order
                </h2>
                <p className="mt-1 text-[12px] font-semibold text-slate-500 leading-relaxed">
                  Released Work Order:{' '}
                  <span className="font-bold text-rose-500">
                    {workOrder.workOrderNo}
                  </span>
                </p>
              </div>
              <span className="text-[11px] font-bold text-rose-600 group-hover:text-rose-700 transition-colors flex items-center gap-1">
                ✕ Cancel Released Work Order
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReleaseWorkOrder}
              disabled={isReleased}
              className="group relative z-10 flex h-[120px] w-[250px] flex-col justify-between rounded-xl border border-sky-200 bg-white px-5 py-4 text-left shadow-lg transition-all duration-300 ease-out origin-top hover:-translate-y-1 hover:rotate-[0deg] hover:scale-[1.02] hover:shadow-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-80"
              title="Release Work Order to Shop Floor"
              id="btn-release-work-order"
            >
              <div>
                <h2 className="text-[22px] font-extrabold tracking-tight text-sky-700 transition-transform duration-300 group-hover:scale-[1.07] origin-left">
                  Release Work Order
                </h2>
                <p className="mt-1 text-[12px] font-semibold text-slate-500 leading-relaxed">
                  Ready to deploy to shop floor
                </p>
              </div>
              <span className="text-[11px] font-bold text-sky-600 group-hover:text-sky-700 transition-colors flex items-center gap-1">
                ✓ Release Work Order to Shop Floor
              </span>
            </button>
          )}
          {!isCancelled && isReleased && !selectedRouteEntry && (
            <button
              onClick={handleUpdateWorkOrder}
              disabled={!hasRoutingChanges}
              className={`px-6 py-3 rounded-xl font-extrabold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 shrink-0 ${hasRoutingChanges
                ? 'cursor-pointer bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
                : 'cursor-not-allowed bg-slate-300 text-slate-500 shadow-none'
                }`}
              id="btn-update-work-order"
            >
              <FileCheck2 className="w-4 h-4" />
              Update
            </button>
          )}
        </div>
      </div>

      <div
        className="sa-fade-up bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
        id="routing-steps-section"
        style={{ animationDelay: '0.4s' }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          {selectedRouteEntry ? (
            prevIndex < 0 ? (
              <span aria-hidden="true" />
            ) : (
              <SlideCommit
                key={`prev-${selectedRouteEntry.key}`}
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
            <h3
              className="sa-fade-up text-[22px] font-extrabold text-slate-700 flex items-center gap-2"
              style={{ animationDelay: '0.55s' }}
            >
              <motion.span
                initial={{ rotate: -20, scale: 0.7 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 18 }}
              >
                <Cpu className="w-8 h-8 text-indigo-600" />
              </motion.span>
              Manufacturing Routing Steps
            </h3>
          )}

          {/* Hidden completely on the last operation */}
          {selectedRouteEntry && nextIndex >= 0 && (
            <SlideCommit
              key={selectedRouteEntry.key}
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
              disabled={nextIndex < 0}
              animateLabel={!isLastStage}
              className={`${isLastStage ? '' : 'sa-pop'} ml-auto shadow-md`}
            />
          )}
        </div>

        {loadingRDBMS ? (
          <motion.p
            className="text-xs text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            Loading routing steps...
          </motion.p>
        ) : routes.length === 0 ? (
          <div className="border border-slate-800 rounded-xl overflow-hidden w-fit">
            <div className="p-4" style={{ backgroundColor: '#15171c' }}>
              <div className="flex items-start gap-25 mb-3">
                <div>
                  <span className="text-[8px] font-extrabold font-mono text-slate-600 bg-black/30 px-1.5 py-0.5 rounded border border-slate-700">
                    &nbsp;
                  </span>
                  <h5 className="text-[9px] font-extrabold text-slate-600 mt-1 leading-snug">
                    &nbsp;
                  </h5>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    disabled
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-800 bg-grey/30 border border-slate-700 rounded-lg px-2.5 py-1.5 cursor-not-allowed"
                  >
                    Details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div
                className="grid gap-x-6 gap-y-6 text-[18px]"
                style={{
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(130px, max-content))',
                }}
              >
                <Field label="Planned Qty" dark />
                <Field label="Process Type" dark />
                <Field label="Operation Name" dark />
                <Field label="Job Card No" dark />
              </div>
            </div>
          </div>
        ) : (
          <div
            id="routing-flow-wrapper"
            className={`grid items-start gap-6 overflow-visible ${selectedRouteEntry
              ? 'grid-cols-1 justify-center justify-items-center lg:justify-items-stretch lg:grid-cols-[400px_minmax(0,880px)] mx-auto w-full'
              : 'grid-cols-1'
              }`}
          >
            {/* Left column: all cards, or only the selected card */}
            <motion.div
              id="routing-card-grid"
              className={`grid grid-cols-1 gap-4 overflow-visible ${selectedRouteEntry
                ? 'relative z-20 min-h-[400px] mb-24 lg:mb-12 lg:mt-35 lg:-ml-7'
                : 'sm:grid-cols-2 lg:grid-cols-5'
                }`}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.08,
                    delayChildren: 0.75,
                  },
                },
              }}
            >
              <AnimatePresence
                mode="popLayout"
                custom={selectedRouteEntry ? slideDir : 0}
              >
                {visibleRouteEntries.map(({ step, idx, key }) => (
                  <motion.div
                    key={key}
                    className="min-w-0"
                    custom={selectedRouteEntry ? slideDir : 0}
                    exit="exit"
                    variants={{
                      hidden: (dir = 0) => ({
                        opacity: 0,
                        x: dir * 90,
                        y: dir ? 0 : 28,
                        scale: 0.94,
                        filter: 'blur(4px)',
                      }),
                      visible: {
                        opacity: 1,
                        x: 0,
                        y: 0,
                        scale: 1,
                        filter: 'blur(0px)',
                        transition: {
                          type: 'spring',
                          stiffness: 280,
                          damping: 24,
                          mass: 0.85,
                        },
                      },
                      exit: (dir = 0) => ({
                        opacity: 0,
                        x: dir * -90,
                        scale: 0.9,
                        transition: { duration: 0.25 },
                      }),
                    }}
                  >
                    {renderRoutingCard(
                      step,
                      idx,
                      key === selectedRouteEntry?.key,
                      false
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Right column: wide details pane */}
            <AnimatePresence mode="wait" custom={slideDir}>
              {selectedRouteEntry && (
                <motion.aside
                  key={selectedRouteEntry.key}
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
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[16px] font-extrabold text-slate-800">
                        Selected Job Card
                      </h4>
                      <p className="mt-0.5 text-[13px] text-slate-600">
                        Close this panel to show all job cards again.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeSelectedCard}
                      aria-label="Close selected job card panel"
                      title="Show all cards"
                      className="shrink-0 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      <X className="h-8 w-8 font-extrabold text-red-600 cursor-pointer" />
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
                          {selectedItemCode} , {selectedRouteEntry.step.opItemName || selectedRouteEntry.step.operationName || 'Routing operation'}
                        </p>
                      </div>
                      {detailFormDirty && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-900">
                          Unsaved changes
                        </span>
                      )}
                    </div>

                    <div className="grid flex-1 grid-cols-1 content-start gap-x-6 gap-y-6 p-5 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        ...DETAIL_FIELDS.filter((f) => f.key !== 'remarks'),
                        { key: 'nextJobCardNo', label: 'Next Job Card No' },
                        ...DETAIL_FIELDS.filter((f) => f.key === 'remarks'),
                      ].map((field) => field.key === 'nextJobCardNo' ? (
                        // Sits under End Date: the job card that starts when this one ends.
                        <label key={field.key} className="min-w-0 xl:col-start-4">
                          <span className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase text-blue-300">
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                            {field.label}
                          </span>
                          <input
                            type="text"
                            readOnly
                            value={nextIndex >= 0 ? String(routes[nextIndex]?.jobCardNo ?? '') : ''}
                            placeholder={nextIndex >= 0 ? '—' : 'Last operation'}
                            className="w-full cursor-default rounded-lg border-2 border-dashed border-blue-500 bg-blue-600/15 px-3 py-3 font-mono text-[15px] font-extrabold text-blue-100 shadow-[0_0_0_3px_rgba(59,130,246,0.18)] placeholder-blue-300/60 focus:outline-none"
                          />
                        </label>
                      ) : field.key === 'startDate' ? (
                        <div key={field.key} className="min-w-0">
                          <span className="mb-2 block text-[11px] font-bold uppercase text-slate-300">
                            {field.label}
                            <span className="ml-1 text-rose-300" aria-hidden="true">*</span>
                          </span>
                          <DatePicker
                            id="start-date-picker"
                            label={field.label}
                            hideLabel
                            dark
                            compact
                            iconRight
                            readOnlyInput
                            disablePastDates
                            minDate={minStartDate}
                            value={toDisplayDate(detailFormValues.startDate)}
                            onChange={handleStartDatePick}
                            disabled={isCancelled}
                          />
                        </div>
                      ) : (
                        <label
                          key={field.key}
                          className={`min-w-0 ${field.key === 'remarks' ? 'sm:col-span-2 xl:col-span-4' : ''}`}
                        >
                          <span className="mb-2 block text-[11px] font-bold uppercase text-slate-300">
                            {field.label}
                            {REQUIRED_ROUTING_DETAIL_FIELDS.includes(field.key) && (
                              <span className="ml-1 text-rose-300" aria-hidden="true">*</span>
                            )}
                          </span>
                          <input
                            type={
                              field.key === 'startDate' || field.key === 'endDate'
                                ? 'date'
                                : field.key === 'startTime' || field.key === 'endTime'
                                  ? 'time'
                                  : field.key === 'settingTimeMinutes' || field.key === 'cycleTimeMinutes'
                                    ? 'number'
                                    : 'text'
                            }
                            value={
                              field.key === 'warehouse'
                                ? selectedWarehouse
                                : field.key === 'startDate' || field.key === 'endDate'
                                  ? toDateInputValue(detailFormValues[field.key])
                                  : field.key === 'startTime' || field.key === 'endTime'
                                    ? formatTimeHHMM(detailFormValues[field.key])
                                    : String(detailFormValues[field.key] ?? '')
                            }
                            placeholder={
                              field.key === 'startTime' ||
                                field.key === 'endTime' ||
                                field.key === 'totalTimeMinutes'
                                ? '00:00'
                                : undefined
                            }
                            readOnly={
                              isCancelled || READ_ONLY_DETAIL_KEYS.includes(field.key)
                            }
                            disabled={isCancelled}
                            required={REQUIRED_ROUTING_DETAIL_FIELDS.includes(field.key)}
                            min={
                              field.key === 'settingTimeMinutes' || field.key === 'cycleTimeMinutes'
                                ? '0'
                                : undefined
                            }
                            step={
                              field.key === 'settingTimeMinutes' || field.key === 'cycleTimeMinutes'
                                ? 'any'
                                : undefined
                            }
                            onChange={(event) =>
                              handleDetailFieldChange(field.key, event.target.value)
                            }
                            className="w-full rounded-lg border border-slate-800 bg-black/45 px-3 py-3 text-[15px] text-white placeholder-slate-400 focus:border-slate-600 focus:outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>

                    {detailSaveFeedback && (
                      <div
                        role={detailSaveFeedbackType === 'error' ? 'alert' : 'status'}
                        className={`mx-4 mb-3 rounded-lg border px-3 py-2 text-sm font-semibold ${detailSaveFeedbackType === 'error'
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : detailSaveFeedbackType === 'info'
                            ? 'border-sky-300 bg-sky-50 text-sky-700'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          }`}
                      >
                        {detailSaveFeedback}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 px-4 py-3">
                      <p className="text-xs text-slate-300">
                        <span className="text-rose-300">*</span> Required. Fill all required fields before saving.
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(selectedRouteEntry.step, selectedRouteEntry.idx)}
                          className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveDetailForm()}
                          disabled={isCancelled}
                          title={isCancelled ? 'Cancelled work orders cannot be edited' : 'Save routing details'}
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
        )}
      </div>

      <AnimatePresence>
        {showCancelConfirmation && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-work-order-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/60 cursor-default"
              aria-label="Close cancellation confirmation"
              onClick={() => {
                if (!isCancelling) setShowCancelConfirmation(false);
              }}
            />

            <motion.div
              className="relative w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              <h2
                id="cancel-work-order-title"
                className="text-xl font-extrabold text-rose-700"
              >
                Cancel Work Order?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Are you sure you want to cancel Work Order{' '}
                <span className="font-bold text-slate-900">
                  #{workOrder.workOrderNo}
                </span>
                ? This will mark it as Cancelled in Work Orders.
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
                  {isCancelling ? 'Cancelling…' : 'Yes, Cancel Work Order'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function Field({ label, value, badge, dark }) {
  const labelClass = dark
    ? 'text-[11px] text-slate-400 block uppercase font-extrabold'
    : 'text-[11px] text-slate-400 block uppercase font-bold';

  const valueClass = dark
    ? 'font-semibold text-slate-100 truncate block text-[13.5px]'
    : 'font-medium text-slate-700 truncate block';

  if (value === undefined || value === null || value === '') {
    return (
      <div>
        <span className={labelClass}>{label}</span>
        <span>&nbsp;</span>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <span className={labelClass}>{label}</span>

      {badge ? (
        <span
          className={
            dark
              ? `inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${String(value).trim().toLowerCase() === 'released'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-900'
                : 'bg-blue-950 text-blue-300 border-blue-900'}`
              : 'inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100'
          }
        >
          {value}
        </span>
      ) : (
        <span className={valueClass}>{value}</span>
      )}
    </div>
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Click-to-commit control. Click anywhere on it (or press Enter / Space / arrow key)
// and the handle slides to the end by itself, then runs onConfirm.
// onConfirm may be async; if it throws, the track turns red and the handle returns.
function SlideCommit({
  label = 'Click to confirm',
  doneLabel = 'Done',
  errorLabel = 'Try Again',
  onConfirm,
  onDone,
  onError,
  trackColor = '#262626',
  handleColor = '#f5f5f5',
  successColor = '#22c55e',
  dangerColor = '#e5484d',
  width = 280,
  height = 56,
  radius = 28,
  speed = 50, // label shimmer speed, px/second
  returnBounce = 0.38,
  landingDip = 0.026,
  holdMs = 1500,
  outcome = 'resolve', // only used when onConfirm is not passed (demo)
  latency = 1200, // only used when onConfirm is not passed (demo)
  disabled = false,
  direction = 'right', // 'right' (next) or 'left' (previous)
  animateLabel = true, // false = static label (no shimmer)
  className = '',
}) {
  const isLeft = direction === 'left';
  const PAD = 4;
  const handleSize = height - PAD * 2;
  const maxX = Math.max(0, width - handleSize - PAD * 2);

  const x = useMotionValue(0);
  const scale = useMotionValue(1);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const mounted = useRef(true);
  const running = useRef(false); // guards against double clicks
  const callbacks = useRef({});
  callbacks.current = { onConfirm, onDone, onError };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleX = useTransform(x, (v) => (isLeft ? -v : v));
  const fillWidth = useTransform(x, (v) => v + handleSize + PAD * 2);
  const labelOpacity = useTransform(x, [0, maxX * 0.45], [1, 0]);

  const busy = status !== 'idle';
  const locked = disabled || busy;
  const safeSet = (s) => {
    if (mounted.current) setStatus(s);
  };

  const springBack = () =>
    animate(x, 0, { type: 'spring', bounce: returnBounce, duration: 0.55 });

  const commit = async () => {
    if (running.current) return;
    running.current = true;
    setStatus('loading');
    try {
      // Auto-slide the handle to the end
      await animate(x, maxX, { type: 'spring', stiffness: 260, damping: 28 });
      animate(scale, [1, 1 - landingDip * 3, 1], { duration: 0.28, ease: 'easeOut' });

      if (callbacks.current.onConfirm) {
        await callbacks.current.onConfirm();
      } else {
        await sleep(latency);
        if (outcome === 'reject') throw new Error('Rejected');
      }
      safeSet('success');
      await sleep(holdMs);
      callbacks.current.onDone?.();
    } catch (err) {
      safeSet('error');
      callbacks.current.onError?.(err?.message ?? err);
      await sleep(holdMs);
      if (!mounted.current) return;
      await springBack();
      safeSet('idle');
    } finally {
      running.current = false;
    }
  };

  const handleClick = () => {
    if (locked) return;
    commit();
  };

  const onKeyDown = (e) => {
    if (locked) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === (isLeft ? 'ArrowLeft' : 'ArrowRight')) {
      e.preventDefault();
      commit();
    }
  };

  const fillColor =
    status === 'success'
      ? successColor
      : status === 'error'
        ? dangerColor
        : 'rgba(255,255,255,0.10)';
  const resultText =
    status === 'success' ? doneLabel : status === 'error' ? errorLabel : null;

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
        cursor: locked ? 'default' : 'pointer',
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
                  'linear-gradient(90deg, rgba(255,255,255,.35) 0%, rgba(255,255,255,.95) 50%, rgba(255,255,255,.35) 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }
              : { color: 'rgba(255,255,255,.95)' }
          }
          animate={
            !animateLabel || disabled || busy
              ? undefined
              : { backgroundPositionX: ['200%', '-200%'] }
          }
          transition={{
            duration: Math.max(1, width / Math.max(1, speed)),
            repeat: Infinity,
            ease: 'linear',
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
          role="status">
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
          color: '#171717',
          x: handleX,
          scale,
          boxShadow: '0 2px 8px rgba(0,0,0,.35)',
        }}
      >
        {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
        {status === 'success' && <Check className="h-5 w-5" style={{ color: successColor }} />}
        {status === 'error' && <X className="h-5 w-5" style={{ color: dangerColor }} />}
        {status === 'idle' &&
          (isLeft ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />)}
      </motion.div>
    </div>
  );
}