/* JARVIS lighting controls. Independent decorative lighting; existing lamp relay logic is unchanged. */
(() => {
  const rooms = { 1: 'Bedroom_One', 2: 'Bedroom_Two', 3: 'Kitchen' };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v)));
  const hexFromHue = h => { const n = Math.round(h) % 360; const a = (1 - Math.abs((n / 60) % 2 - 1)); const x = Math.round(255 * a); const values = n < 60 ? [255, x, 0] : n < 120 ? [x, 255, 0] : n < 180 ? [0, 255, x] : n < 240 ? [0, x, 255] : n < 300 ? [x, 0, 255] : [255, 0, x]; return '#' + values.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(); };
  const effectNames = { 0: 'Постоянный цвет', 1: 'Дыхание', 2: 'Радуга', 3: 'Random Burst', 4: 'Random March', 5: 'Random Color Breathing', 6: 'Rainbow Fade', 7: 'Rainbow Loop', 8: 'Color Bounce', 9: 'Color Fade', 10: 'Red / Blue', 11: 'Rotating', 12: 'Flicker', 13: 'Rule30', 14: 'Flame', 19: 'Random Color Pop', 20: 'Police', 21: 'Propeller', 22: 'KITT', 23: 'Matrix', 24: 'Rainbow', 25: 'Fire', 26: 'Sparkle', 27: 'Theater Chase', 28: 'Strobe' };
  Object.entries(rooms).forEach(([id, room]) => {
    const panel = document.querySelector(`[data-light-room="${id}"]`);
    if (!panel) return;
    const bright = panel.querySelector(`#jarvis-bright-${id}`), hue = panel.querySelector(`#jarvis-hue-${id}`);
    const bv = panel.querySelector(`#jarvis-bright-value-${id}`), hv = panel.querySelector(`#jarvis-hue-value-${id}`), status = panel.querySelector('.jarvis-light-status');
    const lockButton = panel.querySelector('.jarvis-lock-button');
    const lockIcon = panel.querySelector('.jarvis-lock-icon');
    const lockText = panel.querySelector('.jarvis-lock-text');
    const effectSelect = panel.querySelector(`#jarvis-effect-${id}`);
    const effectValue = panel.querySelector(`#jarvis-effect-value-${id}`);
    const countInput = panel.querySelector(`#jarvis-ledcount-${id}`);
    const countValue = panel.querySelector(`#jarvis-ledcount-value-${id}`);
    const controlsBody = panel.querySelector(".jarvis-controls-body");
    const countSave = panel.querySelector(".jarvis-count-save");
    const settingsClose = panel.querySelector(".jarvis-settings-close");
    if (effectSelect) for (let i = 0; i <= 34; i++) { const opt = document.createElement('option'); opt.value = String(i); opt.textContent = `${String(i).padStart(2, '0')} — ${effectNames[i] || 'Эффект ' + i}`; effectSelect.appendChild(opt); }
    let unlocked = false, lockTimer = null;
    const lock = () => { unlocked = false; clearTimeout(lockTimer); lockTimer = null; render(); };
    const resetLockTimer = () => { clearTimeout(lockTimer); if (unlocked) lockTimer = setTimeout(lock, 30000); };
    const path = `${room}/Decor/`; const toggle = document.getElementById(`jarvis-decor-${id}`); const toggleRow = toggle?.closest("tr"); const timers = {}; const dragging = {}; const cacheKey = `jarvis-decor-${room}`;
    let values = { enabled: false, brightness: 65, hue: 180, effect: 0, ledCount: 8 };
    try { const saved = JSON.parse(localStorage.getItem(cacheKey)); if (saved && typeof saved === 'object') values = { ...values, ...saved }; } catch (e) { }
    const render = () => { values.enabled = values.enabled === true; panel.classList.toggle("is-off", !values.enabled); toggleRow?.classList.toggle("is-on", values.enabled); if (toggle) toggle.checked = values.enabled; bright.disabled = !values.enabled || !unlocked; hue.disabled = !values.enabled || !unlocked; if (effectSelect) effectSelect.disabled = !values.enabled || !unlocked; if (countInput) countInput.disabled = !unlocked; panel.classList.toggle('is-locked', !unlocked); panel.classList.toggle('is-expanded', unlocked); if (controlsBody) controlsBody.setAttribute('aria-hidden', String(!unlocked)); if (lockButton) { lockButton.classList.toggle('is-unlocked', unlocked); lockButton.setAttribute('aria-pressed', String(unlocked)); lockButton.setAttribute('aria-label', unlocked ? 'Заблокировать регуляторы' : 'Разблокировать регуляторы'); lockIcon.textContent = unlocked ? '🔓' : '🔒'; lockText.textContent = unlocked ? 'Готово · 30 с' : 'Разблокировать'; } values.brightness = clamp(values.brightness, 0, 100); values.hue = clamp(values.hue, 0, 360); values.effect = Math.round(clamp(values.effect, 0, 34)); values.ledCount = Math.round(clamp(values.ledCount, 1, 300)); if (effectSelect) effectSelect.value = String(values.effect); if (effectValue) effectValue.textContent = `${values.effect} / 34`; if (countInput && document.activeElement !== countInput) countInput.value = values.ledCount; if (countValue) countValue.textContent = `${values.ledCount} LED`; const color = hexFromHue(values.hue); panel.style.setProperty('--lamp-color', color); panel.style.setProperty('--lamp-bright', values.brightness / 100); bright.value = values.brightness; hue.value = values.hue; bv.textContent = `${values.brightness}%`; hv.textContent = color; bright.parentElement.style.setProperty('--fill', `${values.brightness}%`); hue.parentElement.style.setProperty('--fill', `${values.hue / 360 * 100}%`); };
    // Fit the opened settings into the available space inside .login.
    // Only the settings scroll; the room card keeps its fixed height.
    const sizeSettings = () => {
      if (!unlocked || !controlsBody) return;
      const login = panel.closest('.login');
      if (!login) return;
      const bottom = login.getBoundingClientRect().bottom;
      const top = controlsBody.getBoundingClientRect().top;
      const available = Math.floor(bottom - top - 22);
      controlsBody.style.setProperty('--jarvis-settings-height', `${Math.max(100, available)}px`);
    };
    window.addEventListener('resize', sizeSettings);
    const saveLocal = () => { try { localStorage.setItem(cacheKey, JSON.stringify(values)); } catch (e) { } };
    const write = (field) => { if (!window.firebase || !firebase.database || !firebase.auth?.().currentUser) { status.textContent = 'ЛОКАЛЬНО'; status.className = 'jarvis-light-status pending'; return; } status.textContent = 'СОХРАНЕНИЕ'; status.className = 'jarvis-light-status pending'; firebase.database().ref(path + field).set(values[field]).then(() => { status.textContent = 'СОХРАНЕНО'; status.className = 'jarvis-light-status'; }).catch(e => { console.error('Lighting write', e); status.textContent = 'ОШИБКА ЗАПИСИ'; status.className = 'jarvis-light-status error'; }); };
    [['brightness', bright], ['hue', hue]].forEach(([field, input]) => {
      input.addEventListener('pointerdown', () => dragging[field] = true);
      input.addEventListener('pointerup', () => dragging[field] = false);
      input.addEventListener('pointercancel', () => dragging[field] = false);
      input.addEventListener('input', () => { if (!unlocked || !values.enabled) return; resetLockTimer(); values[field] = Number(input.value); render(); saveLocal(); clearTimeout(timers[field]); timers[field] = setTimeout(() => { delete timers[field]; write(field); }, 320); });
      input.addEventListener('change', () => { dragging[field] = false; if (!unlocked || !values.enabled) return; resetLockTimer(); clearTimeout(timers[field]); delete timers[field]; values[field] = Number(input.value); render(); saveLocal(); write(field); });
    });
    effectSelect?.addEventListener('change', () => { if (!unlocked || !values.enabled) return; resetLockTimer(); values.effect = Number(effectSelect.value); render(); saveLocal(); write('effect'); });
    // LED count is a rarely changed configuration: commit only on Save.
    countInput?.addEventListener('input', () => { if (unlocked) resetLockTimer(); });
    countInput?.addEventListener('focus', () => { if (unlocked) resetLockTimer(); });
    countSave?.addEventListener('click', () => {
      if (!unlocked) return;
      resetLockTimer();
      const raw = countInput.value.trim();
      const n = Number(raw);
      if (!/^\d+$/.test(raw) || !Number.isInteger(n) || n < 1 || n > 300) {
        countInput.setCustomValidity('Введите целое число от 1 до 300');
        countInput.reportValidity();
        return;
      }
      countInput.setCustomValidity('');
      values.ledCount = n;
      countInput.blur();
      render(); saveLocal(); write('ledCount');
    });
    countInput?.addEventListener('input', () => countInput.setCustomValidity(''));
    // Reset inactivity timer for interactions anywhere inside expanded settings.
    ['pointerdown', 'keydown', 'input', 'change', 'focusin'].forEach(type => {
      controlsBody?.addEventListener(type, () => { if (unlocked) resetLockTimer(); });
    });
    lockButton?.addEventListener('click', () => { unlocked = !unlocked; if (unlocked) resetLockTimer(); else clearTimeout(lockTimer); render(); if (unlocked) sizeSettings(); });
    settingsClose?.addEventListener('click', lock);
    // Close on page scrolling, but allow scrolling inside the settings popup.
    window.addEventListener('scroll', event => { if (unlocked && event.target !== controlsBody && !controlsBody?.contains(event.target)) lock(); }, true);

    // Запоминаем последнее состояние подсветки
    // При первой загрузке озвучки не будет
    let lastEnabledState = null;

    // Переключение подсветки вручную
    toggle?.addEventListener('change', () => {
      values.enabled = toggle.checked;
      if (!values.enabled) lock();
      render();
      saveLocal();
      write('enabled');
    });

    render();

    // Синхронизация с Firebase на всех устройствах
    if (window.firebase && firebase.database) {
      ['enabled', 'brightness', 'hue', 'effect', 'ledCount'].forEach(field => {
        firebase.database().ref(path + field).on('value', snapshot => {

          if (snapshot.val() === null || dragging[field] || timers[field]) return;

          if (field === 'enabled') {
            const newState = snapshot.val() === true;

            // Озвучка только при изменении состояния
            // Первая загрузка — без озвучки
            if (lastEnabledState !== null && lastEnabledState !== newState) {
              const roomName = {
                '1': 'Подсветка в спальне',
                '2': 'Подсветка у Насти',
                '3': 'Подсветка на кухне'
              }[id];

              if (typeof speak === 'function') {
                speak(roomName + (newState ? ' включена' : ' выключена'));
              }
            }

            lastEnabledState = newState;
            values.enabled = newState;

          } else {
            const v = Number(snapshot.val());
            if (!Number.isFinite(v)) return;

            values[field] =
              field === 'hue' ? clamp(v, 0, 360) :
                field === 'effect' ? Math.round(clamp(v, 0, 34)) :
                  field === 'ledCount' ? Math.round(clamp(v, 1, 300)) :
                    clamp(v, 0, 100);
          }

          render();
          saveLocal();
        });
      });
    }
  });
})();
