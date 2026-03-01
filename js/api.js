/* ============================================================
   api.js — Shared API helper for EduManage Pro dashboards
   Used by: admin, teacher, student dashboard pages
   ============================================================ */

// ── Base fetch wrapper ────────────────────────────────────────
window.API_BASE = (!window.location.port || window.location.port !== '3000') ? `http://${window.location.hostname || 'localhost'}:3000` : '';

const API = {
    async request(method, url, body = null) {
        try {
            const opts = {
                method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            };
            if (body) opts.body = JSON.stringify(body);
            const res = await fetch(window.API_BASE + url, opts);
            const data = await res.json();
            return data;
        } catch (err) {
            console.error(`API ${method} ${url}:`, err);
            return { success: false, message: 'Network error. Make sure the server is running.' };
        }
    },
    get(url) { return this.request('GET', url); },
    post(url, body) { return this.request('POST', url, body); },
    put(url, body) { return this.request('PUT', url, body); },
    delete(url) { return this.request('DELETE', url); },
    async postForm(url, formData) {
        try {
            const res = await fetch(window.API_BASE + url, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            return await res.json();
        } catch (err) {
            console.error('API POST FormData error:', err);
            return { success: false, message: 'Network error.' };
        }
    }
};

// ── Helper for absolute routing across Live Server / Node ───
function __go(path) {
    const isLive = window.location.pathname.includes('/public/');
    const pfx = isLive ? '/public' : '';
    window.location.href = pfx + path;
}

// ── Auth check — call at top of every dashboard page ─────────
async function checkAuth(requiredRole) {
    try {
        const data = await API.get('/api/auth/me');
        if (!data.success || !data.user) {
            __go('/login.html');
            return null;
        }
        const user = data.user;
        if (requiredRole && user.role !== requiredRole) {
            // redirect to their own dashboard
            const map = {
                admin: '/admin/dashboard.html',
                teacher: '/teacher/dashboard.html',
                student: '/student/dashboard.html'
            };
            __go(map[user.role] || '/login.html');
            return null;
        }
        // populate sidebar user info if elements exist
        const nameEl = document.getElementById('sidebarUserName');
        const roleEl = document.getElementById('sidebarUserRole');
        const avatarEl = document.getElementById('sidebarAvatar');
        if (nameEl) nameEl.textContent = user.name;
        if (roleEl) roleEl.textContent = user.role;
        if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();

        // topbar date
        const dateEl = document.getElementById('topbarDate');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-IN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }

        // sidebar mobile toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                if (overlay) overlay.classList.toggle('show');
            });
            if (overlay) overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('show');
            });
        }

        return user;
    } catch (err) {
        console.error('checkAuth error:', err);
        __go('/login.html');
        return null;
    }
}

// ── Logout ────────────────────────────────────────────────────
async function logout() {
    await API.post('/api/auth/logout');
    __go('/login.html');
}

// ── Toast notification ────────────────────────────────────────
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position:fixed;top:20px;right:20px;z-index:9999;
            display:flex;flex-direction:column;gap:10px;
        `;
        document.body.appendChild(container);
    }

    const colors = {
        success: { bg: '#dcfce7', border: '#22c55e', color: '#15803d', icon: '✅' },
        error: { bg: '#fee2e2', border: '#ef4444', color: '#dc2626', icon: '❌' },
        warning: { bg: '#fef9c3', border: '#eab308', color: '#92400e', icon: '⚠️' },
        info: { bg: '#dbeafe', border: '#3b82f6', color: '#1e40af', icon: 'ℹ️' }
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
        background:${c.bg};border-left:4px solid ${c.border};color:${c.color};
        padding:12px 16px;border-radius:8px;font-size:14px;font-weight:500;
        box-shadow:0 4px 16px rgba(0,0,0,0.12);display:flex;align-items:center;gap:8px;
        min-width:260px;max-width:360px;animation:slideIn 0.3s ease;font-family:'Inter',sans-serif;
    `;
    toast.innerHTML = `<span>${c.icon}</span><span style="flex:1">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Add toast animation
const toastStyle = document.createElement('style');
toastStyle.textContent = `@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`;
document.head.appendChild(toastStyle);

// ── Formatting helpers ────────────────────────────────────────
function formatCurrency(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function statusBadge(status) {
    const map = {
        'Active': '<span class="badge badge-success">Active</span>',
        'Inactive': '<span class="badge badge-danger">Inactive</span>',
        'Present': '<span class="badge badge-success">Present</span>',
        'Absent': '<span class="badge badge-danger">Absent</span>',
        'Late': '<span class="badge badge-warning">Late</span>',
        'Leave': '<span class="badge badge-primary">Leave</span>',
        'Paid': '<span class="badge badge-success">Paid</span>',
        'Partial': '<span class="badge badge-warning">Partial</span>',
        'Pending': '<span class="badge badge-danger">Pending</span>',
    };
    return map[status] || `<span class="badge">${status}</span>`;
}

function getAvatar(name, colorClass = 'blue') {
    const initial = (name || '?').charAt(0).toUpperCase();
    return `<span class="avatar ${colorClass}">${initial}</span>`;
}

// ── Modal helpers — used by all admin pages ───────────────────
function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('active');
        // focus first input inside modal for UX
        setTimeout(() => {
            const first = el.querySelector('input, select, textarea');
            if (first) first.focus();
        }, 100);
    }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

// Close modal when clicking the dark overlay background
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active')
            .forEach(m => m.classList.remove('active'));
    }
});

// ── Custom Confirm Dialog (replaces window.confirm) ───────────
// Usage: const ok = await showConfirm('Are you sure?');
function showConfirm(message = 'Are you sure?', confirmText = 'Delete', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        // Remove any existing confirm modal
        const existing = document.getElementById('__confirmModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = '__confirmModal';
        modal.style.cssText = `
            position:fixed;inset:0;z-index:99999;
            background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);
            display:flex;align-items:center;justify-content:center;
            animation:fadeIn 0.15s ease;
        `;
        modal.innerHTML = `
            <div style="
                background:#fff;border-radius:16px;padding:28px 32px;
                max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);
                text-align:center;animation:scaleIn 0.15s ease;
            ">
                <div style="font-size:44px;margin-bottom:12px">🗑️</div>
                <h3 style="font-size:17px;font-weight:700;color:#1e293b;margin-bottom:8px">Confirm Delete</h3>
                <p style="font-size:14px;color:#64748b;margin-bottom:24px">${message}</p>
                <div style="display:flex;gap:10px;justify-content:center">
                    <button id="__confirmCancel" style="
                        padding:10px 24px;border-radius:9px;border:1.5px solid #e2e8f0;
                        background:#f8fafc;color:#475569;font-size:14px;font-weight:600;
                        cursor:pointer;font-family:inherit;
                    ">${cancelText}</button>
                    <button id="__confirmOk" style="
                        padding:10px 24px;border-radius:9px;border:none;
                        background:linear-gradient(135deg,#dc2626,#ef4444);
                        color:#fff;font-size:14px;font-weight:700;
                        cursor:pointer;font-family:inherit;
                        box-shadow:0 4px 12px rgba(220,38,38,0.35);
                    ">${confirmText}</button>
                </div>
            </div>
        `;

        // Add animations once
        if (!document.getElementById('__confirmStyle')) {
            const s = document.createElement('style');
            s.id = '__confirmStyle';
            s.textContent = `
                @keyframes fadeIn{from{opacity:0}to{opacity:1}}
                @keyframes scaleIn{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}
                #__confirmCancel:hover{background:#e2e8f0!important}
                #__confirmOk:hover{opacity:0.9;transform:translateY(-1px)}
            `;
            document.head.appendChild(s);
        }

        document.body.appendChild(modal);

        const cleanup = (result) => {
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.15s';
            setTimeout(() => modal.remove(), 150);
            resolve(result);
        };

        document.getElementById('__confirmOk').addEventListener('click', () => cleanup(true));
        document.getElementById('__confirmCancel').addEventListener('click', () => cleanup(false));
        modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(false); });
    });
}
