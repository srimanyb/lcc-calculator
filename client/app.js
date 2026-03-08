/**
 * MenuMaster — localStorage Edition
 * No authentication required. All data stored locally.
 */

'use strict';

// ═══════════════════════════════════════════════════════
// LOCAL STORAGE DATA LAYER
// ═══════════════════════════════════════════════════════
const Store = (() => {
    const KEY = 'mm_recipes_v2';

    function load() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; }
        catch { return []; }
    }

    function save(recipes) {
        localStorage.setItem(KEY, JSON.stringify(recipes));
    }

    function getAll() { return load(); }

    function getById(id) { return load().find(r => r.id === id) || null; }

    function add(recipe) {
        const recipes = load();
        const now = new Date().toISOString();
        recipe.id = 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        recipe.createdAt = now;
        recipe.updatedAt = now;
        recipes.push(recipe);
        save(recipes);
        return recipe;
    }

    function update(id, updates) {
        const recipes = load();
        const idx = recipes.findIndex(r => r.id === id);
        if (idx === -1) return null;
        recipes[idx] = { ...recipes[idx], ...updates, id, updatedAt: new Date().toISOString() };
        save(recipes);
        return recipes[idx];
    }

    function remove(id) {
        const recipes = load().filter(r => r.id !== id);
        save(recipes);
    }

    function search(query) {
        const q = query.toLowerCase().trim();
        if (!q) return load();
        return load().filter(r =>
            r.name.toLowerCase().includes(q) ||
            (r.tags || []).some(t => t.toLowerCase().includes(q)) ||
            (r.ingredients || []).some(i => i.name.toLowerCase().includes(q))
        );
    }

    return { getAll, getById, add, update, remove, search };
})();

// ═══════════════════════════════════════════════════════
// APP STATE
// ═══════════════════════════════════════════════════════
const AppState = {
    recipes: [],
    currentMenu: [],
    latestReport: null,
    searchResults: [],
};

// ═══════════════════════════════════════════════════════
// AUTH MANAGER — must be before DOMContentLoaded
// ═══════════════════════════════════════════════════════
const AuthManager = (() => {
    const TOKEN_KEY = 'mm_auth_token';
    const USER_KEY  = 'mm_auth_user';
    function getToken() { return localStorage.getItem(TOKEN_KEY); }
    function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
    function getUser()  {
        try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
    }
    function setUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
    function clearAuth() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
    function isLoggedIn() { return !!getToken(); }
    async function login(email, password) {
        const res  = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        setToken(data.token); setUser(data.user || { name: email.split('@')[0], email }); return data;
    }
    async function register(name, email, password) {
        const res  = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,email,password}) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || (Array.isArray(data.errors)?data.errors[0]?.msg:null) || 'Registration failed');
        setToken(data.token); setUser(data.user || { name, email }); return data;
    }
    function logout() { clearAuth(); updateAuthUI(); navigateTo('dashboard'); showToast('Logged out.'); }
    return { getToken, getUser, isLoggedIn, login, register, logout };
})();

// ═══════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    updateAuthUI();          // apply auth state before rendering
    wireStaticButtons();
    AppState.recipes = Store.getAll();
    renderSavedRecipes();
    renderRecentDashboard();
    renderCurrentMenu();
    addIngredientRow(); // seed one empty row
});

// ═══════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════
function applyTheme() {
    const theme = localStorage.getItem('mm_theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = theme === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('mm_theme', next);
    applyTheme();
});

// ═══════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color:var(--${type === 'error' ? 'danger' : 'success'}-color)"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ═══════════════════════════════════════════════════════
// SIDEBAR / NAV
// ═══════════════════════════════════════════════════════
function wireStaticButtons() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    document.getElementById('menuBtn').addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    });
    document.getElementById('closeSidebarBtn').addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            if (link.dataset.protected && !AuthManager.isLoggedIn()) {
                requireAuth(link.dataset.target);
            } else {
                navigateTo(link.dataset.target);
            }
        });
    });
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

function navigateTo(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.toggle('active', a.dataset.target === id);
    });
    const view = document.getElementById(id);
    if (view) view.classList.add('active-view');
    document.getElementById('pageTitle').textContent =
        document.querySelector(`[data-target="${id}"] span`)?.textContent || id;
    if (window.innerWidth <= 768) closeSidebar();
}

// Internal nav cards (dashboard quick-links)
document.addEventListener('click', e => {
    const card = e.target.closest('[data-target]');
    if (card && !card.closest('.nav-links')) {
        e.preventDefault();
        navigateTo(card.dataset.target);
    }
});

// ═══════════════════════════════════════════════════════
// MANAGE RECIPES
// ═══════════════════════════════════════════════════════
const units = ['g', 'kg', 'ml', 'L', 'cup', 'tbsp', 'tsp', 'pieces', 'pinch'];

document.getElementById('addIngredientBtn').addEventListener('click', () => addIngredientRow());
document.getElementById('cancelEditBtn').addEventListener('click', resetRecipeForm);

function addIngredientRow(name = '', qty = '', unit = 'g') {
    const list = document.getElementById('ingredientsList');
    // Don't add a duplicate empty row on first boot if one already exists
    if (!name && !qty && list.children.length > 0) {
        const rows = [...list.querySelectorAll('.ingredient-row')];
        if (rows.length === 1) {
            const lastName = rows[rows.length - 1].querySelector('.ing-name').value.trim();
            if (!lastName) return;
        }
    }
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.innerHTML = `
        <input type="text" class="form-control ing-name" placeholder="Item name" value="${name}" required>
        <input type="number" class="form-control ing-qty" placeholder="Qty" step="0.01" min="0" value="${qty}" required>
        <select class="form-control ing-unit">${units.map(u => `<option${u === unit ? ' selected' : ''}>${u}</option>`).join('')}</select>
        <button type="button" class="remove-ing-btn"><i class="fa-solid fa-trash"></i></button>
    `;
    row.querySelector('.remove-ing-btn').addEventListener('click', () => row.remove());
    list.appendChild(row);
}

function getIngredientsFromForm() {
    return [...document.getElementById('ingredientsList').querySelectorAll('.ingredient-row')]
        .map(row => ({
            name: row.querySelector('.ing-name').value.trim(),
            qty: parseFloat(row.querySelector('.ing-qty').value),
            unit: row.querySelector('.ing-unit').value,
        }))
        .filter(i => i.name && !isNaN(i.qty) && i.qty > 0);
}

function resetRecipeForm() {
    document.getElementById('recipeForm').reset();
    document.getElementById('recipeId').value = '';
    document.getElementById('ingredientsList').innerHTML = '';
    addIngredientRow();
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('recipeFormTitle').textContent = 'Add New Recipe';
    document.getElementById('saveRecipeBtn').textContent = 'Save Recipe';
}

document.getElementById('recipeForm').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('recipeId').value;
    const ingredients = getIngredientsFromForm();
    if (!ingredients.length) { showToast('Add at least one ingredient.', 'error'); return; }

    const payload = {
        name: document.getElementById('recipeName').value.trim(),
        baseServing: parseInt(document.getElementById('recipeBaseServing').value, 10),
        ingredients,
        tags: document.getElementById('recipeTags').value.split(',').map(t => t.trim()).filter(Boolean),
    };

    if (id) {
        Store.update(id, payload);
        showToast('Recipe updated!');
    } else {
        Store.add(payload);
        showToast('Recipe saved!');
    }

    AppState.recipes = Store.getAll();
    renderSavedRecipes();
    renderRecentDashboard();
    resetRecipeForm();
});

function renderSavedRecipes() {
    const container = document.getElementById('savedRecipesList');
    const q = (document.getElementById('filterRecipes').value || '').toLowerCase();
    const filtered = AppState.recipes.filter(r => r.name.toLowerCase().includes(q));

    document.getElementById('dashRecipeCount').textContent = AppState.recipes.length;

    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><p>No recipes found.</p></div>';
        return;
    }
    container.innerHTML = filtered.map(r => `
        <div class="recipe-list-item">
            <div class="recipe-info">
                <h4>${r.name}</h4>
                <p>Serves: ${r.baseServing} | Ingredients: ${r.ingredients.length}</p>
            </div>
            <div class="recipe-actions">
                <button class="icon-btn edit-recipe-btn" data-id="${r.id}"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn danger delete-recipe-btn" data-id="${r.id}"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.edit-recipe-btn').forEach(btn =>
        btn.addEventListener('click', () => loadRecipeForEdit(btn.dataset.id)));
    container.querySelectorAll('.delete-recipe-btn').forEach(btn =>
        btn.addEventListener('click', () => deleteRecipe(btn.dataset.id)));
}

document.getElementById('filterRecipes').addEventListener('input', renderSavedRecipes);

function loadRecipeForEdit(id) {
    const r = Store.getById(id);
    if (!r) return;
    document.getElementById('recipeId').value = r.id;
    document.getElementById('recipeName').value = r.name;
    document.getElementById('recipeBaseServing').value = r.baseServing;
    document.getElementById('recipeTags').value = (r.tags || []).join(', ');
    document.getElementById('recipeFormTitle').textContent = 'Edit Recipe';
    document.getElementById('cancelEditBtn').style.display = 'inline-flex';
    document.getElementById('saveRecipeBtn').textContent = 'Update Recipe';
    document.getElementById('ingredientsList').innerHTML = '';
    r.ingredients.forEach(ing => addIngredientRow(ing.name, ing.qty, ing.unit));
    document.getElementById('manage-recipes').scrollIntoView({ behavior: 'smooth' });
    navigateTo('manage-recipes');
}

function deleteRecipe(id) {
    if (!confirm('Delete this recipe?')) return;
    Store.remove(id);
    AppState.recipes = Store.getAll();
    renderSavedRecipes();
    renderRecentDashboard();
    showToast('Recipe deleted.');
}

function renderRecentDashboard() {
    const el = document.getElementById('recentRecipesList');
    if (!AppState.recipes.length) {
        el.innerHTML = `<div class="empty-state">
            <i class="fa-solid fa-folder-open empty-icon"></i>
            <p>No recipes added yet.</p>
            <button class="btn primary nav-card-btn" data-target="manage-recipes">Add Your First Recipe</button>
        </div>`;
        document.getElementById('dashPopularRecipe').textContent = '—';
        return;
    }
    const recent = [...AppState.recipes]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 3);
    el.innerHTML = recent.map(r => `
        <div class="recipe-list-item" style="border-left:3px solid var(--primary-color)">
            <div class="recipe-info"><h4>${r.name}</h4><p>Serves: ${r.baseServing}</p></div>
        </div>`).join('');
    document.getElementById('dashPopularRecipe').textContent =
        AppState.recipes.reduce((top, r) => !top || r.name.localeCompare(top.name) > 0 ? top : r, AppState.recipes[0])?.name || '—';
}

// ═══════════════════════════════════════════════════════
// SEARCH & SCALE  (local filter)
// ═══════════════════════════════════════════════════════
document.getElementById('searchRecipeForm').addEventListener('submit', e => {
    e.preventDefault();
    const q = document.getElementById('searchQuery').value.trim();
    const targetServing = parseInt(document.getElementById('searchTargetServing').value, 10);
    AppState.searchResults = Store.search(q);
    renderSearchResults(targetServing);
    document.getElementById('searchResults').style.display = AppState.searchResults.length ? 'block' : 'none';
});

function renderSearchResults(targetServing) {
    const container = document.getElementById('searchResultsList');
    if (!AppState.searchResults.length) {
        container.innerHTML = '<div class="card"><div class="card-body"><p class="text-muted">No recipes found.</p></div></div>';
        return;
    }
    container.innerHTML = AppState.searchResults.map(r => {
        const multiplier = (targetServing && r.baseServing) ? targetServing / r.baseServing : 1;
        const rows = r.ingredients.map(ing => {
            // Scale and auto-convert unit (e.g. 200 g × 5 → 1 kg)
            const { qty, unit } = UnitConverter.scale(ing.qty, ing.unit, multiplier);
            return `<tr><td>${ing.name}</td><td><strong>${formatQty(qty)}</strong></td><td>${unit}</td></tr>`;
        }).join('');
        const multLabel = multiplier !== 1 ? formatQty(multiplier) + 'x' : '';
        return `<div class="card mb-3">
            <div class="card-header flex-between">
                <div>
                    <h3>${r.name}</h3>
                    <p class="text-muted text-sm">${targetServing ? `Scaled for ${targetServing} people (base ${r.baseServing})` : `Base serving: ${r.baseServing} people`}</p>
                </div>
                ${multLabel ? `<div class="multiplier-badge">${multLabel}</div>` : ''}
            </div>
            <div class="card-body">
                <table class="data-table"><thead><tr><th>Ingredient</th><th>Quantity</th><th>Unit</th></tr></thead>
                <tbody>${rows}</tbody></table>
            </div>
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════
// MENU CALCULATOR AUTOCOMPLETE
// ═══════════════════════════════════════════════════════
let acHighlight = -1;

function renderAcDropdown(query) {
    const dropdown = document.getElementById('menuRecipeDropdown');
    const q = query.toLowerCase().trim();
    const matches = q
        ? AppState.recipes.filter(r => r.name.toLowerCase().includes(q))
        : AppState.recipes;
    acHighlight = -1;
    if (!matches.length) {
        dropdown.innerHTML = '<li class="no-results">No recipes found</li>';
    } else {
        dropdown.innerHTML = matches.map(r => `
            <li role="option" data-id="${r.id}" data-name="${r.name}">
                ${r.name}
                <div class="recipe-meta">Base: ${r.baseServing} people</div>
            </li>`).join('');
        dropdown.querySelectorAll('li[data-id]').forEach(li => {
            li.addEventListener('mousedown', e => {
                e.preventDefault();
                selectAcRecipe(li.dataset.id, li.dataset.name);
            });
        });
    }
    dropdown.classList.add('open');
}

function selectAcRecipe(id, name) {
    document.getElementById('menuRecipeId').value = id;
    const input = document.getElementById('menuRecipeSearch');
    input.value = name;
    input.classList.add('has-selection');
    document.getElementById('menuRecipeDropdown').classList.remove('open');
    acHighlight = -1;
}

const menuSearchInput = document.getElementById('menuRecipeSearch');
menuSearchInput.addEventListener('input', () => {
    document.getElementById('menuRecipeId').value = '';
    menuSearchInput.classList.remove('has-selection');
    renderAcDropdown(menuSearchInput.value);
});
menuSearchInput.addEventListener('focus', () => renderAcDropdown(menuSearchInput.value));
menuSearchInput.addEventListener('blur', () =>
    setTimeout(() => document.getElementById('menuRecipeDropdown').classList.remove('open'), 150));
menuSearchInput.addEventListener('keydown', e => {
    const items = [...document.getElementById('menuRecipeDropdown').querySelectorAll('li[data-id]')];
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); acHighlight = Math.min(acHighlight + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); acHighlight = Math.max(acHighlight - 1, 0); }
    else if (e.key === 'Enter' && acHighlight >= 0) {
        e.preventDefault();
        const li = items[acHighlight];
        selectAcRecipe(li.dataset.id, li.dataset.name);
        return;
    } else if (e.key === 'Escape') {
        document.getElementById('menuRecipeDropdown').classList.remove('open');
        return;
    }
    items.forEach((li, i) => li.classList.toggle('highlighted', i === acHighlight));
});
document.addEventListener('click', e => {
    if (!e.target.closest('#menuRecipeAutocomplete'))
        document.getElementById('menuRecipeDropdown').classList.remove('open');
});

// ═══════════════════════════════════════════════════════
// MENU CALCULATOR
// ═══════════════════════════════════════════════════════
document.getElementById('addMenuForm').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('menuRecipeId').value;
    const targetServing = parseInt(document.getElementById('menuTargetServing').value, 10);
    if (!id) { showToast('Please select a recipe.', 'error'); return; }
    if (!targetServing || targetServing < 1) { showToast('Enter a valid serving size.', 'error'); return; }

    const recipe = Store.getById(id);
    if (!recipe) { showToast('Recipe not found.', 'error'); return; }

    const existing = AppState.currentMenu.findIndex(i => i.recipe.id === id);
    if (existing > -1) {
        AppState.currentMenu[existing].targetServing += targetServing;
        showToast(`Updated ${recipe.name} in menu.`);
    } else {
        AppState.currentMenu.push({ recipe: JSON.parse(JSON.stringify(recipe)), targetServing });
        showToast(`Added ${recipe.name} to menu!`);
    }

    renderCurrentMenu();
    document.getElementById('addMenuForm').reset();
    document.getElementById('menuRecipeId').value = '';
    menuSearchInput.value = '';
    menuSearchInput.classList.remove('has-selection');
});

function renderCurrentMenu() {
    const container = document.getElementById('currentMenuList');
    const countEl = document.getElementById('menuItemCount');
    const actions = document.getElementById('generateReportActions');
    countEl.textContent = `${AppState.currentMenu.length} Items`;

    if (!AppState.currentMenu.length) {
        container.innerHTML = '<div class="empty-state py-2"><p>No dishes added yet.</p></div>';
        actions.style.display = 'none';
        return;
    }
    container.innerHTML = AppState.currentMenu.map((item, i) => `
        <div class="menu-item-card">
            <div class="menu-item-info">
                <h4>${item.recipe.name}</h4>
                <p>For ${item.targetServing} people (Base: ${item.recipe.baseServing})</p>
            </div>
            <button class="icon-btn danger remove-menu-item" data-index="${i}">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>`).join('');

    container.querySelectorAll('.remove-menu-item').forEach(btn => {
        btn.addEventListener('click', () => {
            AppState.currentMenu.splice(parseInt(btn.dataset.index, 10), 1);
            renderCurrentMenu();
        });
    });
    actions.style.display = 'flex';
}

document.getElementById('clearMenuBtn').addEventListener('click', () => {
    if (confirm('Clear the current menu?')) {
        AppState.currentMenu = [];
        renderCurrentMenu();
    }
});




// ═══════════════════════════════════════════════════════
// FORMAT QUANTITY — human-friendly display
// ═══════════════════════════════════════════════════════
/**
 * Converts a float to a clean, human-readable string:
 *   1000   → "1000"    (integer, no decimal)
 *   1.5    → "1.5"     (1 decimal where meaningful)
 *   1.575  → "1.58"    (max 2 decimal places)
 *   0.333… → "0.33"    (capped at 2 dp)
 */
function formatQty(n) {
    if (n == null || isNaN(n)) return '0';
    // Round to at most 2 decimal places
    const rounded = Math.round(n * 100) / 100;
    // If it's a whole number, return without decimal point
    if (rounded === Math.floor(rounded)) return String(Math.round(rounded));
    // Otherwise remove any trailing zero (e.g. 1.50 → "1.5")
    return String(rounded);
}

// ═══════════════════════════════════════════════════════
// UNIT CONVERTER — normalises compatible quantities
// ═══════════════════════════════════════════════════════
const UnitConverter = (() => {
    const GROUPS = [
        { base: 'g',   units: { g: 1, kg: 1000 } },
        { base: 'ml',  units: { ml: 1, L: 1000 } },
        { base: 'tsp', units: { tsp: 1, tbsp: 3, cup: 48 } },
    ];

    function findGroup(unit) { return GROUPS.find(g => unit in g.units) || null; }
    function toBase(qty, fromUnit, group) { return qty * group.units[fromUnit]; }

    /**
     * Choose the most readable unit for a base quantity.
     * Returns a raw float — caller applies formatQty().
     */
    function fromBase(baseQty, group) {
        const sorted = Object.entries(group.units).sort((a, b) => b[1] - a[1]);
        for (const [unit, mult] of sorted) {
            const val = baseQty / mult;
            if (val >= 1) return { qty: val, unit };   // raw float
        }
        return { qty: baseQty, unit: group.base };
    }

    /**
     * Scale a single ingredient and auto-select the best display unit.
     * e.g. scale(200, 'g', 5) → { qty: 1, unit: 'kg' }
     */
    function scale(qty, unit, multiplier) {
        const group = findGroup(unit);
        if (!group) return { qty: qty * multiplier, unit };  // discrete unit, just multiply
        const baseQty = toBase(qty * multiplier, unit, group);
        return fromBase(baseQty, group);
    }

    function _direct(map, key, name, qty, unit) {
        if (map.has(key)) map.get(key).baseQty += qty;
        else map.set(key, { name, baseQty: qty, group: null, unit });
    }

    /**
     * Accumulate a scaled ingredient quantity into the combining map.
     * Stores exact floats — no pre-rounding to avoid accumulated error.
     */
    function accumulate(map, name, addQty, addUnit) {
        const key = name.toLowerCase().trim();
        const group = findGroup(addUnit);
        if (group) {
            const baseQty = toBase(addQty, addUnit, group);   // exact
            if (map.has(key)) {
                const e = map.get(key);
                if (e.group === group) e.baseQty += baseQty;
                else _direct(map, `${key}|${addUnit}`, name, addQty, addUnit);
            } else map.set(key, { name, baseQty, group });
        } else {
            _direct(map, `${key}|${addUnit}`, name, addQty, addUnit);
        }
    }

    /** Resolve accumulated buckets to { name, qty (raw float), unit } */
    function resolve(map) {
        return [...map.values()].map(e =>
            e.group
                ? Object.assign({ name: e.name }, fromBase(e.baseQty, e.group))
                : { name: e.name, qty: e.baseQty, unit: e.unit }   // raw float
        );
    }

    return { accumulate, resolve, scale };
})();

// ═══════════════════════════════════════════════════════
// COMBINED REPORT + PDF
// ═══════════════════════════════════════════════════════
function generateCombinedReport() {
    const map = new Map();
    AppState.currentMenu.forEach(item => {
        const mult = item.targetServing / item.recipe.baseServing;
        item.recipe.ingredients.forEach(ing => {
            // Use exact float — no pre-rounding to preserve accumulation accuracy
            UnitConverter.accumulate(map, ing.name, ing.qty * mult, ing.unit);
        });
    });

    // resolve returns raw floats; formatQty is applied at display time
    const sorted = UnitConverter.resolve(map).sort((a, b) => a.name.localeCompare(b.name));
    AppState.latestReport = { menu: [...AppState.currentMenu], ingredients: sorted };

    const container = document.getElementById('reportContainer');
    container.innerHTML = '';
    const tmpl = document.getElementById('reportTemplate').content.cloneNode(true);
    tmpl.getElementById('reportMenuSummary').innerHTML =
        AppState.latestReport.menu.map(m => `<li>${m.recipe.name} <span>(${m.targetServing} people)</span></li>`).join('');
    tmpl.getElementById('reportIngredientsList').innerHTML =
        sorted.map(i => `<tr><td>${i.name}</td><td><strong>${formatQty(i.qty)}</strong></td><td>${i.unit}</td></tr>`).join('');
    container.appendChild(tmpl);

    document.getElementById('exportPdfBtn').style.display = 'inline-flex';
    document.getElementById('shareReportBtn').style.display = 'inline-flex';
}

function getReportEventName() {
    return AppState.latestReport.eventName || 'Untitled Event';
}

function getReportEventDate() {
    if (AppState.latestReport.eventDate) {
        return new Date(AppState.latestReport.eventDate).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }
    return new Date().toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function buildShareText() {
    const eventName = getReportEventName();
    const eventDate = getReportEventDate();
    const totalPeople = AppState.latestReport.eventPeopleCount || AppState.latestReport.menu.reduce((s, m) => s + m.targetServing, 0);

    let text = `Event: ${eventName}\n`;
    text += `Date: ${eventDate}\n`;
    text += `People: ${totalPeople}\n\n`;

    text += 'Combined Ingredients:\n';
    AppState.latestReport.ingredients.forEach(i => {
        text += `- ${i.name}: ${formatQty(i.qty)} ${i.unit}\n`;
    });

    text += '\nGenerated via Recipe Ingredient Calculator';
    return text;
}

async function copyToClipboardFallback(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard');
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard');
        } catch (ex) {
            showToast('Failed to copy', 'error');
        }
        document.body.removeChild(textarea);
    }
}

document.getElementById('exportPdfBtn').addEventListener('click', () => {
    if (!AppState.latestReport) return;
    if (!AppState.latestReport.eventName) {
        showToast('Please save this report as an Event first!', 'error');
        document.getElementById('eventNameInput')?.focus();
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const eventName = getReportEventName();
    
    doc.setFontSize(20); doc.text(eventName, 14, 22);
    doc.setFontSize(14); doc.text('Menu Summary:', 14, 35);
    let y = 43;
    doc.setFontSize(11);
    AppState.latestReport.menu.forEach(m => { doc.text(`• ${m.recipe.name} (${m.targetServing} people)`, 14, y); y += 7; });
    y += 5;
    doc.setFontSize(14); doc.text('Combined Ingredients:', 14, y);
    doc.autoTable({
        startY: y + 5,
        head: [['Ingredient', 'Qty', 'Unit']],
        body: AppState.latestReport.ingredients.map(i => [i.name, formatQty(i.qty), i.unit]),
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
    });
    
    // Sanitize filename
    const safeFilename = eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeFilename}-Ingredients-Report.pdf`);
    showToast('PDF exported!');
});

document.getElementById('shareReportBtn').addEventListener('click', async () => {
    if (!AppState.latestReport) return;
    if (!AppState.latestReport.eventName) {
        showToast('Please save this report as an Event first!', 'error');
        document.getElementById('eventNameInput')?.focus();
        return;
    }
    const text = buildShareText();
    const title = getReportEventName();

    if (navigator.share) {
        try { 
            await navigator.share({ title: title, text }); 
            showToast('Shared!'); 
        } catch (err) { 
            if (err.name !== 'AbortError') copyToClipboardFallback(text);
        }
    } else {
        copyToClipboardFallback(text);
    }
});

// ═══════════════════════════════════════════════════════
// EVENT STORE — persist named catering events
// ═══════════════════════════════════════════════════════
const EventStore = (() => {
    const KEY = 'mm_events_v1';

    function load() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; }
        catch { return []; }
    }

    function save(events) { localStorage.setItem(KEY, JSON.stringify(events)); }

    function getAll() { return load(); }

    function add(event) {
        const events = load();
        event.id = 'ev_' + Date.now();
        event.savedAt = event.savedAt || new Date().toISOString();
        events.unshift(event); // newest first
        save(events);
        return event;
    }

    function remove(id) { save(load().filter(e => e.id !== id)); }

    function clearAll() { save([]); }

    return { getAll, add, remove, clearAll };
})();

// ═══════════════════════════════════════════════════════
// SAVE EVENT — wire up the save panel
// ═══════════════════════════════════════════════════════

/** Show the Save Event panel once a report exists */
function showSaveEventPanel() {
    const panel = document.getElementById('saveEventPanel');
    if (panel) panel.style.display = 'block';
}

document.getElementById('saveEventBtn').addEventListener('click', () => {
    if (!AppState.latestReport) { showToast('Generate a report first.', 'error'); return; }

    const nameInput = document.getElementById('eventNameInput');
    const dateInput = document.getElementById('eventDateInput');
    const peopleInput = document.getElementById('eventPeopleInput');
    
    const eventName = nameInput.value.trim();
    const eventDate = dateInput.value;
    const peopleCount = parseInt(peopleInput.value, 10);
    
    if (!eventName) { showToast('Please enter an event name.', 'error'); nameInput.focus(); return; }
    if (!eventDate) { showToast('Please select an event date.', 'error'); dateInput.focus(); return; }
    if (!peopleCount || peopleCount < 1) { showToast('Please enter a valid people count.', 'error'); peopleInput.focus(); return; }

    const [year, month, day] = eventDate.split('-');
    const dateObj = new Date(year, month - 1, day);

    // Build summary totals
    const dishes = AppState.latestReport.menu.map(m => ({
        name: m.recipe.name,
        serving: m.targetServing,
        baseServing: m.recipe.baseServing,
    }));

    const eventToSave = {
        name: eventName,
        savedAt: dateObj.toISOString(),
        totalPeople: peopleCount,
        dishCount: dishes.length,
        dishes,
        ingredients: AppState.latestReport.ingredients, // already formatted
    };
    
    const savedEvent = EventStore.add(eventToSave);
    
    // Update the current report so immediate sharing knows the name/date
    AppState.latestReport.eventName = savedEvent.name;
    AppState.latestReport.eventDate = savedEvent.savedAt;
    AppState.latestReport.eventPeopleCount = savedEvent.totalPeople;

    showToast(`Event "${eventName}" saved!`);
    nameInput.value = '';
    dateInput.value = '';
    peopleInput.value = '';
    // Refresh events list if already on that view
    renderSavedEvents();
});

// ═══════════════════════════════════════════════════════
// SAVED EVENTS VIEW
// ═══════════════════════════════════════════════════════

function renderSavedEvents() {
    const container = document.getElementById('savedEventsList');
    const clearBtn  = document.getElementById('clearAllEventsBtn');
    const events    = EventStore.getAll();

    clearBtn.style.display = events.length ? 'inline-flex' : 'none';

    if (!events.length) {
        container.innerHTML = `<div class="empty-state card">
            <i class="fa-solid fa-calendar-xmark empty-icon"></i>
            <p>No events saved yet. Generate a Combined Report and click <strong>Save as Event</strong>.</p>
            <button class="btn primary nav-card-btn" data-target="menu-calculator">Go to Calculator</button>
        </div>`;
        return;
    }

    container.innerHTML = events.map(ev => {
        const date = new Date(ev.savedAt).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
        const ingredientRows = (ev.ingredients || []).slice(0, 5).map(i =>
            `<tr><td>${i.name}</td><td>${formatQty(i.qty)}</td><td>${i.unit}</td></tr>`
        ).join('');
        const more = (ev.ingredients || []).length > 5
            ? `<tr><td colspan="3" class="text-muted text-sm">…and ${ev.ingredients.length - 5} more</td></tr>`
            : '';

        return `<div class="card mb-3 event-card" data-event-id="${ev.id}">
            <div class="card-header flex-between">
                <div>
                    <h3 style="margin-bottom:.15rem;">${ev.name}</h3>
                    <p class="text-muted text-sm"><i class="fa-regular fa-clock" style="margin-right:.3rem;"></i>${date}</p>
                </div>
                <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">
                    <span class="badge" style="background:var(--blue-light);color:var(--primary-color);">
                        <i class="fa-solid fa-users" style="margin-right:.3rem;"></i>${ev.totalPeople} people
                    </span>
                    <span class="badge" style="background:var(--green-light);color:var(--success-color);">
                        <i class="fa-solid fa-utensils" style="margin-right:.3rem;"></i>${ev.dishCount} dish${ev.dishCount !== 1 ? 'es' : ''}
                    </span>
                </div>
            </div>
            <div class="card-body">
                <div style="display:flex;gap:1.5rem;flex-wrap:wrap;">
                    <!-- Dishes -->
                    <div style="flex:1;min-width:180px;">
                        <p style="font-size:.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:.5rem;">Menu</p>
                        <ul style="margin:0;padding-left:1rem;font-size:.875rem;">
                            ${ev.dishes.map(d => `<li>${d.name} <span class="text-muted">(${d.serving} ppl)</span></li>`).join('')}
                        </ul>
                    </div>
                    <!-- Ingredients snapshot -->
                    <div style="flex:2;min-width:240px;">
                        <p style="font-size:.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:.5rem;">Shopping List (preview)</p>
                        <table class="data-table" style="font-size:.8rem;">
                            <thead><tr><th>Ingredient</th><th>Qty</th><th>Unit</th></tr></thead>
                            <tbody>${ingredientRows}${more}</tbody>
                        </table>
                    </div>
                </div>
                <div style="display:flex;gap:.5rem;margin-top:1rem;flex-wrap:wrap;">
                    <button class="btn outline small load-event-btn" data-event-id="${ev.id}">
                        <i class="fa-solid fa-eye"></i> View Full Report
                    </button>
                    <button class="btn danger small delete-event-btn" data-event-id="${ev.id}">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Wire Load buttons
    container.querySelectorAll('.load-event-btn').forEach(btn => {
        btn.addEventListener('click', () => loadEventToReport(btn.dataset.eventId));
    });

    // Wire Delete buttons
    container.querySelectorAll('.delete-event-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ev = EventStore.getAll().find(e => e.id === btn.dataset.eventId);
            if (!confirm(`Delete event "${ev?.name}"?`)) return;
            EventStore.remove(btn.dataset.eventId);
            showToast('Event deleted.');
            renderSavedEvents();
        });
    });
}

/** Load a saved event into the combined-report view (read-only display) */
function loadEventToReport(eventId) {
    const ev = EventStore.getAll().find(e => e.id === eventId);
    if (!ev) return;

    // Reconstruct a minimal latestReport for PDF/share
    AppState.latestReport = {
        eventName: ev.name,
        eventDate: ev.savedAt,
        eventPeopleCount: ev.totalPeople,
        menu: ev.dishes.map(d => ({ recipe: { name: d.name, baseServing: d.baseServing }, targetServing: d.serving })),
        ingredients: ev.ingredients,
    };

    const container = document.getElementById('reportContainer');
    container.innerHTML = '';
    const tmpl = document.getElementById('reportTemplate').content.cloneNode(true);
    tmpl.getElementById('reportMenuSummary').innerHTML =
        ev.dishes.map(d => `<li>${d.name} <span>(${d.serving} people)</span></li>`).join('');
    tmpl.getElementById('reportIngredientsList').innerHTML =
        ev.ingredients.map(i => `<tr><td>${i.name}</td><td><strong>${formatQty(i.qty)}</strong></td><td>${i.unit}</td></tr>`).join('');
    container.appendChild(tmpl);

    document.getElementById('exportPdfBtn').style.display = 'inline-flex';
    document.getElementById('shareReportBtn').style.display = 'inline-flex';

    // Show event name as badge in header
    document.getElementById('reportContainer').insertAdjacentHTML('afterbegin',
        `<div class="card mb-3" style="background:var(--blue-light);border:none;">
            <div class="card-body" style="padding:.75rem 1rem;">
                <p style="margin:0;font-size:.875rem;color:var(--primary-color);">
                    <i class="fa-solid fa-calendar-check" style="margin-right:.4rem;"></i>
                    <strong>${ev.name}</strong> &nbsp;·&nbsp;
                    ${new Date(ev.savedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    &nbsp;·&nbsp; ${ev.totalPeople} people
                </p>
            </div>
        </div>`
    );

    navigateTo('combined-report');
    showToast(`Loaded event: ${ev.name}`);
}

/** Clear all events */
document.getElementById('clearAllEventsBtn').addEventListener('click', () => {
    if (!confirm('Delete ALL saved events? This cannot be undone.')) return;
    EventStore.clearAll();
    showToast('All events cleared.');
    renderSavedEvents();
});

// ═══════════════════════════════════════════════════════
// HOOK: show Save Event panel when report is generated
// and render events when navigating to Saved Events view
// ═══════════════════════════════════════════════════════
(function patchNavigateTo() {
    const _original = navigateTo;
    window.navigateTo = function(id) {
        _original(id);
        if (id === 'saved-events')        renderSavedEvents();
        if (id === 'admin-login-activity') loadAdminLoginActivity(1);
    };
})();

// Also reveal Save Event panel after generateCombinedReport runs
const _origGenerate = generateCombinedReport;
window.generateCombinedReport = function() {
    _origGenerate();
    showSaveEventPanel();
};
// Re-wire the generate button to use the patched version
document.getElementById('generateReportBtn').addEventListener('click', () => {
    if (!AppState.currentMenu.length) return;
    window.generateCombinedReport();
    window.navigateTo('combined-report');
});

// ═══════════════════════════════════════════════════════
// AUTH UI — sync sidebar & lock icons with login state
// ═══════════════════════════════════════════════════════
function updateAuthUI() {
    const loggedIn = AuthManager.isLoggedIn();
    const user     = AuthManager.getUser();

    // Sidebar: swap guest ↔ logged-in block
    const guestEl    = document.getElementById('sidebarGuest');
    const loggedInEl = document.getElementById('sidebarLoggedIn');
    if (guestEl)    guestEl.style.display    = loggedIn ? 'none'  : 'block';
    if (loggedInEl) loggedInEl.style.display = loggedIn ? 'block' : 'none';

    if (loggedIn && user) {
        const initial = (user.name || user.email || '?')[0].toUpperCase();
        const avatarEl = document.getElementById('userAvatar');
        const nameEl   = document.getElementById('userName');
        if (avatarEl) avatarEl.textContent = initial;
        if (nameEl)   nameEl.textContent   = user.name || user.email;
    }

    // Lock icons: visible only when not logged in
    document.querySelectorAll('.nav-lock').forEach(icon => {
        icon.classList.toggle('hidden', loggedIn);
    });

    // Admin-only nav item: show only when role === 'admin'
    const isAdmin = loggedIn && user && user.role === 'admin';
    const adminNavItem = document.getElementById('adminNavItem');
    if (adminNavItem) adminNavItem.classList.toggle('visible', isAdmin);
}

// ═══════════════════════════════════════════════════════
// AUTH MODAL — open / close / tab switch
// ═══════════════════════════════════════════════════════
let _pendingTarget = null;  // view to navigate to after successful login

function requireAuth(targetViewId) {
    _pendingTarget = targetViewId || null;
    const hints = {
        'manage-recipes': 'Log in to create and manage your recipes.',
        'saved-events':   'Log in to view and save your event history.',
        'save-event':     'Log in to save this report as a named event.',
    };
    const hint = document.getElementById('authModalHint');
    if (hint) hint.textContent = hints[targetViewId] || 'Log in to access this feature.';
    openAuthModal();
}

function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('hidden');
        // clear previous errors
        ['loginError', 'registerError'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '';
        });
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
    _pendingTarget = null;
}

function onAuthSuccess() {
    closeAuthModal();
    updateAuthUI();
    const target = _pendingTarget;
    _pendingTarget = null;
    if (target) navigateTo(target);
}

// Close on backdrop click
document.getElementById('authModal').addEventListener('click', e => {
    if (e.target === document.getElementById('authModal')) closeAuthModal();
});

// Close button
document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);

// "Log In" sidebar button
document.getElementById('openLoginBtn').addEventListener('click', () => openAuthModal());

// Logout button
document.getElementById('logoutBtn').addEventListener('click', () => AuthManager.logout());

// Tab switching inside modal
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active-form'));
        tab.classList.add('active');
        const target = tab.dataset.authTab;  // 'login' or 'register'
        const form = document.getElementById(target + 'Form');
        if (form) form.classList.add('active-form');
    });
});

// ── Login form ──────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('loginSubmitBtn');
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Logging in…';
    try {
        await AuthManager.login(
            document.getElementById('loginEmail').value.trim(),
            document.getElementById('loginPassword').value,
        );
        showToast('Welcome back!');
        onAuthSuccess();
    } catch (err) {
        errEl.textContent = err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Log In';
    }
});

// ── Register form ───────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('registerSubmitBtn');
    const errEl = document.getElementById('registerError');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Creating account…';
    try {
        await AuthManager.register(
            document.getElementById('regName').value.trim(),
            document.getElementById('regEmail').value.trim(),
            document.getElementById('regPassword').value,
        );
        showToast('Account created! Welcome!');
        onAuthSuccess();
    } catch (err) {
        errEl.textContent = err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
});

// ═══════════════════════════════════════════════════════
// ADMIN — LOGIN ACTIVITY VIEW
// ═══════════════════════════════════════════════════════

let _loginActivityPage = 1;

/**
 * Fetch and render the paginated login/register event table.
 * @param {number} page  1-based page number
 */
async function loadAdminLoginActivity(page = 1) {
    _loginActivityPage = page;

    const token = AuthManager.getToken();
    const wrap  = document.getElementById('loginActivityTableWrap');

    // Defensive: must be logged in as admin
    if (!token) {
        if (wrap) wrap.innerHTML = `<div class="empty-state">
            <i class="fa-solid fa-lock empty-icon"></i>
            <p>You must be logged in as an admin to view this panel.</p>
        </div>`;
        return;
    }

    if (wrap) wrap.innerHTML = `<div class="empty-state">
        <i class="fa-solid fa-spinner fa-spin empty-icon"></i>
        <p>Loading activity…</p>
    </div>`;

    try {
        const res  = await fetch(`/api/admin/login-activity?page=${page}&limit=25`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 403) {
            if (wrap) wrap.innerHTML = `<div class="empty-state">
                <i class="fa-solid fa-shield-halved empty-icon"></i>
                <p>Access denied. Admin role required.</p>
            </div>`;
            return;
        }

        if (!res.ok) throw new Error('Server error');

        const { events, total, pages, stats } = await res.json();

        // ── Stats bar ──────────────────────────────────────
        const statLogins = document.getElementById('statTodayLogins');
        const statReg    = document.getElementById('statTodayRegistrations');
        const statTotal  = document.getElementById('statTotalEvents');
        if (statLogins) statLogins.textContent = stats?.todayLogins        ?? 0;
        if (statReg)    statReg.textContent    = stats?.todayRegistrations ?? 0;
        if (statTotal)  statTotal.textContent  = total ?? 0;

        // ── Page info badge ────────────────────────────────
        const pageInfo = document.getElementById('loginActivityPageInfo');
        if (pageInfo) pageInfo.textContent = `Page ${page} of ${pages || 1}`;

        // ── Table ──────────────────────────────────────────
        if (!events || !events.length) {
            if (wrap) wrap.innerHTML = `<div class="empty-state">
                <i class="fa-solid fa-inbox empty-icon"></i>
                <p>No login or registration events recorded yet.</p>
            </div>`;
        } else {
            if (wrap) wrap.innerHTML = `
                <table class="data-table login-activity-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Event</th>
                            <th>Date &amp; Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${events.map(ev => {
                            const u = ev.user;
                            const dt = new Date(ev.timestamp).toLocaleString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                            });
                            const nameCell  = u
                                ? `<strong>${u.name || '—'}</strong>`
                                : `<span class="deleted-user">Deleted user</span>`;
                            const emailCell = u ? u.email : '—';
                            const roleChip  = u
                                ? `<span class="role-chip ${u.role || 'user'}">${u.role || 'user'}</span>`
                                : '—';
                            const eventIcon = ev.eventType === 'login'
                                ? '<i class="fa-solid fa-right-to-bracket" style="margin-right:.3rem;"></i>'
                                : '<i class="fa-solid fa-user-plus" style="margin-right:.3rem;"></i>';
                            const eventChip = `<span class="event-chip ${ev.eventType}">${eventIcon}${ev.eventType}</span>`;

                            return `<tr>
                                <td>${nameCell}</td>
                                <td style="font-size:.8rem;color:var(--text-muted);">${emailCell}</td>
                                <td>${roleChip}</td>
                                <td>${eventChip}</td>
                                <td style="font-size:.8rem;white-space:nowrap;">${dt}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`;
        }

        // ── Pagination ─────────────────────────────────────
        const paginationEl = document.getElementById('loginActivityPagination');
        const prevBtn      = document.getElementById('loginActivityPrevBtn');
        const nextBtn      = document.getElementById('loginActivityNextBtn');
        const pageLabel    = document.getElementById('loginActivityPageLabel');

        if (paginationEl) paginationEl.style.display = pages > 1 ? 'block' : 'none';
        if (prevBtn)  prevBtn.disabled = page <= 1;
        if (nextBtn)  nextBtn.disabled = page >= pages;
        if (pageLabel) pageLabel.textContent = `Page ${page} of ${pages || 1}`;

    } catch (err) {
        console.error('Login activity fetch error:', err);
        if (wrap) wrap.innerHTML = `<div class="empty-state">
            <i class="fa-solid fa-circle-exclamation empty-icon" style="color:var(--danger-color);"></i>
            <p>Failed to load login activity. Check your connection and try again.</p>
        </div>`;
    }
}

// ── Pagination buttons ─────────────────────────────────
document.getElementById('loginActivityPrevBtn')?.addEventListener('click', () => {
    if (_loginActivityPage > 1) loadAdminLoginActivity(_loginActivityPage - 1);
});
document.getElementById('loginActivityNextBtn')?.addEventListener('click', () => {
    loadAdminLoginActivity(_loginActivityPage + 1);
});

// ── Refresh button ─────────────────────────────────────
document.getElementById('refreshLoginActivityBtn')?.addEventListener('click', () => {
    loadAdminLoginActivity(_loginActivityPage);
});


