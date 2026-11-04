import React from 'react';
import { ChevronRight, ChevronLeft, Undo2 } from 'lucide-react';

export default function Header({
  currentPage,
  setCurrentPage,
  workOrder,
  isCreatingOrEditing = false,
  isEditMode = false,
  onBackToList,
  onBackAsDraft,
  showCancelButton = false,
  onCancelWorkOrder,
}) {
  const handleBackToConsole = () => {
    onBackToList?.();
  };

  return (
    <header className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex items-center gap-1.5 text-[19px] font-bold text-slate-500">
          <span className="cursor-pointer transition-colors hover:text-[#4a22a1]">
            PPC
          </span>
          <ChevronRight className="h-5 w-5 text-slate-400" />
          <span className="text-[19px] text-slate-500 transition-colors">
            Sale Order Planning
          </span>
          {isCreatingOrEditing && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              <span
                className="cursor-pointer text-slate-800 transition-colors hover:text-slate-700"
                onClick={() => setCurrentPage(1)}
              >
                Planning Configuration Desk
              </span>
            </>
          )}
          {isCreatingOrEditing && currentPage === 2 && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              <span className="font-extrabold text-[#4a22a1]">
                Routing &amp; Allocation
              </span>
            </>
          )}
        </nav>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-extrabold tracking-tight text-slate-900">
            {!isCreatingOrEditing
              ? 'Make to Order Management Console'
              : isEditMode
                ? 'Modify Sale Order Planning'
                : 'Create Sale Order Planning'}
          </h1>
        </div>

        {isCreatingOrEditing ? (
          <div className="flex w-full items-center gap-2 lg:w-auto">
            {!isEditMode && currentPage === 1 && !workOrder.fgItemName && (
              <button
                type="button"
                onClick={handleBackToConsole}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all duration-200 hover:bg-slate-50"
                id="back-to-work-order-console-btn"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {!isEditMode && currentPage === 1 && !!workOrder.fgItemName && (
              <button
                type="button"
                onClick={() => onBackAsDraft?.()}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all duration-200 hover:bg-slate-50"
                id="back-as-draft-btn"
              >
                <Undo2 className="h-5 w-5" />
                Back as Draft
              </button>
            )}

            {currentPage === 2 && (
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className="flex items-center gap-1 rounded-xl border border-slate-200/60 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800"
                id="back-to-planning-blueprint-btn"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {isEditMode && currentPage === 1 && (
              <button
                type="button"
                onClick={onBackToList}
                className="flex items-center gap-1 rounded-xl border border-slate-200/60 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800"
                id="back-to-status-btn"
              >
                <Undo2 className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <div className="flex w-full max-w-md items-center rounded-xl border border-slate-200/60 bg-slate-50 p-1.5 lg:w-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 lg:flex-initial ${currentPage === 1 ? 'border border-slate-200 bg-white text-[#4a22a1] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  id="step-planning-blueprint-btn"
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold ${currentPage === 1 ? 'bg-[#4a22a1] text-white' : 'bg-slate-200 text-slate-600'}`}>
                    1
                  </span>
                  Planning Blueprint
                </button>

                <ChevronRight className="mx-1 hidden h-3.5 w-3.5 text-slate-300 lg:block" />

                <button
                  type="button"
                  onClick={() => {
                    if (isEditMode && workOrder.fgItemCode) {
                      setCurrentPage(2);
                    }
                  }}
                  disabled={!isEditMode || !workOrder.fgItemCode}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 lg:flex-initial ${!isEditMode || !workOrder.fgItemCode ? 'cursor-not-allowed opacity-50' : ''} ${currentPage === 2 ? 'border border-slate-200 bg-white text-[#4a22a1] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  id="step-routing-allocation-btn"
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold ${currentPage === 2 ? 'bg-[#4a22a1] text-white' : 'bg-slate-200 text-slate-600'}`}>
                    2
                  </span>
                  Routing &amp; Allocation
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" aria-hidden="true" className="hidden" />
        )}
      </div>
    </header>
  );
}
