// État global de l'application
const state = {
  profile: null,
  categories: [],
  selectedDate: new Date().toISOString().split('T')[0],
  entries: {},
  currentTab: 'daily',
  statsPeriod: 'weekly'
};

// ============ API CALLS ============

async function api(endpoint, options = {}) {
  const response = await fetch(`/api${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return response.json();
}

async function loadProfile() {
  state.profile = await api('/profile');
  updateProfileUI();
}

async function loadCategories() {
  state.categories = await api('/categories');
  renderCategories();
}

async function loadEntries(date) {
  const data = await api(`/entries/${date}`);
  state.entries = {};
  data.entries.forEach(e => {
    state.entries[e.missionId] = e.count;
  });
  state.dayXp = data.totalXp;
  state.isLocked = data.locked;
  updateDayUI();
  renderCategories();
}

async function saveMission(missionId, count) {
  const result = await api('/entries', {
    method: 'POST',
    body: JSON.stringify({
      date: state.selectedDate,
      missionId,
      count
    })
  });
  
  if (result.success) {
    state.profile = result.profile;
    updateProfileUI();
    loadEntries(state.selectedDate);
  }
  
  return result;
}

async function removeMission(missionId) {
  const result = await api(`/entries/${state.selectedDate}/${missionId}`, {
    method: 'DELETE'
  });
  
  if (result.success) {
    state.profile = result.profile;
    updateProfileUI();
    loadEntries(state.selectedDate);
  }
  
  return result;
}

async function loadStats() {
  const endpoint = state.statsPeriod === 'weekly' ? '/stats/weekly' : '/stats/monthly';
  const stats = await api(endpoint);
  renderStats(stats);
}

async function loadHistory() {
  const history = await api('/stats/history?days=30');
  renderHistory(history);
}

async function loadRewards() {
  const rewards = await api('/rewards');
  renderRewards(rewards);
}

async function claimReward(rewardType) {
  const result = await api('/rewards/claim', {
    method: 'POST',
    body: JSON.stringify({ rewardType })
  });
  
  if (result.success) {
    loadProfile();
    loadRewards();
  }
  
  return result;
}

// ============ EDITOR API ============

async function addMission(categoryId, name, xp, isBonus) {
  const result = await api('/missions', {
    method: 'POST',
    body: JSON.stringify({ categoryId, name, xp, isBonus })
  });
  
  if (result.success) {
    // Recharger les catégories
    await loadCategories();
    renderEditor();
  }
  
  return result;
}

async function updateMission(missionId, data) {
  const result = await api(`/missions/${missionId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  
  if (result.success) {
    await loadCategories();
    renderEditor();
    // Si on est sur l'onglet saisie, recharger aussi
    if (state.currentTab === 'daily') {
      loadEntries(state.selectedDate);
    }
  }
  
  return result;
}

async function deleteMission(missionId) {
  if (!confirm('Supprimer cette mission ? Les entrées associées seront aussi supprimées.')) {
    return;
  }
  
  const result = await api(`/missions/${missionId}`, {
    method: 'DELETE'
  });
  
  if (result.success) {
    await loadCategories();
    renderEditor();
    loadProfile();
  }
  
  return result;
}

// ============ UI UPDATES ============

function updateProfileUI() {
  const p = state.profile;
  if (!p) return;
  
  document.getElementById('level').textContent = p.level;
  document.getElementById('current-xp').textContent = p.currentTierXp;
  document.getElementById('next-xp').textContent = p.xpForNextLevel;
  document.getElementById('xp-bar').style.width = `${p.progressPercent}%`;
  document.getElementById('total-xp').textContent = formatNumber(p.totalXp);
  document.getElementById('days-remaining').textContent = p.daysRemaining;
  document.getElementById('xp-per-day').textContent = p.xpPerDayRequired;
  document.getElementById('rewards-count').textContent = p.rewardsAvailable;
}

function updateDayUI() {
  document.getElementById('day-xp').textContent = state.dayXp || 0;
  document.getElementById('date-lock-indicator').textContent = state.isLocked ? '🔒' : '';
}

function renderCategories() {
  const container = document.getElementById('categories-container');
  container.innerHTML = '';
  
  state.categories.forEach(category => {
    const categoryXp = category.missions.reduce((sum, m) => {
      const count = state.entries[m.id] || 0;
      return sum + (m.xp * count);
    }, 0);
    
    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <div class="category-header" style="background: ${category.color}">
        <span>${category.name}</span>
        <span class="category-xp">+${categoryXp} XP</span>
      </div>
      <div class="missions-list">
        ${category.missions.map(m => renderMission(m, category.color)).join('')}
      </div>
    `;
    container.appendChild(card);
  });
  
  // Ajouter les event listeners
  document.querySelectorAll('.mission-item').forEach(item => {
    const missionId = item.dataset.missionId;
    
    item.querySelector('.mission-checkbox')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMission(missionId);
    });
    
    item.querySelector('.count-minus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      decrementMission(missionId);
    });
    
    item.querySelector('.count-plus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      incrementMission(missionId);
    });
  });
}

function renderMission(mission, color) {
  const count = state.entries[mission.id] || 0;
  const isCompleted = count > 0;
  const isLocked = state.isLocked;
  
  return `
    <div class="mission-item ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''} ${mission.isBonus ? 'bonus' : ''}" 
         data-mission-id="${mission.id}">
      <div class="mission-checkbox"></div>
      <div class="mission-info">
        <div class="mission-name">${mission.name}</div>
        <div class="mission-xp">+${mission.xp} XP</div>
      </div>
      ${isCompleted ? `
        <div class="mission-count">
          <button class="count-btn count-minus" ${isLocked ? 'disabled' : ''}>-</button>
          <span class="count-value">${count}</span>
          <button class="count-btn count-plus" ${isLocked ? 'disabled' : ''}>+</button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderStats(stats) {
  document.getElementById('stats-total-xp').textContent = formatNumber(stats.totalXp);
  document.getElementById('stats-average').textContent = stats.dailyAverage;
  
  const maxXp = Math.max(...stats.byCategory.map(c => c.totalXp), 1);
  
  const container = document.getElementById('category-stats');
  container.innerHTML = stats.byCategory.map(cat => `
    <div class="category-stat-item">
      <div class="category-color" style="background: ${cat.color}"></div>
      <div class="category-stat-info">
        <div class="category-stat-name">${cat.categoryName}</div>
        <div class="category-stat-bar">
          <div class="category-stat-bar-fill" 
               style="width: ${(cat.totalXp / maxXp) * 100}%; background: ${cat.color}"></div>
        </div>
      </div>
      <div class="category-stat-value">${cat.totalXp} XP</div>
    </div>
  `).join('');
}

function renderHistory(history) {
  const container = document.getElementById('history-list');
  
  // Créer les 30 derniers jours
  const days = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const entry = history.find(h => h.date === dateStr);
    days.push({
      date: dateStr,
      totalXp: entry ? entry.totalXp : 0
    });
  }
  
  container.innerHTML = days.map(day => `
    <div class="history-item" data-date="${day.date}">
      <span class="history-date">${formatDate(day.date)}</span>
      <span class="history-xp ${day.totalXp === 0 ? 'zero' : ''}">
        ${day.totalXp === 0 ? '❌ 0 XP' : `+${day.totalXp} XP`}
      </span>
    </div>
  `).join('');
  
  // Click pour aller à cette date
  container.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      state.selectedDate = item.dataset.date;
      document.getElementById('selected-date').value = state.selectedDate;
      loadEntries(state.selectedDate);
      switchTab('daily');
    });
  });
}

function renderEditor() {
  // Remplir le select des catégories
  const categorySelect = document.getElementById('new-mission-category');
  categorySelect.innerHTML = state.categories.map(cat => 
    `<option value="${cat.id}">${cat.name}</option>`
  ).join('');
  
  // Afficher les catégories avec leurs missions éditables
  const container = document.getElementById('editor-categories');
  container.innerHTML = state.categories.map(category => `
    <div class="editor-category">
      <div class="editor-category-header" style="background: ${category.color}">
        <span>${category.name}</span>
        <span class="mission-count">${category.missions.length} missions</span>
      </div>
      <div class="editor-missions-list">
        ${category.missions.map(m => `
          <div class="editor-mission-item ${m.isBonus ? 'bonus' : ''}" data-mission-id="${m.id}">
            <div class="editor-mission-info">
              <input type="text" class="name-input" value="${m.name}">
              <div class="editor-mission-id">${m.id}</div>
            </div>
            <div class="editor-mission-xp">
              <input type="number" class="xp-input" value="${m.xp}" min="1" max="500">
              <span>XP</span>
            </div>
            <div class="editor-mission-actions">
              <button class="btn-toggle-bonus ${m.isBonus ? 'active' : ''}" title="Bonus">⭐</button>
              <button class="btn-save-xp" title="Sauvegarder">💾</button>
              <button class="btn-delete-mission" title="Supprimer">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
  
  // Event listeners pour les actions
  container.querySelectorAll('.editor-mission-item').forEach(item => {
    const missionId = item.dataset.missionId;
    
    item.querySelector('.btn-save-xp').addEventListener('click', () => {
      const newName = item.querySelector('.name-input').value.trim();
      const newXp = parseInt(item.querySelector('.xp-input').value);
      if (newXp > 0 && newName) {
        updateMission(missionId, { name: newName, xp: newXp });
      } else {
        alert('Le nom et l\'XP sont requis');
      }
    });
    
    item.querySelector('.btn-toggle-bonus').addEventListener('click', (e) => {
      const btn = e.target;
      const isCurrentlyBonus = btn.classList.contains('active');
      updateMission(missionId, { isBonus: !isCurrentlyBonus });
    });
    
    item.querySelector('.btn-delete-mission').addEventListener('click', () => {
      deleteMission(missionId);
    });
  });
}

function renderRewards(rewards) {
  document.getElementById('modal-rewards-count').textContent = rewards.available;
  
  const listContainer = document.getElementById('rewards-list');
  listContainer.innerHTML = rewards.rewardTypes.map(reward => `
    <div class="reward-item ${rewards.available <= 0 ? 'disabled' : ''}" 
         data-reward-type="${reward.id}">
      ${reward.name}
    </div>
  `).join('');
  
  // Event listeners pour réclamer
  listContainer.querySelectorAll('.reward-item:not(.disabled)').forEach(item => {
    item.addEventListener('click', () => {
      claimReward(item.dataset.rewardType);
    });
  });
  
  // Historique
  const historyContainer = document.getElementById('rewards-history-list');
  historyContainer.innerHTML = rewards.claimed.map(r => {
    const rewardType = rewards.rewardTypes.find(rt => rt.id === r.reward_type);
    return `
      <div class="reward-history-item">
        <span>Niveau ${r.level}</span>
        <span>${rewardType ? rewardType.name : r.reward_type}</span>
      </div>
    `;
  }).join('') || '<p style="color: var(--text-secondary)">Aucune récompense utilisée</p>';
}

// ============ ACTIONS ============

async function toggleMission(missionId) {
  if (state.isLocked) return;
  
  const currentCount = state.entries[missionId] || 0;
  if (currentCount === 0) {
    await saveMission(missionId, 1);
  } else {
    await removeMission(missionId);
  }
}

async function incrementMission(missionId) {
  if (state.isLocked) return;
  
  const currentCount = state.entries[missionId] || 0;
  await saveMission(missionId, currentCount + 1);
}

async function decrementMission(missionId) {
  if (state.isLocked) return;
  
  const currentCount = state.entries[missionId] || 0;
  if (currentCount > 1) {
    await saveMission(missionId, currentCount - 1);
  } else {
    await removeMission(missionId);
  }
}

function switchTab(tabId) {
  state.currentTab = tabId;
  
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabId}`);
  });
  
  // Charger les données du tab
  if (tabId === 'stats') {
    loadStats();
  } else if (tabId === 'history') {
    loadHistory();
  } else if (tabId === 'editor') {
    renderEditor();
  }
}

function changeDate(delta) {
  const date = new Date(state.selectedDate);
  date.setDate(date.getDate() + delta);
  state.selectedDate = date.toISOString().split('T')[0];
  document.getElementById('selected-date').value = state.selectedDate;
  loadEntries(state.selectedDate);
}

// ============ HELPERS ============

function formatNumber(num) {
  return num.toLocaleString('fr-FR');
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  return date.toLocaleDateString('fr-FR', options);
}

// ============ EVENT LISTENERS ============

document.addEventListener('DOMContentLoaded', () => {
  // Initialiser la date
  document.getElementById('selected-date').value = state.selectedDate;
  
  // Charger les données initiales
  loadProfile();
  loadCategories();
  loadEntries(state.selectedDate);
  
  // Navigation tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  // Date navigation
  document.getElementById('prev-day').addEventListener('click', () => changeDate(-1));
  document.getElementById('next-day').addEventListener('click', () => changeDate(1));
  document.getElementById('selected-date').addEventListener('change', (e) => {
    state.selectedDate = e.target.value;
    loadEntries(state.selectedDate);
  });
  
  // Stats period selector
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.statsPeriod = btn.dataset.period;
      loadStats();
    });
  });
  
  // Rewards modal
  document.getElementById('rewards-btn').addEventListener('click', () => {
    loadRewards();
    document.getElementById('rewards-modal').classList.add('active');
  });
  
  document.getElementById('close-rewards').addEventListener('click', () => {
    document.getElementById('rewards-modal').classList.remove('active');
  });
  
  document.getElementById('rewards-modal').addEventListener('click', (e) => {
    if (e.target.id === 'rewards-modal') {
      document.getElementById('rewards-modal').classList.remove('active');
    }
  });
  
  // Bouton ajouter mission
  document.getElementById('btn-add-mission').addEventListener('click', () => {
    const categoryId = document.getElementById('new-mission-category').value;
    const name = document.getElementById('new-mission-name').value.trim();
    const xp = parseInt(document.getElementById('new-mission-xp').value);
    const isBonus = document.getElementById('new-mission-bonus').checked;
    
    if (!name) {
      alert('Le nom de la mission est requis');
      return;
    }
    
    if (!xp || xp < 1) {
      alert('L\'XP doit être supérieur à 0');
      return;
    }
    
    addMission(categoryId, name, xp, isBonus).then(result => {
      if (result.success) {
        // Réinitialiser le formulaire
        document.getElementById('new-mission-name').value = '';
        document.getElementById('new-mission-xp').value = '20';
        document.getElementById('new-mission-bonus').checked = false;
      } else {
        alert(result.error || 'Erreur lors de l\'ajout');
      }
    });
  });
});
