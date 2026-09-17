let data = {
    company: {
        name: 'CYGNUS TECHNOLOGY SYSTEMS-L.L.C-S.P.C',
        email: 'info@cygnusts.ae',
        phone: '+97126661321',
        tax: '105073373000003',
        address: 'Office #M1, Jaz Boutique Building, Al Turat St. Al Nahyan\nAbu Dhabi, UAE',
        currency: 'AED',
        taxRate: 5,
        bank: 'ADCB\nCYGNUS TECHNOLOGY SYSTEMS-L.L.C-S.P.C\n12154222820001\nIBD-AL HOSN BRANCH\nAE280030012154222820001',
        terms: 'The new hardware is covered for 1 year. Software or service will be limited.'
    },
    customers: [],
    products: [],
    quotations: [],
    deliveryNotes: [],
    invoices: [],
    receiptVouchers: [],
    counters: {
        quotation: 1,
        delivery: 1,
        invoice: 1,
        receiptVoucher: 1
    }
};

function ensureDataStructure() {
    if (!data || typeof data !== 'object') data = {};

    if (!data.company) data.company = {};
    if (!Array.isArray(data.customers)) data.customers = [];
    if (!Array.isArray(data.products)) data.products = [];
    if (!Array.isArray(data.quotations)) data.quotations = [];
    if (!Array.isArray(data.deliveryNotes)) data.deliveryNotes = [];
    if (!Array.isArray(data.invoices)) data.invoices = [];
    if (!Array.isArray(data.receiptVouchers)) data.receiptVouchers = [];

    if (!data.counters) {
        data.counters = {
            quotation: 1,
            delivery: 1,
            invoice: 1,
            receiptVoucher: 1
        };
    }

    if (!data.counters.quotation) data.counters.quotation = 1;
    if (!data.counters.delivery) data.counters.delivery = 1;
    if (!data.counters.invoice) data.counters.invoice = 1;
    if (!data.counters.receiptVoucher) {
        data.counters.receiptVoucher = 1;
    }
}

// Sync and recalculate document counters based on actual existing documents
function syncCounters() {
    if (!data.receiptVouchers) data.receiptVouchers = [];
    if (!data.counters) data.counters = { quotation: 1, delivery: 1, invoice: 1, receiptVoucher: 1 };
    if (!data.counters.receiptVoucher) data.counters.receiptVoucher = 1;

    ['quotation', 'delivery', 'invoice', 'receiptVoucher'].forEach(type => {
        let list;
        if (type === 'quotation') list = data.quotations || [];
        else if (type === 'delivery') list = data.deliveryNotes || [];
        else if (type === 'invoice') list = data.invoices || [];
        else list = data.receiptVouchers || [];

        if (list.length === 0) {
            data.counters[type] = 1;
        } else {
            let maxNum = 0;
            list.forEach(doc => {
                const parts = doc.number ? doc.number.split('-') : [];
                const num = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            });
            data.counters[type] = maxNum + 1;
        }
    });
}

function updateSyncStatus(state, msg) {
    const statusEl = document.getElementById('sync-status');
    const textEl = document.getElementById('sync-text');
    if (!statusEl || !textEl) return;

    if (state === 'live') {
        statusEl.className = 'sync-badge sync-live';
        textEl.textContent = 'Live Cloud Sync';
        statusEl.title = 'Realtime database connected & syncing';
    } else if (state === 'error') {
        statusEl.className = 'sync-badge sync-error';
        textEl.textContent = msg || 'Sync Blocked (Rules Required)';
        statusEl.title = msg || 'Permission denied by Firebase Security Rules';
    } else {
        statusEl.className = 'sync-badge sync-checking';
        textEl.textContent = msg || 'Checking Sync...';
    }
}

// Load data with LocalStorage fallback & optional Firebase sync
function loadData(callback) {

    const saved = localStorage.getItem('docManagerData');

    if (saved) {
        try {
            data = JSON.parse(saved);
            ensureDataStructure();
            syncCounters();
        } catch (e) {
            console.error('Error loading local storage:', e);
        }
    }

    if (typeof db !== 'undefined' && db && typeof db.ref === 'function') {
        updateSyncStatus('checking', 'Checking Sync...');

        let initialDataLoaded = false;
        const syncTimeout = setTimeout(() => {
            if (!initialDataLoaded) {
                updateSyncStatus('error', 'Sync Blocked (Check Rules)');
                console.warn('Firebase sync notice: database response timed out (check Security Rules).');
            }
        }, 4000);

        db.ref('docManagerData').on('value', snapshot => {
            initialDataLoaded = true;
            clearTimeout(syncTimeout);
            updateSyncStatus('live');

            const savedRemote = snapshot.val();

            if (savedRemote) {
                data = savedRemote;

                ensureDataStructure();
                syncCounters();

                localStorage.setItem(
                    'docManagerData',
                    JSON.stringify(data)
                );

                refreshAllTables();
                updateDashboard();
            } else if (data) {
                // If remote is empty, seed remote with local data
                db.ref('docManagerData').set(data).catch(err => console.warn('Firebase seed error:', err));
            }

        }, error => {
            initialDataLoaded = true;
            clearTimeout(syncTimeout);
            console.error('Firebase read error:', error);
            if (error.code === 'PERMISSION_DENIED' || (error.message && error.message.includes('PERMISSION_DENIED'))) {
                updateSyncStatus('error', 'Sync Blocked (Rules Required)');
            } else {
                updateSyncStatus('error', 'Firebase Error');
            }
        });

    } else {
        console.warn('Firebase database is not connected.');
        updateSyncStatus('error', 'Firebase Not Connected');
    }

    if (callback) callback();
}

function initializeSampleData() {
        // Initialize default sample data with official CYG-OP format starting from 0001
        data.customers.push({
            id: 'cust-solar-1',
            name: 'SOLAR POWER ELECTRICALS L.L.C',
            email: 'info@solarpowerm14.ae',
            phone: '+971501234567',
            address: 'M14, Musaffah, Abu Dhabi, UAE',
            taxId: '100987654321003'
        });

        const sampleItems = [
            {
                description: 'Microsoft Word and Excel Installation',
                quantity: 2,
                price: 50.00,
                total: 100.00
            }
        ];

        data.quotations.push({
            id: 'quote-1',
            number: 'CYG-QT-OP-26-0001',
            date: '2026-08-19',
            validUntil: '2026-09-18',
            customerId: 'cust-solar-1',
            items: sampleItems,
            subtotal: 100.00,
            tax: 5.00,
            total: 105.00,
            notes: 'Thank you for your valuable inquiry.',
            status: 'sent',
            createdAt: new Date().toISOString()
        });

        data.invoices.push({
            id: 'inv-1',
            number: 'CYG-INV-OP-26-0001',
            date: '2026-08-19',
            dueDate: '2026-09-18',
            customerId: 'cust-solar-1',
            items: sampleItems,
            subtotal: 100.00,
            tax: 5.00,
            total: 105.00,
            notes: 'Thank you for your business.',
            status: 'paid',
            createdAt: new Date().toISOString()
        });

        data.deliveryNotes.push({
            id: 'dn-1',
            number: 'CYG-DN-OP-26-0001',
            date: '2026-08-19',
            reference: 'CYG-QT-OP-26-0001',
            customerId: 'cust-solar-1',
            items: sampleItems,
            subtotal: 100.00,
            tax: 5.00,
            total: 105.00,
            notes: 'Goods delivered in good condition.',
            status: 'delivered',
            createdAt: new Date().toISOString()
        });

        data.receiptVouchers.push({
            id: 'rv-1',
            number: 'CYG-RV-OP-26-0001',
            date: '2026-08-19',
            customerId: 'cust-solar-1',
            paymentMode: 'Cheque',
            chequeNo: 'CHQ-778899',
            bankName: 'ADCB',
            amount: 105.00,
            reference: 'Invoice # CYG-INV-OP-26-0001',
            notes: 'Being payment received against Invoice CYG-INV-OP-26-0001',
            createdAt: new Date().toISOString()
        });

        data.counters.quotation = 2;
        data.counters.invoice = 2;
        data.counters.delivery = 2;
        data.counters.receiptVoucher = 2;
        saveData();
}

// Save data to LocalStorage first, then sync to Firebase if available
function saveData() {

    ensureDataStructure();

    try {
        localStorage.setItem(
            'docManagerData',
            JSON.stringify(data)
        );
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }

    if (typeof db !== 'undefined' && db && typeof db.ref === 'function') {
        db.ref('docManagerData').set(data).then(() => {
            updateSyncStatus('live');
        }).catch(error => {
            console.error('Firebase save error:', error);
            updateSyncStatus('error', error.message);
            if (error.code === 'PERMISSION_DENIED' || (error.message && error.message.includes('PERMISSION_DENIED'))) {
                alert('⚠️ Firebase Realtime Database Security Rules Blocked Sync!\n\nYour data is saved locally on this laptop, but CANNOT sync to your mobile phone until Firebase Security Rules are set to public.\n\nPlease check Firebase Console -> Realtime Database -> Rules.');
            }
        });
    }
}
// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadData(function() {
        setupNavigation();
        setupMobileMenu();
        setupCompanyForm();
        setupCustomerSearch();
        setupRvCustomerSearch();
        refreshAllTables();
        updateDashboard();
        setupAuthListener();
    });
});

// Mobile Off-Canvas Menu Handler
function setupMobileMenu() {
    const toggleBtn = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (!toggleBtn || !sidebar || !overlay) return;

    toggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', function() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            }
        });
    });
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(section).classList.add('active');
        });
    });
}

// Company Form
function setupCompanyForm() {
    // Populate form
    document.getElementById('company-name').value = data.company.name;
    document.getElementById('company-email').value = data.company.email;
    document.getElementById('company-phone').value = data.company.phone;
    document.getElementById('company-tax').value = data.company.tax;
    document.getElementById('company-address').value = data.company.address;
    document.getElementById('company-currency').value = data.company.currency || '$';
    document.getElementById('company-tax-rate').value = data.company.taxRate || 0;
    document.getElementById('company-bank').value = data.company.bank;
    document.getElementById('company-terms').value = data.company.terms;

    document.getElementById('company-form').addEventListener('submit', function(e) {
        e.preventDefault();
        data.company = {
            name: document.getElementById('company-name').value,
            email: document.getElementById('company-email').value,
            phone: document.getElementById('company-phone').value,
            tax: document.getElementById('company-tax').value,
            address: document.getElementById('company-address').value,
            currency: document.getElementById('company-currency').value || '$',
            taxRate: parseFloat(document.getElementById('company-tax-rate').value) || 0,
            bank: document.getElementById('company-bank').value,
            terms: document.getElementById('company-terms').value
        };
        saveData();
        alert('Company information saved!');
    });
}

// Modal functions
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Customer Modal
function openCustomerModal(customerId = null) {
    document.getElementById('customer-form').reset();
    document.getElementById('customer-id').value = '';

    if (customerId) {
        const customer = data.customers.find(c => c.id === customerId);
        if (customer) {
            document.getElementById('customer-id').value = customer.id;
            document.getElementById('customer-name').value = customer.name;
            document.getElementById('customer-email').value = customer.email;
            document.getElementById('customer-phone').value = customer.phone;
            document.getElementById('customer-address').value = customer.address;
            document.getElementById('customer-tax-id').value = customer.taxId;
        }
    }

    openModal('customer-modal');
}

function saveCustomer() {
    const id = document.getElementById('customer-id').value;
    const customer = {
        id: id || Date.now().toString(),
        name: document.getElementById('customer-name').value,
        email: document.getElementById('customer-email').value,
        phone: document.getElementById('customer-phone').value,
        address: document.getElementById('customer-address').value,
        taxId: document.getElementById('customer-tax-id').value
    };

    if (!customer.name) {
        alert('Customer name is required');
        return;
    }

    if (id) {
        const index = data.customers.findIndex(c => c.id === id);
        data.customers[index] = customer;
    } else {
        data.customers.push(customer);
    }

    saveData();
    refreshCustomersTable();
    closeModal('customer-modal');
}

function deleteCustomer(id) {
    if (confirm('Delete this customer?')) {
        data.customers = data.customers.filter(c => c.id !== id);
        saveData();
        refreshCustomersTable();
    }
}

// Product Modal
function openProductModal(productId = null) {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';

    if (productId) {
        const product = data.products.find(p => p.id === productId);
        if (product) {
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-description').value = product.description;
            document.getElementById('product-price').value = product.price;
        }
    }

    openModal('product-modal');
}

function saveProduct() {
    const id = document.getElementById('product-id').value;
    const product = {
        id: id || Date.now().toString(),
        name: document.getElementById('product-name').value,
        description: document.getElementById('product-description').value,
        price: parseFloat(document.getElementById('product-price').value) || 0
    };

    if (!product.name) {
        alert('Product name is required');
        return;
    }

    if (id) {
        const index = data.products.findIndex(p => p.id === id);
        data.products[index] = product;
    } else {
        data.products.push(product);
    }

    saveData();
    refreshProductsTable();
    closeModal('product-modal');
}

function deleteProduct(id) {
    if (confirm('Delete this product?')) {
        data.products = data.products.filter(p => p.id !== id);
        saveData();
        refreshProductsTable();
    }
}

// Document Modal
function openDocumentModal(type, docId = null) {
    document.getElementById('document-form').reset();
    document.getElementById('doc-type').value = type;
    document.getElementById('doc-id').value = '';
    document.getElementById('selected-customer-id').value = '';
    document.getElementById('customer-search').value = '';

    // Set date to today
    document.getElementById('doc-date').value = new Date().toISOString().split('T')[0];

    // Show/hide fields based on type
    document.getElementById('validity-group').style.display = type === 'quotation' ? 'block' : 'none';
    document.getElementById('due-date-group').style.display = type === 'invoice' ? 'block' : 'none';
    document.getElementById('reference-group').style.display = type !== 'quotation' ? 'block' : 'none';

    // Set modal title
    const titles = {
        quotation: 'New Quotation',
        delivery: 'New Delivery Note',
        invoice: 'New Invoice'
    };
    document.getElementById('modal-title').textContent = titles[type];

    // Generate document number
    syncCounters();
    const prefixes = { quotation: 'CYG-QT-OP-26', delivery: 'CYG-DN-OP-26', invoice: 'CYG-INV-OP-26' };
    const counter = data.counters[type];
    document.getElementById('doc-number').value = `${prefixes[type]}-${String(counter).padStart(4, '0')}`;

    // Set tax rate display
    document.getElementById('tax-rate-display').textContent = data.company.taxRate || 0;

    // Clear and add one line item
    document.getElementById('line-items-body').innerHTML = '';
    addLineItem();

    // If editing
    if (docId) {
        loadDocumentForEdit(type, docId);
    }

    // Set validity/due dates
    if (type === 'quotation') {
        const validity = new Date();
        validity.setDate(validity.getDate() + 30);
        document.getElementById('doc-valid-until').value = validity.toISOString().split('T')[0];
    } else if (type === 'invoice') {
        const due = new Date();
        due.setDate(due.getDate() + 30);
        document.getElementById('doc-due-date').value = due.toISOString().split('T')[0];
    }

    openModal('document-modal');
}

function loadDocumentForEdit(type, docId) {
    let doc;
    if (type === 'quotation') doc = data.quotations.find(d => d.id === docId);
    else if (type === 'delivery') doc = data.deliveryNotes.find(d => d.id === docId);
    else doc = data.invoices.find(d => d.id === docId);

    if (!doc) return;

    document.getElementById('doc-id').value = doc.id;
    document.getElementById('doc-number').value = doc.number;
    document.getElementById('doc-date').value = doc.date;
    document.getElementById('selected-customer-id').value = doc.customerId;

    const customer = data.customers.find(c => c.id === doc.customerId);
    if (customer) {
        document.getElementById('customer-search').value = customer.name;
    }

    if (type === 'quotation') {
        document.getElementById('doc-valid-until').value = doc.validUntil;
    } else if (type === 'invoice') {
        document.getElementById('doc-due-date').value = doc.dueDate;
    }

    if (type !== 'quotation') {
        document.getElementById('doc-reference').value = doc.reference || '';
    }

    document.getElementById('doc-notes').value = doc.notes || '';

    // Load line items
    document.getElementById('line-items-body').innerHTML = '';
    doc.items.forEach(item => {
        addLineItem(item);
    });

    calculateTotals();

    document.getElementById('modal-title').textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
}

// Customer Search
function setupCustomerSearch() {
    const input = document.getElementById('customer-search');
    const dropdown = document.getElementById('customer-dropdown');

    input.addEventListener('focus', () => showCustomerDropdown());
    input.addEventListener('input', () => showCustomerDropdown());

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.customer-select-wrapper')) {
            dropdown.classList.remove('show');
        }
    });
}

function showCustomerDropdown() {
    const input = document.getElementById('customer-search');
    const dropdown = document.getElementById('customer-dropdown');
    const search = input.value.toLowerCase();

    const filtered = data.customers.filter(c => 
        c.name.toLowerCase().includes(search) || 
        (c.email && c.email.toLowerCase().includes(search))
    );

    dropdown.innerHTML = filtered.map(c => `
        <div class="customer-dropdown-item" onclick="selectCustomer('${c.id}')">
            <strong>${c.name}</strong><br>
            <small>${c.email || ''}</small>
        </div>
    `).join('');

    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="customer-dropdown-item" style="color: #888;">No customers found</div>';
    }

    dropdown.classList.add('show');
}

function selectCustomer(id) {
    const customer = data.customers.find(c => c.id === id);
    if (customer) {
        document.getElementById('customer-search').value = customer.name;
        document.getElementById('selected-customer-id').value = id;
    }
    document.getElementById('customer-dropdown').classList.remove('show');
}

// Receipt Voucher Customer Search
function setupRvCustomerSearch() {
    const input = document.getElementById('rv-customer-search');
    const dropdown = document.getElementById('rv-customer-dropdown');
    if (!input || !dropdown) return;

    input.addEventListener('focus', () => showRvCustomerDropdown());
    input.addEventListener('input', () => showRvCustomerDropdown());

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#receipt-voucher-modal .customer-select-wrapper')) {
            dropdown.classList.remove('show');
        }
    });
}

function showRvCustomerDropdown() {
    const input = document.getElementById('rv-customer-search');
    const dropdown = document.getElementById('rv-customer-dropdown');
    if (!input || !dropdown) return;
    const search = input.value.toLowerCase();

    const filtered = (data.customers || []).filter(c => 
        c.name.toLowerCase().includes(search) || 
        (c.email && c.email.toLowerCase().includes(search))
    );

    dropdown.innerHTML = filtered.map(c => `
        <div class="customer-dropdown-item" onclick="selectRvCustomer('${c.id}')">
            <strong>${c.name}</strong><br>
            <small>${c.email || ''}</small>
        </div>
    `).join('');

    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="customer-dropdown-item" style="color: #888;">No customers found</div>';
    }

    dropdown.classList.add('show');
}

function selectRvCustomer(id) {
    const customer = (data.customers || []).find(c => c.id === id);
    if (customer) {
        document.getElementById('rv-customer-search').value = customer.name;
        document.getElementById('rv-selected-customer-id').value = id;
    }
    document.getElementById('rv-customer-dropdown').classList.remove('show');
}

// Line Items & Product Autocomplete Search (Matching Customer Search)
function addLineItem(item = null) {
    const tbody = document.getElementById('line-items-body');
    const row = document.createElement('tr');
    const currency = data.company.currency || 'AED';

    let serials = [];
    if (item) {
        if (Array.isArray(item.serialNumbers) && item.serialNumbers.length > 0) {
            serials = item.serialNumbers;
        } else if (item.serialNumber) {
            serials = item.serialNumber.split(',').map(s => s.trim()).filter(Boolean);
        }
    }

    const initialQty = item && item.quantity ? Math.max(1, parseInt(item.quantity)) : 1;

    row.innerHTML = `
        <td>
            <div class="product-select-wrapper">
                <input type="text" class="item-description" placeholder="Search or type product description..." value="${item ? item.description : ''}" onfocus="showProductDropdown(this)" oninput="showProductDropdown(this); calculateTotals();" autocomplete="off">
                <div class="product-dropdown"></div>
            </div>
        </td>
        <td style="min-width: 170px;">
            <div class="serials-container" style="display: flex; flex-direction: column; gap: 4px;">
                <!-- Serial inputs rendered dynamically according to quantity -->
            </div>
        </td>
        <td>
            <input type="number" class="qty-input" min="1" value="${initialQty}" oninput="updateSerialInputs(this); calculateTotals();">
        </td>
        <td>
            <input type="number" class="price-input" min="0" step="0.01" value="${item ? item.price : ''}" placeholder="0.00" oninput="calculateTotals()">
        </td>
        <td class="total-cell">${currency} 0.00</td>
        <td>
            <button type="button" class="remove-line-btn" onclick="removeLine(this)">×</button>
        </td>
    `;

    tbody.appendChild(row);
    renderSerialInputs(row, serials, initialQty);
    calculateTotals();
}

function updateSerialInputs(qtyInput) {
    const row = qtyInput.closest('tr');
    if (!row) return;
    const qty = Math.max(1, parseInt(qtyInput.value) || 1);
    
    const existingInputs = row.querySelectorAll('.serial-input');
    const serials = [];
    existingInputs.forEach(inp => serials.push(inp.value));

    renderSerialInputs(row, serials, qty);
}

function renderSerialInputs(row, serials, qty) {
    const container = row.querySelector('.serials-container');
    if (!container) return;

    let html = '';
    for (let i = 0; i < qty; i++) {
        const val = serials[i] || '';
        const placeholder = qty > 1 ? `S/N #${i + 1}` : 'S/N or Barcode';
        html += `
            <div style="display: flex; gap: 4px; align-items: center;">
                <input type="text" class="serial-input" placeholder="${placeholder}" value="${val}" style="font-size: 0.82rem; padding: 5px 6px; width: 100%;">
                <button type="button" class="btn scan-camera-btn" style="background: #16a34a; color: #ffffff; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;" title="Scan Barcode / QR with Camera" onclick="openCameraScanner(this)">
                    <svg width="15" height="15" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path></svg>
                </button>
            </div>
        `;
    }
    container.innerHTML = html;
}

function showProductDropdown(input) {
    const wrapper = input.closest('.product-select-wrapper');
    const dropdown = wrapper.querySelector('.product-dropdown');
    const search = input.value.toLowerCase().trim();

    const filtered = (data.products || []).filter(p => 
        p.name.toLowerCase().includes(search) || 
        (p.description && p.description.toLowerCase().includes(search))
    );

    if (filtered.length === 0) {
        if (!data.products || data.products.length === 0) {
            dropdown.innerHTML = '<div class="product-dropdown-item" style="color: #888;">No products saved yet</div>';
        } else {
            dropdown.innerHTML = '<div class="product-dropdown-item" style="color: #888;">No matching products</div>';
        }
    } else {
        const currency = data.company.currency || 'AED';
        dropdown.innerHTML = filtered.map(p => `
            <div class="product-dropdown-item" onmousedown="selectProduct(this, '${p.id}')">
                <strong>${p.name}</strong><br>
                <small style="color: #0284c7; font-weight: 600;">${currency} ${parseFloat(p.price).toFixed(2)}</small>
            </div>
        `).join('');
    }

    dropdown.classList.add('show');
}

function selectProduct(itemElem, productId) {
    const product = (data.products || []).find(p => p.id === productId);
    if (!product) return;

    const row = itemElem.closest('tr');
    const descInput = row.querySelector('.item-description');
    const priceInput = row.querySelector('.price-input');

    descInput.value = product.name;
    priceInput.value = product.price;

    const dropdown = row.querySelector('.product-dropdown');
    if (dropdown) dropdown.classList.remove('show');

    calculateTotals();
}

// Global click listener to close product dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.product-select-wrapper')) {
        document.querySelectorAll('.product-dropdown').forEach(d => d.classList.remove('show'));
    }
});

function removeLine(btn) {
    const tbody = document.getElementById('line-items-body');
    if (tbody.children.length > 1) {
        btn.closest('tr').remove();
        calculateTotals();
    }
}

function calculateTotals() {
    const currency = data.company.currency || '$';
    const taxRate = data.company.taxRate || 0;
    let subtotal = 0;

    document.querySelectorAll('#line-items-body tr').forEach(row => {
        const qty = parseFloat(row.querySelector('.qty-input').value) || 0;
        const price = parseFloat(row.querySelector('.price-input').value) || 0;
        const total = qty * price;
        subtotal += total;
        row.querySelector('.total-cell').textContent = `${currency}${total.toFixed(2)}`;
    });

    const tax = subtotal * (taxRate / 100);
    const grandTotal = subtotal + tax;

    document.getElementById('subtotal').textContent = `${currency}${subtotal.toFixed(2)}`;
    document.getElementById('tax-amount').textContent = `${currency}${tax.toFixed(2)}`;
    document.getElementById('grand-total').textContent = `${currency}${grandTotal.toFixed(2)}`;
}

function saveDocument() {
    const type = document.getElementById('doc-type').value;
    const docId = document.getElementById('doc-id').value;
    const customerId = document.getElementById('selected-customer-id').value;

    if (!customerId) {
        alert('Please select a customer');
        return;
    }

    // Collect line items
    const items = [];
    document.querySelectorAll('#line-items-body tr').forEach(row => {
        const description = row.querySelector('.item-description').value;
        const serialInputs = row.querySelectorAll('.serial-input');
        const serialNumbers = [];
        serialInputs.forEach(inp => {
            if (inp.value.trim()) serialNumbers.push(inp.value.trim());
        });
        const serialNumber = serialNumbers.join(', ');
        const quantity = parseFloat(row.querySelector('.qty-input').value) || 0;
        const price = parseFloat(row.querySelector('.price-input').value) || 0;
        if (description && quantity > 0) {
            items.push({ description, serialNumber, serialNumbers, quantity, price, total: quantity * price });
        }
    });

    if (items.length === 0) {
        alert('Please add at least one line item');
        return;
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = data.company.taxRate || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const doc = {
        id: docId || Date.now().toString(),
        number: document.getElementById('doc-number').value,
        date: document.getElementById('doc-date').value,
        customerId,
        items,
        subtotal,
        tax,
        total,
        notes: document.getElementById('doc-notes').value,
        status: 'draft',
        createdAt: new Date().toISOString()
    };

    if (type === 'quotation') {
        doc.validUntil = document.getElementById('doc-valid-until').value;
        if (docId) {
            const index = data.quotations.findIndex(d => d.id === docId);
            doc.status = data.quotations[index].status;
            data.quotations[index] = doc;
        } else {
            data.quotations.push(doc);
            data.counters.quotation++;
        }
    } else if (type === 'delivery') {
        doc.reference = document.getElementById('doc-reference').value;
        doc.status = 'pending';
        if (docId) {
            const index = data.deliveryNotes.findIndex(d => d.id === docId);
            doc.status = data.deliveryNotes[index].status;
            data.deliveryNotes[index] = doc;
        } else {
            data.deliveryNotes.push(doc);
            data.counters.delivery++;
        }
    } else {
        doc.dueDate = document.getElementById('doc-due-date').value;
        doc.reference = document.getElementById('doc-reference').value;
        doc.status = 'pending';
        if (docId) {
            const index = data.invoices.findIndex(d => d.id === docId);
            doc.status = data.invoices[index].status;
            data.invoices[index] = doc;
        } else {
            data.invoices.push(doc);
            data.counters.invoice++;
        }
    }

    saveData();
    refreshAllTables();
    updateDashboard();
    closeModal('document-modal');
}

// Update status
function updateStatus(type, id, newStatus) {
    let list;
    if (type === 'quotation') list = data.quotations;
    else if (type === 'delivery') list = data.deliveryNotes;
    else list = data.invoices;

    const doc = list.find(d => d.id === id);
    if (doc) {
        doc.status = newStatus;
        saveData();
        refreshAllTables();
        updateDashboard();
    }
}

// Delete document
function deleteDocument(type, id) {
    if (!confirm('Delete this document?')) return;

    if (type === 'quotation') data.quotations = (data.quotations || []).filter(d => d.id !== id);
    else if (type === 'delivery') data.deliveryNotes = (data.deliveryNotes || []).filter(d => d.id !== id);
    else if (type === 'receiptVoucher') data.receiptVouchers = (data.receiptVouchers || []).filter(d => d.id !== id);
    else data.invoices = (data.invoices || []).filter(d => d.id !== id);

    syncCounters();
    saveData();
    refreshAllTables();
    updateDashboard();
}

function deleteReceiptVoucher(id) {
    deleteDocument('receiptVoucher', id);
}

// Preview document
function previewDocument(type, id) {
    if (type === 'receiptVoucher') {
        const rv = (data.receiptVouchers || []).find(r => r.id === id);
        if (!rv) return;
        window.currentPreviewDocNumber = rv.number || 'Receipt_Voucher';
        const rvCustomer = data.customers.find(c => c.id === rv.customerId);
        const rvCurrency = data.company.currency || 'AED';

        const rvHtml = `
            <div class="document-preview official-cygnus-doc" id="pdf-content">
                <!-- Official Header Image Banner -->
                <div class="doc-header-banner">
                    <img src="assets/cygnus-header.png" alt="Cygnus Technology Systems Header" class="official-header-img">
                </div>

                <!-- Recipient & Meta Section -->
                <div class="doc-parties-grid">
                    <div class="doc-to-box">
                        <div class="to-heading">Received With Thanks From:</div>
                        <div class="client-name"><strong>${rvCustomer ? rvCustomer.name : 'VALUED CUSTOMER'}</strong></div>
                        <div class="client-address">${rvCustomer && rvCustomer.address ? rvCustomer.address.replace(/\n/g, '<br>') : ''}</div>
                        ${rvCustomer && rvCustomer.phone ? `<div class="client-phone">Tel: ${rvCustomer.phone}</div>` : ''}
                        ${rvCustomer && rvCustomer.taxId ? `<div class="client-trn">TRN: ${rvCustomer.taxId}</div>` : ''}
                    </div>
                    <div class="doc-number-box">
                        <div class="doc-type-title">RECEIPT VOUCHER</div>
                        <div class="doc-num-row"># ${rv.number}</div>
                        <div class="doc-date-row"><strong>Date:</strong> ${formatDate(rv.date)}</div>
                    </div>
                </div>

                <!-- Receipt Voucher Details Grid -->
                <table class="official-items-table" style="margin-top: 20px;">
                    <thead>
                        <tr>
                            <th style="width: 35%;">PAYMENT DETAILS</th>
                            <th style="width: 65%;">INFORMATION</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Amount Received:</strong></td>
                            <td style="font-size: 1.1rem; font-weight: 700; color: #0284c7;">${rvCurrency} ${parseFloat(rv.amount).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td><strong>Payment Mode:</strong></td>
                            <td>${rv.paymentMode || 'Cash'}</td>
                        </tr>
                        ${rv.chequeNo ? `
                            <tr>
                                <td><strong>Cheque / Ref No.:</strong></td>
                                <td>${rv.chequeNo}</td>
                            </tr>
                        ` : ''}
                        ${rv.bankName ? `
                            <tr>
                                <td><strong>Bank Name / Date:</strong></td>
                                <td>${rv.bankName}</td>
                            </tr>
                        ` : ''}
                        ${rv.reference ? `
                            <tr>
                                <td><strong>Against Reference:</strong></td>
                                <td>${rv.reference}</td>
                            </tr>
                        ` : ''}
                        <tr>
                            <td><strong>Particulars / Description:</strong></td>
                            <td>${rv.notes || 'Payment received with thanks.'}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Summary Total Badge -->
                <div class="official-totals-wrapper" style="margin-top: 20px;">
                    <div class="official-totals-table" style="width: 320px;">
                        <div class="total-row grand-total">
                            <span class="total-label">TOTAL RECEIVED</span>
                            <span class="total-val">${rvCurrency} ${parseFloat(rv.amount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <!-- Closing Note & Footer Signature Block -->
                <div class="doc-bottom-section" style="margin-top: 40px;">
                    <div class="payment-instructions-card">
                        <div class="payment-header">COMPANY DETAILS:</div>
                        <div class="payment-body" style="font-family: inherit; font-weight: normal; line-height: 1.6;">
                            <strong>CYGNUS TECHNOLOGY SYSTEMS-L.L.C-S.P.C</strong><br>
                            TRN: 105073373000003<br>
                            Abu Dhabi, UAE
                        </div>
                    </div>

                    <div class="signature-stamp-card">
                        <div class="for-label">FOR,</div>
                        <div class="company-sig-name">CYGNUS TECHNOLOGY SYSTEMS-L.L.C-S.P.C</div>
                        <div class="sig-stamp-container">
                            <img src="assets/signature.jpg" alt="Signature" class="sig-image" onerror="this.style.display='none'">
                            <img src="assets/stamp.jpg" alt="Stamp" class="stamp-image" onerror="this.style.display='none'">
                        </div>
                        <div class="sig-title">AUTHORIZED SIGNATURE</div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('document-preview-content').innerHTML = rvHtml;
        openModal('preview-modal');
        return;
    }

    let doc;
    if (type === 'quotation') doc = data.quotations.find(d => d.id === id);
    else if (type === 'delivery') doc = data.deliveryNotes.find(d => d.id === id);
    else doc = data.invoices.find(d => d.id === id);

    if (!doc) return;
    window.currentPreviewDocNumber = doc.number || 'CYGNUS_Document';

    const customer = data.customers.find(c => c.id === doc.customerId);
    const currency = data.company.currency || 'AED';
    const taxRate = data.company.taxRate !== undefined ? data.company.taxRate : 5;

    const docTitles = { quotation: 'QUOTATION', delivery: 'DELIVERY NOTE', invoice: 'INVOICE' };

    let extraInfo = '';
    if (type === 'quotation' && doc.validUntil) {
        extraInfo = `<div class="doc-meta-row"><strong>Valid Until:</strong> ${formatDate(doc.validUntil)}</div>`;
    } else if (type === 'invoice' && doc.dueDate) {
        extraInfo = `<div class="doc-meta-row"><strong>Due Date:</strong> ${formatDate(doc.dueDate)}</div>`;
    }
    if (doc.reference) {
        extraInfo += `<div class="doc-meta-row"><strong>Ref:</strong> ${doc.reference}</div>`;
    }

    let introHtml = `<p><strong>Dear Sir/Mam,</strong></p><p>Thank you for your valuable inquiry. We are pleased to quote as follows:</p>`;
    let closingHtml = `<p class="closing-msg">We hope our offer aligns with your requirements.</p>`;

    if (type === 'invoice') {
        introHtml = `<p><strong>Dear Sir/Mam,</strong></p><p>Thank you for your business. Please find your tax invoice details as follows:</p>`;
    } else if (type === 'delivery') {
        introHtml = `<p><strong>Dear Sir/Mam,</strong></p><p>Please receive the following items in good order and condition:</p>`;
        closingHtml = `<p class="closing-msg">Please inspect items upon receipt and acknowledge delivery.</p>`;
    }

    let leftFooterCard = `
        <div class="payment-instructions-card">
            <div class="payment-header">PAYMENT INSTRUCTIONS:</div>
            <div class="payment-body">
                ADCB<br>
                CYGNUS TECHNOLOGY SYSTEMS-L.L.C-S.P.C<br>
                12154222820001<br>
                IBD-AL HOSN BRANCH<br>
                AE280030012154222820001
            </div>
        </div>
    `;

    if (type === 'delivery') {
        leftFooterCard = `
            <div class="payment-instructions-card">
                <div class="payment-header">CUSTOMER ACKNOWLEDGEMENT:</div>
                <div class="payment-body" style="font-family: inherit; font-weight: normal; margin-top: 20px; line-height: 1.8;">
                    Received By: ____________________<br>
                    Signature & Stamp: ____________________
                </div>
            </div>
        `;
    }

    const html = `
        <div class="document-preview official-cygnus-doc" id="pdf-content">
            <!-- Official Header Image Banner -->
            <div class="doc-header-banner">
                <img src="assets/cygnus-header.png" alt="Cygnus Technology Systems Header" class="official-header-img">
            </div>

            <!-- Recipient & Meta Section -->
            <div class="doc-parties-grid">
                <div class="doc-to-box">
                    <div class="to-heading">To,</div>
                    <div class="client-name"><strong>${customer ? customer.name : 'VALUED CUSTOMER'}</strong></div>
                    <div class="client-address">${customer && customer.address ? customer.address.replace(/\n/g, '<br>') : ''}</div>
                    ${customer && customer.phone ? `<div class="client-phone">Tel: ${customer.phone}</div>` : ''}
                    ${customer && customer.taxId ? `<div class="client-trn">TRN: ${customer.taxId}</div>` : ''}
                </div>
                <div class="doc-number-box">
                    <div class="doc-type-title">${docTitles[type]}</div>
                    <div class="doc-num-row"># ${doc.number}</div>
                    <div class="doc-date-row"><strong>Date:</strong> ${formatDate(doc.date)}</div>
                    ${extraInfo}
                </div>
            </div>

            <!-- Inquiry / Salutation -->
            <div class="doc-intro">
                ${introHtml}
            </div>

            <!-- Itemized Table -->
            <table class="official-items-table">
                <thead>
                    <tr>
                        <th style="width: 6%; text-align: center;">#</th>
                        <th style="width: 44%;">DESCRIPTION</th>
                        <th style="width: 10%; text-align: center;">QTY</th>
                        <th style="width: 13%; text-align: right;">PRICE</th>
                        <th style="width: 13%; text-align: right;">VAT (${taxRate}%)</th>
                        <th style="width: 14%; text-align: right;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${doc.items.map((item, i) => {
                        const lineSubtotal = item.quantity * item.price;
                        const lineVatUnit = item.price * (taxRate / 100);
                        const lineVatTotal = lineSubtotal * (taxRate / 100);
                        const lineGrandTotal = lineSubtotal + lineVatTotal;
                        return `
                            <tr>
                                <td style="text-align: center;">${i + 1}.</td>
                                <td>
                                    <div>${item.description}</div>
                                    ${(() => {
                                        const serialList = Array.isArray(item.serialNumbers) && item.serialNumbers.length > 0
                                            ? item.serialNumbers
                                            : (item.serialNumber ? item.serialNumber.split(',').map(s => s.trim()).filter(Boolean) : []);
                                        if (serialList.length > 0) {
                                            return `<div style="font-size: 0.8rem; color: #475569; margin-top: 3px; font-weight: 500;"><strong>S/N:</strong> ${serialList.join(', ')}</div>`;
                                        }
                                        return '';
                                    })()}
                                </td>
                                <td style="text-align: center;">${item.quantity}</td>
                                <td style="text-align: right;">${currency} ${item.price.toFixed(2)}</td>
                                <td style="text-align: right;">${currency} ${lineVatUnit.toFixed(2)}</td>
                                <td style="text-align: right;">${currency} ${lineGrandTotal.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <!-- Summary Totals -->
            <div class="official-totals-wrapper">
                <div class="official-totals-table">
                    <div class="total-row">
                        <span class="total-label">SUB TOTAL</span>
                        <span class="total-val">${currency} ${doc.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">VAT</span>
                        <span class="total-val">${currency} ${doc.tax.toFixed(2)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span class="total-label">GRAND TOTAL</span>
                        <span class="total-val">${currency} ${doc.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <!-- Closing Note & Warranty -->
            <div class="doc-closing-block">
                ${closingHtml}
                <div class="warranty-text">
                    <strong>Warranty:</strong> ${data.company.terms || 'The new hardware is covered for 1 year. Software or service will be limited.'}
                </div>
            </div>

            <!-- Payment Instructions / Ack & Stamp/Signature Footer -->
            <div class="doc-bottom-section">
                ${leftFooterCard}

                <div class="signature-stamp-card">
                    <div class="for-label">FOR,</div>
                    <div class="company-sig-name">CYGNUS TECHNOLOGY SYSTEMS-L.L.C-S.P.C</div>
                    <div class="sig-stamp-container">
                        <img src="assets/signature.jpg" alt="Signature" class="sig-image" onerror="this.style.display='none'">
                        <img src="assets/stamp.jpg" alt="Stamp" class="stamp-image" onerror="this.style.display='none'">
                    </div>
                    <div class="sig-title">AUTHORIZED SIGNATURE</div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('document-preview-content').innerHTML = html;
    openModal('preview-modal');
}

function printDocument() {
    window.print();
}

function downloadPDF() {
    const element = document.getElementById('pdf-content');
    const filename = window.currentPreviewDocNumber ? `${window.currentPreviewDocNumber}.pdf` : 'CYGNUS_Document.pdf';
    const opt = {
        margin: [0, 0, 0, 0],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
}

// Convert quote to invoice
function convertToInvoice(quotationId) {
    const quote = data.quotations.find(d => d.id === quotationId);
    if (!quote) return;

    // Create invoice from quotation
    const invoice = {
        id: Date.now().toString(),
        number: `CYG-INV-OP-26-${String(data.counters.invoice).padStart(4, '0')}`,
        date: new Date().toISOString().split('T')[0],
        dueDate: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            return d.toISOString().split('T')[0];
        })(),
        customerId: quote.customerId,
        items: [...quote.items],
        subtotal: quote.subtotal,
        tax: quote.tax,
        total: quote.total,
        reference: quote.number,
        notes: quote.notes,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    data.invoices.push(invoice);
    data.counters.invoice++;
    quote.status = 'accepted';
    saveData();
    refreshAllTables();
    updateDashboard();
    alert(`Invoice ${invoice.number} created from quotation!`);
}

// Convert quote to delivery note
function convertToDeliveryNote(quotationId) {
    const quote = data.quotations.find(d => d.id === quotationId);
    if (!quote) return;

    // Create delivery note from quotation
    const deliveryNote = {
        id: Date.now().toString(),
        number: `CYG-DN-OP-26-${String(data.counters.delivery).padStart(4, '0')}`,
        date: new Date().toISOString().split('T')[0],
        customerId: quote.customerId,
        items: [...quote.items],
        subtotal: quote.subtotal,
        tax: quote.tax,
        total: quote.total,
        reference: quote.number,
        notes: quote.notes,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    data.deliveryNotes.push(deliveryNote);
    data.counters.delivery++;
    saveData();
    refreshAllTables();
    updateDashboard();
    alert(`Delivery Note ${deliveryNote.number} created from quotation!`);
}

// Refresh tables
function refreshAllTables() {
    refreshCustomersTable();
    refreshProductsTable();
    refreshQuotationsTable();
    refreshDeliveryNotesTable();
    refreshInvoicesTable();
    refreshReceiptVouchersTable();
    populateSOASelect();
    generateCustomerSOA();
    generateVATReport();
    generateFinancialLedger();
}

// ==========================================
// STATEMENTS & TAX REPORTING MODULE
// ==========================================

let activeStatementTab = 'soa';
function switchStatementTab(tabName) {
    activeStatementTab = tabName;
    document.querySelectorAll('.tab[data-stmt-tab]').forEach(tab => {
        if (tab.dataset.stmtTab === tabName) tab.classList.add('active');
        else tab.classList.remove('active');
    });

    document.querySelectorAll('.stmt-tab-content').forEach(content => {
        content.style.display = 'none';
    });

    const target = document.getElementById(`stmt-tab-${tabName}`);
    if (target) target.style.display = 'block';

    if (tabName === 'soa') generateCustomerSOA();
    else if (tabName === 'vat') generateVATReport();
    else if (tabName === 'ledger') generateFinancialLedger();
}

function populateSOASelect() {
    const select = document.getElementById('soa-customer-select');
    if (!select) return;

    const currentVal = select.value;
    const customers = data.customers || [];

    select.innerHTML = '<option value="">-- All Customers (Overall SOA) --</option>' +
        customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (currentVal) select.value = currentVal;
}

function generateCustomerSOA() {
    const customerId = document.getElementById('soa-customer-select')?.value;
    const fromDate = document.getElementById('soa-from-date')?.value;
    const toDate = document.getElementById('soa-to-date')?.value;
    const tbody = document.getElementById('soa-table-body');
    const currency = data.company.currency || 'AED';

    if (!tbody) return;

    let invoices = data.invoices || [];
    let receipts = data.receiptVouchers || [];

    if (customerId) {
        invoices = invoices.filter(i => i.customerId === customerId);
        receipts = receipts.filter(r => r.customerId === customerId);
    }

    if (fromDate) {
        invoices = invoices.filter(i => i.date >= fromDate);
        receipts = receipts.filter(r => r.date >= fromDate);
    }

    if (toDate) {
        invoices = invoices.filter(i => i.date <= toDate);
        receipts = receipts.filter(r => r.date <= toDate);
    }

    const transactions = [
        ...invoices.map(i => ({
            date: i.date,
            type: 'Invoice',
            number: i.number,
            notes: i.notes || `Invoice for ${i.items ? i.items.length : 0} item(s)`,
            debit: parseFloat(i.total) || 0,
            credit: 0,
            id: i.id
        })),
        ...receipts.map(r => ({
            date: r.date,
            type: 'Receipt Voucher',
            number: r.number,
            notes: `${r.paymentMode || 'Payment'} ${r.chequeNo ? ' - ' + r.chequeNo : ''} (${r.notes || r.reference || 'Received'})`,
            debit: 0,
            credit: parseFloat(r.amount) || 0,
            id: r.id
        }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    let totalInvoiced = 0;
    let totalReceived = 0;

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #888;">No statement transactions found for selected filters</td></tr>';
        document.getElementById('soa-total-invoiced').textContent = `${currency} 0.00`;
        document.getElementById('soa-total-received').textContent = `${currency} 0.00`;
        document.getElementById('soa-closing-balance').textContent = `${currency} 0.00`;
        return;
    }

    const rowsHtml = transactions.map(t => {
        runningBalance += (t.debit - t.credit);
        totalInvoiced += t.debit;
        totalReceived += t.credit;

        const typeBadge = t.type === 'Invoice' 
            ? '<span class="status-badge" style="background:#e0f2fe; color:#0369a1;">Invoice</span>'
            : '<span class="status-badge" style="background:#dcfce7; color:#15803d;">Receipt</span>';

        return `
            <tr>
                <td>${formatDate(t.date)}</td>
                <td>${typeBadge}</td>
                <td><strong>${t.number}</strong></td>
                <td>${t.notes}</td>
                <td style="text-align: right; color: ${t.debit > 0 ? '#0f172a' : '#94a3b8'}; font-weight: ${t.debit > 0 ? '600' : 'normal'};">
                    ${t.debit > 0 ? `${currency} ${t.debit.toFixed(2)}` : '-'}
                </td>
                <td style="text-align: right; color: ${t.credit > 0 ? '#16a34a' : '#94a3b8'}; font-weight: ${t.credit > 0 ? '600' : 'normal'};">
                    ${t.credit > 0 ? `${currency} ${t.credit.toFixed(2)}` : '-'}
                </td>
                <td style="text-align: right; font-weight: 700; color: ${runningBalance > 0 ? '#d97706' : '#16a34a'};">
                    ${currency} ${runningBalance.toFixed(2)}
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    document.getElementById('soa-total-invoiced').textContent = `${currency} ${totalInvoiced.toFixed(2)}`;
    document.getElementById('soa-total-received').textContent = `${currency} ${totalReceived.toFixed(2)}`;
    document.getElementById('soa-closing-balance').textContent = `${currency} ${runningBalance.toFixed(2)}`;
}

function applyVATPeriodFilter() {
    const period = document.getElementById('vat-period-select')?.value;
    const fromInput = document.getElementById('vat-from-date');
    const toInput = document.getElementById('vat-to-date');

    if (!fromInput || !toInput) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (period === 'all') {
        fromInput.value = '';
        toInput.value = '';
    } else if (period === 'this-month') {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        fromInput.value = firstDay.toISOString().split('T')[0];
        toInput.value = lastDay.toISOString().split('T')[0];
    } else if (period === 'last-month') {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        fromInput.value = firstDay.toISOString().split('T')[0];
        toInput.value = lastDay.toISOString().split('T')[0];
    } else if (period === 'this-quarter') {
        const quarterMonth = Math.floor(month / 3) * 3;
        const firstDay = new Date(year, quarterMonth, 1);
        const lastDay = new Date(year, quarterMonth + 3, 0);
        fromInput.value = firstDay.toISOString().split('T')[0];
        toInput.value = lastDay.toISOString().split('T')[0];
    } else if (period === 'this-year') {
        const firstDay = new Date(year, 0, 1);
        const lastDay = new Date(year, 11, 31);
        fromInput.value = firstDay.toISOString().split('T')[0];
        toInput.value = lastDay.toISOString().split('T')[0];
    }

    generateVATReport();
}

function generateVATReport() {
    const fromDate = document.getElementById('vat-from-date')?.value;
    const toDate = document.getElementById('vat-to-date')?.value;
    const tbody = document.getElementById('vat-table-body');
    const currency = data.company.currency || 'AED';

    if (!tbody) return;

    let invoices = data.invoices || [];

    if (fromDate) invoices = invoices.filter(i => i.date >= fromDate);
    if (toDate) invoices = invoices.filter(i => i.date <= toDate);

    let totalTaxable = 0;
    let totalVAT = 0;
    let totalGross = 0;

    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #888;">No invoices found for selected tax period</td></tr>';
        document.getElementById('vat-taxable-sales').textContent = `${currency} 0.00`;
        document.getElementById('vat-tax-collected').textContent = `${currency} 0.00`;
        document.getElementById('vat-gross-invoiced').textContent = `${currency} 0.00`;
        return;
    }

    tbody.innerHTML = invoices.map(i => {
        const customer = (data.customers || []).find(c => c.id === i.customerId);
        const subtotal = parseFloat(i.subtotal) || 0;
        const tax = parseFloat(i.tax) || 0;
        const total = parseFloat(i.total) || 0;

        totalTaxable += subtotal;
        totalVAT += tax;
        totalGross += total;

        return `
            <tr>
                <td><strong>${i.number}</strong></td>
                <td>${formatDate(i.date)}</td>
                <td>${customer ? customer.name : 'Unknown'}</td>
                <td>${customer && customer.taxId ? customer.taxId : '-'}</td>
                <td style="text-align: right;">${currency} ${subtotal.toFixed(2)}</td>
                <td style="text-align: right;"><span class="status-badge" style="background:#fef3c7; color:#b45309;">5%</span></td>
                <td style="text-align: right; font-weight: 700; color: #0284c7;">${currency} ${tax.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 700;">${currency} ${total.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    document.getElementById('vat-taxable-sales').textContent = `${currency} ${totalTaxable.toFixed(2)}`;
    document.getElementById('vat-tax-collected').textContent = `${currency} ${totalVAT.toFixed(2)}`;
    document.getElementById('vat-gross-invoiced').textContent = `${currency} ${totalGross.toFixed(2)}`;
}

function generateFinancialLedger() {
    const tbody = document.getElementById('ledger-table-body');
    const currency = data.company.currency || 'AED';
    if (!tbody) return;

    const invoices = data.invoices || [];
    const receipts = data.receiptVouchers || [];

    const months = {};

    invoices.forEach(i => {
        if (!i.date) return;
        const monthKey = i.date.substring(0, 7);
        if (!months[monthKey]) {
            months[monthKey] = { invoicesCount: 0, subtotal: 0, tax: 0, total: 0, receipts: 0 };
        }
        months[monthKey].invoicesCount++;
        months[monthKey].subtotal += (parseFloat(i.subtotal) || 0);
        months[monthKey].tax += (parseFloat(i.tax) || 0);
        months[monthKey].total += (parseFloat(i.total) || 0);
    });

    receipts.forEach(r => {
        if (!r.date) return;
        const monthKey = r.date.substring(0, 7);
        if (!months[monthKey]) {
            months[monthKey] = { invoicesCount: 0, subtotal: 0, tax: 0, total: 0, receipts: 0 };
        }
        months[monthKey].receipts += (parseFloat(r.amount) || 0);
    });

    const monthKeys = Object.keys(months).sort().reverse();

    if (monthKeys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #888;">No financial monthly data available</td></tr>';
        return;
    }

    tbody.innerHTML = monthKeys.map(key => {
        const m = months[key];
        const dateObj = new Date(key + '-01');
        const monthLabel = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        const netReceivable = m.total - m.receipts;

        return `
            <tr>
                <td><strong>${monthLabel}</strong></td>
                <td style="text-align: right;">${m.invoicesCount}</td>
                <td style="text-align: right;">${currency} ${m.subtotal.toFixed(2)}</td>
                <td style="text-align: right; color: #0284c7; font-weight: 600;">${currency} ${m.tax.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 700;">${currency} ${m.total.toFixed(2)}</td>
                <td style="text-align: right; color: #16a34a; font-weight: 600;">${currency} ${m.receipts.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 700; color: ${netReceivable > 0 ? '#d97706' : '#16a34a'};">
                    ${currency} ${netReceivable.toFixed(2)}
                </td>
            </tr>
        `;
    }).join('');
}

function printActiveStatement() {
    const currency = data.company.currency || 'AED';
    const comp = data.company;

    let contentHtml = '';

    if (activeStatementTab === 'soa') {
        const customerId = document.getElementById('soa-customer-select')?.value;
        const customer = (data.customers || []).find(c => c.id === customerId);
        const fromDate = document.getElementById('soa-from-date')?.value;
        const toDate = document.getElementById('soa-to-date')?.value;

        const tableBody = document.getElementById('soa-table-body')?.innerHTML || '';

        contentHtml = `
            <div class="document-preview official-cygnus-doc" id="pdf-content">
                <div class="doc-header-banner">
                    <img src="assets/cygnus-header.png" alt="Cygnus Technology Systems Header" class="official-header-img">
                </div>

                <div class="doc-parties-grid" style="margin-top: 15px;">
                    <div class="doc-to-box">
                        <div class="to-heading">Statement Issued To:</div>
                        <div class="client-name"><strong>${customer ? customer.name : 'ALL CUSTOMERS SUMMARY'}</strong></div>
                        <div class="client-address">${customer && customer.address ? customer.address.replace(/\n/g, '<br>') : 'All Customer Accounts'}</div>
                        ${customer && customer.phone ? `<div class="client-phone">Tel: ${customer.phone}</div>` : ''}
                        ${customer && customer.taxId ? `<div class="client-trn">TRN: ${customer.taxId}</div>` : ''}
                    </div>
                    <div class="doc-number-box">
                        <div class="doc-type-title">STATEMENT OF ACCOUNT</div>
                        <div class="doc-num-row">Date: ${formatDate(new Date().toISOString())}</div>
                        ${fromDate || toDate ? `<div class="doc-date-row">Period: ${formatDate(fromDate)} to ${formatDate(toDate)}</div>` : ''}
                    </div>
                </div>

                <table class="official-items-table" style="margin-top: 25px;">
                    <thead>
                        <tr>
                            <th>DATE</th>
                            <th>TYPE</th>
                            <th>REFERENCE #</th>
                            <th>DETAILS</th>
                            <th style="text-align: right;">DEBIT (${currency})</th>
                            <th style="text-align: right;">CREDIT (${currency})</th>
                            <th style="text-align: right;">BALANCE (${currency})</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableBody}
                    </tbody>
                </table>

                <div class="doc-bottom-section">
                    <div class="payment-instructions-card">
                        <div class="payment-header">COMPANY TAX & BANK INFO:</div>
                        <div class="payment-body">
                            TRN: ${comp.tax}<br>
                            ${comp.bank ? comp.bank.replace(/\n/g, '<br>') : ''}
                        </div>
                    </div>
                    <div class="signature-stamp-card">
                        <div class="for-label">For ${comp.name}</div>
                        <div class="sig-stamp-container">
                            <img src="assets/signature.png" alt="Signature" class="sig-image">
                            <img src="assets/stamp.png" alt="Stamp" class="stamp-image">
                        </div>
                        <div class="sig-title">Authorized Accounts Signature</div>
                    </div>
                </div>
            </div>
        `;
    } else if (activeStatementTab === 'vat') {
        const fromDate = document.getElementById('vat-from-date')?.value;
        const toDate = document.getElementById('vat-to-date')?.value;
        const tableBody = document.getElementById('vat-table-body')?.innerHTML || '';

        contentHtml = `
            <div class="document-preview official-cygnus-doc" id="pdf-content">
                <div class="doc-header-banner">
                    <img src="assets/cygnus-header.png" alt="Cygnus Technology Systems Header" class="official-header-img">
                </div>

                <div class="doc-parties-grid" style="margin-top: 15px;">
                    <div class="doc-to-box">
                        <div class="to-heading">Tax Audit Statement (UAE FTA 5% VAT)</div>
                        <div class="client-name"><strong>${comp.name}</strong></div>
                        <div class="client-trn">Company TRN: ${comp.tax}</div>
                        <div class="client-address">${comp.address ? comp.address.replace(/\n/g, '<br>') : ''}</div>
                    </div>
                    <div class="doc-number-box">
                        <div class="doc-type-title">VAT AUDIT REPORT</div>
                        <div class="doc-num-row">Generated: ${formatDate(new Date().toISOString())}</div>
                        ${fromDate || toDate ? `<div class="doc-date-row">Period: ${formatDate(fromDate)} to ${formatDate(toDate)}</div>` : ''}
                    </div>
                </div>

                <table class="official-items-table" style="margin-top: 25px;">
                    <thead>
                        <tr>
                            <th>INVOICE #</th>
                            <th>DATE</th>
                            <th>CUSTOMER</th>
                            <th>TRN</th>
                            <th style="text-align: right;">TAXABLE</th>
                            <th style="text-align: right;">RATE</th>
                            <th style="text-align: right;">VAT (5%)</th>
                            <th style="text-align: right;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableBody}
                    </tbody>
                </table>

                <div class="doc-bottom-section">
                    <div class="payment-instructions-card">
                        <div class="payment-header">AUDIT SUMMARY:</div>
                        <div class="payment-body">
                            Taxable Sales: ${document.getElementById('vat-taxable-sales')?.textContent || '0.00'}<br>
                            VAT Collected: ${document.getElementById('vat-tax-collected')?.textContent || '0.00'}<br>
                            Gross Total: ${document.getElementById('vat-gross-invoiced')?.textContent || '0.00'}
                        </div>
                    </div>
                    <div class="signature-stamp-card">
                        <div class="for-label">For ${comp.name}</div>
                        <div class="sig-stamp-container">
                            <img src="assets/signature.png" alt="Signature" class="sig-image">
                            <img src="assets/stamp.png" alt="Stamp" class="stamp-image">
                        </div>
                        <div class="sig-title">Authorized Auditor / Accountant</div>
                    </div>
                </div>
            </div>
        `;
    } else {
        const tableBody = document.getElementById('ledger-table-body')?.innerHTML || '';

        contentHtml = `
            <div class="document-preview official-cygnus-doc" id="pdf-content">
                <div class="doc-header-banner">
                    <img src="assets/cygnus-header.png" alt="Cygnus Technology Systems Header" class="official-header-img">
                </div>

                <div style="margin-top: 15px; margin-bottom: 20px;">
                    <h2 style="color: #0284c7; text-transform: uppercase;">Financial Summary & Accounting Ledger</h2>
                    <p style="color: #64748b; font-size: 0.9rem;">Company: ${comp.name} (TRN: ${comp.tax})</p>
                </div>

                <table class="official-items-table">
                    <thead>
                        <tr>
                            <th>MONTH / PERIOD</th>
                            <th style="text-align: right;">INVOICES</th>
                            <th style="text-align: right;">SALES (${currency})</th>
                            <th style="text-align: right;">VAT (${currency})</th>
                            <th style="text-align: right;">TOTAL (${currency})</th>
                            <th style="text-align: right;">COLLECTIONS (${currency})</th>
                            <th style="text-align: right;">RECEIVABLE (${currency})</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableBody}
                    </tbody>
                </table>
            </div>
        `;
    }

    document.getElementById('document-preview-content').innerHTML = contentHtml;
    openModal('preview-modal');
}

function exportStatementCSV() {
    let csvRows = [];

    if (activeStatementTab === 'soa') {
        csvRows.push(['Date', 'Doc Type', 'Reference', 'Details', 'Debit (Invoiced)', 'Credit (Paid)', 'Running Balance']);
        const trs = document.querySelectorAll('#soa-table-body tr');
        trs.forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length >= 7) {
                csvRows.push([
                    `"${tds[0].innerText.trim()}"`,
                    `"${tds[1].innerText.trim()}"`,
                    `"${tds[2].innerText.trim()}"`,
                    `"${tds[3].innerText.trim()}"`,
                    `"${tds[4].innerText.trim().replace(/[^0-9.-]/g, '')}"`,
                    `"${tds[5].innerText.trim().replace(/[^0-9.-]/g, '')}"`,
                    `"${tds[6].innerText.trim().replace(/[^0-9.-]/g, '')}"`
                ]);
            }
        });
    } else if (activeStatementTab === 'vat') {
        csvRows.push(['Invoice Number', 'Date', 'Customer Name', 'TRN Number', 'Taxable Amount', 'VAT Rate', 'VAT Amount (5%)', 'Total Amount']);
        const trs = document.querySelectorAll('#vat-table-body tr');
        trs.forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length >= 8) {
                csvRows.push([
                    `"${tds[0].innerText.trim()}"`,
                    `"${tds[1].innerText.trim()}"`,
                    `"${tds[2].innerText.trim()}"`,
                    `"${tds[3].innerText.trim()}"`,
                    `"${tds[4].innerText.trim().replace(/[^0-9.-]/g, '')}"`,
                    `"${tds[5].innerText.trim()}"`,
                    `"${tds[6].innerText.trim().replace(/[^0-9.-]/g, '')}"`,
                    `"${tds[7].innerText.trim().replace(/[^0-9.-]/g, '')}"`
                ]);
            }
        });
    } else {
        csvRows.push(['Month / Period', 'Invoices Count', 'Total Sales', 'VAT Collected', 'Total Invoiced', 'Collections Received', 'Net Receivable']);
        const trs = document.querySelectorAll('#ledger-table-body tr');
        trs.forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length >= 7) {
                csvRows.push([
                    `"${tds[0].innerText.trim()}"`,
                    `"${tds[1].innerText.trim()}"`,
                    `"${tds[2].innerText.trim().replace(/[^0-9.-]/g, '')}"`,
                    `"${tds[3].innerText.trim().replace(/[^0-9.-]/g, '')}"`,
                    `"${tds[4].innerText.trim().replace(/[^0-9.-]/g, '')}"`,
                    `"${tds[5].innerText.trim().replace(/[^0-9.-]/g, '')}"`,
                    `"${tds[6].innerText.trim().replace(/[^0-9.-]/g, '')}"`
                ]);
            }
        });
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Financial_Statement_${activeStatementTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function refreshCustomersTable(searchTerm = '') {
    const tbody = document.getElementById('customers-table');
    const query = (searchTerm || document.getElementById('search-customers')?.value || '').toLowerCase().trim();

    const filtered = (data.customers || []).filter(c => 
        c.name.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.address && c.address.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">${query ? 'No matching customers found' : 'No customers yet'}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td>${c.name}</td>
            <td>${c.email || '-'}</td>
            <td>${c.phone || '-'}</td>
            <td>${c.address ? c.address.substring(0, 30) + '...' : '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn btn-primary" onclick="openCustomerModal('${c.id}')">Edit</button>
                    <button class="action-btn btn-danger" onclick="deleteCustomer('${c.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function refreshProductsTable(searchTerm = '') {
    const tbody = document.getElementById('products-table');
    const currency = data.company.currency || 'AED';
    const query = (searchTerm || document.getElementById('search-products')?.value || '').toLowerCase().trim();

    const filtered = (data.products || []).filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        p.price.toString().includes(query)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #888;">${query ? 'No matching products found' : 'No products yet'}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.description || '-'}</td>
            <td>${currency} ${p.price.toFixed(2)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn btn-primary" onclick="openProductModal('${p.id}')">Edit</button>
                    <button class="action-btn btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function refreshQuotationsTable(searchTerm = '') {
    const tbody = document.getElementById('quotations-table');
    const currency = data.company.currency || 'AED';
    const query = (searchTerm || document.getElementById('search-quotations')?.value || '').toLowerCase().trim();

    const filtered = (data.quotations || []).filter(doc => {
        const customer = data.customers.find(c => c.id === doc.customerId);
        const custName = customer ? customer.name.toLowerCase() : '';
        return doc.number.toLowerCase().includes(query) ||
            custName.includes(query) ||
            doc.status.toLowerCase().includes(query) ||
            doc.date.includes(query) ||
            (doc.total && doc.total.toString().includes(query));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888;">${query ? 'No matching quotations found' : 'No quotations yet'}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(doc => {
        const customer = data.customers.find(c => c.id === doc.customerId);
        return `
            <tr>
                <td>${doc.number}</td>
                <td>${customer ? customer.name : 'Unknown'}</td>
                <td>${formatDate(doc.date)}</td>
                <td>${formatDate(doc.validUntil)}</td>
                <td>${currency} ${doc.total.toFixed(2)}</td>
                <td>
                    <select class="status-select" onchange="updateStatus('quotation', '${doc.id}', this.value)">
                        <option value="draft" ${doc.status === 'draft' ? 'selected' : ''}>Draft</option>
                        <option value="sent" ${doc.status === 'sent' ? 'selected' : ''}>Sent</option>
                        <option value="accepted" ${doc.status === 'accepted' ? 'selected' : ''}>Accepted</option>
                        <option value="rejected" ${doc.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn btn-secondary" onclick="previewDocument('quotation', '${doc.id}')">View</button>
                        <button class="action-btn btn-primary" onclick="openDocumentModal('quotation', '${doc.id}')">Edit</button>
                        <button class="action-btn btn-success" onclick="convertToInvoice('${doc.id}')">Invoice</button>
                        <button class="action-btn btn-info" style="background:#0284c7; color:white;" onclick="convertToDeliveryNote('${doc.id}')">Delivery Note</button>
                        <button class="action-btn btn-danger" onclick="deleteDocument('quotation', '${doc.id}')">×</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function refreshDeliveryNotesTable(searchTerm = '') {
    const tbody = document.getElementById('delivery-notes-table');
    const query = (searchTerm || document.getElementById('search-delivery-notes')?.value || '').toLowerCase().trim();

    const filtered = (data.deliveryNotes || []).filter(doc => {
        const customer = data.customers.find(c => c.id === doc.customerId);
        const custName = customer ? customer.name.toLowerCase() : '';
        return doc.number.toLowerCase().includes(query) ||
            custName.includes(query) ||
            (doc.reference && doc.reference.toLowerCase().includes(query)) ||
            doc.status.toLowerCase().includes(query) ||
            doc.date.includes(query);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888;">${query ? 'No matching delivery notes found' : 'No delivery notes yet'}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(doc => {
        const customer = data.customers.find(c => c.id === doc.customerId);
        return `
            <tr>
                <td>${doc.number}</td>
                <td>${customer ? customer.name : 'Unknown'}</td>
                <td>${formatDate(doc.date)}</td>
                <td>${doc.reference || '-'}</td>
                <td>
                    <select class="status-select" onchange="updateStatus('delivery', '${doc.id}', this.value)">
                        <option value="pending" ${doc.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="delivered" ${doc.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn btn-secondary" onclick="previewDocument('delivery', '${doc.id}')">View</button>
                        <button class="action-btn btn-primary" onclick="openDocumentModal('delivery', '${doc.id}')">Edit</button>
                        <button class="action-btn btn-danger" onclick="deleteDocument('delivery', '${doc.id}')">×</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function refreshInvoicesTable(searchTerm = '') {
    const tbody = document.getElementById('invoices-table');
    const currency = data.company.currency || 'AED';
    const query = (searchTerm || document.getElementById('search-invoices')?.value || '').toLowerCase().trim();

    const filtered = (data.invoices || []).filter(doc => {
        const customer = data.customers.find(c => c.id === doc.customerId);
        const custName = customer ? customer.name.toLowerCase() : '';
        return doc.number.toLowerCase().includes(query) ||
            custName.includes(query) ||
            doc.status.toLowerCase().includes(query) ||
            doc.date.includes(query) ||
            (doc.total && doc.total.toString().includes(query));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888;">${query ? 'No matching invoices found' : 'No invoices yet'}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(doc => {
        const customer = data.customers.find(c => c.id === doc.customerId);
        return `
            <tr>
                <td>${doc.number}</td>
                <td>${customer ? customer.name : 'Unknown'}</td>
                <td>${formatDate(doc.date)}</td>
                <td>${formatDate(doc.dueDate)}</td>
                <td>${currency} ${doc.total.toFixed(2)}</td>
                <td>
                    <select class="status-select" onchange="updateStatus('invoice', '${doc.id}', this.value)">
                        <option value="pending" ${doc.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="sent" ${doc.status === 'sent' ? 'selected' : ''}>Sent</option>
                        <option value="paid" ${doc.status === 'paid' ? 'selected' : ''}>Paid</option>
                    </select>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn btn-secondary" onclick="previewDocument('invoice', '${doc.id}')">View</button>
                        <button class="action-btn btn-primary" onclick="openDocumentModal('invoice', '${doc.id}')">Edit</button>
                        <button class="action-btn" style="background:#8b5cf6; color:white;" onclick="createReceiptVoucherFromInvoice('${doc.id}')">Receipt Voucher</button>
                        <button class="action-btn btn-danger" onclick="deleteDocument('invoice', '${doc.id}')">×</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function refreshReceiptVouchersTable(searchTerm = '') {
    const tbody = document.getElementById('receipt-vouchers-table');
    if (!tbody) return;
    const currency = data.company.currency || 'AED';
    const query = (searchTerm || document.getElementById('search-receipt-vouchers')?.value || '').toLowerCase().trim();

    const filtered = (data.receiptVouchers || []).filter(rv => {
        const customer = data.customers.find(c => c.id === rv.customerId);
        const custName = customer ? customer.name.toLowerCase() : '';
        return rv.number.toLowerCase().includes(query) ||
            custName.includes(query) ||
            (rv.paymentMode && rv.paymentMode.toLowerCase().includes(query)) ||
            (rv.chequeNo && rv.chequeNo.toLowerCase().includes(query)) ||
            (rv.reference && rv.reference.toLowerCase().includes(query)) ||
            (rv.amount && rv.amount.toString().includes(query));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888;">${query ? 'No matching receipt vouchers found' : 'No receipt vouchers yet'}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(rv => {
        const customer = data.customers.find(c => c.id === rv.customerId);
        return `
            <tr>
                <td><strong>${rv.number}</strong></td>
                <td>${customer ? customer.name : 'Unknown'}</td>
                <td>${formatDate(rv.date)}</td>
                <td><span class="status-badge" style="background:#e0e7ff; color:#3730a3;">${rv.paymentMode || 'Cash'}</span></td>
                <td>${rv.chequeNo || rv.reference || '-'}</td>
                <td><strong>${currency} ${rv.amount.toFixed(2)}</strong></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn btn-secondary" onclick="previewDocument('receiptVoucher', '${rv.id}')">View</button>
                        <button class="action-btn btn-primary" onclick="openReceiptVoucherModal('${rv.id}')">Edit</button>
                        <button class="action-btn btn-danger" onclick="deleteReceiptVoucher('${rv.id}')">×</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Receipt Voucher Modal & CRUD Management
function openReceiptVoucherModal(rvId = null) {
    document.getElementById('receipt-voucher-form').reset();
    document.getElementById('rv-id').value = '';
    document.getElementById('rv-selected-customer-id').value = '';
    document.getElementById('rv-customer-search').value = '';
    document.getElementById('rv-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('rv-payment-mode').value = 'Cash';
    toggleRvPaymentFields();

    syncCounters();
    const counter = data.counters.receiptVoucher || 1;
    document.getElementById('rv-number').value = `CYG-RV-OP-26-${String(counter).padStart(4, '0')}`;
    document.getElementById('rv-modal-title').textContent = 'New Receipt Voucher';

    if (rvId) {
        const rv = (data.receiptVouchers || []).find(r => r.id === rvId);
        if (rv) {
            document.getElementById('rv-id').value = rv.id;
            document.getElementById('rv-number').value = rv.number;
            document.getElementById('rv-date').value = rv.date;
            document.getElementById('rv-selected-customer-id').value = rv.customerId;
            const customer = data.customers.find(c => c.id === rv.customerId);
            if (customer) {
                document.getElementById('rv-customer-search').value = customer.name;
            }
            document.getElementById('rv-payment-mode').value = rv.paymentMode || 'Cash';
            toggleRvPaymentFields();
            document.getElementById('rv-cheque-no').value = rv.chequeNo || '';
            document.getElementById('rv-bank-name').value = rv.bankName || '';
            document.getElementById('rv-amount').value = rv.amount || '';
            document.getElementById('rv-reference').value = rv.reference || '';
            document.getElementById('rv-notes').value = rv.notes || '';
            document.getElementById('rv-modal-title').textContent = 'Edit Receipt Voucher';
        }
    }

    openModal('receipt-voucher-modal');
}

function toggleRvPaymentFields() {
    const mode = document.getElementById('rv-payment-mode').value;
    const fields = document.getElementById('rv-cheque-fields');
    const refLabel = document.getElementById('rv-ref-label');
    const bankLabel = document.getElementById('rv-bank-label');

    if (mode === 'Cheque') {
        fields.style.display = 'grid';
        refLabel.textContent = 'Cheque Number';
        bankLabel.textContent = 'Bank Name & Cheque Date';
    } else if (mode === 'Bank Transfer') {
        fields.style.display = 'grid';
        refLabel.textContent = 'Transaction / Ref No.';
        bankLabel.textContent = 'Bank Name & Date';
    } else {
        fields.style.display = 'none';
    }
}

function saveReceiptVoucher() {
    const rvId = document.getElementById('rv-id').value;
    const customerId = document.getElementById('rv-selected-customer-id').value;
    const amount = parseFloat(document.getElementById('rv-amount').value) || 0;

    if (!customerId) {
        alert('Please select a customer');
        return;
    }
    if (amount <= 0) {
        alert('Please enter a valid payment amount');
        return;
    }

    const rv = {
        id: rvId || Date.now().toString(),
        number: document.getElementById('rv-number').value,
        date: document.getElementById('rv-date').value,
        customerId: customerId,
        paymentMode: document.getElementById('rv-payment-mode').value,
        chequeNo: document.getElementById('rv-cheque-no').value,
        bankName: document.getElementById('rv-bank-name').value,
        amount: amount,
        reference: document.getElementById('rv-reference').value,
        notes: document.getElementById('rv-notes').value,
        createdAt: new Date().toISOString()
    };

    if (!data.receiptVouchers) data.receiptVouchers = [];

    if (rvId) {
        const index = data.receiptVouchers.findIndex(r => r.id === rvId);
        if (index !== -1) data.receiptVouchers[index] = rv;
    } else {
        data.receiptVouchers.push(rv);
        data.counters.receiptVoucher = (data.counters.receiptVoucher || 1) + 1;
    }

    saveData();
    refreshAllTables();
    updateDashboard();
    closeModal('receipt-voucher-modal');
    alert(`Receipt Voucher ${rv.number} saved successfully!`);
}

function createReceiptVoucherFromInvoice(invoiceId) {
    const invoice = data.invoices.find(d => d.id === invoiceId);
    if (!invoice) return;

    openReceiptVoucherModal();

    document.getElementById('rv-selected-customer-id').value = invoice.customerId;
    const customer = data.customers.find(c => c.id === invoice.customerId);
    if (customer) {
        document.getElementById('rv-customer-search').value = customer.name;
    }
    document.getElementById('rv-amount').value = invoice.total;
    document.getElementById('rv-reference').value = `Invoice # ${invoice.number}`;
    document.getElementById('rv-notes').value = `Being payment received against Invoice ${invoice.number}`;
}

function updateDashboard() {
    const currency = data.company.currency || '$';

    document.getElementById('stat-quotations').textContent = data.quotations.length;
    document.getElementById('stat-invoices').textContent = data.invoices.length;

    const pending = data.invoices
        .filter(i => i.status === 'pending' || i.status === 'sent')
        .reduce((sum, i) => sum + i.total, 0);
    document.getElementById('stat-pending').textContent = `${currency}${pending.toFixed(2)}`;

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const revenue = data.invoices
        .filter(i => {
            const d = new Date(i.date);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear && i.status === 'paid';
        })
        .reduce((sum, i) => sum + i.total, 0);
    document.getElementById('stat-revenue').textContent = `${currency}${revenue.toFixed(2)}`;

    // Recent docs
    const allDocs = [
        ...data.quotations.map(d => ({ ...d, type: 'Quotation' })),
        ...data.deliveryNotes.map(d => ({ ...d, type: 'Delivery Note' })),
        ...data.invoices.map(d => ({ ...d, type: 'Invoice' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    const recentTable = document.getElementById('recent-docs-table');
    if (allDocs.length === 0) {
        recentTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">No documents yet</td></tr>';
    } else {
        recentTable.innerHTML = allDocs.map(doc => {
            const customer = data.customers.find(c => c.id === doc.customerId);
            return `
                <tr>
                    <td>${doc.type} ${doc.number}</td>
                    <td>${customer ? customer.name : 'Unknown'}</td>
                    <td>${formatDate(doc.date)}</td>
                    <td>${currency}${(doc.total || 0).toFixed(2)}</td>
                    <td><span class="status-badge status-${doc.status}">${doc.status}</span></td>
                </tr>
            `;
        }).join('');
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// --- FIREBASE AUTHENTICATION & PHONE OTP HANDLERS ---
function setupAuthListener() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            const overlay = document.getElementById('auth-overlay');
            if (user) {
                if (overlay) overlay.style.display = 'none';
                updateUserProfileUI(user);
            } else {
                if (overlay) overlay.style.display = 'flex';
            }
        });
    }
}

function updateUserProfileUI(user) {
    const emailEl = document.getElementById('user-email-display');
    if (user && emailEl) {
        emailEl.textContent = user.phoneNumber || user.email || 'Logged In';
    }
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.04 10.04 0 013.98-.863c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21m-4.218-4.218L3 3"></path></svg>`;
    } else {
        input.type = 'password';
        btn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`;
    }
}

function switchAuthMethod(method) {
    const emailTab = document.getElementById('auth-tab-email');
    const phoneTab = document.getElementById('auth-tab-phone');
    const emailForm = document.getElementById('login-form');
    const phoneForm = document.getElementById('phone-login-form');
    const forgotCard = document.getElementById('forgot-password-card');

    if (forgotCard) forgotCard.style.display = 'none';

    if (method === 'phone') {
        if (emailTab) emailTab.classList.remove('active');
        if (phoneTab) phoneTab.classList.add('active');
        if (emailForm) emailForm.style.display = 'none';
        if (phoneForm) phoneForm.style.display = 'flex';
        initRecaptcha();
    } else {
        if (phoneTab) phoneTab.classList.remove('active');
        if (emailTab) emailTab.classList.add('active');
        if (phoneForm) phoneForm.style.display = 'none';
        if (emailForm) emailForm.style.display = 'flex';
    }
}

function showForgotPasswordCard(e) {
    if (e) e.preventDefault();
    const loginForm = document.getElementById('login-form');
    const forgotCard = document.getElementById('forgot-password-card');
    if (loginForm) loginForm.style.display = 'none';
    if (forgotCard) forgotCard.style.display = 'flex';
    const msg = document.getElementById('forgot-status-msg');
    if (msg) msg.style.display = 'none';
}

function hideForgotPasswordCard() {
    const loginForm = document.getElementById('login-form');
    const forgotCard = document.getElementById('forgot-password-card');
    if (forgotCard) forgotCard.style.display = 'none';
    if (loginForm) loginForm.style.display = 'flex';
}

function handleSendPasswordReset(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('forgot-email-input').value.trim();
    const statusMsg = document.getElementById('forgot-status-msg');

    if (!email) {
        if (statusMsg) {
            statusMsg.textContent = 'Please enter your account email address.';
            statusMsg.style.display = 'block';
            statusMsg.style.background = '#fef2f2';
            statusMsg.style.color = '#ef4444';
        }
        return;
    }

    if (typeof firebase === 'undefined' || !firebase.auth) {
        alert("Firebase Auth library not loaded.");
        return;
    }

    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            if (statusMsg) {
                statusMsg.textContent = '✓ Reset link sent! Please check your email inbox & spam folder.';
                statusMsg.style.display = 'block';
                statusMsg.style.background = '#f0fdf4';
                statusMsg.style.color = '#16a34a';
                statusMsg.style.borderColor = '#bbf7d0';
            }
        })
        .catch((error) => {
            if (statusMsg) {
                statusMsg.textContent = error.message;
                statusMsg.style.display = 'block';
                statusMsg.style.background = '#fef2f2';
                statusMsg.style.color = '#ef4444';
            }
        });
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const emailInput = document.getElementById('auth-login-email') || document.getElementById('login-email');
    const passInput = document.getElementById('auth-login-password') || document.getElementById('login-password');
    const errorEl = document.getElementById('auth-login-error') || document.getElementById('auth-error');

    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }

    if (typeof firebase === 'undefined' || !firebase.auth) {
        alert('Firebase Auth library not loaded. Please check your internet connection.');
        return;
    }

    const email = emailInput ? emailInput.value.trim() : '';
    const pass = passInput ? passInput.value : '';

    if (!email || !pass) {
        if (errorEl) {
            errorEl.textContent = 'Please enter both email and password.';
            errorEl.style.display = 'block';
        }
        return;
    }

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            const overlay = document.getElementById('auth-overlay');
            if (overlay) overlay.style.display = 'none';
        })
        .catch((error) => {
            console.error('Firebase sign in error:', error);
            if (errorEl) {
                errorEl.textContent = error.message || 'Login failed. Please check your email and password.';
                errorEl.style.display = 'block';
            } else {
                alert('Login error: ' + error.message);
            }
        });
}

function logoutUser() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(() => {
            const overlay = document.getElementById('auth-overlay');
            if (overlay) overlay.style.display = 'flex';
        });
    }
}