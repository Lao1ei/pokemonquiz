const ICON_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/';
const SPRITE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const ITEM_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';

const dom = {
    setup: document.getElementById('setup-screen'),
    game: document.getElementById('game-screen'),
    end: document.getElementById('end-screen'),
    modeSections: document.getElementById('mode-sections'),
    loadingOverlay: document.getElementById('loading-overlay'),
    typeSection: document.getElementById('type-section'),
    typeButtons: document.getElementById('type-buttons'),
    toggleTypesBtn: document.getElementById('toggle-types-btn'),
    btnLegendary: document.getElementById('btn-legendary'),
    grid: document.getElementById('pokedex-grid'),
    input: document.getElementById('guess-input'),
    score: document.getElementById('score'),
    totalCount: document.getElementById('total-count'),
    timerBox: document.getElementById('timer-box'),
    timer: document.getElementById('timer'),
    sysMessage: document.getElementById('sys-message'),
    giveUpBtn: document.getElementById('give-up-btn'),
    restartBtn: document.getElementById('restart-btn'),
    endTitle: document.getElementById('end-title'),
    finalScore: document.getElementById('final-score'),
    finalTotal: document.getElementById('final-total'),
    finalTimeContainer: document.getElementById('final-time-container'),
    finalTime: document.getElementById('final-time'),
    finalShadows: document.getElementById('final-shadows'),
    optTheme: document.getElementById('opt-theme'),
    optTimer: document.getElementById('opt-timer'),
    optShadows: document.getElementById('opt-shadows'),
    optSpelling: document.getElementById('opt-spelling'),
    timerSettings: document.getElementById('timer-settings'),
    timerMins: document.getElementById('timer-mins'),
    spellCheckBtn: document.getElementById('spell-check-btn'),
    inGameTheme: document.getElementById('in-game-theme'),
    inGameShadows: document.getElementById('in-game-shadows'),
    inGameSpelling: document.getElementById('in-game-spelling'),
    shadowModal: document.getElementById('shadow-modal'),
    confirmShadowBtn: document.getElementById('confirm-shadow-btn'),
    cancelShadowBtn: document.getElementById('cancel-shadow-btn')
};

let db = []; 
let activeHunt = []; 
let caughtCount = 0;
let timerSeconds = 0;
let stopwatch = null;
let isGameActive = false;
let msgTimeout = null;
let currentGrouping = 'none'; 

// Changed key to v2 to clear out old cached settings. Spelling defaults to false.
let opts = JSON.parse(localStorage.getItem('pokedex_opts_v2')) || { timer: false, shadows: false, spelling: false, dark: false, timerMins: 15 };

function saveOpts() {
    localStorage.setItem('pokedex_opts_v2', JSON.stringify(opts));
}

const TYPES = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];

// Special Categorizations
const MYTHICALS = new Set([151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649, 719, 720, 721, 801, 802, 807, 808, 809, 893, 1025]);
const ULTRA_BEASTS = new Set([793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806]); 
const PARADOX = new Set([984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 996, 997, 998, 999, 1000, 1009, 1010, 1020, 1021, 1022, 1023]);
const LEGENDARIES = new Set([150, 249, 250, 382, 383, 384, 483, 484, 487, 643, 644, 646, 716, 717, 718, 789, 790, 791, 792, 800, 888, 889, 890, 898, 1007, 1008, 1024]);
const SUB_LEGENDARIES = new Set([144, 145, 146, 243, 244, 245, 377, 378, 379, 380, 381, 480, 481, 482, 485, 486, 488, 638, 639, 640, 641, 642, 645, 772, 773, 785, 786, 787, 788, 891, 892, 894, 895, 896, 897, 905, 1001, 1002, 1003, 1004, 1014, 1015, 1016, 1017]);

const SPECIAL_POKEMON = new Set([...MYTHICALS, ...ULTRA_BEASTS, ...PARADOX, ...LEGENDARIES, ...SUB_LEGENDARIES]);

const REGION_ORDER = ["KANTO (GEN 1)", "JOHTO (GEN 2)", "HOENN (GEN 3)", "SINNOH (GEN 4)", "UNOVA (GEN 5)", "KALOS (GEN 6)", "ALOLA (GEN 7)", "GALAR (GEN 8)", "PALDEA (GEN 9)"];
const RARITY_ORDER = ["LEGENDARIES", "SUB-LEGENDARIES", "MYTHICALS", "ULTRA BEASTS", "PARADOX POKÉMON"];

function getRegion(id) {
    if(id <= 151) return "KANTO (GEN 1)";
    if(id <= 251) return "JOHTO (GEN 2)";
    if(id <= 386) return "HOENN (GEN 3)";
    if(id <= 493) return "SINNOH (GEN 4)";
    if(id <= 649) return "UNOVA (GEN 5)";
    if(id <= 721) return "KALOS (GEN 6)";
    if(id <= 809) return "ALOLA (GEN 7)";
    if(id <= 905) return "GALAR (GEN 8)";
    if(id <= 1025) return "PALDEA (GEN 9)";
    return "UNKNOWN";
}

function getRarity(id) {
    if(LEGENDARIES.has(id)) return "LEGENDARIES";
    if(SUB_LEGENDARIES.has(id)) return "SUB-LEGENDARIES";
    if(MYTHICALS.has(id)) return "MYTHICALS";
    if(ULTRA_BEASTS.has(id)) return "ULTRA BEASTS";
    if(PARADOX.has(id)) return "PARADOX POKÉMON";
    return "UNKNOWN";
}

document.addEventListener('DOMContentLoaded', async () => {
    applySavedSettings();
    buildTypeFilters();
    setupOptionListeners();
    await initializeDatabase();
    setupGameModeListeners();
});

function applySavedSettings() {
    // Theme
    document.body.classList.toggle('dark-mode', opts.dark);
    const themeTxt = `THEME: ${opts.dark ? 'DARK' : 'LIGHT'}`;
    dom.optTheme.textContent = themeTxt;
    dom.inGameTheme.textContent = themeTxt;

    // Timer
    dom.timerMins.value = opts.timerMins;
    dom.optTimer.textContent = `TIMER: ${opts.timer ? 'ON' : 'OFF'}`;
    dom.optTimer.classList.toggle('active', opts.timer);
    dom.timerSettings.style.display = opts.timer ? 'flex' : 'none';

    // Shadows
    const shadowTxt = `SHADOWS: ${opts.shadows ? 'ON' : 'OFF'}`;
    dom.optShadows.textContent = shadowTxt;
    dom.optShadows.classList.toggle('active', opts.shadows);
    dom.inGameShadows.textContent = shadowTxt;
    dom.inGameShadows.classList.toggle('active', opts.shadows);

    // Spelling
    const spellTxt = `FUZZY LOGIC: ${opts.spelling ? 'ON' : 'OFF'}`;
    dom.optSpelling.textContent = spellTxt;
    dom.optSpelling.classList.toggle('active', opts.spelling);
    dom.inGameSpelling.textContent = spellTxt;
    dom.inGameSpelling.classList.toggle('active', opts.spelling);
    dom.spellCheckBtn.classList.toggle('hidden', !opts.spelling);
}

function setupOptionListeners() {
    function toggleTheme() {
        opts.dark = !opts.dark;
        saveOpts();
        document.body.classList.toggle('dark-mode', opts.dark);
        const txt = `THEME: ${opts.dark ? 'DARK' : 'LIGHT'}`;
        dom.optTheme.textContent = txt;
        dom.inGameTheme.textContent = txt;
    }

    dom.optTimer.addEventListener('click', () => {
        opts.timer = !opts.timer;
        saveOpts();
        dom.optTimer.textContent = `TIMER: ${opts.timer ? 'ON' : 'OFF'}`;
        dom.optTimer.classList.toggle('active', opts.timer);
        dom.timerSettings.style.display = opts.timer ? 'flex' : 'none';
    });

    dom.timerMins.addEventListener('change', (e) => {
        opts.timerMins = parseInt(e.target.value) || 15;
        saveOpts();
    });

    // --- SHADOW TOGGLE LOGIC ---
    function attemptToggleShadows() {
        if (isGameActive && opts.shadows) {
            displaySysMessage("LOCKED: CANNOT DISABLE SHADOWS DURING HUNT", "red");
            return;
        }

        if (!opts.shadows) {
            // Bring up warning modal if trying to turn ON
            dom.shadowModal.classList.remove('hidden');
        } else {
            // Turning OFF (only allowed when game is not active)
            applyShadowToggle(false);
        }
    }

    function applyShadowToggle(turnOn) {
        opts.shadows = turnOn;
        saveOpts();
        const txt = `SHADOWS: ${opts.shadows ? 'ON' : 'OFF'}`;
        dom.optShadows.textContent = txt;
        dom.optShadows.classList.toggle('active', opts.shadows);
        dom.inGameShadows.textContent = txt;
        dom.inGameShadows.classList.toggle('active', opts.shadows);
        if (isGameActive) generateInvisibleGrid();
    }

    dom.confirmShadowBtn.addEventListener('click', () => {
        dom.shadowModal.classList.add('hidden');
        applyShadowToggle(true);
    });

    dom.cancelShadowBtn.addEventListener('click', () => {
        dom.shadowModal.classList.add('hidden');
    });

    // --- SPELLING TOGGLE LOGIC ---
    function toggleSpelling() {
        opts.spelling = !opts.spelling;
        saveOpts();
        const txt = `FUZZY LOGIC: ${opts.spelling ? 'ON' : 'OFF'}`;
        dom.optSpelling.textContent = txt;
        dom.optSpelling.classList.toggle('active', opts.spelling);
        dom.inGameSpelling.textContent = txt;
        dom.inGameSpelling.classList.toggle('active', opts.spelling);
        dom.spellCheckBtn.classList.toggle('hidden', !opts.spelling);
    }

    dom.optTheme.addEventListener('click', toggleTheme);
    dom.inGameTheme.addEventListener('click', toggleTheme);
    dom.optShadows.addEventListener('click', attemptToggleShadows);
    dom.inGameShadows.addEventListener('click', attemptToggleShadows);
    dom.optSpelling.addEventListener('click', toggleSpelling);
    dom.inGameSpelling.addEventListener('click', toggleSpelling);

    // Spell Check Query Execution
    dom.spellCheckBtn.addEventListener('click', () => {
        if (!isGameActive || !opts.spelling) return;
        const query = normalizeString(dom.input.value);
        if (query.length < 3) {
            displaySysMessage("NEED MORE DATA", "red");
            return;
        }
        
        let bestMatch = null, bestDist = Infinity;
        for (let p of db) {
            let dist = getEditDistance(query, p.searchKey);
            if (dist < bestDist) { bestDist = dist; bestMatch = p; }
        }
        
        if (bestMatch && bestDist <= 3) displaySysMessage(`DID YOU MEAN: ${bestMatch.name}?`, 'yellow');
        else displaySysMessage("NO CLOSE MATCH", "red");
        
        dom.input.focus();
    });
}

function setupGameModeListeners() {
    dom.toggleTypesBtn.addEventListener('click', () => dom.typeSection.classList.toggle('hidden'));
    document.querySelectorAll('.sys-btn[data-type="gen"]').forEach(btn => {
        btn.addEventListener('click', () => {
            let s = parseInt(btn.dataset.start);
            let e = parseInt(btn.dataset.end);
            let grouping = (s === 1 && e === 1025) ? 'region' : 'none';
            configureHuntGen(s, e, grouping);
        });
    });
    dom.btnLegendary.addEventListener('click', configureHuntLegendary);
    dom.input.addEventListener('input', handleTyping);
    dom.giveUpBtn.addEventListener('click', () => concludeHunt(false));
    dom.restartBtn.addEventListener('click', returnToSetup);
}

function normalizeString(str) { return str.toLowerCase().replace(/[^a-z0-9]/g, ''); }

function getEditDistance(a, b) {
    if(a.length === 0) return b.length;
    if(b.length === 0) return a.length;
    let matrix = [];
    for(let i = 0; i <= b.length; i++) matrix[i] = [i];
    for(let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for(let i = 1; i <= b.length; i++){
        for(let j = 1; j <= a.length; j++){
            if(b.charAt(i-1) === a.charAt(j-1)) matrix[i][j] = matrix[i-1][j-1];
            else matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
        }
    }
    return matrix[b.length][a.length];
}

function displaySysMessage(msg, typeClass) {
    clearTimeout(msgTimeout);
    dom.sysMessage.textContent = msg;
    dom.sysMessage.className = `msg-${typeClass}`;
    msgTimeout = setTimeout(() => { dom.sysMessage.textContent = ''; }, 3000);
}

async function initializeDatabase() {
    try {
        dom.loadingOverlay.classList.remove('hidden');
        dom.modeSections.classList.add('hidden');
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
        const data = await response.json();
        
        db = data.results.map((p, index) => ({
            id: index + 1,
            name: p.name.toUpperCase().replace('-', ' '),
            searchKey: normalizeString(p.name)
        }));
    } catch (error) {
        alert("ERR: DATABASE FAILED.");
    } finally {
        dom.loadingOverlay.classList.add('hidden');
        dom.modeSections.classList.remove('hidden');
    }
}

function buildTypeFilters() {
    TYPES.forEach(type => {
        const btn = document.createElement('button');
        btn.className = 'sys-btn';
        btn.textContent = type.toUpperCase();
        btn.onclick = () => configureHuntType(type.toLowerCase());
        dom.typeButtons.appendChild(btn);
    });
}

function transitionTo(screenKey) {
    [dom.setup, dom.game, dom.end, dom.loadingOverlay].forEach(s => s.classList.add('hidden'));
    dom[screenKey].classList.remove('hidden');
}

function beginHunt(pool, grouping) {
    if (pool.length === 0) return;
    
    isGameActive = true;
    currentGrouping = grouping;
    activeHunt = pool.sort((a,b) => a.id - b.id).map(p => ({ ...p, isCaught: false, isShiny: false }));
    caughtCount = 0;
    
    if (opts.timer) {
        timerSeconds = opts.timerMins * 60;
    } else {
        timerSeconds = 0;
    }
    
    dom.score.textContent = caughtCount;
    dom.totalCount.textContent = activeHunt.length;
    dom.input.value = '';
    dom.input.disabled = false;
    dom.sysMessage.textContent = '';
    
    renderTime();
    clearInterval(stopwatch);
    stopwatch = setInterval(() => { 
        if (opts.timer) {
            timerSeconds--;
            if (timerSeconds <= 0) {
                renderTime();
                concludeHunt(false); 
            }
        } else {
            timerSeconds++;
        }
        renderTime(); 
    }, 1000);

    generateInvisibleGrid();
    transitionTo('game');
    dom.input.focus();
}

function generateInvisibleGrid() {
    dom.grid.innerHTML = '';
    let groups = {};

    activeHunt.forEach(pkmn => {
        let key = "DATA";
        if (currentGrouping === 'region') key = getRegion(pkmn.id);
        else if (currentGrouping === 'rarity') key = getRarity(pkmn.id);

        if (!groups[key]) groups[key] = [];
        groups[key].push(pkmn);
    });

    let order = ["DATA"];
    if (currentGrouping === 'region') order = REGION_ORDER;
    else if (currentGrouping === 'rarity') order = RARITY_ORDER;

    order.forEach(key => {
        if (groups[key] && groups[key].length > 0) {
            
            if (currentGrouping !== 'none') {
                const header = document.createElement('h2');
                header.className = 'region-header';
                const caughtInGroup = groups[key].filter(p => p.isCaught).length;
                header.textContent = `${key} - [${caughtInGroup}/${groups[key].length}]`;
                header.id = `header-${key.replace(/ /g, '-')}`;
                dom.grid.appendChild(header);
            }

            const subGrid = document.createElement('div');
            subGrid.className = 'pokedex-subgrid';

            groups[key].forEach(pkmn => {
                const slot = document.createElement('div');
                slot.className = 'ghost-slot';
                slot.id = `loc-${pkmn.id}`;
                
                if (opts.shadows && !pkmn.isCaught) {
                    const img = document.createElement('img');
                    img.src = `${ICON_BASE_URL}${pkmn.id}.png`;
                    img.onerror = function() { this.src = `${SPRITE_BASE_URL}${pkmn.id}.png`; };
                    img.className = 'sprite-img shadow-mode';
                    slot.appendChild(img);
                } else if (!pkmn.isCaught) {
                    const formattedId = String(pkmn.id).padStart(3, '0');
                    slot.innerHTML = `<span class="dex-number">#${formattedId}</span>`;
                } else {
                    const img = document.createElement('img');
                    img.src = pkmn.isShiny ? `${SPRITE_BASE_URL}shiny/${pkmn.id}.png` : `${SPRITE_BASE_URL}${pkmn.id}.png`;
                    img.className = 'sprite-img caught';
                    slot.appendChild(img);

                    if (pkmn.isShiny) {
                        const badge = document.createElement('div');
                        badge.className = 'shiny-badge';
                        badge.textContent = '✨';
                        slot.appendChild(badge);
                    }
                }
                subGrid.appendChild(slot);
            });
            dom.grid.appendChild(subGrid);
        }
    });
}

function updateHeaderCounts() {
    if (currentGrouping === 'none') return;
    
    let groups = {};
    activeHunt.forEach(pkmn => {
        let key = currentGrouping === 'region' ? getRegion(pkmn.id) : getRarity(pkmn.id);
        if (!groups[key]) groups[key] = { total: 0, caught: 0 };
        groups[key].total++;
        if (pkmn.isCaught) groups[key].caught++;
    });

    for (let key in groups) {
        const headerId = `header-${key.replace(/ /g, '-')}`;
        const headerEl = document.getElementById(headerId);
        if (headerEl) {
            headerEl.textContent = `${key} - [${groups[key].caught}/${groups[key].total}]`;
        }
    }
}

function configureHuntGen(start, end, grouping) { beginHunt(db.filter(p => p.id >= start && p.id <= end), grouping); }

function configureHuntLegendary() { beginHunt(db.filter(p => SPECIAL_POKEMON.has(p.id)), 'rarity'); }

async function configureHuntType(type) {
    try {
        dom.modeSections.classList.add('hidden');
        dom.loadingOverlay.classList.remove('hidden');
        const response = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
        const data = await response.json();
        const validIds = new Set(data.pokemon.map(p => parseInt(p.pokemon.url.split('/')[6])).filter(id => id <= 1025));
        beginHunt(db.filter(p => validIds.has(p.id)), 'region'); 
    } catch (e) {
        alert("ERR: TYPE FILTER FAILED.");
    } finally {
        dom.loadingOverlay.classList.add('hidden');
        dom.modeSections.classList.remove('hidden');
    }
}

function handleTyping(e) {
    if (!isGameActive) return;
    const query = normalizeString(e.target.value);
    if (!query) return;

    let exactMatch = activeHunt.find(p => p.searchKey === query);
    
    if (exactMatch) {
        if (exactMatch.isCaught) {
            let possibleLongerMatches = activeHunt.filter(p => 
                p.searchKey.startsWith(query) && p.searchKey.length > query.length
            );
            
            if (possibleLongerMatches.length > 0) {
                return;
            }
        }
        
        processMatch(exactMatch);
    }
}

function processMatch(match) {
    const activeIndex = activeHunt.findIndex(p => p.id === match.id);
    dom.input.value = ''; 
    
    const dittoIndex = activeHunt.findIndex(p => p.id === 132);
    if (dittoIndex !== -1 && activeHunt[dittoIndex].isCaught && match.id !== 132) {
        const dittoSlot = document.getElementById('loc-132');
        if (dittoSlot) {
            const dittoImg = dittoSlot.querySelector('.sprite-img');
            if (dittoImg) {
                dittoImg.src = `${SPRITE_BASE_URL}${match.id}.png`;
                dittoImg.style.filter = 'drop-shadow(0 0 5px #b388ff)'; 
            }
        }
    }

    if (activeIndex !== -1) {
        if (activeHunt[activeIndex].isCaught) {
            displaySysMessage(`ALREADY LOGGED: ${match.name}`, 'yellow');
        } else {
            registerCatch(activeIndex, match.name);
        }
    } else {
        displaySysMessage(`NOT FOUND IN PARAMETERS: ${match.name}`, 'red');
    }
}

async function getPokeballName(id) {
    if (SPECIAL_POKEMON.has(id)) return ['master-ball', 'cherish-ball', 'luxury-ball', 'premier-ball'][Math.floor(Math.random() * 4)];
    if (ULTRA_BEASTS.has(id)) return 'beast-ball';

    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const data = await res.json();
        const types = data.types.map(t => t.type.name);

        if (types.includes('water') || types.includes('ice')) return ['dive-ball', 'net-ball', 'lure-ball'][Math.floor(Math.random()*3)];
        if (types.includes('bug')) return ['net-ball', 'sport-ball'][Math.floor(Math.random()*2)];
        if (types.includes('grass')) return ['nest-ball', 'safari-ball', 'friend-ball'][Math.floor(Math.random()*3)];
        if (types.includes('dark') || types.includes('ghost')) return ['dusk-ball', 'moon-ball'][Math.floor(Math.random()*2)];
        if (types.includes('fairy') || types.includes('psychic')) return ['dream-ball', 'heal-ball', 'love-ball'][Math.floor(Math.random()*3)];
        if (types.includes('electric')) return ['fast-ball', 'quick-ball'][Math.floor(Math.random()*2)];
        if (types.includes('rock') || types.includes('steel') || types.includes('ground')) return 'heavy-ball';
        if (types.includes('fire') || types.includes('dragon')) return ['repeat-ball', 'timer-ball'][Math.floor(Math.random()*2)];
        if (types.includes('normal') || types.includes('fighting')) return 'level-ball';
    } catch (e) { }

    const r = Math.random();
    if (r > 0.8) return 'ultra-ball';
    if (r > 0.5) return 'great-ball';
    return 'poke-ball';
}

function registerCatch(index, name) {
    const pkmn = activeHunt[index];
    pkmn.isCaught = true; 
    pkmn.isShiny = Math.random() < (1 / 4096);
    
    const slot = document.getElementById(`loc-${pkmn.id}`);
    slot.innerHTML = ''; 

    if (pkmn.isShiny) {
        displaySysMessage(`⭐ SHINY ${name} DETECTED ⭐`, 'yellow');
        const badge = document.createElement('div');
        badge.className = 'shiny-badge';
        badge.textContent = '✨';
        slot.appendChild(badge);
    } else {
        displaySysMessage(`LOGGED: ${name}`, 'green');
    }
    
    const img = document.createElement('img');
    img.src = pkmn.isShiny ? `${SPRITE_BASE_URL}shiny/${pkmn.id}.png` : `${SPRITE_BASE_URL}${pkmn.id}.png`;
    img.style.opacity = '0'; 
    
    const ballImg = document.createElement('img');
    ballImg.className = 'ball-item-img';
    ballImg.src = `${ITEM_BASE_URL}poke-ball.png`;
    
    slot.appendChild(ballImg);
    slot.appendChild(img);

    getPokeballName(pkmn.id).then(ballName => {
        if (ballImg) ballImg.src = `${ITEM_BASE_URL}${ballName}.png`;
    });

    setTimeout(() => {
        ballImg.style.animation = 'popOut 0.2s forwards';
        setTimeout(() => {
            ballImg.remove();
            img.style.opacity = '1';
            img.className = 'sprite-img caught';
        }, 200);
    }, 800);

    caughtCount++;
    dom.score.textContent = caughtCount;
    updateHeaderCounts();
    
    slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    if (caughtCount === activeHunt.length) {
        concludeHunt(true);
    }
}

function renderTime() {
    const absTime = Math.abs(timerSeconds);
    const mins = Math.floor(absTime / 60).toString().padStart(2, '0');
    const secs = (absTime % 60).toString().padStart(2, '0');
    dom.timer.textContent = `${mins}:${secs}`;
}

function concludeHunt(completed) {
    if (!isGameActive) return;
    isGameActive = false;
    clearInterval(stopwatch);
    
    dom.input.disabled = true;
    if (!completed) {
        dom.input.value = "SYSTEM OVERRIDE...";
        dom.endTitle.textContent = "HUNT ABORTED";
    } else {
        dom.input.value = "DATABASE COMPLETE";
        dom.endTitle.textContent = "DATA COMPILED";
    }

    dom.finalShadows.textContent = `SHADOW MODE: ${opts.shadows ? 'ENGAGED' : 'OFF'}`;

    setTimeout(() => {
        dom.finalScore.textContent = caughtCount;
        dom.finalTotal.textContent = activeHunt.length;
        dom.finalTime.textContent = dom.timer.textContent;
        transitionTo('end');
    }, completed ? 1000 : 2500);
}

function returnToSetup() {
    transitionTo('setup');
}