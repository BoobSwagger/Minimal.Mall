// seller_ordermanagement.js
const API_BASE_URL = 'http://localhost:5000/api';

class SellerOrderManagement {
    constructor() {
        this.currentPage = 1;
        this.ordersPerPage = 10;
        this.filters = {
            status: 'all',
            dateRange: 'this_week',
            search: ''
        };
        this.init();
    }

    init() {
        this.loadSellerInfo();
        this.loadOrders();
        this.setupEventListeners();
        this.setupRealTimeUpdates();
    }

    async loadSellerInfo() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/seller/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateSellerDisplay(data.seller);
            }
        } catch (error) {
            console.error('Error loading seller info:', error);
        }
    }

    updateSellerDisplay(seller) {
        const storeName = document.querySelector('.seller-profile-mini h5');
        if (storeName) {
            storeName.textContent = seller.store_name || 'My Store';
        }
    }

    async loadOrders() {
        try {
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.ordersPerPage,
                status: this.filters.status,
                date_range: this.filters.dateRange,
                search: this.filters.search
            });

            const response = await fetch(`${API_BASE_URL}/seller/orders?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderOrders(data.orders);
                this.updateOrderStats(data.stats);
                this.updatePagination(data.pagination);
            } else {
                throw new Error('Failed to load orders');
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError('Failed to load orders. Please try again.');
        }
    }

    renderOrders(orders) {
        const tbody = document.querySelector('.custom-table tbody');
        
        if (!orders || orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <i class="fa-solid fa-box-open fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No orders found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr data-order-id="${order.id}">
                <td class="fw-bold">${order.order_number}</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="customer-avatar">${this.getInitials(order.customer_name)}</div>
                        <div>
                            <div class="fw-medium">${order.customer_name}</div>
                            <small class="text-muted">${order.customer_email || ''}</small>
                        </div>
                    </div>
                </td>
                <td>${order.item_count} item${order.item_count > 1 ? 's' : ''}</td>
                <td class="fw-bold">₱${this.formatMoney(order.seller_subtotal)}</td>
                <td>${this.formatDate(order.created_at)}</td>
                <td>${this.getStatusBadge(order.status)}</td>
                <td>
                    <div class="d-flex gap-2">
                        <button class="btn-view" onclick="orderManager.viewOrder(${order.id})" title="View Details">
                            <i class="fa-regular fa-eye"></i>
                        </button>
                        ${this.getActionButton(order)}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }

    getStatusBadge(status) {
        const statusMap = {
            'pending': { class: 'status-pending-orange', text: 'Pending' },
            'processing': { class: 'status-processing-blue', text: 'Processing' },
            'shipped': { class: 'status-shipped-blue', text: 'Shipped' },
            'delivered': { class: 'status-delivered-green', text: 'Delivered' },
            'cancelled': { class: 'status-cancelled-red', text: 'Cancelled' },
            'refunded': { class: 'status-refunded-gray', text: 'Refunded' }
        };

        const statusInfo = statusMap[status] || { class: 'status-pending-orange', text: status };
        return `<span class="status-pill ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    getActionButton(order) {
        if (order.status === 'pending') {
            return `
                <button class="btn-action btn-process" onclick="orderManager.processOrder(${order.id})" title="Process Order">
                    <i class="fa-solid fa-check"></i>
                </button>
            `;
        } else if (order.status === 'processing') {
            return `
                <button class="btn-action btn-ship" onclick="orderManager.markAsShipped(${order.id})" title="Mark as Shipped">
                    <i class="fa-solid fa-truck"></i>
                </button>
            `;
        }
        return '';
    }

    async viewOrder(orderId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/seller/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showOrderModal(data.order);
            }
        } catch (error) {
            console.error('Error loading order details:', error);
            this.showError('Failed to load order details');
        }
    }

    showOrderModal(order) {
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Order Details - ${order.order_number}</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row g-4">
                            <div class="col-md-6">
                                <h6 class="fw-bold mb-3">Customer Information</h6>
                                <p class="mb-2"><strong>Name:</strong> ${order.shipping_full_name}</p>
                                <p class="mb-2"><strong>Email:</strong> ${order.customer_email || 'N/A'}</p>
                                <p class="mb-2"><strong>Phone:</strong> ${order.shipping_phone}</p>
                            </div>
                            <div class="col-md-6">
                                <h6 class="fw-bold mb-3">Shipping Address</h6>
                                <p class="mb-1">${order.shipping_address_line1}</p>
                                ${order.shipping_address_line2 ? `<p class="mb-1">${order.shipping_address_line2}</p>` : ''}
                                <p class="mb-1">${order.shipping_city}, ${order.shipping_state} ${order.shipping_postal_code}</p>
                                <p class="mb-1">${order.shipping_country}</p>
                            </div>
                        </div>

                        <hr class="my-4">

                        <h6 class="fw-bold mb-3">Order Items (Your Products)</h6>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>SKU</th>
                                        <th>Quantity</th>
                                        <th>Price</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${order.items.map(item => `
                                        <tr>
                                            <td>
                                                <div class="fw-medium">${item.product_name}</div>
                                                ${item.variant_name ? `<small class="text-muted">${item.variant_name}: ${item.variant_value}</small>` : ''}
                                            </td>
                                            <td><code>${item.sku}</code></td>
                                            <td>${item.quantity}</td>
                                            <td>₱${this.formatMoney(item.price)}</td>
                                            <td class="fw-bold">₱${this.formatMoney(item.subtotal)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <hr class="my-4">

                        <div class="row">
                            <div class="col-md-6">
                                <h6 class="fw-bold mb-3">Order Status</h6>
                                <p class="mb-2">${this.getStatusBadge(order.status)}</p>
                                <p class="mb-2"><strong>Payment Status:</strong> ${order.payment_status}</p>
                                <p class="mb-2"><strong>Payment Method:</strong> ${this.formatPaymentMethod(order.payment_method)}</p>
                                <p class="mb-2"><strong>Delivery Option:</strong> ${this.formatDeliveryOption(order.delivery_option)}</p>
                            </div>
                            <div class="col-md-6">
                                <h6 class="fw-bold mb-3">Your Earnings</h6>
                                <div class="bg-light p-3 rounded">
                                    <div class="d-flex justify-content-between mb-2">
                                        <span>Subtotal:</span>
                                        <span>₱${this.formatMoney(order.seller_subtotal)}</span>
                                    </div>
                                    <div class="d-flex justify-content-between mb-2 text-danger">
                                        <span>Marketplace Fee (${order.commission_rate}%):</span>
                                        <span>-₱${this.formatMoney(order.marketplace_fee)}</span>
                                    </div>
                                    <hr>
                                    <div class="d-flex justify-content-between fw-bold fs-5">
                                        <span>Your Payout:</span>
                                        <span class="text-success">₱${this.formatMoney(order.seller_payout)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${order.customer_notes ? `
                            <hr class="my-4">
                            <h6 class="fw-bold mb-3">Customer Notes</h6>
                            <p class="bg-light p-3 rounded">${order.customer_notes}</p>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        ${this.getModalActionButtons(order)}
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    getModalActionButtons(order) {
        if (order.status === 'pending') {
            return `<button class="btn btn-primary" onclick="orderManager.processOrder(${order.id}); this.closest('.modal').remove();">Process Order</button>`;
        } else if (order.status === 'processing') {
            return `<button class="btn btn-primary" onclick="orderManager.markAsShipped(${order.id}); this.closest('.modal').remove();">Mark as Shipped</button>`;
        }
        return '';
    }

    async processOrder(orderId) {
        if (!confirm('Process this order?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/seller/orders/${orderId}/process`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showSuccess('Order processed successfully!');
                this.loadOrders();
            } else {
                throw new Error('Failed to process order');
            }
        } catch (error) {
            console.error('Error processing order:', error);
            this.showError('Failed to process order');
        }
    }

    async markAsShipped(orderId) {
        const trackingNumber = prompt('Enter tracking number (optional):');
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/seller/orders/${orderId}/ship`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tracking_number: trackingNumber })
            });

            if (response.ok) {
                this.showSuccess('Order marked as shipped!');
                this.loadOrders();
            } else {
                throw new Error('Failed to mark as shipped');
            }
        } catch (error) {
            console.error('Error marking as shipped:', error);
            this.showError('Failed to mark as shipped');
        }
    }

    setupEventListeners() {
        // Status filter
        const statusSelect = document.querySelectorAll('.custom-select')[0];
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                this.filters.status = e.target.value.toLowerCase().replace(' ', '_');
                this.currentPage = 1;
                this.loadOrders();
            });
        }

        // Date range filter
        const dateSelect = document.querySelectorAll('.custom-select')[1];
        if (dateSelect) {
            dateSelect.addEventListener('change', (e) => {
                this.filters.dateRange = e.target.value.toLowerCase().replace(' ', '_');
                this.currentPage = 1;
                this.loadOrders();
            });
        }

        // Search
        const searchInput = document.querySelector('.order-search-input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.filters.search = e.target.value;
                    this.currentPage = 1;
                    this.loadOrders();
                }, 500);
            });
        }
    }

    setupRealTimeUpdates() {
        // Poll for new orders every 30 seconds
        setInterval(() => {
            this.loadOrders();
        }, 30000);
    }

    updateOrderStats(stats) {
        const badge = document.querySelector('.nav-badge');
        if (badge && stats) {
            badge.textContent = stats.pending_count || 0;
        }
    }

    updatePagination(pagination) {
        // Add pagination UI if needed
        console.log('Pagination:', pagination);
    }

    formatMoney(amount) {
        return parseFloat(amount).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    formatPaymentMethod(method) {
        const methods = {
            'credit_card': 'Credit Card',
            'debit_card': 'Debit Card',
            'cash_on_delivery': 'Cash on Delivery',
            'gcash': 'GCash',
            'paymaya': 'PayMaya',
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

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'danger');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <i class="fa-solid fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize on page load
let orderManager;
document.addEventListener('DOMContentLoaded', () => {
    orderManager = new SellerOrderManagement();
});