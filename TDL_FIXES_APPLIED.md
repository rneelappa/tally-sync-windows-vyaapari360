# TDL Fixes Applied - T0007 and T0009 Errors Resolved

## **Issues Fixed:**

### **T0007: Invalid Characters in Definition Names**
- **Problem**: Hyphens (-) not allowed in TDL definition names
- **Fix**: Removed all hyphens from report names
- **Before**: `TallyDatabaseLoaderReport-Ledger`
- **After**: `TallyDatabaseLoaderReportLedger`

### **T0009: Duplicate Form Definitions**
- **Problem**: All TDL files using same `MyForm` name
- **Fix**: Unique form/part/line/collection names for each TDL

## **Updated TDL Files with Unique Names:**

1. **`TallyDatabaseLoaderReportLedger.tdl`**
   - Form: `LedgerForm`
   - Part: `LedgerPart`
   - Line: `LedgerLine`
   - Collection: `LedgerCollection`

2. **`TallyDatabaseLoaderReportGroup.tdl`**
   - Form: `GroupForm`
   - Part: `GroupPart`
   - Line: `GroupLine`
   - Collection: `GroupCollection`

3. **`TallyDatabaseLoaderReportStockItem.tdl`**
   - Form: `StockItemForm`
   - Part: `StockItemPart`
   - Line: `StockItemLine`
   - Collection: `StockItemCollection`

4. **`TallyDatabaseLoaderReportVoucherType.tdl`**
   - Form: `VoucherTypeForm`
   - Part: `VoucherTypePart`
   - Line: `VoucherTypeLine`
   - Collection: `VoucherTypeCollection`

5. **`TallyDatabaseLoaderReportUnit.tdl`**
   - Form: `UnitForm`
   - Part: `UnitPart`
   - Line: `UnitLine`
   - Collection: `UnitCollection`

6. **`TallyDatabaseLoaderReportGodown.tdl`**
   - Form: `GodownForm`
   - Part: `GodownPart`
   - Line: `GodownLine`
   - Collection: `GodownCollection`

7. **`TallyDatabaseLoaderReportCostCentre.tdl`**
   - Form: `CostCentreForm`
   - Part: `CostCentrePart`
   - Line: `CostCentreLine`
   - Collection: `CostCentreCollection`

8. **`TallyDatabaseLoaderReportVoucher.tdl`**
   - Form: `VoucherForm`
   - Part: `VoucherPart`
   - Line: `VoucherLine`
   - Collection: `VoucherCollection`

## **Loading Instructions:**

1. **Remove old TDL files** from Tally Prime TDL folder
2. **Copy the corrected TDL files** (without hyphens, unique names)
3. **Load each TDL file** in Tally Prime
4. **Verify no T0007 or T0009 errors**

## **Expected Results:**
All TDL files should now load successfully without errors, enabling full master data sync capabilities.

## **Server Updates:**
Server has been updated to use the corrected report names (without hyphens) for all API calls.
