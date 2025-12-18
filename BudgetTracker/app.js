
const selectors = {
  budgetInput: document.getElementById('budgetInput'),
  setBudgetBtn: document.getElementById('setBudgetBtn'),
  budgetAmount: document.getElementById('budgetAmount'),
  spentAmount: document.getElementById('spentAmount'),
  remainingAmount: document.getElementById('remainingAmount'),
  itemName: document.getElementById('itemName'),
  itemQty: document.getElementById('itemQty'),
  itemUnitPrice: document.getElementById('itemUnitPrice'),
  addItemBtn: document.getElementById('addItemBtn'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  addToBudgetBtn: document.getElementById('addToBudgetBtn'),
  clearBudgetBtn: document.getElementById('clearBudgetBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  itemsList: document.getElementById('items'),
  clearBtn: document.getElementById('clearBtn'),
  currencySelect: document.getElementById('currencySelect')
};

const STORAGE_KEY = 'budgetTrackerData_v1';
let state = { budget: 0, items: [], nextId: 1, currency: 'USD', editingId: null, theme: 'light' };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) { console.warn('load failed', e); }
}


function ensureDefaults(){
  // if no theme saved, prefer system dark mode
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  state = Object.assign({ budget:0, items:[], nextId:1, currency:'USD', theme: prefersDark ? 'dark' : 'light' }, state || {});

  state.items = (state.items || []).map(it => {
    if (it && (it.qty === undefined || it.unitPrice === undefined)){
      const amount = Number(it.amount || 0);
      return Object.assign({ qty: 1, unitPrice: amount, amount }, it);
    }
    return it;
  });
}

function applyTheme(theme){
  const cls = 'dark-theme';
  if (theme === 'dark') {
    console.debug('Applying dark theme');
    document.documentElement.classList.add(cls);
  }
  else {
    console.debug('Applying light theme');
    document.documentElement.classList.remove(cls);
  }
}

function updateThemeUI(){
  if (!selectors.themeToggleBtn) return;
  selectors.themeToggleBtn.textContent = state.theme === 'dark' ? 'Switch to Light' : 'Switch to Dark';
}

function toggleTheme(){
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  console.debug('Toggling theme to', state.theme);
  save();
  applyTheme(state.theme);
  updateThemeUI();
}

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function formatCurrency(n){
  const currency = state && state.currency ? state.currency : 'USD';
  return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:2}).format(n);
}

function calcSpent(){
  return state.items.reduce((s,i)=>s + Number(i.amount || (Number(i.qty||0) * Number(i.unitPrice||0))),0);
}

function render(){

  if (selectors.currencySelect) selectors.currencySelect.value = state.currency || 'USD';
  selectors.budgetAmount.textContent = formatCurrency(Number(state.budget)||0);
  const spent = calcSpent();
  selectors.spentAmount.textContent = formatCurrency(spent);
  const remaining = Number(state.budget) - spent;
  selectors.remainingAmount.textContent = formatCurrency(remaining);
  selectors.remainingAmount.style.color = remaining < 0 ? 'var(--danger)' : '';


  selectors.itemsList.innerHTML = '';
  if(state.items.length === 0){
    const li = document.createElement('li');
    li.textContent = 'No items yet.';
    li.style.color = 'var(--muted)';
    selectors.itemsList.appendChild(li);
    return;
  }

  state.items.forEach(item => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.className = 'item-left';
    const name = document.createElement('div');
    name.className = 'item-name';
    name.textContent = item.name;
    const amt = document.createElement('div');
    amt.className = 'item-amount';
    const qty = Number(item.qty || 1);
    const unit = Number(item.unitPrice || item.amount || 0);
    const total = Number(item.amount != null ? item.amount : (qty * unit));
    amt.textContent = formatCurrency(total);
    const detail = document.createElement('div');
    detail.className = 'muted';
    detail.style.fontSize = '0.85rem';
    detail.style.marginLeft = '8px';
    detail.textContent = qty > 1 ? `${qty} × ${formatCurrency(unit)} = ${formatCurrency(total)}` : `${formatCurrency(unit)}`;
    left.appendChild(name);
    left.appendChild(amt);
    left.appendChild(detail);

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'edit';
    editBtn.onclick = () => { startEdit(item.id); };
    const del = document.createElement('button');
    del.textContent = 'Remove';
    del.className = 'remove';
    del.onclick = () => { removeItem(item.id); };
    actions.appendChild(editBtn);
    actions.appendChild(del);

    li.appendChild(left);
    li.appendChild(actions);
    selectors.itemsList.appendChild(li);
  });
}

function setBudget(){
  const v = Number(selectors.budgetInput.value);
  if (isNaN(v) || v < 0){ alert('Enter a valid budget'); return; }
  state.budget = v;
  save();
  selectors.budgetInput.value = '';
  render();
}

function addToBudget(){
  const v = Number(selectors.budgetInput.value);
  if (isNaN(v)){ alert('Enter a valid amount to add'); return; }
  state.budget = Number(state.budget || 0) + v;
  save();
  selectors.budgetInput.value = '';
  render();
}

function clearBudget(){
  if (!confirm('Clear budget to 0? This will not remove items.')) return;
  state.budget = 0;
  save();
  render();
}

function addItem(){
  const name = selectors.itemName.value.trim();
  const qty = Number(selectors.itemQty.value || 1);
  const unitPrice = Number(selectors.itemUnitPrice.value || 0);
  if (!name){ alert('Enter item name'); return; }
  if (isNaN(qty) || qty <= 0){ alert('Enter a valid quantity'); return; }
  if (isNaN(unitPrice) || unitPrice < 0){ alert('Enter a valid unit price'); return; }
  const amount = qty * unitPrice;
  if (state.editingId) {
    state.items = state.items.map(it => it.id === state.editingId ? Object.assign({}, it, { name, qty, unitPrice, amount }) : it);
    state.editingId = null;
    if (selectors.cancelEditBtn) selectors.cancelEditBtn.classList.add('hidden');
    selectors.addItemBtn.textContent = 'Add';
  } else {
    state.items.push({ id: state.nextId++, name, qty, unitPrice, amount });
  }
  save();
  selectors.itemName.value = '';
  selectors.itemQty.value = 1;
  selectors.itemUnitPrice.value = '';
  render();
}

function startEdit(id){
  const it = state.items.find(i=>i.id===id);
  if (!it) return;
  state.editingId = id;
  selectors.itemName.value = it.name || '';
  selectors.itemQty.value = it.qty || 1;
  selectors.itemUnitPrice.value = it.unitPrice != null ? it.unitPrice : (it.amount || '');
  selectors.addItemBtn.textContent = 'Save';
  if (selectors.cancelEditBtn) selectors.cancelEditBtn.classList.remove('hidden');
}

function cancelEdit(){
  state.editingId = null;
  selectors.itemName.value = '';
  selectors.itemQty.value = 1;
  selectors.itemUnitPrice.value = '';
  selectors.addItemBtn.textContent = 'Add';
  if (selectors.cancelEditBtn) selectors.cancelEditBtn.classList.add('hidden');
}

function removeItem(id){
  state.items = state.items.filter(i=>i.id !== id);
  save();
  render();
}

function clearAll(){
  if(!confirm('Clear all items and reset budget?')) return;
  state = { budget:0, items:[], nextId:1, currency: state.currency || 'USD' };
  save();
  render();
}

selectors.setBudgetBtn.addEventListener('click', setBudget);
selectors.addItemBtn.addEventListener('click', addItem);

if (selectors.cancelEditBtn) selectors.cancelEditBtn.addEventListener('click', cancelEdit);
selectors.clearBtn.addEventListener('click', clearAll);

if (selectors.currencySelect) {
  selectors.currencySelect.addEventListener('change', (e)=>{
    state.currency = e.target.value;
    save();
    render();
  });
}

if (selectors.addToBudgetBtn) selectors.addToBudgetBtn.addEventListener('click', addToBudget);
if (selectors.clearBudgetBtn) selectors.clearBudgetBtn.addEventListener('click', clearBudget);
if (selectors.themeToggleBtn) selectors.themeToggleBtn.addEventListener('click', toggleTheme);

load();
ensureDefaults();
applyTheme(state.theme);
updateThemeUI();
render();






//Owned by Khen E.