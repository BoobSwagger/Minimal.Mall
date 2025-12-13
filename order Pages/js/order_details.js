// order_details.js - Order Details Page Handler for Minimal Mall

class OrderDetailsManager {
    constructor() {
        this.apiBaseUrl = 'https://minimallbackend.onrender.com/api';
        this.orderId = null;
        this.orderData = null;
        this.init();
    }

    init() {
        console.log('=== ORDER DETAILS INIT ===');
        
        // Get order ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.orderId = urlParams.get('id');
        
        console.log('Order ID:', this.orderId);

        if (!this.orderId) {
            console.error('No order ID provided');
            alert('Order not found');
            window.location.href = 'order_history.html';
            return;
        }

        // Check authentication
        const token = this.getToken();
        if (!token) {
            console.warn('No authentication token found');
            alert('Please login to view order details');
            window.location.href = '../logIn Pages/login.html';
            return;
        }

        // Load order details
        this.loadOrderDetails();
    }

    getToken() {
        // Check multiple possible token keys
        const possibleKeys = ['access_token', 'token', 'authToken', 'jwt'];
        for (const key of possibleKeys) {
            const token = localStorage.getItem(key);
            if (token) {
                this.tokenKey = key;
                return token;
            }
        }
        return null;
    }

    async loadOrderDetails() {
        try {
            console.log('Loading order details for ID:', this.orderId);
            
            const token = this.getToken();
            const response = await fetch(`${this.apiBaseUrl}/orders/${this.orderId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Order details response:', {
                status: response.status,
                ok: response.ok
            });

            if (response.status === 401) {
                console.error('Authentication failed');
                localStorage.removeItem(this.tokenKey);
                alert('Session expired. Please login again.');
                window.location.href = '../logIn Pages/login.html';
                return;
            }

            if (response.status === 404) {
                alert('Order not found');
                window.location.href = 'order_history.html';
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to load order details: ${response.status}`);
            }

            this.orderData = await response.json();
            console.log('Order data loaded:', this.orderData);
            
            this.renderOrderDetails();

        } catch (error) {
            console.error('Error loading order details:', error);
            this.showError('Failed to load order details. Please try again.');
        }
    }

    renderOrderDetails() {
        if (!this.orderData) return;

        console.log('Rendering order details...');

        // Update order title and metadata
        this.renderOrderHeader();

        // Update shipping address
        this.renderShippingAddress();

        // Update contact details
        this.renderContactDetails();

        // Update shipping info
        this.renderShippingInfo();

        // Update product list
        this.renderProductList();

        console.log('Order details rendered successfully');
    }

    renderOrderHeader() {
        const titleElement = document.querySelector('.order-title');
        if (titleElement) {
            titleElement.textContent = `Order #${this.orderData.order_number}`;
        }

        const metaElement = document.querySelector('.order-meta');
        if (metaElement) {
            const orderDate = new Date(this.orderData.created_at);
            const formattedDate = orderDate.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
            const formattedTime = orderDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            metaElement.textContent = `Ordered on: ${formattedDate} at ${formattedTime}`;
        }

        const totalElement = document.querySelector('.order-total');
        if (totalElement) {
            totalElement.textContent = `₱${parseFloat(this.orderData.total).toFixed(2)}`;
        }
    }

    renderShippingAddress() {
        const addressSection = document.querySelector('.col-md-6:first-child p');
        if (addressSection && this.orderData.shipping_address) {
            const addr = this.orderData.shipping_address;
            addressSection.innerHTML = `
                ${addr.full_name}<br>
                ${addr.address_line1}<br>
                ${addr.address_line2 ? addr.address_line2 + '<br>' : ''}
                ${addr.city}, ${addr.state}, ${addr.postal_code}<br>
                ${addr.country}
            `;
        }
    }

    renderContactDetails() {
        const contactSection = document.querySelector('.col-md-6.text-md-end p');
        if (contactSection && this.orderData.shipping_address) {
            const addr = this.orderData.shipping_address;
            contactSection.innerHTML = `
                Phone: ${addr.phone}<br>
                Email: ${this.orderData.user_email || 'N/A'}
            `;
        }
    }

    renderShippingInfo() {
        const shippingBox = document.querySelector('.shipping-box');
        if (shippingBox) {
            // For now, show delivery option and estimated date
            const deliveryDate = new Date(this.orderData.estimated_delivery_date);
            const formattedDeliveryDate = deliveryDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });

            shippingBox.innerHTML = `
                <div>
                    <div class="fw-bold text-dark d-flex align-items-center flex-wrap fs-5 mb-1">
                        ${this.formatDeliveryOption(this.orderData.delivery_option)}
                        <span class="tracking-number">${this.orderData.order_number}</span>
                    </div>
                    <small class="text-muted">
                        Status: ${this.formatStatus(this.orderData.status)}<br>
                        Estimated Delivery: ${formattedDeliveryDate}
                    </small>
                </div>
                <span class="badge bg-primary fs-6 px-3 py-2">${this.formatStatus(this.orderData.status)}</span>
            `;
        }
    }

    renderProductList() {
        const productList = document.querySelector('.product-list');
        if (!productList || !this.orderData.items) return;

        // Clear existing items
        productList.innerHTML = '';

        // Add each product
        this.orderData.items.forEach(item => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            
            productItem.innerHTML = `
                <div class="prod-img">
                    ${item.image_url ? 
                        `<img src="${item.image_url}" alt="${item.product_name}">` :
                        `<div class="bg-light d-flex align-items-center justify-content-center h-100">
                            <i class="fa-solid fa-image text-muted"></i>
                        </div>`
                    }
                </div>
                <div class="flex-grow-1">
                    <div class="prod-name">${item.product_name}</div>
                    ${item.variant_name ? 
                        `<div class="text-muted small mb-1">${item.variant_name}: ${item.variant_value}</div>` : 
                        ''
                    }
                    <div class="prod-qty">Quantity: ${item.quantity}</div>
                    <div class="text-muted small">₱${parseFloat(item.price).toFixed(2)} each</div>
                </div>
                <div class="prod-price">₱${parseFloat(item.subtotal).toFixed(2)}</div>
            `;

            productList.appendChild(productItem);
        });

        // Add order summary at the end
        this.renderOrderSummary(productList);
    }

    renderOrderSummary(productList) {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'order-summary mt-4 pt-4 border-top';
        
        summaryDiv.innerHTML = `
            <div class="row justify-content-end">
                <div class="col-md-6">
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted">Subtotal:</span>
                        <span>₱${parseFloat(this.orderData.subtotal).toFixed(2)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted">Tax (12%):</span>
                        <span>₱${parseFloat(this.orderData.tax).toFixed(2)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted">Shipping Fee:</span>
                        <span>₱${parseFloat(this.orderData.shipping_fee).toFixed(2)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted">Marketplace Fee:</span>
                        <span>₱${parseFloat(this.orderData.marketplace_fee).toFixed(2)}</span>
                    </div>
                    ${this.orderData.discount > 0 ? `
                        <div class="d-flex justify-content-between mb-2 text-success">
                            <span>Discount:</span>
                            <span>-₱${parseFloat(this.orderData.discount).toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <hr>
                    <div class="d-flex justify-content-between">
                        <strong>Total:</strong>
                        <strong class="text-primary fs-5">₱${parseFloat(this.orderData.total).toFixed(2)}</strong>
                    </div>
                    <div class="mt-3">
                        <small class="text-muted">
                            Payment Method: ${this.formatPaymentMethod(this.orderData.payment_method)}<br>
                            Payment Status: ${this.formatPaymentStatus(this.orderData.payment_status)}
                        </small>
                    </div>
                </div>
            </div>
        `;

        productList.appendChild(summaryDiv);
    }

    formatStatus(status) {
        const statusMap = {
            'pending': 'Pending',
            'processing': 'Processing',
            'shipped': 'Shipped',
            'delivered': 'Delivered',
            'completed': 'Completed',
            'cancelled': 'Cancelled',
            'refunded': 'Refunded'
        };
        return statusMap[status] || status;
    }

    formatPaymentStatus(status) {
        const statusMap = {
            'pending': 'Pending',
            'paid': 'Paid',
            'failed': 'Failed',
            'refunded': 'Refunded'
        };
        return statusMap[status] || status;
    }

    formatPaymentMethod(method) {
        const methods = {
            'credit_card': 'Credit Card',
            'debit_card': 'Debit Card',
            'gcash': 'GCash',
            'paymaya': 'PayMaya',
            'cash_on_delivery': 'Cash on Delivery',
            'bank_transfer': 'Bank Transfer'
        };
        return methods[method] || method;
    }

    formatDeliveryOption(option) {
        const options = {
            'standard': 'Standard Delivery',
            'express': 'Express Delivery',
            'same_day': 'Same Day Delivery',
            'pickup': 'Store Pickup'
        };
        return options[option] || option;
    }

    showError(message) {
        const orderCard = document.querySelector('.order-card');
        if (orderCard) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger mt-3';
            errorDiv.innerHTML = `<i class="fa-solid fa-exclamation-circle me-2"></i>${message}`;
            orderCard.prepend(errorDiv);
            
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new OrderDetailsManager();
});