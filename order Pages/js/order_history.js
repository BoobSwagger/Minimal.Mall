// order_history.js - Order History Page Handler for Minimal Mall

class OrderHistoryManager {
    constructor() {
        this.apiBaseUrl = 'https://minimallbackend.onrender.com/api';
        this.orders = [];
        this.filteredOrders = [];
        this.init();
    }

    init() {
        console.log('=== ORDER HISTORY INIT ===');
        
        // Check authentication
        const token = this.getToken();
        if (!token) {
            console.warn('No authentication token found');
            alert('Please login to view your orders');
            window.location.href = '../logIn Pages/login.html';
            return;
        }

        // Load orders
        this.loadOrders();
        
        // Setup event listeners
        this.setupEventListeners();
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

    setupEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.filter-search input');
        const clearBtn = document.querySelector('.filter-search .fa-xmark');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.handleSearch('');
            });
        }
    }

    async loadOrders() {
        try {
            console.log('Loading orders...');
            
            const token = this.getToken();
            const response = await fetch(`${this.apiBaseUrl}/orders`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Orders response:', {
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

            if (!response.ok) {
                throw new Error(`Failed to load orders: ${response.status}`);
            }

            this.orders = await response.json();
            this.filteredOrders = [...this.orders];
            
            console.log(`Loaded ${this.orders.length} orders`);
            
            this.renderOrders();

        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError('Failed to load orders. Please try again.');
        }
    }

    renderOrders() {
        console.log('Rendering orders...');
        
        // Separate orders by status
        const pendingOrders = this.filteredOrders.filter(order => 
            ['pending', 'processing', 'shipped'].includes(order.status)
        );
        const completedOrders = this.filteredOrders.filter(order => 
            ['delivered', 'completed'].includes(order.status)
        );

        // Render pending orders
        this.renderOrderSection('pending', pendingOrders);
        
        // Render completed orders
        this.renderOrderSection('completed', completedOrders);
    }

    renderOrderSection(section, orders) {
        // Find the section header
        const headers = document.querySelectorAll('.section-header');
        let sectionHeader;
        
        for (const header of headers) {
            if (section === 'pending' && header.textContent.includes('Pending')) {
                sectionHeader = header;
                break;
            } else if (section === 'completed' && header.textContent.includes('Completed')) {
                sectionHeader = header;
                break;
            }
        }

        if (!sectionHeader) {
            console.warn(`Section header not found for: ${section}`);
            return;
        }

        // Remove existing order items in this section
        let nextElement = sectionHeader.nextElementSibling;
        while (nextElement && !nextElement.classList.contains('section-header')) {
            const toRemove = nextElement;
            nextElement = nextElement.nextElementSibling;
            if (toRemove.classList.contains('order-item')) {
                toRemove.remove();
            }
        }

        // Add orders or empty message
        if (orders.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'order-item text-center text-muted py-4';
            emptyMsg.innerHTML = `<i class="fa-solid fa-box-open fs-3 mb-2"></i><p>No ${section} orders</p>`;
            sectionHeader.after(emptyMsg);
            return;
        }

        // Insert orders after section header
        let insertAfter = sectionHeader;
        orders.forEach(order => {
            const orderElement = this.createOrderElement(order);
            insertAfter.after(orderElement);
            insertAfter = orderElement;
        });
    }

    createOrderElement(order) {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-item';
        orderDiv.style.cursor = 'pointer';
        
        // Calculate total items
        const totalItems = order.items ? order.items.length : 0;
        
        // Format date
        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });

        // Get status badge class
        const statusClass = ['delivered', 'completed'].includes(order.status) ? 'completed' : '';
        
        orderDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="item-name">Order #${order.order_number}</div>
                    <div class="item-meta">Ordered on: ${formattedDate}</div>
                </div>
                <div class="d-flex align-items-center gap-3">
                    <div class="item-price">₱${parseFloat(order.total).toFixed(2)}</div>
                    <button class="btn-dots" onclick="event.stopPropagation();">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                </div>
            </div>
            
            <div class="item-divider"></div>
            
            <div class="d-flex justify-content-between align-items-center">
                <div class="item-meta">Number of Items: ${totalItems}</div>
                <span class="status-badge ${statusClass}">${this.formatStatus(order.status)}</span>
            </div>
        `;

        // Add click handler to view order details
        orderDiv.addEventListener('click', () => {
            this.viewOrderDetails(order.order_id);
        });

        return orderDiv;
    }

    viewOrderDetails(orderId) {
        // Navigate to order details page with order ID
        window.location.href = `order_details.html?id=${orderId}`;
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

    handleSearch(query) {
        console.log('Searching for:', query);
        
        if (!query.trim()) {
            this.filteredOrders = [...this.orders];
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredOrders = this.orders.filter(order => 
                order.order_number.toLowerCase().includes(lowerQuery) ||
                order.status.toLowerCase().includes(lowerQuery)
            );
        }
        
        this.renderOrders();
    }

    showError(message) {
        const contentCard = document.querySelector('.content-card');
        if (contentCard) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger mt-3';
            errorDiv.innerHTML = `<i class="fa-solid fa-exclamation-circle me-2"></i>${message}`;
            contentCard.prepend(errorDiv);
            
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new OrderHistoryManager();
});