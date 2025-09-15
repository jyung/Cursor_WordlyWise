(function(){
  "use strict";

  var STORAGE_KEY = "wordlywise_weeks_v1";
  var STATS_KEY = "wordlywise_stats_v1";

  function byId(id){ return document.getElementById(id); }
  function qsa(sel, el){ if(el===void 0){ el=document; } return Array.prototype.slice.call(el.querySelectorAll(sel)); }

  function loadWeeks(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  }
  function saveWeeks(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

  function loadStats(){
    try { return JSON.parse(localStorage.getItem(STATS_KEY) || "{}"); }
    catch(e){ return {}; }
  }
  function saveStats(obj){ localStorage.setItem(STATS_KEY, JSON.stringify(obj)); }

  var state = { weeks: loadWeeks(), voices: [] };

  function speak(text){
    if(!text){ return; }
    var u = new SpeechSynthesisUtterance(text);
    if(state.voices.length){
      var v = state.voices.find(function(x){ return /en/i.test(x.lang); });
      u.voice = v || state.voices[0];
    }
    u.rate = 0.95;
    u.pitch = 1.0;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  function initVoices(){
    function load(){ state.voices = speechSynthesis.getVoices(); }
    load();
    speechSynthesis.onvoiceschanged = load;
  }

  function switchTab(tab){
    qsa(".panel").forEach(function(p){ p.classList.remove("active"); });
    qsa(".tab").forEach(function(t){ t.classList.remove("active"); });
    byId(tab).classList.add("active");
    document.querySelector("[data-tab=\""+tab+"\"]").classList.add("active");
  }
  qsa(".tab").forEach(function(b){ b.addEventListener("click", function(){ switchTab(b.dataset.tab); }); });

  function renderWeeks(){
    var ul = byId("weeks-list");
    var filter = (byId("filter-weeks").value || "").trim().toLowerCase();
    var weeks = state.weeks.slice().sort(function(a,b){ return a.name.localeCompare(b.name); })
      .filter(function(w){ return !filter || w.name.toLowerCase().includes(filter); });
    ul.innerHTML = "";
    if(!weeks.length){ ul.innerHTML = "<li><em>No weeks yet. Add some on the left.</em></li>"; return; }
    weeks.forEach(function(w){
      var li = document.createElement("li");
      var left = document.createElement("div");
      left.textContent = w.name + " • " + w.words.length + " words";
      var right = document.createElement("div");
      var loadBtn = document.createElement("button");
      loadBtn.textContent = "Load";
      loadBtn.addEventListener("click", function(){
        byId("week-name").value = w.name;
        byId("week-words").value = w.words.join("\n");
      });
      var delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", function(){
        if(confirm("Delete " + w.name + "?")){
          state.weeks = state.weeks.filter(function(x){ return x.name !== w.name; });
          saveWeeks(state.weeks);
          renderWeeks();
          populateWeekSelectors();
        }
      });
      right.append(loadBtn, delBtn);
      li.append(left, right);
      ul.appendChild(li);
    });
  }

  function populateWeekSelectors(){
    var opts = state.weeks.slice().sort(function(a,b){ return a.name.localeCompare(b.name); })
      .map(function(w){ return "<option value=\"" + encodeURIComponent(w.name) + "\">" + w.name + "</option>"; })
      .join("");
    byId("flash-week").innerHTML = "<option value=\"\">Choose week…</option>" + opts;
    byId("spell-week").innerHTML = "<option value=\"\">Choose week…</option>" + opts;
  }

  byId("save-week").addEventListener("click", function(){
    var name = (byId("week-name").value || "").trim();
    var words = (byId("week-words").value || "").split(/\n|,/).map(function(w){ return w.trim(); }).filter(function(x){ return !!x; }).map(function(w){ return w.toLowerCase(); });
    if(!name || !words.length){ alert("Please enter a week name and at least one word."); return; }
    var unique = Array.from(new Set(words));
    var ix = state.weeks.findIndex(function(w){ return w.name === name; });
    var entry = { name: name, words: unique };
    if(ix >= 0){ state.weeks[ix] = entry; } else { state.weeks.push(entry); }
    saveWeeks(state.weeks);
    byId("week-words").value = "";
    renderWeeks();
    populateWeekSelectors();
  });
  byId("clear-form").addEventListener("click", function(){ byId("week-name").value = ""; byId("week-words").value = ""; });
  byId("filter-weeks").addEventListener("input", renderWeeks);
  byId("export-data").addEventListener("click", function(){
    var blob = new Blob([JSON.stringify(state.weeks, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "wordlywise_weeks.json"; a.click();
    URL.revokeObjectURL(url);
  });
  byId("import-data").addEventListener("change", function(ev){
    var f = ev.target.files && ev.target.files[0];
    if(!f){ return; }
    var r = new FileReader();
    r.onload = function(){
      try {
        var arr = JSON.parse(r.result);
        if(Array.isArray(arr)){
          state.weeks = arr; saveWeeks(state.weeks); renderWeeks(); populateWeekSelectors();
        } else { alert("Invalid file"); }
      } catch(e){ alert("Invalid file"); }
    };
    r.readAsText(f);
  });

  var flash = { words: [], order: [], ix: 0, show: false };
  function setupFlash(){
    var name = decodeURIComponent(byId("flash-week").value || "");
    var wk = state.weeks.find(function(w){ return w.name === name; });
    flash.words = wk ? wk.words.slice() : [];
    flash.order = flash.words.map(function(_, i){ return i; });
    flash.ix = 0; flash.show = false; renderFlash();
  }
  function renderFlash(){
    var card = byId("flash-card");
    if(!flash.words.length){ card.classList.remove("show"); card.textContent = "Choose a week to start"; return; }
    var word = flash.words[flash.order[flash.ix]];
    card.textContent = flash.show ? word : "Tap to reveal";
    card.classList.toggle("show", flash.show);
  }
  function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } }
  byId("flash-week").addEventListener("change", setupFlash);
  byId("flash-shuffle").addEventListener("click", function(){ shuffle(flash.order); flash.ix=0; flash.show=false; renderFlash(); });
  byId("flash-card").addEventListener("click", function(){ flash.show=!flash.show; renderFlash(); });
  byId("flash-card").addEventListener("keydown", function(e){ if(e.code === "Space"){ e.preventDefault(); flash.show=!flash.show; renderFlash(); } });
  byId("flash-prev").addEventListener("click", function(){ if(!flash.words.length){ return; } flash.ix=(flash.ix-1+flash.order.length)%flash.order.length; flash.show=false; renderFlash(); });
  byId("flash-next").addEventListener("click", function(){ if(!flash.words.length){ return; } flash.ix=(flash.ix+1)%flash.order.length; flash.show=false; renderFlash(); });
  byId("flash-speak").addEventListener("click", function(){ if(!flash.words.length){ return; } var w=flash.words[flash.order[flash.ix]]; speak(w); });

  var spell = { words: [], order: [], ix: 0, correct: 0 };
  function setupSpell(){
    var name = decodeURIComponent(byId("spell-week").value || "");
    var wk = state.weeks.find(function(w){ return w.name === name; });
    spell.words = wk ? wk.words.slice() : [];
    spell.order = spell.words.map(function(_, i){ return i; });
    shuffle(spell.order);
    spell.ix = 0; spell.correct = 0;
    byId("spell-area").classList.toggle("hidden", spell.words.length === 0);
    byId("spell-input").value = "";
    byId("spell-feedback").textContent = "";
    updateSpellProgress();
  }
  function currentSpell(){ return spell.words[spell.order[spell.ix]]; }
  function updateSpellProgress(){
    var pct = spell.words.length ? Math.round((spell.ix)/spell.words.length*100) : 0;
    byId("spell-progress").innerHTML = "<div style=\"position:absolute;inset:0;background:linear-gradient(90deg,var(--success),var(--primary));width:"+pct+"%;border-radius:999px;\"></div>";
  }
  byId("spell-start").addEventListener("click", function(){ setupSpell(); if(spell.words.length){ speak("Lets start!"); setTimeout(function(){ speak(currentSpell()); }, 300); } });
  byId("spell-speak").addEventListener("click", function(){ speak(currentSpell()); });
  byId("spell-hint").addEventListener("click", function(){ var w=currentSpell(); if(!w){ return; } var hint = w[0] + " ".repeat(Math.max(0,w.length-1)).split(" ").map(function(){ return "_"; }).join(""); byId("spell-feedback").textContent = "Hint: " + hint; });
  function check(){
    var input = (byId("spell-input").value || "").trim().toLowerCase();
    var ans = (currentSpell() || "").toLowerCase();
    if(!ans){ return; }
    var ok = input === ans;
    var fb = byId("spell-feedback");
    if(ok){ fb.textContent = "Great job!"; fb.style.color = "var(--success)"; spell.correct++; }
    else { fb.textContent = "Try again: " + ans; fb.style.color = "var(--danger)"; }
    var done = (++spell.ix) >= spell.order.length;
    updateSpellProgress();
    saveStats({ lastScore: { total: spell.order.length, correct: spell.correct, date: Date.now() } });
    if(done){ speak("All done!"); byId("spell-area").classList.add("hidden"); }
    else { byId("spell-input").value = ""; setTimeout(function(){ speak(currentSpell()); }, 300); }
  }
  byId("spell-submit").addEventListener("click", check);
  byId("spell-input").addEventListener("keydown", function(e){ if(e.key === "Enter"){ check(); } });
  byId("spell-skip").addEventListener("click", function(){ if(spell.ix < spell.order.length){ spell.ix++; updateSpellProgress(); if(spell.ix>=spell.order.length){ byId("spell-area").classList.add("hidden"); speak("All done!"); } else { speak(currentSpell()); } } });

  function renderStats(){
    var s = loadStats();
    var el = byId("stats");
    if(s.lastScore){ el.textContent = "Last session: " + s.lastScore.correct + "/" + s.lastScore.total; }
    else { el.textContent = ""; }
  }

  initVoices();
  renderWeeks();
  populateWeekSelectors();
  renderStats();
})();
