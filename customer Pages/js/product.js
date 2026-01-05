// products.js - Compact Product API handler
const API_BASE_URL = 'https://minimallbackend.onrender.com';

// API Functions
async function fetchAPI(endpoint) {
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`);
        const data = await res.json();
        return res.ok ? data : { success: false, message: data.detail, products: [], categories: [], total: 0 };
    } catch (err) {
        console.error('API Error:', err);
        return { success: false, message: err.message, products: [], categories: [], total: 0 };
    }
}

const getProducts = (opts = {}) => {
    const params = new URLSearchParams(opts).toString();
    return fetchAPI(`/api/products?${params}`);
};

const getFeaturedProducts = (limit = 8) => fetchAPI(`/api/products/featured?limit=${limit}`);
const getProductById = (id) => fetchAPI(`/api/products/id/${id}`);
const getProductBySlug = (slug) => fetchAPI(`/api/products/${slug}`);
const searchProducts = (q, limit = 20) => fetchAPI(`/api/products/search?q=${encodeURIComponent(q)}&limit=${limit}`);
const getProductsByTag = (tag, limit = 20) => fetchAPI(`/api/products/tag/${encodeURIComponent(tag)}?limit=${limit}`);
const getCategories = () => fetchAPI('/api/categories');
const getCategoryBySlug = (slug) => fetchAPI(`/api/categories/${slug}`);

// Render Functions
function renderProductCard(product) {
    const price = parseFloat(product.price).toFixed(2);
    const comparePrice = product.compare_at_price ? parseFloat(product.compare_at_price).toFixed(2) : null;
    const discount = comparePrice ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;
    const imageUrl = product.primary_image || (product.images?.[0]?.image_url) || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=400&q=80';
    
    return `
        <div class="col-12 col-sm-6 col-lg-3">
            <div class="product-card" data-product-id="${product.id}">
                ${discount > 0 ? `<span class="badge bg-danger position-absolute top-0 start-0 m-2">${discount}% OFF</span>` : ''}
                <div class="prod-img-box">
                    <img src="${imageUrl}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=400&q=80'">
                </div>
                <div class="row">
                    <div class="col-7">
                        <h4 class="prod-title">${product.name}</h4>
                        <span class="prod-cat">${product.category_name}</span>
                    </div>
                    <div class="col-5 text-end">
                        <div class="prod-price">₱${price}</div>
                        ${comparePrice ? `<small class="text-muted text-decoration-line-through">₱${comparePrice}</small>` : ''}
                        <i class="fa-regular fa-heart heart-icon mt-2 text-muted" style="cursor: pointer;"></i>
                    </div>
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-outline-primary flex-grow-1 cart-icon-btn">
                        <i class="fa-solid fa-cart-plus me-2"></i>Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderCategoryCard(category) {
    const defaultImages = {
        'shoes': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80',
        'outerwear': 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
        'fitness-wear': 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=600&q=80'
    };
    const imageUrl = category.image_url || defaultImages[category.slug] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80';
    
    return `
        <div class="col-md-4">
            <div class="category-card" data-category-id="${category.id}" data-category-slug="${category.slug}">
                <img src="${imageUrl}" class="cat-img" alt="${category.name}">
                <div class="cat-overlay">
                    <h3 class="cat-name">${category.name}</h3>
                    <span class="cat-count">${category.product_count || 0} Products</span>
                </div>
            </div>
        </div>
    `;
}

// Load Functions
async function loadProducts(containerId = 'productContainer', opts = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>';
    const result = await getProducts(opts);
    
    container.innerHTML = result.success && result.products.length > 0
        ? result.products.map(p => renderProductCard(p)).join('')
        : '<div class="col-12 text-center py-5"><p class="text-muted">No products found</p></div>';
    
    if (result.success) addProductClickHandlers();
}

async function loadFeaturedProducts(containerId = 'productContainer', limit = 8) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-3 text-muted">Loading products...</p></div>';
    const result = await getFeaturedProducts(limit);
    
    if (result.success && result.products.length > 0) {
        container.innerHTML = result.products.map(p => renderProductCard(p)).join('');
        addProductClickHandlers();
    } else {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fa-solid fa-box-open fs-1 text-muted mb-3"></i>
                <p class="text-muted">Unable to load products. Please check your backend connection.</p>
                <button class="btn btn-primary mt-3" onclick="loadFeaturedProducts('productContainer', 8)">
                    <i class="fa-solid fa-rotate-right me-2"></i>Retry
                </button>
            </div>
        `;
    }
}

async function loadCategories(containerId = 'categoryContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="col-12 text-center py-3"><div class="spinner-border text-white"></div></div>';
    const result = await getCategories();
    
    if (result.success && result.categories.length > 0) {
        container.innerHTML = result.categories.map(c => renderCategoryCard(c)).join('');
        document.querySelectorAll('.category-card').forEach(card => {
            card.style.cursor = 'pointer';
            card.onclick = () => loadProducts('productContainer', { category_id: card.dataset.categoryId });
        });
    } else {
        container.innerHTML = `
            <div class="col-md-4">
                <div class="category-card">
                    <img src="https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80" class="cat-img" alt="Shoes">
                    <div class="cat-overlay"><h3 class="cat-name">Shoes</h3><span class="cat-count">3.1k Products</span></div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="category-card">
                    <img src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80" class="cat-img" alt="Outerwear">
                    <div class="cat-overlay"><h3 class="cat-name">Outerwear</h3><span class="cat-count">1.4k Products</span></div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="category-card">
                    <img src="https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=600&q=80" class="cat-img" alt="Fitness">
                    <div class="cat-overlay"><h3 class="cat-name">Fitness Wear</h3><span class="cat-count">320 Products</span></div>
                </div>
            </div>
        `;
    }
}

// Event Handlers
function addProductClickHandlers() {
    // Add to cart
    document.querySelectorAll('.cart-icon-btn').forEach(btn => {
        btn.onclick = async function(e) {
            e.stopPropagation();
            const token = localStorage.getItem('authToken');
            if (!token) {
                if (typeof showToast === 'function') showToast('Please login to add items to cart', 'warning');
                setTimeout(() => window.location.href = '../logIn Pages/login.html', 1500);
                return;
            }
            
            this.style.transform = 'scale(0.95)';
            const html = this.innerHTML;
            this.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Adding...';
            this.disabled = true;
            
            try {
                const productId = this.closest('.product-card').dataset.productId;
                if (window.CartAPI) {
                    await window.CartAPI.addToCart(parseInt(productId), 1);
                    if (window.CartUI) await window.CartUI.updateCartCount();
                    if (typeof showToast === 'function') showToast('Product added to cart!', 'success');
                }
            } catch (err) {
                console.error('Cart error:', err);
                if (typeof showToast === 'function') showToast(err.message || 'Failed to add to cart', 'error');
            } finally {
                this.innerHTML = html;
                this.disabled = false;
                setTimeout(() => this.style.transform = 'scale(1)', 100);
            }
        };
    });
    
    // Favorites
    document.querySelectorAll('.heart-icon').forEach(heart => {
        heart.onclick = function(e) {
            e.stopPropagation();
            this.classList.toggle('fa-regular');
            this.classList.toggle('fa-solid');
            this.classList.toggle('text-muted');
            if (typeof showToast === 'function' && this.classList.contains('fa-solid')) {
                showToast('Added to favorites!', 'success');
            }
        };
    });
    
    // Product details
    document.querySelectorAll('.product-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.onclick = function(e) {
            if (!e.target.classList.contains('heart-icon') && !e.target.closest('.cart-icon-btn')) {
                window.location.href = `product_details.html?id=${this.dataset.productId}`;
            }
        };
    });
}

// Search
function initializeSearch(searchInputId = 'searchInput') {
    const input = document.querySelector(`#${searchInputId}, .header-search input`);
    if (!input) return;
    
    let timeout;
    input.oninput = async function() {
        clearTimeout(timeout);
        const term = this.value.trim();
        
        if (term.length >= 2) {
            timeout = setTimeout(async () => {
                const result = await searchProducts(term);
                const container = document.getElementById('productContainer');
                if (container) {
                    container.innerHTML = result.success && result.products.length > 0
                        ? result.products.map(p => renderProductCard(p)).join('')
                        : '<div class="col-12 text-center py-5"><p class="text-muted">No products found</p></div>';
                    if (result.success) addProductClickHandlers();
                }
            }, 500);
        } else if (term.length === 0) {
            loadFeaturedProducts();
        }
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCategories('categoryContainer');
    loadFeaturedProducts('productContainer', 8);
    initializeSearch();
});

// Exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getProducts, getFeaturedProducts, getProductById, getProductBySlug, searchProducts, getProductsByTag, getCategories, getCategoryBySlug, loadProducts, loadFeaturedProducts, loadCategories };
}   