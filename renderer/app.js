let currentParties = [];
let currentPayments = [];
let currentExpenses = [];
let currentMonthlyReportRows = [];
let currentDailyReportRows = [];
let purchaseItemsDraft = [];
let saleItemsDraft = [];
let currentPurchaseRows = [];
let currentSalesRows = [];
let allPurchaseRows = [];
let productCatalog = [];
let selectedSaleDetail = null;
let currentPurchaseRates = [];
let currentSettings = null;
let currentGodowns = [];
let currentGodownStockRows = [];
let rawMaterialStockRows = [];
let rawMaterialTransactions = [];
let rawMaterialProductNames = [];
let purchaseReturnItemsDraft = [];
let salesReturnItemsDraft = [];
let currentPurchaseReturnRows = [];
let currentSalesReturnRows = [];
let currentPurchaseReturnReference = null;
let currentSalesReturnReference = null;
let currentLabourRows = [];
let currentLabourWeeklyRows = [];
let partyStateRows = [];
const partyCityCache = new Map();
let selectedGodownId = null;
let purchaseDeliveryTypeDraft = 'Cash';
let currentTransactionType = 'purchase';
let transactionFlowStage = 'mode';
let transactionFlowPartyId = null;
let partyIndexParties = [];
let partyIndexSelectedPartyId = null;
let currentPartyStatementRows = [];
let ledgerPartyRows = [];
let ledgerSelectedPartyId = null;
let currentLedgerRows = [];
let editingManualLedgerEntryId = null;
let editingManualLedgerEntryType = '';
let currentLedgerSummary = {
    totalDebit: 0,
    totalCredit: 0,
    closingBalance: 0
};
const LOW_STOCK_QTY_THRESHOLD = 25;
let activeEditorDialogResolve = null;
function showLoading(show) {
    const el = document.getElementById('globalLoading');
    if (!el) {
        return;
    }
    el.classList.toggle('hidden', !show);
}
function showToast(message, isError = false) {
    const toast = document.getElementById('globalToast');
    if (!toast) {
        return;
    }
    toast.textContent = String(message || 'Done');
    toast.classList.remove('hidden', 'bg-green-700', 'bg-red-700');
    toast.classList.add(isError ? 'bg-red-700' : 'bg-green-700');
    window.setTimeout(() => toast.classList.add('hidden'), 2200);
}
function ensureEditorDialog() {
    let overlay = document.getElementById('editorDialogOverlay');
    if (overlay) {
        return overlay;
    }
    overlay = document.createElement('div');
    overlay.id = 'editorDialogOverlay';
    overlay.className = 'hidden fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4';
    overlay.innerHTML = `
    <div class="bg-white rounded shadow-lg w-full max-w-2xl">
      <div class="px-4 py-3 border-b">
        <h3 id="editorDialogTitle" class="text-lg font-semibold">Edit</h3>
      </div>
      <div id="editorDialogFields" class="p-4 grid grid-cols-1 md:grid-cols-2 gap-3"></div>
      <div class="px-5 py-3 border-t flex items-center justify-end gap-3 bg-gray-50/50 rounded-b">
        <button id="editorDialogCancel" class="bg-slate-500 hover:bg-slate-600 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition active:scale-95">Cancel</button>
        <button id="editorDialogSave" class="bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition active:scale-95">Save</button>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    const cancelBtn = document.getElementById('editorDialogCancel');
    const saveBtn = document.getElementById('editorDialogSave');
    const fieldsWrap = document.getElementById('editorDialogFields');
    cancelBtn.addEventListener('click', () => closeEditorDialog(null));
    saveBtn.addEventListener('click', () => {
        const values = {};
        fieldsWrap.querySelectorAll('[data-editor-key]').forEach(el => {
            values[el.getAttribute('data-editor-key')] = el.value;
        });
        closeEditorDialog(values);
    });
    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            closeEditorDialog(null);
        }
    });
    return overlay;
}
function closeEditorDialog(result) {
    const overlay = document.getElementById('editorDialogOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
    if (activeEditorDialogResolve) {
        const resolver = activeEditorDialogResolve;
        activeEditorDialogResolve = null;
        resolver(result);
    }
}
function openEditorDialog(title, fields) {
    const overlay = ensureEditorDialog();
    const titleEl = document.getElementById('editorDialogTitle');
    const fieldsWrap = document.getElementById('editorDialogFields');
    titleEl.textContent = String(title || 'Edit');
    fieldsWrap.innerHTML = '';
    (fields || []).forEach(field => {
        const wrapper = document.createElement('div');
        wrapper.className = field.fullWidth ? 'md:col-span-2' : '';
        const label = document.createElement('label');
        label.className = 'block text-sm text-gray-600 mb-1';
        label.textContent = field.label || field.key;
        let input;
        if (field.type === 'select') {
            input = document.createElement('select');
            (field.options || []).forEach(optionValue => {
                const option = document.createElement('option');
                option.value = String(optionValue);
                option.textContent = String(optionValue);
                input.appendChild(option);
            });
        } else {
            input = document.createElement('input');
            input.type = field.type || 'text';
            if (field.step) {
                input.step = field.step;
            }
            if (field.min !== undefined) {
                input.min = String(field.min);
            }
        }
        input.className = 'border p-2 w-full';
        input.setAttribute('data-editor-key', field.key);
        input.value = field.value !== undefined && field.value !== null ? String(field.value) : '';
        wrapper.appendChild(label);
        wrapper.appendChild(input);
        fieldsWrap.appendChild(wrapper);
    });
    overlay.classList.remove('hidden');
    const first = fieldsWrap.querySelector('[data-editor-key]');
    if (first) {
        first.focus();
    }
    return new Promise(resolve => {
        activeEditorDialogResolve = resolve;
    });
}
async function withLoading(task) {
    showLoading(true);
    try {
        return await task();
    } finally {
        showLoading(false);
    }
}
function escapeHtml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function normalizeTimeValue(value) {
    const source = String(value || '').trim();
    if (!source) {
        return '';
    }
    const parts = source.split(':');
    if (parts.length < 2) {
        return '';
    }
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return '';
    }
    return `${ String(hours).padStart(2, '0') }:${ String(minutes).padStart(2, '0') }`;
}
function getCurrentTimeValue() {
    const now = new Date();
    return `${ String(now.getHours()).padStart(2, '0') }:${ String(now.getMinutes()).padStart(2, '0') }`;
}
function formatTimeLabel(value) {
    return normalizeTimeValue(value) || '-';
}
function formatDisplayDate(value) {
    const source = String(value || '').trim();
    if (!source || source === '-') {
        return '-';
    }
    const ymdMatch = source.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (ymdMatch) {
        return `${ ymdMatch[3] }/${ ymdMatch[2] }/${ ymdMatch[1] }`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(source)) {
        return source;
    }
    const parsed = new Date(source);
    if (Number.isNaN(parsed.getTime())) {
        return source;
    }
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = String(parsed.getFullYear());
    return `${ day }/${ month }/${ year }`;
}
function normalizeUnitType(unitType) {
    const normalized = String(unitType || '').trim().toLowerCase();
    if (normalized === 'pcs' || normalized === 'pc' || normalized === 'piece' || normalized === 'pieces') {
        return 'Pcs';
    }
    if (normalized === 'box' || normalized === 'boxes' || normalized === 'case' || normalized === 'cases') {
        return 'Box';
    }
    if (normalized === 'pkt' || normalized === 'packet' || normalized === 'packets') {
        return 'Pkt';
    }
    if (normalized === 'unit' || normalized === 'units' || normalized === 'nos' || normalized === 'no' || normalized === 'number' || normalized === 'numbers') {
        return 'Unit';
    }
    return '';
}
function setActiveSidebar(view) {
    const navButtons = document.querySelectorAll('[data-nav-view]');
    navButtons.forEach(button => {
        const isActive = button.getAttribute('data-nav-view') === view;
        button.classList.remove('bg-blue-900', 'bg-blue-950');
        button.classList.toggle('bg-blue-950', isActive);
        button.classList.toggle('ring-2', isActive);
        button.classList.toggle('ring-blue-200', isActive);
        button.classList.toggle('bg-blue-800', !isActive);
    });
}
let currentActiveView = 'transaction';
const navigationHistory = [];
let isNavigatingBack = false;

function updateGlobalBackButton() {
    const btn = document.getElementById('globalBackBtn');
    if (btn) {
        btn.disabled = navigationHistory.length === 0;
    }
}

function updateGlobalBreadcrumbs(view, stage = null) {
    const breadcrumbEl = document.getElementById('globalBreadcrumb');
    if (!breadcrumbEl) return;

    const titles = {
        transaction: 'Transactions',
        ledger: 'Ledger',
        stock: 'Godown Stock',
        rawMaterial: 'Raw Material',
        rawMaterialStock: 'Raw Material Stock',
        rawMaterialEntry: 'Raw Material Entry',
        rawMaterialLedger: 'Raw Material Ledger',
        labourAttendance: 'Labour Attendance',
        profitLoss: 'Profit & Loss',
        crackers: 'Cracker Purchase Rate',
        party: "Party's Address",
        paymentIn: 'Payment IN',
        paymentOut: 'Payment OUT',
        profile: 'Profile Settings'
    };

    const mainTitle = titles[view] || view;
    let subTitle = '';
    if (view === 'transaction') {
        const curStage = stage || transactionFlowStage;
        if (curStage === 'party') {
            subTitle = currentTransactionType === 'sale' ? 'Sales Party List' : 'Purchase Party List';
        } else if (curStage === 'entry') {
            if (currentTransactionType === 'sale') subTitle = 'Estimated Sales Invoice';
            else if (currentTransactionType === 'purchase') subTitle = 'Purchase Entry';
            else if (currentTransactionType === 'sales_return') subTitle = 'Sales Return';
            else if (currentTransactionType === 'purchase_return') subTitle = 'Purchase Return';
        } else {
            subTitle = '';
        }
    } else if (view === 'stock') {
        const isDetail = document.getElementById('godownDetailCard') && !document.getElementById('godownDetailCard').classList.contains('hidden');
        if (isDetail) {
            const titleEl = document.getElementById('selectedGodownTitle');
            subTitle = titleEl ? titleEl.textContent : 'Godown Detail';
        }
    } else if (view === 'ledger') {
        const detailPanel = document.getElementById('ledgerDetailPanel');
        if (detailPanel && !detailPanel.classList.contains('hidden')) {
            const titleEl = document.getElementById('ledgerPartyTitle');
            subTitle = titleEl ? titleEl.textContent : 'Party Ledger';
        }
    }

    if (subTitle) {
        breadcrumbEl.innerHTML = `<span class="text-gray-500 font-normal">${escapeHtml(mainTitle)}</span> <span class="text-gray-400 font-normal">›</span> <span class="text-gray-900 font-semibold">${escapeHtml(subTitle)}</span>`;
    } else {
        breadcrumbEl.innerHTML = `<span class="text-gray-900 font-semibold">${escapeHtml(mainTitle)}</span>`;
    }
}

function recordNavState() {
    if (isNavigatingBack) return;
    const isGodownDetail = Boolean(document.getElementById('godownDetailCard') && !document.getElementById('godownDetailCard').classList.contains('hidden'));
    const isLedgerDetail = Boolean(document.getElementById('ledgerDetailPanel') && !document.getElementById('ledgerDetailPanel').classList.contains('hidden'));

    const state = {
        view: currentActiveView || 'transaction',
        transactionStage: transactionFlowStage,
        transactionType: currentTransactionType,
        transactionPartyId: transactionFlowPartyId,
        godownStage: isGodownDetail ? 'detail' : 'list',
        selectedGodownId: selectedGodownId,
        ledgerStage: isLedgerDetail ? 'detail' : 'root',
        ledgerPartyId: ledgerSelectedPartyId
    };

    const last = navigationHistory[navigationHistory.length - 1];
    if (last &&
        last.view === state.view &&
        last.transactionStage === state.transactionStage &&
        last.transactionType === state.transactionType &&
        last.transactionPartyId === state.transactionPartyId &&
        last.godownStage === state.godownStage &&
        last.selectedGodownId === state.selectedGodownId &&
        last.ledgerStage === state.ledgerStage &&
        last.ledgerPartyId === state.ledgerPartyId) {
        return;
    }

    navigationHistory.push(state);
    updateGlobalBackButton();
}

function goBack() {
    if (navigationHistory.length === 0) {
        if (currentActiveView === 'transaction') {
            if (transactionFlowStage === 'entry') {
                beginTransactionPartySelection(currentTransactionType);
            } else if (transactionFlowStage === 'party') {
                openTransactionEntryRoot();
            }
        } else if (currentActiveView === 'stock') {
            goBackToGodownList();
        } else if (currentActiveView === 'ledger') {
            openLedgerRoot();
        }
        return;
    }

    isNavigatingBack = true;
    const prevState = navigationHistory.pop();
    updateGlobalBackButton();

    try {
        if (prevState.view !== currentActiveView) {
            showView(prevState.view, false);
        }

        if (prevState.view === 'transaction') {
            currentTransactionType = prevState.transactionType || 'sale';
            if (prevState.transactionStage === 'mode') {
                openTransactionEntryRoot();
            } else if (prevState.transactionStage === 'party') {
                beginTransactionPartySelection(currentTransactionType);
            } else if (prevState.transactionStage === 'entry' && prevState.transactionPartyId) {
                openTransactionEntryForParty(prevState.transactionPartyId);
            }
        } else if (prevState.view === 'stock') {
            if (prevState.godownStage === 'detail' && prevState.selectedGodownId) {
                openGodown(prevState.selectedGodownId);
            } else {
                goBackToGodownList();
            }
        } else if (prevState.view === 'ledger') {
            if (prevState.ledgerStage === 'detail' && prevState.ledgerPartyId) {
                openLedgerForParty(prevState.ledgerPartyId);
            } else {
                openLedgerRoot();
            }
        }
        updateGlobalBreadcrumbs(prevState.view, prevState.transactionStage);
    } finally {
        isNavigatingBack = false;
    }
}
window.goBack = goBack;

function showView(view, addToHistory = true) {
    if (addToHistory && view !== currentActiveView) {
        recordNavState();
    }
    currentActiveView = view;
    const views = {
        party: document.getElementById('partyView'),
        paymentIn: document.getElementById('paymentInView'),
        paymentOut: document.getElementById('paymentOutView'),
        transaction: document.getElementById('transactionView'),
        crackers: document.getElementById('crackersView'),
        profitLoss: document.getElementById('profitLossView'),
        ledger: document.getElementById('ledgerView'),
        stock: document.getElementById('stockView'),
        rawMaterial: document.getElementById('rawMaterialView'),
        rawMaterialStock: document.getElementById('rawMaterialStockView'),
        rawMaterialEntry: document.getElementById('rawMaterialEntryView'),
        rawMaterialLedger: document.getElementById('rawMaterialLedgerView'),
        labourAttendance: document.getElementById('labourAttendanceView'),
        profile: document.getElementById('profileView')
    };
    Object.values(views).forEach(el => {
        if (el) {
            el.classList.add('hidden');
        }
    });
    if (!views[view]) {
        return;
    }
    views[view].classList.remove('hidden');
    setActiveSidebar(view);
    if (view !== 'paymentIn' && view !== 'paymentOut') {
        cancelPaymentEdit();
    }
    if (view === 'ledger') {
        openLedgerRoot();
    }
    if (view === 'stock') {
        goBackToGodownList();
        refreshGodowns();
        if (selectedGodownId) {
            refreshStock();
        }
    }
    if (view === 'rawMaterialStock') {
        refreshRawMaterialStock();
    }
    if (view === 'rawMaterialEntry') {
        setRawMaterialEditMode(null);
        onRawMaterialEntryTypeChange();
        refreshRawMaterialProductOptions();
        refreshRawMaterialTransactions();
    }
    if (view === 'rawMaterialLedger') {
        refreshRawMaterialLedger();
    }
    if (view === 'labourAttendance') {
        refreshLabourAttendance();
    }
    if (view === 'profitLoss') {
        refreshProfitLoss();
    }
    if (view === 'crackers') {
        refreshPurchaseRates();
    }
    if (view === 'paymentIn' || view === 'paymentOut') {
        refreshPayments();
    }
    if (view === 'transaction') {
        openTransactionEntryRoot();
    }
    if (view === 'profile') {
        loadProfileSettings();
    }
    updateGlobalBreadcrumbs(view);
    updateGlobalBackButton();
}
function setTransactionType(type, shouldRefresh = true) {
    const normalized = String(type || '').trim().toLowerCase();
    if (normalized === 'sale') {
        currentTransactionType = 'sale';
    } else if (normalized === 'purchase_return') {
        currentTransactionType = 'purchase_return';
    } else if (normalized === 'sales_return') {
        currentTransactionType = 'sales_return';
    } else {
        currentTransactionType = 'purchase';
    }
    const purchasePanel = document.getElementById('purchaseTxnPanel');
    const salesPanel = document.getElementById('salesTxnPanel');
    const purchaseReturnPanel = document.getElementById('purchaseReturnTxnPanel');
    const salesReturnPanel = document.getElementById('salesReturnTxnPanel');
    const shouldShowEntry = transactionFlowStage === 'entry';
    if (purchasePanel) {
        purchasePanel.classList.toggle('hidden', !shouldShowEntry || currentTransactionType !== 'purchase');
    }
    if (salesPanel) {
        salesPanel.classList.toggle('hidden', !shouldShowEntry || currentTransactionType !== 'sale');
    }
    if (purchaseReturnPanel) {
        purchaseReturnPanel.classList.toggle('hidden', !shouldShowEntry || currentTransactionType !== 'purchase_return');
    }
    if (salesReturnPanel) {
        salesReturnPanel.classList.toggle('hidden', !shouldShowEntry || currentTransactionType !== 'sales_return');
    }
    if (!shouldRefresh) {
        return;
    }
    if (currentTransactionType === 'purchase') {
        cancelSaleEdit();
        resetPurchaseReturnForm();
        resetSalesReturnForm();
        refreshPurchases();
    } else if (currentTransactionType === 'sale') {
        cancelPurchaseEdit();
        resetPurchaseReturnForm();
        resetSalesReturnForm();
        refreshProductCatalog();
        refreshSales();
    } else if (currentTransactionType === 'purchase_return') {
        cancelPurchaseEdit();
        cancelSaleEdit();
        resetSalesReturnForm();
        refreshPurchases();
        refreshPurchaseReturns();
    } else {
        cancelPurchaseEdit();
        cancelSaleEdit();
        resetPurchaseReturnForm();
        refreshSales();
        refreshSalesReturns();
    }
    refreshPartyTransactionIndex();
}
function setTransactionFlowStage(stage) {
    transactionFlowStage = stage;
    const modePicker = document.getElementById('transactionModePicker');
    const partyPicker = document.getElementById('transactionPartyPicker');
    const purchasePanel = document.getElementById('purchaseTxnPanel');
    const salesPanel = document.getElementById('salesTxnPanel');
    const purchaseReturnPanel = document.getElementById('purchaseReturnTxnPanel');
    const salesReturnPanel = document.getElementById('salesReturnTxnPanel');
    const statementPanel = document.getElementById('partyStatementPanel');
    if (modePicker) {
        modePicker.classList.toggle('hidden', stage !== 'mode');
    }
    if (partyPicker) {
        partyPicker.classList.toggle('hidden', stage !== 'party');
    }
    if (statementPanel) {
        statementPanel.classList.add('hidden');
    }
    if (purchasePanel) {
        purchasePanel.classList.toggle('hidden', stage !== 'entry' || currentTransactionType !== 'purchase');
    }
    if (salesPanel) {
        salesPanel.classList.toggle('hidden', stage !== 'entry' || currentTransactionType !== 'sale');
    }
    if (purchaseReturnPanel) {
        purchaseReturnPanel.classList.toggle('hidden', stage !== 'entry' || currentTransactionType !== 'purchase_return');
    }
    if (salesReturnPanel) {
        salesReturnPanel.classList.toggle('hidden', stage !== 'entry' || currentTransactionType !== 'sales_return');
    }
}
function openTransactionEntryRoot(addToHistory = true) {
    if (addToHistory && (currentActiveView !== 'transaction' || transactionFlowStage !== 'mode')) {
        recordNavState();
    }
    transactionFlowPartyId = null;
    setTransactionFlowStage('mode');
    updateGlobalBreadcrumbs('transaction', 'mode');
    updateGlobalBackButton();
}
async function beginTransactionPartySelection(type) {
    recordNavState();
    currentTransactionType = type === 'sale' ? 'sale' : 'purchase';
    transactionFlowPartyId = null;
    const title = document.getElementById('transactionPartyTitle');
    if (title) {
        title.textContent = currentTransactionType === 'sale' ? 'Sales Entry - Party List' : 'Purchase Entry - Party List';
    }
    await refreshPartyData();
    renderTransactionPartyTable();
    setTransactionFlowStage('party');
    updateGlobalBreadcrumbs('transaction', 'party');
    updateGlobalBackButton();
}
async function beginReturnEntry(type) {
    recordNavState();
    currentTransactionType = type === 'sales_return' ? 'sales_return' : 'purchase_return';
    transactionFlowPartyId = null;
    const title = document.getElementById('transactionPartyTitle');
    if (title) {
        title.textContent = currentTransactionType === 'sales_return' ? 'Sales Return - Party List' : 'Purchase Return - Party List';
    }
    await refreshPartyData();
    renderTransactionPartyTable();
    setTransactionFlowStage('party');
    updateGlobalBreadcrumbs('transaction', 'party');
    updateGlobalBackButton();
}
function backToTransactionTypePicker() {
    goBack();
}
function renderTransactionPartyTable() {
    const body = document.getElementById('transactionPartyTableBody');
    if (!body) {
        return;
    }
    const query = String(document.getElementById('transactionPartySearch')?.value || '').trim().toLowerCase();
    const filtered = currentParties.filter(party => {
        if (!query) {
            return true;
        }
        return [
            party.name,
            party.phone,
            party.city
        ].map(value => String(value || '').toLowerCase()).some(value => value.includes(query));
    });
    body.innerHTML = '';
    if (filtered.length === 0) {
        body.innerHTML = `
      <tr>
        <td colspan="5" class="p-3 text-center text-gray-500 flex items-center justify-center gap-2">No parties found.</td>
      </tr>
    `;
        return;
    }
    let html = '';
    filtered.forEach((party, index) => {
        html += `
      <tr class="border-t ${ Number(transactionFlowPartyId) === Number(party.id) ? 'bg-blue-50' : '' }">
        <td class="px-4 py-3 align-middle">${ index + 1 }</td>
        <td class="px-4 py-3 align-middle"><button onclick="openTransactionEntryForParty(${ party.id })" class="text-blue-800 hover:underline">${ escapeHtml(party.name || '-') }</button></td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(party.phone || '-') }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(party.city || '-') }</td>
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">
          <div class="inline-flex items-center justify-center gap-2">
            <button onclick="openTransactionEntryForParty(${ party.id })" class="bg-blue-700 hover:bg-blue-800 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Open</button>
            <button onclick="editTransactionParty(${ party.id })" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Edit</button>
            <button onclick="deleteTransactionParty(${ party.id })" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Delete</button>
          </div>
        </td>
      </tr>
    `;
    });
    body.innerHTML = html;
}
async function addTransactionParty() {
    const values = await openEditorDialog('Add Party', [
        {
            key: 'name',
            label: 'Party Name',
            type: 'text',
            value: ''
        },
        {
            key: 'phone',
            label: 'Phone',
            type: 'text',
            value: ''
        },
        {
            key: 'city',
            label: 'City',
            type: 'text',
            value: ''
        },
        {
            key: 'state',
            label: 'State',
            type: 'text',
            value: ''
        },
        {
            key: 'address',
            label: 'Address',
            type: 'text',
            value: '',
            fullWidth: true
        },
        {
            key: 'notes',
            label: 'Notes',
            type: 'text',
            value: '',
            fullWidth: true
        }
    ]);
    if (!values) {
        return;
    }
    const payload = {
        name: String(values.name || '').trim(),
        phone: String(values.phone || '').trim(),
        city: String(values.city || '').trim(),
        state: String(values.state || '').trim(),
        address: String(values.address || '').trim(),
        notes: String(values.notes || '').trim()
    };
    if (!payload.name) {
        window.alert('Party name is required.');
        return;
    }
    const result = await window.api.addParty(payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to add party.');
        return;
    }
    await refreshPartyData();
    renderTransactionPartyTable();
    showToast('Party added.');
}
async function editTransactionParty(id) {
    const party = currentParties.find(item => Number(item.id) === Number(id));
    if (!party) {
        return;
    }
    const values = await openEditorDialog('Edit Party', [
        {
            key: 'name',
            label: 'Party Name',
            type: 'text',
            value: party.name || ''
        },
        {
            key: 'phone',
            label: 'Phone',
            type: 'text',
            value: party.phone || ''
        },
        {
            key: 'city',
            label: 'City',
            type: 'text',
            value: party.city || ''
        },
        {
            key: 'state',
            label: 'State',
            type: 'text',
            value: party.state || ''
        },
        {
            key: 'address',
            label: 'Address',
            type: 'text',
            value: party.address || '',
            fullWidth: true
        },
        {
            key: 'notes',
            label: 'Notes',
            type: 'text',
            value: party.notes || '',
            fullWidth: true
        }
    ]);
    if (!values) {
        return;
    }
    const payload = {
        name: String(values.name || '').trim(),
        phone: String(values.phone || '').trim(),
        city: String(values.city || '').trim(),
        state: String(values.state || '').trim(),
        address: String(values.address || '').trim(),
        notes: String(values.notes || '').trim()
    };
    if (!payload.name) {
        window.alert('Party name is required.');
        return;
    }
    const result = await window.api.updateParty(Number(id), payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to update party.');
        return;
    }
    await refreshPartyData();
    renderTransactionPartyTable();
    showToast('Party updated.');
}
async function deleteTransactionParty(id) {
    const result = await window.api.deleteParty(Number(id));
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to delete party.');
        return;
    }
    if (Number(transactionFlowPartyId) === Number(id)) {
        transactionFlowPartyId = null;
    }
    await refreshPartyData();
    renderTransactionPartyTable();
    showToast('Party deleted.');
}
function openTransactionEntryForParty(id) {
    const party = currentParties.find(item => Number(item.id) === Number(id));
    if (!party) {
        return;
    }
    recordNavState();
    transactionFlowPartyId = Number(id);
    setTransactionFlowStage('entry');
    setTransactionType(currentTransactionType, true);
    if (currentTransactionType === 'sale') {
        const saleParty = document.getElementById('salePartyId');
        if (saleParty) {
            saleParty.value = String(id);
            onSalePartyChange();
        }
    } else if (currentTransactionType === 'purchase') {
        const purchaseParty = document.getElementById('purchasePartyId');
        if (purchaseParty) {
            purchaseParty.value = String(id);
            onPurchasePartyChange();
        }
    } else if (currentTransactionType === 'purchase_return') {
        rebuildPurchaseReturnReferenceOptions();
    } else if (currentTransactionType === 'sales_return') {
        rebuildSalesReturnReferenceOptions();
    }
    updateGlobalBreadcrumbs('transaction', 'entry');
    updateGlobalBackButton();
    showToast(`Opened ${ currentTransactionType.replace('_', ' ') } entry for ${ party.name }.`);
}
function setDefaultDates() {
    const today = new Date().toISOString().slice(0, 10);
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
        }
    };
    setValue('paymentInDate', today);
    setValue('paymentOutDate', today);
    setValue('editPaymentDate', today);
    setValue('expenseDate', today);
    setValue('purchaseDate', today);
    setValue('rawMaterialDate', today);
    setValue('saleDate', today);
    setValue('saleBillNo', getNextSaleBillNo());
    setValue('saleDeliveryDate', today);
    setValue('saleBillTime', getCurrentTimeValue());
    setValue('saleDeliveryTime', '');
    setValue('saleDeliveryCharges', '0');
    setValue('saleCommissionCharges', '0');
    setValue('saleDiscount', '0');
    setValue('ledgerManualDate', today);
    setValue('purchaseUnitType', 'Pcs');
    setValue('saleUnitType', 'Pcs');
}
function setPartyEditMode(id) {
    const editingPartyId = document.getElementById('editingPartyId');
    if (editingPartyId) {
        editingPartyId.value = id ? String(id) : '';
    }
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.textContent = id ? 'Update' : 'Add';
    }
}
function renderPartyStateOptions(selectedState = '') {
    const stateSelect = document.getElementById('state');
    if (!stateSelect) {
        return;
    }
    const selectedValue = String(selectedState || '').trim();
    const options = partyStateRows.map(stateItem => {
        const name = String(stateItem?.name || '').trim();
        if (!name) {
            return '';
        }
        return `<option value="${ escapeHtml(name) }">${ escapeHtml(name) }</option>`;
    }).join('');
    stateSelect.innerHTML = '<option value="">Select State / UT</option>' + options;
    if (selectedValue) {
        stateSelect.value = selectedValue;
    }
}
function renderPartyCityOptions(cities = [], selectedCity = '') {
    const citySelect = document.getElementById('city');
    if (!citySelect) {
        return;
    }
    const selectedValue = String(selectedCity || '').trim();
    const options = (Array.isArray(cities) ? cities : []).map(cityName => String(cityName || '').trim()).filter(Boolean).map(cityName => `<option value="${ escapeHtml(cityName) }">${ escapeHtml(cityName) }</option>`).join('');
    citySelect.innerHTML = '<option value="">Select City</option>' + options;
    citySelect.disabled = options.length === 0;
    if (selectedValue) {
        const hasCity = (Array.isArray(cities) ? cities : []).some(cityName => String(cityName).toLowerCase() === selectedValue.toLowerCase());
        if (hasCity) {
            citySelect.value = selectedValue;
        } else {
            citySelect.innerHTML += `<option value="${ escapeHtml(selectedValue) }">${ escapeHtml(selectedValue) }</option>`;
            citySelect.value = selectedValue;
            citySelect.disabled = false;
        }
    }
}
async function loadPartyStateOptions(selectedState = '') {
    partyStateRows = await window.api.getIndianStates();
    renderPartyStateOptions(selectedState);
}
async function loadCitiesForState(stateName, selectedCity = '') {
    const stateValue = String(stateName || '').trim();
    if (!stateValue) {
        renderPartyCityOptions([], selectedCity);
        return;
    }
    const cacheKey = stateValue.toLowerCase();
    if (!partyCityCache.has(cacheKey)) {
        const cityRows = await window.api.getIndianCities(stateValue);
        partyCityCache.set(cacheKey, Array.isArray(cityRows) ? cityRows : []);
    }
    renderPartyCityOptions(partyCityCache.get(cacheKey), selectedCity);
}
async function initializePartyLocationInputs() {
    await loadPartyStateOptions('');
    renderPartyCityOptions([]);
}
async function onPartyStateChange() {
    const stateSelect = document.getElementById('state');
    const stateValue = stateSelect ? stateSelect.value : '';
    await loadCitiesForState(stateValue, '');
}
function clearPartyForm() {
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
        }
    };
    setValue('name', '');
    setValue('state', '');
    renderPartyCityOptions([], '');
    setValue('phone', '');
    setValue('address', '');
    setValue('feedback', '');
    setPartyEditMode(null);
}
function getPartyFormData() {
    return {
        name: document.getElementById('name').value.trim(),
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        notes: document.getElementById('feedback').value.trim()
    };
}
function renderParties(parties) {
    currentParties = parties;
    const table = document.getElementById('partyTable');
    if (!table) {
        return;
    }
    table.innerHTML = '';
    let html = '';
    parties.forEach(party => {
        html += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle font-medium text-gray-900">${ escapeHtml(party.name) }</td>
        <td class="px-4 py-3 align-middle text-gray-700">${ escapeHtml(party.city) }</td>
        <td class="px-4 py-3 align-middle text-gray-700">${ escapeHtml(party.state || '') }</td>
        <td class="px-4 py-3 align-middle text-gray-700">${ escapeHtml(party.phone) }</td>
        <td class="px-4 py-3 align-middle whitespace-pre-line text-gray-700">${ escapeHtml(party.address || '') }</td>
        <td class="px-4 py-3 align-middle whitespace-pre-line text-gray-600 text-xs">${ escapeHtml(party.notes || '') }</td>
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">
          <div class="inline-flex items-center justify-center gap-2">
            <button onclick="editParty(${ party.id })" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Edit</button>
            <button onclick="deleteParty(${ party.id })" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Delete</button>
          </div>
        </td>
      </tr>
    `;
    });
    table.innerHTML = html;
}
function renderPartyDropdowns(parties) {
    const sortedParties = [...parties || []].sort((a, b) => {
        return String(a?.name || '').localeCompare(String(b?.name || ''), 'en', { sensitivity: 'base' });
    });
    const options = sortedParties.map(party => `<option value="${ party.id }">${ escapeHtml(party.name) }</option>`).join('');
    const ids = [
        'paymentInPartyId',
        'paymentOutPartyId',
        'editPaymentPartyId',
        'purchasePartyId',
        'salePartyId',
        'rawMaterialPartyId'
    ];
    const defaultOptionsById = {
        paymentInPartyId: '<option value="">Party Name</option>',
        paymentOutPartyId: '<option value="">Party Name</option>',
        editPaymentPartyId: '<option value="">Select Particulars / Debit</option>',
        rawMaterialPartyId: '<option value="">Select Party</option>'
    };
    ids.forEach(id => {
        const select = document.getElementById(id);
        if (!select) {
            return;
        }
        const previous = select.value;
        const defaultOption = defaultOptionsById[id] || '<option value="">Select Party</option>';
        select.innerHTML = defaultOption + options;
        if (previous) {
            select.value = previous;
        }
    });
}
function renderGodownDropdown(godowns) {
    const options = godowns.map(godown => `<option value="${ godown.id }">${ escapeHtml(godown.name) }</option>`).join('');
    const bind = id => {
        const select = document.getElementById(id);
        if (!select) {
            return;
        }
        const previous = select.value;
        select.innerHTML = '<option value="">Select Godown</option>' + options;
        if (previous) {
            select.value = previous;
        }
    };
    bind('purchaseGodownId');
    bind('saleGodownId');
}
function onSalePartyChange() {
    const partyId = Number(document.getElementById('salePartyId')?.value || 0);
    const party = currentParties.find(item => Number(item.id) === partyId);
    const address = party ? String(party.address || '').trim() : '';
    const addressEl = document.getElementById('salePartyAddress');
    if (addressEl) {
        addressEl.value = address;
    }
    const billNameEl = document.getElementById('saleBillName');
    if (billNameEl && !String(billNameEl.value || '').trim()) {
        billNameEl.value = party ? String(party.name || '') : '';
    }
}
function onPurchasePartyChange() {
    refreshPurchases();
}
async function refreshPartyData() {
    const parties = await window.api.getParties();
    renderParties(parties);
    renderPartyDropdowns(parties);
    ledgerPartyRows = Array.isArray(parties) ? parties : [];
    if (ledgerSelectedPartyId && !ledgerPartyRows.some(party => Number(party.id) === Number(ledgerSelectedPartyId))) {
        backToLedgerPartyPicker();
    }
    renderLedgerPartyTable();
    renderTransactionPartyTable();
    await refreshPartyTransactionIndex();
}
async function addOrUpdateParty() {
    const data = getPartyFormData();
    const id = document.getElementById('editingPartyId').value;
    if (!data.name) {
        window.alert('Party name is required.');
        return;
    }
    const result = id ? await window.api.updateParty(Number(id), data) : await window.api.addParty(data);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to save party.');
        return;
    }
    clearPartyForm();
    await searchParties();
    await refreshPartyData();
    showToast(id ? 'Party updated.' : 'Party added.');
}
async function editParty(id) {
    const party = currentParties.find(item => item.id === id);
    if (!party) {
        return;
    }
    document.getElementById('name').value = party.name || '';
    document.getElementById('state').value = party.state || '';
    await loadCitiesForState(party.state || '', party.city || '');
    document.getElementById('phone').value = party.phone || '';
    document.getElementById('address').value = party.address || '';
    document.getElementById('feedback').value = party.notes || '';
    setPartyEditMode(id);
}
async function deleteParty(id) {
    const result = await window.api.deleteParty(id);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to delete party.');
        return;
    }
    await searchParties();
    await refreshPartyData();
    await loadLedger();
}
async function searchParties() {
    const query = document.getElementById('searchInput').value.trim();
    const parties = query ? await window.api.searchParties(query) : await window.api.getParties();
    renderParties(parties);
}
function formatPartyTxnDate(dateValue) {
    const source = String(dateValue || '').trim();
    if (!source) {
        return '-';
    }
    return formatDisplayDate(source);
}
function buildPartyTransactionRows(party, purchases, sales, payments) {
    const partyId = Number(party?.id || 0);
    const rows = [];
    (Array.isArray(purchases) ? purchases : []).filter(row => Number(row.party_id) === partyId).forEach(row => {
        rows.push({
            date: String(row.date || ''),
            particulars: `Purchase - ${ row.product_name || '-' }`,
            perCase: Number(row.pieces || 0),
            boxCount: Number(row.boxes || 0),
            rate: Number(row.rate || 0),
            packing: Number(row.packing_charge || 0),
            transport: Number(row.transport_charge || 0),
            commission: Number(row.agent_commission || 0),
            total: Number(row.total || 0),
            baseTotal: Number(row.total || 0)
        });
    });
    (Array.isArray(sales) ? sales : []).filter(row => Number(row.party_id) === partyId).forEach(row => {
        const saleItems = Array.isArray(row.items) ? row.items : [];
        if (saleItems.length > 0) {
            saleItems.forEach(item => {
                rows.push({
                    date: String(row.date || ''),
                    particulars: `Sales #${ row.id } - ${ item.product_name || '-' }`,
                    perCase: Number(item.pieces || 0),
                    boxCount: Number(item.boxes || 0),
                    rate: Number(item.rate || 0),
                    packing: 0,
                    transport: 0,
                    commission: 0,
                    total: Number(item.total || 0),
                    baseTotal: Number(item.total || 0)
                });
            });
            const discount = Number(row.discount || 0);
            const delivery = Number(row.delivery_charges || 0);
            const packing = Number(row.packing_charges || 0);
            if (discount > 0) {
                rows.push({
                    date: String(row.date || ''),
                    particulars: `Sales #${ row.id } Discount`,
                    perCase: '-',
                    boxCount: '-',
                    rate: '-',
                    packing: 0,
                    transport: 0,
                    commission: 0,
                    total: -discount,
                    baseTotal: -discount
                });
            }
            if (delivery > 0) {
                rows.push({
                    date: String(row.date || ''),
                    particulars: `Sales #${ row.id } Transportation`,
                    perCase: '-',
                    boxCount: '-',
                    rate: '-',
                    packing: 0,
                    transport: 0,
                    commission: 0,
                    total: delivery,
                    baseTotal: delivery
                });
            }
            if (packing > 0) {
                rows.push({
                    date: String(row.date || ''),
                    particulars: `Sales #${ row.id } Packing`,
                    perCase: '-',
                    boxCount: '-',
                    rate: '-',
                    packing: 0,
                    transport: 0,
                    commission: 0,
                    total: packing,
                    baseTotal: packing
                });
            }
            return;
        }
        rows.push({
            date: String(row.date || ''),
            particulars: `Sales Invoice #${ row.id } (${ formatSaleTypeLabel(row.type) })`,
            perCase: '-',
            boxCount: Number(row.item_count || 0),
            rate: '-',
            packing: 0,
            transport: 0,
            commission: 0,
            total: Number(row.total || 0),
            baseTotal: Number(row.total || 0)
        });
    });
    (Array.isArray(payments) ? payments : []).filter(row => Number(row.party_id) === partyId).forEach(row => {
        const amount = Number(row.amount || 0);
        rows.push({
            date: String(row.date || ''),
            particulars: row.type === 'IN' ? `Payment IN (${ normalizePaymentMode(row.mode) || row.mode || '-' })` : `Payment OUT (${ normalizePaymentMode(row.mode) || row.mode || '-' })`,
            perCase: '-',
            boxCount: '-',
            rate: '-',
            packing: 0,
            transport: 0,
            commission: 0,
            total: row.type === 'OUT' ? -amount : amount,
            baseTotal: row.type === 'OUT' ? -amount : amount
        });
    });
    return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
function renderPartyStatementRows(rows) {
    const body = document.getElementById('partyTxnTableBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';
    if (!rows || rows.length === 0) {
        body.innerHTML = `
      <tr>
        <td colspan="8" class="p-4 text-center text-gray-500 flex items-center justify-center gap-2">No transactions found for this party.</td>
      </tr>
    `;
        return;
    }
    rows.forEach((row, index) => {
        body.innerHTML += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle">${ index + 1 }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(formatPartyTxnDate(row.date)) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(row.particulars) }</td>
        <td class="px-4 py-3 align-middle text-right">${ typeof row.perCase === 'number' ? row.perCase : '-' }</td>
        <td class="px-4 py-3 align-middle text-right">${ typeof row.boxCount === 'number' ? row.boxCount : '-' }</td>
        <td class="px-4 py-3 align-middle text-right">${ typeof row.rate === 'number' ? formatCurrency(row.rate) : '-' }</td>
        <td class="px-4 py-3 align-middle text-right font-semibold">${ formatCurrency(row.baseTotal) }</td>
      </tr>
    `;
    });
}
function recalculatePartyStatementSummary() {
    const includePacking = Boolean(document.getElementById('partyIncludePacking')?.checked);
    const includeTransport = Boolean(document.getElementById('partyIncludeTransport')?.checked);
    const includeCommission = Boolean(document.getElementById('partyIncludeCommission')?.checked);
    const paymentTotal = currentPartyStatementRows.reduce((sum, row) => sum + (Number(row.baseTotal) || 0), 0);
    const packingTotal = currentPartyStatementRows.reduce((sum, row) => sum + (Number(row.packing) || 0), 0);
    const transportTotal = currentPartyStatementRows.reduce((sum, row) => sum + (Number(row.transport) || 0), 0);
    const finalTotal = paymentTotal + (includePacking ? packingTotal : 0) + (includeTransport ? transportTotal : 0) + (includeCommission ? commissionTotal : 0);
    const toggleRow = (id, shouldShow) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = shouldShow ? 'flex' : 'none';
        }
    };
    toggleRow('partySummaryPackingRow', includePacking);
    toggleRow('partySummaryTransportRow', includeTransport);
    toggleRow('partySummaryCommissionRow', includeCommission);
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = formatCurrency(value);
        }
    };
    setText('partySummaryPayment', paymentTotal);
    setText('partySummaryPacking', packingTotal);
    setText('partySummaryTransport', transportTotal);
    setText('partySummaryCommission', commissionTotal);
    setText('partySummaryFinal', finalTotal);
}
async function openPartyStatement(partyId) {
    const id = Number(partyId);
    if (!id) {
        return;
    }
    const party = partyIndexParties.find(item => Number(item.id) === id);
    if (!party) {
        return;
    }
    partyIndexSelectedPartyId = id;
    renderPartyIndexList();
    const [purchases, sales, payments] = await Promise.all([
        window.api.getPurchases(),
        window.api.getSales(),
        window.api.getPayments()
    ]);
    const partySales = (Array.isArray(sales) ? sales : []).filter(row => Number(row.party_id) === id);
    const detailsBySaleId = new Map();
    await Promise.all(partySales.map(async saleRow => {
        const details = await window.api.getSaleDetails(saleRow.id);
        detailsBySaleId.set(Number(saleRow.id), Array.isArray(details?.items) ? details.items : []);
    }));
    const enrichedSales = (Array.isArray(sales) ? sales : []).map(row => ({
        ...row,
        items: detailsBySaleId.get(Number(row.id)) || []
    }));
    const now = new Date();
    document.getElementById('partyStatementDate').textContent = formatDisplayDate(now.toISOString().slice(0, 10));
    document.getElementById('partyStatementTime').textContent = now.toLocaleTimeString();
    document.getElementById('partyStatementName').textContent = party.name || '-';
    document.getElementById('partyStatementMeta').textContent = `${ party.phone || '-' } / ${ party.city || '-' }`;
    const rows = buildPartyTransactionRows(party, purchases, enrichedSales, payments);
    currentPartyStatementRows = rows;
    renderPartyStatementRows(rows);
    recalculatePartyStatementSummary();
    const modal = document.getElementById('partyStatementModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}
function closePartyStatementDialog() {
    const modal = document.getElementById('partyStatementModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
function renderPartyIndexList() {
    const body = document.getElementById('partyIndexTableBody');
    if (!body) {
        return;
    }
    const query = String(document.getElementById('partyIndexSearch')?.value || '').trim().toLowerCase();
    const filtered = partyIndexParties.filter(party => {
        if (!query) {
            return true;
        }
        return [
            party.name,
            party.city,
            party.phone
        ].map(value => String(value || '').toLowerCase()).some(value => value.includes(query));
    });
    body.innerHTML = '';
    if (filtered.length === 0) {
        body.innerHTML = `
      <tr>
        <td colspan="4" class="p-3 text-center text-gray-500">No party found.</td>
      </tr>
    `;
        return;
    }
    filtered.forEach(party => {
        const isActive = Number(party.id) === Number(partyIndexSelectedPartyId);
        body.innerHTML += `
      <tr class="border-t ${ isActive ? 'bg-blue-50' : '' }">
        <td class="px-4 py-3 align-middle">${ escapeHtml(party.name || '-') }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(party.phone || '-') }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(party.city || '-') }</td>
        <td class="px-4 py-3 align-middle"><button onclick="openPartyStatement(${ party.id })" class="bg-blue-700 text-white px-3 py-1 rounded">Open</button></td>
      </tr>
    `;
    });
}
async function refreshPartyTransactionIndex() {
    partyIndexParties = await window.api.getParties();
    renderPartyIndexList();
    if (partyIndexParties.length === 0) {
        partyIndexSelectedPartyId = null;
        currentPartyStatementRows = [];
        document.getElementById('partyStatementName').textContent = '-';
        document.getElementById('partyStatementMeta').textContent = '-';
        document.getElementById('partyStatementDate').textContent = '-';
        document.getElementById('partyStatementTime').textContent = '-';
        renderPartyStatementRows([]);
        recalculatePartyStatementSummary();
        return;
    }
    if (!partyIndexSelectedPartyId || !partyIndexParties.some(party => Number(party.id) === Number(partyIndexSelectedPartyId))) {
        partyIndexSelectedPartyId = Number(partyIndexParties[0].id);
        renderPartyIndexList();
    }
}
function printPartyStatement() {
    const invoiceHtml = document.getElementById('partyStatementInvoice')?.innerHTML;
    if (!invoiceHtml) {
        return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        return;
    }
    const html = `
    <html>
      <head>
        <title>Party Statement</title>
        <style>
          @page { size: A4; margin: 14mm; }
          body { font-family: Arial, sans-serif; color: #111; margin: 0; }
          .sheet { border: 2px solid #222; padding: 10px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #444; padding: 7px; font-size: 12px; }
          th { background: #f2f2f2; text-align: left; }
          .text-right { text-align: right; }
          .font-semibold { font-weight: 600; }
          .font-bold { font-weight: 700; }
          .text-sm { font-size: 12px; }
          .text-base { font-size: 14px; }
          .border { border: 1px solid #d1d5db; }
          .border-b { border-bottom: 1px solid #d1d5db; }
          .rounded { border-radius: 6px; }
          .bg-gray-50 { background: #f9fafb; }
          .bg-gray-100 { background: #f3f4f6; }
          .p-4 { padding: 16px; }
          .pb-3 { padding-bottom: 12px; }
          .px-3 { padding-left: 12px; padding-right: 12px; }
          .py-2 { padding-top: 8px; padding-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .mt-4 { margin-top: 16px; }
          .flex { display: flex; }
          .items-start { align-items: flex-start; }
          .justify-between { justify-content: space-between; }
          .gap-4 { gap: 16px; }
          .w-full { width: 100%; }
          .ml-auto { margin-left: auto; }
          .no-print { display: none !important; }
        </style>
      </head>
      <body>
        <div class="sheet">${ invoiceHtml }</div>
      </body>
    </html>
  `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}
async function sharePartyStatementWhatsApp() {
    const name = document.getElementById('partyStatementName')?.textContent || 'Customer';
    const meta = document.getElementById('partyStatementMeta')?.textContent || '';
    const phone = (meta.split('/')[0] || '').replace(/[^0-9]/g, '');
    const bal = document.getElementById('partyStatementClosingBalance')?.textContent || '0.00';
    const text = `*Party Statement: ${ name }*\nBalance: ${ bal }\nThank you!`;
    const result = await window.api.shareWhatsApp({
        phone,
        message: text
    });
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to open WhatsApp.');
        return;
    }
    showToast('Opening WhatsApp...');
}
window.sharePartyStatementWhatsApp = sharePartyStatementWhatsApp;
function togglePaymentOtherMode(prefix) {
    const modeSelect = document.getElementById(`payment${ prefix }Mode`) || document.getElementById(`editPaymentMode`);
    const otherInput = document.getElementById(`payment${ prefix }OtherMode`) || document.getElementById(`editPaymentOtherMode`);
    if (!modeSelect || !otherInput)
        return;
    if (modeSelect.value === 'Other') {
        otherInput.classList.remove('hidden');
    } else {
        otherInput.classList.add('hidden');
        otherInput.value = '';
    }
}
function getPaymentData(prefix, type) {
    let rawMode = document.getElementById(`${ prefix }Mode`).value.trim();
    const description = type === 'IN' ? 'Payment Received' : 'Payment Out';
    return {
        date: document.getElementById(`${ prefix }Date`).value,
        party_id: Number(document.getElementById(`${ prefix }PartyId`).value),
        type,
        amount: Number(document.getElementById(`${ prefix }Amount`).value),
        mode: normalizePaymentMode(rawMode, prefix),
        description
    };
}
function normalizePaymentMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'cash') {
        return 'Cash';
    }
    if (normalized === 'upi') {
        return 'UPI';
    }
    if (normalized === 'bank' || normalized === 'bank transaction' || normalized === 'bank transfer') {
        return 'Bank Transaction';
    }
    if (normalized === 'cheque' || normalized === 'check') {
        return 'Cheque';
    }
    if (normalized === 'other') {
        const otherPrefix = prefix ? prefix.includes('edit') ? 'editPayment' : prefix : '';
        const otherInput = otherPrefix ? document.getElementById(`${ otherPrefix }OtherMode`) : null;
        return otherInput ? otherInput.value.trim() || 'Other' : 'Other';
    }
    return value.trim() || '';
}
function paymentModeBadgeClass(mode) {
    if (mode === 'Cash') {
        return 'bg-emerald-100 text-emerald-800';
    }
    if (mode === 'UPI') {
        return 'bg-sky-100 text-sky-800';
    }
    if (mode === 'Bank Transaction') {
        return 'bg-indigo-100 text-indigo-800';
    }
    if (mode === 'Cheque') {
        return 'bg-amber-100 text-amber-800';
    }
    return 'bg-gray-100 text-gray-700';
}
function clearPaymentForm(prefix) {
    document.getElementById(`${ prefix }Amount`).value = '';
    document.getElementById(`${ prefix }Mode`).value = 'Cash';
    const otherInput = document.getElementById(`${ prefix }OtherMode`);
    if (otherInput) {
        otherInput.value = '';
        otherInput.classList.add('hidden');
    }
}
async function submitPayment(prefix, type) {
    const data = getPaymentData(prefix, type);
    if (!data.date || !data.party_id || data.amount <= 0 || !data.mode) {
        window.alert('Date, party name, amount and mode are required.');
        return;
    }
    const result = await window.api.addPayment(data);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to save payment.');
        return;
    }
    clearPaymentForm(prefix);
    await refreshPayments();
    await loadLedger();
    showToast(`Payment ${ type } saved.`);
}
function renderPaymentsTable(tableId, payments) {
    const table = document.getElementById(tableId);
    if (!table) {
        return;
    }
    table.innerHTML = '';
    if (!Array.isArray(payments) || payments.length === 0) {
        table.innerHTML = `
      <tr>
        <td colspan="5" class="p-4 text-center text-gray-500">No payment entries found.</td>
      </tr>
    `;
        return;
    }
    payments.forEach((payment, index) => {
        const particulars = payment.type === 'OUT' ? 'Payment Out' : 'Payment Received';
        const partyName = payment.party_name || '-';
        const modeLabel = normalizePaymentMode(payment.mode) || payment.mode || '-';
        const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        table.innerHTML += `
      <tr class="${ rowClass } hover:bg-blue-50 transition-colors">
        <td class="px-4 py-3 align-middle text-gray-700">${ escapeHtml(formatDisplayDate(payment.date)) }</td>
        <td class="px-4 py-3 align-middle">
          <div class="font-semibold text-gray-900">${ escapeHtml(partyName) }</div>
          <div class="text-xs text-gray-500">${ escapeHtml(particulars) }</div>
        </td>
        <td class="px-4 py-3 align-middle text-right font-semibold text-gray-900">${ Number(payment.amount).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ paymentModeBadgeClass(modeLabel) }">${ escapeHtml(modeLabel) }</span>
        </td>
        <td class="px-4 py-3 align-middle">
          <div class="flex items-center gap-2">
            <button onclick="startEditPayment(${ payment.id })" class="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-xs">Edit</button>
            <button onclick="removePayment(${ payment.id })" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs">Delete</button>
          </div>
        </td>
      </tr>
    `;
    });
}
function renderPayments(payments) {
    currentPayments = payments;
    const inPayments = payments.filter(payment => payment.type === 'IN');
    const outPayments = payments.filter(payment => payment.type === 'OUT');
    renderPaymentsTable('paymentsInTableBody', inPayments);
    renderPaymentsTable('paymentsOutTableBody', outPayments);
}
async function refreshPayments() {
    const payments = await window.api.getPayments();
    renderPayments(payments);
}
function startEditPayment(id) {
    const payment = currentPayments.find(item => item.id === id);
    if (!payment) {
        return;
    }
    document.getElementById('paymentEditCard').classList.remove('hidden');
    document.getElementById('editPaymentId').value = payment.id;
    document.getElementById('editPaymentDate').value = payment.date;
    document.getElementById('editPaymentPartyId').value = String(payment.party_id);
    document.getElementById('editPaymentType').value = payment.type;
    document.getElementById('editPaymentAmount').value = payment.amount;
    const knownModes = [
        'Cash',
        'UPI',
        'Bank Transaction',
        'Cheque'
    ];
    const pMode = String(payment.mode || '').trim();
    const isKnown = knownModes.includes(pMode);
    document.getElementById('editPaymentMode').value = isKnown ? pMode : 'Other';
    const otherInput = document.getElementById('editPaymentOtherMode');
    if (otherInput) {
        otherInput.value = isKnown ? '' : pMode;
        if (isKnown) {
            otherInput.classList.add('hidden');
        } else {
            otherInput.classList.remove('hidden');
        }
    }
    document.getElementById('editPaymentDescription').value = payment.type === 'IN' ? 'Payment Received' : 'Payment Out';
}
function cancelPaymentEdit() {
    document.getElementById('paymentEditCard').classList.add('hidden');
    document.getElementById('editPaymentId').value = '';
}
async function savePaymentEdit() {
    const id = Number(document.getElementById('editPaymentId').value);
    if (!id) {
        return;
    }
    const data = {
        date: document.getElementById('editPaymentDate').value,
        party_id: Number(document.getElementById('editPaymentPartyId').value),
        type: document.getElementById('editPaymentType').value,
        amount: Number(document.getElementById('editPaymentAmount').value),
        mode: normalizePaymentMode(document.getElementById('editPaymentMode').value.trim(), 'editPayment'),
        description: document.getElementById('editPaymentType').value === 'IN' ? 'Payment Received' : 'Payment Out'
    };
    if (!data.date || !data.party_id || data.amount <= 0 || !data.mode) {
        window.alert('Date, party name, amount and mode are required.');
        return;
    }
    const result = await window.api.updatePayment(id, data);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to update payment.');
        return;
    }
    cancelPaymentEdit();
    await refreshPayments();
    await loadLedger();
    showToast('Payment updated.');
}
async function removePayment(id) {
    const result = await window.api.deletePayment(id);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to delete payment.');
        return;
    }
    await refreshPayments();
    await loadLedger();
    showToast('Payment deleted.');
}
async function openLedgerSource(paymentId, purchaseId, saleId) {
    const normalizedPaymentId = Number(paymentId) || 0;
    const normalizedPurchaseId = Number(purchaseId) || 0;
    const normalizedSaleId = Number(saleId) || 0;
    if (normalizedPaymentId > 0) {
        await refreshPayments();
        const payment = currentPayments.find(item => Number(item.id) === normalizedPaymentId);
        showView(payment?.type === 'OUT' ? 'paymentOut' : 'paymentIn');
        await refreshPayments();
        startEditPayment(normalizedPaymentId);
        return;
    }
    if (normalizedPurchaseId > 0) {
        await startEditPurchase(normalizedPurchaseId);
        return;
    }
    if (normalizedSaleId > 0) {
        showView('transaction');
        setTransactionFlowStage('entry');
        setTransactionType('sale', false);
        await viewSaleDetail(normalizedSaleId);
        return;
    }
    window.alert('This ledger row is not linked to a bill entry.');
}
async function editLedgerSource(paymentId, purchaseId, saleId) {
    const normalizedPaymentId = Number(paymentId) || 0;
    const normalizedPurchaseId = Number(purchaseId) || 0;
    const normalizedSaleId = Number(saleId) || 0;
    if (normalizedPaymentId > 0) {
        await refreshPayments();
        const payment = currentPayments.find(item => Number(item.id) === normalizedPaymentId);
        showView(payment?.type === 'OUT' ? 'paymentOut' : 'paymentIn');
        await refreshPayments();
        startEditPayment(normalizedPaymentId);
        return;
    }
    if (normalizedPurchaseId > 0) {
        await startEditPurchase(normalizedPurchaseId);
        return;
    }
    if (normalizedSaleId > 0) {
        await startEditSale(normalizedSaleId);
        return;
    }
    window.alert('This ledger row is not linked to an editable bill entry.');
}
async function deleteLedgerSource(paymentId, purchaseId, saleId) {
    const normalizedPaymentId = Number(paymentId) || 0;
    const normalizedPurchaseId = Number(purchaseId) || 0;
    const normalizedSaleId = Number(saleId) || 0;
    if (normalizedPaymentId > 0) {
        
        const result = await window.api.deletePayment(normalizedPaymentId);
        if (!result || !result.success) {
            window.alert(result?.message || 'Unable to delete payment entry.');
            return;
        }
        await refreshPayments();
        await loadLedger();
        showToast('Payment entry deleted.');
        return;
    }
    if (normalizedPurchaseId > 0) {
        
        const result = await window.api.deletePurchase(normalizedPurchaseId);
        if (!result || !result.success) {
            window.alert(result?.message || 'Unable to delete purchase entry.');
            return;
        }
        await refreshPurchases();
        await refreshStock();
        await refreshPurchaseRates();
        await refreshProfitLoss();
        await loadLedger();
        showToast('Purchase entry deleted.');
        return;
    }
    if (normalizedSaleId > 0) {
        
        const result = await window.api.deleteSale(normalizedSaleId);
        if (!result || !result.success) {
            window.alert(result?.message || 'Unable to delete sale entry.');
            return;
        }
        await refreshSales();
        await refreshStock();
        await refreshProfitLoss();
        await loadLedger();
        showToast('Sale entry deleted.');
        return;
    }
    window.alert('This ledger row is not linked to a deletable source transaction.');
}
function isManualLedgerEntry(entry) {
    if (!entry) {
        return false;
    }
    return !(Number(entry.payment_id) || Number(entry.purchase_id) || Number(entry.sale_id));
}
function resolveLedgerBillNo(billNo, fallbackId, rawText) {
    const direct = String(billNo || '').trim();
    if (direct) {
        return direct;
    }
    const text = String(rawText || '').trim();
    const hashIndex = text.indexOf('#');
    if (hashIndex >= 0) {
        const afterHash = text.slice(hashIndex + 1).trim();
        if (afterHash) {
            return afterHash.split('|')[0].trim();
        }
    }
    const fallback = String(fallbackId || '').trim();
    return fallback;
}
function getLedgerParticulars(entry) {
    const paymentId = Number(entry?.payment_id) || 0;
    const purchaseId = Number(entry?.purchase_id) || 0;
    const saleId = Number(entry?.sale_id) || 0;
    const rawText = String(entry?.particulars || entry?.description || '').trim();
    const loweredText = rawText.toLowerCase();
    const paymentType = String(entry?.payment_type || '').trim().toUpperCase();
    if (paymentId > 0) {
        if (paymentType === 'OUT') {
            return 'Payment Paid';
        }
        if (paymentType === 'IN') {
            return 'Payment Received';
        }
        return loweredText.includes('out') ? 'Payment Paid' : 'Payment Received';
    }
    if (purchaseId > 0) {
        const purchaseBillNo = resolveLedgerBillNo(entry?.purchase_bill_no, purchaseId, rawText);
        return purchaseBillNo ? `Purchase Bill #${ purchaseBillNo }` : 'Purchase Bill';
    }
    if (saleId > 0) {
        const saleBillNo = resolveLedgerBillNo(entry?.sale_bill_no, saleId, rawText);
        return saleBillNo ? `Sales Bill #${ saleBillNo }` : 'Sales';
    }
    if (loweredText.includes('purchase')) {
        const purchaseBillNo = resolveLedgerBillNo('', purchaseId, rawText);
        return purchaseBillNo ? `Purchase Bill #${ purchaseBillNo }` : 'Purchase Bill';
    }
    if (loweredText.includes('sale')) {
        const saleBillNo = resolveLedgerBillNo('', saleId, rawText);
        return saleBillNo ? `Sales Bill #${ saleBillNo }` : 'Sales';
    }
    if (loweredText.includes('payment')) {
        return loweredText.includes('out') ? 'Payment Paid' : 'Payment Received';
    }
    return rawText || '-';
}
function computeLedgerRows(rows) {
    const sourceRows = Array.isArray(rows) ? rows : [];
    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    const computedRows = sourceRows.map(entry => {
        const amount = Number(entry?.amount || 0);
        const isDebit = String(entry?.type || '').toLowerCase() === 'debit';
        const isCredit = !isDebit;
        const debit = isDebit ? amount : 0;
        const credit = isCredit ? amount : 0;
        runningBalance += credit - debit;
        totalDebit += debit;
        totalCredit += credit;
        return {
            ...entry,
            particulars: getLedgerParticulars(entry),
            debit,
            credit,
            balance: runningBalance
        };
    });
    return {
        rows: computedRows,
        totalDebit,
        totalCredit,
        closingBalance: runningBalance
    };
}
function updateLedgerTotals(summary, persistBase = true) {
    const normalized = {
        totalDebit: Number(summary?.totalDebit || 0),
        totalCredit: Number(summary?.totalCredit || 0),
        closingBalance: Number(summary?.closingBalance ?? Number(summary?.totalCredit || 0) - Number(summary?.totalDebit || 0))
    };
    if (persistBase) {
        currentLedgerSummary = { ...normalized };
    }
    const totalDebitEl = document.getElementById('ledgerTotalDebit');
    const totalCreditEl = document.getElementById('ledgerTotalCredit');
    const balanceLabelEl = document.getElementById('ledgerBalanceLabel');
    const closingDebitEl = document.getElementById('ledgerClosingDebit');
    const closingCreditEl = document.getElementById('ledgerClosingCredit');
    const absoluteDiff = Math.abs(normalized.totalCredit - normalized.totalDebit);
    let balanceSide = 'Balanced';
    if (normalized.totalDebit > normalized.totalCredit) {
        balanceSide = 'Dr';
    } else if (normalized.totalCredit > normalized.totalDebit) {
        balanceSide = 'Cr';
    }
    if (totalDebitEl) {
        totalDebitEl.textContent = formatCurrency(normalized.totalDebit);
    }
    if (totalCreditEl) {
        totalCreditEl.textContent = formatCurrency(normalized.totalCredit);
    }
    if (balanceLabelEl) {
        balanceLabelEl.textContent = balanceSide === 'Balanced' ? 'Balance' : `Balance (${ balanceSide })`;
    }
    if (closingDebitEl && closingCreditEl) {
        const formattedDiff = formatCurrency(absoluteDiff);
        closingDebitEl.textContent = balanceSide === 'Dr' || balanceSide === 'Balanced' ? formattedDiff : '-';
        closingCreditEl.textContent = balanceSide === 'Cr' || balanceSide === 'Balanced' ? formattedDiff : '-';
        closingDebitEl.classList.remove('text-green-700', 'text-red-700', 'text-gray-700');
        closingCreditEl.classList.remove('text-green-700', 'text-red-700', 'text-gray-700');
        if (balanceSide === 'Dr') {
            closingDebitEl.classList.add('text-red-700');
            closingCreditEl.classList.add('text-gray-700');
        } else if (balanceSide === 'Cr') {
            closingDebitEl.classList.add('text-gray-700');
            closingCreditEl.classList.add('text-green-700');
        } else {
            closingDebitEl.classList.add('text-gray-700');
            closingCreditEl.classList.add('text-gray-700');
        }
    }
}
function getLedgerActionButtons(entry) {
    const id = Number(entry?.id || 0);
    if (!id) {
        return '-';
    }
    if (isManualLedgerEntry(entry)) {
        return `
      <div class="flex items-center gap-2 flex-wrap">
        <button onclick="event.stopPropagation(); editManualLedgerEntry(${ id })" class="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded text-xs">Edit</button>
        <button onclick="event.stopPropagation(); deleteManualLedgerEntry(${ id })" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">Delete</button>
      </div>
    `;
    }
    const paymentId = Number(entry?.payment_id) || 0;
    const purchaseId = Number(entry?.purchase_id) || 0;
    const saleId = Number(entry?.sale_id) || 0;
    return `
    <div class="flex items-center gap-2 flex-wrap">
      <button onclick="event.stopPropagation(); editLedgerSource(${ paymentId }, ${ purchaseId }, ${ saleId })" class="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded text-xs">Edit</button>
      <button onclick="event.stopPropagation(); deleteLedgerSource(${ paymentId }, ${ purchaseId }, ${ saleId })" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">Delete</button>
    </div>
  `;
}
function renderLedgerBook(rows) {
    const body = document.getElementById('ledgerTableBody');
    if (!body) {
        return;
    }
    const summary = computeLedgerRows(rows);
    currentLedgerRows = summary.rows;
    body.innerHTML = '';
    if (summary.rows.length === 0) {
        body.innerHTML = `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle text-center text-gray-500 flex items-center justify-center gap-2" colspan="5">No ledger entries found for this party.</td>
      </tr>
    `;
        updateLedgerTotals(summary);
        return;
    }
    let html = '';
    const displayRows = [...summary.rows].reverse();
    displayRows.forEach(entry => {
        const paymentId = Number(entry?.payment_id) || 0;
        const purchaseId = Number(entry?.purchase_id) || 0;
        const saleId = Number(entry?.sale_id) || 0;
        const hasLinkedSource = paymentId > 0 || purchaseId > 0 || saleId > 0;
        const rowClass = hasLinkedSource ? 'border-t cursor-pointer hover:bg-blue-50' : 'border-t';
        const rowClickAttr = hasLinkedSource ? ` onclick="openLedgerSource(${ paymentId }, ${ purchaseId }, ${ saleId })" title="Click to open related bill"` : '';
        const particularsClass = hasLinkedSource ? 'p-2 text-blue-800 font-medium' : 'p-2';
        html += `
      <tr class="${ rowClass }"${ rowClickAttr }>
        <td class="px-4 py-3 align-middle">${ escapeHtml(formatDisplayDate(entry.date || '-')) }</td>
        <td class="px-4 py-3 align-middle ${ particularsClass }">${ escapeHtml(entry.particulars) }</td>
        <td class="px-4 py-3 align-middle text-right text-red-700">${ entry.debit > 0 ? formatCurrency(entry.debit) : '-' }</td>
        <td class="px-4 py-3 align-middle text-right text-green-700">${ entry.credit > 0 ? formatCurrency(entry.credit) : '-' }</td>
        <td class="px-4 py-3 align-middle">${ getLedgerActionButtons(entry) }</td>
      </tr>
    `;
    });
    body.innerHTML = html;
    updateLedgerTotals(summary);
}
function setLedgerManualActionState(isEdit) {
    const saveBtn = document.getElementById('ledgerManualSaveBtn');
    if (!saveBtn) {
        return;
    }
    saveBtn.textContent = isEdit ? 'Update Manual Entry' : 'Add Manual Entry';
    saveBtn.classList.remove('bg-amber-600', 'hover:bg-amber-700', 'bg-blue-700', 'hover:bg-blue-800');
    if (isEdit) {
        saveBtn.classList.add('bg-amber-600', 'hover:bg-amber-700');
        return;
    }
    saveBtn.classList.add('bg-blue-700', 'hover:bg-blue-800');
}
function resetManualLedgerForm() {
    const today = new Date().toISOString().slice(0, 10);
    const dateEl = document.getElementById('ledgerManualDate');
    const particularsEl = document.getElementById('ledgerManualParticulars');
    const debitEl = document.getElementById('ledgerManualDebit');
    const creditEl = document.getElementById('ledgerManualCredit');
    if (dateEl && !String(dateEl.value || '').trim()) {
        dateEl.value = today;
    }
    if (particularsEl) {
        particularsEl.value = '';
    }
    if (debitEl) {
        debitEl.value = '';
    }
    if (creditEl) {
        creditEl.value = '';
    }
    editingManualLedgerEntryId = null;
    editingManualLedgerEntryType = '';
    setLedgerManualActionState(false);
    updateLedgerTotals(currentLedgerSummary, false);
}
function onLedgerManualInputChange() {
    if (!ledgerSelectedPartyId) {
        return;
    }
    const draftDebit = Math.max(0, Number(document.getElementById('ledgerManualDebit')?.value || 0));
    const draftCredit = Math.max(0, Number(document.getElementById('ledgerManualCredit')?.value || 0));
    let previewDebit = Number(currentLedgerSummary.totalDebit || 0);
    let previewCredit = Number(currentLedgerSummary.totalCredit || 0);
    if (editingManualLedgerEntryId) {
        const editingRow = currentLedgerRows.find(entry => Number(entry.id) === Number(editingManualLedgerEntryId));
        const existingAmount = Number(editingRow?.amount || 0);
        if (String(editingRow?.type || '').toLowerCase() === 'debit') {
            previewDebit = Math.max(0, previewDebit - existingAmount);
        } else if (String(editingRow?.type || '').toLowerCase() === 'credit') {
            previewCredit = Math.max(0, previewCredit - existingAmount);
        }
    }
    const previewSummary = {
        totalDebit: previewDebit + draftDebit,
        totalCredit: previewCredit + draftCredit
    };
    previewSummary.closingBalance = previewSummary.totalCredit - previewSummary.totalDebit;
    updateLedgerTotals(previewSummary, false);
}
async function refreshLedgerPartyIndex() {
    ledgerPartyRows = await window.api.getParties();
    renderLedgerPartyTable();
}
function renderLedgerPartyTable() {
    const body = document.getElementById('ledgerPartyTableBody');
    if (!body) {
        return;
    }
    const query = String(document.getElementById('ledgerPartySearch')?.value || '').trim().toLowerCase();
    const rows = (Array.isArray(ledgerPartyRows) ? ledgerPartyRows : []).filter(party => {
        if (!query) {
            return true;
        }
        return [
            party.name,
            party.phone,
            party.city,
            party.state
        ].map(value => String(value || '').toLowerCase()).some(value => value.includes(query));
    });
    body.innerHTML = '';
    if (rows.length === 0) {
        body.innerHTML = `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle text-center text-gray-500" colspan="5">No party found.</td>
      </tr>
    `;
        return;
    }
    rows.forEach((party, index) => {
        const isActive = Number(party.id) === Number(ledgerSelectedPartyId);
        body.innerHTML += `
      <tr class="border-t ${ isActive ? 'bg-blue-50' : '' }">
        <td class="px-4 py-3 align-middle">${ index + 1 }</td>
        <td class="px-4 py-3 align-middle font-medium text-blue-700 hover:underline cursor-pointer" onclick="openLedgerForParty(${ party.id })" title="Click to open ledger">${ escapeHtml(party.name || '-') }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(party.phone || '-') }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(party.city || '-') }</td>
        <td class="px-4 py-3 align-middle"><button onclick="openLedgerForParty(${ party.id })" class="bg-blue-700 text-white px-3 py-1 rounded">Open</button></td>
      </tr>
    `;
    });
}
async function openLedgerForParty(partyId) {
    const id = Number(partyId);
    if (!id) {
        return;
    }
    if (!Array.isArray(ledgerPartyRows) || ledgerPartyRows.length === 0) {
        await refreshLedgerPartyIndex();
    }
    const party = ledgerPartyRows.find(item => Number(item.id) === id);
    if (!party) {
        window.alert('Party not found. Refresh and try again.');
        return;
    }
    recordNavState();
    ledgerSelectedPartyId = id;
    const picker = document.getElementById('ledgerPartyPicker');
    const detail = document.getElementById('ledgerDetailPanel');
    if (picker) {
        picker.classList.add('hidden');
    }
    if (detail) {
        detail.classList.remove('hidden');
    }
    const titleEl = document.getElementById('ledgerPartyTitle');
    if (titleEl) {
        titleEl.textContent = `${ party.name || 'Party' } Ledger`;
    }
    const metaEl = document.getElementById('ledgerPartyMeta');
    if (metaEl) {
        const cityState = [
            party.city,
            party.state
        ].filter(Boolean).join(', ');
        metaEl.textContent = [
            party.phone || '-',
            cityState || '-'
        ].join(' | ');
    }
    resetManualLedgerForm();
    renderLedgerPartyTable();
    updateGlobalBreadcrumbs('ledger');
    updateGlobalBackButton();
    await loadLedger();
}
function backToLedgerPartyPicker() {
    const picker = document.getElementById('ledgerPartyPicker');
    const detail = document.getElementById('ledgerDetailPanel');
    if (picker) {
        picker.classList.remove('hidden');
    }
    if (detail) {
        detail.classList.add('hidden');
    }
    ledgerSelectedPartyId = null;
    currentLedgerRows = [];
    const titleEl = document.getElementById('ledgerPartyTitle');
    const metaEl = document.getElementById('ledgerPartyMeta');
    if (titleEl) {
        titleEl.textContent = 'Party Ledger';
    }
    if (metaEl) {
        metaEl.textContent = '-';
    }
    renderLedgerBook([]);
    resetManualLedgerForm();
    renderLedgerPartyTable();
}
function openLedgerRoot() {
    backToLedgerPartyPicker();
    refreshLedgerPartyIndex();
}
async function saveManualLedgerEntry() {
    if (!ledgerSelectedPartyId) {
        window.alert('Open a party ledger first.');
        return;
    }
    const date = String(document.getElementById('ledgerManualDate')?.value || '').trim();
    const particulars = String(document.getElementById('ledgerManualParticulars')?.value || '').trim();
    const debit = Number(document.getElementById('ledgerManualDebit')?.value || 0);
    const credit = Number(document.getElementById('ledgerManualCredit')?.value || 0);
    if (!date || !particulars) {
        window.alert('Manual entry date and particulars are required.');
        return;
    }
    if (debit < 0 || credit < 0) {
        window.alert('Debit and credit cannot be negative.');
        return;
    }
    if (debit <= 0 && credit <= 0) {
        window.alert('Enter debit or credit amount.');
        return;
    }
    if (editingManualLedgerEntryId) {
        if (editingManualLedgerEntryType === 'debit' && debit <= 0) {
            window.alert('This row is a debit entry. Enter a valid debit amount.');
            return;
        }
        if (editingManualLedgerEntryType === 'credit' && credit <= 0) {
            window.alert('This row is a credit entry. Enter a valid credit amount.');
            return;
        }
        const result = await window.api.updateManualLedgerEntry(editingManualLedgerEntryId, {
            date,
            party_id: ledgerSelectedPartyId,
            particulars,
            debit,
            credit
        });
        if (!result || !result.success) {
            window.alert(result?.message || 'Unable to update manual ledger entry.');
            return;
        }
        resetManualLedgerForm();
        await loadLedger();
        showToast('Manual ledger entry updated.');
        return;
    }
    const result = await window.api.addManualLedgerEntry({
        date,
        party_id: ledgerSelectedPartyId,
        particulars,
        debit,
        credit
    });
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to add manual ledger entry.');
        return;
    }
    resetManualLedgerForm();
    await loadLedger();
    showToast('Manual ledger entry added.');
}
function editManualLedgerEntry(ledgerId) {
    const id = Number(ledgerId);
    if (!id) {
        return;
    }
    const row = currentLedgerRows.find(entry => Number(entry.id) === id);
    if (!row || !isManualLedgerEntry(row)) {
        window.alert('Only manual entries can be edited directly.');
        return;
    }
    const dateEl = document.getElementById('ledgerManualDate');
    const particularsEl = document.getElementById('ledgerManualParticulars');
    const debitEl = document.getElementById('ledgerManualDebit');
    const creditEl = document.getElementById('ledgerManualCredit');
    if (dateEl) {
        dateEl.value = row.date || '';
    }
    if (particularsEl) {
        particularsEl.value = row.particulars || '';
    }
    if (debitEl) {
        debitEl.value = row.type === 'debit' ? formatCurrency(row.amount) : '';
    }
    if (creditEl) {
        creditEl.value = row.type === 'credit' ? formatCurrency(row.amount) : '';
    }
    editingManualLedgerEntryId = id;
    editingManualLedgerEntryType = String(row.type || '').toLowerCase();
    setLedgerManualActionState(true);
}
async function deleteManualLedgerEntry(ledgerId) {
    const id = Number(ledgerId);
    if (!id) {
        return;
    }
    const result = await window.api.deleteManualLedgerEntry(id);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to delete manual ledger entry.');
        return;
    }
    if (editingManualLedgerEntryId === id) {
        resetManualLedgerForm();
    }
    await loadLedger();
    showToast('Manual ledger entry deleted.');
}
function buildLedgerShareMessage() {
    if (!ledgerSelectedPartyId) {
        return '';
    }
    const party = ledgerPartyRows.find(item => Number(item.id) === Number(ledgerSelectedPartyId));
    const summary = computeLedgerRows(currentLedgerRows);
    const lines = [
        `Party Ledger - ${ party?.name || '-' }`,
        `Phone: ${ party?.phone || '-' }`,
        `City: ${ party?.city || '-' }`,
        `Date: ${ formatDisplayDate(new Date().toISOString().slice(0, 10)) }`,
        ''
    ];
    if (summary.rows.length === 0) {
        lines.push('No ledger entries found.');
    } else {
        lines.push('Entries:');
        summary.rows.forEach((entry, index) => {
            lines.push(`${ index + 1 }. ${ formatDisplayDate(entry.date || '-') } | ${ entry.particulars || '-' } | Dr ${ entry.debit > 0 ? formatCurrency(entry.debit) : '-' } | Cr ${ entry.credit > 0 ? formatCurrency(entry.credit) : '-' } | Bal ${ formatCurrency(entry.balance) }`);
        });
    }
    lines.push('');
    lines.push(`Total Debit: ${ formatCurrency(summary.totalDebit) }`);
    lines.push(`Total Credit: ${ formatCurrency(summary.totalCredit) }`);
    lines.push(`Closing Balance: ${ formatCurrency(summary.closingBalance) }`);
    return lines.join('\n');
}
async function shareLedgerOnWhatsApp() {
    if (!ledgerSelectedPartyId) {
        window.alert('Open a party ledger first.');
        return;
    }
    const party = ledgerPartyRows.find(item => Number(item.id) === Number(ledgerSelectedPartyId));
    const message = buildLedgerShareMessage();
    if (!message) {
        window.alert('Unable to build ledger share message.');
        return;
    }
    const result = await window.api.shareWhatsApp({
        phone: String(party?.phone || '').trim(),
        message
    });
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to open WhatsApp share.');
        return;
    }
    showToast('Opening WhatsApp share...');
}
function buildLedgerPdfHtml() {
    if (!ledgerSelectedPartyId) {
        return '';
    }
    const party = ledgerPartyRows.find(item => Number(item.id) === Number(ledgerSelectedPartyId));
    const summary = computeLedgerRows(currentLedgerRows);
    const fromDate = String(document.getElementById('ledgerDateFrom')?.value || '').trim();
    const toDate = String(document.getElementById('ledgerDateTo')?.value || '').trim();
    const dateRangeLabel = fromDate || toDate ? `${ formatDisplayDate(fromDate || '-') } to ${ formatDisplayDate(toDate || '-') }` : 'All Dates';
    const rows = summary.rows.map((entry, index) => `
    <tr>
      <td>${ index + 1 }</td>
      <td>${ escapeHtml(formatDisplayDate(entry.date || '-')) }</td>
      <td>${ escapeHtml(entry.particulars || '-') }</td>
      <td class="px-4 py-3 align-middle num">${ entry.debit > 0 ? formatCurrency(entry.debit) : '-' }</td>
      <td class="px-4 py-3 align-middle num">${ entry.credit > 0 ? formatCurrency(entry.credit) : '-' }</td>
      <td class="px-4 py-3 align-middle num">${ formatCurrency(entry.balance) }</td>
    </tr>
  `).join('');
    return `
    <html>
      <head>
        <meta charset="utf-8">
        <title>Ledger - ${ escapeHtml(party?.name || 'Party') }</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #111827; }
          .sheet { border: 1px solid #111827; padding: 10px; min-height: calc(297mm - 20mm); }
          .header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
          .title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          .meta { font-size: 12px; line-height: 1.5; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; }
          th, td { border: 1px solid #111827; padding: 6px; font-size: 12px; }
          th { background: #e5e7eb; text-align: left; }
          .num { text-align: right; }
          .totals { margin-top: 10px; width: 320px; margin-left: auto; border: 1px solid #111827; }
          .totals-row { display: flex; justify-content: space-between; border-bottom: 1px solid #d1d5db; padding: 6px 8px; font-size: 12px; }
          .totals-row:last-child { border-bottom: 0; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div>
              <div class="title">Party Ledger</div>
              <div class="meta">
                <div><strong>Party:</strong> ${ escapeHtml(party?.name || '-') }</div>
                <div><strong>Phone:</strong> ${ escapeHtml(party?.phone || '-') }</div>
                <div><strong>City:</strong> ${ escapeHtml(party?.city || '-') }</div>
              </div>
            </div>
            <div class="meta">
              <div><strong>Date Range:</strong> ${ escapeHtml(dateRangeLabel) }</div>
              <div><strong>Generated On:</strong> ${ escapeHtml(formatDisplayDate(new Date().toISOString().slice(0, 10))) }</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:50px;">S.No</th>
                <th style="width:95px;">Date</th>
                <th>Particulars</th>
                <th class="num" style="width:90px;">Debit</th>
                <th class="num" style="width:90px;">Credit</th>
                <th class="num" style="width:100px;">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${ rows || '<tr><td colspan="6" style="text-align:center;">No entries</td></tr>' }
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row"><span>Total Debit</span><span>${ formatCurrency(summary.totalDebit) }</span></div>
            <div class="totals-row"><span>Total Credit</span><span>${ formatCurrency(summary.totalCredit) }</span></div>
            <div class="totals-row"><span>Closing Balance</span><span>${ formatCurrency(summary.closingBalance) }</span></div>
          </div>
        </div>
      </body>
    </html>
  `;
}
async function downloadLedgerPdf() {
    if (!ledgerSelectedPartyId) {
        window.alert('Open a party ledger first.');
        return;
    }
    const party = ledgerPartyRows.find(item => Number(item.id) === Number(ledgerSelectedPartyId));
    const html = buildLedgerPdfHtml();
    if (!html) {
        window.alert('Unable to build ledger PDF.');
        return;
    }
    const defaultFileName = `ledger-${ String(party?.name || 'party').replace(/\s+/g, '-').toLowerCase() }.pdf`;
    const result = await withLoading(() => window.api.savePdf({
        html,
        defaultFileName
    }));
    if (!result || !result.success) {
        if (result?.canceled) {
            return;
        }
        window.alert(result?.message || 'Unable to download ledger PDF.');
        return;
    }
    showToast('Ledger PDF downloaded.');
}
async function loadLedger() {
    if (!ledgerSelectedPartyId) {
        renderLedgerBook([]);
        return;
    }
    const filters = {
        partyId: Number(ledgerSelectedPartyId),
        dateFrom: document.getElementById('ledgerDateFrom')?.value || null,
        dateTo: document.getElementById('ledgerDateTo')?.value || null
    };
    const rows = await window.api.getLedger(filters);
    renderLedgerBook(rows || []);
}
function calculatePurchaseLineTotal() {
    const cases = Number(document.getElementById('purchaseBoxes').value) || 0;
    const qtyPerCase = Number(document.getElementById('purchasePieces').value) || 0;
    const rate = Number(document.getElementById('purchaseRate').value) || 0;

    const discInput = document.getElementById('purchaseDiscount');
    if (discInput && discInput.value === '' && (cases > 0 || rate > 0)) {
        discInput.value = '50';
    }
    const packInput = document.getElementById('purchasePackingCharge');
    if (packInput && packInput.value === '' && (cases > 0 || rate > 0)) {
        packInput.value = '3';
    }
    const commInput = document.getElementById('purchaseAgentCommission');
    if (commInput && commInput.value === '' && (cases > 0 || rate > 0)) {
        commInput.value = '3';
    }

    const discountValue = Number(document.getElementById('purchaseDiscount').value) || 0;
    const packingCharge = Number(document.getElementById('purchasePackingCharge').value) || 0;
    const transportCharge = Number(document.getElementById('purchaseTransportCharge').value) || 0;
    const agentCommission = Number(document.getElementById('purchaseAgentCommission').value) || 0;
    const discountMode = String(document.getElementById('purchaseDiscountMode')?.value || 'percent').trim();
    const packingMode = String(document.getElementById('purchasePackingMode')?.value || 'percent').trim();
    const commissionMode = String(document.getElementById('purchaseAgentCommissionMode')?.value || 'percent').trim();
    const lineBase = cases * qtyPerCase * rate;
    const discountAmount = discountMode === 'percent' ? lineBase * discountValue / 100 : discountValue;
    const packingAmount = packingMode === 'percent' ? lineBase * packingCharge / 100 : packingCharge;
    const commissionAmount = commissionMode === 'percent' ? lineBase * agentCommission / 100 : agentCommission;
    const total = lineBase - discountAmount + packingAmount + transportCharge + commissionAmount;
    document.getElementById('purchaseLineTotal').value = total ? total.toFixed(2) : '';
}
function clearPurchaseLineForm() {
    document.getElementById('purchaseProductName').value = '';
    document.getElementById('purchaseBoxes').value = '';
    document.getElementById('purchasePieces').value = '';
    document.getElementById('purchaseDiscount').value = '';
    document.getElementById('purchaseDiscountMode').value = 'percent';
    document.getElementById('purchaseUnitType').value = 'Pcs';
    document.getElementById('purchaseRate').value = '';
    document.getElementById('purchasePackingCharge').value = '';
    document.getElementById('purchasePackingMode').value = 'percent';
    document.getElementById('purchaseTransportCharge').value = '';
    document.getElementById('purchaseAgentCommission').value = '';
    document.getElementById('purchaseAgentCommissionMode').value = 'percent';
    document.getElementById('purchaseSellingRate').value = '';
    document.getElementById('purchaseLineTotal').value = '';
}
function derivePurchaseBillNo(row) {
    const direct = String(row?.bill_no || '').trim();
    if (direct) {
        return direct;
    }
    return String(row?.id || '').trim();
}
function getNextPurchaseBillNo() {
    let maxNumericBillNo = 0;
    currentPurchaseRows.forEach(row => {
        const billNo = derivePurchaseBillNo(row);
        const value = Number(billNo);
        if (Number.isFinite(value) && value > maxNumericBillNo) {
            maxNumericBillNo = value;
        }
    });
    return String(maxNumericBillNo + 1);
}
function setPurchaseEditMode(purchaseId, billNo = '') {
    const editingInput = document.getElementById('editingPurchaseId');
    const submitBtn = document.getElementById('purchaseSubmitBtn');
    const billNoInput = document.getElementById('purchaseBillNo');
    editingInput.value = purchaseId ? String(purchaseId) : '';
    submitBtn.textContent = purchaseId ? 'Update Purchase' : 'Save Purchase';
    if (!billNoInput) {
        return;
    }
    if (purchaseId) {
        billNoInput.value = String(billNo || purchaseId);
        return;
    }
    if (!String(billNoInput.value || '').trim()) {
        billNoInput.value = getNextPurchaseBillNo();
    }
}
function resetPurchaseForm() {
    purchaseItemsDraft = [];
    renderPurchaseDraft();
    clearPurchaseLineForm();
    const billNoInput = document.getElementById('purchaseBillNo');
    if (billNoInput) {
        billNoInput.value = '';
    }
    setPurchaseEditMode(null);
    purchaseDeliveryTypeDraft = 'Cash';
    document.getElementById('purchaseUnitType').value = 'Pcs';
}
function renderPurchaseDraft() {
    const table = document.getElementById('purchaseItemsTableBody');
    table.innerHTML = '';
    purchaseItemsDraft.forEach((item, index) => {
        table.innerHTML += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle">${ index + 1 }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(item.product_name) }</td>
        <td class="px-4 py-3 align-middle text-right">${ item.boxes }</td>
        <td class="px-4 py-3 align-middle text-right">${ item.pieces }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(normalizeUnitType(item.unit_type) || 'Pcs') }</td>
        <td class="px-4 py-3 align-middle text-right">${ item.rate.toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ item.packing_charge.toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ item.transport_charge.toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ item.agent_commission.toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(item.discount_percent || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ item.selling_rate.toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ item.total.toFixed(2) }</td>
        <td class="px-4 py-3 align-middle"><button onclick="removePurchaseItem(${ index })" class="bg-red-600 text-white px-3 py-1 rounded">Delete</button></td>
      </tr>
    `;
    });
    const grandTotal = purchaseItemsDraft.reduce((sum, item) => sum + item.total, 0);
    document.getElementById('purchaseGrandTotal').textContent = grandTotal.toFixed(2);
}
function addPurchaseItem() {
    const productName = document.getElementById('purchaseProductName').value.trim();
    const cases = Number(document.getElementById('purchaseBoxes').value) || 0;
    const qtyPerCase = Number(document.getElementById('purchasePieces').value) || 0;
    const discountValue = Number(document.getElementById('purchaseDiscount').value);
    const discountMode = String(document.getElementById('purchaseDiscountMode')?.value || 'percent').trim();
    const unitType = normalizeUnitType(document.getElementById('purchaseUnitType').value);
    const rate = Number(document.getElementById('purchaseRate').value) || 0;
    const packingCharge = Number(document.getElementById('purchasePackingCharge').value);
    const packingMode = String(document.getElementById('purchasePackingMode')?.value || 'percent').trim();
    const transportCharge = Number(document.getElementById('purchaseTransportCharge').value);
    const supplierSelect = document.getElementById('purchasePartyId');
    const supplierName = supplierSelect && supplierSelect.selectedIndex >= 0 ? String(supplierSelect.options[supplierSelect.selectedIndex].text || '').trim() : '';
    const agentName = supplierName || 'Supplier';
    const agentCommission = Number(document.getElementById('purchaseAgentCommission').value);
    const commissionMode = String(document.getElementById('purchaseAgentCommissionMode')?.value || 'percent').trim();
    const sellingRate = Number(document.getElementById('purchaseSellingRate').value);
    if (!productName || cases <= 0 || qtyPerCase <= 0 || !unitType || rate <= 0 || !Number.isFinite(discountValue) || discountValue < 0 || !Number.isFinite(packingCharge) || packingCharge < 0 || !Number.isFinite(transportCharge) || transportCharge < 0 || !Number.isFinite(agentCommission) || agentCommission < 0 || !Number.isFinite(sellingRate) || sellingRate <= 0) {
        window.alert('Fill all item fields with valid values.');
        return;
    }
    const duplicate = purchaseItemsDraft.find(item => item.product_name.toLowerCase() === productName.toLowerCase());
    if (duplicate) {
        window.alert('Duplicate product in the same purchase is not allowed. Edit existing line instead.');
        return;
    }
    const lineBase = cases * qtyPerCase * rate;
    const discountAmount = discountMode === 'percent' ? lineBase * discountValue / 100 : discountValue;
    const packingAmount = packingMode === 'percent' ? lineBase * packingCharge / 100 : packingCharge;
    const commissionAmount = commissionMode === 'percent' ? lineBase * agentCommission / 100 : agentCommission;
    if (discountAmount > lineBase) {
        window.alert('Discount cannot be greater than line amount.');
        return;
    }
    const manualTotal = Number(document.getElementById('purchaseLineTotal').value);
    const computedTotal = lineBase - discountAmount + packingAmount + transportCharge + commissionAmount;
    const total = Number.isFinite(manualTotal) && manualTotal > 0 ? manualTotal : computedTotal;
    purchaseItemsDraft.push({
        product_name: productName,
        boxes: cases,
        pieces: qtyPerCase,
        discount_percent: discountAmount,
        unit_type: unitType,
        rate,
        packing_charge: packingAmount,
        transport_charge: transportCharge,
        agent_name: agentName,
        agent_commission: commissionAmount,
        selling_rate: sellingRate,
        total
    });
    renderPurchaseDraft();
    clearPurchaseLineForm();
}
function removePurchaseItem(index) {
    purchaseItemsDraft.splice(index, 1);
    renderPurchaseDraft();
}
async function submitPurchase() {
    const billNo = document.getElementById('purchaseBillNo').value.trim();
    const partyId = Number(document.getElementById('purchasePartyId').value);
    const godownId = Number(document.getElementById('purchaseGodownId').value);
    const date = document.getElementById('purchaseDate').value;
    const editingId = Number(document.getElementById('editingPurchaseId').value);
    const deliveryType = purchaseDeliveryTypeDraft || 'Cash';
    if (!date || !partyId || !godownId || purchaseItemsDraft.length === 0) {
        window.alert('Date, party, godown and at least one item are required.');
        return;
    }
    const payload = {
        bill_no: billNo,
        date,
        party_id: partyId,
        godown_id: godownId,
        delivery_type: deliveryType,
        items: purchaseItemsDraft
    };
    const result = editingId ? await window.api.updatePurchase(editingId, payload) : await window.api.addPurchase(payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Failed to save purchase changes.');
        return;
    }
    resetPurchaseForm();
    await refreshPurchases();
    await refreshProductCatalog();
    await refreshGodowns();
    await refreshStock();
    await refreshPurchaseRates();
    await loadLedger();
    showToast(editingId ? 'Purchase updated.' : 'Purchase saved.');
}
async function startEditPurchase(id) {
    showView('transaction');
    setTransactionFlowStage('entry');
    setTransactionType('purchase', false);
    const details = await window.api.getPurchaseDetails(id);
    if (!details) {
        window.alert('Purchase not found.');
        return;
    }
    document.getElementById('purchaseDate').value = details.date;
    document.getElementById('purchaseBillNo').value = String(details.bill_no || details.id || '');
    document.getElementById('purchasePartyId').value = String(details.party_id);
    onPurchasePartyChange();
    document.getElementById('purchaseGodownId').value = String(details.godown_id || '');
    purchaseDeliveryTypeDraft = details.delivery_type || 'Cash';
    purchaseItemsDraft = (details.items || []).map(item => ({
        product_name: item.product_name,
        boxes: Number(item.boxes) || 0,
        pieces: Number(item.pieces) || 0,
        discount_percent: Number(item.discount_percent) || 0,
        unit_type: normalizeUnitType(item.unit_type) || 'Pcs',
        rate: Number(item.rate) || 0,
        packing_charge: Number(item.packing_charge) || 0,
        transport_charge: Number(item.transport_charge) || 0,
        agent_name: item.agent_name || '-',
        agent_commission: Number(item.agent_commission) || 0,
        selling_rate: Number(item.selling_rate) || Number(item.rate) || 0,
        total: Number(item.total) || 0
    }));
    if (purchaseItemsDraft.length > 0) {
        document.getElementById('purchaseUnitType').value = purchaseItemsDraft[0].unit_type || 'Pcs';
    }
    renderPurchaseDraft();
    setPurchaseEditMode(id, details.bill_no || details.id);
}
function cancelPurchaseEdit() {
    resetPurchaseForm();
}
async function removePurchase(id) {
    const result = await window.api.deletePurchase(id);
    if (!result || !result.success) {
        window.alert('Failed to delete purchase.');
        return;
    }
    resetPurchaseForm();
    await refreshPurchases();
    await refreshProductCatalog();
    await refreshGodowns();
    await refreshStock();
    await refreshPurchaseRates();
    await loadLedger();
}
function renderPurchases(purchases) {
    allPurchaseRows = Array.isArray(purchases) ? purchases : [];
    rebuildPurchaseReturnReferenceOptions();
    const selectedPartyId = Number(document.getElementById('purchasePartyId')?.value || 0);
    currentPurchaseRows = allPurchaseRows.filter(row => {
        if (!selectedPartyId) {
            return false;
        }
        return Number(row.party_id) === selectedPartyId;
    });
    const table = document.getElementById('purchasesTableBody');
    table.innerHTML = '';
    if (!selectedPartyId) {
        table.innerHTML = `
      <tr class="border-t">
        <td colspan="15" class="p-3 text-center text-gray-500">Select supplier to view entries.</td>
      </tr>
    `;
        return;
    }
    if (currentPurchaseRows.length === 0) {
        table.innerHTML = `
      <tr class="border-t">
        <td colspan="15" class="p-3 text-center text-gray-500">No entries found for selected supplier.</td>
      </tr>
    `;
        return;
    }
    let html = '';
    currentPurchaseRows.forEach(purchase => {
        const unitType = normalizeUnitType(purchase.unit_type) || 'Pcs';
        const billNo = derivePurchaseBillNo(purchase);
        html += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle">${ escapeHtml(billNo) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(formatDisplayDate(purchase.date)) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(purchase.party_name) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(purchase.product_name || '-') }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(purchase.boxes || 0) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(purchase.pieces || 0) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(unitType) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(purchase.rate || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(purchase.packing_charge || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(purchase.transport_charge || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(purchase.agent_commission || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(purchase.discount_percent || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(purchase.selling_rate || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(purchase.total || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">
          <div class="inline-flex items-center justify-center gap-2">
            <button onclick="startEditPurchase(${ purchase.id })" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Edit</button>
            <button onclick="removePurchase(${ purchase.id })" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Delete</button>
          </div>
        </td>
      </tr>
    `;
    });
    table.innerHTML = html;
    const editingId = Number(document.getElementById('editingPurchaseId')?.value || 0);
    if (!editingId) {
        const billNoInput = document.getElementById('purchaseBillNo');
        if (billNoInput && !String(billNoInput.value || '').trim()) {
            billNoInput.value = getNextPurchaseBillNo();
        }
    }
}
async function refreshPurchases() {
    const purchases = await window.api.getPurchases();
    renderPurchases(purchases);
}
function renderGodownList(godowns) {
    currentGodowns = godowns;
    renderGodownDropdown(godowns);
    const list = document.getElementById('godownList');
    if (!list) {
        return;
    }
    list.innerHTML = '';
    godowns.forEach(godown => {
        const isSelected = Number(godown.id) === Number(selectedGodownId);
        list.innerHTML += `
      <div class="bg-white p-4 rounded shadow border ${ isSelected ? 'border-blue-600 ring-1 ring-blue-300' : 'border-gray-200' }">
        <button onclick="openGodown(${ godown.id })" class="w-full text-left flex items-center justify-between gap-3 font-semibold text-blue-900 hover:text-blue-700">
          <span>${ escapeHtml(godown.name) }</span>
          <span class="text-xs px-2 py-1 rounded ${ isSelected ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700' }">Open</span>
        </button>
      </div>
    `;
    });
}
function renderGodownDeleteTarget(godowns) {
    const select = document.getElementById('godownDeleteTarget');
    if (!select) {
        return;
    }
    const previous = select.value;
    const options = godowns.map(godown => `<option value="${ godown.id }">${ escapeHtml(godown.name) }</option>`).join('');
    select.innerHTML = '<option value="">Select Godown</option>' + options;
    if (selectedGodownId && godowns.some(godown => Number(godown.id) === Number(selectedGodownId))) {
        select.value = String(selectedGodownId);
        return;
    }
    if (previous && godowns.some(godown => String(godown.id) === previous)) {
        select.value = previous;
    }
}
async function refreshGodowns() {
    const godowns = await window.api.getGodowns();
    renderGodownList(godowns || []);
    if (!selectedGodownId && godowns.length > 0) {
        selectedGodownId = Number(godowns[0].id);
    }
    const selectedExists = godowns.some(godown => Number(godown.id) === Number(selectedGodownId));
    if (!selectedExists) {
        selectedGodownId = godowns.length > 0 ? Number(godowns[0].id) : null;
    }
    if (selectedGodownId) {
        const selected = godowns.find(godown => Number(godown.id) === Number(selectedGodownId));
        const title = document.getElementById('selectedGodownTitle');
        if (title && selected) {
            title.textContent = selected.name;
        }
    }
    renderGodownDeleteTarget(godowns || []);
}
async function addGodown() {
    const input = document.getElementById('godownNameInput');
    const name = input ? input.value.trim() : '';
    if (!name) {
        window.alert('Godown name is required.');
        return;
    }
    const result = await window.api.addGodown(name);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to add godown.');
        return;
    }
    input.value = '';
    if (result.id) {
        selectedGodownId = Number(result.id);
    }
    await refreshGodowns();
    showToast(`Godown "${result.name || name}" added successfully.`);
}
async function deleteGodown(id) {
    const result = await window.api.deleteGodown(id);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to delete godown.');
        return;
    }
    if (Number(selectedGodownId) === Number(id)) {
        selectedGodownId = null;
        goBackToGodownList();
    }
    await refreshGodowns();
    showToast('Godown deleted.');
}
async function deleteGodownFromTop() {
    const select = document.getElementById('godownDeleteTarget');
    const godownId = Number(select?.value || 0);
    if (!godownId) {
        window.alert('Select godown to delete.');
        return;
    }
    await deleteGodown(godownId);
}
function openGodown(id) {
    recordNavState();
    selectedGodownId = Number(id);
    const selected = currentGodowns.find(godown => Number(godown.id) === Number(selectedGodownId));
    document.getElementById('godownSelectionCard').classList.add('hidden');
    document.getElementById('godownDetailCard').classList.remove('hidden');
    document.getElementById('selectedGodownTitle').textContent = selected ? selected.name : 'Godown Details';
    updateGlobalBreadcrumbs('stock');
    updateGlobalBackButton();
    refreshStock();
}
function goBackToGodownList() {
    document.getElementById('godownSelectionCard').classList.remove('hidden');
    document.getElementById('godownDetailCard').classList.add('hidden');
    updateGlobalBreadcrumbs('stock');
    updateGlobalBackButton();
}
function renderStock(rows) {
    currentGodownStockRows = Array.isArray(rows) ? rows : [];
    const table = document.getElementById('stockTableBody');
    table.innerHTML = '';
    if (!currentGodownStockRows || currentGodownStockRows.length === 0) {
        table.innerHTML = `
      <tr>
        <td colspan="14" class="p-4 text-center text-gray-500">No stock found for selected godown.</td>
      </tr>
    `;
        return;
    }
    let html = '';
    currentGodownStockRows.forEach((row, index) => {
        const totalQty = Number(row.total_quantity ?? row.total_pieces) || 0;
        const qtyPerCase = Number(row.pieces_per_box) || 0;
        const unitType = normalizeUnitType(row.unit_type) || 'Pcs';
        const stockValue = Number(row.total_value) || 0;
        const addedDate = row.last_purchase_date || '-';
        const billNo = String(row.last_purchase_bill_no || '-');
        const lowStock = totalQty <= LOW_STOCK_QTY_THRESHOLD;
        const availableStock = `${ totalQty.toFixed(2) } ${ unitType }`;
        const rowClass = lowStock ? 'bg-red-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        html += `
      <tr class="${ rowClass }">
        <td class="px-4 py-3 align-middle">${ escapeHtml(formatDisplayDate(addedDate)) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(billNo) }</td>
        <td class="px-4 py-3 align-middle font-medium text-gray-900">${ escapeHtml(row.product_name) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(row.total_boxes) || 0 }</td>
        <td class="px-4 py-3 align-middle text-right">${ qtyPerCase }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(unitType) }</td>
        <td class="px-4 py-3 align-middle text-right font-medium">${ escapeHtml(availableStock) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(row.rate).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(row.discount || 0).toFixed(2) }%</td>
        <td class="px-4 py-3 align-middle text-right">${ parseFloat(Number(row.packing_charge || 0).toFixed(2)) }%</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(row.transport_charge || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(row.agent_commission !== undefined ? row.agent_commission : (row.commission || 0)).toFixed(2) }%</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(row.selling_rate || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">
          <div class="inline-flex items-center justify-center gap-2">
            <button onclick="editGodownStockItem(${ Number(row.product_id) })" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Edit</button>
            <button onclick="removeGodownStockItem(${ Number(row.product_id) })" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Remove</button>
          </div>
        </td>
      </tr>
    `;
    });
    table.innerHTML = html;
}
async function editGodownStockItem(productId) {
    if (!selectedGodownId) {
        return;
    }
    const row = currentGodownStockRows.find(item => Number(item.product_id) === Number(productId));
    if (!row) {
        window.alert('Godown item not found. Refresh and try again.');
        return;
    }
    const values = await openEditorDialog('Edit Godown Item', [
        {
            key: 'last_purchase_date',
            label: 'Date',
            type: 'date',
            value: row.last_purchase_date || new Date().toISOString().slice(0, 10)
        },
        {
            key: 'total_boxes',
            label: 'Cases',
            type: 'number',
            min: 0,
            value: Number(row.total_boxes) || 0
        },
        {
            key: 'pieces_per_box',
            label: 'Qty per Case',
            type: 'number',
            min: 0,
            value: Number(row.pieces_per_box) || 0
        },
        {
            key: 'unit_type',
            label: 'Quantity Type',
            type: 'select',
            value: normalizeUnitType(row.unit_type) || 'Pcs',
            options: [
                'Pcs',
                'Box',
                'Unit',
                'Pkt'
            ]
        },
        {
            key: 'purchase_rate',
            label: 'Purchase Rate',
            type: 'number',
            step: '0.01',
            min: 0,
            value: Number(row.rate || 0)
        },
        {
            key: 'discount',
            label: 'Discount (%)',
            type: 'number',
            step: '0.01',
            min: 0,
            value: Number(row.discount || 0)
        },
        {
            key: 'packing_charge',
            label: 'Packing Charge (%)',
            type: 'number',
            step: '0.01',
            min: 0,
            value: Number(row.packing_charge || 0)
        },
        {
            key: 'transport_charge',
            label: 'Transport Charge',
            type: 'number',
            step: '0.01',
            min: 0,
            value: Number(row.transport_charge || 0)
        },
        {
            key: 'agent_commission',
            label: 'Agent Commission (%)',
            type: 'number',
            step: '0.01',
            min: 0,
            value: Number(row.agent_commission !== undefined ? row.agent_commission : (row.commission || 0))
        },
        {
            key: 'selling_rate',
            label: 'Selling Rate',
            type: 'number',
            step: '0.01',
            min: 0,
            value: Number(row.selling_rate || 0)
        }
    ]);
    if (!values) {
        return;
    }
    const payload = {
        last_purchase_date: String(values.last_purchase_date || '').trim(),
        total_boxes: Number(values.total_boxes),
        pieces_per_box: Number(values.pieces_per_box),
        unit_type: String(values.unit_type || '').trim(),
        purchase_rate: Number(values.purchase_rate),
        discount: Number(values.discount || 0),
        packing_charge: Number(values.packing_charge),
        transport_charge: Number(values.transport_charge),
        agent_commission: Number(values.agent_commission || 0),
        selling_rate: Number(values.selling_rate)
    };
    const result = await window.api.updateGodownStockItem(selectedGodownId, productId, payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to update godown item.');
        return;
    }
    await refreshStock();
    showToast('Godown item updated.');
}
async function removeGodownStockItem(productId) {
    if (!selectedGodownId) {
        return;
    }
    const result = await window.api.deleteGodownStockItem(selectedGodownId, productId);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to remove godown item.');
        return;
    }
    await refreshStock();
    showToast('Godown item removed.');
}
async function refreshStock() {
    if (!selectedGodownId) {
        renderStock([]);
        return;
    }
    const query = String(document.getElementById('stockSearchInput')?.value || '').trim();
    const rows = await window.api.getGodownStock(selectedGodownId, query);
    renderStock(rows);
}
function setRawMaterialEditMode(id) {
    const editingInput = document.getElementById('rawMaterialEditingId');
    const saveBtn = document.getElementById('rawMaterialSaveBtn');
    if (editingInput) {
        editingInput.value = id ? String(id) : '';
    }
    if (saveBtn) {
        saveBtn.textContent = id ? 'Update Entry' : 'Save Entry';
    }
}
function onRawMaterialEntryTypeChange() {
    const entryType = String(document.getElementById('rawMaterialEntryType')?.value || 'IN').trim().toUpperCase();
    const isOut = entryType === 'OUT';
    const rateWrap = document.getElementById('rawMaterialRateWrap');
    const placeWrap = document.getElementById('rawMaterialPlaceWrap');
    const detailsWrap = document.getElementById('rawMaterialProductDetailsWrap');
    if (rateWrap) {
        rateWrap.classList.toggle('hidden', isOut);
    }
    if (rateWrap) {
        rateWrap.classList.toggle('hidden', isOut);
    }
    if (isOut) {
        const rateInput = document.getElementById('rawMaterialRate');
        if (rateInput) {
            rateInput.value = '';
        }
    }
    refreshRawMaterialTransactions();
}
function resetRawMaterialForm() {
    const today = new Date().toISOString().slice(0, 10);
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
        }
    };
    setValue('rawMaterialDate', today);
    setValue('rawMaterialEntryType', 'IN');
    setValue('rawMaterialPartyId', '');
    setValue('rawMaterialProductName', '');
    setValue('rawMaterialQuantity', '');
    setValue('rawMaterialUnitType', 'Pcs');
    setValue('rawMaterialRate', '');
    setValue('rawMaterialProductDetails', '');
    setValue('rawMaterialNotes', '');
    setRawMaterialEditMode(null);
    onRawMaterialEntryTypeChange();
}
function getRawMaterialFormPayload() {
    const entryType = String(document.getElementById('rawMaterialEntryType')?.value || '').trim();
    const isOut = String(entryType).toUpperCase() === 'OUT';
    return {
        date: String(document.getElementById('rawMaterialDate')?.value || '').trim(),
        entry_type: entryType,
        party_id: Number(document.getElementById('rawMaterialPartyId')?.value || 0),
        product_name: String(document.getElementById('rawMaterialProductName')?.value || '').trim(),
        quantity: Number(document.getElementById('rawMaterialQuantity')?.value || 0),
        unit_type: String(document.getElementById('rawMaterialUnitType')?.value || '').trim(),
        rate: isOut ? 0 : Number(document.getElementById('rawMaterialRate')?.value || 0),
        product_details: String(document.getElementById('rawMaterialProductDetails')?.value || '').trim(),
        notes: String(document.getElementById('rawMaterialNotes')?.value || '').trim()
    };
}
function renderRawMaterialProductOptions(names) {
    rawMaterialProductNames = Array.isArray(names) ? names : [];
    const list = document.getElementById('rawMaterialProductList');
    if (!list) {
        return;
    }
    list.innerHTML = rawMaterialProductNames.map(name => `<option value="${ escapeHtml(String(name || '').trim()) }"></option>`).join('');
}
async function refreshRawMaterialProductOptions() {
    const names = await window.api.getRawMaterialProducts('');
    renderRawMaterialProductOptions(names || []);
}
function renderRawMaterialStock(rows) {
    rawMaterialStockRows = Array.isArray(rows) ? rows : [];
    const body = document.getElementById('rawMaterialStockTableBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';
    if (rawMaterialStockRows.length === 0) {
        body.innerHTML = `
      <tr>
        <td colspan="6" class="p-4 text-center text-gray-500">No raw material stock found.</td>
      </tr>
    `;
        return;
    }
    let html = '';
    rawMaterialStockRows.forEach(row => {
        const totalIn = Number(row.total_in || 0);
        const totalOut = Number(row.total_out || 0);
        const balanceQty = Number(row.balance_qty || 0);
        const safeName = escapeHtml(row.product_name || '-');
        const safeUnit = escapeHtml(row.unit_type || 'Pcs');
        html += `
      <tr class="border-t hover:bg-gray-50">
        <td class="px-4 py-3 align-middle font-medium text-blue-700 hover:underline cursor-pointer" onclick="openRawMaterialUsageModal('${ safeName }', '${ safeUnit }')" title="Click to view/record usage">${ safeName }</td>
        <td class="px-4 py-3 align-middle text-right">${ safeUnit }</td>
        <td class="px-4 py-3 align-middle text-right text-green-700 font-semibold">${ totalIn.toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right text-red-700 font-semibold cursor-pointer hover:underline" onclick="openRawMaterialUsageModal('${ safeName }', '${ safeUnit }')" title="Click to view/record usage">${ totalOut.toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right font-semibold ${ balanceQty < 0 ? 'text-red-700' : 'text-blue-900' }">${ balanceQty.toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">
          <div class="inline-flex items-center justify-center gap-1.5">
            <button onclick="openRawMaterialReceivedModal('${ safeName }', '${ safeUnit }')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2.5 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Received</button>
            <button onclick="editRawMaterialStockProduct('${ safeName }', '${ safeUnit }')" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-2.5 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Edit</button>
            <button onclick="removeRawMaterialStockProduct('${ safeName }')" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-2.5 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Delete</button>
          </div>
        </td>
      </tr>
    `;
    });
    body.innerHTML = html;
}
async function editRawMaterialStockProduct(productName, currentUnit = 'Pcs') {
    const values = await openEditorDialog('Edit Raw Material Product', [
        {
            key: 'product_name',
            label: 'Product Name',
            type: 'text',
            value: productName
        },
        {
            key: 'unit_type',
            label: 'Quantity Type',
            type: 'select',
            value: normalizeUnitType(currentUnit) || 'Pcs',
            options: ['Pcs', 'Box', 'Unit', 'Pkt', 'Kg', 'Gram', 'Bag', 'Sheet', 'Ream', 'Gross']
        }
    ]);
    if (!values) {
        return;
    }
    const newName = String(values.product_name || '').trim();
    const newUnit = String(values.unit_type || '').trim();
    if (!newName) {
        window.alert('Product name cannot be empty.');
        return;
    }
    const result = await window.api.updateRawMaterialProductName(productName, newName, newUnit);
    if (!result || !result.success) {
        window.alert(result?.message || 'Failed to update product.');
        return;
    }
    await refreshRawMaterialStock();
    await refreshRawMaterialTransactions();
    await refreshRawMaterialLedger();
    await refreshRawMaterialProductOptions();
    showToast('Product updated successfully.');
}
async function removeRawMaterialStockProduct(productName) {
    if (!window.confirm(`Are you sure you want to delete all entries for "${productName}"?`)) {
        return;
    }
    const result = await window.api.deleteRawMaterialProduct(productName);
    if (!result || !result.success) {
        window.alert(result?.message || 'Failed to delete product.');
        return;
    }
    await refreshRawMaterialStock();
    await refreshRawMaterialTransactions();
    await refreshRawMaterialLedger();
    await refreshRawMaterialProductOptions();
    showToast('Product deleted.');
}
async function refreshRawMaterialStock() {
    const query = String(document.getElementById('rawMaterialStockSearch')?.value || '').trim();
    const rows = await window.api.getRawMaterialStock(query);
    renderRawMaterialStock(rows || []);
}
function renderRawMaterialTransactions(rows) {
    rawMaterialTransactions = Array.isArray(rows) ? rows : [];
    const body = document.getElementById('rawMaterialTxnTableBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';
    if (rawMaterialTransactions.length === 0) {
        body.innerHTML = `
      <tr>
        <td colspan="7" class="px-4 py-3 align-middle text-center text-gray-500 flex items-center justify-center gap-2">No product in/out entries found.</td>
      </tr>
    `;
        return;
    }
    let html = '';
    rawMaterialTransactions.forEach(row => {
        const isOut = String(row.entry_type || '').toUpperCase() === 'OUT';
        const entryLabel = isOut ? 'Product OUT' : 'Product IN';
        const partyLabel = String(row.party_name || '').trim() || '-';
        const rateLabel = isOut ? '-' : Number(row.rate || 0).toFixed(2);
        const detailsLabel = row.product_details || '-';
        html += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">${ escapeHtml(formatDisplayDate(row.date || '-')) }</td>
        <td class="px-4 py-3 align-middle text-left min-w-[200px]">
          <div class="font-medium">${ escapeHtml(row.product_name || '-') }</div>
          <div class="text-xs text-gray-500">${ escapeHtml(`${ entryLabel } | Party: ${ partyLabel }`) }</div>
        </td>
        <td class="px-4 py-3 align-middle text-right font-semibold">${ Number(row.quantity || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-left whitespace-nowrap">${ escapeHtml(row.unit_type || 'Pcs') }</td>
        <td class="px-4 py-3 align-middle text-right">${ escapeHtml(rateLabel) }</td>
        <td class="px-4 py-3 align-middle text-left max-w-xs whitespace-normal break-words">${ escapeHtml(detailsLabel) }</td>
        <td class="px-4 py-3 align-middle text-center w-32 whitespace-nowrap flex items-center justify-center gap-2">
          <button onclick="startEditRawMaterialTransaction(${ Number(row.id) })" class="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded  transition text-xs font-medium">Edit</button>
          <button onclick="removeRawMaterialTransaction(${ Number(row.id) })" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition text-xs font-medium">Delete</button>
        </td>
      </tr>
    `;
    });
    body.innerHTML = html;
}
async function refreshRawMaterialTransactions() {
    const query = String(document.getElementById('rawMaterialTxnSearch')?.value || '').trim();
    const selectedType = String(document.getElementById('rawMaterialEntryType')?.value || '').trim().toUpperCase();
    const type = selectedType === 'IN' || selectedType === 'OUT' ? selectedType : '';
    const rows = await window.api.getRawMaterialTransactions({
        query,
        type
    });
    renderRawMaterialTransactions(rows || []);
}
function renderRawMaterialLedger(rows) {
    const body = document.getElementById('rawMaterialLedgerBody');
    if (!body) {
        return;
    }
    const ledgerRows = Array.isArray(rows) ? rows : [];
    body.innerHTML = '';
    if (ledgerRows.length === 0) {
        body.innerHTML = `
      <tr>
        <td colspan="5" class="p-4 text-center text-gray-500 flex items-center justify-center gap-2">No raw material ledger rows found.</td>
      </tr>
    `;
        return;
    }
    const html = [];
    ledgerRows.forEach(row => {
        const isOut = String(row.entry_type || '').trim().toUpperCase() === 'OUT';
        const qty = Number(row.quantity || 0).toFixed(2);
        const safeName = escapeHtml(row.product_name || '-');
        const safeUnit = escapeHtml(row.unit_type || 'Pcs');
        const received = isOut ? '-' : qty;
        const usedHtml = isOut
            ? `<button onclick="openRawMaterialUsageModal('${ safeName }', '${ safeUnit }', ${ Number(row.id) })" class="text-red-700 font-semibold hover:underline" title="Click to edit usage">${ qty }</button>`
            : `<button onclick="openRawMaterialUsageModal('${ safeName }', '${ safeUnit }')" class="text-gray-400 hover:text-red-600 text-xs hover:underline" title="Record usage for this product">-</button>`;

        html.push(`
      <tr class="border-t hover:bg-gray-50">
        <td class="px-4 py-3 align-middle">${ escapeHtml(formatDisplayDate(row.date || '-')) }</td>
        <td class="px-4 py-3 align-middle">
          <div class="font-medium text-blue-700 hover:underline cursor-pointer" onclick="openRawMaterialUsageModal('${ safeName }', '${ safeUnit }')" title="Click to record/update usage">${ safeName }</div>
          <div class="text-xs text-gray-500">${ escapeHtml(row.party_name || '-') }</div>
        </td>
        <td class="px-4 py-3 align-middle text-right text-green-700 font-semibold">${ escapeHtml(received) }</td>
        <td class="px-4 py-3 align-middle text-right">${ usedHtml }</td>
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">
          <div class="inline-flex items-center justify-center gap-1.5">
            <button onclick="openRawMaterialReceivedModal('${ safeName }', '${ safeUnit }')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2.5 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Received</button>
            <button onclick="editRawMaterialLedgerRow(${ Number(row.id) })" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-2.5 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Edit</button>
            <button onclick="removeRawMaterialTransaction(${ Number(row.id) })" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-2.5 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Delete</button>
          </div>
        </td>
      </tr>
    `);
    });
    body.innerHTML = html.join('');
}
async function refreshRawMaterialLedger() {
    const query = String(document.getElementById('rawMaterialLedgerSearch')?.value || '').trim();
    const productFilterEl = document.getElementById('rawMaterialLedgerProductFilter');
    const selectedProd = productFilterEl ? String(productFilterEl.value || '').trim().toLowerCase() : '';
    let rows = (await window.api.getRawMaterialTransactions({
        query,
        type: ''
    })) || [];

    if (productFilterEl) {
        const currentVal = productFilterEl.value;
        const productsSet = new Set();
        rows.forEach(r => {
            if (r.product_name) productsSet.add(r.product_name);
        });
        const optionsList = Array.from(productsSet).sort();
        let optHtml = '<option value="">All Products</option>';
        optionsList.forEach(p => {
            optHtml += `<option value="${ escapeHtml(p) }" ${ p === currentVal ? 'selected' : '' }>${ escapeHtml(p) }</option>`;
        });
        productFilterEl.innerHTML = optHtml;
    }

    if (selectedProd) {
        rows = rows.filter(r => String(r.product_name || '').toLowerCase() === selectedProd);
    }

    renderRawMaterialLedger(rows || []);
}
function editRawMaterialLedgerRow(id) {
    showView('rawMaterialEntry');
    startEditRawMaterialTransaction(id);
}
async function saveRawMaterialTransaction() {
    const payload = getRawMaterialFormPayload();
    const editingId = Number(document.getElementById('rawMaterialEditingId')?.value || 0);
    if (!payload.date || !payload.party_id || !payload.entry_type || !payload.product_name || !payload.unit_type) {
        window.alert('Date, party, type, product name and quantity type are required.');
        return;
    }
    if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
        window.alert('Quantity must be greater than zero.');
        return;
    }
    if (!Number.isFinite(payload.rate) || payload.rate < 0) {
        window.alert('Rate cannot be negative.');
    }
    const result = editingId ? await window.api.updateRawMaterialTransaction(editingId, payload) : await window.api.addRawMaterialTransaction(payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to save raw material entry.');
        return;
    }
    resetRawMaterialForm();
    await refreshRawMaterialProductOptions();
    await refreshRawMaterialTransactions();
    await refreshRawMaterialStock();
    await refreshRawMaterialLedger();
    showToast(editingId ? 'Raw material entry updated.' : 'Raw material entry saved.');
}
function startEditRawMaterialTransaction(id) {
    const row = rawMaterialTransactions.find(item => Number(item.id) === Number(id));
    if (!row) {
        return;
    }
    document.getElementById('rawMaterialDate').value = String(row.date || '').trim();
    document.getElementById('rawMaterialEntryType').value = String(row.entry_type || 'IN').toUpperCase() === 'OUT' ? 'OUT' : 'IN';
    document.getElementById('rawMaterialPartyId').value = String(row.party_id || '');
    document.getElementById('rawMaterialProductName').value = row.product_name || '';
    document.getElementById('rawMaterialQuantity').value = Number(row.quantity || 0).toFixed(2);
    document.getElementById('rawMaterialUnitType').value = row.unit_type || 'Pcs';
    document.getElementById('rawMaterialRate').value = row.rate || '';
    document.getElementById('rawMaterialProductDetails').value = row.product_details || '';
    document.getElementById('rawMaterialNotes').value = row.notes || '';
    setRawMaterialEditMode(id);
    onRawMaterialEntryTypeChange();
}
function cancelRawMaterialEdit() {
    resetRawMaterialForm();
}
async function removeRawMaterialTransaction(id) {
    const result = await window.api.deleteRawMaterialTransaction(id);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to delete entry.');
        return;
    }
    resetRawMaterialForm();
    await refreshRawMaterialProductOptions();
    await refreshRawMaterialTransactions();
    await refreshRawMaterialStock();
    await refreshRawMaterialLedger();
    showToast('Raw material entry deleted.');
}
function renderProductDropdown() {
    const select = document.getElementById('saleProductId');
    if (!select) {
        return;
    }
    const previous = select.value;
    const options = productCatalog.map(p => `<option value="${ p.id }">${ escapeHtml(p.name) }</option>`).join('');
    select.innerHTML = '<option value="">Select Product</option>' + options;
    if (previous) {
        select.value = previous;
    }
}
async function refreshProductCatalog() {
    productCatalog = await window.api.getProducts();
    renderProductDropdown();
}
function syncSaleRateFromProduct() {
    const productId = Number(document.getElementById('saleProductId').value);
    const product = productCatalog.find(p => p.id === productId);
    if (!product) {
        return;
    }
    document.getElementById('saleRate').value = Number(product.rate || 0).toFixed(2);
    calculateSaleLineTotal();
}
function normalizeSaleTypeForForm(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'upi') {
        return 'upi';
    }
    if (normalized === 'cash') {
        return 'cash';
    }
    if (normalized === 'cheque' || normalized === 'check') {
        return 'cheque';
    }
    if (normalized === 'bank transfer' || normalized === 'bank transaction' || normalized === 'bank') {
        return 'bank transfer';
    }
    return 'cash';
}
function formatSaleTypeLabel(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'credit') {
        return 'Credit';
    }
    const normalizedForForm = normalizeSaleTypeForForm(normalized);
    if (normalizedForForm === 'upi') {
        return 'UPI';
    }
    if (normalizedForForm === 'cheque') {
        return 'Cheque';
    }
    if (normalizedForForm === 'bank transfer') {
        return 'Bank Transfer';
    }
    return 'Cash';
}
function calculateSaleLineTotal() {
    const cases = Number(document.getElementById('saleBoxes').value) || 0;
    const qtyPerCase = Number(document.getElementById('salePieces').value) || 0;
    const rate = Number(document.getElementById('saleRate').value) || 0;
    const total = cases * qtyPerCase * rate;
    document.getElementById('saleLineTotal').value = total ? total.toFixed(2) : '';
}
function clearSaleLineForm() {
    document.getElementById('saleProductId').value = '';
    document.getElementById('saleBoxes').value = '';
    document.getElementById('salePieces').value = '';
    document.getElementById('saleUnitType').value = 'Pcs';
    document.getElementById('saleRate').value = '';
    document.getElementById('saleLineTotal').value = '';
}
function setSaleEditMode(id) {
    document.getElementById('editingSaleId').value = id ? String(id) : '';
    document.getElementById('saleSubmitBtn').textContent = id ? 'Update Invoice' : 'Save Invoice';
}
function resetSaleForm() {
    saleItemsDraft = [];
    renderSaleDraft();
    clearSaleLineForm();
    setSaleEditMode(null);
    const selectedPartyId = Number(document.getElementById('salePartyId')?.value || transactionFlowPartyId || 0);
    const selectedParty = currentParties.find(item => Number(item.id) === selectedPartyId);
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
        }
    };
    const setChecked = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.checked = value;
        }
    };
    setValue('saleType', 'cash');
    setValue('saleBillNo', getNextSaleBillNo());
    setValue('saleGodownId', '');
    setValue('saleBillName', selectedParty?.name || '');
    setValue('salePartyAddress', selectedParty?.address || '');
    setValue('saleVehicleNo', '');
    setValue('saleDeliveryPlace', '');
    setValue('saleDeliveryFeedback', '');
    setValue('saleDeliveryDate', new Date().toISOString().slice(0, 10));
    setValue('saleBillTime', getCurrentTimeValue());
    setValue('saleDeliveryTime', '');
    setChecked('saleUseDiscount', true);
    setChecked('saleUseTransport', true);
    setChecked('saleUseCommission', false);
    setChecked('saleUseAgentCommission', false);
    setChecked('saleUseGst', false);
    setValue('saleDiscount', '0');
    setValue('saleDiscountMode', 'percent');
    setValue('saleDeliveryCharges', '0');
    setValue('saleCommissionCharges', '0');
    setValue('salePackingMode', 'percent');
    setValue('saleAgentName', '');
    setValue('saleAgentCommission', '0');
    setValue('saleAgentCommissionMode', 'percent');
    setValue('saleGstPercent', '18');
    toggleAgentCommissionFields();
    toggleSaleGstFields();
    setValue('saleUnitType', 'Pcs');
    saleFinalTotalIsManual = false;
}

let saleFinalTotalIsManual = false;
function onSaleFinalTotalManualInput() {
    saleFinalTotalIsManual = true;
}
window.onSaleFinalTotalManualInput = onSaleFinalTotalManualInput;

function toggleSaleGstFields() {
    const isChecked = Boolean(document.getElementById('saleUseGst')?.checked);
    const container = document.getElementById('saleGstFields');
    if (container) {
        container.classList.toggle('hidden', !isChecked);
    }
    saleFinalTotalIsManual = false;
    recalculateSaleFinalTotal();
}
window.toggleSaleGstFields = toggleSaleGstFields;

function setSaleGstPreset(percent) {
    const el = document.getElementById('saleGstPercent');
    if (el) {
        el.value = String(percent);
    }
    const check = document.getElementById('saleUseGst');
    if (check && !check.checked) {
        check.checked = true;
        const container = document.getElementById('saleGstFields');
        if (container) {
            container.classList.remove('hidden');
        }
    }
    saleFinalTotalIsManual = false;
    recalculateSaleFinalTotal();
}
window.setSaleGstPreset = setSaleGstPreset;

function toggleAgentCommissionFields() {
    const isChecked = Boolean(document.getElementById('saleUseAgentCommission')?.checked);
    const container = document.getElementById('saleAgentCommissionFields');
    if (container) {
        container.classList.toggle('hidden', !isChecked);
    }
    saleFinalTotalIsManual = false;
    recalculateSaleFinalTotal();
}
window.toggleAgentCommissionFields = toggleAgentCommissionFields;

function recalculateSaleFinalTotal() {
    const grand = saleItemsDraft.reduce((sum, item) => sum + item.total, 0);
    const discountRaw = Number(document.getElementById('saleDiscount').value) || 0;
    const transportRaw = Number(document.getElementById('saleDeliveryCharges').value) || 0;
    const commissionRaw = Number(document.getElementById('saleCommissionCharges').value) || 0;
    const agentRaw = Number(document.getElementById('saleAgentCommission')?.value) || 0;

    const discountMode = String(document.getElementById('saleDiscountMode')?.value || 'percent').trim();
    const packingMode = String(document.getElementById('salePackingMode')?.value || 'percent').trim();
    const agentMode = String(document.getElementById('saleAgentCommissionMode')?.value || 'percent').trim();

    const discountAmount = discountMode === 'percent' ? grand * discountRaw / 100 : discountRaw;
    const packingAmount = packingMode === 'percent' ? grand * commissionRaw / 100 : commissionRaw;
    const agentAmount = agentMode === 'percent' ? grand * agentRaw / 100 : agentRaw;

    const discount = document.getElementById('saleUseDiscount').checked ? discountAmount : 0;
    const transport = document.getElementById('saleUseTransport').checked ? transportRaw : 0;
    const commission = document.getElementById('saleUseCommission').checked ? packingAmount : 0;
    const agentCommission = Boolean(document.getElementById('saleUseAgentCommission')?.checked) ? agentAmount : 0;

    const useGst = Boolean(document.getElementById('saleUseGst')?.checked);
    const gstPercent = Number(document.getElementById('saleGstPercent')?.value) || 0;
    const baseAfterDiscount = Math.max(0, grand - discount);
    const gstAmount = useGst ? (baseAfterDiscount * gstPercent / 100) : 0;

    const computedFinalTotal = baseAfterDiscount + transport + commission + agentCommission + gstAmount;
    document.getElementById('saleGrandTotal').value = grand.toFixed(2);
    if (!saleFinalTotalIsManual) {
        document.getElementById('saleFinalTotal').value = computedFinalTotal.toFixed(2);
    }
}
function renderSaleDraft() {
    const table = document.getElementById('saleItemsTableBody');
    table.innerHTML = '';
    saleItemsDraft.forEach((item, index) => {
        table.innerHTML += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle font-medium text-gray-900">${ escapeHtml(item.product_name) }</td>
        <td class="px-4 py-3 align-middle text-right">${ item.boxes }</td>
        <td class="px-4 py-3 align-middle text-right">${ item.pieces }</td>
        <td class="px-4 py-3 align-middle text-center">${ escapeHtml(normalizeUnitType(item.unit_type) || 'Pcs') }</td>
        <td class="px-4 py-3 align-middle text-right">${ item.rate.toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right font-semibold">${ item.total.toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">
          <button onclick="removeSaleItem(${ index })" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Delete</button>
        </td>
      </tr>
    `;
    });
    recalculateSaleFinalTotal();
}
function addSaleItem() {
    const productId = Number(document.getElementById('saleProductId').value);
    const product = productCatalog.find(p => p.id === productId);
    const cases = Number(document.getElementById('saleBoxes').value) || 0;
    const qtyPerCase = Number(document.getElementById('salePieces').value) || 0;
    const unitType = normalizeUnitType(document.getElementById('saleUnitType').value);
    const rate = Number(document.getElementById('saleRate').value) || 0;
    if (!product || cases <= 0 || qtyPerCase <= 0 || !unitType || rate < 0) {
        window.alert('Enter valid sales item details.');
        return;
    }
    const duplicate = saleItemsDraft.find(item => item.product_id === product.id);
    if (duplicate) {
        window.alert('Duplicate product in the same invoice is not allowed.');
        return;
    }
    const manualLineTotal = Number(document.getElementById('saleLineTotal')?.value);
    const computedTotal = cases * qtyPerCase * rate;
    const total = Number.isFinite(manualLineTotal) && manualLineTotal > 0 ? manualLineTotal : computedTotal;
    saleItemsDraft.push({
        product_id: product.id,
        product_name: product.name,
        boxes: cases,
        pieces: qtyPerCase,
        unit_type: unitType,
        rate,
        total
    });
    renderSaleDraft();
    clearSaleLineForm();
}
function removeSaleItem(index) {
    saleItemsDraft.splice(index, 1);
    renderSaleDraft();
}
async function saveSaleInvoice() {
    const partyId = Number(document.getElementById('salePartyId')?.value || transactionFlowPartyId || 0);
    const godownRaw = Number(document.getElementById('saleGodownId')?.value || 0);
    const godownId = godownRaw > 0 ? godownRaw : null;
    const date = document.getElementById('saleDate').value;
    const billNo = String(document.getElementById('saleBillNo')?.value || '').trim();
    const billTime = normalizeTimeValue(document.getElementById('saleBillTime')?.value);
    const selectedParty = currentParties.find(item => Number(item.id) === partyId);
    const billNameInput = String(document.getElementById('saleBillName')?.value || '').trim();
    const billName = billNameInput || String(selectedParty?.name || '').trim();
    const partyAddress = String(document.getElementById('salePartyAddress')?.value ?? '').trim();
    const deliveryDate = document.getElementById('saleDeliveryDate').value;
    const vehicleNo = document.getElementById('saleVehicleNo').value.trim();
    const deliveryPlace = String(document.getElementById('saleDeliveryPlace')?.value || '').trim();
    const deliveryTime = normalizeTimeValue(document.getElementById('saleDeliveryTime')?.value);
    const deliveryFeedback = String(document.getElementById('saleDeliveryFeedback')?.value || '').trim();
    const deliveryDetails = [
        deliveryPlace,
        deliveryTime ? `Time: ${ deliveryTime }` : '',
        deliveryFeedback
    ].filter(Boolean).join(' | ');
    const saleType = 'cash';
    const finalTotalInput = Number(document.getElementById('saleFinalTotal')?.value);
    const discountRaw = Number(document.getElementById('saleDiscount').value) || 0;
    const deliveryRaw = Number(document.getElementById('saleDeliveryCharges').value) || 0;
    const commissionRaw = Number(document.getElementById('saleCommissionCharges').value) || 0;
    const discountMode = String(document.getElementById('saleDiscountMode')?.value || 'percent').trim();
    const packingMode = String(document.getElementById('salePackingMode')?.value || 'percent').trim();
    const discountAmount = discountMode === 'percent' ? saleItemsDraft.reduce((sum, item) => sum + item.total, 0) * discountRaw / 100 : discountRaw;
    const packingAmount = packingMode === 'percent' ? saleItemsDraft.reduce((sum, item) => sum + item.total, 0) * commissionRaw / 100 : commissionRaw;
    const discount = document.getElementById('saleUseDiscount').checked ? discountAmount : 0;
    const deliveryCharges = document.getElementById('saleUseTransport').checked ? deliveryRaw : 0;
    const commissionCharges = document.getElementById('saleUseCommission').checked ? packingAmount : 0;

    const useAgentCommission = Boolean(document.getElementById('saleUseAgentCommission')?.checked);
    const agentName = useAgentCommission ? String(document.getElementById('saleAgentName')?.value || '').trim() : '';
    const agentRaw = useAgentCommission ? (Number(document.getElementById('saleAgentCommission')?.value) || 0) : 0;
    const agentMode = String(document.getElementById('saleAgentCommissionMode')?.value || 'percent').trim();
    const agentCommission = useAgentCommission ? (agentMode === 'percent' ? saleItemsDraft.reduce((sum, item) => sum + item.total, 0) * agentRaw / 100 : agentRaw) : 0;

    const editingId = Number(document.getElementById('editingSaleId').value);
    if (!date || !billNo || !partyId || saleItemsDraft.length === 0) {
        window.alert('Date, bill no, customer and at least one sale item are required.');
        return;
    }
    if (!billTime) {
        window.alert('Bill time is required.');
        return;
    }
    if (discount < 0 || deliveryCharges < 0 || commissionCharges < 0 || agentCommission < 0) {
        window.alert('Discount, transportation and commission cannot be negative.');
        return;
    }
    const payload = {
        date,
        bill_no: billNo,
        party_id: partyId,
        godown_id: godownId,
        type: saleType,
        bill_name: billName,
        party_address: partyAddress,
        bill_time: billTime,
        delivery_date: deliveryDate,
        vehicle_no: vehicleNo,
        delivery_place: deliveryPlace,
        delivery_time: deliveryTime,
        delivery_feedback: deliveryFeedback,
        delivery_details: deliveryDetails,
        discount,
        delivery_charges: deliveryCharges,
        packing_charges: commissionCharges,
        agent_name: agentName,
        agent_commission: agentCommission,
        total: Number.isFinite(finalTotalInput) && finalTotalInput > 0 ? finalTotalInput : undefined,
        items: saleItemsDraft
    };
    const result = editingId ? await window.api.updateSale(editingId, payload) : await window.api.addSale(payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Failed to save sale invoice.');
        return;
    }
    resetSaleForm();
    await refreshSales();
    await refreshStock();
    await loadLedger();
    await refreshProfitLoss();
    showToast(editingId ? 'Invoice updated.' : 'Invoice saved.');
}
function renderSales(sales) {
    const table = document.getElementById('salesTableBody');
    table.innerHTML = '';
    const rows = Array.isArray(sales) ? sales : [];
    currentSalesRows = rows;
    rebuildSalesReturnReferenceOptions();
    if (rows.length === 0) {
        table.innerHTML = `
      <tr class="border-t">
        <td colspan="5" class="p-3 text-center text-gray-500">No sales bills available.</td>
      </tr>
    `;
        ensureSaleBillNoDefault();
        return;
    }
    let html = '';
    rows.forEach((sale, index) => {
        const billNo = getSaleBillNo(sale);
        const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        html += `
      <tr class="border-t ${ rowClass }">
        <td class="px-4 py-3 align-middle font-semibold text-gray-800">${ escapeHtml(billNo) }</td>
        <td class="px-4 py-3 align-middle text-gray-700">${ escapeHtml(formatDisplayDate(sale.date)) }</td>
        <td class="px-4 py-3 align-middle text-gray-700">${ escapeHtml(sale.party_name) }</td>
        <td class="px-4 py-3 align-middle text-right font-semibold text-gray-800">${ Number(sale.total).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">
          <div class="inline-flex items-center justify-center gap-2">
            <button onclick="viewSaleDetail(${ sale.id })" class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">View</button>
            <button onclick="shareSaleOnWhatsAppById(${ sale.id })" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Share</button>
            <button onclick="startEditSale(${ sale.id })" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Edit</button>
            <button onclick="removeSale(${ sale.id })" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Delete</button>
          </div>
        </td>
      </tr>
    `;
    });
    table.innerHTML = html;
    ensureSaleBillNoDefault();
}
function deriveSaleBillNo(row) {
    const direct = String(row?.bill_no || '').trim();
    if (direct) {
        return direct;
    }
    return String(row?.id || '').trim();
}
function getNextSaleBillNo() {
    let maxNumericBillNo = 0;
    currentSalesRows.forEach(row => {
        const billNo = deriveSaleBillNo(row);
        const value = Number(billNo);
        if (Number.isFinite(value) && value > maxNumericBillNo) {
            maxNumericBillNo = value;
        }
    });
    return String(maxNumericBillNo + 1);
}
function ensureSaleBillNoDefault() {
    const billNoInput = document.getElementById('saleBillNo');
    if (!billNoInput) {
        return;
    }
    const editingSaleId = Number(document.getElementById('editingSaleId')?.value || 0);
    if (editingSaleId > 0) {
        return;
    }
    if (!String(billNoInput.value || '').trim()) {
        billNoInput.value = getNextSaleBillNo();
    }
}
function getSaleBillNo(sale) {
    return deriveSaleBillNo(sale) || '-';
}
function buildSaleShareMessage(detail) {
    const party = currentParties.find(item => Number(item.id) === Number(detail?.party_id));
    const billNo = getSaleBillNo(detail);
    const lines = [
        `Estimated Bill #${ billNo }`,
        `Date: ${ formatDisplayDate(detail?.date || '-') }`,
        `Time: ${ formatTimeLabel(detail?.bill_time) }`,
        `Party: ${ party?.name || detail?.bill_name || '-' }`,
        `Address: ${ detail?.party_address || party?.address || '-' }`,
        `Delivery Vehicle: ${ detail?.vehicle_no || '-' }`,
        `Delivery Place: ${ detail?.delivery_place || '-' }`,
        `Delivery Date: ${ formatDisplayDate(detail?.delivery_date || '-') }`,
        `Delivery Time: ${ formatTimeLabel(detail?.delivery_time) }`,
        `Delivery Feedback: ${ detail?.delivery_feedback || detail?.delivery_details || '-' }`,
        ''
    ];
    const items = Array.isArray(detail?.items) ? detail.items : [];
    if (items.length > 0) {
        lines.push('Items:');
        items.forEach((item, index) => {
            lines.push(`${ index + 1 }. ${ item.product_name || '-' } | Cases: ${ Number(item.boxes || 0) } | Qty/Case: ${ Number(item.pieces || 0) } | Rate: ${ formatCurrency(item.rate) } | Amount: ${ formatCurrency(item.total) }`);
        });
        lines.push('');
    }
    const discount = Number(detail?.discount || 0);
    const transport = Number(detail?.delivery_charges || 0);
    const commission = Number(detail?.packing_charges || 0);
    if (discount > 0) {
        lines.push(`Discount: ${ formatCurrency(discount) }`);
    }
    if (transport > 0) {
        lines.push(`Transportation: ${ formatCurrency(transport) }`);
    }
    if (commission > 0) {
        lines.push(`Commission: ${ formatCurrency(commission) }`);
    }
    lines.push(`Grand Total: ${ formatCurrency(detail?.total || 0) }`);
    return lines.join('\n');
}
async function shareSaleOnWhatsApp(detail) {
    if (!detail) {
        window.alert('Invoice not available for share.');
        return;
    }
    const party = currentParties.find(item => Number(item.id) === Number(detail.party_id));
    const message = buildSaleShareMessage(detail);
    const result = await window.api.shareWhatsApp({
        phone: String(party?.phone || '').trim(),
        message
    });
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to open WhatsApp share.');
        return;
    }
    showToast('Opening WhatsApp share...');
}
async function shareSaleOnWhatsAppById(id) {
    const detail = await window.api.getSaleDetails(id);
    if (!detail) {
        window.alert('Unable to load invoice for share.');
        return;
    }
    await shareSaleOnWhatsApp(detail);
}
async function shareSelectedSaleOnWhatsApp() {
    if (!selectedSaleDetail) {
        window.alert('Open an invoice detail first.');
        return;
    }
    await shareSaleOnWhatsApp(selectedSaleDetail);
}
function renderSaleDetailCard(detail) {
    document.getElementById('saleDetailId').textContent = getSaleBillNo(detail);
    document.getElementById('saleDetailDate').textContent = formatDisplayDate(detail.date);
    const detailTime = document.getElementById('saleDetailTime');
    if (detailTime) {
        detailTime.textContent = formatTimeLabel(detail.bill_time);
    }
    const party = currentParties.find(p => p.id === detail.party_id);
    document.getElementById('saleDetailParty').textContent = party ? party.name : '-';
    document.getElementById('saleDetailType').textContent = formatSaleTypeLabel(detail.type);
    const detailDeliveryDate = document.getElementById('saleDetailDeliveryDate');
    if (detailDeliveryDate) {
        detailDeliveryDate.textContent = formatDisplayDate(detail.delivery_date || '-');
    }
    const detailVehicle = document.getElementById('saleDetailVehicle');
    if (detailVehicle) {
        detailVehicle.textContent = detail.vehicle_no || '-';
    }
    const detailDeliveryPlace = document.getElementById('saleDetailDeliveryPlace');
    if (detailDeliveryPlace) {
        detailDeliveryPlace.textContent = detail.delivery_place || '-';
    }
    const detailDeliveryTime = document.getElementById('saleDetailDeliveryTime');
    if (detailDeliveryTime) {
        detailDeliveryTime.textContent = formatTimeLabel(detail.delivery_time);
    }
    const detailDeliveryFeedback = document.getElementById('saleDetailDeliveryFeedback');
    if (detailDeliveryFeedback) {
        detailDeliveryFeedback.textContent = detail.delivery_feedback || detail.delivery_details || '-';
    }
    const detailAddress = document.getElementById('saleDetailAddress');
    if (detailAddress) {
        detailAddress.textContent = detail.party_address || (party?.address || '-') || '-';
    }
    const body = document.getElementById('saleDetailItemsBody');
    body.innerHTML = '';
    (detail.items || []).forEach(item => {
        body.innerHTML += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle flex items-center justify-center gap-2">${ escapeHtml(item.product_name) }</td>
        <td class="px-4 py-3 align-middle">${ item.boxes }</td>
        <td class="px-4 py-3 align-middle">${ item.pieces }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(normalizeUnitType(item.unit_type) || 'Pcs') }</td>
        <td class="px-4 py-3 align-middle text-right">${ formatCurrency(item.rate) }</td>
        <td class="px-4 py-3 align-middle text-right">${ formatCurrency(item.total) }</td>
      </tr>
    `;
    });
    document.getElementById('saleDetailTotal').textContent = formatCurrency(detail.total);
    const detailExtra = document.getElementById('saleDetailExtra');
    if (detailExtra) {
        const tags = [];
        if (Number(detail.discount || 0) > 0) {
            tags.push(`Discount: ${ formatCurrency(detail.discount || 0) }`);
        }
        if (Number(detail.delivery_charges || 0) > 0) {
            tags.push(`Transportation: ${ formatCurrency(detail.delivery_charges || 0) }`);
        }
        if (Number(detail.packing_charges || 0) > 0) {
            tags.push(`Commission: ${ formatCurrency(detail.packing_charges || 0) }`);
        }
        tags.push(`Final: ${ formatCurrency(detail.total) }`);
        detailExtra.textContent = tags.join(' | ');
    }
    document.getElementById('saleDetailCard').classList.remove('hidden');
}
async function viewSaleDetail(id) {
    const detail = await window.api.getSaleDetails(id);
    if (!detail) {
        window.alert('Unable to load invoice detail.');
        return;
    }
    selectedSaleDetail = detail;
    renderSaleDetailCard(detail);
}
function closeSaleDetail() {
    document.getElementById('saleDetailCard').classList.add('hidden');
    selectedSaleDetail = null;
}
function printSaleDetail() {
    printSaleDetailInternal();
}
function buildSaleDetailHtml(detail, settings, party) {
    const shopName = String(settings?.shop_name || 'Billing Software').trim();
    const shopLogo = String(settings?.logo || '').trim();
    const shopAddress = String(settings?.address || '').trim();
    const shopPhone = String(settings?.phone || '').trim();
    const shopGst = String(settings?.gst || '').trim();
    const shopEmail = String(settings?.email || '').trim();
    const billToName = String(detail?.bill_name || (party ? party.name : '-') || '-');
    const billToAddress = String(detail?.party_address || (party ? party.address : '') || '').trim();
    const billDate = formatDisplayDate(detail?.date || '-');
    const billTime = formatTimeLabel(detail?.bill_time);
    const deliveryDate = formatDisplayDate(String(detail?.delivery_date || '').trim());
    const deliveryTime = formatTimeLabel(detail?.delivery_time);
    const deliveryPlace = String(detail?.delivery_place || '').trim();
    const deliveryFeedback = String(detail?.delivery_feedback || detail?.delivery_details || '').trim();
    const vehicleNo = String(detail?.vehicle_no || '').trim();
    const billNo = getSaleBillNo(detail);
    const rows = (detail?.items || []).map((item, index) => `
    <tr>
      <td class="px-4 py-3 align-middle text-center">${ index + 1 }</td>
      <td>${ escapeHtml(item.product_name) }</td>
      <td class="px-4 py-3 align-middle text-center">${ Number(item.boxes || 0) }</td>
      <td class="px-4 py-3 align-middle text-center">${ Number(item.pieces || 0) }</td>
      <td class="px-4 py-3 align-middle text-center">${ escapeHtml(normalizeUnitType(item.unit_type) || 'Pcs') }</td>
      <td class="px-4 py-3 align-middle text-right">${ formatCurrency(item.rate) }</td>
      <td class="px-4 py-3 align-middle text-right">${ formatCurrency(item.total) }</td>
    </tr>
  `).join('');
    const subtotalValue = (detail?.items || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const discountValue = Number(detail?.discount || 0);
    const transportValue = Number(detail?.delivery_charges || 0);
    const commissionValue = Number(detail?.packing_charges || 0);
    return `
    <html>
      <head>
        <title>Estimated Bill #${ billNo }</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; margin: 0; background: #fff; }
          .sheet {
            width: 100%;
            min-height: calc(297mm - 20mm);
            border: 2px solid #111827;
            padding: 10px;
          }
          .header {
            display: grid;
            grid-template-columns: 120px 1fr 210px;
            gap: 10px;
            align-items: stretch;
          }
          .logo-box {
            border: 1px solid #1f2937;
            min-height: 90px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #f8fafc;
          }
          .logo-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .title-box {
            border: 1px solid #1f2937;
            padding: 8px;
            text-align: center;
          }
          .shop-name {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.3px;
            margin-bottom: 4px;
          }
          .doc-type {
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .strict-note {
            font-size: 13px;
            font-weight: 700;
            color: #991b1b;
            text-transform: uppercase;
            border-top: 1px dashed #9ca3af;
            padding-top: 4px;
          }
          .shop-meta {
            font-size: 11px;
            color: #374151;
            margin-top: 6px;
            line-height: 1.4;
            white-space: pre-line;
          }
          .meta-box {
            border: 1px solid #1f2937;
            padding: 8px;
            display: grid;
            grid-template-columns: 1fr;
            gap: 6px;
            font-size: 12px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            border-bottom: 1px dashed #d1d5db;
            padding-bottom: 3px;
          }
          .meta-row:last-child {
            border-bottom: 0;
            padding-bottom: 0;
          }
          .meta-label {
            font-weight: 700;
            color: #1f2937;
          }
          .meta-value {
            font-weight: 700;
          }
          .details-grid {
            margin-top: 10px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .field {
            border: 1px solid #1f2937;
            padding: 6px;
            min-height: 42px;
          }
          .field-label {
            display: block;
            font-size: 11px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 3px;
            text-transform: uppercase;
          }
          .field-value {
            font-size: 12px;
            white-space: pre-line;
          }
          .full-width { grid-column: 1 / -1; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th, td { border: 1px solid #1f2937; padding: 6px; font-size: 12px; }
          th { background: #e5e7eb; text-align: left; font-weight: 700; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .totals-wrap { margin-top: 10px; display: flex; justify-content: flex-end; }
          .totals { width: 340px; border: 1px solid #1f2937; }
          .totals-row { display: flex; justify-content: space-between; border-bottom: 1px solid #d1d5db; padding: 6px 8px; font-size: 12px; }
          .totals-row:last-child { border-bottom: 0; font-weight: 700; }
          .footer-note {
            margin-top: 16px;
            display: flex;
            justify-content: space-between;
            align-items: end;
            font-size: 12px;
          }
          .footer-estimated {
            font-weight: 700;
            color: #991b1b;
            text-transform: uppercase;
          }
          .sign {
            text-align: right;
            min-width: 180px;
          }
          .sign-line {
            border-top: 1px solid #1f2937;
            margin-top: 18px;
            padding-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div class="logo-box">
              ${ shopLogo ? `<img src="${ escapeHtml(shopLogo) }" alt="Shop Logo">` : '<span>LOGO</span>' }
            </div>

            <div class="title-box">
              <div class="shop-name">${ escapeHtml(shopName || 'Billing Software') }</div>
              <div class="doc-type">Estimated Sales Invoice</div>
              <div class="strict-note">Estimated Bill Strictly</div>
              <div class="shop-meta">${ escapeHtml([
        shopAddress,
        shopPhone ? `Phone: ${ shopPhone }` : '',
        shopGst ? `GST: ${ shopGst }` : '',
        shopEmail ? `Email: ${ shopEmail }` : ''
    ].filter(Boolean).join('\n')) }</div>
            </div>

            <div class="meta-box">
              <div class="meta-row"><span class="meta-label">Bill No</span><span class="meta-value">${ escapeHtml(String(billNo || '-')) }</span></div>
              <div class="meta-row"><span class="meta-label">Date</span><span class="meta-value">${ escapeHtml(billDate) }</span></div>
              <div class="meta-row"><span class="meta-label">Time</span><span class="meta-value">${ escapeHtml(billTime) }</span></div>
            </div>
          </div>

          <div class="details-grid">
            <div class="field">
              <span class="field-label">Party</span>
              <div class="field-value">${ escapeHtml(billToName) }</div>
            </div>
            <div class="field full-width">
              <span class="field-label">Address</span>
              <div class="field-value">${ escapeHtml(billToAddress || '-') }</div>
            </div>

            <div class="field">
              <span class="field-label">Delivery Vehicle</span>
              <div class="field-value">${ escapeHtml(vehicleNo || '-') }</div>
            </div>
            <div class="field">
              <span class="field-label">Delivery Place</span>
              <div class="field-value">${ escapeHtml(deliveryPlace || '-') }</div>
            </div>
            <div class="field">
              <span class="field-label">Delivery Date</span>
              <div class="field-value">${ escapeHtml(deliveryDate || '-') }</div>
            </div>
            <div class="field">
              <span class="field-label">Delivery Time</span>
              <div class="field-value">${ escapeHtml(deliveryTime) }</div>
            </div>
            <div class="field full-width">
              <span class="field-label">Delivery Feedback</span>
              <div class="field-value">${ escapeHtml(deliveryFeedback || '-') }</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 50px;">S.No</th>
                <th>Products</th>
                <th class="text-center" style="width: 90px;">No of C/S</th>
                <th class="text-center" style="width: 90px;">No of Pcs</th>
                <th class="text-center" style="width: 80px;">Type</th>
                <th class="text-right" style="width: 90px;">Rate</th>
                <th class="text-right" style="width: 110px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${ rows || '<tr><td colspan="7" class="text-center">No items</td></tr>' }
            </tbody>
          </table>

          <div class="totals-wrap">
            <div class="totals">
              <div class="totals-row"><span>Sub Total</span><span>${ formatCurrency(subtotalValue) }</span></div>
              ${ discountValue > 0 ? `<div class="totals-row"><span>Discount</span><span>${ formatCurrency(discountValue) }</span></div>` : '' }
              ${ transportValue > 0 ? `<div class="totals-row"><span>Transportation</span><span>${ formatCurrency(transportValue) }</span></div>` : '' }
              ${ commissionValue > 0 ? `<div class="totals-row"><span>Commission</span><span>${ formatCurrency(commissionValue) }</span></div>` : '' }
              <div class="totals-row"><span>Grand Total</span><span>${ formatCurrency(detail?.total) }</span></div>
            </div>
          </div>

          <div class="footer-note">
            <div class="footer-estimated">Estimated Bill Strictly</div>
            <div class="sign">
              <div class="sign-line">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
async function printSaleDetailInternal() {
    if (!selectedSaleDetail) {
        window.alert('Open an invoice detail first.');
        return;
    }
    const settings = await window.api.getSettings();
    const party = currentParties.find(p => p.id === selectedSaleDetail.party_id);
    const html = buildSaleDetailHtml(selectedSaleDetail, settings, party);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}
async function downloadSaleDetailPdf() {
    if (!selectedSaleDetail) {
        window.alert('Open an invoice detail first.');
        return;
    }
    const settings = await window.api.getSettings();
    const party = currentParties.find(p => p.id === selectedSaleDetail.party_id);
    const billNo = getSaleBillNo(selectedSaleDetail);
    const html = buildSaleDetailHtml(selectedSaleDetail, settings, party);
    const defaultFileName = `estimated-bill-${ String(billNo || 'invoice').replace(/\s+/g, '-').toLowerCase() }.pdf`;
    const result = await withLoading(() => window.api.savePdf({
        html,
        defaultFileName
    }));
    if (!result || !result.success) {
        if (result?.canceled) {
            return;
        }
        window.alert(result?.message || 'Unable to download invoice PDF.');
        return;
    }
    showToast('Invoice PDF downloaded.');
}
function renderPurchaseRates(rows) {
    currentPurchaseRates = rows;
    const body = document.getElementById('rateTableBody');
    body.innerHTML = '';
    const latestByProduct = new Map();
    rows.forEach(row => {
        const key = String(row.product_name || '').toLowerCase();
        if (!latestByProduct.has(key)) {
            latestByProduct.set(key, row.id);
        }
    });
    let html = '';
    rows.forEach(row => {
        const isLatest = latestByProduct.get(String(row.product_name || '').toLowerCase()) === row.id;
        const commission = Number(row.agent_commission || 0);
        html += `
      <tr class="border-t ${ isLatest ? 'bg-amber-50' : '' }">
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">${ escapeHtml(formatDisplayDate(row.date || '-')) }</td>
        <td class="px-4 py-3 align-middle text-left whitespace-nowrap">${ escapeHtml(row.product_name) }</td>
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">${ escapeHtml(row.unit_type || 'Pcs') }</td>
        <td class="px-4 py-3 align-middle text-right whitespace-nowrap">${ formatCurrency(row.rate) } ${ isLatest ? '<span class="text-xs text-amber-700 block">(Latest)</span>' : '' }</td>
        <td class="px-4 py-3 align-middle text-right whitespace-nowrap">${ formatCurrency(row.discount_percent || 0) }</td>
        <td class="px-4 py-3 align-middle text-right whitespace-nowrap">${ formatCurrency(row.transport_charge || 0) }</td>
        <td class="px-4 py-3 align-middle text-right whitespace-nowrap">${ formatCurrency(commission) }</td>
        <td class="px-4 py-3 align-middle text-right whitespace-nowrap">${ formatCurrency(row.packing_charge || 0) }</td>
        <td class="px-4 py-3 align-middle text-left min-w-[150px] break-words whitespace-normal">${ escapeHtml(row.party_name || '-') }</td>
        <td class="px-4 py-3 align-middle text-right whitespace-nowrap">${ formatCurrency(row.selling_rate || row.rate) }</td>
        <td class="px-4 py-3 align-middle text-center w-32 whitespace-nowrap flex items-center justify-center gap-2">
          <button onclick="editPurchaseRate(${ row.id })" class="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded  transition text-xs font-medium">Edit</button>
          <button onclick="removePurchaseRate(${ row.id })" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition text-xs font-medium">Delete</button>
        </td>
      </tr>
    `;
    });
    body.innerHTML = html;
}
async function refreshPurchaseRates() {
    const queryEl = document.getElementById('rateSearchQuery');
    const query = queryEl ? queryEl.value.trim() : '';
    const rows = await window.api.getPurchaseRates(query);
    renderPurchaseRates(rows || []);
}
async function editPurchaseRate(id) {
    const row = currentPurchaseRates.find(item => item.id === id);
    if (!row) {
        return;
    }
    const values = await openEditorDialog('Edit Purchase Rate', [
        {
            key: 'rate',
            label: 'Rate',
            type: 'number',
            step: '0.01',
            min: 0,
            value: row.rate
        },
        {
            key: 'discount_percent',
            label: 'Discount',
            type: 'number',
            step: '0.01',
            min: 0,
            value: row.discount_percent || 0
        },
        {
            key: 'discount_mode',
            label: 'Discount Type',
            type: 'select',
            value: 'percent',
            options: [
                'percent',
                'amount'
            ]
        },
        {
            key: 'unit_type',
            label: 'Quantity Type',
            type: 'select',
            value: normalizeUnitType(row.unit_type) || 'Pcs',
            options: [
                'Pcs',
                'Box',
                'Unit',
                'Pkt'
            ]
        },
        {
            key: 'selling_rate',
            label: 'Selling Rate',
            type: 'number',
            step: '0.01',
            min: 0,
            value: row.selling_rate || row.rate
        },
        {
            key: 'packing_charge',
            label: 'Packing Charge',
            type: 'number',
            step: '0.01',
            min: 0,
            value: row.packing_charge || 0
        },
        {
            key: 'transport_charge',
            label: 'Transport Charge',
            type: 'number',
            step: '0.01',
            min: 0,
            value: row.transport_charge || 0
        },
        {
            key: 'agent_commission',
            label: 'Agent Commission',
            type: 'number',
            step: '0.01',
            min: 0,
            value: row.agent_commission || 0
        },
        {
            key: 'agent_name',
            label: 'Agent Name',
            type: 'text',
            value: row.agent_name || ''
        }
    ]);
    if (!values) {
        return;
    }
    const result = await window.api.updatePurchaseRate(id, {
        rate: Number(values.rate),
        discount_percent: Number(values.discount_percent),
        discount_mode: String(values.discount_mode || 'percent').trim(),
        unit_type: String(values.unit_type || '').trim(),
        selling_rate: Number(values.selling_rate),
        packing_charge: Number(values.packing_charge),
        transport_charge: Number(values.transport_charge),
        agent_commission: Number(values.agent_commission),
        agent_name: String(values.agent_name || '').trim()
    });
    if (!result || !result.success) {
        window.alert(result?.message || 'Failed to update rate.');
        return;
    }
    await refreshPurchaseRates();
    await refreshPurchases();
    await refreshProductCatalog();
    await refreshStock();
    await loadLedger();
}
async function removePurchaseRate(id) {
    const result = await window.api.deletePurchaseRate(id);
    if (!result || !result.success) {
        window.alert(result?.message || 'Failed to delete rate entry.');
        return;
    }
    await refreshPurchaseRates();
    await refreshPurchases();
    await refreshProductCatalog();
    await refreshStock();
    await loadLedger();
}
function applyProfileSettings(settings) {
    currentSettings = settings || {};
    const effectiveName = currentSettings.shop_name || 'Billing Software';
    document.getElementById('profShopName').value = currentSettings.shop_name || '';
    document.getElementById('profLogo').value = currentSettings.logo || '';
    document.getElementById('profAddress').value = currentSettings.address || '';
    document.getElementById('profPhone').value = currentSettings.phone || '';
    document.getElementById('profGst').value = currentSettings.gst || '';
    document.getElementById('profEmail').value = currentSettings.email || '';
    const appTitle = document.getElementById('appTitle');
    const sidebarProfileName = document.getElementById('sidebarProfileName');
    if (appTitle) {
        appTitle.textContent = effectiveName;
    }
    if (sidebarProfileName) {
        sidebarProfileName.textContent = effectiveName;
    }
    const logoPreview = document.getElementById('profileLogoPreview');
    if (logoPreview) {
        const logo = String(currentSettings.logo || '').trim();
        if (logo) {
            logoPreview.src = logo;
            logoPreview.classList.remove('hidden');
        } else {
            logoPreview.removeAttribute('src');
            logoPreview.classList.add('hidden');
        }
    }
    document.title = effectiveName;
}
function onProfileLogoFileChange() {
    const input = document.getElementById('profLogoFile');
    if (!input || !input.files || input.files.length === 0) {
        return;
    }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        const value = String(reader.result || '');
        if (!value) {
            return;
        }
        document.getElementById('profLogo').value = value;
        const preview = document.getElementById('profileLogoPreview');
        if (preview) {
            preview.src = value;
            preview.classList.remove('hidden');
        }
    };
    reader.readAsDataURL(file);
}
async function loadProfileSettings() {
    const settings = await window.api.getSettings();
    applyProfileSettings(settings || {});
}
async function saveProfileSettings() {
    const payload = {
        shop_name: document.getElementById('profShopName').value.trim(),
        logo: document.getElementById('profLogo').value.trim(),
        address: document.getElementById('profAddress').value.trim(),
        phone: document.getElementById('profPhone').value.trim(),
        gst: document.getElementById('profGst').value.trim(),
        email: document.getElementById('profEmail').value.trim()
    };
    const result = await window.api.saveSettings(payload);
    if (!result || !result.success) {
        window.alert('Unable to save profile settings.');
        return;
    }
    applyProfileSettings(result.settings || payload);
    showToast('Profile saved successfully.');
}
async function createBackup() {
    const result = await withLoading(() => window.api.createBackup());
    if (!result || !result.success) {
        window.alert(result?.message || 'Backup failed.');
        return;
    }
    showToast(result.message || 'Backup created.');
}
async function restoreBackup() {
    if (!window.confirm('This will overwrite current data. Continue restore?')) { return; }

    
    const result = await withLoading(() => window.api.restoreBackup());
    if (!result || !result.success) {
        window.alert(result?.message || 'Restore failed.');
    }
}
async function exportLedgerCsv() {
    const result = await withLoading(() => window.api.exportLedgerCsv());
    if (!result || !result.success) {
        window.alert(result?.message || 'Ledger export failed.');
        return;
    }
    showToast(result.message || 'Ledger exported.');
}
async function exportSalesCsv() {
    const result = await withLoading(() => window.api.exportSalesCsv());
    if (!result || !result.success) {
        window.alert(result?.message || 'Sales export failed.');
        return;
    }
    showToast(result.message || 'Sales exported.');
}
async function exportPurchasesCsv() {
    const result = await withLoading(() => window.api.exportPurchasesCsv());
    if (!result || !result.success) {
        window.alert(result?.message || 'Purchase export failed.');
        return;
    }
    showToast(result.message || 'Purchase exported.');
}
async function importPartiesCsv() {
    const result = await withLoading(() => window.api.importPartiesCsv());
    if (!result || !result.success) {
        window.alert(result?.message || 'Import failed.');
        return;
    }
    await refreshPartyData();
    showToast(result.message || 'Parties imported.');
}
async function startEditSale(id) {
    showView('transaction');
    setTransactionFlowStage('entry');
    setTransactionType('sale', false);
    const details = await window.api.getSaleDetails(id);
    if (!details) {
        window.alert('Sale not found.');
        return;
    }
    document.getElementById('saleDate').value = details.date;
    const saleBillNoEl = document.getElementById('saleBillNo');
    if (saleBillNoEl) {
        saleBillNoEl.value = deriveSaleBillNo(details) || String(details.id || '');
    }
    document.getElementById('saleBillTime').value = normalizeTimeValue(details.bill_time) || getCurrentTimeValue();
    document.getElementById('salePartyId').value = String(details.party_id);
    document.getElementById('saleGodownId').value = String(details.godown_id || '');
    document.getElementById('saleBillName').value = details.bill_name || '';
    document.getElementById('salePartyAddress').value = details.party_address || '';
    document.getElementById('saleDeliveryDate').value = details.delivery_date || details.date || '';
    document.getElementById('saleVehicleNo').value = details.vehicle_no || '';
    document.getElementById('saleDeliveryPlace').value = details.delivery_place || '';
    document.getElementById('saleDeliveryTime').value = normalizeTimeValue(details.delivery_time) || '';
    document.getElementById('saleDeliveryFeedback').value = details.delivery_feedback || details.delivery_details || '';
    document.getElementById('saleType').value = normalizeSaleTypeForForm(details.type);
    document.getElementById('saleUseDiscount').checked = Number(details.discount || 0) > 0;
    document.getElementById('saleUseTransport').checked = Number(details.delivery_charges || 0) > 0;
    document.getElementById('saleUseCommission').checked = Number(details.packing_charges || 0) > 0;
    document.getElementById('saleDiscount').value = String(Number(details.discount) || 0);
    document.getElementById('saleDiscountMode').value = details.discount_mode || 'percent';
    const useAgent = Number(details.agent_commission || 0) > 0 || Boolean(String(details.agent_name || '').trim());
    document.getElementById('saleUseAgentCommission').checked = useAgent;
    if (document.getElementById('saleAgentName')) {
        document.getElementById('saleAgentName').value = details.agent_name || '';
    }
    document.getElementById('saleAgentCommission').value = String(Number(details.agent_commission) || 0);
    document.getElementById('saleAgentCommissionMode').value = details.agent_commission_mode || 'percent';
    toggleAgentCommissionFields();
    saleItemsDraft = (details.items || []).map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        boxes: Number(item.boxes) || 0,
        pieces: Number(item.pieces) || 0,
        unit_type: normalizeUnitType(item.unit_type) || 'Pcs',
        rate: Number(item.rate) || 0,
        total: Number(item.total) || 0
    }));
    if (saleItemsDraft.length > 0) {
        document.getElementById('saleUnitType').value = saleItemsDraft[0].unit_type || 'Pcs';
    }
    renderSaleDraft();
    setSaleEditMode(id);
}
function cancelSaleEdit() {
    resetSaleForm();
}
async function removeSale(id) {
    const result = await window.api.deleteSale(id);
    if (!result || !result.success) {
        window.alert(result?.message || 'Failed to delete sale.');
        return;
    }
    resetSaleForm();
    await refreshSales();
    await refreshStock();
    await loadLedger();
    await refreshProfitLoss();
}
async function refreshSales() {
    const sales = await window.api.getSales();
    renderSales(sales);
}
function uniqueRowsById(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
        const id = Number(row.id);
        if (!id || map.has(id)) {
            return;
        }
        map.set(id, row);
    });
    return Array.from(map.values());
}
function renderPurchaseReturnItemsDraft() {
    const body = document.getElementById('purchaseReturnItemsBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';
    if (purchaseReturnItemsDraft.length === 0) {
        body.innerHTML = `
      <tr>
        <td colspan="6" class="p-3 text-center text-gray-500 flex items-center justify-center gap-2">Select a purchase bill to auto-fill return items.</td>
      </tr>
    `;
        return;
    }
    purchaseReturnItemsDraft.forEach(item => {
        body.innerHTML += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle">${ escapeHtml(item.product_name || '-') }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(item.boxes || 0) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(item.pieces || 0) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(item.unit_type || 'Pcs') }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(item.rate || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(item.total || 0).toFixed(2) }</td>
      </tr>
    `;
    });
}
function renderSalesReturnItemsDraft() {
    const body = document.getElementById('salesReturnItemsBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';
    if (salesReturnItemsDraft.length === 0) {
        body.innerHTML = `
      <tr>
        <td colspan="6" class="p-3 text-center text-gray-500">Select a sales bill to auto-fill return items.</td>
      </tr>
    `;
        return;
    }
    salesReturnItemsDraft.forEach(item => {
        body.innerHTML += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle">${ escapeHtml(item.product_name || '-') }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(item.boxes || 0) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(item.pieces || 0) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(item.unit_type || 'Pcs') }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(item.rate || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(item.total || 0).toFixed(2) }</td>
      </tr>
    `;
    });
}
function rebuildPurchaseReturnReferenceOptions() {
    const select = document.getElementById('purchaseReturnReferenceId');
    if (!select) {
        return;
    }
    const uniquePurchases = uniqueRowsById(allPurchaseRows).filter(row => !transactionFlowPartyId || Number(row.party_id) === Number(transactionFlowPartyId));
    select.innerHTML = '<option value="">Select Purchase Bill</option>';
    uniquePurchases.forEach(row => {
        const billNo = derivePurchaseBillNo(row);
        const party = String(row.party_name || '-').trim() || '-';
        select.innerHTML += `<option value="${ Number(row.id) }">${ escapeHtml(billNo) } - ${ escapeHtml(party) }</option>`;
    });
}
function rebuildSalesReturnReferenceOptions() {
    const select = document.getElementById('salesReturnReferenceId');
    if (!select) {
        return;
    }
    const uniqueSales = uniqueRowsById(currentSalesRows).filter(row => !transactionFlowPartyId || Number(row.party_id) === Number(transactionFlowPartyId));
    select.innerHTML = '<option value="">Select Sales Bill</option>';
    uniqueSales.forEach(row => {
        const billNo = deriveSaleBillNo(row);
        const party = String(row.party_name || '-').trim() || '-';
        select.innerHTML += `<option value="${ Number(row.id) }">${ escapeHtml(billNo) } - ${ escapeHtml(party) }</option>`;
    });
}
function getNextPurchaseReturnBillNo() {
    let maxBillNo = 0;
    currentPurchaseReturnRows.forEach(row => {
        const value = Number(String(row.bill_no || row.id || '').trim());
        if (Number.isFinite(value) && value > maxBillNo) {
            maxBillNo = value;
        }
    });
    return String(maxBillNo + 1);
}
function getNextSalesReturnBillNo() {
    let maxBillNo = 0;
    currentSalesReturnRows.forEach(row => {
        const value = Number(String(row.bill_no || row.id || '').trim());
        if (Number.isFinite(value) && value > maxBillNo) {
            maxBillNo = value;
        }
    });
    return String(maxBillNo + 1);
}
let editingPurchaseReturnId = null;
let editingSalesReturnId = null;

function resetPurchaseReturnForm() {
    editingPurchaseReturnId = null;
    currentPurchaseReturnReference = null;
    purchaseReturnItemsDraft = [];
    const dateEl = document.getElementById('purchaseReturnDate');
    const modeEl = document.getElementById('purchaseReturnMode');
    const billNoEl = document.getElementById('purchaseReturnBillNo');
    const refEl = document.getElementById('purchaseReturnReferenceId');
    const notesEl = document.getElementById('purchaseReturnNotes');
    if (dateEl) {
        dateEl.value = new Date().toISOString().slice(0, 10);
    }
    if (modeEl) {
        modeEl.value = 'Credit';
    }
    if (billNoEl) {
        billNoEl.value = getNextPurchaseReturnBillNo();
    }
    if (refEl) {
        refEl.value = '';
    }
    if (notesEl) {
        notesEl.value = '';
    }
    const submitBtn = document.getElementById('purchaseReturnSubmitBtn');
    if (submitBtn) {
        submitBtn.textContent = 'Save Purchase Return';
    }
    renderPurchaseReturnItemsDraft();
}
function resetSalesReturnForm() {
    editingSalesReturnId = null;
    currentSalesReturnReference = null;
    salesReturnItemsDraft = [];
    const dateEl = document.getElementById('salesReturnDate');
    const modeEl = document.getElementById('salesReturnMode');
    const billNoEl = document.getElementById('salesReturnBillNo');
    const refEl = document.getElementById('salesReturnReferenceId');
    const notesEl = document.getElementById('salesReturnNotes');
    if (dateEl) {
        dateEl.value = new Date().toISOString().slice(0, 10);
    }
    if (modeEl) {
        modeEl.value = 'Credit';
    }
    if (billNoEl) {
        billNoEl.value = getNextSalesReturnBillNo();
    }
    if (refEl) {
        refEl.value = '';
    }
    if (notesEl) {
        notesEl.value = '';
    }
    const submitBtn = document.getElementById('salesReturnSubmitBtn');
    if (submitBtn) {
        submitBtn.textContent = 'Save Sales Return';
    }
    renderSalesReturnItemsDraft();
}
async function onPurchaseReturnReferenceChange() {
    const id = Number(document.getElementById('purchaseReturnReferenceId')?.value || 0);
    if (!id) {
        currentPurchaseReturnReference = null;
        purchaseReturnItemsDraft = [];
        renderPurchaseReturnItemsDraft();
        return;
    }
    const details = await window.api.getPurchaseDetails(id);
    if (!details || !Array.isArray(details.items) || details.items.length === 0) {
        window.alert('Unable to load selected purchase details.');
        return;
    }
    currentPurchaseReturnReference = details;
    purchaseReturnItemsDraft = details.items.map(item => ({
        product_id: Number(item.product_id) || Number(productCatalog.find(p => String(p.name || '').toLowerCase() === String(item.product_name || '').toLowerCase())?.id || 0),
        product_name: item.product_name,
        boxes: Number(item.boxes) || 0,
        pieces: Number(item.pieces) || 0,
        unit_type: normalizeUnitType(item.unit_type) || 'Pcs',
        rate: Number(item.rate) || 0,
        total: Number(item.total) || 0
    })).filter(item => item.product_id > 0);
    document.getElementById('purchaseReturnMode').value = String(details.delivery_type || '').trim().toLowerCase() === 'cash' ? 'Cash' : 'Credit';
    renderPurchaseReturnItemsDraft();
}
async function onSalesReturnReferenceChange() {
    const id = Number(document.getElementById('salesReturnReferenceId')?.value || 0);
    if (!id) {
        currentSalesReturnReference = null;
        salesReturnItemsDraft = [];
        renderSalesReturnItemsDraft();
        return;
    }
    const details = await window.api.getSaleDetails(id);
    if (!details || !Array.isArray(details.items) || details.items.length === 0) {
        window.alert('Unable to load selected sales details.');
        return;
    }
    currentSalesReturnReference = details;
    salesReturnItemsDraft = details.items.map(item => ({
        product_id: Number(item.product_id),
        product_name: item.product_name,
        boxes: Number(item.boxes) || 0,
        pieces: Number(item.pieces) || 0,
        unit_type: normalizeUnitType(item.unit_type) || 'Pcs',
        rate: Number(item.rate) || 0,
        total: Number(item.total) || 0
    })).filter(item => item.product_id > 0);
    document.getElementById('salesReturnMode').value = String(details.type || '').trim().toLowerCase() === 'cash' ? 'Cash' : 'Credit';
    renderSalesReturnItemsDraft();
}
function renderPurchaseReturns(rows) {
    currentPurchaseReturnRows = Array.isArray(rows) ? rows : [];
    const body = document.getElementById('purchaseReturnTableBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';
    if (currentPurchaseReturnRows.length === 0) {
        body.innerHTML = `
      <tr>
        <td colspan="5" class="p-3 text-center text-gray-500">No purchase returns found.</td>
      </tr>
    `;
        return;
    }
    currentPurchaseReturnRows.forEach(row => {
        body.innerHTML += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle">${ escapeHtml(String(row.bill_no || row.id || '-')) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(formatDisplayDate(row.date || '-')) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(row.party_name || '-') }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(row.total || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle whitespace-nowrap">
          <div class="inline-flex items-center gap-1.5">
            <button onclick="startEditPurchaseReturn(${ Number(row.id) })" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-2.5 py-1 rounded text-xs shadow-sm">Edit</button>
            <button onclick="removePurchaseReturn(${ Number(row.id) })" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-2.5 py-1 rounded text-xs shadow-sm">Delete</button>
          </div>
        </td>
      </tr>
    `;
    });
}
function renderSalesReturns(rows) {
    currentSalesReturnRows = Array.isArray(rows) ? rows : [];
    const body = document.getElementById('salesReturnTableBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';
    if (currentSalesReturnRows.length === 0) {
        body.innerHTML = `
      <tr>
        <td colspan="5" class="p-3 text-center text-gray-500">No sales returns found.</td>
      </tr>
    `;
        return;
    }
    currentSalesReturnRows.forEach(row => {
        body.innerHTML += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle">${ escapeHtml(String(row.bill_no || row.id || '-')) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(formatDisplayDate(row.date || '-')) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(row.party_name || '-') }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(row.total || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle whitespace-nowrap">
          <div class="inline-flex items-center gap-1.5">
            <button onclick="startEditSalesReturn(${ Number(row.id) })" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-2.5 py-1 rounded text-xs shadow-sm">Edit</button>
            <button onclick="removeSalesReturn(${ Number(row.id) })" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-2.5 py-1 rounded text-xs shadow-sm">Delete</button>
          </div>
        </td>
      </tr>
    `;
    });
}
async function refreshPurchaseReturns() {
    const rows = await window.api.getPurchaseReturns();
    renderPurchaseReturns(rows || []);
}
async function refreshSalesReturns() {
    const rows = await window.api.getSalesReturns();
    renderSalesReturns(rows || []);
}
async function startEditSalesReturn(id) {
    const row = currentSalesReturnRows.find(item => Number(item.id) === Number(id));
    if (!row) {
        return;
    }
    editingSalesReturnId = Number(id);
    showView('salesReturn');
    const dateEl = document.getElementById('salesReturnDate');
    const modeEl = document.getElementById('salesReturnMode');
    const billNoEl = document.getElementById('salesReturnBillNo');
    const refEl = document.getElementById('salesReturnReferenceId');
    const notesEl = document.getElementById('salesReturnNotes');
    if (dateEl) dateEl.value = row.date || '';
    if (modeEl) modeEl.value = row.mode || 'Credit';
    if (billNoEl) billNoEl.value = row.bill_no || '';
    if (notesEl) notesEl.value = row.notes || '';
    if (refEl && row.reference_sale_id) {
        refEl.value = String(row.reference_sale_id);
        await onSalesReturnReferenceChange();
    }
    const submitBtn = document.getElementById('salesReturnSubmitBtn');
    if (submitBtn) {
        submitBtn.textContent = 'Update Sales Return';
    }
}
async function startEditPurchaseReturn(id) {
    const row = currentPurchaseReturnRows.find(item => Number(item.id) === Number(id));
    if (!row) {
        return;
    }
    editingPurchaseReturnId = Number(id);
    showView('purchaseReturn');
    const dateEl = document.getElementById('purchaseReturnDate');
    const modeEl = document.getElementById('purchaseReturnMode');
    const billNoEl = document.getElementById('purchaseReturnBillNo');
    const refEl = document.getElementById('purchaseReturnReferenceId');
    const notesEl = document.getElementById('purchaseReturnNotes');
    if (dateEl) dateEl.value = row.date || '';
    if (modeEl) modeEl.value = row.mode || 'Credit';
    if (billNoEl) billNoEl.value = row.bill_no || '';
    if (notesEl) notesEl.value = row.notes || '';
    if (refEl && row.reference_purchase_id) {
        refEl.value = String(row.reference_purchase_id);
        await onPurchaseReturnReferenceChange();
    }
    const submitBtn = document.getElementById('purchaseReturnSubmitBtn');
    if (submitBtn) {
        submitBtn.textContent = 'Update Purchase Return';
    }
}
window.startEditSalesReturn = startEditSalesReturn;
window.startEditPurchaseReturn = startEditPurchaseReturn;

async function submitPurchaseReturn() {
    const referenceId = Number(document.getElementById('purchaseReturnReferenceId')?.value || 0);
    const date = String(document.getElementById('purchaseReturnDate')?.value || '').trim();
    const mode = String(document.getElementById('purchaseReturnMode')?.value || 'Credit').trim();
    const billNo = String(document.getElementById('purchaseReturnBillNo')?.value || '').trim();
    const notes = String(document.getElementById('purchaseReturnNotes')?.value || '').trim();
    if (!referenceId || !currentPurchaseReturnReference || purchaseReturnItemsDraft.length === 0 || !date) {
        window.alert('Select a reference purchase bill with items and return date.');
        return;
    }
    const payload = {
        bill_no: billNo,
        date,
        party_id: Number(currentPurchaseReturnReference.party_id),
        godown_id: Number(currentPurchaseReturnReference.godown_id) || null,
        mode,
        reference_purchase_id: referenceId,
        notes,
        items: purchaseReturnItemsDraft
    };
    const result = editingPurchaseReturnId
        ? await window.api.updatePurchaseReturn(editingPurchaseReturnId, payload)
        : await window.api.addPurchaseReturn(payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to save purchase return.');
        return;
    }
    resetPurchaseReturnForm();
    await refreshPurchaseReturns();
    await refreshPurchases();
    await refreshStock();
    await loadLedger();
    showToast(editingPurchaseReturnId ? 'Purchase return updated.' : 'Purchase return saved.');
}
async function submitSalesReturn() {
    const referenceId = Number(document.getElementById('salesReturnReferenceId')?.value || 0);
    const date = String(document.getElementById('salesReturnDate')?.value || '').trim();
    const mode = String(document.getElementById('salesReturnMode')?.value || 'Credit').trim();
    const billNo = String(document.getElementById('salesReturnBillNo')?.value || '').trim();
    const notes = String(document.getElementById('salesReturnNotes')?.value || '').trim();
    if (!referenceId || !currentSalesReturnReference || salesReturnItemsDraft.length === 0 || !date) {
        window.alert('Select a reference sales bill with items and return date.');
        return;
    }
    const payload = {
        bill_no: billNo,
        date,
        party_id: Number(currentSalesReturnReference.party_id),
        godown_id: Number(currentSalesReturnReference.godown_id) || null,
        mode,
        reference_sale_id: referenceId,
        notes,
        items: salesReturnItemsDraft
    };
    const result = editingSalesReturnId
        ? await window.api.updateSalesReturn(editingSalesReturnId, payload)
        : await window.api.addSalesReturn(payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to save sales return.');
        return;
    }
    resetSalesReturnForm();
    await refreshSalesReturns();
    await refreshSales();
    await refreshStock();
    await loadLedger();
    showToast(editingSalesReturnId ? 'Sales return updated.' : 'Sales return saved.');
}
async function removePurchaseReturn(id) {
    const result = await window.api.deletePurchaseReturn(id);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to delete purchase return.');
        return;
    }
    await refreshPurchaseReturns();
    await refreshPurchases();
    await refreshStock();
    await loadLedger();
    showToast('Purchase return deleted.');
}
async function removeSalesReturn(id) {
    const result = await window.api.deleteSalesReturn(id);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to delete sales return.');
        return;
    }
    await refreshSalesReturns();
    await refreshSales();
    await refreshStock();
    await loadLedger();
    showToast('Sales return deleted.');
}
function recalculateLabourSalary() {
    const perHour = Number(document.getElementById('labourPerHourCost')?.value || 0);
    const totalHours = Number(document.getElementById('labourTotalHours')?.value || 0);
    const totalSalary = Math.max(0, perHour * totalHours);
    const totalSalaryInput = document.getElementById('labourTotalSalary');
    if (totalSalaryInput) {
        totalSalaryInput.value = totalSalary.toFixed(2);
    }
}
function resetLabourForm() {
    const dateInput = document.getElementById('labourDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }
    document.getElementById('labourEditingId').value = '';
    document.getElementById('labourName').value = '';
    document.getElementById('labourPerHourCost').value = '';
    document.getElementById('labourTotalHours').value = '';
    document.getElementById('labourTotalSalary').value = '';
    document.getElementById('labourNotes').value = '';
    document.getElementById('labourSaveBtn').textContent = 'Add Entry';
}
function renderLabourRows(rows) {
    currentLabourRows = Array.isArray(rows) ? rows : [];
    const body = document.getElementById('labourTableBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';
    if (currentLabourRows.length === 0) {
        body.innerHTML = `
      <tr>
        <td colspan="6" class="p-3 text-center text-gray-500">No labour attendance entries found.</td>
      </tr>
    `;
        return;
    }
    currentLabourRows.forEach(row => {
        body.innerHTML += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle">${ escapeHtml(formatDisplayDate(row.date || '-')) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(row.name || '-') }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(row.per_hour_cost || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right">${ Number(row.total_hours || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-right font-semibold">${ Number(row.total_salary || 0).toFixed(2) }</td>
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">
          <div class="inline-flex items-center justify-center gap-2">
            <button onclick="startEditLabourEntry(${ Number(row.id) })" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Edit</button>
            <button onclick="removeLabourEntry(${ Number(row.id) })" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Delete</button>
          </div>
        </td>
      </tr>
    `;
    });
}
function renderLabourWeeklyRows(rows) {
    currentLabourWeeklyRows = Array.isArray(rows) ? rows : [];
    const body = document.getElementById('labourWeeklyBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';
    if (currentLabourWeeklyRows.length === 0) {
        body.innerHTML = `
      <tr>
        <td colspan="5" class="p-3 text-center text-gray-500">No weekly attendance rows found.</td>
      </tr>
    `;
        return;
    }
    currentLabourWeeklyRows.forEach(row => {
        const isNil = Boolean(row.is_nil);
        const monthYear = row.month_year || '-';
        const weekNo = row.week_no || '-';
        const rateLabel = isNil ? 'Nil' : (Number(row.rate || 0) > 0 ? Number(row.rate).toFixed(2) : '-');
        const hoursLabel = isNil ? 'Nil' : Number(row.total_hours || 0).toFixed(2);
        const salaryLabel = isNil ? 'Nil' : Number(row.total_salary || 0).toFixed(2);

        body.innerHTML += `
      <tr class="border-t ${ isNil ? 'bg-gray-50 text-gray-400' : '' }">
        <td class="px-4 py-3 align-middle font-medium">${ escapeHtml(monthYear) }</td>
        <td class="px-4 py-3 align-middle font-semibold text-gray-800">${ escapeHtml(weekNo) } <span class="text-xs text-gray-400 font-normal">(${ escapeHtml(formatDisplayDate(row.week_end_saturday || '-')) })</span></td>
        <td class="px-4 py-3 align-middle text-right">${ escapeHtml(rateLabel) }</td>
        <td class="px-4 py-3 align-middle text-right">${ escapeHtml(hoursLabel) }</td>
        <td class="px-4 py-3 align-middle text-right font-semibold ${ isNil ? 'text-gray-400' : 'text-blue-900' }">${ escapeHtml(salaryLabel) }</td>
      </tr>
    `;
    });
}
async function refreshLabourAttendance() {
    const [rows, weekly] = await Promise.all([
        window.api.getLabourEntries(),
        window.api.getLabourWeeklySummary()
    ]);
    renderLabourRows(rows || []);
    renderLabourWeeklyRows(weekly || []);
}
async function saveLabourEntry() {
    const id = Number(document.getElementById('labourEditingId')?.value || 0);
    const payload = {
        date: String(document.getElementById('labourDate')?.value || '').trim(),
        name: String(document.getElementById('labourName')?.value || '').trim(),
        per_hour_cost: Number(document.getElementById('labourPerHourCost')?.value || 0),
        total_hours: Number(document.getElementById('labourTotalHours')?.value || 0),
        total_salary: Number(document.getElementById('labourTotalSalary')?.value || 0),
        notes: String(document.getElementById('labourNotes')?.value || '').trim()
    };
    if (!payload.date || !payload.name) {
        window.alert('Date and name are required.');
        return;
    }
    const result = id ? await window.api.updateLabourEntry(id, payload) : await window.api.addLabourEntry(payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to save labour row.');
        return;
    }
    resetLabourForm();
    await refreshLabourAttendance();
    showToast(id ? 'Labour row updated.' : 'Labour row added.');
}
function startEditLabourEntry(id) {
    const row = currentLabourRows.find(item => Number(item.id) === Number(id));
    if (!row) {
        return;
    }
    document.getElementById('labourEditingId').value = String(row.id || '');
    document.getElementById('labourDate').value = String(row.date || '').trim();
    document.getElementById('labourName').value = String(row.name || '').trim();
    document.getElementById('labourPerHourCost').value = Number(row.per_hour_cost || 0).toFixed(2);
    document.getElementById('labourTotalHours').value = Number(row.total_hours || 0).toFixed(2);
    document.getElementById('labourTotalSalary').value = Number(row.total_salary || 0).toFixed(2);
    document.getElementById('labourNotes').value = String(row.notes || '').trim();
    document.getElementById('labourSaveBtn').textContent = 'Update Entry';
}
function cancelLabourEdit() {
    resetLabourForm();
}
async function removeLabourEntry(id) {
    const result = await window.api.deleteLabourEntry(id);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to delete labour row.');
        return;
    }
    resetLabourForm();
    await refreshLabourAttendance();
    showToast('Labour row deleted.');
}
function formatCurrency(value) {
    return Number(value || 0).toFixed(2);
}
function formatMonthLabel(monthValue) {
    const source = String(monthValue || '').trim();
    const parts = source.split('-');
    if (parts.length !== 2) {
        return source;
    }
    const year = Number(parts[0]);
    const monthIndex = Number(parts[1]) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        return source;
    }
    const date = new Date(year, monthIndex, 1);
    return date.toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric'
    });
}
function renderProfitLossSummary(data) {
    const totalSales = Number(data?.totalSales || 0);
    const totalPurchase = Number(data?.totalPurchase || 0);
    const cogs = Number(data?.cogs || 0);
    const netProfit = Number(data?.netProfit || 0);
    const itemBasedProfit = Number(data?.itemBasedProfit || 0);
    const adjustment = Number(data?.adjustment || 0);
    const totalSalesEl = document.getElementById('plTotalSales');
    if (totalSalesEl) {
        totalSalesEl.textContent = formatCurrency(totalSales);
    }
    const totalPurchaseEl = document.getElementById('plTotalPurchase');
    if (totalPurchaseEl) {
        totalPurchaseEl.textContent = formatCurrency(totalPurchase);
    }
    const cogsEl = document.getElementById('plCogs');
    if (cogsEl) {
        cogsEl.textContent = formatCurrency(cogs);
    }
    const netEl = document.getElementById('plNetProfit');
    if (netEl) {
        netEl.textContent = formatCurrency(netProfit);
        netEl.classList.remove('text-green-700', 'text-red-700');
        netEl.classList.add(netProfit >= 0 ? 'text-green-700' : 'text-red-700');
    }
    const itemProfitEl = document.getElementById('plItemProfit');
    if (itemProfitEl) {
        itemProfitEl.textContent = formatCurrency(itemBasedProfit);
        itemProfitEl.classList.remove('text-green-700', 'text-red-700');
        itemProfitEl.classList.add(itemBasedProfit >= 0 ? 'text-green-700' : 'text-red-700');
    }
    const adjustmentEl = document.getElementById('plAdjustment');
    if (adjustmentEl) {
        adjustmentEl.textContent = formatCurrency(adjustment);
        adjustmentEl.classList.remove('text-green-700', 'text-red-700');
        adjustmentEl.classList.add(adjustment >= 0 ? 'text-green-700' : 'text-red-700');
    }
}
function setExpenseEditMode(id) {
    const editingInput = document.getElementById('editingExpenseId');
    const submitBtn = document.getElementById('expenseSubmitBtn');
    if (editingInput) {
        editingInput.value = id ? String(id) : '';
    }
    if (submitBtn) {
        submitBtn.textContent = id ? 'Update Entry' : 'Add Entry';
    }
}
function clearExpenseForm(keepDate = true) {
    if (!keepDate) {
        const expenseDate = document.getElementById('expenseDate');
        if (expenseDate) {
            expenseDate.value = new Date().toISOString().slice(0, 10);
        }
    }
    document.getElementById('expenseReason').value = '';
    document.getElementById('expenseType').value = 'LOSS';
    document.getElementById('expenseAmount').value = '';
    setExpenseEditMode(null);
}
function renderExpenseEntries(rows) {
    currentExpenses = rows || [];
    const body = document.getElementById('expenseTableBody');
    if (!body) {
        return;
    }
    body.innerHTML = '';
    if (currentExpenses.length === 0) {
        body.innerHTML = `
      <tr class="border-t">
        <td colspan="5" class="p-3 text-center text-gray-500">No entries found.</td>
      </tr>
    `;
        return;
    }
    currentExpenses.forEach(entry => {
        const isProfit = String(entry.type || '').toUpperCase() === 'PROFIT';
        body.innerHTML += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle">${ escapeHtml(formatDisplayDate(entry.date)) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(entry.reason) }</td>
        <td class="px-4 py-3 align-middle ${ isProfit ? 'text-green-700' : 'text-red-700' } font-medium">${ isProfit ? 'PROFIT' : 'LOSS' }</td>
        <td class="px-4 py-3 align-middle text-right ${ isProfit ? 'text-green-700' : 'text-red-700' }">${ formatCurrency(entry.amount) }</td>
        <td class="px-4 py-3 align-middle text-center whitespace-nowrap">
          <div class="inline-flex items-center justify-center gap-2">
            <button onclick="editExpenseEntry(${ entry.id })" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Edit</button>
            <button onclick="removeExpenseEntry(${ entry.id })" class="bg-rose-600 hover:bg-rose-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-xs">Delete</button>
          </div>
        </td>
      </tr>
    `;
    });
}
async function saveExpenseEntry() {
    const editingId = Number(document.getElementById('editingExpenseId').value || 0);
    const payload = {
        date: document.getElementById('expenseDate').value,
        reason: document.getElementById('expenseReason').value.trim(),
        type: document.getElementById('expenseType').value,
        amount: Number(document.getElementById('expenseAmount').value)
    };
    if (!payload.date || !payload.reason || !Number.isFinite(payload.amount) || payload.amount <= 0) {
        window.alert('Date, reason and valid amount are required.');
        return;
    }
    const result = editingId ? await window.api.updateExpense(editingId, payload) : await window.api.addExpense(payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to save expense entry.');
        return;
    }
    clearExpenseForm(true);
    await refreshProfitLoss();
    showToast(editingId ? 'Entry updated.' : 'Entry added.');
}
function editExpenseEntry(id) {
    const entry = currentExpenses.find(item => Number(item.id) === Number(id));
    if (!entry) {
        return;
    }
    document.getElementById('expenseDate').value = entry.date || '';
    document.getElementById('expenseReason').value = entry.reason || '';
    document.getElementById('expenseType').value = String(entry.type || '').toUpperCase() === 'PROFIT' ? 'PROFIT' : 'LOSS';
    document.getElementById('expenseAmount').value = Number(entry.amount || 0).toFixed(2);
    setExpenseEditMode(id);
}
function cancelExpenseEdit() {
    clearExpenseForm(false);
}
async function removeExpenseEntry(id) {
    const result = await window.api.deleteExpense(id);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to delete entry.');
        return;
    }
    clearExpenseForm(true);
    await refreshProfitLoss();
    showToast('Entry deleted.');
}
function renderMonthlyReport(rows) {
    const body = document.getElementById('monthlyReportBody');
    currentMonthlyReportRows = Array.isArray(rows) ? rows : [];
    body.innerHTML = '';
    if (!currentMonthlyReportRows || currentMonthlyReportRows.length === 0) {
        body.innerHTML = `
      <tr class="border-t">
        <td colspan="5" class="p-3 text-center text-gray-500">No monthly data found.</td>
      </tr>
    `;
        return;
    }
    let grandProfit = 0;
    let grandLoss = 0;
    currentMonthlyReportRows.forEach((row, index) => {
        const rowProfit = Number(row.profit || 0);
        const rowLoss = Number(row.loss || 0);
        const netValue = Number(row.net_value || 0);
        grandProfit += rowProfit;
        grandLoss += rowLoss;
        body.innerHTML += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle">${ escapeHtml(formatMonthLabel(row.month)) }</td>
        <td class="px-4 py-3 align-middle text-right">${ formatCurrency(rowProfit) }</td>
        <td class="px-4 py-3 align-middle text-right">${ formatCurrency(rowLoss) }</td>
        <td class="px-4 py-3 align-middle text-right ${ netValue >= 0 ? 'text-green-700' : 'text-red-700' } font-semibold">${ formatCurrency(netValue) }</td>
        <td class="px-4 py-3 align-middle">
          <button onclick="editMonthlyReportRow(${ index })" class="bg-amber-500 text-white px-3 py-1 rounded">Edit</button>
        </td>
      </tr>
    `;
    });
    const grandNet = grandProfit - grandLoss;
    body.innerHTML += `
    <tr class="border-t bg-gray-100 font-semibold">
      <td class="px-4 py-3 align-middle">Grand Total</td>
      <td class="px-4 py-3 align-middle text-right text-green-700">${ formatCurrency(grandProfit) }</td>
      <td class="px-4 py-3 align-middle text-right text-red-700">${ formatCurrency(grandLoss) }</td>
      <td class="px-4 py-3 align-middle text-right ${ grandNet >= 0 ? 'text-green-700' : 'text-red-700' }">${ formatCurrency(grandNet) }</td>
      <td class="px-4 py-3 align-middle"></td>
    </tr>
  `;
}
function renderDailyReport(rows) {
    const body = document.getElementById('dailyReportBody');
    if (!body) {
        return;
    }
    currentDailyReportRows = Array.isArray(rows) ? rows : [];
    body.innerHTML = '';
    if (!currentDailyReportRows || currentDailyReportRows.length === 0) {
        body.innerHTML = `
      <tr class="border-t">
        <td colspan="7" class="p-3 text-center text-gray-500">No daily data found.</td>
      </tr>
    `;
        return;
    }
    currentDailyReportRows.forEach((row, index) => {
        body.innerHTML += `
      <tr class="border-t">
        <td class="px-4 py-3 align-middle">${ escapeHtml(formatDisplayDate(row.date)) }</td>
        <td class="px-4 py-3 align-middle">${ escapeHtml(row.name) }</td>
        <td class="px-4 py-3 align-middle text-right">${ formatCurrency(row.purchase) }</td>
        <td class="px-4 py-3 align-middle text-right">${ formatCurrency(row.sales) }</td>
        <td class="px-4 py-3 align-middle text-right">${ formatCurrency(row.profit) }</td>
        <td class="px-4 py-3 align-middle text-right">${ formatCurrency(row.loss) }</td>
        <td class="px-4 py-3 align-middle">
          <button onclick="editDailyReportRow(${ index })" class="bg-amber-500 text-white px-3 py-1 rounded">Edit</button>
        </td>
      </tr>
    `;
    });
}
async function editDailyReportRow(index) {
    const row = currentDailyReportRows[index];
    if (!row) {
        return;
    }
    const values = await openEditorDialog('Edit Daily Report', [
        {
            key: 'purchase',
            label: 'Purchase Value',
            type: 'number',
            step: '0.01',
            min: 0,
            value: Number(row.purchase || 0)
        },
        {
            key: 'sales',
            label: 'Sale Value',
            type: 'number',
            step: '0.01',
            min: 0,
            value: Number(row.sales || 0)
        }
    ]);
    if (!values) {
        return;
    }
    const payload = {
        date: String(row.date || '').trim(),
        name: String(row.name || '').trim(),
        purchase: Number(values.purchase),
        sales: Number(values.sales)
    };
    if (!payload.date || !payload.name || !Number.isFinite(payload.purchase) || payload.purchase < 0 || !Number.isFinite(payload.sales) || payload.sales < 0) {
        window.alert('Enter valid sale and purchase values.');
        return;
    }
    const result = await window.api.setDailyReportValues(payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to update daily report row.');
        return;
    }
    await refreshProfitLoss();
    showToast('Daily report row updated.');
}
async function editMonthlyReportRow(index) {
    const row = currentMonthlyReportRows[index];
    if (!row) {
        return;
    }
    const values = await openEditorDialog('Edit Monthly Report', [
        {
            key: 'purchase',
            label: 'Monthly Purchase Value',
            type: 'number',
            step: '0.01',
            min: 0,
            value: Number(row.purchase || 0)
        },
        {
            key: 'sales',
            label: 'Monthly Sale Value',
            type: 'number',
            step: '0.01',
            min: 0,
            value: Number(row.sales || 0)
        }
    ]);
    if (!values) {
        return;
    }
    const payload = {
        month: String(row.month || '').trim(),
        purchase: Number(values.purchase),
        sales: Number(values.sales)
    };
    if (!payload.month || !Number.isFinite(payload.purchase) || payload.purchase < 0 || !Number.isFinite(payload.sales) || payload.sales < 0) {
        window.alert('Enter valid monthly sale and purchase values.');
        return;
    }
    const result = await window.api.setMonthlyReportValues(payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Unable to update monthly report row.');
        return;
    }
    await refreshProfitLoss();
    showToast('Monthly report row updated.');
}
async function refreshProfitLoss() {
    const summary = await window.api.getProfitLoss();
    const monthly = await window.api.getMonthlyReport();
    const daily = await window.api.getDailyReport();
    const expenses = await window.api.getExpenses();
    renderProfitLossSummary(summary);
    renderExpenseEntries(expenses);
    renderMonthlyReport(monthly);
    renderDailyReport(daily);
}
function printSalesView() {
    window.print();
}
window.showView = showView;
window.addOrUpdateParty = addOrUpdateParty;
window.editParty = editParty;
window.deleteParty = deleteParty;
window.searchParties = searchParties;
window.onPartyStateChange = onPartyStateChange;
window.addPaymentIn = async () => submitPayment('paymentIn', 'IN');
window.addPaymentOut = async () => submitPayment('paymentOut', 'OUT');
window.setTransactionType = setTransactionType;
window.beginTransactionPartySelection = beginTransactionPartySelection;
window.beginReturnEntry = beginReturnEntry;
window.backToTransactionTypePicker = backToTransactionTypePicker;
window.renderTransactionPartyTable = renderTransactionPartyTable;
window.addTransactionParty = addTransactionParty;
window.editTransactionParty = editTransactionParty;
window.deleteTransactionParty = deleteTransactionParty;
window.openTransactionEntryForParty = openTransactionEntryForParty;
window.startEditPayment = startEditPayment;
window.cancelPaymentEdit = cancelPaymentEdit;
window.savePaymentEdit = savePaymentEdit;
window.removePayment = removePayment;
window.openLedgerSource = openLedgerSource;
window.editLedgerSource = editLedgerSource;
window.deleteLedgerSource = deleteLedgerSource;
window.refreshLedgerPartyIndex = refreshLedgerPartyIndex;
window.renderLedgerPartyTable = renderLedgerPartyTable;
window.openLedgerForParty = openLedgerForParty;
window.backToLedgerPartyPicker = backToLedgerPartyPicker;
window.saveManualLedgerEntry = saveManualLedgerEntry;
window.onLedgerManualInputChange = onLedgerManualInputChange;
window.editManualLedgerEntry = editManualLedgerEntry;
window.deleteManualLedgerEntry = deleteManualLedgerEntry;
window.shareLedgerOnWhatsApp = shareLedgerOnWhatsApp;
window.downloadLedgerPdf = downloadLedgerPdf;
window.loadLedger = loadLedger;
window.calculatePurchaseLineTotal = calculatePurchaseLineTotal;
window.addPurchaseItem = addPurchaseItem;
window.removePurchaseItem = removePurchaseItem;
window.submitPurchase = submitPurchase;
window.startEditPurchase = startEditPurchase;
window.cancelPurchaseEdit = cancelPurchaseEdit;
window.removePurchase = removePurchase;
window.addGodown = addGodown;
window.deleteGodown = deleteGodown;
window.deleteGodownFromTop = deleteGodownFromTop;
window.openGodown = openGodown;
window.goBackToGodownList = goBackToGodownList;
window.editGodownStockItem = editGodownStockItem;
window.removeGodownStockItem = removeGodownStockItem;
window.refreshRawMaterialStock = refreshRawMaterialStock;
window.refreshRawMaterialTransactions = refreshRawMaterialTransactions;
window.refreshRawMaterialLedger = refreshRawMaterialLedger;
window.onRawMaterialEntryTypeChange = onRawMaterialEntryTypeChange;
window.saveRawMaterialTransaction = saveRawMaterialTransaction;
window.editRawMaterialLedgerRow = editRawMaterialLedgerRow;
window.startEditRawMaterialTransaction = startEditRawMaterialTransaction;
window.cancelRawMaterialEdit = cancelRawMaterialEdit;
window.removeRawMaterialTransaction = removeRawMaterialTransaction;
window.syncSaleRateFromProduct = syncSaleRateFromProduct;
window.calculateSaleLineTotal = calculateSaleLineTotal;
window.recalculateSaleFinalTotal = recalculateSaleFinalTotal;
window.onSalePartyChange = onSalePartyChange;
window.onPurchasePartyChange = onPurchasePartyChange;
window.addSaleItem = addSaleItem;
window.removeSaleItem = removeSaleItem;
window.saveSaleInvoice = saveSaleInvoice;
window.printSalesView = printSalesView;
window.startEditSale = startEditSale;
window.cancelSaleEdit = cancelSaleEdit;
window.removeSale = removeSale;
window.onPurchaseReturnReferenceChange = onPurchaseReturnReferenceChange;
window.onSalesReturnReferenceChange = onSalesReturnReferenceChange;
window.submitPurchaseReturn = submitPurchaseReturn;
window.submitSalesReturn = submitSalesReturn;
window.removePurchaseReturn = removePurchaseReturn;
window.removeSalesReturn = removeSalesReturn;
window.viewSaleDetail = viewSaleDetail;
window.shareSaleOnWhatsAppById = shareSaleOnWhatsAppById;
window.shareSelectedSaleOnWhatsApp = shareSelectedSaleOnWhatsApp;
window.closeSaleDetail = closeSaleDetail;
window.printSaleDetail = printSaleDetail;
window.downloadSaleDetailPdf = downloadSaleDetailPdf;
window.renderPartyIndexList = renderPartyIndexList;
window.openPartyStatement = openPartyStatement;
window.closePartyStatementDialog = closePartyStatementDialog;
window.recalculatePartyStatementSummary = recalculatePartyStatementSummary;
window.printPartyStatement = printPartyStatement;
window.refreshPurchaseRates = refreshPurchaseRates;
window.editPurchaseRate = editPurchaseRate;
window.removePurchaseRate = removePurchaseRate;
window.editDailyReportRow = editDailyReportRow;
window.editMonthlyReportRow = editMonthlyReportRow;
window.saveExpenseEntry = saveExpenseEntry;
window.editExpenseEntry = editExpenseEntry;
window.cancelExpenseEdit = cancelExpenseEdit;
window.removeExpenseEntry = removeExpenseEntry;
window.saveProfileSettings = saveProfileSettings;
window.onProfileLogoFileChange = onProfileLogoFileChange;
window.recalculateLabourSalary = recalculateLabourSalary;
window.saveLabourEntry = saveLabourEntry;
window.startEditLabourEntry = startEditLabourEntry;
window.cancelLabourEdit = cancelLabourEdit;
window.removeLabourEntry = removeLabourEntry;
window.createBackup = createBackup;
window.restoreBackup = restoreBackup;
window.exportLedgerCsv = exportLedgerCsv;
window.exportSalesCsv = exportSalesCsv;
window.exportPurchasesCsv = exportPurchasesCsv;
window.importPartiesCsv = importPartiesCsv;

// Modal & selection helpers for Purchase, Sale, and Ledger
function openPurchaseSelectModal() {
    const modal = document.getElementById('purchaseSelectModal');
    if (!modal) return;
    const searchInput = document.getElementById('purchaseSelectSearch');
    if (searchInput) searchInput.value = '';
    modal.classList.remove('hidden');
    renderPurchaseSelectList();
}
function closePurchaseSelectModal() {
    const modal = document.getElementById('purchaseSelectModal');
    if (modal) modal.classList.add('hidden');
}
function renderPurchaseSelectList() {
    const tbody = document.getElementById('purchaseSelectListBody');
    if (!tbody) return;
    const search = String(document.getElementById('purchaseSelectSearch')?.value || '').trim().toLowerCase();
    const rows = (Array.isArray(allPurchaseRows) ? allPurchaseRows : []).filter(row => {
        if (!search) return true;
        const billNo = String(row.bill_no || row.id || '').toLowerCase();
        const partyName = String(row.party_name || '').toLowerCase();
        return billNo.includes(search) || partyName.includes(search);
    });
    tbody.innerHTML = '';
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">No purchase entries found.</td></tr>`;
        return;
    }
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-blue-50';
        tr.innerHTML = `
            <td class="px-3 py-2 whitespace-nowrap">${escapeHtml(formatDisplayDate(row.date || '-'))}</td>
            <td class="px-3 py-2 font-medium">${escapeHtml(String(row.bill_no || row.id || '-'))}</td>
            <td class="px-3 py-2">${escapeHtml(row.party_name || '-')}</td>
            <td class="px-3 py-2 text-right">${Number(row.item_count || row.items_count || 1)}</td>
            <td class="px-3 py-2 text-right font-semibold">${formatCurrency(row.total_amount || 0)}</td>
            <td class="px-3 py-2 text-center">
                <button onclick="selectPurchaseToEdit(${row.id})" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-1 rounded text-xs transition">Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
async function selectPurchaseToEdit(id) {
    closePurchaseSelectModal();
    await startEditPurchase(id);
}

async function openSaleSelectModal() {
    const modal = document.getElementById('saleSelectModal');
    if (!modal) return;
    const searchInput = document.getElementById('saleSelectSearch');
    if (searchInput) searchInput.value = '';
    if (!currentSalesRows || currentSalesRows.length === 0) {
        await refreshSales();
    }
    modal.classList.remove('hidden');
    renderSaleSelectList();
}
function closeSaleSelectModal() {
    const modal = document.getElementById('saleSelectModal');
    if (modal) modal.classList.add('hidden');
}
function renderSaleSelectList() {
    const tbody = document.getElementById('saleSelectListBody');
    if (!tbody) return;
    const search = String(document.getElementById('saleSelectSearch')?.value || '').trim().toLowerCase();
    const rows = (Array.isArray(currentSalesRows) ? currentSalesRows : []).filter(row => {
        if (!search) return true;
        const billNo = String(getSaleBillNo(row) || row.id || '').toLowerCase();
        const partyName = String(row.party_name || row.bill_name || '').toLowerCase();
        return billNo.includes(search) || partyName.includes(search);
    });
    tbody.innerHTML = '';
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">No sales invoices found.</td></tr>`;
        return;
    }
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-blue-50';
        tr.innerHTML = `
            <td class="px-3 py-2 whitespace-nowrap">${escapeHtml(formatDisplayDate(row.date || '-'))}</td>
            <td class="px-3 py-2 font-medium">${escapeHtml(String(getSaleBillNo(row) || row.id || '-'))}</td>
            <td class="px-3 py-2">${escapeHtml(row.party_name || row.bill_name || '-')}</td>
            <td class="px-3 py-2 text-right">${Number(row.item_count || row.items_count || 1)}</td>
            <td class="px-3 py-2 text-right font-semibold">${formatCurrency(row.grand_total || row.total_amount || 0)}</td>
            <td class="px-3 py-2 text-center">
                <button onclick="selectSaleToEdit(${row.id})" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-1 rounded text-xs transition">Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
async function selectSaleToEdit(id) {
    closeSaleSelectModal();
    await startEditSale(id);
}

function cancelManualLedgerEdit() {
    resetManualLedgerForm();
}
function openLedgerEntrySelectModal() {
    const modal = document.getElementById('ledgerEntrySelectModal');
    if (!modal) return;
    const searchInput = document.getElementById('ledgerEntrySelectSearch');
    if (searchInput) searchInput.value = '';
    modal.classList.remove('hidden');
    renderLedgerEntrySelectList();
}
function closeLedgerEntrySelectModal() {
    const modal = document.getElementById('ledgerEntrySelectModal');
    if (modal) modal.classList.add('hidden');
}
function renderLedgerEntrySelectList() {
    const tbody = document.getElementById('ledgerEntrySelectListBody');
    if (!tbody) return;
    const search = String(document.getElementById('ledgerEntrySelectSearch')?.value || '').trim().toLowerCase();
    const manualRows = (Array.isArray(currentLedgerRows) ? currentLedgerRows : []).filter(isManualLedgerEntry).filter(row => {
        if (!search) return true;
        const particulars = String(row.particulars || '').toLowerCase();
        const amt = String(row.amount || '').toLowerCase();
        return particulars.includes(search) || amt.includes(search);
    });
    tbody.innerHTML = '';
    if (manualRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">No manual ledger entries found for this party.</td></tr>`;
        return;
    }
    manualRows.forEach(row => {
        const isDebit = String(row.type || '').toLowerCase() === 'debit';
        const debitText = isDebit ? formatCurrency(row.amount) : '-';
        const creditText = !isDebit ? formatCurrency(row.amount) : '-';
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-blue-50';
        tr.innerHTML = `
            <td class="px-3 py-2 whitespace-nowrap">${escapeHtml(formatDisplayDate(row.date || '-'))}</td>
            <td class="px-3 py-2">${escapeHtml(row.particulars || '-')}</td>
            <td class="px-3 py-2 text-right text-rose-600 font-medium">${escapeHtml(debitText)}</td>
            <td class="px-3 py-2 text-right text-emerald-600 font-medium">${escapeHtml(creditText)}</td>
            <td class="px-3 py-2 text-center">
                <button onclick="selectLedgerEntryToEdit(${row.id})" class="bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-1 rounded text-xs transition">Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
function selectLedgerEntryToEdit(id) {
    closeLedgerEntrySelectModal();
    editManualLedgerEntry(id);
}

// Raw Material Usage & Received modal functions
function openRawMaterialUsageModal(productName, unitType = 'Pcs', rowId = null) {
    const modal = document.getElementById('rawMaterialUsageModal');
    if (!modal) return;
    document.getElementById('rawMaterialUsageRowId').value = rowId ? String(rowId) : '';
    document.getElementById('rawMaterialUsageProductName').value = productName || '';
    document.getElementById('rawMaterialUsageUnitType').value = normalizeUnitType(unitType) || 'Pcs';
    const dateEl = document.getElementById('rawMaterialUsageDate');
    const today = new Date().toISOString().slice(0, 10);
    dateEl.value = today;
    const partySelect = document.getElementById('rawMaterialUsagePartyId');
    if (partySelect) {
        partySelect.innerHTML = '<option value="">Select Party</option>';
        (currentParties || []).forEach(p => {
            partySelect.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`;
        });
        if (currentParties && currentParties.length > 0) {
            partySelect.value = String(currentParties[0].id);
        }
    }
    const qtyEl = document.getElementById('rawMaterialUsageQty');
    const purposeEl = document.getElementById('rawMaterialUsagePurpose');
    const titleEl = document.getElementById('rawMaterialUsageModalTitle');
    if (rowId) {
        const row = (rawMaterialTransactions || []).find(r => Number(r.id) === Number(rowId));
        if (row) {
            if (titleEl) titleEl.textContent = 'Update Material Usage';
            if (row.date) dateEl.value = row.date;
            if (partySelect && row.party_id) partySelect.value = String(row.party_id);
            qtyEl.value = Number(row.quantity || 0).toFixed(2);
            purposeEl.value = row.notes || row.product_details || '';
        }
    } else {
        if (titleEl) titleEl.textContent = 'Record Material Usage';
        qtyEl.value = '';
        purposeEl.value = '';
    }
    modal.classList.remove('hidden');
    qtyEl.focus();
}

function closeRawMaterialUsageModal() {
    const modal = document.getElementById('rawMaterialUsageModal');
    if (modal) modal.classList.add('hidden');
}

async function saveRawMaterialUsage() {
    const rowId = Number(document.getElementById('rawMaterialUsageRowId')?.value || 0);
    const productName = String(document.getElementById('rawMaterialUsageProductName')?.value || '').trim();
    const unitType = String(document.getElementById('rawMaterialUsageUnitType')?.value || 'Pcs').trim();
    const date = String(document.getElementById('rawMaterialUsageDate')?.value || '').trim();
    const partyId = Number(document.getElementById('rawMaterialUsagePartyId')?.value || currentParties[0]?.id || 0);
    const qty = Number(document.getElementById('rawMaterialUsageQty')?.value || 0);
    const purpose = String(document.getElementById('rawMaterialUsagePurpose')?.value || '').trim();

    if (!productName || !date || !qty || qty <= 0) {
        window.alert('Product name, date, and valid quantity used are required.');
        return;
    }
    if (!partyId) {
        window.alert('Please select a party or department.');
        return;
    }

    const payload = {
        date,
        party_id: partyId,
        entry_type: 'OUT',
        product_name: productName,
        quantity: qty,
        unit_type: unitType,
        rate: 0,
        product_details: purpose,
        notes: purpose
    };

    let result;
    if (rowId) {
        result = await window.api.updateRawMaterialTransaction(rowId, payload);
    } else {
        result = await window.api.addRawMaterialTransaction(payload);
    }

    if (!result || !result.success) {
        window.alert(result?.message || 'Failed to record material usage.');
        return;
    }

    closeRawMaterialUsageModal();
    await refreshRawMaterialStock();
    await refreshRawMaterialLedger();
    await refreshRawMaterialTransactions();
    showToast(rowId ? 'Usage entry updated.' : 'Material usage recorded successfully.');
}

function openRawMaterialReceivedModal(productName, unitType = 'Pcs') {
    const modal = document.getElementById('rawMaterialReceivedModal');
    if (!modal) return;
    document.getElementById('rawMaterialReceivedProductName').value = productName || '';
    document.getElementById('rawMaterialReceivedUnitType').value = normalizeUnitType(unitType) || 'Pcs';
    const dateEl = document.getElementById('rawMaterialReceivedDate');
    const today = new Date().toISOString().slice(0, 10);
    dateEl.value = today;
    const partySelect = document.getElementById('rawMaterialReceivedPartyId');
    if (partySelect) {
        partySelect.innerHTML = '<option value="">Select Supplier</option>';
        (currentParties || []).forEach(p => {
            partySelect.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`;
        });
        if (currentParties && currentParties.length > 0) {
            partySelect.value = String(currentParties[0].id);
        }
    }
    document.getElementById('rawMaterialReceivedQty').value = '';
    document.getElementById('rawMaterialReceivedRate').value = '';
    document.getElementById('rawMaterialReceivedNotes').value = '';
    modal.classList.remove('hidden');
    document.getElementById('rawMaterialReceivedQty').focus();
}

function closeRawMaterialReceivedModal() {
    const modal = document.getElementById('rawMaterialReceivedModal');
    if (modal) modal.classList.add('hidden');
}

async function saveRawMaterialReceived() {
    const productName = String(document.getElementById('rawMaterialReceivedProductName')?.value || '').trim();
    const unitType = String(document.getElementById('rawMaterialReceivedUnitType')?.value || 'Pcs').trim();
    const date = String(document.getElementById('rawMaterialReceivedDate')?.value || '').trim();
    const partyId = Number(document.getElementById('rawMaterialReceivedPartyId')?.value || 0);
    const qty = Number(document.getElementById('rawMaterialReceivedQty')?.value || 0);
    const rate = Number(document.getElementById('rawMaterialReceivedRate')?.value || 0);
    const notes = String(document.getElementById('rawMaterialReceivedNotes')?.value || '').trim();

    if (!productName || !date || !qty || qty <= 0) {
        window.alert('Product name, date, and valid received quantity are required.');
        return;
    }
    if (!partyId) {
        window.alert('Please select a supplier / party.');
        return;
    }

    const payload = {
        date,
        party_id: partyId,
        entry_type: 'IN',
        product_name: productName,
        quantity: qty,
        unit_type: unitType,
        rate: rate,
        product_details: notes,
        notes: notes
    };

    const result = await window.api.addRawMaterialTransaction(payload);
    if (!result || !result.success) {
        window.alert(result?.message || 'Failed to record received material.');
        return;
    }

    closeRawMaterialReceivedModal();
    await refreshRawMaterialStock();
    await refreshRawMaterialLedger();
    await refreshRawMaterialTransactions();
    showToast('Received material recorded successfully.');
}

window.openPurchaseSelectModal = openPurchaseSelectModal;
window.closePurchaseSelectModal = closePurchaseSelectModal;
window.renderPurchaseSelectList = renderPurchaseSelectList;
window.selectPurchaseToEdit = selectPurchaseToEdit;
window.openSaleSelectModal = openSaleSelectModal;
window.closeSaleSelectModal = closeSaleSelectModal;
window.renderSaleSelectList = renderSaleSelectList;
window.selectSaleToEdit = selectSaleToEdit;
window.cancelManualLedgerEdit = cancelManualLedgerEdit;
window.openLedgerEntrySelectModal = openLedgerEntrySelectModal;
window.closeLedgerEntrySelectModal = closeLedgerEntrySelectModal;
window.renderLedgerEntrySelectList = renderLedgerEntrySelectList;
window.selectLedgerEntryToEdit = selectLedgerEntryToEdit;
window.openRawMaterialUsageModal = openRawMaterialUsageModal;
window.closeRawMaterialUsageModal = closeRawMaterialUsageModal;
window.saveRawMaterialUsage = saveRawMaterialUsage;
window.openRawMaterialReceivedModal = openRawMaterialReceivedModal;
window.closeRawMaterialReceivedModal = closeRawMaterialReceivedModal;
window.saveRawMaterialReceived = saveRawMaterialReceived;
function initPlatformStyles() {
    if (window.api && window.api.getPlatform) {
        try {
            const platform = window.api.getPlatform();
            if (platform === 'darwin') {
                document.body.classList.add('platform-mac');
                const titleBarDrag = document.getElementById('macosTitleBarDrag');
                if (titleBarDrag) {
                    titleBarDrag.classList.remove('hidden');
                }
            } else {
                document.body.classList.add('platform-win');
            }
        } catch (_e) {
            document.body.classList.add('platform-win');
        }
    }
}

function safeFocusAndSelect(el) {
    if (!el) return;
    el.focus();
    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || '').toLowerCase();
    // In Chromium, calling select() on numeric/date/time inputs throws an error or glitches cursor
    if (tag === 'input' && (type === 'number' || type === 'date' || type === 'time' || type === 'color' || type === 'range' || type === 'checkbox' || type === 'radio')) {
        return;
    }
    try {
        if (typeof el.select === 'function') {
            el.select();
        }
    } catch (_) {}
}

function setupAutoFocusOnEnter() {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        const target = event.target;
        if (!target) return;

        const tagName = target.tagName.toLowerCase();
        const isInput = tagName === 'input';
        const isSelect = tagName === 'select';
        const isTextarea = tagName === 'textarea';

        if (!isInput && !isSelect && !isTextarea) return;

        // Skip buttons, submits, checkboxes, radios
        const inputType = (target.type || '').toLowerCase();
        if (inputType === 'button' || inputType === 'submit' || inputType === 'reset') return;

        // In textarea, Shift+Enter creates a new line; Enter moves to next field
        if (isTextarea && event.shiftKey) return;

        // In godown name input, allow Enter to trigger addGodown
        if (target.id === 'godownNameInput') {
            event.preventDefault();
            addGodown();
            return;
        }

        // In line-item rate inputs, allow Enter to add item
        if (target.id === 'purchaseSellingRate') {
            event.preventDefault();
            addPurchaseItem();
            const firstInput = document.getElementById('purchaseProductName');
            safeFocusAndSelect(firstInput);
            return;
        }

        if (target.id === 'saleRate') {
            event.preventDefault();
            addSaleItem();
            const firstInput = document.getElementById('saleProductId');
            safeFocusAndSelect(firstInput);
            return;
        }

        // Find enclosing form or panel container
        const container = target.closest('form') ||
                          target.closest('.modal-content') ||
                          target.closest('#editorDialogOverlay > div') ||
                          target.closest('[id$="Panel"]') ||
                          target.closest('[id$="Card"]') ||
                          target.closest('[id$="View"]') ||
                          document.body;

        const selector = 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly])';
        const focusables = Array.from(container.querySelectorAll(selector)).filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        });

        const currentIndex = focusables.indexOf(target);
        if (currentIndex !== -1 && currentIndex < focusables.length - 1) {
            event.preventDefault();
            const nextEl = focusables[currentIndex + 1];
            safeFocusAndSelect(nextEl);
        }
    });
}

window.onload = async () => {
    initPlatformStyles();
    setupAutoFocusOnEnter();
    await withLoading(async () => {
        setDefaultDates();
        await initializePartyLocationInputs();
        clearPartyForm();
        resetPurchaseForm();
        resetSaleForm();
        resetPurchaseReturnForm();
        resetSalesReturnForm();
        resetRawMaterialForm();
        resetLabourForm();
        await refreshPartyData();
        await refreshGodowns();
        await loadProfileSettings();
        await refreshProductCatalog();
        await refreshPayments();
        await refreshSales();
        await refreshProfitLoss();
        await refreshPurchases();
        await refreshPartyTransactionIndex();
        await refreshStock();
        await refreshRawMaterialProductOptions();
        await refreshRawMaterialTransactions();
        await refreshRawMaterialStock();
        await refreshRawMaterialLedger();
        await refreshPurchaseRates();
        await refreshPurchaseReturns();
        await refreshSalesReturns();
        await refreshLabourAttendance();
        await loadLedger();
        if (typeof initUpdatesUI === 'function')
            await initUpdatesUI();
        showView('transaction');
    });
    const partyModal = document.getElementById('partyStatementModal');
    if (partyModal) {
        partyModal.addEventListener('click', event => {
            if (event.target === partyModal) {
                closePartyStatementDialog();
            }
        });
    }
};
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey) {
        if (event.key.toLowerCase() === 's') {
            event.preventDefault();
        } else if (event.key.toLowerCase() === 'f') {
            event.preventDefault();
        } else if (event.key.toLowerCase() === 'n') {
            event.preventDefault();
        }
    }
});
window.checkForUpdatesManually = async () => {
    const btn = document.getElementById('btnCheckForUpdates');
    const container = document.getElementById('updateStatusContainer');
    const statusText = document.getElementById('updateStatusText');
    const progressWrapper = document.getElementById('updateProgressWrapper');
    const actionsWrapper = document.getElementById('updateActionsWrapper');
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    container.classList.remove('hidden');
    progressWrapper.classList.add('hidden');
    actionsWrapper.classList.add('hidden');
    statusText.textContent = 'Checking for updates...';
    const result = await window.api.checkForUpdates();
    if (!result || !result.success) {
        statusText.textContent = result?.message || 'Update check failed.';
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
};
if (window.api && window.api.onUpdateStatus) {
    window.api.onUpdateStatus(status => {
        const container = document.getElementById('updateStatusContainer');
        const statusText = document.getElementById('updateStatusText');
        const progressWrapper = document.getElementById('updateProgressWrapper');
        const actionsWrapper = document.getElementById('updateActionsWrapper');
        const btn = document.getElementById('btnCheckForUpdates');
        if (container)
            container.classList.remove('hidden');
        if (statusText)
            statusText.textContent = status;
        if (status && status.toLowerCase().includes('downloaded')) {
            if (progressWrapper)
                progressWrapper.classList.add('hidden');
            if (actionsWrapper)
                actionsWrapper.classList.remove('hidden');
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        } else if (status && (status.toLowerCase().includes('error') || status.toLowerCase().includes('latest version'))) {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
            if (status.toLowerCase().includes('error')) {
                const fallbackBtn = document.getElementById('btnFallbackDownload');
                const restartBtn = document.getElementById('btnRestartForUpdate');
                if (actionsWrapper)
                    actionsWrapper.classList.remove('hidden');
                if (fallbackBtn)
                    fallbackBtn.classList.remove('hidden');
                if (restartBtn)
                    restartBtn.classList.add('hidden');
            }
        }
    });
}
if (window.api && window.api.onLatestVersion) {
    window.api.onLatestVersion(version => {
        const el = document.getElementById('appLatestVersion');
        if (el)
            el.textContent = version;
    });
}
if (window.api && window.api.onDownloadProgress) {
    window.api.onDownloadProgress(percent => {
        const progressWrapper = document.getElementById('updateProgressWrapper');
        const progressBar = document.getElementById('updateProgressBar');
        if (progressWrapper)
            progressWrapper.classList.remove('hidden');
        if (progressBar)
            progressBar.style.width = `${ percent }%`;
    });
}
async function initUpdatesUI() {
    if (!window.api || !window.api.getCurrentVersion)
        return;
    const currentVersion = await window.api.getCurrentVersion();
    const latestVersion = await window.api.getLatestVersion();
    const curEl = document.getElementById('appCurrentVersion');
    const latEl = document.getElementById('appLatestVersion');
    if (curEl)
        curEl.textContent = currentVersion || 'Unknown';
    if (latEl)
        latEl.textContent = latestVersion || 'Unknown';
}