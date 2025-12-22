// API Configuration
const API_BASE_URL = 'http://localhost:8000/api';

// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('access_token');
}

// Check authentication
function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '../auth/login.html';
        return false;
    }
    return true;
}

// API Headers
function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
    };
}

// State
let currentProducts = [];
let currentCategories = [];
let currentPage = 1;
let totalPages = 1;
let filterStatus = 'all';
let searchQuery = '';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    
    loadSellerProfile();
    loadCategories();
    loadProducts();
    
    // Event listeners
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    const addBtn = document.querySelector('.btn-add-purple');
    if (addBtn) {
        addBtn.addEventListener('click', showAddProductModal);
    }
    
    // Tab filters
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const text = this.textContent.toLowerCase();
            if (text.includes('all')) filterStatus = 'all';
            else if (text.includes('active')) filterStatus = 'active';
            else if (text.includes('drafts')) filterStatus = 'draft';
            else if (text.includes('out of stock')) filterStatus = 'out_of_stock';
            
            currentPage = 1;
            loadProducts();
        });
    });
});

// Load seller profile
async function loadSellerProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/profile/seller/profile`, {
            headers: getHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            updateSellerInfo(data);
        }
    } catch (error) {
        console.error('Error loading seller profile:', error);
    }
}

// Update seller info in sidebar
function updateSellerInfo(profile) {
    const storeName = document.querySelector('.seller-profile-mini h5');
    if (storeName && profile.store_name) {
        storeName.textContent = profile.store_name;
    }
}

// Load categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        if (response.ok) {
            const data = await response.json();
            currentCategories = data.categories || [];
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load products (seller's products only)
async function loadProducts() {
    try {
        showLoading();
        
        // Build filter params
        let params = new URLSearchParams({
            limit: 10,
            offset: (currentPage - 1) * 10
        });
        
        // Add search if exists
        if (searchQuery) {
            params.append('search', searchQuery);
        }
        
        // For now, we'll use the general products endpoint and filter client-side
        // In production, you should create a /seller/products endpoint
        const response = await fetch(`${API_BASE_URL}/products?${params}`, {
            headers: getHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            let products = data.products || [];
            
            // Client-side filtering by status
            if (filterStatus !== 'all') {
                products = products.filter(p => {
                    if (filterStatus === 'active') return p.is_active && p.quantity_in_stock > 0;
                    if (filterStatus === 'draft') return !p.is_active;
                    if (filterStatus === 'out_of_stock') return p.is_active && p.quantity_in_stock === 0;
                    return true;
                });
            }
            
            currentProducts = products;
            totalPages = Math.ceil((data.total || products.length) / 10);
            
            renderProducts();
            renderPagination();
            updateTabCounts(products);
        } else {
            showError('Failed to load products');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Error loading products');
    } finally {
        hideLoading();
    }
}

// Render products table
function renderProducts() {
    const tbody = document.querySelector('.custom-table tbody');
    
    if (!tbody) return;
    
    if (currentProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <i class="fa-solid fa-box-open fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No products found</p>
                    <button class="btn-add-purple mt-2" onclick="showAddProductModal()">
                        + Add Your First Product
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = currentProducts.map(product => `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-3">
                    <img src="${product.primary_image || 'https://via.placeholder.com/45'}" 
                         class="prod-thumb" 
                         alt="${product.name}"
                         onerror="this.src='https://via.placeholder.com/45'">
                    <div>
                        <div class="fw-bold text-dark">${escapeHtml(product.name)}</div>
                        <div class="text-muted small">SKU: ${product.sku || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(product.category_name || 'Uncategorized')}</td>
            <td class="fw-bold">₱${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.quantity_in_stock || 0}</td>
            <td>${getStatusBadge(product)}</td>
            <td>
                <div class="d-flex gap-2">
                    <button class="action-btn" onclick="editProduct(${product.id})" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="action-btn" onclick="confirmDeleteProduct(${product.id}, '${escapeHtml(product.name)}')" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Get status badge HTML
function getStatusBadge(product) {
    if (!product.is_active) {
        return '<span class="status-badge status-draft">Draft</span>';
    }
    if (product.quantity_in_stock === 0) {
        return '<span class="status-badge status-out">Out of Stock</span>';
    }
    return '<span class="status-badge status-active">Active</span>';
}

// Render pagination
function renderPagination() {
    const container = document.querySelector('.d-flex.justify-content-end.mt-4.gap-2');
    
    if (!container) return;
    
    let html = '';
    
    // Previous button
    html += `<a href="#" class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
                onclick="changePage(${currentPage - 1}); return false;">Prev</a>`;
    
    // Page numbers
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<a href="#" class="page-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="changePage(${i}); return false;">${i}</a>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="page-btn disabled">...</span>`;
        }
    }
    
    // Next button
    html += `<a href="#" class="page-btn ${currentPage >= totalPages ? 'disabled' : ''}" 
                onclick="changePage(${currentPage + 1}); return false;">Next</a>`;
    
    container.innerHTML = html;
}

// Change page
function changePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadProducts();
}

// Update tab counts
function updateTabCounts(products) {
    const all = products.length;
    const active = products.filter(p => p.is_active && p.quantity_in_stock > 0).length;
    const draft = products.filter(p => !p.is_active).length;
    const outOfStock = products.filter(p => p.is_active && p.quantity_in_stock === 0).length;
    
    const tabs = document.querySelectorAll('.tab-item');
    if (tabs.length >= 4) {
        tabs[0].textContent = `All (${all})`;
        tabs[1].textContent = `Active (${active})`;
        tabs[2].textContent = `Drafts (${draft})`;
        tabs[3].textContent = `Out of Stock (${outOfStock})`;
    }
}

// Handle search
function handleSearch(e) {
    searchQuery = e.target.value;
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadProducts();
    }, 500);
}

// Show add product modal
function showAddProductModal() {
    const modalHTML = `
        <div class="modal fade" id="productModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add New Product</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="productForm">
                            <input type="hidden" id="productId">
                            
                            <div class="mb-3">
                                <label class="form-label">Product Name *</label>
                                <input type="text" class="form-control" id="productName" required>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Category *</label>
                                    <select class="form-select" id="productCategory" required>
                                        <option value="">Select category</option>
                                        ${currentCategories.map(cat => 
                                            `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">SKU</label>
                                    <input type="text" class="form-control" id="productSKU" 
                                           placeholder="e.g., SHOE-NK-001">
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Short Description</label>
                                <input type="text" class="form-control" id="productShortDesc" 
                                       maxlength="200" placeholder="Brief one-line description">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Full Description</label>
                                <textarea class="form-control" id="productDescription" rows="4" 
                                          placeholder="Detailed product description"></textarea>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Price (₱) *</label>
                                    <input type="number" class="form-control" id="productPrice" 
                                           step="0.01" min="0" required placeholder="0.00">
                                </div>
                                
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Compare at Price (₱)</label>
                                    <input type="number" class="form-control" id="productComparePrice" 
                                           step="0.01" min="0" placeholder="Original price">
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Stock Quantity *</label>
                                    <input type="number" class="form-control" id="productStock" 
                                           min="0" required placeholder="0">
                                </div>
                                
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Weight (kg)</label>
                                    <input type="number" class="form-control" id="productWeight" 
                                           step="0.01" min="0" placeholder="0.00">
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Product Image URL</label>
                                <input type="url" class="form-control" id="productImage" 
                                       placeholder="https://example.com/image.jpg">
                                <small class="text-muted">Use Unsplash or any image hosting service</small>
                            </div>
                            
                            <div class="form-check mb-3">
                                <input type="checkbox" class="form-check-input" id="productFeatured">
                                <label class="form-check-label" for="productFeatured">
                                    Featured Product
                                </label>
                            </div>
                            
                            <div class="form-check mb-3">
                                <input type="checkbox" class="form-check-input" id="productActive" checked>
                                <label class="form-check-label" for="productActive">
                                    Active (visible to customers)
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveProduct()">Save Product</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('productModal');
    if (existingModal) existingModal.remove();
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

// Edit product
async function editProduct(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/products/id/${productId}`);
        
        if (response.ok) {
            const result = await response.json();
            const product = result.product;
            
            showAddProductModal();
            
            // Wait for modal to render
            setTimeout(() => {
                // Populate form
                document.getElementById('productId').value = product.id;
                document.getElementById('productName').value = product.name;
                document.getElementById('productCategory').value = product.category_id;
                document.getElementById('productSKU').value = product.sku || '';
                document.getElementById('productShortDesc').value = product.short_description || '';
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('productPrice').value = product.price;
                document.getElementById('productComparePrice').value = product.compare_at_price || '';
                document.getElementById('productStock').value = product.quantity_in_stock;
                document.getElementById('productWeight').value = product.weight || '';
                
                // Image - get primary image
                const primaryImage = product.images?.find(img => img.is_primary);
                if (primaryImage) {
                    document.getElementById('productImage').value = primaryImage.image_url;
                }
                
                document.getElementById('productFeatured').checked = product.is_featured || false;
                document.getElementById('productActive').checked = product.is_active !== false;
                
                document.querySelector('#productModal .modal-title').textContent = 'Edit Product';
            }, 100);
        } else {
            showError('Failed to load product details');
        }
    } catch (error) {
        console.error('Error loading product:', error);
        showError('Error loading product');
    }
}

// Save product (Note: This requires backend endpoints that don't exist yet)
async function saveProduct() {
    const form = document.getElementById('productForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const productId = document.getElementById('productId').value;
    
    // Create slug from name
    const name = document.getElementById('productName').value;
    const slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    
    const productData = {
        name: name,
        slug: slug,
        category_id: parseInt(document.getElementById('productCategory').value),
        sku: document.getElementById('productSKU').value || null,
        short_description: document.getElementById('productShortDesc').value || null,
        description: document.getElementById('productDescription').value || null,
        price: parseFloat(document.getElementById('productPrice').value),
        compare_at_price: document.getElementById('productComparePrice').value 
            ? parseFloat(document.getElementById('productComparePrice').value) 
            : null,
        quantity_in_stock: parseInt(document.getElementById('productStock').value),
        weight: document.getElementById('productWeight').value 
            ? parseFloat(document.getElementById('productWeight').value) 
            : null,
        is_featured: document.getElementById('productFeatured').checked,
        is_active: document.getElementById('productActive').checked,
        image_url: document.getElementById('productImage').value || null
    };
    
    // Since backend doesn't have seller product endpoints yet, show message
    console.log('Product data to save:', productData);
    
    showError('Product management endpoints are not yet implemented in the backend. Please add seller product CRUD endpoints first.');
    
    // TODO: Implement when backend is ready
    // const url = productId 
    //     ? `${API_BASE_URL}/seller/products/${productId}`
    //     : `${API_BASE_URL}/seller/products`;
    // const method = productId ? 'PUT' : 'POST';
}

// Confirm delete product
function confirmDeleteProduct(productId, productName) {
    if (confirm(`Are you sure you want to delete "${productName}"?\n\nThis action cannot be undone.`)) {
        deleteProduct(productId);
    }
}

// Delete product (Note: This requires backend endpoints that don't exist yet)
async function deleteProduct(productId) {
    showError('Product delete endpoint is not yet implemented in the backend. Please add seller product DELETE endpoint first.');
    
    // TODO: Implement when backend is ready
    // try {
    //     const response = await fetch(`${API_BASE_URL}/seller/products/${productId}`, {
    //         method: 'DELETE',
    //         headers: getHeaders()
    //     });
    //     
    //     if (response.ok) {
    //         showSuccess('Product deleted successfully');
    //         loadProducts();
    //     }
    // } catch (error) {
    //     console.error('Error deleting product:', error);
    // }
}

// UI Helper functions
function showLoading() {
    const tbody = document.querySelector('.custom-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

function hideLoading() {
    // Loading is hidden when products are rendered
}

function showError(message) {
    alert('❌ ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Logout
function logout() {
    localStorage.removeItem('access_token');
    window.location.href = '../auth/login.html';
}