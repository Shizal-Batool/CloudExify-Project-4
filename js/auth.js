// auth.js
async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  updateAuthUI(session);
  return session;
}

function updateAuthUI(session) {
  const authLinks = document.getElementById('authLinks');
  const userLinks = document.getElementById('userLinks');
  const adminLinks = document.getElementById('adminLinks');
  
  if (session) {
    if (authLinks) {
      authLinks.classList.remove('d-flex');
      authLinks.classList.add('d-none');
    }
    if (userLinks) {
      userLinks.classList.remove('d-none');
      userLinks.classList.add('d-flex');
    }
    
    // Check if user is admin to show admin link
    supabaseClient.from('profiles').select('role').eq('id', session.user.id).single()
      .then(({data}) => {
        if (data && data.role === 'admin') {
          document.body.classList.add('is-admin');
          if (adminLinks) {
            adminLinks.classList.remove('d-none');
            adminLinks.classList.add('d-block');
          }
          const cartBtn = document.getElementById('cartNavBtn');
          if (cartBtn) {
            cartBtn.classList.add('d-none');
          }
        }
      });
  } else {
    if (authLinks) {
      authLinks.classList.remove('d-none');
      authLinks.classList.add('d-flex');
    }
    if (userLinks) {
      userLinks.classList.remove('d-flex');
      userLinks.classList.add('d-none');
    }
    if (adminLinks) {
      adminLinks.classList.remove('d-block');
      adminLinks.classList.add('d-none');
    }
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

async function requireAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { 
    window.location.href = 'login.html'; 
    return null;
  }
  
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
    
  if (!profile || profile.role !== 'admin') {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

async function requireUser() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
});
