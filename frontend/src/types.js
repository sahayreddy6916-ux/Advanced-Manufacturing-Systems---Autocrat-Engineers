/**
 * @typedef {Object} FGItem
 * @property {string} code - Unique finish good item code
 * @property {string} name - Finish good descriptive title
 * @property {string} type - Manufacturing classification group
 * @property {string} drawingRev - Drawing blueprint revision index
 * @property {string} defaultUnit - Base unit of measure (e.g. PCS)
 * @property {string} defaultOrderType - Default sales or inventory routing channel
 * @property {number} defaultQty - Base run lot sizing metric
 */

/**
 * @typedef {Object} WorkOrderState
 * @property {string} fgItemCode
 * @property {string} fgItemName
 * @property {string} itemType
 * @property {string} drawingRev
 * @property {string} unit
 * @property {string} orderType
 * @property {number} orderedQty
 * @property {number} plannedQty
 * @property {string} workOrderNo
 * @property {string} workOrderDate
 * @property {string} projCompDate
 * @property {string} planner
 * @property {string} remarks
 * @property {'Draft' | 'Open' | 'Released' | 'Cancelled'} status
 * @property {'Low' | 'Normal' | 'High' | 'Critical'} priority
 */

/**
 * @typedef {Object} RoutingStep
 * @property {number} [routingStepId]
 * @property {string} [id]
 * @property {number} [bomOperationId]
 * @property {number} [sequence]
 * @property {number} [sequenceNo]
 * @property {string} [operation]
 * @property {string} [operationName]
 * @property {string} [fgItemCode]
 * @property {string} [fgItemName]
 * @property {string} [opItemCode]
 * @property {string} [opItemName]
 * @property {string} [workOrderNo]
 * @property {number} [plannedQty]
 * @property {string} [processType]
 * @property {string} [unit]
 * @property {string} [warehouse]
 * @property {string} [workCenter]
 * @property {string} [machineId]
 * @property {string} [plannedMachineCode]
 * @property {string} [plannedMachineName]
 * @property {number} [settingTimeMinutes]
 * @property {number} [processTimePerUnitMins]
 * @property {number} [cycleTimeMinutes]
 * @property {number} [totalTimeMinutes]
 * @property {string} [startDate]
 * @property {string} [startTime]
 * @property {string} [endDate]
 * @property {string} [endTime]
 * @property {string} [jobCardNo]
 * @property {string} [jobCardStatus]
 * @property {string} [assignedOperator]
 * @property {string} [remarks]
 */

/**
 * @typedef {Object} WorkOrderListItem
 * @property {string} workOrderNo
 * @property {string} createDate
 * @property {string} itemCode
 * @property {string} itemName
 * @property {number} plannedQty
 * @property {string} orderType
 * @property {string} unit
 * @property {'Draft' | 'Planned' | 'Open' | 'Released' | 'Cancelled'} status
 */

/**
 * @typedef {Object} AllocatedMaterial
 * @property {string} itemCode
 * @property {string} description
 * @property {number} requiredQty
 * @property {number} availableQty
 * @property {number} allocatedQty
 * @property {string} unit
 */
