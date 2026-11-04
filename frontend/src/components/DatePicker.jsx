import React, { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function maskDateInput(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  let result = day;
  if (month) result += `-${month}`;
  if (year) result += `-${year}`;
  return result;
}

function parseDate(value) {
  const parts = value.split("-");
  if (parts.length === 3) {
    const day = Number.parseInt(parts[0], 10);
    const month = Number.parseInt(parts[1], 10) - 1;
    const year = Number.parseInt(parts[2], 10);

    if (
      Number.isInteger(day) &&
      Number.isInteger(month) &&
      Number.isInteger(year) &&
      month >= 0 &&
      month <= 11
    ) {
      return { day, month, year };
    }
  }

  const today = new Date();
  return {
    day: today.getDate(),
    month: today.getMonth(),
    year: today.getFullYear(),
  };
}

function parseValidDisplayDate(value) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // Reject impossible dates such as 31-02-2026 instead of letting Date normalize them.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function isBeforeToday(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export default function DatePicker({
  label,
  value,
  onChange,
  id,
  compact = false,
  disabled = false,
  disablePastDates = id === "proj-comp-date-picker",
  // Proj. Completion Date: calendar icon on the right, and clicking the field opens the calendar.
  iconRight = id === "proj-comp-date-picker",
  hideLabel = false, // label is rendered by the parent
  dark = false,      // dark input style (Routing job card panel)
  readOnlyInput = false, // pick from the calendar only (no typing)
  minDate = "",          // optional YYYY-MM-DD: earlier dates cannot be picked (e.g. previous job card's end)
}) {
  const isBlocked = (date) => {
    if (disablePastDates && isBeforeToday(date)) return true;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(minDate || "");
    if (!m) return false;
    return date < new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const currentSelection = parseDate(value);
  const [viewMonth, setViewMonth] = useState(currentSelection.month);
  const [viewYear, setViewYear] = useState(currentSelection.year);

  useEffect(() => {
    const parsed = parseDate(value);
    setViewMonth(parsed.month);
    setViewYear(parsed.year);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
    } else {
      setViewMonth((month) => month - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
    } else {
      setViewMonth((month) => month + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const dateCells = [
    ...Array.from({ length: firstDayWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const handleSelectDay = (day) => {
    const selectedDate = new Date(viewYear, viewMonth, day);
    if (isBlocked(selectedDate)) return;

    const formattedDate = [
      String(day).padStart(2, "0"),
      String(viewMonth + 1).padStart(2, "0"),
      String(viewYear),
    ].join("-");

    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleTypedInput = (event) => {
    const formattedValue = maskDateInput(event.target.value);
    const typedDate = parseValidDisplayDate(formattedValue);

    // Do not accept a completed, valid date if it is earlier than today.
    if (typedDate && isBlocked(typedDate)) return;

    onChange(formattedValue);
  };

  const inputId = `input-${id}`;

  return (
    <div className="relative w-full" ref={containerRef} id={`container-${id}`}>
      {!hideLabel && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          name={`date-${id}`}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleTypedInput}
          readOnly={readOnlyInput}
          onClick={() => iconRight && !disabled && setIsOpen(true)}
          disabled={disabled}
          maxLength={10}
          placeholder="DD-MM-YYYY"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          className={dark
            ? "w-full cursor-pointer rounded-lg border border-slate-800 bg-black/45 py-3 pl-3 pr-10 text-[15px] text-white placeholder-slate-400 transition-all focus:border-slate-600 focus:outline-none [color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-60"
            : `w-full rounded-xl border border-slate-200 bg-white py-2.5 ${iconRight ? "pl-4 pr-10 cursor-pointer" : "pl-10 pr-4"} font-mono text-sm font-medium text-slate-800 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`}
        />

        <button
          type="button"
          onClick={() => !disabled && setIsOpen((open) => !open)}
          disabled={disabled}
          aria-label="Choose date"
          aria-expanded={isOpen}
          className={`absolute inset-y-0 flex items-center transition-colors ${dark ? "text-slate-300 hover:text-white" : "text-slate-400 hover:text-slate-600"} ${iconRight ? "right-0 pr-3" : "left-0 pl-3"}`}
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>

      {isOpen && !disabled && (
        <div
          id={`dropdown-calendar-${id}`}
          className={`absolute left-0 z-40 mt-1.5 rounded-xl border ${dark ? "border-slate-700 bg-[#15171c]" : "border-slate-200 bg-white"} shadow-xl md:left-auto md:right-0 ${compact ? "w-[260px] p-2" : "w-[250px] p-5"}`}
        >
          <div className={`flex items-center justify-between ${compact ? "mb-1.5" : "mb-1.5"}`}>
            <span className={`font-extrabold ${dark ? "text-white" : "text-slate-800"} ${compact ? "text-[15px]" : "text-xs"}`}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <div className={compact ? "flex gap-0.5" : "flex gap-1"}>
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className={`rounded-lg border ${dark ? "border-slate-700 text-slate-200 hover:bg-white/10 hover:text-white" : "border-slate-100 text-slate-800 hover:bg-slate-50 hover:text-slate-700"} p-2`}
              >
                <ChevronLeft className={compact ? "h-3 w-3" : "h-4 w-4"} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className={`rounded-lg border ${dark ? "border-slate-700 text-slate-200 hover:bg-white/10 hover:text-white" : "border-slate-100 text-slate-800 hover:bg-slate-50 hover:text-slate-700"} p-2`}
              >
                <ChevronRight className={compact ? "h-3 w-3" : "h-4 w-4"} />
              </button>
            </div>
          </div>

          <div className={`mb-1 grid grid-cols-7 text-center ${compact ? "gap-0.5" : "gap-1"}`}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
              <span
                key={dayName}
                className={`font-bold uppercase tracking-wider text-slate-400 ${compact ? "text-[10px]" : "text-[11px]"}`}
              >
                {dayName}
              </span>
            ))}
          </div>

          <div className={`grid grid-cols-7 text-center ${compact ? "gap-0.5" : "gap-1"}`}>
            {dateCells.map((day, index) => {
              if (day === null) return <span key={`empty-${index}`} />;

              const isSelected =
                currentSelection.day === day &&
                currentSelection.month === viewMonth &&
                currentSelection.year === viewYear;
              const isPast = isBlocked(new Date(viewYear, viewMonth, day));

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  disabled={isPast}
                  aria-disabled={isPast}
                  className={`rounded-lg font-bold transition-colors ${compact ? "py-0 text-[12px]" : "py-1 text-xs"} ${isPast ? (dark ? "cursor-not-allowed bg-transparent text-slate-600" : "cursor-not-allowed bg-white text-slate-300") : isSelected ? "bg-sky-600 font-extrabold text-white" : dark ? "text-slate-100 hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className={`flex items-center justify-end border-t ${dark ? "border-slate-700" : "border-slate-100"} ${compact ? "mt-1.5 pt-1.5" : "mt-3 pt-3"}`}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`font-bold ${dark ? "text-slate-300 hover:text-white" : "text-slate-400 hover:text-slate-600"} text-[12px]`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}