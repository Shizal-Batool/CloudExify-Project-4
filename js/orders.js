// orders.js

async function placeOrder() {
  const total = getCartTotal();
  if (cart.length === 0) {
    showToast('Error', 'Your cart is empty.', true);
    return;
  }
  
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    showToast('Error', 'Please log in to place an order.', true);
    // Optionally trigger login modal or redirect
    window.location.href = 'login.html';
    return;
  }
  
  const addressInput = document.getElementById('deliveryAddress');
  const paymentInput = document.getElementById('paymentMethod');
  const contactInput = document.getElementById('contactNumber');
  
  const deliveryAddress = addressInput ? addressInput.value.trim() : '';
  const paymentMethod = paymentInput ? paymentInput.value : '';
  const contactNumber = contactInput ? contactInput.value.trim() : '';
  
  if (!contactNumber) {
    showToast('Error', 'Please enter a contact number.', true);
    return;
  }
  
  if (!deliveryAddress) {
    showToast('Error', 'Please enter a delivery address.', true);
    return;
  }
  
  // Basic validation if Card is selected
  if (paymentMethod === 'Credit/Debit Card') {
    const cardNum = document.getElementById('cardNumber')?.value.trim();
    if (!cardNum) {
      showToast('Error', 'Please enter card details.', true);
      return;
    }
  }

  const confirmBtn = document.getElementById('confirmCheckoutBtn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Placing Order...';
  }
  
  const { data, error } = await supabaseClient
    .from('orders')
    .insert([{ 
      user_id: session.user.id, 
      items: cart, 
      total: total, 
      status: 'Pending',
      delivery_address: deliveryAddress,
      payment_method: paymentMethod,
      contact_number: contactNumber
    }])
    .select();
    
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirm Order';
  }
    
  if (error) {
    console.error(error);
    showToast('Error', 'Could not place order. Please try again.', true);
    return;
  }
  
  clearCart();
  
  // Hide modals and offcanvas
  const checkoutModalEl = document.getElementById('checkoutModal');
  if (checkoutModalEl) {
    const bsModal = bootstrap.Modal.getInstance(checkoutModalEl) || new bootstrap.Modal(checkoutModalEl);
    bsModal.hide();
  }
  
  const cartOffcanvasEl = document.getElementById('cartOffcanvas');
  if (cartOffcanvasEl) {
    const bsOffcanvas = bootstrap.Offcanvas.getInstance(cartOffcanvasEl);
    if (bsOffcanvas) bsOffcanvas.hide();
  }
  
  if (addressInput) addressInput.value = '';
  if (contactInput) contactInput.value = '';
  const cardNumberInput = document.getElementById('cardNumber');
  if (cardNumberInput) cardNumberInput.value = '';
  
  showToast('Success', `Order placed! Order ID: ${data[0].id}`);
  
  // Refresh order history if on that page
  loadUserOrders();
}

async function loadUserOrders() {
  const ordersContainer = document.getElementById('userOrdersContainer');
  if (!ordersContainer) return;
  
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  
  ordersContainer.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>';
  
  const { data: orders, error } = await supabaseClient
    .from('orders')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });
    
  if (error) {
    ordersContainer.innerHTML = '<p class="text-danger">Error loading orders.</p>';
    return;
  }
  
  if (!orders || orders.length === 0) {
    ordersContainer.innerHTML = '<p class="text-muted">You have no past orders.</p>';
    return;
  }
  
  let html = '';
  orders.forEach(order => {
    const date = new Date(order.created_at).toLocaleString();
    let badgeClass = 'bg-secondary';
    if (order.status === 'Pending') badgeClass = 'bg-warning text-dark';
    if (order.status === 'Preparing') badgeClass = 'bg-info text-dark';
    if (order.status === 'Ready') badgeClass = 'bg-success';
    
    // Summarize items
    const itemsSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
    
    html += `
      <div class="card mb-3 shadow-sm border-0 bg-dark">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="card-title mb-0">Order #${order.id}</h6>
            <span class="badge ${badgeClass}">${order.status}</span>
          </div>
          <p class="small text-muted mb-2">${date}</p>
          <p class="mb-2 small">${itemsSummary}</p>
          <p class="fw-bold text-primary mb-0">Total: Rs. ${Number(order.total).toFixed(2)}</p>
        </div>
      </div>
    `;
  });
  
  ordersContainer.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  const confirmBtn = document.getElementById('confirmCheckoutBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', placeOrder);
  }
  
  const paymentSelect = document.getElementById('paymentMethod');
  const cardSection = document.getElementById('cardDetailsSection');
  if (paymentSelect && cardSection) {
    paymentSelect.addEventListener('change', (e) => {
      if (e.target.value === 'Credit/Debit Card') {
        cardSection.classList.remove('d-none');
      } else {
        cardSection.classList.add('d-none');
      }
    });
  }
  
  // Call this if on a page with orders container
  loadUserOrders();
  
  // Set up real-time notifications for the customer
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      supabaseClient
        .channel('public:orders')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `user_id=eq.${session.user.id}`
        }, payload => {
          const updatedOrder = payload.new;
          if (updatedOrder.status === 'Ready') {
            showToast('Order Ready!', `Your order #${updatedOrder.id} is ready! 🎉`);
          } else if (updatedOrder.status === 'Preparing') {
            showToast('Order Update', `Your order #${updatedOrder.id} is now being prepared. 👨‍🍳`);
          }
          // Refresh the list if it's open
          loadUserOrders();
        })
        .subscribe();
    }
  });
});
