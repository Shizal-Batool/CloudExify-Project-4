// menu.js
async function loadMenu(category = 'all') {
  const menuGrid = document.getElementById('menuGrid');
  if (!menuGrid) return;
  
  menuGrid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>';
  
  try {
    let query = supabaseClient.from('menu_items').select('*').eq('available', true);
    if (category !== 'all') {
      query = query.eq('category', category);
    }
    
    const { data: items, error } = await query.order('name');
    
    if (error) { 
      console.error('Supabase query error:', error); 
      menuGrid.innerHTML = '<div class="col-12 text-center text-danger">Failed to load menu: ' + error.message + '</div>';
      return; 
    }
    
    if (!items || items.length === 0) {
      menuGrid.innerHTML = '<div class="col-12 text-center py-5 text-muted">No items available in this category.</div>';
      return;
    }
    
    menuGrid.innerHTML = '';
    
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'col-12 col-md-6 col-lg-4 mb-4';
      
      const img = `<img src="${item.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}" class="card-img-top" alt="${item.name}">`;
      
      const cardBody = `
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="card-title mb-0">${item.name}</h5>
            <span class="text-primary fw-bold">Rs. ${Number(item.price).toFixed(2)}</span>
          </div>
          <p class="card-text text-muted small flex-grow-1">${item.description || ''}</p>
          <button class="btn btn-outline-primary w-100 mt-3 add-to-cart-btn" onclick='handleAddToCart(${JSON.stringify(item)})'>
            Add to Cart
          </button>
        </div>
      `;
      
      card.innerHTML = `<div class="card h-100 shadow-sm">${img}${cardBody}</div>`;
      menuGrid.appendChild(card);
    });
  } catch (err) {
    console.error('Unexpected error loading menu:', err);
    menuGrid.innerHTML = '<div class="col-12 text-center text-danger">Unexpected error: ' + err.message + '</div>';
  }
}

// Ensure the function is in global scope for the inline onclick
window.handleAddToCart = function(item) {
  addToCart(item);
};

// Category Filtering
document.addEventListener('DOMContentLoaded', () => {
  const categoryBtns = document.querySelectorAll('.category-filter .btn');
  if (categoryBtns.length > 0) {
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Update active state
        categoryBtns.forEach(b => b.classList.remove('btn-primary'));
        categoryBtns.forEach(b => b.classList.add('btn-outline-primary'));
        e.target.classList.remove('btn-outline-primary');
        e.target.classList.add('btn-primary');
        
        // Filter
        const cat = e.target.getAttribute('data-category');
        loadMenu(cat);
      });
    });
  }
  
  // Search filtering (client side)
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const cards = document.querySelectorAll('#menuGrid .col-12');
      cards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        if (title.includes(term)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
  
  loadMenu();
});
