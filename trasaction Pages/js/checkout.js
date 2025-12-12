// checkout.js - Checkout Page Handler

const API_BASE_URL = 'https://minimalbackend.onrender.com';

// State management
let checkoutData = {
    cartItems: [],
    totals: null,
    shippingInfo: {},
    deliveryOption: 'standard',
    paymentMethod: null
};

// Initialize checkout page
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '../logIn Pages/login.html';
        return;
    }

    // Load checkout data
    await loadCheckoutData();
    
    // Setup event listeners
    setupEventListeners();
});

// Load checkout data (cart items and calculate totals)
async function loadCheckoutData() {
    try {
        showLoadingState();
        
        // Calculate totals
        const totalsData = await calculateTotal('standard');
        
        if (!totalsData.success) {
            throw new Error(totalsData.message || 'Failed to load checkout data');
        }
        
        checkoutData.totals = totalsData;
        
        // Display order summary
        displayOrderSummary(totalsData);
        
        // Show address form
        showAddressForm();
        
    } catch (error) {
        console.error('Error loading checkout:', error);
        showError(error.message);
    }
}

// Calculate order total
async function calculateTotal(deliveryOption = 'standard') {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/checkout/calculate-total?delivery_option=${deliveryOption}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Error calculating total:', error);
        throw error;
    }
}

// Display order summary
function displayOrderSummary(totals) {
    // Update breakdown
    document.querySelector('.breakdown-row:nth-child(1) span:last-child').textContent = `₱${totals.subtotal.toFixed(2)}`;
    document.querySelector('.breakdown-row:nth-child(2) span:last-child').textContent = `₱${totals.tax.toFixed(2)}`;
    document.querySelector('.breakdown-row:nth-child(3) span:last-child').textContent = `₱${totals.marketplace_fee.toFixed(2)}`;
    document.querySelector('.breakdown-row:nth-child(4) span:last-child').textContent = `₱${totals.shipping_fee.toFixed(2)}`;
    document.querySelector('.breakdown-row.total span:last-child').textContent = `₱${totals.total.toFixed(2)}`;
    
    // Update summary subtitle
    document.querySelector('.summary-card .section-subtitle').textContent = 
        `You have ${totals.item_count} ${totals.item_count === 1 ? 'item' : 'items'} in your cart`;
}

// Show address form
function showAddressForm() {
    const addressBox = document.querySelector('.selection-box:nth-child(1)');
    addressBox.style.cursor = 'pointer';
    
    addressBox.addEventListener('click', () => {
        showAddressModal();
    });
}

// Show address modal
function showAddressModal() {
    const modalHTML = `
        <div class="modal fade" id="addressModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Shipping Address</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addressForm">
                            <div class="mb-3">
                                <label class="form-label">Full Name *</label>
                                <input type="text" class="form-control" id="fullName" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Phone Number *</label>
                                <input type="tel" class="form-control" id="phone" placeholder="09123456789" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Address Line 1 *</label>
                                <input type="text" class="form-control" id="addressLine1" placeholder="Street, Building, House No." required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Address Line 2</label>
                                <input type="text" class="form-control" id="addressLine2" placeholder="Apt, Suite, Unit (optional)">
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">City *</label>
                                    <input type="text" class="form-control" id="city" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">State/Province *</label>
                                    <input type="text" class="form-control" id="state" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Postal Code *</label>
                                <input type="text" class="form-control" id="postalCode" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveAddress()">Save Address</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('addressModal');
    if (existingModal) existingModal.remove();
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addressModal'));
    modal.show();
}

// Save address
function saveAddress() {
    const form = document.getElementById('addressForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    checkoutData.shippingInfo = {
        full_name: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        address_line1: document.getElementById('addressLine1').value,
        address_line2: document.getElementById('addressLine2').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        postal_code: document.getElementById('postalCode').value
    };
    
    // Update address box
    const addressBox = document.querySelector('.selection-box:nth-child(1)');
    addressBox.classList.add('active');
    addressBox.querySelector('p').textContent = `${checkoutData.shippingInfo.full_name} - ${checkoutData.shippingInfo.city}`;
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('addressModal')).hide();
    
    // Enable next step
    showDeliveryOptions();
    
    showToast('Address saved successfully', 'success');
}

// Show delivery options
function showDeliveryOptions() {
    const deliveryBox = document.querySelector('.selection-box:nth-child(2)');
    deliveryBox.style.cursor = 'pointer';
    
    deliveryBox.addEventListener('click', () => {
        showDeliveryModal();
    });
}

// Show delivery modal
function showDeliveryModal() {
    const modalHTML = `
        <div class="modal fade" id="deliveryModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Delivery Options</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="delivery-option" data-option="standard">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="delivery" id="standard" value="standard" checked>
                                <label class="form-check-label w-100" for="standard">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>Standard Delivery</strong>
                                            <p class="text-muted mb-0 small">5-7 business days</p>
                                        </div>
                                        <span class="fw-bold">₱50.00</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <hr>
                        <div class="delivery-option" data-option="express">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="delivery" id="express" value="express">
                                <label class="form-check-label w-100" for="express">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>Express Delivery</strong>
                                            <p class="text-muted mb-0 small">2-3 business days</p>
                                        </div>
                                        <span class="fw-bold">₱150.00</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <hr>
                        <div class="delivery-option" data-option="same_day">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="delivery" id="same_day" value="same_day">
                                <label class="form-check-label w-100" for="same_day">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>Same Day Delivery</strong>
                                            <p class="text-muted mb-0 small">Within 24 hours</p>
                                        </div>
                                        <span class="fw-bold">₱300.00</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <hr>
                        <div class="delivery-option" data-option="pickup">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="delivery" id="pickup" value="pickup">
                                <label class="form-check-label w-100" for="pickup">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>Store Pickup</strong>
                                            <p class="text-muted mb-0 small">Pick up at store</p>
                                        </div>
                                        <span class="fw-bold text-success">FREE</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveDeliveryOption()">Continue</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('deliveryModal');
    if (existingModal) existingModal.remove();
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('deliveryModal'));
    modal.show();
}

// Save delivery option
async function saveDeliveryOption() {
    const selectedOption = document.querySelector('input[name="delivery"]:checked').value;
    checkoutData.deliveryOption = selectedOption;
    
    // Recalculate totals with new delivery option
    const totals = await calculateTotal(selectedOption);
    displayOrderSummary(totals);
    checkoutData.totals = totals;
    
    // Update delivery box
    const deliveryBox = document.querySelector('.selection-box:nth-child(2)');
    deliveryBox.classList.add('active');
    const optionText = document.querySelector(`label[for="${selectedOption}"] strong`).textContent;
    deliveryBox.querySelector('p').textContent = optionText;
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('deliveryModal')).hide();
    
    // Enable payment
    showPaymentOptions();
    
    showToast('Delivery option selected', 'success');
}

// Show payment options
function showPaymentOptions() {
    const paymentBox = document.querySelector('.selection-box:nth-child(3)');
    paymentBox.style.cursor = 'pointer';
    
    paymentBox.addEventListener('click', () => {
        showPaymentModal();
    });
}

// Show payment modal
function showPaymentModal() {
    const modalHTML = `
        <div class="modal fade" id="paymentModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Payment Method</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="payment-option mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="payment" id="gcash" value="gcash">
                                <label class="form-check-label" for="gcash">
                                    <i class="fas fa-mobile-alt me-2"></i> GCash
                                </label>
                            </div>
                        </div>
                        <div class="payment-option mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="payment" id="paymaya" value="paymaya">
                                <label class="form-check-label" for="paymaya">
                                    <i class="fas fa-mobile-alt me-2"></i> PayMaya
                                </label>
                            </div>
                        </div>
                        <div class="payment-option mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="payment" id="cod" value="cash_on_delivery">
                                <label class="form-check-label" for="cod">
                                    <i class="fas fa-money-bill-wave me-2"></i> Cash on Delivery
                                </label>
                            </div>
                        </div>
                        <div class="payment-option mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="payment" id="credit_card" value="credit_card">
                                <label class="form-check-label" for="credit_card">
                                    <i class="fas fa-credit-card me-2"></i> Credit Card
                                </label>
                            </div>
                        </div>
                        <div class="payment-option mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="payment" id="debit_card" value="debit_card">
                                <label class="form-check-label" for="debit_card">
                                    <i class="fas fa-credit-card me-2"></i> Debit Card
                                </label>
                            </div>
                        </div>
                        <div class="payment-option mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="payment" id="bank_transfer" value="bank_transfer">
                                <label class="form-check-label" for="bank_transfer">
                                    <i class="fas fa-university me-2"></i> Bank Transfer
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="savePaymentMethod()">Continue</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('paymentModal');
    if (existingModal) existingModal.remove();
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

// Save payment method
function savePaymentMethod() {
    const selectedPayment = document.querySelector('input[name="payment"]:checked');
    
    if (!selectedPayment) {
        showToast('Please select a payment method', 'warning');
        return;
    }
    
    checkoutData.paymentMethod = selectedPayment.value;
    
    // Update payment box
    const paymentBox = document.querySelector('.selection-box:nth-child(3)');
    paymentBox.classList.add('active');
    const paymentText = document.querySelector(`label[for="${selectedPayment.id}"]`).textContent.trim();
    paymentBox.querySelector('p').textContent = paymentText;
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
    
    // Enable purchase button
    enablePurchaseButton();
    
    showToast('Payment method selected', 'success');
}

// Enable purchase button
function enablePurchaseButton() {
    const purchaseBtn = document.querySelector('.btn-purchase');
    purchaseBtn.disabled = false;
    purchaseBtn.addEventListener('click', handlePurchase);
}

// Setup event listeners
function setupEventListeners() {
    // Purchase button (initially disabled)
    const purchaseBtn = document.querySelector('.btn-purchase');
    if (purchaseBtn) {  // Add this check
        purchaseBtn.disabled = true;
    }
}

// Handle purchase
async function handlePurchase() {
    // Validate all data
    if (!checkoutData.shippingInfo.full_name) {
        showToast('Please enter shipping address', 'warning');
        return;
    }
    
    if (!checkoutData.paymentMethod) {
        showToast('Please select payment method', 'warning');
        return;
    }
    
    try {
        // Show loading
        const purchaseBtn = document.querySelector('.btn-purchase');
        purchaseBtn.disabled = true;
        purchaseBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
        
        // Create order
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/checkout/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                payment_method: checkoutData.paymentMethod,
                shipping_info: checkoutData.shippingInfo,
                delivery_option: checkoutData.deliveryOption,
                customer_notes: null
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to create order');
        }
        
        if (data.success) {
            // Store order info
            sessionStorage.setItem('lastOrder', JSON.stringify({
                order_number: data.order_number,
                order_id: data.order_id,
                total: data.total
            }));
            
            // Redirect to success page
            window.location.href = 'success.html?order=' + data.order_number;
        } else {
            throw new Error(data.message || 'Failed to create order');
        }
        
    } catch (error) {
        console.error('Purchase error:', error);
        showToast(error.message, 'error');
        
        // Reset button
        const purchaseBtn = document.querySelector('.btn-purchase');
        purchaseBtn.disabled = false;
        purchaseBtn.innerHTML = 'Purchase';
    }
}

// Show loading state
function showLoadingState() {
    const summaryCard = document.querySelector('.summary-card');
    summaryCard.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Loading checkout...</p>
        </div>
    `;
}

// Show error
function showError(message) {
    const container = document.querySelector('.main-container');
    container.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
            </div>
            <a href="../customer Pages/cart.html" class="btn btn-primary">
                <i class="fas fa-arrow-left me-2"></i>Back to Cart
            </a>
        </div>
    `;
}

// Show toast notification
function showToast(message, type = 'success') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '11';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const iconClass = type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-circle' : 'times-circle';
    const bgClass = type === 'success' ? 'bg-success' : type === 'warning' ? 'bg-warning' : 'bg-danger';

    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fa-solid fa-${iconClass} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}