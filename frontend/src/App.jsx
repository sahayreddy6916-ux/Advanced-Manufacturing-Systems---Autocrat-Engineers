import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_FG_ITEMS } from './mockData';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import WorkOrderList from './components/WorkOrderList';
import StockAllocation from './components/StockAllocation.jsx';
import CardPlanning from './components/CardPlanning';
import CardRouting from './components/CardRouting';
import RdbmsExplorer from './components/RdbmsExplorer';
import Toast, { useToasts } from './components/Toast';
import SalesOrder from './components/SalesOrder';
import StockOrderPlanning from "./components/StockOrderPlanning";
import ItemMaster from './components/ItemMaster';
import Productionexecution from './components/Productionexecution';

import {
  fetchWorkOrderDetailsRDBMS,
  saveWorkOrderRDBMS,
  getNextWorkOrderNo
} from './api';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Start on the Production Execution console. Change back to
  // 'rdbms-explorer' if you want the old default screen.
  const [activeModule, setActiveModule] =
    useState('prod-execution');

  const [isCreatingOrEditing, setIsCreatingOrEditing] =
    useState(false);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [isEditMode, setIsEditMode] =
    useState(false);

  const [workOrderListRefreshKey, setWorkOrderListRefreshKey] =
    useState(0);

  const [selectedProductionOrderId, setSelectedProductionOrderId] =
    useState(null);

  const { toasts, showToast, removeToast } = useToasts();

  const [workOrder, setWorkOrder] =
    useState({
      fgItemCode: "",
      fgItemName: "",
      itemType: "",
      drawingRev: "",
      unit: "",
      orderType: "",
      orderedQty: 0,
      plannedQty: 0,
      workOrderNo: "",
      workOrderDate: "",
      projCompDate: "",
      planner: "",
      remarks: "",
      status: "Draft",
      priority: "Normal"
    });

  // ============================================================
  // PRODUCTION ORDER → SALE ORDER NAVIGATION
  // ============================================================

  const handleViewSalesOrder = (poId) => {
    console.log("Opening Sale Order Console for Production Order:", poId);
    setSelectedProductionOrderId(poId);
    setActiveModule('sales-order');
  };

  const handleOpenSalesOrders = () => {
    console.log("Opening Sale Order Console (no PO preselected)");
    setSelectedProductionOrderId(null);
    setActiveModule('sales-order');
  };

  const handleBackFromSalesOrder = () => {
    console.log("Returning to Production Order Console");
    setSelectedProductionOrderId(null);
    setActiveModule('prod-order');
  };

  // ============================================================
  // SALE ORDER → WORK ORDER PLANNING MAPPING
  // ============================================================

  const handleProceedToPlanningFromSO = async (so) => {
    console.log("Mapping Sale Order into Work Order:", so);

    // Next work order number from the database sequence (WO-1, WO-2, ...)
    const nextWorkOrderNo = await getNextWorkOrderNo();

    if (!nextWorkOrderNo) {
      showToast(
        "Work Order Number Failed",
        "error",
        "Could not get the next work order number from the server."
      );
      return;
    }

    // Live date (today) in DD-MM-YYYY format
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const today = `${dd}-${mm}-${yyyy}`;

    setWorkOrder({
      // FG Item Code = Part No from Sale Order
      fgItemCode: so.partNo || "",

      // FG Item Name = Part Description from Sale Order
      fgItemName: so.partDescription || "",

      // Item Type from Sale Order (falls back to Customer_PO)
      itemType: so.itemType || "Customer_PO",

      // Drawing Revision from Sale Order
      drawingRev: so.drawingRev || "",

      unit: "",
      orderType: "For Order (Sales)",

      // Quantities
      orderedQty: Number(so.quantity) || 0,
      plannedQty: 0,

      // Work Order Number (auto generated, sequential)
      workOrderNo: nextWorkOrderNo,

      // Work Order Date = Today's live date
      workOrderDate: today,

      // Projected Completion Date = Dock Date or Ship Date from SO
      projCompDate: "",

      planner: "",
      remarks: `From Sale Order: ${so.poNumber}`,
      status: "Draft",
      priority: "Normal",

      // Extra fields used by CardPlanning
      cardCode: so.cardCode || "",
      cardName: so.customerName || "",
      openQty: Number(so.openQty) || 0,
      pendingQty: Number(so.pendingQty) || 0,
    });

    setIsEditMode(false);
    setIsCreatingOrEditing(true);
    setCurrentPage(1);
    setActiveModule("wo-planning");

    showToast(
      "Sale Order Loaded",
      "success",
      `Sale Order ${so.poNumber} loaded. FG Item: ${so.partNo}`
    );
  };

  // ============================================================
  // WORK ORDER HANDLERS
  // ============================================================

  const handleProceed = () => {
    if (!workOrder.fgItemCode) {
      showToast(
        "Select Finished Good Item",
        "warning",
        "You must choose a valid FG Item Code before proceeding to material routing."
      );
      return;
    }

    // Keep the existing lifecycle status when proceeding from Stage 1.
    // In particular, a Released work order must remain Released so Stage 2
    // does not show the Release Work Order option again.
    setWorkOrder((previous) => {
      const normalizedStatus = String(previous.status || '').trim().toLowerCase();
      if (normalizedStatus === 'released' || normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
        return previous;
      }
      return { ...previous, status: 'Planned' };
    });

    setCurrentPage(2);

    showToast(
      "Loading Routing Sequences...",
      "info",
      `Retrieving manufacturing routing steps and raw component allocation maps for ${workOrder.fgItemCode}.`
    );
  };

  const handleBack = () => {
    setCurrentPage(1);
  };

  const handleBackToList = () => {
    setIsCreatingOrEditing(false);
    setIsEditMode(false);
    setCurrentPage(1);
  };

  const handleWorkOrderReleased = () => {
    setIsCreatingOrEditing(false);
    setIsEditMode(false);
    setCurrentPage(1);
    setWorkOrderListRefreshKey((key) => key + 1);
  };

  const toNullableDate = (value) => {
    const trimmed = String(value ?? '').trim();
    return trimmed === '' ? null : trimmed;
  };

  const handleBackAsDraft = async () => {
    const draftWorkOrder = {
      ...workOrder,
      status: "Draft",
      workOrderDate: toNullableDate(workOrder.workOrderDate),
      projCompDate: toNullableDate(workOrder.projCompDate),
    };

    try {
      const saved = await saveWorkOrderRDBMS(draftWorkOrder, !isEditMode);

      if (!saved) {
        showToast("Draft Save Failed", "error", "The work order could not be saved as Draft.");
        return;
      }

      setWorkOrder(draftWorkOrder);
      setIsCreatingOrEditing(false);
      setIsEditMode(false);
      setCurrentPage(1);
      setWorkOrderListRefreshKey((key) => key + 1);

      showToast(
        "Saved as Draft",
        "success",
        `Work Order ${draftWorkOrder.workOrderNo} is now saved as Draft.`
      );
    } catch (error) {
      console.error("Back as Draft failed:", error);
      showToast(
        "Draft Save Failed",
        "error",
        "An unexpected error occurred while saving the work order as Draft."
      );
    }
  };

  const handleDraftSaved = () => {
    setIsCreatingOrEditing(false);
    setIsEditMode(false);
    setCurrentPage(1);
    setWorkOrderListRefreshKey((key) => key + 1);

    showToast(
      "Work Order Scheduled",
      "success",
      "The planned work order is now available in the Work Order Management Console."
    );
  };

  const handleAddNew = async () => {
    // Next work order number from the database sequence (WO-1, WO-2, ...)
    const nextWorkOrderNo = await getNextWorkOrderNo();

    if (!nextWorkOrderNo) {
      showToast(
        "Work Order Number Failed",
        "error",
        "Could not get the next work order number from the server."
      );
      return;
    }

    setIsEditMode(false);
    setIsCreatingOrEditing(true);

    setWorkOrder({
      fgItemCode: "",
      fgItemName: "",
      itemType: "",
      drawingRev: "",
      unit: "",
      orderType: "",
      orderedQty: 0,
      plannedQty: 0,
      workOrderNo: nextWorkOrderNo,
      workOrderDate: "",
      projCompDate: "",
      planner: "",
      remarks: "",
      status: "Draft",
      priority: "Normal"
    });

    setCurrentPage(1);

    showToast(
      "Initiated Blank Work Order",
      "info",
      "Please specify Order Type and FG Item Code, then run SO Load."
    );
  };

  const normalizeToDisplayDate = (raw) => {
    if (!raw) return '';
    const datePart = raw.includes('T') ? raw.slice(0, 10) : raw;
    const isoMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, yyyy, mm, dd] = isoMatch;
      return `${dd}-${mm}-${yyyy}`;
    }
    return datePart;
  };

  const handleEditWorkOrder = async (
    woNo,
    itemCode,
    orderType,
    qty,
    unit,
    status
  ) => {
    setIsEditMode(true);
    setIsCreatingOrEditing(true);

    const fetchedWO = await fetchWorkOrderDetailsRDBMS(woNo);

    let selectedStatus = status || 'Draft';

    if (fetchedWO) {
      const raw = fetchedWO;
      selectedStatus = raw.status ?? raw.workOrderStatus ?? status ?? 'Draft';

      const projCompDateRaw =
        raw.projCompDate ??
        raw.projCompletionDate ??
        raw.completionDate ??
        raw.proj_comp_date ??
        raw.proj_completion_date ??
        '';

      const workOrderDateRaw =
        raw.workOrderDate ??
        raw.work_order_date ??
        '';

      const cardCode = raw.cardCode ?? raw.card_code ?? '';
      const cardName = raw.cardName ?? raw.card_name ?? '';
      const openQty = raw.openQty ?? raw.open_qty ?? 0;
      const pendingQty = raw.pendingQty ?? raw.pending_qty ?? 0;

      setWorkOrder({
        ...fetchedWO,
        cardCode: String(cardCode ?? ''),
        cardName: String(cardName ?? ''),
        openQty: Number(openQty ?? 0),
        pendingQty: Number(pendingQty ?? 0),
        workOrderDate: normalizeToDisplayDate(workOrderDateRaw),
        projCompDate: normalizeToDisplayDate(projCompDateRaw),
        remarks: raw.remarks ?? raw.remark ?? '',
      });
    } else {
      const item = MOCK_FG_ITEMS.find(i => i.code === itemCode) || {
        name: "CARTRIDGE SPECIFICATION MET",
        type: "Manufactured Parts",
        drawingRev: "Rev 1.0",
        defaultQty: qty
      };

      setWorkOrder({
        fgItemCode: itemCode,
        fgItemName: item.name,
        itemType: item.type,
        drawingRev: item.drawingRev,
        unit: unit || "Unit-1",
        orderType: orderType || "For Order (Sales)",
        orderedQty: qty,
        plannedQty: qty,
        workOrderNo: woNo,
        workOrderDate: "17-07-2026",
        projCompDate: "24-07-2026",
        planner: "",
        remarks: "",
        status: selectedStatus,
        priority: "Normal"
      });
    }

    // Always open a selected work order at Stage 1 (Card Planning).
    // Users can then choose "Proceed to Routing Stage Planning" to enter Stage 2.
    // handleProceed preserves Released/Cancelled status when moving to Stage 2.
    setCurrentPage(1);
  };

  const handleCancelWorkOrder = async () => {
    if (!workOrder.workOrderNo) return;

    const cancelled = await saveWorkOrderRDBMS(
      {
        ...workOrder,
        status: "Cancelled",
      },
      false
    );

    if (!cancelled) {
      showToast(
        "Cancellation Failed",
        "error",
        `Work Order ${workOrder.workOrderNo} could not be cancelled in the database.`
      );
      return;
    }

    setWorkOrder((previous) => ({
      ...previous,
      status: "Cancelled"
    }));

    setWorkOrderListRefreshKey((key) => key + 1);
    setIsCreatingOrEditing(false);
    setIsEditMode(false);
    setCurrentPage(1);

    showToast(
      "Work Order Cancelled",
      "success",
      `Work Order ${workOrder.workOrderNo} has been cancelled.`
    );
  };

  // ============================================================
  // PRODUCTION EXECUTION → WORK ORDER PLANNING
  // ============================================================

  const handleAddProductionOrder = async () => {
    setActiveModule('wo-planning');
    await handleAddNew();
  };

  // ============================================================
  // LOGIN
  // ============================================================

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLogin={() => setIsLoggedIn(true)}
      />
    );
  }

  // ============================================================
  // MAIN APPLICATION
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 flex" id="app-root-container">
      <Sidebar
        activeModule={activeModule}
        setActiveModule={(module) => {
          setActiveModule(module);

          if (module === 'wo-planning') {
            setIsCreatingOrEditing(false);
          }

          if (module === 'prod-order') {
            setSelectedProductionOrderId(null);
          }

          if (module !== 'sales-order') {
            setSelectedProductionOrderId(null);
          }
        }}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-300 min-h-screen"
        id="app-main-viewport"
      >

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8" id="main-content-layout">
          <AnimatePresence mode="wait">

            {/* WORK ORDER PLANNING */}
            {activeModule === 'wo-planning' ? (
              <motion.div
                key="planning-module"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="planning-module-viewport"
              >
                <Header
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  workOrder={workOrder}
                  isCreatingOrEditing={isCreatingOrEditing}
                  isEditMode={isEditMode}
                  showCancelButton={isEditMode}
                  onCancelWorkOrder={handleCancelWorkOrder}
                  onBackToList={handleBackToList}
                  onBackAsDraft={handleBackAsDraft}
                />

                {!isCreatingOrEditing ? (
                  <WorkOrderList
                    onAddNew={handleAddNew}
                    onEditWorkOrder={handleEditWorkOrder}
                    refreshKey={workOrderListRefreshKey}
                    onRefreshNeeded={() => setWorkOrderListRefreshKey((key) => key + 1)}
                  />
                ) : (
                  <div className="relative mt-4">
                    {currentPage === 1 ? (
                      <motion.div
                        key="page1"
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 15 }}
                        transition={{ duration: 0.2 }}
                        id="page-1-wrapper"
                      >
                        <CardPlanning
                          workOrder={workOrder}
                          setWorkOrder={setWorkOrder}
                          onProceed={handleProceed}
                          onDraftSaved={handleDraftSaved}
                          isEditMode={isEditMode}
                          showToast={showToast}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="page2"
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -15 }}
                        transition={{ duration: 0.2 }}
                        id="page-2-wrapper"
                      >
                        <CardRouting
                          workOrder={workOrder}
                          setWorkOrder={setWorkOrder}
                          onBack={handleBack}
                          onWorkOrderReleased={handleWorkOrderReleased}
                          showToast={showToast}
                        />
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>

            ) : activeModule === 'wo-status' ? (
              <motion.div
                key="wo-status-module"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="wo-status-module-viewport"
              >
              </motion.div>

            ) : activeModule === 'prod-execution' ? (
              <motion.div
                key="production-execution-module"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="production-execution-module-viewport"
              >
                <Productionexecution onAddOrder={handleAddProductionOrder} />
              </motion.div>

            ) : activeModule === 'stock-alloc' ? (
              <motion.div
                key="stock-alloc-module"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="stock-alloc-module-viewport"
              >
                <StockAllocation />
              </motion.div>

            ) : activeModule === 'prod-order' ? (
              <motion.div
                key="prod-order-module"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="prod-order-module-viewport"
              >
                <SalesOrder
                  onViewOrder={handleViewSalesOrder}
                  onViewSalesOrders={handleOpenSalesOrders}
                  onProceedToPlanning={handleProceedToPlanningFromSO}
                />
              </motion.div>

            ) : activeModule === 'item-master' ? (
              <motion.div
                key="item-master-module"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="item-master-module-viewport"
              >
                <ItemMaster />
              </motion.div>

            ) : activeModule === 'rdbms-explorer' ? (
              <motion.div
                key="rdbms-explorer-module"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="rdbms-explorer-module-viewport"
              >
                <RdbmsExplorer />
              </motion.div>

            ) : activeModule === 'stock-order-planning' ? (
              <motion.div
                key="stock-order-planning-module"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="stock-order-planning-module-viewport"
              >
                <StockOrderPlanning />
              </motion.div>

            ) : activeModule === 'sales-order' ? (
              <motion.div
                key="sales-order-module"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id="sales-order-module-viewport"
              >
                <SalesOrder
                  onViewOrder={handleViewSalesOrder}
                  onViewSalesOrders={handleOpenSalesOrders}
                  onProceedToPlanning={handleProceedToPlanningFromSO}
                  initialPage={2}
                  onBackToProduction={handleBackFromSalesOrder}
                />
              </motion.div>

            ) : (
              <motion.div
                key="fallback-module"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                id="sandbox-module-view"
              ></motion.div>
            )}
          </AnimatePresence>
        </main>
        <Toast toasts={toasts} removeToast={removeToast} />
      </div>
    </div>
  );
}