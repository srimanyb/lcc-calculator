/**
 * MenuMaster - Main Application Logic
 * Architecture:
 * - App State (LocalStorage)
 * - View Router (SPA Navigation)
 * - UI Interactivity (Sidebar, Theme)
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- APP STATE & INIT ---
    const AppState = {
        recipes: JSON.parse(localStorage.getItem('menuMaster_recipes')) || [],
        
        saveRecipes: function() {
            localStorage.setItem('menuMaster_recipes', JSON.stringify(this.recipes));
            this.updateDashboardStats();
        },
        
        updateDashboardStats: function() {
            const countEl = document.getElementById('dashRecipeCount');
            if (countEl) {
                countEl.textContent = this.recipes.length;
            }
        }
    };

    // Initialize stats
    AppState.updateDashboardStats();

    // --- UI ELEMENTS ---
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const menuBtn = document.getElementById('menuBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const navLinks = document.querySelectorAll('.nav-links a');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('pageTitle');
    const themeToggle = document.getElementById('themeToggle');

    // --- SIDEBAR LOGIC (MOBILE) ---
    function openSidebar() {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    // --- SPA ROUTING LOGIC ---
    function navigateTo(targetId) {
        // Update nav active states
        navLinks.forEach(link => {
            if (link.dataset.target === targetId) {
                link.classList.add('active');
                pageTitle.textContent = link.querySelector('span').textContent;
            } else {
                link.classList.remove('active');
            }
        });

        // Update views
        views.forEach(view => {
            if (view.id === targetId) {
                view.classList.add('active-view');
            } else {
                view.classList.remove('active-view');
            }
        });

        // Close sidebar on mobile after navigation
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    }

    // Attach click events to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.target;
            navigateTo(targetId);
        });
    });

    // Handle internal navigational cards on dashboard
    const navCards = document.querySelectorAll('.nav-card, .nav-card-btn');
    navCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = card.closest('[data-target]').dataset.target;
            if(targetId) navigateTo(targetId);
        });
    });

    // --- THEME TOGGLE LOGIC ---
    // Check for saved theme
    const savedTheme = localStorage.getItem('menuMaster_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('menuMaster_theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'fa-regular fa-sun';
        } else {
            icon.className = 'fa-regular fa-moon';
        }
    }

    // --- REUSABLE UTILITIES ---
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconClass = 'fa-solid fa-circle-check';
        if (type === 'error') iconClass = 'fa-solid fa-circle-exclamation';

        toast.innerHTML = `
            <i class="${iconClass}" style="color: var(--${type}-color)"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- MANAGE RECIPES LOGIC ---
    const recipeForm = document.getElementById('recipeForm');
    const ingredientsList = document.getElementById('ingredientsList');
    const addIngredientBtn = document.getElementById('addIngredientBtn');
    const savedRecipesList = document.getElementById('savedRecipesList');
    const recentRecipesList = document.getElementById('recentRecipesList');
    const filterRecipes = document.getElementById('filterRecipes');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const recipeFormTitle = document.getElementById('recipeFormTitle');
    
    // Units for the dropdown
    const units = ['g', 'kg', 'ml', 'L', 'cup', 'tbsp', 'tsp', 'pieces', 'pinch'];

    function createIngredientRow(name = '', quantity = '', unit = 'g') {
        const row = document.createElement('div');
        row.className = 'ingredient-row';
        
        const unitOptions = units.map(u => `<option value="${u}" ${u === unit ? 'selected' : ''}>${u}</option>`).join('');
        
        row.innerHTML = `
            <input type="text" class="form-control ing-name" placeholder="Item name" required value="${name}">
            <input type="number" class="form-control ing-qty" placeholder="Qty" step="0.01" min="0" required value="${quantity}">
            <select class="form-control ing-unit">${unitOptions}</select>
            <button type="button" class="remove-ing-btn" title="Remove"><i class="fa-solid fa-trash"></i></button>
        `;
        
        row.querySelector('.remove-ing-btn').addEventListener('click', () => {
            row.remove();
        });
        
        ingredientsList.appendChild(row);
    }

    if (addIngredientBtn) {
        addIngredientBtn.addEventListener('click', () => createIngredientRow());
    }

    function renderSavedRecipes() {
        if (!savedRecipesList) return;
        
        const filterText = (filterRecipes ? filterRecipes.value.toLowerCase() : '');
        const filteredRecipes = AppState.recipes.filter(r => r.name.toLowerCase().includes(filterText));
        
        // Render Full list in Manage Recipes
        if (filteredRecipes.length === 0) {
            savedRecipesList.innerHTML = `
                <div class="empty-state">
                    <p>No recipes found.</p>
                </div>
            `;
        } else {
            savedRecipesList.innerHTML = filteredRecipes.map(recipe => `
                <div class="recipe-list-item">
                    <div class="recipe-info">
                        <h4>${recipe.name}</h4>
                        <p>Serves: ${recipe.baseServing} | Ingredients: ${recipe.ingredients.length}</p>
                    </div>
                    <div class="recipe-actions">
                        <button class="icon-btn edit-recipe-btn" data-id="${recipe.id}"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn danger delete-recipe-btn" data-id="${recipe.id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
            
            // Attach Events
            document.querySelectorAll('.edit-recipe-btn').forEach(btn => {
                btn.addEventListener('click', (e) => loadRecipeForEdit(e.currentTarget.dataset.id));
            });
            document.querySelectorAll('.delete-recipe-btn').forEach(btn => {
                btn.addEventListener('click', (e) => deleteRecipe(e.currentTarget.dataset.id));
            });
        }
        
        // Render Summary in Dashboard
        if (recentRecipesList) {
            if (AppState.recipes.length === 0) {
                recentRecipesList.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-folder-open empty-icon"></i>
                        <p>No recipes added yet.</p>
                        <button class="btn primary nav-card-btn" data-target="manage-recipes">Add Your First Recipe</button>
                    </div>
                `;
                // Re-attach nav logic for newly created button
                recentRecipesList.querySelector('.nav-card-btn').addEventListener('click', () => navigateTo('manage-recipes'));
            } else {
                // Show last 3
                const recent = [...AppState.recipes].reverse().slice(0, 3);
                recentRecipesList.innerHTML = recent.map(r => `
                    <div class="recipe-list-item" style="border-left: 3px solid var(--primary-color);">
                        <div class="recipe-info">
                            <h4>${r.name}</h4>
                            <p>Serves: ${r.baseServing}</p>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    if (filterRecipes) {
        filterRecipes.addEventListener('input', renderSavedRecipes);
    }

    function resetForm() {
        recipeForm.reset();
        document.getElementById('recipeId').value = '';
        ingredientsList.innerHTML = '';
        createIngredientRow(); // Create 1 empty row
        cancelEditBtn.style.display = 'none';
        recipeFormTitle.textContent = 'Add New Recipe';
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', resetForm);
    }

    function getIngredientsFromForm() {
        const rows = ingredientsList.querySelectorAll('.ingredient-row');
        const ingredients = [];
        rows.forEach(row => {
            const name = row.querySelector('.ing-name').value.trim();
            const qty = parseFloat(row.querySelector('.ing-qty').value);
            const unit = row.querySelector('.ing-unit').value;
            
            if (name && !isNaN(qty)) {
                ingredients.push({ name, qty, unit });
            }
        });
        return ingredients;
    }

    if (recipeForm) {
        recipeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const id = document.getElementById('recipeId').value;
            const name = document.getElementById('recipeName').value.trim();
            const baseServing = parseInt(document.getElementById('recipeBaseServing').value, 10);
            const ingredients = getIngredientsFromForm();
            
            if (ingredients.length === 0) {
                showToast('Please add at least one valid ingredient.', 'error');
                return;
            }

            if (id) {
                // Update
                const index = AppState.recipes.findIndex(r => r.id === id);
                if (index > -1) {
                    AppState.recipes[index] = { id, name, baseServing, ingredients };
                    showToast('Recipe updated successfully!');
                }
            } else {
                // Add
                const newRecipe = {
                    id: generateId(),
                    name,
                    baseServing,
                    ingredients
                };
                AppState.recipes.push(newRecipe);
                showToast('Recipe added successfully!');
            }

            AppState.saveRecipes();
            resetForm();
            renderSavedRecipes();
        });
    }

    function loadRecipeForEdit(id) {
        const recipe = AppState.recipes.find(r => r.id === id);
        if (!recipe) return;
        
        document.getElementById('recipeId').value = recipe.id;
        document.getElementById('recipeName').value = recipe.name;
        document.getElementById('recipeBaseServing').value = recipe.baseServing;
        
        recipeFormTitle.textContent = 'Edit Recipe';
        cancelEditBtn.style.display = 'inline-flex';
        
        ingredientsList.innerHTML = '';
        recipe.ingredients.forEach(ing => {
            createIngredientRow(ing.name, ing.qty, ing.unit);
        });
        
        // Scroll to form smoothly
        document.getElementById('manage-recipes').scrollIntoView({ behavior: 'smooth' });
    }

    function deleteRecipe(id) {
        if (confirm('Are you sure you want to delete this recipe?')) {
            AppState.recipes = AppState.recipes.filter(r => r.id !== id);
            AppState.saveRecipes();
            renderSavedRecipes();
            populateRecipeSelects(); // Update dropdowns
            showToast('Recipe deleted.');
        }
    }

    // --- SEARCH / SCALE LOGIC ---
    const searchRecipeSelect = document.getElementById('searchRecipeSelect');
    const searchTargetServing = document.getElementById('searchTargetServing');
    const searchRecipeForm = document.getElementById('searchRecipeForm');
    const searchResults = document.getElementById('searchResults');
    
    // Result elements
    const resultDishName = document.getElementById('resultDishName');
    const resultTargetCount = document.getElementById('resultTargetCount');
    const resultBaseCount = document.getElementById('resultBaseCount');
    const resultMultiplier = document.getElementById('resultMultiplier');
    const resultIngredientsList = document.getElementById('resultIngredientsList');

    const menuRecipeSearch = document.getElementById('menuRecipeSearch');
    const menuRecipeDropdown = document.getElementById('menuRecipeDropdown');
    const menuRecipeIdField = document.getElementById('menuRecipeId');

    function populateRecipeSelects() {
        const options = '<option value="">-- Choose a recipe --</option>' + 
            AppState.recipes.map(r => `<option value="${r.id}">${r.name} (Base: ${r.baseServing})</option>`).join('');
            
        if (searchRecipeSelect) searchRecipeSelect.innerHTML = options;
        // Note: menuRecipeSearch autocomplete is populated differently (on input event)
    }

    // --- MENU RECIPE AUTOCOMPLETE ---
    let acHighlightIndex = -1;

    function getAcRecipes(query) {
        const q = query.toLowerCase().trim();
        if (!q) return AppState.recipes;
        return AppState.recipes.filter(r => r.name.toLowerCase().includes(q));
    }

    function renderAcDropdown(query) {
        const matches = getAcRecipes(query);
        acHighlightIndex = -1;

        if (matches.length === 0) {
            menuRecipeDropdown.innerHTML = `<li class="no-results">No recipes found</li>`;
        } else {
            menuRecipeDropdown.innerHTML = matches.map(r => `
                <li role="option" data-id="${r.id}" data-name="${r.name}">
                    ${r.name}
                    <div class="recipe-meta">Base serving: ${r.baseServing} people</div>
                </li>
            `).join('');

            // Attach item click handlers
            menuRecipeDropdown.querySelectorAll('li[data-id]').forEach(li => {
                li.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // Prevent blur from firing first
                    selectAcRecipe(li.dataset.id, li.dataset.name);
                });
            });
        }

        menuRecipeDropdown.classList.add('open');
    }

    function selectAcRecipe(id, name) {
        menuRecipeIdField.value = id;
        menuRecipeSearch.value = name;
        menuRecipeSearch.classList.add('has-selection');
        menuRecipeDropdown.classList.remove('open');
        acHighlightIndex = -1;
    }

    function clearAcSelection() {
        menuRecipeIdField.value = '';
        menuRecipeSearch.classList.remove('has-selection');
    }

    if (menuRecipeSearch) {
        menuRecipeSearch.addEventListener('input', () => {
            clearAcSelection();
            renderAcDropdown(menuRecipeSearch.value);
        });

        menuRecipeSearch.addEventListener('focus', () => {
            renderAcDropdown(menuRecipeSearch.value);
        });

        menuRecipeSearch.addEventListener('blur', () => {
            // Small delay allows mousedown on item to fire first
            setTimeout(() => menuRecipeDropdown.classList.remove('open'), 150);
        });

        menuRecipeSearch.addEventListener('keydown', (e) => {
            const items = menuRecipeDropdown.querySelectorAll('li[data-id]');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                acHighlightIndex = Math.min(acHighlightIndex + 1, items.length - 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                acHighlightIndex = Math.max(acHighlightIndex - 1, 0);
            } else if (e.key === 'Enter') {
                if (acHighlightIndex >= 0 && items[acHighlightIndex]) {
                    e.preventDefault();
                    const li = items[acHighlightIndex];
                    selectAcRecipe(li.dataset.id, li.dataset.name);
                }
                return;
            } else if (e.key === 'Escape') {
                menuRecipeDropdown.classList.remove('open');
                return;
            }

            items.forEach((li, i) => {
                li.classList.toggle('highlighted', i === acHighlightIndex);
                if (i === acHighlightIndex) li.scrollIntoView({ block: 'nearest' });
            });
        });
    }

    // Close dropdown when clicking anywhere else
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#menuRecipeAutocomplete')) {
            menuRecipeDropdown && menuRecipeDropdown.classList.remove('open');
        }
    });

    if (searchRecipeForm) {
        searchRecipeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = searchRecipeSelect.value;
            const targetSize = parseInt(searchTargetServing.value, 10);
            
            if (!id || isNaN(targetSize) || targetSize < 1) return;
            
            const recipe = AppState.recipes.find(r => r.id === id);
            if (!recipe) return;

            const multiplier = targetSize / recipe.baseServing;

            resultDishName.textContent = recipe.name;
            resultTargetCount.textContent = targetSize;
            resultBaseCount.textContent = recipe.baseServing;
            resultMultiplier.textContent = `${multiplier.toFixed(2)}x`;

            resultIngredientsList.innerHTML = recipe.ingredients.map(ing => {
                const scaledQty = +(ing.qty * multiplier).toFixed(2);
                return `
                    <tr>
                        <td>${ing.name}</td>
                        <td><strong>${scaledQty}</strong></td>
                        <td>${ing.unit}</td>
                    </tr>
                `;
            }).join('');

            searchResults.style.display = 'block';
        });
    }

    // --- MENU CALCULATOR LOGIC ---
    // Memory state for current un-generated menu
    AppState.currentMenu = [];

    const addMenuForm = document.getElementById('addMenuForm');
    const menuTargetServing = document.getElementById('menuTargetServing');
    const currentMenuList = document.getElementById('currentMenuList');
    const menuItemCount = document.getElementById('menuItemCount');
    const generateReportActions = document.getElementById('generateReportActions');
    const clearMenuBtn = document.getElementById('clearMenuBtn');
    const generateReportBtn = document.getElementById('generateReportBtn');

    function renderCurrentMenu() {
        if (!currentMenuList) return;
        
        menuItemCount.textContent = `${AppState.currentMenu.length} Items`;
        
        if (AppState.currentMenu.length === 0) {
            currentMenuList.innerHTML = `
                <div class="empty-state py-2">
                    <p>No dishes added to the menu yet.</p>
                </div>
            `;
            generateReportActions.style.display = 'none';
        } else {
            currentMenuList.innerHTML = AppState.currentMenu.map((item, index) => `
                <div class="menu-item-card">
                    <div class="menu-item-info">
                        <h4>${item.recipe.name}</h4>
                        <p>For ${item.targetServing} people (Base: ${item.recipe.baseServing})</p>
                    </div>
                    <button class="icon-btn danger remove-menu-item" data-index="${index}">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            `).join('');
            
            generateReportActions.style.display = 'flex';
            
            document.querySelectorAll('.remove-menu-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.currentTarget.dataset.index, 10);
                    AppState.currentMenu.splice(idx, 1);
                    renderCurrentMenu();
                });
            });
        }
    }

    if (addMenuForm) {
        addMenuForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = menuRecipeIdField ? menuRecipeIdField.value : '';
            const targetServing = parseInt(menuTargetServing.value, 10);
            
            if (!id) {
                showToast('Please select a recipe from the list.', 'error');
                return;
            }
            if (isNaN(targetServing) || targetServing < 1) {
                showToast('Please enter a valid number of people.', 'error');
                return;
            }
            
            const recipe = AppState.recipes.find(r => r.id === id);
            if (!recipe) return;
            
            // Check if already in menu, if so update serving count
            const existingIndex = AppState.currentMenu.findIndex(i => i.recipe.id === id);
            if(existingIndex > -1) {
                AppState.currentMenu[existingIndex].targetServing += targetServing;
                showToast(`Updated ${recipe.name} in menu.`);
            } else {
                AppState.currentMenu.push({
                    recipe: JSON.parse(JSON.stringify(recipe)), // deep copy
                    targetServing: targetServing
                });
                showToast(`Added ${recipe.name} to menu!`);
            }
            
            renderCurrentMenu();
            addMenuForm.reset();
            // Clear autocomplete state after reset
            if (menuRecipeIdField) menuRecipeIdField.value = '';
            if (menuRecipeSearch) {
                menuRecipeSearch.value = '';
                menuRecipeSearch.classList.remove('has-selection');
            }
        });
    }

    if (clearMenuBtn) {
        clearMenuBtn.addEventListener('click', () => {
            if(confirm('Clear the current menu list?')) {
                AppState.currentMenu = [];
                renderCurrentMenu();
                showToast('Menu cleared.', 'error');
            }
        });
    }

    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', () => {
            if (AppState.currentMenu.length === 0) return;
            
            // The generation logic will move us to the Combined Report view
            // and perform the ingredient aggregation.
            generateCombinedReport();
            navigateTo('combined-report');
        });
    }

    // Function placeholder for the next step
    const reportContainer = document.getElementById('reportContainer');
    const reportTemplate = document.getElementById('reportTemplate');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const shareReportBtn = document.getElementById('shareReportBtn');
    
    // Store latest report data for export
    AppState.latestReport = null;

    // ─── UNIT CONVERTER ───────────────────────────────────────────────────────
    const UnitConverter = (() => {
        const GROUPS = [
            { base: 'g',   units: { g: 1, kg: 1000 } },
            { base: 'ml',  units: { ml: 1, L: 1000 } },
            { base: 'tsp', units: { tsp: 1, tbsp: 3, cup: 48 } },
        ];
        function findGroup(unit) { return GROUPS.find(g => unit in g.units) || null; }
        function toBase(qty, fromUnit, group) { return qty * group.units[fromUnit]; }
        function fromBase(baseQty, group) {
            const sorted = Object.entries(group.units).sort((a, b) => b[1] - a[1]);
            for (const [unit, mult] of sorted) {
                const val = baseQty / mult;
                if (val >= 1) return { qty: +val.toFixed(3), unit };
            }
            return { qty: +baseQty.toFixed(3), unit: group.base };
        }
        function _direct(map, key, name, qty, unit) {
            if (map.has(key)) map.get(key).baseQty += qty;
            else map.set(key, { name, baseQty: qty, group: null, unit });
        }
        function accumulate(map, name, addQty, addUnit) {
            const key = name.toLowerCase().trim();
            const group = findGroup(addUnit);
            if (group) {
                const baseQty = toBase(addQty, addUnit, group);
                if (map.has(key)) {
                    const e = map.get(key);
                    if (e.group === group) e.baseQty += baseQty;
                    else _direct(map, `${key}|${addUnit}`, name, addQty, addUnit);
                } else map.set(key, { name, baseQty, group });
            } else {
                _direct(map, `${key}|${addUnit}`, name, addQty, addUnit);
            }
        }
        function resolve(map) {
            return [...map.values()].map(e =>
                e.group
                    ? Object.assign({ name: e.name }, fromBase(e.baseQty, e.group))
                    : { name: e.name, qty: +e.baseQty.toFixed(3), unit: e.unit }
            );
        }
        return { accumulate, resolve };
    })();
    // ─────────────────────────────────────────────────────────────────────────

    function generateCombinedReport() {
        if (AppState.currentMenu.length === 0) return;

        const combinedMap = new Map();

        // Scale each recipe and accumulate with unit conversion
        AppState.currentMenu.forEach(item => {
            const multiplier = item.targetServing / item.recipe.baseServing;
            item.recipe.ingredients.forEach(ing => {
                const scaledQty = +(ing.qty * multiplier).toFixed(4);
                UnitConverter.accumulate(combinedMap, ing.name, scaledQty, ing.unit);
            });
        });

        // Resolve to display units and sort alphabetically
        const sortedIngredients = UnitConverter.resolve(combinedMap)
            .sort((a, b) => a.name.localeCompare(b.name));

        AppState.latestReport = {
            menu: AppState.currentMenu.map(m => Object.assign({}, m)), // snapshot
            ingredients: sortedIngredients
        };

        // Render to DOM using template
        reportContainer.innerHTML = '';
        const clone = reportTemplate.content.cloneNode(true);
        
        const summaryList = clone.getElementById('reportMenuSummary');
        summaryList.innerHTML = AppState.latestReport.menu.map(m => `
            <li>${m.recipe.name} <span>(${m.targetServing} people)</span></li>
        `).join('');
        
        const ingredientsList = clone.getElementById('reportIngredientsList');
        ingredientsList.innerHTML = AppState.latestReport.ingredients.map(ing => `
            <tr>
                <td>${ing.name}</td>
                <td><strong>${ing.qty}</strong></td>
                <td>${ing.unit}</td>
            </tr>
        `).join('');

        reportContainer.appendChild(clone);
        
        // Show Buttons
        exportPdfBtn.style.display = 'inline-flex';
        if (navigator.share) {
            shareReportBtn.style.display = 'inline-flex';
        }
    }

    // Export to PDF
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            if (!AppState.latestReport) return;
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(20);
            doc.text("Catering Menu Report", 14, 22);
            
            doc.setFontSize(14);
            doc.text("Menu Summary:", 14, 35);
            
            let yPos = 43;
            doc.setFontSize(11);
            AppState.latestReport.menu.forEach(item => {
                doc.text(`• ${item.recipe.name} (${item.targetServing} people)`, 14, yPos);
                yPos += 7;
            });
            
            yPos += 5;
            doc.setFontSize(14);
            doc.text("Combined Ingredients List:", 14, yPos);
            
            // Generate Table
            const tableData = AppState.latestReport.ingredients.map(ing => [
                ing.name,
                ing.qty.toFixed(2),
                ing.unit
            ]);
            
            doc.autoTable({
                startY: yPos + 5,
                head: [['Ingredient', 'Total Quantity', 'Unit']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [22, 163, 74] }
            });
            
            const dateStr = new Date().toISOString().split('T')[0];
            doc.save(`Catering_Report_${dateStr}.pdf`);
            showToast('PDF Exported Successfully!');
        });
    }

    // Share API
    if (shareReportBtn) {
        shareReportBtn.addEventListener('click', async () => {
            if (!AppState.latestReport || !navigator.share) return;
            
            // Build text payload
            let text = "Catering Menu Report\n\nMenu:\n";
            AppState.latestReport.menu.forEach(m => {
                text += `- ${m.recipe.name} (${m.targetServing} people)\n`;
            });
            
            text += "\nIngredients:\n";
            AppState.latestReport.ingredients.forEach(ing => {
                text += `- ${ing.name}: ${ing.qty.toFixed(2)} ${ing.unit}\n`;
            });

            try {
                await navigator.share({
                    title: 'Catering Menu Report',
                    text: text,
                });
                showToast('Shared successfully!');
            } catch (err) {
                console.log('Error sharing', err);
            }
        });
    }

    // Initial hook into save logic to populate select dropdowns
    const originalSave = AppState.saveRecipes;
    AppState.saveRecipes = function() {
        originalSave.call(AppState);
        populateRecipeSelects();
    };


    // Final Init tasks
    if (ingredientsList && ingredientsList.children.length === 0) {
        createIngredientRow(); // Add initial blank row
    }
    renderSavedRecipes();
    populateRecipeSelects();
    renderCurrentMenu();
});
