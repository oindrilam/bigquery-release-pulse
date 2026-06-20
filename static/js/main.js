// State Management
let releaseNotes = [];
let selectedNote = null;
let currentTemplate = 'pro';
let activeTypeFilter = 'all';
let searchQuery = '';

// DOM Elements
const notesContainer = document.getElementById('notesContainer');
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = refreshBtn.querySelector('.icon-refresh');
const cacheStatus = document.getElementById('cacheStatus');
const cacheDot = cacheStatus.querySelector('.status-dot');
const cacheText = cacheStatus.querySelector('.status-text');
const notesCount = document.getElementById('notesCount');
const lastUpdated = document.getElementById('lastUpdated');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const typeFilters = document.getElementById('typeFilters');

// Composer Elements
const noSelectionState = document.getElementById('noSelectionState');
const composerState = document.getElementById('composerState');
const previewMeta = document.getElementById('previewMeta');
const previewTitle = document.getElementById('previewTitle');
const templateChips = document.getElementById('templateChips');
const tweetText = document.getElementById('tweetText');
const charCount = document.getElementById('charCount');
const charProgress = document.getElementById('charProgress');
const xPreviewBody = document.getElementById('xPreviewBody');
const tweetActionBtn = document.getElementById('tweetActionBtn');

// SVG Ring Circumference for Character Progress (radius = 10)
const RING_RADIUS = 10;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Initialize Progress Ring
if (charProgress) {
    charProgress.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
    charProgress.style.strokeDashoffset = RING_CIRCUMFERENCE;
}

// Templates Definitions
const tweetTemplates = {
    pro: (note) => {
        const textLimit = 160;
        const cleanText = truncateString(note.text, textLimit);
        return `BigQuery Update (${note.date}): ${cleanText}\n\nDetails: ${note.link} #BigQuery #GoogleCloud`;
    },
    hype: (note) => {
        const textLimit = 130;
        const cleanText = truncateString(note.text, textLimit);
        return `🚀 BigQuery Update! (${note.date}) 🚀\n\n"${cleanText}"\n\nRead more here: ${note.link} #GCP #BigQuery #DataAnalytics`;
    },
    bullet: (note) => {
        const textLimit = 150;
        const cleanText = truncateString(note.text, textLimit);
        return `📊 BigQuery Release Pulse (${note.date}):\n• ${cleanText}\n\nFull release notes: ${note.link}`;
    },
    minimal: (note) => {
        const textLimit = 180;
        const cleanText = truncateString(note.text, textLimit);
        return `BigQuery ${note.type} [${note.date}]: ${cleanText} ${note.link}`;
    }
};

// ==========================================================================
// Helper Functions
// ==========================================================================

function truncateString(str, num) {
    if (!str) return '';
    if (str.length <= num) {
        return str;
    }
    return str.slice(0, num).trim() + '...';
}

function formatDate(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '';
    }
}

function getTypeClass(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'feature';
    if (t.includes('change')) return 'change';
    if (t.includes('deprecation') || t.includes('security') || t.includes('critical')) return 'deprecation';
    return 'general';
}

// ==========================================================================
// API Operations
// ==========================================================================

async function fetchReleaseNotes(force = false) {
    setLoadingState(true);
    try {
        const url = `/api/release-notes${force ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            releaseNotes = data.notes;
            updateStatusHeader(data);
            renderNotes();
        } else {
            showErrorState(data.error || 'Failed to fetch release notes');
        }
    } catch (error) {
        showErrorState('Network error occurred. Please try again.');
        console.error(error);
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    if (isLoading) {
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
        cacheDot.className = 'status-dot loading';
        cacheText.textContent = 'Syncing...';
    } else {
        refreshIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

function updateStatusHeader(data) {
    cacheDot.className = 'status-dot green';
    
    const timeStr = formatDate(new Date(data.cached_at * 1000));
    if (data.from_cache) {
        cacheText.textContent = `Cached (${timeStr})`;
    } else {
        cacheText.textContent = `Live Synced (${timeStr})`;
    }
    
    lastUpdated.textContent = `Updated at ${new Date(data.cached_at * 1000).toLocaleTimeString()}`;
}

// ==========================================================================
// Rendering Functions
// ==========================================================================

function renderNotes() {
    // Filter release notes
    const filteredNotes = releaseNotes.filter(note => {
        // Type filter match
        const matchesType = activeTypeFilter === 'all' || 
            (activeTypeFilter === 'General' ? 
             (!['Feature', 'Change', 'Deprecation'].includes(note.type)) : 
             note.type === activeTypeFilter);
             
        // Search query match
        const matchesSearch = !searchQuery || 
            note.text.toLowerCase().includes(searchQuery) ||
            note.type.toLowerCase().includes(searchQuery) ||
            note.date.toLowerCase().includes(searchQuery);
            
        return matchesType && matchesSearch;
    });

    notesCount.textContent = filteredNotes.length;

    if (filteredNotes.length === 0) {
        notesContainer.innerHTML = `
            <div class="empty-state">
                <div class="icon-bubble">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <h3>No updates found</h3>
                <p>Try clearing your search query or selecting a different filter.</p>
            </div>
        `;
        return;
    }

    notesContainer.innerHTML = filteredNotes.map(note => {
        const isSelected = selectedNote && selectedNote.id === note.id;
        const typeClass = getTypeClass(note.type);
        
        return `
            <article class="note-card ${isSelected ? 'selected' : ''}" id="card-${note.id}">
                <div class="note-card-header">
                    <span class="note-date">${note.date}</span>
                    <span class="type-badge ${typeClass}">${note.type}</span>
                </div>
                <div class="note-content">
                    ${note.html}
                </div>
                <div class="note-actions">
                    <a href="${note.link}" target="_blank" class="btn btn-sm btn-secondary" title="View official Google Cloud docs">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        <span>Docs Source</span>
                    </a>
                    <button class="btn btn-sm btn-tweet-select" onclick="selectNoteForTweet('${note.id}')" title="Draft a tweet for this release note">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>${isSelected ? 'Selected' : 'Select to Tweet'}</span>
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

function showErrorState(message) {
    notesContainer.innerHTML = `
        <div class="empty-state" style="border-color: rgba(239, 68, 68, 0.2);">
            <div class="icon-bubble" style="background: rgba(239, 68, 68, 0.05); color: #f87171;">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h3 style="color: #f87171;">Unable to load feed</h3>
            <p>${message}</p>
            <button onclick="fetchReleaseNotes(true)" class="btn btn-primary" style="margin-top: 1rem;">Try Reconnecting</button>
        </div>
    `;
    cacheDot.className = 'status-dot red';
    cacheText.textContent = 'Disconnected';
}

// ==========================================================================
// Tweeter Composer Logic
// ==========================================================================

window.selectNoteForTweet = function(noteId) {
    const note = releaseNotes.find(n => n.id === noteId);
    if (!note) return;

    // Set active selection
    selectedNote = note;
    
    // Highlight active card, unhighlight others
    document.querySelectorAll('.note-card').forEach(card => card.classList.remove('selected'));
    const selectedCard = document.getElementById(`card-${noteId}`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        // Smooth scroll to card if needed
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Toggle states
    noSelectionState.style.display = 'none';
    composerState.style.display = 'flex';

    // Set preview header
    previewMeta.textContent = `${note.date} • ${note.type}`;
    previewTitle.textContent = truncateString(note.text, 50);

    // Apply active template text to Composer
    applyTemplate();
    
    // Refresh button states in feed cards
    renderNotes();
};

function applyTemplate() {
    if (!selectedNote) return;
    
    const generator = tweetTemplates[currentTemplate];
    if (generator) {
        const text = generator(selectedNote);
        tweetText.value = text;
        updateTweetLength();
    }
}

function updateTweetLength() {
    const text = tweetText.value;
    const len = text.length;
    const maxChars = 280;
    const remaining = maxChars - len;
    
    // Update count display
    charCount.textContent = remaining;

    // Color code and warnings
    const counterContainer = charCount.parentElement;
    if (remaining < 0) {
        counterContainer.className = 'character-counter danger';
        tweetActionBtn.disabled = true;
    } else if (remaining <= 20) {
        counterContainer.className = 'character-counter warning';
        tweetActionBtn.disabled = false;
    } else {
        counterContainer.className = 'character-counter';
        tweetActionBtn.disabled = false;
    }

    // Progress circle rendering
    const pct = Math.min(len / maxChars, 1);
    const offset = RING_CIRCUMFERENCE - (pct * RING_CIRCUMFERENCE);
    charProgress.style.strokeDashoffset = offset;
    
    if (remaining < 0) {
        charProgress.style.stroke = '#ef4444';
    } else if (remaining <= 20) {
        charProgress.style.stroke = '#fbbf24';
    } else {
        charProgress.style.stroke = '#1a73e8';
    }

    // High fidelity preview mapping
    // Render links nicely with custom styling matching twitter
    let previewHtml = escapeHtml(text);
    
    // Simple links formatting
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    previewHtml = previewHtml.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank">${truncateString(url, 25)}</a>`;
    });

    // Hashtags formatting
    const hashtagRegex = /(#[a-zA-Z0-9_]+)/g;
    previewHtml = previewHtml.replace(hashtagRegex, `<span style="color: var(--twitter-blue);">$1</span>`);

    xPreviewBody.innerHTML = previewHtml || '<span style="color: var(--text-muted); font-style: italic;">No content drafted...</span>';
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// ==========================================================================
// Event Listeners
// ==========================================================================

// Refresh Button
refreshBtn.addEventListener('click', () => {
    fetchReleaseNotes(true);
});

// Search input
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    if (searchQuery) {
        clearSearch.style.display = 'block';
    } else {
        clearSearch.style.display = 'none';
    }
    renderNotes();
});

// Clear Search
clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearch.style.display = 'none';
    renderNotes();
    searchInput.focus();
});

// Filters tags selection
typeFilters.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-tag')) {
        document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
        e.target.classList.add('active');
        activeTypeFilter = e.target.dataset.type;
        renderNotes();
    }
});

// Template selection chips in Composer
templateChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) {
        document.querySelectorAll('.template-chips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentTemplate = chip.dataset.template;
        applyTemplate();
    }
});

// Real-time keyboard updates inside Textarea
tweetText.addEventListener('input', () => {
    updateTweetLength();
});

// Tweet Action click - Standard Twitter Intent link
tweetActionBtn.addEventListener('click', () => {
    const text = tweetText.value;
    if (text.length > 280) {
        alert('Your draft is longer than the 280 character limit.');
        return;
    }
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
});

// ==========================================================================
// App Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes(false);
});
