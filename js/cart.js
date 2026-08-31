// cart.js
let cart = JSON.parse(sessionStorage.getItem('restaurant_cart')) || [];

function saveCart() {
  sessionStorage.setItem('restaurant_cart', JSON.stringify(cart));
  updateCartUI();
}

function addToCart(item) {
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart();
  showToast('Added to Cart', `${item.name} has been added to your cart.`);
}

function removeFromCart(itemId) {
  cart = cart.filter(i => i.id !== itemId);
  saveCart();
}

function updateQuantity(itemId, delta) {
  const item = cart.find(i => i.id === itemId);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(itemId);
    } else {
      saveCart();
    }
  }
}

function getCartTotal() {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function updateCartUI() {
  const cartBadge = document.getElementById('cartBadge');
  if (cartBadge) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? 'inline-block' : 'none';
  }
  
  const cartBody = document.getElementById('cartBody');
  const cartTotalDisplay = document.getElementById('cartTotal');
  
  if (cartBody && cartTotalDisplay) {
    if (cart.length === 0) {
      cartBody.innerHTML = '<p class="text-muted text-center my-5">Your cart is empty.</p>';
      cartTotalDisplay.textContent = '0.00';
      return;
    }
    
    let html = '';
    cart.forEach(item => {
      html += `
        <div class="cart-item">
          <div>
            <div class="cart-item-title">${item.name}</div>
            <div class="text-primary fw-bold">Rs. ${Number(item.price).toFixed(2)}</div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-sm btn-outline-secondary py-0" onclick="updateQuantity(${item.id}, -1)">-</button>
            <span>${item.quantity}</span>
            <button class="btn btn-sm btn-outline-secondary py-0" onclick="updateQuantity(${item.id}, 1)">+</button>
          </div>
        </div>
      `;
    });
    cartBody.innerHTML = html;
    cartTotalDisplay.textContent = getCartTotal().toFixed(2);
  }
}

function clearCart() {
  cart = [];
  saveCart();
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartUI();
});
