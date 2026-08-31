// admin.js
// Guard
requireAdmin();

let adminStatsInterval;

async function loadDashboardStats() {
  const { data: orders, error: ordersErr } = await supabaseClient.from('orders').select('total, status');
  const { count: menuCount, error: menuErr } = await supabaseClient.from('menu_items').select('*', { count: 'exact', head: true });
  
  if (ordersErr || menuErr) {
    console.error('Error fetching stats');
    return;
  }
  
  const todayStr = new Date().toISOString().split('T')[0];
  // Simplification for the demo: considering all orders, not strictly today's. 
  // In a real app, query by created_at >= today
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const pendingOrders = orders.filter(o => o.status === 'Pending').length;
  
  document.getElementById('statTotalOrders').textContent = totalOrders;
  document.getElementById('statTotalRevenue').textContent = `Rs. ${totalRevenue.toFixed(2)}`;
  document.getElementById('statPendingOrders').textContent = pendingOrders;
  document.getElementById('statTotalMenu').textContent = menuCount || 0;
}

async function loadAdminOrders() {
  const tbody = document.getElementById('adminOrdersTable');
  if (!tbody) return;
  
  const { data: orders, error } = await supabaseClient
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="6" class="text-danger">Error loading orders</td></tr>';
    return;
  }
  
  tbody.innerHTML = '';
  
  orders.forEach(order => {
    const tr = document.createElement('tr');
    
    // Customer Name
    const customerName = 'User';
    
    // Items
    const itemsSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
    
    // Status Select
    const statusSelect = `
      <select class="form-select form-select-sm status-select" data-order-id="${order.id}">
        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
        <option value="Preparing" ${order.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
        <option value="Ready" ${order.status === 'Ready' ? 'selected' : ''}>Ready</option>
      </select>
    `;
    
    // Details
    const details = `
      <div class="small text-muted" style="line-height: 1.2;">
        <strong>Phone:</strong> ${order.contact_number || 'N/A'}<br>
        <strong>Pay:</strong> ${order.payment_method || 'N/A'}<br>
        <strong>Addr:</strong> ${order.delivery_address || 'N/A'}
      </div>
    `;
    
    tr.innerHTML = `
      <td>#${order.id}</td>
      <td>${customerName}</td>
      <td><small>${itemsSummary}</small></td>
      <td>Rs. ${Number(order.total).toFixed(2)}</td>
      <td>${details}</td>
      <td>${new Date(order.created_at).toLocaleString()}</td>
      <td>${statusSelect}</td>
    `;
    
    tbody.appendChild(tr);
  });
}

async function updateOrderStatus(orderId, newStatus) {
  const { error } = await supabaseClient
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);
    
  if (error) {
    console.error('Status update failed:', error.message);
    showToast('Error', 'Status update failed.', true);
    return;
  }
  
  showToast('Success', `Order #${orderId} marked as ${newStatus}`);
  loadDashboardStats(); // update pending stats
}

// Menu Management
async function loadAdminMenu() {
  const tbody = document.getElementById('adminMenuTable');
  if (!tbody) return;
  
  const { data: items, error } = await supabaseClient
    .from('menu_items')
    .select('*')
    .order('name');
    
  if (error) {
    console.error(error);
    return;
  }
  
  tbody.innerHTML = '';
  items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.category || 'N/A'}</td>
      <td>Rs. ${Number(item.price).toFixed(2)}</td>
      <td>
        <div class="form-check form-switch">
          <input class="form-check-input available-toggle" type="checkbox" role="switch" 
            data-item-id="${item.id}" ${item.available ? 'checked' : ''}>
        </div>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-danger delete-menu-btn" data-item-id="${item.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function handleAddMenuForm(e) {
  e.preventDefault();
  
  const name = document.getElementById('menuName').value;
  const price = document.getElementById('menuPrice').value;
  const category = document.getElementById('menuCategory').value;
  const description = document.getElementById('menuDescription').value;
  const image_url = document.getElementById('menuImage').value;
  
  const { error } = await supabaseClient
    .from('menu_items')
    .insert([{
      name, price, category, description, image_url, available: true
    }]);
    
  if (error) {
    showToast('Error', 'Failed to add menu item.', true);
  } else {
    showToast('Success', 'Menu item added!');
    document.getElementById('addMenuForm').reset();
    loadAdminMenu();
    loadDashboardStats();
  }
}

async function toggleAvailability(itemId, available) {
  const { error } = await supabaseClient
    .from('menu_items')
    .update({ available })
    .eq('id', itemId);
    
  if (error) {
    showToast('Error', 'Failed to update availability.', true);
  } else {
    showToast('Success', 'Availability updated.');
  }
}

async function deleteMenuItem(itemId) {
  if (!confirm('Are you sure you want to delete this menu item?')) return;
  
  const { error } = await supabaseClient
    .from('menu_items')
    .delete()
    .eq('id', itemId);
    
  if (error) {
    showToast('Error', 'Failed to delete item.', true);
  } else {
    showToast('Success', 'Item deleted.');
    loadAdminMenu();
    loadDashboardStats();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Init
  loadDashboardStats();
  loadAdminOrders();
  loadAdminMenu();
  
  // Refresh stats periodically
  adminStatsInterval = setInterval(() => {
    loadDashboardStats();
    loadAdminOrders();
  }, 30000);
  
  // Attach event listener for order status changes
  const ordersTable = document.getElementById('adminOrdersTable');
  if (ordersTable) {
    ordersTable.addEventListener('change', (e) => {
      if (e.target.classList.contains('status-select')) {
        const orderId = e.target.dataset.orderId;
        updateOrderStatus(orderId, e.target.value);
      }
    });
  }
  
  // Add Menu Form
  const addMenuForm = document.getElementById('addMenuForm');
  if (addMenuForm) {
    addMenuForm.addEventListener('submit', handleAddMenuForm);
  }
  
  // Menu Table Interactions (Availability and Delete)
  const menuTable = document.getElementById('adminMenuTable');
  if (menuTable) {
    menuTable.addEventListener('change', (e) => {
      if (e.target.classList.contains('available-toggle')) {
        toggleAvailability(e.target.dataset.itemId, e.target.checked);
      }
    });
    
    menuTable.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-menu-btn')) {
        deleteMenuItem(e.target.dataset.itemId);
      }
    });
  }
});
