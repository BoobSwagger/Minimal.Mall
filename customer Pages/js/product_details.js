// product_details.js - Compact version
let currentProduct = null;
let selectedSize = null;
let selectedColor = null;
let currentQuantity = 1;

const getProductIdFromURL = () => new URLSearchParams(window.location.search).get('id');

function showToast(message, type = 'success') {
    const toast = document.getElementById('cartToast');
    const msg = document.getElementById('toastMessage');
    const icons = { success: 'check-circle', warning: 'exclamation-circle', error: 'times-circle' };
    const colors = { success: 'bg-success', warning: 'bg-warning', error: 'bg-danger' };
    
    msg.innerHTML = `<i class="fa-solid fa-${icons[type]} me-2"></i>${message}`;
    toast.classList.remove('bg-success', 'bg-warning', 'bg-danger');
    toast.classList.add(colors[type]);
    new bootstrap.Toast(toast).show();
}

function renderProductImages(product) {
    const main = document.getElementById('mainImage');
    const thumbs = document.getElementById('thumbnailContainer');
    
    const primaryImg = product.primary_image || product.images?.[0]?.image_url || 
        'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80';
    
    main.src = primaryImg;
    main.alt = product.name;
    thumbs.innerHTML = '';
    
    const images = product.images?.length > 0 ? product.images : [{ image_url: primaryImg }];
    images.forEach((img, i) => {
        const thumb = document.createElement('div');
        thumb.className = `thumbnail ${i === 0 ? 'active' : ''}`;
        thumb.innerHTML = `<img src="${img.image_url}" alt="${product.name}">`;
        thumb.onclick = () => {
            main.src = img.image_url;
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        };
        thumbs.appendChild(thumb);
    });
}

function renderProductInfo(product) {
    currentProduct = product;
    
    document.getElementById('productTitle').textContent = product.name;
    document.getElementById('productBreadcrumb').textContent = product.name;
    document.getElementById('categoryBreadcrumb').textContent = product.category_name || 'Products';
    
    const price = parseFloat(product.price);
    const compare = product.compare_at_price ? parseFloat(product.compare_at_price) : null;
    
    document.getElementById('currentPrice').textContent = `₱${price.toFixed(2)}`;
    
    if (compare && compare > price) {
        const savings = compare - price;
        const discount = Math.round(((compare - price) / compare) * 100);
        
        document.getElementById('originalPrice').textContent = `₱${compare.toFixed(2)}`;
        document.getElementById('originalPrice').style.display = 'inline';
        document.getElementById('savings').textContent = `You save ₱${savings.toFixed(2)} (${discount}% off)`;
        document.getElementById('savings').style.display = 'inline-block';
        document.getElementById('discountBadge').textContent = `${discount}% OFF`;
        document.getElementById('discountBadge').style.display = 'block';
    }
    
    // Stock status with proper logic (API uses quantity_in_stock)
    const status = document.getElementById('stockStatus');
    const stock = product.quantity_in_stock || product.stock_quantity || 0;
    const addBtn = document.getElementById('addToCartBtn');
    
    if (stock > 20) {
        status.className = 'stock-status in-stock';
        status.innerHTML = '<i class="fa-solid fa-circle-check"></i><span>In Stock</span>';
        addBtn.disabled = false;
    } else if (stock > 0) {
        status.className = 'stock-status low-stock';
        status.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span>Only ${stock} left!</span>`;
        addBtn.disabled = false;
    } else {
        status.className = 'stock-status out-of-stock';
        status.innerHTML = '<i class="fa-solid fa-circle-xmark"></i><span>Out of Stock</span>';
        addBtn.disabled = true;
    }
    
    document.getElementById('productDescription').textContent = product.description || 'No description available.';
    
    renderSpecifications(product);
    if (product.variants?.length > 0) renderVariants(product.variants);
    
    if (product.tags?.length > 0) {
        const specsTable = document.getElementById('specificationsTable');
        const row = document.createElement('tr');
        row.innerHTML = `<td>Tags</td><td>${product.tags.map(t => `<span class="badge bg-secondary me-2">${t}</span>`).join('')}</td>`;
        specsTable.querySelector('tbody').appendChild(row);
    }
}

function renderSpecifications(product) {
    const tbody = document.getElementById('specificationsTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    const stock = product.quantity_in_stock || product.stock_quantity || 0;
    
    [
        { label: 'SKU', value: product.sku || 'N/A' },
        { label: 'Category', value: product.category_name || 'N/A' },
        { label: 'Brand', value: product.brand || 'Generic' },
        { label: 'Stock', value: `${stock} units` }
    ].forEach(spec => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${spec.label}</td><td>${spec.value}</td>`;
        tbody.appendChild(row);
    });
}

function renderVariants(variants) {
    const sizes = new Set();
    const colors = new Set();
    
    variants.forEach(v => {
        if (v.size) sizes.add(v.size);
        if (v.color) colors.add(v.color);
    });
    
    if (sizes.size > 0) {
        document.getElementById('sizeSection').style.display = 'block';
        const sizeBox = document.getElementById('sizeButtons');
        sizeBox.innerHTML = '';
        
        sizes.forEach(size => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = size;
            btn.onclick = () => {
                document.querySelectorAll('#sizeButtons .option-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedSize = size;
            };
            sizeBox.appendChild(btn);
        });
        sizeBox.firstChild?.click();
    }
    
    if (colors.size > 0) {
        document.getElementById('colorSection').style.display = 'block';
        const colorBox = document.getElementById('colorButtons');
        colorBox.innerHTML = '';
        
        colors.forEach(color => {
            const btn = document.createElement('button');
            btn.className = 'color-btn';
            btn.style.background = color.toLowerCase();
            btn.title = color;
            btn.onclick = () => {
                document.querySelectorAll('#colorButtons .color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedColor = color;
            };
            colorBox.appendChild(btn);
        });
        colorBox.firstChild?.click();
    }
}

async function loadRelatedProducts(categoryId, currentProductId) {
    const container = document.getElementById('relatedProductsContainer');
    
    try {
        const result = await getProducts({ category_id: categoryId, limit: 4 });
        
        if (result.success && result.products.length > 0) {
            const related = result.products.filter(p => p.id !== currentProductId);
            
            if (related.length > 0) {
                container.innerHTML = related.map(p => renderProductCard(p)).join('');
                
                document.querySelectorAll('.product-card').forEach(card => {
                    card.style.cursor = 'pointer';
                    card.onclick = function(e) {
                        if (!e.target.classList.contains('heart-icon') && !e.target.closest('.cart-icon-btn')) {
                            window.location.href = `product_details.html?id=${this.dataset.productId}`;
                        }
                    };
                });
                
                addProductClickHandlers();
            } else {
                container.innerHTML = '<div class="col-12 text-center py-3"><p class="text-muted">No related products found</p></div>';
            }
        } else {
            container.innerHTML = '<div class="col-12 text-center py-3"><p class="text-muted">No related products available</p></div>';
        }
    } catch (err) {
        console.error('Related products error:', err);
        container.innerHTML = '<div class="col-12 text-center py-3"><p class="text-muted">Unable to load related products</p></div>';
    }
}

function initializeQuantityControls() {
    const dec = document.getElementById('decreaseQty');
    const inc = document.getElementById('increaseQty');
    const input = document.getElementById('quantityInput');
    
    dec.onclick = () => {
        if (currentQuantity > 1) {
            currentQuantity--;
            input.value = currentQuantity;
        }
    };
    
    inc.onclick = () => {
        const max = currentProduct?.quantity_in_stock || currentProduct?.stock_quantity || 99;
        if (currentQuantity < max) {
            currentQuantity++;
            input.value = currentQuantity;
        } else {
            showToast(`Only ${max} items available in stock`, 'warning');
        }
    };
    
    input.onchange = (e) => {
        let val = parseInt(e.target.value);
        const max = currentProduct?.quantity_in_stock || currentProduct?.stock_quantity || 99;
        
        if (isNaN(val) || val < 1) val = 1;
        else if (val > max) {
            val = max;
            showToast(`Only ${max} items available in stock`, 'warning');
        }
        
        currentQuantity = val;
        e.target.value = val;
    };
}

function initializeFavoriteButton() {
    const btn = document.getElementById('favoriteBtn');
    btn.onclick = () => {
        const icon = btn.querySelector('i');
        if (icon.classList.contains('fa-regular')) {
            icon.classList.remove('fa-regular');
            icon.classList.add('fa-solid');
            showToast('Added to favorites!', 'success');
        } else {
            icon.classList.remove('fa-solid');
            icon.classList.add('fa-regular');
            showToast('Removed from favorites', 'success');
        }
    };
}

function initializeAddToCartButton() {
    const btn = document.getElementById('addToCartBtn');
    
    btn.onclick = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast('Please login to add items to cart', 'warning');
            setTimeout(() => window.location.href = '../logIn Pages/login.html', 1500);
            return;
        }
        
        if (!currentProduct) {
            showToast('Product information not available', 'error');
            return;
        }
        
        // Check stock availability (API uses quantity_in_stock)
        const availableStock = currentProduct.quantity_in_stock || currentProduct.stock_quantity || 0;
        if (availableStock < currentQuantity) {
            showToast('Insufficient stock available', 'error');
            return;
        }
        
        const html = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Adding...';
        btn.disabled = true;
        
        try {
            if (window.CartAPI) {
                await window.CartAPI.addToCart(parseInt(currentProduct.id), currentQuantity);
                
                if (window.CartUI) await window.CartUI.updateCartCount();
                
                showToast(`${currentQuantity} item(s) added to cart!`, 'success');
                
                // Update local stock display
                if (currentProduct.quantity_in_stock) {
                    currentProduct.quantity_in_stock -= currentQuantity;
                } else if (currentProduct.stock_quantity) {
                    currentProduct.stock_quantity -= currentQuantity;
                }
                
                const stock = currentProduct.quantity_in_stock || currentProduct.stock_quantity || 0;
                
                if (stock > 20) {
                    status.className = 'stock-status in-stock';
                    status.innerHTML = '<i class="fa-solid fa-circle-check"></i><span>In Stock</span>';
                } else if (stock > 0) {
                    status.className = 'stock-status low-stock';
                    status.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span>Only ${stock} left!</span>`;
                } else {
                    status.className = 'stock-status out-of-stock';
                    status.innerHTML = '<i class="fa-solid fa-circle-xmark"></i><span>Out of Stock</span>';
                    btn.disabled = true;
                }
                
                // Reset quantity to 1
                currentQuantity = 1;
                document.getElementById('quantityInput').value = 1;
            } else {
                console.error('CartAPI not available');
                showToast('Cart system not loaded', 'error');
            }
        } catch (err) {
            console.error('Add to cart error:', err);
            showToast(err.message || 'Failed to add to cart', 'error');
        } finally {
            const remainingStock = currentProduct.quantity_in_stock || currentProduct.stock_quantity || 0;
            if (remainingStock > 0) {
                btn.innerHTML = html;
                btn.disabled = false;
            } else {
                btn.innerHTML = '<i class="fa-solid fa-ban me-2"></i>Out of Stock';
            }
        }
    };
}

async function loadProductDetails() {
    const id = getProductIdFromURL();
    const loading = document.getElementById('loadingSpinner');
    
    if (!id) {
        loading.innerHTML = `
            <div class="text-center py-5">
                <i class="fa-solid fa-exclamation-triangle fs-1 text-warning mb-3"></i>
                <p class="text-muted">No product ID provided</p>
                <a href="index.html" class="btn btn-primary mt-3">Back to Home</a>
            </div>
        `;
        return;
    }
    
    try {
        const result = await getProductById(id);
        
        if (result.success && result.product) {
            currentProduct = result.product;
            
            loading.style.display = 'none';
            document.getElementById('productInfo').style.display = 'block';
            
            renderProductImages(result.product);
            renderProductInfo(result.product);
            
            if (result.product.category_id) {
                loadRelatedProducts(result.product.category_id, result.product.id);
            }
        } else {
            loading.innerHTML = `
                <div class="text-center py-5">
                    <i class="fa-solid fa-box-open fs-1 text-muted mb-3"></i>
                    <p class="text-muted">Product not found</p>
                    <a href="index.html" class="btn btn-primary mt-3">Back to Home</a>
                </div>
            `;
        }
    } catch (err) {
        console.error('Load product error:', err);
        loading.innerHTML = `
            <div class="text-center py-5">
                <i class="fa-solid fa-triangle-exclamation fs-1 text-danger mb-3"></i>
                <p class="text-muted">Error loading product: ${err.message}</p>
                <button class="btn btn-primary mt-3" onclick="loadProductDetails()">
                    <i class="fa-solid fa-rotate-right me-2"></i>Retry
                </button>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.CartUI) window.CartUI.updateCartCount();
    
    // Check if user is logged in using localStorage directly
    if (localStorage.getItem('authToken')) {
        const icon = document.getElementById('userIcon');
        if (icon) icon.innerHTML = '<i class="fa-solid fa-user fs-5"></i>';
    }
    
    initializeQuantityControls();
    initializeFavoriteButton();
    initializeAddToCartButton();
    
    // Remove Buy Now button if it exists
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (buyNowBtn) buyNowBtn.remove();
    
    loadProductDetails();
});