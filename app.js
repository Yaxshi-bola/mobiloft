/* ================================================================
   MOBILOFT — Premium Telegram Mini App
   Vanilla JS · Glassmorphism · Supabase + localStorage fallback
   ================================================================ */

(() => {
  'use strict';

  // ================== CONFIG ==================
  const SUPABASE_URL = 'https://gmdbrbtvqpksgxrprili.supabase.co';
  const SUPABASE_KEY = 'your-anon-key'; // Replace with real key for production
  const BOT_TOKEN = '8622408900:AAEmvk_Kg_1e6TcWCX_KsOYhTdSRzLow5uU';
  const SUPER_ADMIN_ID = '8544023815';
  const IS_DEMO = SUPABASE_KEY === 'your-anon-key' || SUPABASE_KEY.includes('placeholder');
  const STORAGE_KEY = 'mobiloft_v1';

  // ================== STATE ==================
  const state = {
    tg: null,
    user: null,
    admin: null,
    orders: [],
    banners: [],
    settings: {
      cleanup_days: 30,
      contact_phone: '+998 90 123 45 67',
      contact_address: 'Toshkent, Chilonzor',
      contact_telegram: 'mobiloft_admin'
    },
    currentTab: 'home',
    adminTab: 'dashboard',
    statusFilter: 'all',
    adminSearch: '',
  };

  // ================== STATUS META ==================
  const STATUS_META = {
    qabul:       { label: "Telefon qabul qilindi",          emoji: '📥', badge: 'badge-blue',   step: 1 },
    navbat:      { label: "Navbatda turibdi",                emoji: '⏳', badge: 'badge-amber',  step: 2 },
    korib:       { label: "Ko'rib chiqilmoqda",              emoji: '🔍', badge: 'badge-purple', step: 3 },
    zapchas:     { label: "Zapchas kelishi kutilyapti",      emoji: '🚚', badge: 'badge-cyan',   step: 4 },
    tamil:       { label: "Ta'mirlanmoqda",                  emoji: '🔧', badge: 'badge-orange', step: 5 },
    tekshir:     { label: "Tekshirilmoqda",                  emoji: '✅', badge: 'badge-silver', step: 6 },
    tayyor:      { label: "Tayyor bo'ldi",                   emoji: '🎉', badge: 'badge-green',  step: 7 },
    topshirildi: { label: "Egasiga topshirildi",             emoji: '📦', badge: 'badge-green',  step: 8 },
  };
  const STATUS_ORDER = ['qabul','navbat','korib','zapchas','tamil','tekshir','tayyor','topshirildi'];

  // ================== DOM HELPERS ==================
  const $ = (id) => document.getElementById(id);
  const fmt = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date)) return '—';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth()+1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // ================== TOAST ==================
  let toastTimer;
  function toast(msg, type = 'info') {
    const t = $('toast');
    $('toast-text').textContent = msg;
    const icons = {
      info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a1a1a6" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
      success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8affb4" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>',
      error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9aa2" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    };
    $('toast-icon').innerHTML = icons[type] || icons.info;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function showOverlay(text) {
    $('overlay-text').textContent = text || 'Yuklanmoqda...';
    $('overlay').classList.remove('hidden');
    $('overlay').classList.add('flex');
  }
  function hideOverlay() {
    $('overlay').classList.add('hidden');
    $('overlay').classList.remove('flex');
  }

  // ================== MODAL ==================
  function openModal(id) {
    const m = $(id);
    m.classList.remove('hidden');
    requestAnimationFrame(() => m.querySelector('.modal-sheet').classList.add('open'));
    haptic('light');
  }
  function closeModal(id) {
    const m = $(id);
    m.querySelector('.modal-sheet').classList.remove('open');
    setTimeout(() => m.classList.add('hidden'), 350);
  }

  // ================== TELEGRAM ==================
  let tg = null;
  function initTelegram() {
    let telegramReady = false;
    if (window.Telegram && window.Telegram.WebApp) {
      tg = window.Telegram.WebApp;
      state.tg = tg;
      try { tg.ready(); tg.expand(); } catch(e) {}
      try {
        tg.setHeaderColor('#000000');
        tg.setBackgroundColor('#000000');
      } catch(e) {}
      const u = tg.initDataUnsafe?.user;
      if (u && u.id) {
        state.user = {
          id: String(u.id),
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          username: u.username || '',
        };
        telegramReady = true;
      }
    }
    // Fallback to demo user (browser preview, dev mode, or Telegram SDK loaded without user)
    if (!state.user) {
      const stored = localStorage.getItem('mobiloft_demo_user');
      if (stored) {
        try { state.user = JSON.parse(stored); } catch(e) {}
      }
      if (!state.user) {
        state.user = { id: SUPER_ADMIN_ID, first_name: 'Demo', username: 'demo' };
        localStorage.setItem('mobiloft_demo_user', JSON.stringify(state.user));
      }
    }
    updateStatusTime();
    setInterval(updateStatusTime, 30000);
  }
  function updateStatusTime() {
    const t = $('status-time');
    if (!t) return;
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    t.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function tgAlert(msg) {
    if (tg?.showAlert) tg.showAlert(msg); else alert(msg);
  }
  function tgConfirm(msg, cb) {
    if (tg?.showConfirm) tg.showConfirm(msg, cb); else if (confirm(msg)) cb(true);
  }
  function haptic(type='light') {
    try { tg?.HapticFeedback?.impactOccurred(type); } catch(e) {}
  }

  // ================== DATA LAYER (Supabase + localStorage) ==================
  // Local storage backend (always works as fallback)
  function lsGet() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedLocal();
      return JSON.parse(raw);
    } catch (e) {
      return seedLocal();
    }
  }
  function lsSet(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function lsUpdate(updater) {
    const data = lsGet();
    const next = updater(data);
    lsSet(next);
    return next;
  }
  function seedLocal() {
    const now = new Date().toISOString();
    const data = {
      orders: [
        {
          id: 'demo-1',
          order_id: 'MLF-2045',
          customer_name: 'Ali Valiyev',
          phone: '+998 90 123 45 67',
          model: 'iPhone 13 Pro Max',
          issue: 'Ekran singan',
          status: 'tamil',
          note: 'Telefon ustada. Ehtiyot qismlar buyurtma qilindi.',
          created_at: now,
          updated_at: now,
        },
        {
          id: 'demo-2',
          order_id: 'MLF-2046',
          customer_name: 'Dilshod Karimov',
          phone: '+998 91 234 56 78',
          model: 'iPhone 14 Pro',
          issue: 'Batareya tez tugaydi',
          status: 'qabul',
          note: '',
          created_at: now,
          updated_at: now,
        },
        {
          id: 'demo-3',
          order_id: 'MLF-2047',
          customer_name: 'Malika Yusupova',
          phone: '+998 93 345 67 89',
          model: 'Samsung S23 Ultra',
          issue: 'Orqa oyna singan',
          status: 'tayyor',
          note: 'Tayyor, olib ketishingiz mumkin.',
          created_at: now,
          updated_at: now,
        },
        {
          id: 'demo-4',
          order_id: 'MLF-2048',
          customer_name: 'Bobur Tursunov',
          phone: '+998 94 456 78 90',
          model: 'iPhone 12',
          issue: 'Zaryadlanmayapti',
          status: 'zapchas',
          note: 'Zapchas 3 kundan keyin keladi.',
          created_at: now,
          updated_at: now,
        },
      ],
      banners: [
        {
          id: 'b-demo-1',
          title: '📢 Ekran almashtirish xizmatiga 20% chegirma',
          cta_text: 'Batafsil',
          cta_link: '',
          enabled: true,
          created_at: now,
        },
      ],
      admins: [
        { id: 'a-1', telegram_id: SUPER_ADMIN_ID, role: 'super_admin', name: 'Super Admin' },
      ],
      settings: {
        id: 1,
        cleanup_days: 30,
        contact_phone: '+998 90 123 45 67',
        contact_address: 'Toshkent, Chilonzor',
        contact_telegram: 'mobiloft_admin',
        updated_at: now,
      },
    };
    lsSet(data);
    return data;
  }

  // Supabase REST
  async function sb(path, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1${path}`;
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
    };
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase error: ${res.status} ${text}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  // Unified data layer
  async function loadOrders() {
    if (IS_DEMO) {
      state.orders = lsGet().orders || [];
      return;
    }
    try {
      const data = await sb('/orders?select=*&order=created_at.desc&limit=500');
      state.orders = data || [];
    } catch (e) {
      console.warn('loadOrders failed, falling back to localStorage', e);
      state.orders = lsGet().orders || [];
    }
  }
  async function loadBanners() {
    if (IS_DEMO) {
      state.banners = lsGet().banners || [];
      return;
    }
    try {
      const data = await sb('/banners?select=*&order=created_at.desc');
      state.banners = data || [];
    } catch (e) {
      console.warn('loadBanners failed', e);
      state.banners = lsGet().banners || [];
    }
  }
  async function loadSettings() {
    if (IS_DEMO) {
      const s = lsGet().settings;
      if (s) state.settings = { ...state.settings, ...s };
      return;
    }
    try {
      const data = await sb('/settings?id=eq.1&select=*');
      if (data && data[0]) {
        state.settings = {
          cleanup_days: data[0].cleanup_days ?? 30,
          contact_phone: data[0].contact_phone || '+998 90 123 45 67',
          contact_address: data[0].contact_address || 'Toshkent, Chilonzor',
          contact_telegram: data[0].contact_telegram || 'mobiloft_admin',
        };
      }
    } catch (e) {
      console.warn('loadSettings failed', e);
    }
  }
  async function loadAdmins() {
    if (IS_DEMO) return lsGet().admins || [];
    try {
      return await sb('/admins?select=*') || [];
    } catch (e) { return []; }
  }

  // ================== ORDER ID GEN ==================
  async function generateOrderId() {
    const list = state.orders;
    let max = 2044;
    list.forEach(o => {
      const m = (o.order_id || '').match(/MLF-(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    });
    return `MLF-${max + 1}`;
  }

  function uuid() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  // ================== SAVE ORDER ==================
  async function saveOrderData(id, data) {
    if (IS_DEMO) {
      lsUpdate(d => {
        if (id) {
          const idx = d.orders.findIndex(x => x.id === id);
          if (idx >= 0) d.orders[idx] = { ...d.orders[idx], ...data };
        } else {
          d.orders.unshift({ id: uuid(), ...data });
        }
        return d;
      });
      await loadOrders();
      return;
    }
    if (id) {
      await sb(`/orders?id=eq.${id}`, { method: 'PATCH', body: data });
    } else {
      await sb('/orders', { method: 'POST', body: data });
    }
    await loadOrders();
  }

  async function deleteOrderData(id) {
    if (IS_DEMO) {
      lsUpdate(d => { d.orders = d.orders.filter(x => x.id !== id); return d; });
      await loadOrders();
      return;
    }
    await sb(`/orders?id=eq.${id}`, { method: 'DELETE' });
    await loadOrders();
  }

  async function saveBannerData(id, data) {
    if (IS_DEMO) {
      lsUpdate(d => {
        if (id) {
          const idx = d.banners.findIndex(x => x.id === id);
          if (idx >= 0) d.banners[idx] = { ...d.banners[idx], ...data };
        } else {
          d.banners.unshift({ id: uuid(), ...data });
        }
        return d;
      });
      await loadBanners();
      return;
    }
    if (id) await sb(`/banners?id=eq.${id}`, { method: 'PATCH', body: data });
    else await sb('/banners', { method: 'POST', body: data });
    await loadBanners();
  }

  async function deleteBannerData(id) {
    if (IS_DEMO) {
      lsUpdate(d => { d.banners = d.banners.filter(x => x.id !== id); return d; });
      await loadBanners();
      return;
    }
    await sb(`/banners?id=eq.${id}`, { method: 'DELETE' });
    await loadBanners();
  }

  async function saveSettingsData(data) {
    if (IS_DEMO) {
      lsUpdate(d => { d.settings = { ...d.settings, ...data }; return d; });
      state.settings = { ...state.settings, ...data };
      return;
    }
    try {
      await sb('/settings?id=eq.1', { method: 'PATCH', body: data });
      state.settings = { ...state.settings, ...data };
    } catch (e) {
      await sb('/settings', { method: 'POST', body: data });
      state.settings = { ...state.settings, ...data };
    }
  }

  async function cleanupOldOrders() {
    const days = state.settings.cleanup_days || 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    if (IS_DEMO) {
      let removed = 0;
      lsUpdate(d => {
        const before = d.orders.length;
        d.orders = d.orders.filter(o => !(o.status === 'topshirildi' && new Date(o.created_at) < new Date(cutoff)));
        removed = before - d.orders.length;
        return d;
      });
      await loadOrders();
      return removed;
    }
    const data = await sb(`/orders?status=eq.topshirildi&created_at=lt.${encodeURIComponent(cutoff)}&select=id`);
    const count = (data || []).length;
    if (count > 0) {
      await sb(`/orders?status=eq.topshirildi&created_at=lt.${encodeURIComponent(cutoff)}`, { method: 'DELETE' });
      await loadOrders();
    }
    return count;
  }

  // ================== RENDER: HOME ==================
  function renderPromo() {
    const cont = $('promo-container');
    const active = state.banners.find(b => b.enabled);
    if (!active) {
      cont.classList.add('hidden');
      cont.innerHTML = '';
      return;
    }
    cont.classList.remove('hidden');
    cont.innerHTML = `
      <div class="promo-bg silver-border rounded-[24px] p-4 anim-fade overflow-hidden relative">
        <div class="absolute -top-6 -right-6 w-28 h-28 rounded-full" style="background: radial-gradient(circle, rgba(192,192,192,0.25), transparent 70%);"></div>
        <div class="relative z-10 flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl glass-soft flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d2d2d7" stroke-width="2"><path d="M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[10px] text-zinc-500 uppercase tracking-wider">Yangilik</div>
            <div class="text-sm font-semibold text-silver leading-tight mt-0.5">${escapeHtml(active.title || '')}</div>
          </div>
        </div>
        ${active.cta_text ? `<button onclick="promoCTA('${escapeAttr(active.cta_link || '')}')" class="btn-ghost mt-3 w-full rounded-xl py-2.5 text-xs font-medium text-silver">${escapeHtml(active.cta_text)} →</button>` : ''}
      </div>
    `;
  }

  function renderSearchResult(order) {
    const cont = $('search-result');
    if (!order) {
      cont.innerHTML = `
        <div class="glass silver-border rounded-[24px] p-5 text-center anim-scale">
          <div class="w-14 h-14 rounded-2xl glass-soft mx-auto flex items-center justify-center mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff9aa2" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
          </div>
          <div class="text-base font-semibold text-silver">Buyurtma topilmadi</div>
          <p class="text-zinc-500 text-xs mt-1">Buyurtma raqamini tekshirib qayta urinib ko'ring.</p>
        </div>
      `;
      cont.classList.remove('hidden');
      return;
    }

    const sm = STATUS_META[order.status] || STATUS_META.tamil;
    const step = sm.step;
    const timelineHtml = STATUS_ORDER.map((s, idx) => {
      const meta = STATUS_META[s];
      const active = idx + 1 <= step;
      const isCurrent = (idx + 1) === step;
      const dot = active
        ? `<div class="timeline-dot ${isCurrent ? 'active' : ''}">${isCurrent ? '●' : '✓'}</div>`
        : `<div class="timeline-dot">${idx+1}</div>`;
      const line = idx < STATUS_ORDER.length - 1
        ? `<div class="timeline-line ${idx+1 < step ? 'active' : ''}"></div>`
        : '';
      return `
        <div class="flex items-center gap-3">
          ${dot}
          <div class="flex-1 ${active ? 'text-zinc-100' : 'text-zinc-600'} text-[13px] font-medium py-1.5">${meta.emoji} ${escapeHtml(meta.label)}</div>
        </div>
        ${line}
      `;
    }).join('');

    cont.innerHTML = `
      <div class="glass silver-border rounded-[28px] p-5 anim-scale overflow-hidden relative">
        <div class="absolute -top-16 -right-16 w-40 h-40 rounded-full" style="background: radial-gradient(circle, rgba(192,192,192,0.10), transparent 70%);"></div>

        <div class="relative z-10">
          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="min-w-0">
              <div class="text-[10px] text-zinc-500 uppercase tracking-wider">Buyurtma</div>
              <div class="text-xl font-bold text-silver tracking-wider mt-0.5">${escapeHtml(order.order_id)}</div>
            </div>
            <span class="badge ${sm.badge} flex-shrink-0">
              <span class="badge-dot"></span>
              ${sm.emoji} ${escapeHtml(sm.label)}
            </span>
          </div>

          <div class="space-y-2.5 mb-4">
            <div class="flex items-center justify-between py-1.5">
              <span class="text-xs text-zinc-500">Telefon</span>
              <span class="text-sm font-medium text-zinc-100">${escapeHtml(order.model || '—')}</span>
            </div>
            <div class="flex items-center justify-between py-1.5 border-t border-white/5">
              <span class="text-xs text-zinc-500">Mijoz</span>
              <span class="text-sm font-medium text-zinc-100">${escapeHtml(order.customer_name || '—')}</span>
            </div>
            <div class="flex items-center justify-between py-1.5 border-t border-white/5">
              <span class="text-xs text-zinc-500">Oxirgi yangilanish</span>
              <span class="text-sm font-medium text-zinc-100">${fmt(order.updated_at || order.created_at)}</span>
            </div>
            ${order.issue ? `<div class="pt-2 border-t border-white/5"><span class="text-xs text-zinc-500 block mb-1">Muammo</span><span class="text-sm text-zinc-200">${escapeHtml(order.issue)}</span></div>` : ''}
            ${order.note ? `<div class="pt-2 border-t border-white/5"><span class="text-xs text-zinc-500 block mb-1">Izoh</span><span class="text-sm text-zinc-200">${escapeHtml(order.note)}</span></div>` : ''}
          </div>

          <div class="pt-3 border-t border-white/5">
            <div class="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Ta'mir jarayoni</div>
            <div class="flex flex-col">${timelineHtml}</div>
          </div>
        </div>
      </div>
    `;
    cont.classList.remove('hidden');
  }

  // ================== RENDER: ADMIN ==================
  function renderAdminDashboard() {
    const orders = state.orders;
    const today = new Date(); today.setHours(0,0,0,0);
    const todayCount = orders.filter(o => new Date(o.created_at) >= today).length;
    const inProgress = orders.filter(o => !['tayyor','topshirildi'].includes(o.status)).length;
    const ready = orders.filter(o => o.status === 'tayyor').length;
    const delivered = orders.filter(o => o.status === 'topshirildi').length;

    const stats = [
      { label: 'Bugungi', value: todayCount, icon: '📊' },
      { label: "Ta'mirlanayotgan", value: inProgress, icon: '🔧' },
      { label: 'Tayyor', value: ready, icon: '🎉' },
      { label: 'Topshirilgan', value: delivered, icon: '📦' },
    ];
    $('stats-grid').innerHTML = stats.map(s => `
      <div class="glass silver-border rounded-[22px] p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] text-zinc-500 uppercase tracking-wider">${s.label}</span>
          <span class="text-base">${s.icon}</span>
        </div>
        <div class="text-2xl font-bold text-silver">${s.value}</div>
      </div>
    `).join('');

    const recent = orders.slice(0, 5);
    $('recent-orders').innerHTML = recent.length ? recent.map(o => orderCardHtml(o, true)).join('')
      : `<div class="text-center text-zinc-500 text-sm py-6">Hozircha buyurtmalar yo'q</div>`;
  }

  function orderCardHtml(o, compact = false) {
    const sm = STATUS_META[o.status] || STATUS_META.tamil;
    return `
      <div class="glass-soft rounded-2xl p-3.5 cursor-pointer hover:bg-white/[0.07] transition" onclick="openEditOrder('${o.id}')">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-0.5 flex-wrap">
              <span class="text-sm font-bold text-silver tracking-wider">${escapeHtml(o.order_id)}</span>
              <span class="badge ${sm.badge} !py-0.5 !px-2 !text-[10px]">
                <span class="badge-dot"></span>${sm.emoji} ${escapeHtml(sm.label)}
              </span>
            </div>
            <div class="text-[12px] text-zinc-300 truncate">${escapeHtml(o.customer_name || '—')} · ${escapeHtml(o.model || '')}</div>
            ${!compact ? `<div class="text-[10px] text-zinc-600 mt-0.5">${fmt(o.updated_at || o.created_at)}</div>` : ''}
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6e6e73" stroke-width="2" class="flex-shrink-0"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>
    `;
  }

  function renderOrdersList() {
    let list = [...state.orders];
    const q = state.adminSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(o =>
        (o.order_id || '').toLowerCase().includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.phone || '').toLowerCase().includes(q)
      );
    }
    if (state.statusFilter !== 'all') {
      list = list.filter(o => o.status === state.statusFilter);
    }
    $('orders-list').innerHTML = list.length
      ? list.map(o => orderCardHtml(o)).join('')
      : `<div class="text-center text-zinc-500 text-sm py-10">Buyurtmalar topilmadi</div>`;
  }

  function renderBannersList() {
    if (!state.banners.length) {
      $('banners-list').innerHTML = `<div class="text-center text-zinc-500 text-sm py-10 glass-soft rounded-2xl">Bannerlar mavjud emas</div>`;
      return;
    }
    $('banners-list').innerHTML = state.banners.map(b => `
      <div class="glass-soft rounded-2xl p-4 flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl glass flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d2d2d7" stroke-width="2"><path d="M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5 flex-wrap">
            <div class="text-sm font-semibold text-silver truncate">${escapeHtml(b.title || '')}</div>
            <span class="badge ${b.enabled ? 'badge-green' : 'badge-silver'} !py-0 !px-2 !text-[10px]">${b.enabled ? 'Faol' : "O'chirilgan"}</span>
          </div>
          ${b.cta_text ? `<div class="text-[11px] text-zinc-500">CTA: ${escapeHtml(b.cta_text)}</div>` : ''}
        </div>
        <div class="flex gap-1.5 flex-shrink-0">
          <button onclick="toggleBanner('${b.id}', ${!b.enabled})" class="btn-ghost rounded-lg p-1.5" title="${b.enabled ? "O'chirish" : 'Yoqish'}">
            ${b.enabled
              ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8affb4" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'
              : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#86868b" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'}
          </button>
          <button onclick="openEditBanner('${b.id}')" class="btn-ghost rounded-lg p-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d2d2d7" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  // ================== TABS ==================
  function switchTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $(`view-${tab}`).classList.add('active');
    document.querySelectorAll('.tab-item').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    haptic('light');
    if (tab === 'admin') renderAdminDashboard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function switchAdminTab(tab) {
    state.adminTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.adminTab === tab));
    document.querySelectorAll('.admin-pane').forEach(p => p.classList.toggle('hidden', p.dataset.adminPane !== tab));
    if (tab === 'dashboard') renderAdminDashboard();
    if (tab === 'orders') renderOrdersList();
    if (tab === 'banners') renderBannersList();
    if (tab === 'settings') {
      $('cleanup-days').value = state.settings.cleanup_days;
      $('settings-phone').value = state.settings.contact_phone;
      $('settings-address').value = state.settings.contact_address;
      $('settings-telegram').value = state.settings.contact_telegram;
    }
  }

  // ================== SEARCH ==================
  async function searchOrder() {
    const raw = $('search-input').value.trim().toUpperCase();
    if (!raw) {
      toast('Buyurtma raqamini kiriting', 'error');
      haptic('heavy');
      return;
    }
    const id = raw.startsWith('MLF-') ? raw : `MLF-${raw}`;
    showOverlay('Qidirilmoqda...');
    try {
      let order = null;
      if (IS_DEMO) {
        order = state.orders.find(o => (o.order_id || '').toUpperCase() === id);
      } else {
        const data = await sb(`/orders?order_id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
        order = data && data[0];
      }
      hideOverlay();
      if (order) {
        renderSearchResult(order);
        haptic('success');
        setTimeout(() => {
          $('search-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      } else {
        renderSearchResult(null);
        haptic('heavy');
      }
    } catch (e) {
      hideOverlay();
      toast('Xatolik yuz berdi', 'error');
      console.error(e);
    }
  }

  function clearSearch() {
    $('search-input').value = '';
    $('search-clear').classList.add('hidden');
    $('search-result').classList.add('hidden');
  }

  // ================== ADMIN AUTH ==================
  async function isAdmin(tgId) {
    if (!tgId) return null;
    if (String(tgId) === SUPER_ADMIN_ID) {
      return { telegram_id: SUPER_ADMIN_ID, role: 'super_admin', name: 'Super Admin' };
    }
    try {
      const admins = await loadAdmins();
      return admins.find(a => String(a.telegram_id) === String(tgId)) || null;
    } catch (e) {
      return null;
    }
  }

  async function checkAdmin() {
    const tgId = state.user?.id;
    if (!tgId) return false;
    showOverlay('Tekshirilmoqda...');
    const adm = await isAdmin(tgId);
    hideOverlay();
    if (adm) {
      state.admin = adm;
      document.querySelector('[data-tab="admin"]').classList.remove('hidden');
      return true;
    }
    return false;
  }

  function logoutAdmin() {
    state.admin = null;
    document.querySelector('[data-tab="admin"]').classList.add('hidden');
    switchTab('home');
    toast('Admin paneldan chiqildi');
  }

  // ================== ORDER MODAL ==================
  function openNewOrder() {
    $('order-id').value = '';
    $('o-name').value = '';
    $('o-phone').value = '';
    $('o-model').value = '';
    $('o-issue').value = '';
    $('o-status').value = 'tamil';
    $('o-note').value = '';
    $('order-id-display').classList.add('hidden');
    $('order-delete-btn').classList.add('hidden');
    $('order-modal-title').textContent = 'Yangi buyurtma';
    openModal('modal-order');
  }

  function openEditOrder(id) {
    const o = state.orders.find(x => x.id === id);
    if (!o) return;
    $('order-id').value = o.id;
    $('o-name').value = o.customer_name || '';
    $('o-phone').value = o.phone || '';
    $('o-model').value = o.model || '';
    $('o-issue').value = o.issue || '';
    $('o-status').value = o.status || 'tamil';
    $('o-note').value = o.note || '';
    $('order-id-text').textContent = o.order_id;
    $('order-id-display').classList.remove('hidden');
    $('order-delete-btn').classList.remove('hidden');
    $('order-modal-title').textContent = 'Buyurtmani tahrirlash';
    openModal('modal-order');
  }

  async function saveOrder() {
    const id = $('order-id').value;
    const data = {
      customer_name: $('o-name').value.trim(),
      phone: $('o-phone').value.trim(),
      model: $('o-model').value.trim(),
      issue: $('o-issue').value.trim(),
      status: $('o-status').value,
      note: $('o-note').value.trim(),
      updated_at: new Date().toISOString(),
    };
    if (!data.customer_name || !data.model) {
      toast('Ism va telefon modelini to\'ldiring', 'error');
      haptic('heavy');
      return;
    }
    showOverlay('Saqlanmoqda...');
    try {
      if (id) {
        await saveOrderData(id, data);
        toast('Buyurtma yangilandi', 'success');
      } else {
        data.order_id = await generateOrderId();
        data.created_at = new Date().toISOString();
        await saveOrderData(null, data);
        toast(`Yaratildi: ${data.order_id}`, 'success');
      }
      closeModal('modal-order');
      haptic('success');
      if (state.currentTab === 'admin') {
        if (state.adminTab === 'orders') renderOrdersList();
        else if (state.adminTab === 'dashboard') renderAdminDashboard();
      }
    } catch (e) {
      toast('Xatolik: ' + e.message, 'error');
      console.error(e);
    }
    hideOverlay();
  }

  async function deleteOrder() {
    const id = $('order-id').value;
    if (!id) return;
    tgConfirm("Buyurtmani o'chirmoqchimisiz?", async (ok) => {
      if (!ok) return;
      showOverlay("O'chirilmoqda...");
      try {
        await deleteOrderData(id);
        closeModal('modal-order');
        toast("Buyurtma o'chirildi", 'success');
        haptic('success');
        if (state.currentTab === 'admin') {
          if (state.adminTab === 'orders') renderOrdersList();
          else if (state.adminTab === 'dashboard') renderAdminDashboard();
        }
      } catch (e) { toast('Xatolik', 'error'); }
      hideOverlay();
    });
  }

  // ================== BANNER MODAL ==================
  function openBannerForm() {
    $('banner-id').value = '';
    $('b-title').value = '';
    $('b-cta').value = '';
    $('b-link').value = '';
    $('b-enabled').checked = true;
    $('banner-delete-btn').classList.add('hidden');
    $('banner-modal-title').textContent = 'Yangi banner';
    openModal('modal-banner');
  }
  function openEditBanner(id) {
    const b = state.banners.find(x => x.id === id);
    if (!b) return;
    $('banner-id').value = b.id;
    $('b-title').value = b.title || '';
    $('b-cta').value = b.cta_text || '';
    $('b-link').value = b.cta_link || '';
    $('b-enabled').checked = !!b.enabled;
    $('banner-delete-btn').classList.remove('hidden');
    $('banner-modal-title').textContent = 'Banner tahrirlash';
    openModal('modal-banner');
  }
  async function saveBanner() {
    const id = $('banner-id').value;
    const data = {
      title: $('b-title').value.trim(),
      cta_text: $('b-cta').value.trim(),
      cta_link: $('b-link').value.trim(),
      enabled: $('b-enabled').checked,
    };
    if (!data.title) { toast('Sarlavhani kiriting', 'error'); return; }
    showOverlay('Saqlanmoqda...');
    try {
      await saveBannerData(id, data);
      renderBannersList();
      renderPromo();
      closeModal('modal-banner');
      toast('Banner saqlandi', 'success');
      haptic('success');
    } catch (e) { toast('Xatolik', 'error'); }
    hideOverlay();
  }
  async function deleteBanner() {
    const id = $('banner-id').value;
    if (!id) return;
    tgConfirm("Banner o'chirilsinmi?", async (ok) => {
      if (!ok) return;
      try {
        await deleteBannerData(id);
        renderBannersList();
        renderPromo();
        closeModal('modal-banner');
        toast("O'chirildi", 'success');
      } catch (e) { toast('Xatolik', 'error'); }
    });
  }
  async function toggleBanner(id, enabled) {
    try {
      await saveBannerData(id, { enabled });
      renderBannersList();
      renderPromo();
    } catch (e) { toast('Xatolik', 'error'); }
  }

  // ================== SETTINGS ==================
  async function saveSettings() {
    const data = {
      cleanup_days: parseInt($('cleanup-days').value, 10) || 30,
      contact_phone: $('settings-phone').value.trim() || '+998 90 123 45 67',
      contact_address: $('settings-address').value.trim() || 'Toshkent, Chilonzor',
      contact_telegram: $('settings-telegram').value.trim() || 'mobiloft_admin',
      updated_at: new Date().toISOString(),
    };
    showOverlay('Saqlanmoqda...');
    try {
      await saveSettingsData(data);
      applyContactInfo();
      toast('Sozlamalar saqlandi', 'success');
      haptic('success');
    } catch (e) { toast('Xatolik: ' + e.message, 'error'); }
    hideOverlay();
  }

  function applyContactInfo() {
    $('phone-text').textContent = state.settings.contact_phone;
    $('address-text').textContent = state.settings.contact_address;
  }

  // ================== CLEANUP ==================
  async function runCleanup() {
    const days = state.settings.cleanup_days || 30;
    tgConfirm(`${days} kundan eski va "Topshirilgan" buyurtmalar o'chiriladi. Davom etamizmi?`, async (ok) => {
      if (!ok) return;
      showOverlay('Tozalanmoqda...');
      try {
        const removed = await cleanupOldOrders();
        hideOverlay();
        if (state.currentTab === 'admin') {
          if (state.adminTab === 'orders') renderOrdersList();
          else if (state.adminTab === 'dashboard') renderAdminDashboard();
        }
        toast(removed > 0 ? `${removed} ta buyurtma tozalandi` : "Tozalash uchun buyurtmalar yo'q",
              removed > 0 ? 'success' : 'info');
        haptic(removed > 0 ? 'success' : 'light');
      } catch (e) {
        hideOverlay();
        toast('Xatolik: ' + e.message, 'error');
      }
    });
  }

  // Auto cleanup on boot
  async function autoCleanup() {
    try {
      const removed = await cleanupOldOrders();
      if (removed > 0) console.log(`[MOBILOFT] Auto-cleanup: ${removed} orders removed`);
    } catch (e) {}
  }

  // ================== CONTACT ==================
  function contactAdmin() {
    const username = (state.settings.contact_telegram || 'mobiloft_admin').replace('@', '');
    const url = `https://t.me/${username}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, '_blank');
    haptic('light');
  }
  function callAdmin() {
    const phone = (state.settings.contact_phone || '').replace(/\s/g, '');
    window.open(`tel:${phone}`);
    haptic('light');
  }
  function openLocation() {
    const addr = encodeURIComponent(state.settings.contact_address || 'Toshkent');
    window.open(`https://maps.google.com/?q=${addr}`);
    haptic('light');
  }
  function promoCTA(link) {
    if (!link) { contactAdmin(); return; }
    if (link.startsWith('http')) window.open(link, '_blank');
    else if (link.startsWith('t.me/') && tg?.openTelegramLink) tg.openTelegramLink('https://' + link);
    else contactAdmin();
  }

  // ================== ESCAPE ==================
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // ================== INIT ==================
  async function init() {
    initTelegram();

    // Show demo banner if needed
    if (IS_DEMO) {
      console.log('%cMOBILOFT — DEMO MODE', 'color:#C0C0C0;font-weight:bold;font-size:14px;');
      console.log('Using localStorage. Replace SUPABASE_KEY in app.js to use real Supabase.');
    }

    try {
      await Promise.all([loadBanners(), loadSettings(), loadOrders()]);
    } catch (e) { console.error(e); }

    applyContactInfo();
    renderPromo();

    setTimeout(async () => {
      await checkAdmin();
      $('boot').style.opacity = '0';
      $('boot').style.transition = 'opacity 0.6s';
      setTimeout(() => $('boot').remove(), 600);
      autoCleanup();
    }, 400);

    // Bind events
    $('search-btn').addEventListener('click', searchOrder);
    $('search-input').addEventListener('input', (e) => {
      $('search-clear').classList.toggle('hidden', !e.target.value);
    });
    $('search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchOrder();
    });

    document.querySelectorAll('.admin-tab').forEach(t => {
      t.addEventListener('click', () => switchAdminTab(t.dataset.adminTab));
    });
    document.querySelectorAll('[data-admin-tab]').forEach(t => {
      t.addEventListener('click', () => switchAdminTab(t.dataset.adminTab));
    });
    document.querySelectorAll('.status-filter').forEach(f => {
      f.addEventListener('click', () => {
        document.querySelectorAll('.status-filter').forEach(x => x.classList.remove('active'));
        f.classList.add('active');
        state.statusFilter = f.dataset.statusFilter;
        renderOrdersList();
      });
    });
    let st;
    $('admin-search').addEventListener('input', (e) => {
      clearTimeout(st);
      st = setTimeout(() => {
        state.adminSearch = e.target.value;
        renderOrdersList();
      }, 150);
    });

    document.querySelectorAll('.status-filter').forEach(f => {
      if (f.dataset.statusFilter === 'all') f.classList.add('active');
    });
  }

  // ================== EXPOSE (for inline handlers) ==================
  window.ML = { openEditOrder, openEditBanner, toggleBanner, promoCTA };
  window.searchOrder = searchOrder;
  window.clearSearch = clearSearch;
  window.contactAdmin = contactAdmin;
  window.openLocation = openLocation;
  window.callAdmin = callAdmin;
  window.switchTab = switchTab;
  window.switchAdminTab = switchAdminTab;
  window.openNewOrder = openNewOrder;
  window.runCleanup = runCleanup;
  window.logoutAdmin = logoutAdmin;
  window.saveOrder = saveOrder;
  window.deleteOrder = deleteOrder;
  window.openBannerForm = openBannerForm;
  window.saveBanner = saveBanner;
  window.deleteBanner = deleteBanner;
  window.saveSettings = saveSettings;
  window.closeModal = closeModal;
  window.openEditOrder = openEditOrder;
  window.openEditBanner = openEditBanner;
  window.toggleBanner = toggleBanner;
  window.promoCTA = promoCTA;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
