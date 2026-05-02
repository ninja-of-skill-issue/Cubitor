// ============================================================
// community.js — Social & Community Feature Logic
// Depends on: api.js, dataget.js (User class)
// ============================================================

// --- State ---
window.communityUsers = [];
window.currentCommType = 'all';
window.currentCommRole = 'all';

// ============================================================
// Dropdown UI
// ============================================================

window.toggleCustomDropdown = function (id) {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;

    document.querySelectorAll('.custom-dropdown').forEach(d => {
        if (d.id !== id) d.classList.remove('open');
    });

    dropdown.classList.toggle('open');

    const closeHandler = (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
};

window.selectCustomOption = function (dropdownId, value, label) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const triggerLabel = dropdown.querySelector('.trigger-label');
    if (triggerLabel) triggerLabel.textContent = label;

    const hiddenInput = document.getElementById('community-sort');
    if (hiddenInput) {
        hiddenInput.value = value;
        handleCommunityFilter();
    }

    dropdown.querySelectorAll('.dropdown-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.getAttribute('data-value') === value) opt.classList.add('active');
    });

    dropdown.classList.remove('open');
};

// ============================================================
// Tab / Filter Controls
// ============================================================

window.setCommunityView = function (view, btn) {
    const container = document.getElementById('community-sub-nav');
    if (container) {
        container.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    }

    const controls = document.getElementById('community-controls');
    if (view === 'notifications') {
        window.currentCommType = 'notifications';
        if (controls) controls.style.display = 'none';
    } else {
        const activeTypeBtn = document.querySelector('#community-type-filters .comm-filter-btn.active');
        window.currentCommType = activeTypeBtn
            ? (activeTypeBtn.textContent.toLowerCase().includes('friends') ? 'friends' : 'all')
            : 'all';
        if (controls) controls.style.display = 'flex';
    }

    updateSubNavHighlight('community');
    loadCommunityData();
};

window.setCommunityType = function (type, btn) {
    window.currentCommType = type;
    const container = document.getElementById('community-type-filters');
    if (container) {
        container.querySelectorAll('.comm-filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    }
    loadCommunityData();
};

window.setCommunityRole = function (role, btn) {
    window.currentCommRole = role;
    const container = document.getElementById('community-role-filters');
    if (container) {
        container.querySelectorAll('.comm-filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    }
    handleCommunityFilter();
};

// ============================================================
// Data Loading
// ============================================================

window.loadCommunityData = async function () {
    const grid = document.getElementById('friends-grid');
    if (!grid) return;

    document.getElementById('community-main-view').style.display = 'block';
    document.getElementById('community-notification-detail').style.display = 'none';
    grid.innerHTML = `<div style="color: var(--text-secondary); grid-column: 1/-1; text-align: center; padding: 40px;">Loading community...</div>`;

    const token = getAuthToken();
    if (!token) return;

    try {
        const endpointMap = {
            friends: GET_FRIENDS_URL,
            notifications: PENDING_REQUESTS_URL,
            community: ALL_USERS_URL
        };
        const endpoint = endpointMap[window.currentCommType] || ALL_USERS_URL;

        const [data] = await Promise.all([
            postDataWithToken(endpoint, {}, token),
            // Refresh friends list in parallel
            postDataWithToken(GET_FRIENDS_URL, {}, token).then(friendsData => {
                if (!window.currentUser) return;
                const raw = Array.isArray(friendsData) ? friendsData : (friendsData?.friends ?? []);
                window.currentUser.friends = raw
                    .map(f => (f && typeof f === 'object') ? f.id : f)
                    .filter(Boolean);
            }).catch(() => {})
        ]);

        if (window.currentCommType === 'notifications') {
            window.pendingRequests = Array.isArray(data) ? data : [];
            renderNotifications(window.pendingRequests);
        } else {
            window.communityUsers = Array.isArray(data) ? data : [];
            try {
                const pend = await postDataWithToken(PENDING_REQUESTS_URL, {}, token);
                window.pendingRequests = Array.isArray(pend) ? pend : [];
            } catch {
                window.pendingRequests = [];
            }
            handleCommunityFilter();
        }
    } catch (err) {
        console.error('[Community] Load failed:', err);
        grid.innerHTML = `<div style="color: #ef4444; grid-column: 1/-1; text-align: center; padding: 40px;">Error loading community.</div>`;
    }
};

// ============================================================
// Notifications
// ============================================================

/** Returns the user in a friend request who is NOT the current user. */
function getNotificationSender(req) {
    const myId = window.currentUser?.id;
    const isUserMe = req.user && req.user.id === myId;
    return isUserMe ? (req.destination || req.user) : req.user;
}

window.renderNotifications = function (requests) {
    const grid = document.getElementById('friends-grid');
    if (!grid) return;

    if (requests.length === 0) {
        grid.innerHTML = `<div style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px;">No new notifications.</div>`;
        return;
    }

    grid.innerHTML = '';
    requests.forEach((req, idx) => {
        const sender = getNotificationSender(req);
        const card = document.createElement('div');
        card.className = 'friend-card notification-card';
        card.style.cursor = 'pointer';
        card.onclick = () => openNotificationDetail(idx);
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div class="fp-avatar-preview" style="width: 50px; height: 50px;">
                    <img src="${sender.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + sender.username}" style="width: 100%; height: 100%; border-radius: 50%;">
                </div>
                <div style="flex: 1;">
                    <div style="color: var(--accent-primary); font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Friend Request</div>
                    <div style="color: #fff; font-weight: 600;">${sender.username} wants to connect</div>
                </div>
                <div style="color: var(--accent-primary);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
};

window.openNotificationDetail = function (idx) {
    const req = window.pendingRequests[idx];
    if (!req) return;

    const sender = getNotificationSender(req);
    document.getElementById('community-main-view').style.display = 'none';
    document.getElementById('community-notification-detail').style.display = 'block';

    document.getElementById('notif-detail-content').innerHTML = `
        <div style="max-width: 500px; margin: 0 auto;">
            <div class="fp-avatar-preview" style="width: 100px; height: 100px; margin: 0 auto 20px;">
                <img src="${sender.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + sender.username}" style="width: 100%; height: 100%; border-radius: 50%; border: 3px solid var(--accent-primary);">
            </div>
            <div style="color: var(--accent-primary); font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Incoming Invitation</div>
            <h2 style="color: #fff; margin-bottom: 10px; font-weight: 800; font-size: 28px;">Friend Request</h2>
            <p style="color: var(--text-secondary); font-size: 16px; margin-bottom: 30px; line-height: 1.6;">
                <span style="color: #fff; font-weight: 700;">${sender.username}</span> is inviting you to connect on Cubitor. Would you like to accept?
            </p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button class="friend-action-btn" style="padding: 12px 30px; font-size: 15px;"
                        onclick="toggleFriendship(window.pendingRequests[${idx}].user, false, this)">
                    Accept
                </button>
                <button class="friend-action-btn is-friend" style="padding: 12px 30px; font-size: 15px;"
                        onclick="toggleFriendship(window.pendingRequests[${idx}].user, true, this)">
                    Cancel
                </button>
            </div>
            <button class="comm-filter-btn" style="margin-top: 40px; opacity: 0.6;" onclick="loadCommunityData()">
                Back to Notifications
            </button>
        </div>
    `;
};

// ============================================================
// Friendship Actions
// ============================================================

window.toggleFriendship = async function (userData, isFriend, btn) {
    const endpoint = isFriend ? REMOVE_FRIEND_URL : ADD_FRIEND_URL;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '...';
    btn.style.opacity = '0.7';

    try {
        const token = getAuthToken();
        if (!token) throw new Error('No auth token');

        await postDataWithToken(endpoint, { id: Number(userData.id), email: userData.email }, token);

        // Optimistically update local state
        if (window.currentUser) {
            if (!window.currentUser.friends) window.currentUser.friends = [];
            const uid = String(userData.id);
            if (isFriend) {
                window.currentUser.friends = window.currentUser.friends.filter(f => String(f) !== uid);
            } else if (!window.currentUser.friends.includes(userData.id)) {
                window.currentUser.friends.push(userData.id);
            }
        }

        loadCommunityData();
    } catch (err) {
        console.error('[Social] Action failed:', err);
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        btn.style.opacity = '1';
    }
};

// ============================================================
// Community Grid & Filtering
// ============================================================

window.handleCommunityFilter = function () {
    const searchQuery = document.getElementById('community-search').value.toLowerCase();
    const sortType = document.getElementById('community-sort').value;
    const roleFilter = window.currentCommRole;

    let filtered = window.communityUsers.filter(u => {
        const matchesSearch = u.username.toLowerCase().includes(searchQuery);
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    filtered.sort((a, b) => {
        if (sortType === 'username-asc') return a.username.localeCompare(b.username);
        if (sortType === 'username-desc') return b.username.localeCompare(a.username);
        if (sortType === 'elo-desc') return (parseInt(b.elo) || 0) - (parseInt(a.elo) || 0);
        if (sortType === 'elo-asc') return (parseInt(a.elo) || 0) - (parseInt(b.elo) || 0);
        if (sortType === 'newest') return (b.id || 0) - (a.id || 0);
        if (sortType === 'oldest') return (a.id || 0) - (b.id || 0);
        if (sortType === 'online') {
            const dateA = a.last_online ? new Date(a.last_online) : new Date(0);
            const dateB = b.last_online ? new Date(b.last_online) : new Date(0);
            return dateB - dateA;
        }
        return 0;
    });

    renderCommunityGrid(filtered);
};

function renderCommunityGrid(users) {
    const grid = document.getElementById('friends-grid');
    if (!grid) return;

    if (users.length === 0) {
        grid.innerHTML = `<div style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px;">No users found matching your search.</div>`;
        return;
    }

    grid.innerHTML = '';
    users.forEach(u => {
        const originalIndex = window.communityUsers.findIndex(orig => orig.id === u.id);
        grid.appendChild(createFriendCard(u, originalIndex));
    });
}

function createFriendCard(userData, origIndex) {
    const user = new User(userData);
    const isFriend = window.currentUser?.friends?.some(f => {
        const fId = (typeof f === 'object' && f) ? f.id : f;
        return fId != null && String(fId) === String(user.id);
    }) ?? false;
    const isSelf = window.currentUser && String(window.currentUser.id) === String(user.id);
    const avatar = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;

    const div = document.createElement('div');
    div.className = 'friend-card';
    div.innerHTML = `
        <div class="fc-header" style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <div class="fp-avatar-preview">
                <img src="${avatar}" alt="Avatar" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=fallback';">
            </div>
            <div class="fc-info">
                <div class="fc-field">
                    <label class="fp-label">Username</label>
                    <div class="fp-value">${user.username}</div>
                </div>
                <div class="fc-field">
                    <label class="fp-label">Pronouns</label>
                    <div class="pronouns-tag" data-pronouns="${user.pronouns}">${user.pronouns}</div>
                </div>
            </div>
        </div>
        <div>
            <label class="fp-label">Bio</label>
            <div class="fp-bio-box">${user.description || 'No bio yet.'}</div>
        </div>
        <div class="fp-grid" style="margin-top: 15px; margin-bottom: 20px;">
            <div>
                <label class="fp-label">Favorite Event</label>
                <div class="fp-value">${user.fav_event || 'Not set'}</div>
            </div>
            <div>
                <label class="fp-label">Goal</label>
                <div class="fp-value">${user.goal || 'Not set'}</div>
            </div>
        </div>
        ${!isSelf ? `
            <div class="fc-actions" style="margin-top: auto; display: flex; justify-content: center;">
                <button class="friend-action-btn ${isFriend ? 'is-friend' : ''}"
                        style="padding: 8px 24px; font-size: 13px;"
                        onclick="event.stopPropagation(); toggleFriendship(window.communityUsers[${origIndex}], ${isFriend}, this)">
                    ${isFriend ? `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                        <span>Remove Friend</span>
                    ` : `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
                        <span>Add Friend</span>
                    `}
                </button>
            </div>
        ` : ''}
    `;
    return div;
}

// ============================================================
// Account Management
// ============================================================

window.openDeleteAccountModal = function () {
    openConfirmModal({
        title: 'Delete Account?',
        body: 'Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.',
        iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></svg>`,
        iconColor: '#ef4444',
        confirmText: 'Delete Account',
        cancelText: 'Cancel',
        onConfirm: confirmDeleteAccount
    });
};

window.confirmDeleteAccount = async function () {
    try {
        const token = getAuthToken();
        if (!token) throw new Error('No auth token found');

        await postDataWithToken(DELETE_USER_URL, {}, token);
        closeConfirmModal();
        clearAuthToken();
        window.location.href = 'login.html';
    } catch (err) {
        console.error('[Account] Error deleting account:', err);
        alert('Failed to delete account. Please try again.');
        closeConfirmModal();
    }
};
