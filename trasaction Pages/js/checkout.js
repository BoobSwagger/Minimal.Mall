// checkout.js - Checkout page handler for Minimal Mall (with debugging)

class CheckoutManager {
    constructor() {
        this.apiBaseUrl = 'https://minimallbackend.onrender.com/api';
        this.orderSummary = null;
        this.currentStep = 1;
        this.checkoutData = {
            address: null,
            delivery: null,
            payment: null
        };
        this.init();
    }

    init() {
        console.log('=== CHECKOUT INIT DEBUG ===');
        
        // Check for token with multiple possible key names
        const possibleTokenKeys = ['access_token', 'token', 'authToken', 'jwt'];
        let token = null;
        let tokenKey = null;
        
        for (const key of possibleTokenKeys) {
            const value = localStorage.getItem(key);
            if (value) {
                token = value;
                tokenKey = key;
                break;
            }
        }
        
        console.log('Token search results:', {
            foundToken: !!token,
            tokenKey: tokenKey,
            tokenLength: token ? token.length : 0,
            tokenPreview: token ? `${token.substring(0, 20)}...` : 'null',
            allLocalStorageKeys: Object.keys(localStorage)
        });

        // If no token found, show all localStorage contents for debugging
        if (!token) {
            console.warn('No authentication token found!');
            console.log('All localStorage contents:', { ...localStorage });
            alert('Authentication token not found. Please log in again.');
            window.location.href = '../logIn Pages/login.html';
            return;
        }

        // Store the correct token key for later use
        this.tokenKey = tokenKey;
        
        // Decode JWT to check expiration (if it's a JWT)
        if (token.includes('.')) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                console.log('JWT Payload:', {
                    userId: payload.sub || payload.user_id,
                    expiration: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'none',
                    isExpired: payload.exp ? Date.now() >= payload.exp * 1000 : false,
                    issuer: payload.iss,
                    audience: payload.aud
                });
                
                if (payload.exp && Date.now() >= payload.exp * 1000) {
                    console.error('Token is EXPIRED!');
                    alert('Your session has expired. Please log in again.');
                    localStorage.removeItem(tokenKey);
                    window.location.href = '../logIn Pages/login.html';
                    return;
                }
            } catch (e) {
                console.warn('Could not decode token as JWT:', e.message);
            }
        }

        console.log('=== END INIT DEBUG ===\n');

        // Load order summary
        this.loadOrderSummary();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Selection boxes click handlers
        const selectionBoxes = document.querySelectorAll('.selection-box');
        selectionBoxes.forEach((box, index) => {
            box.addEventListener('click', () => this.handleStepClick(index + 1));
        });

        // Purchase button
        const purchaseBtn = document.querySelector('.btn-purchase');
        if (purchaseBtn) {
            purchaseBtn.addEventListener('click', () => this.processCheckout());
        }
    }

    async loadOrderSummary() {
        console.log('=== LOAD ORDER SUMMARY DEBUG ===');
        
        const token = localStorage.getItem(this.tokenKey || 'access_token');
        const url = `${this.apiBaseUrl}/checkout/summary`;
        
        console.log('Request details:', {
            url: url,
            method: 'GET',
            hasToken: !!token,
            tokenKey: this.tokenKey,
            tokenPreview: token ? `${token.substring(0, 30)}...` : 'null',
            authHeader: token ? `Bearer ${token.substring(0, 30)}...` : 'none'
        });

        try {
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            console.log('Request headers:', headers);

            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            console.log('Response details:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries([...response.headers.entries()])
            });

            // Handle specific error cases
            if (response.status === 401) {
                console.error('401 UNAUTHORIZED - Token is invalid or expired');
                
                // Try to get error details
                try {
                    const errorData = await response.json();
                    console.error('Error details:', errorData);
                } catch (e) {
                    console.error('Could not parse error response');
                }
                
                alert('Authentication failed. Please log in again.');
                localStorage.removeItem(this.tokenKey || 'access_token');
                window.location.href = '../logIn Pages/login.html';
                return;
            }

            if (response.status === 404 || response.status === 400) {
                const errorData = await response.json();
                console.warn('Cart issue:', errorData);
                this.showError('Your cart is empty. Redirecting to cart...');
                setTimeout(() => window.location.href = '../customer Pages/cart.html', 2000);
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Request failed:', {
                    status: response.status,
                    response: errorText
                });
                throw new Error(`Failed to load order summary: ${response.status}`);
            }

            this.orderSummary = await response.json();
            console.log('Order summary loaded successfully:', {
                itemCount: this.orderSummary.item_count,
                subtotal: this.orderSummary.subtotal,
                total: this.orderSummary.total
            });
            
            this.renderOrderSummary();
            console.log('=== END LOAD ORDER SUMMARY DEBUG ===\n');

        } catch (error) {
            console.error('=== FETCH ERROR ===');
            console.error('Error type:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('=== END FETCH ERROR ===\n');
            
            this.showError('Failed to load order summary. Please check console for details.');
        }
    }

    renderOrderSummary() {
        if (!this.orderSummary) return;

        // Update subtitle with item count
        const subtitle = document.querySelector('.summary-card .section-subtitle');
        if (subtitle) {
            subtitle.textContent = `${this.orderSummary.item_count} item(s) in your cart`;
        }

        // Update price breakdown
        const breakdownRows = document.querySelectorAll('.breakdown-row');
        if (breakdownRows.length >= 4) {
            breakdownRows[0].querySelector('span:last-child').textContent = 
                `₱${parseFloat(this.orderSummary.subtotal).toFixed(2)}`;
            breakdownRows[1].querySelector('span:last-child').textContent = 
                `₱${parseFloat(this.orderSummary.tax).toFixed(2)}`;
            breakdownRows[2].querySelector('span:last-child').textContent = 
                `₱${parseFloat(this.orderSummary.marketplace_fee).toFixed(2)}`;
            breakdownRows[3].querySelector('span:last-child').textContent = 
                `₱${parseFloat(this.orderSummary.shipping_fee).toFixed(2)}`;
        }

        // Update total
        const totalRow = document.querySelector('.breakdown-row.total span:last-child');
        if (totalRow) {
            totalRow.textContent = `₱${parseFloat(this.orderSummary.total).toFixed(2)}`;
        }

        // Create items list in summary header
        this.renderItemsList();
    }

    renderItemsList() {
        const summaryHeader = document.querySelector('.summary-table-header');
        if (!summaryHeader || !this.orderSummary) return;

        // Create items container if it doesn't exist
        let itemsContainer = document.querySelector('.order-items-list');
        if (!itemsContainer) {
            itemsContainer = document.createElement('div');
            itemsContainer.className = 'order-items-list mt-3 mb-3';
            summaryHeader.after(itemsContainer);
        }

        itemsContainer.innerHTML = this.orderSummary.items.map(item => `
            <div class="order-item-summary mb-2 pb-2 border-bottom">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <p class="mb-0 fw-medium">${item.product_name}</p>
                        ${item.variant_name ? `
                            <small class="text-muted">${item.variant_name}: ${item.variant_value}</small>
                        ` : ''}
                        <small class="text-muted d-block">Qty: ${item.quantity}</small>
                    </div>
                    <div class="text-end">
                        <p class="mb-0 fw-medium">₱${parseFloat(item.subtotal).toFixed(2)}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    handleStepClick(step) {
        this.currentStep = step;
        
        switch(step) {
            case 1:
                this.showAddressModal();
                break;
            case 2:
                this.showDeliveryModal();
                break;
            case 3:
                this.showPaymentModal();
                break;
        }
    }

    showAddressModal() {
        const modalHtml = `
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
                                    <input type="text" class="form-control" name="full_name" required 
                                           value="${this.checkoutData.address?.full_name || ''}">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Phone Number *</label>
                                    <input type="tel" class="form-control" name="phone" required 
                                           value="${this.checkoutData.address?.phone || ''}">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Address Line 1 *</label>
                                    <input type="text" class="form-control" name="address_line1" required 
                                           value="${this.checkoutData.address?.address_line1 || ''}">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Address Line 2</label>
                                    <input type="text" class="form-control" name="address_line2" 
                                           value="${this.checkoutData.address?.address_line2 || ''}">
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">City *</label>
                                        <input type="text" class="form-control" name="city" required 
                                               value="${this.checkoutData.address?.city || ''}">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">State/Province *</label>
                                        <input type="text" class="form-control" name="state" required 
                                               value="${this.checkoutData.address?.state || ''}">
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Postal Code *</label>
                                        <input type="text" class="form-control" name="postal_code" required 
                                               value="${this.checkoutData.address?.postal_code || ''}">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Country *</label>
                                        <input type="text" class="form-control" name="country" required 
                                               value="${this.checkoutData.address?.country || 'Philippines'}">
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="checkoutManager.saveAddress()">Save Address</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modalHtml, 'addressModal');
    }

    showDeliveryModal() {
        const deliveryOptions = [
            { value: 'standard', label: 'Standard Delivery', time: '5-7 days', price: 50 },
            { value: 'express', label: 'Express Delivery', time: '2-3 days', price: 150 },
            { value: 'same_day', label: 'Same Day Delivery', time: 'Today', price: 250 },
            { value: 'pickup', label: 'Store Pickup', time: 'Tomorrow', price: 0 }
        ];

        const modalHtml = `
            <div class="modal fade" id="deliveryModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Select Delivery Option</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="delivery-options">
                                ${deliveryOptions.map(option => `
                                    <div class="form-check delivery-option p-3 mb-2 border rounded ${this.checkoutData.delivery === option.value ? 'border-primary' : ''}">
                                        <input class="form-check-input" type="radio" name="delivery_option" 
                                               id="delivery_${option.value}" value="${option.value}"
                                               ${this.checkoutData.delivery === option.value ? 'checked' : ''}>
                                        <label class="form-check-label w-100" for="delivery_${option.value}">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong>${option.label}</strong>
                                                    <br><small class="text-muted">${option.time}</small>
                                                </div>
                                                <div class="text-end">
                                                    <strong>${option.price === 0 ? 'Free' : '₱' + option.price.toFixed(2)}</strong>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                            ${this.orderSummary && this.orderSummary.subtotal >= 5000 ? 
                                '<div class="alert alert-success mt-3"><i class="fa-solid fa-check-circle"></i> Free shipping available for orders over ₱5,000!</div>' 
                                : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="checkoutManager.saveDelivery()">Confirm Delivery</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modalHtml, 'deliveryModal');
    }

    showPaymentModal() {
        const paymentMethods = [
            { value: 'credit_card', label: 'Credit Card', icon: 'fa-credit-card' },
            { value: 'debit_card', label: 'Debit Card', icon: 'fa-credit-card' },
            { value: 'gcash', label: 'GCash', icon: 'fa-mobile-screen' },
            { value: 'paymaya', label: 'PayMaya', icon: 'fa-mobile-screen' },
            { value: 'cash_on_delivery', label: 'Cash on Delivery', icon: 'fa-money-bill' },
            { value: 'bank_transfer', label: 'Bank Transfer', icon: 'fa-building-columns' }
        ];

        const modalHtml = `
            <div class="modal fade" id="paymentModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Select Payment Method</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="payment-methods">
                                ${paymentMethods.map(method => `
                                    <div class="form-check payment-option p-3 mb-2 border rounded ${this.checkoutData.payment === method.value ? 'border-primary' : ''}">
                                        <input class="form-check-input" type="radio" name="payment_method" 
                                               id="payment_${method.value}" value="${method.value}"
                                               ${this.checkoutData.payment === method.value ? 'checked' : ''}>
                                        <label class="form-check-label w-100 d-flex align-items-center" for="payment_${method.value}">
                                            <i class="fa-solid ${method.icon} me-3 fs-4"></i>
                                            <strong>${method.label}</strong>
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="mt-3">
                                <label class="form-label">Customer Notes (Optional)</label>
                                <textarea class="form-control" id="customer_notes" rows="3" 
                                          placeholder="Add any special instructions for your order...">${this.checkoutData.notes || ''}</textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="checkoutManager.savePayment()">Confirm Payment</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modalHtml, 'paymentModal');
    }

    showModal(html, modalId) {
        // Remove existing modal if any
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', html);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
    }

    saveAddress() {
        const form = document.getElementById('addressForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        this.checkoutData.address = {
            full_name: formData.get('full_name'),
            phone: formData.get('phone'),
            address_line1: formData.get('address_line1'),
            address_line2: formData.get('address_line2'),
            city: formData.get('city'),
            state: formData.get('state'),
            postal_code: formData.get('postal_code'),
            country: formData.get('country')
        };

        // Update UI
        this.updateStepStatus(1, true);
        const box = document.querySelectorAll('.selection-box')[0];
        box.querySelector('.box-info p').textContent = 
            `${this.checkoutData.address.address_line1}, ${this.checkoutData.address.city}`;

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('addressModal')).hide();
        
        // Check if all steps are complete
        this.updatePurchaseButton();
    }

    saveDelivery() {
        const selected = document.querySelector('input[name="delivery_option"]:checked');
        if (!selected) {
            alert('Please select a delivery option');
            return;
        }

        this.checkoutData.delivery = selected.value;

        // Update shipping fee based on selection
        this.updateShippingFee(selected.value);

        // Update UI
        this.updateStepStatus(2, true);
        const box = document.querySelectorAll('.selection-box')[1];
        const label = document.querySelector(`label[for="delivery_${selected.value}"]`);
        box.querySelector('.box-info p').textContent = label.querySelector('strong').textContent;

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('deliveryModal')).hide();
        
        // Check if all steps are complete
        this.updatePurchaseButton();
    }

    savePayment() {
        const selected = document.querySelector('input[name="payment_method"]:checked');
        if (!selected) {
            alert('Please select a payment method');
            return;
        }

        this.checkoutData.payment = selected.value;
        this.checkoutData.notes = document.getElementById('customer_notes').value;

        // Update UI
        this.updateStepStatus(3, true);
        const box = document.querySelectorAll('.selection-box')[2];
        const label = document.querySelector(`label[for="payment_${selected.value}"]`);
        box.querySelector('.box-info p').textContent = label.querySelector('strong').textContent;

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
        
        // Check if all steps are complete
        this.updatePurchaseButton();
    }

    updateStepStatus(step, completed) {
        const box = document.querySelectorAll('.selection-box')[step - 1];
        const checkCircle = box.querySelector('.check-circle');
        
        if (completed) {
            checkCircle.classList.add('active');
        } else {
            checkCircle.classList.remove('active');
        }
    }

    updateShippingFee(deliveryOption) {
        if (!this.orderSummary) return;

        const shippingFees = {
            'standard': 50.00,
            'express': 150.00,
            'same_day': 250.00,
            'pickup': 0.00
        };

        let newShippingFee = shippingFees[deliveryOption] || 50.00;

        // Free shipping for orders over 5000
        if (this.orderSummary.subtotal >= 5000 && deliveryOption !== 'pickup') {
            newShippingFee = 0.00;
        }

        // Update order summary
        const oldShippingFee = parseFloat(this.orderSummary.shipping_fee);
        this.orderSummary.shipping_fee = newShippingFee;
        this.orderSummary.total = parseFloat(this.orderSummary.total) - oldShippingFee + newShippingFee;

        // Update UI
        this.renderOrderSummary();
    }

    updatePurchaseButton() {
        const btn = document.querySelector('.btn-purchase');
        const allComplete = this.checkoutData.address && 
                           this.checkoutData.delivery && 
                           this.checkoutData.payment;
        
        btn.disabled = !allComplete;
        if (allComplete) {
            btn.textContent = 'Complete Purchase';
        }
    }

    async processCheckout() {
        if (!this.checkoutData.address || !this.checkoutData.delivery || !this.checkoutData.payment) {
            alert('Please complete all steps before purchasing');
            return;
        }

        console.log('=== PROCESS CHECKOUT DEBUG ===');
        console.log('Checkout data:', this.checkoutData);

        try {
            // Show loading
            const btn = document.querySelector('.btn-purchase');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

            const checkoutPayload = {
                shipping_address: this.checkoutData.address,
                delivery_option: this.checkoutData.delivery,
                payment_method: this.checkoutData.payment,
                customer_notes: this.checkoutData.notes || null
            };

            console.log('Checkout payload:', checkoutPayload);

            const token = localStorage.getItem(this.tokenKey || 'access_token');
            const response = await fetch(`${this.apiBaseUrl}/checkout/process`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(checkoutPayload)
            });

            console.log('Checkout response:', {
                status: response.status,
                ok: response.ok
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Checkout error data:', errorData);
                throw new Error(errorData.detail || 'Checkout failed');
            }

            const orderData = await response.json();
            console.log('Order created successfully:', orderData);
            
            // Save order data for confirmation page
            sessionStorage.setItem('order_data', JSON.stringify(orderData));

            // Show success message
            this.showSuccessModal(orderData.order_number);

        } catch (error) {
            console.error('Checkout error:', error);
            alert(`Error: ${error.message}`);
            
            // Reset button
            const btn = document.querySelector('.btn-purchase');
            btn.disabled = false;
            btn.textContent = 'Complete Purchase';
        }
    }

    showSuccessModal(orderNumber) {
        // Redirect to success page instead of showing modal
        window.location.href = 'success.html';
    }

    showError(message) {
        alert(message);
    }
}

// Initialize checkout manager
let checkoutManager;
document.addEventListener('DOMContentLoaded', () => {
    checkoutManager = new CheckoutManager();
});