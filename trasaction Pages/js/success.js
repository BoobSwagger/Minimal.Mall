// success.js - Order Success Page Handler for Minimal Mall

class OrderSuccessManager {
    constructor() {
        this.orderData = null;
        this.init();
    }

    init() {
        console.log('=== ORDER SUCCESS PAGE INIT ===');
        
        // Get order data from sessionStorage
        const orderDataStr = sessionStorage.getItem('order_data');
        
        if (!orderDataStr) {
            console.warn('No order data found in sessionStorage');
            // Show placeholder amount and redirect after delay
            this.showPlaceholderAmount();
            setTimeout(() => {
                window.location.href = '../order Pages/order_history.html';
            }, 5000);
            return;
        }

        try {
            this.orderData = JSON.parse(orderDataStr);
            console.log('Order data loaded:', this.orderData);
            
            // Clear the session storage after loading
            sessionStorage.removeItem('order_data');
            
            // Render the order success
            this.renderOrderSuccess();
            
        } catch (error) {
            console.error('Error parsing order data:', error);
            this.showPlaceholderAmount();
        }
    }

    renderOrderSuccess() {
        if (!this.orderData) {
            this.showPlaceholderAmount();
            return;
        }

        // Update the amount display with the total
        const amountElement = document.querySelector('.success-amount');
        if (amountElement) {
            amountElement.textContent = `₱${parseFloat(this.orderData.total).toFixed(2)}`;
            console.log('Amount displayed:', this.orderData.total);
        }

        // Update the title to include order number
        const titleElement = document.querySelector('.success-title');
        if (titleElement) {
            titleElement.textContent = 'Order Confirmed!';
        }

        // Update the message to include order details
        const messageElement = document.querySelector('.success-message');
        if (messageElement) {
            const deliveryDate = new Date(this.orderData.estimated_delivery_date);
            const formattedDate = deliveryDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            messageElement.innerHTML = `
                Your order <strong>${this.orderData.order_number}</strong> has been confirmed!<br>
                Estimated delivery: <strong>${formattedDate}</strong><br><br>
                Payment Method: <strong>${this.formatPaymentMethod(this.orderData.payment_method)}</strong><br>
                You will receive an email confirmation shortly with tracking details.
            `;
        }

        // Update close button to go to index
        const closeBtn = document.querySelector('.btn-close-custom');
        if (closeBtn) {
            closeBtn.href = '../customer Pages/index.html';
        }

        // Update history button
        const historyBtn = document.querySelector('.btn-history');
        if (historyBtn) {
            historyBtn.href = '../order Pages/order_history.html';
        }

        console.log('Order success page rendered successfully');
    }

    showPlaceholderAmount() {
        const amountElement = document.querySelector('.success-amount');
        if (amountElement) {
            amountElement.textContent = '₱0.00';
        }

        const messageElement = document.querySelector('.success-message');
        if (messageElement) {
            messageElement.innerHTML = `
                Your payment has been confirmed, it may take 1 - 2 hours for your payment to process.<br>
                <small class="text-muted">Redirecting to order history...</small>
            `;
        }
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new OrderSuccessManager();
});