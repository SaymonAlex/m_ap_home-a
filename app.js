// --- Кнопка для обновления ---
const update_app = document.getElementById('update_app');
update_app.style.display = 'none'; // скрыта по умолчанию

// --- Service Worker регистрация ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    // Слушаем появление новой версии SW
    reg.onupdatefound = () => {
      const newWorker = reg.installing;
      newWorker.onstatechange = () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Новый контент доступен
          update_app.style.display = 'flex';
        }
      };
    };
  }).catch(console.error);
}
// ---------------------------------

// При клике на кнопку обновления
update_app.onclick = () => {
  window.location.reload(); // перезагрузка страницы и активация нового SW
  speak("Приложение обновлено");
};
// ------------------------------

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMnrU_jFpVJBxPcejmDa2ZNQoXxU2zNu8",
  authDomain: "appartament-d6ab4.firebaseapp.com",
  databaseURL: "https://appartament-d6ab4-default-rtdb.firebaseio.com",
  projectId: "appartament-d6ab4",
  storageBucket: "appartament-d6ab4.appspot.com",
  messagingSenderId: "507797619199",
  appId: "1:507797619199:web:771f2eaa3a1650cb7127ca",
  measurementId: "G-VY3FVRKHEG"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

var setpoint = "25";
var hyst_now = "0.1";
let firstLoadDone = false;

function boiler_setpoints() {
  document.getElementById('set_now').value = `${setpoint}`;
  document.getElementById('set_hyst').value = `${hyst_now}`;
}

// ---------------------Sound assistant Speak-------------------
let utterance = null;
var tick_sound = true;
let sound_voice = false;
let menuAutoCloseTimer = null;

// Управление с помощью микрофона
let isListening = false;
let recognition;
let waitingForCommand = false;
// ------------------------------

// загрузка состояния кнопки
let sound_voice_State = localStorage.getItem("sound_State") || "off";
sound_voice = false;
setTimeout(() => {
  if (sound_voice_State === "on") {
    sound_voice = true;
  }
}, 6000);
// -------------------------

function speak(text) {
  if (!sound_voice) return;
  speechSynthesis.cancel();
  utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

// Правильное произношение температуры
function formatTemperature(temp) {
  let t = parseFloat(temp.toString().replace(',', '.'));
  if (isNaN(t)) return '';

  const sign = t < 0 ? 'минус ' : '';
  t = Math.abs(t);

  const whole = Math.floor(t);
  const frac = Math.round((t - whole) * 10);

  let degreeWord =
    (whole % 10 === 1 && whole % 100 !== 11) ? "градус" :
      ([2, 3, 4].includes(whole % 10) && ![12, 13, 14].includes(whole % 100)) ? "градуса" :
        "градусов";
  if (frac > 0) {
    return `${sign}${whole} целых ${frac} десятых ${degreeWord}`;
  } else {
    return `${sign}${whole} ${degreeWord}`;
  }
}
// -------------------------------------

document.querySelectorAll(".menu-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const section = btn.closest("section");
    const nav = section.querySelector("nav");
    nav.classList.toggle("nav-open");
    btn.classList.toggle("active");
    startMenuAutoClose();
  });
});

let list = document.querySelectorAll('nav .links a');
function active() {
  list.forEach((i) => i.classList.remove('active'));
  this.classList.add('active');
  const nav = this.closest("nav");
  nav.classList.remove("nav-open");
  closeAllMenus();
}
list.forEach((i) => i.addEventListener('click', active));
// --------------------------------------------

// Закрыть все открытые меню
function closeAllMenus() {
  document.querySelectorAll("nav").forEach(nav => {
    nav.classList.remove("nav-open");
  });

  document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.classList.remove("active");
  });
}

// Авто закрытие меню по истичении времени
function startMenuAutoClose() {
  stopMenuAutoClose(); // на всякий случай
  menuAutoCloseTimer = setTimeout(() => {
    closeAllMenus();
  }, 15000); // 30 секунд
}
function stopMenuAutoClose() {
  if (menuAutoCloseTimer) {
    clearTimeout(menuAutoCloseTimer);
    menuAutoCloseTimer = null;
  }
}
// ----------------------------------------

// При скроле переключение линков подсветка
document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll("nav .links a");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute("id");
        navLinks.forEach(link => {
          link.classList.remove("active");
          if (link.getAttribute("href") === `#${id}`) {
            link.classList.add("active");
          }
          boiler_setpoints();
        });
      }
    });
  }, {
    root: null,
    threshold: 0.6 // 60% секции видно
  });
  sections.forEach(section => observer.observe(section));
});
// ----------------------------------------------------


// Вентиляция помещения
const turbine = document.getElementById("turbine");
const ring = document.getElementById("ring");
let lastVentState = null;
let ventInitialized = false;
firebase.database().ref("VentAppartament").on("value", (snapshot) => {
  const state_vent = !!snapshot.val(); // нормализуем в true/false
  turbine.classList.toggle("spin", state_vent);
  turbine.classList.toggle("glow-active", state_vent);
  ring.classList.toggle("ring-active", state_vent);
  vent_but.classList.toggle("btn-pressed", state_vent);
  if (!ventInitialized) {
    lastVentState = state_vent;
    ventInitialized = true;
    return;
  }
  if (lastVentState === state_vent) return;
  lastVentState = state_vent;
  if (sound_voice) {
    speak(
      state_vent
        ? "Вентиляция включена"
        : "Вентиляция выключена"
    );
  }
});
const vent_but = document.getElementById("vent_but");
let prev_set_value = 21.5;
const vent_value = 15.1;
let currentSetTemp = 21.5;
vent_but.addEventListener("click", () => {
  const ventRef = firebase.database().ref("VentAppartament");
  const tempRef = firebase.database().ref("Boiler/Temp/Setpoint");
  ventRef.once("value").then((snap) => {
    let state = snap.val();
    if (!state) {
      // ВКЛ
      vent_but.classList.add("btn-pressed");
      prev_set_value = currentSetTemp;
      tempRef.set(vent_value);
      ventRef.set(true);
    } else {
      // ВЫКЛ
      vent_but.classList.remove("btn-pressed");
      tempRef.set(prev_set_value);
      ventRef.set(false);
    }
  });
});
firebase.database().ref("Boiler/Temp/Setpoint").on("value", (snap) => {
  currentSetTemp = snap.val();
});
/* ===== ФУНКЦИЯ СМЕНЫ РАЗМЕРА ===== */
function setFanSize(size) {
  document.documentElement.style.setProperty('--fan-size', size + 'px');
}
/* пример */
setFanSize(35);   // можешь поставить 50, 80, 120 и т.д.
// ---------------------------------------------------------


// Функция для клика при нажатии на чекбокс и кнопки
const checkboxes = document.querySelectorAll('.checkboxGreen');
const but_setpoint = document.querySelectorAll('.but_setpoint');
const btn = document.querySelectorAll('.btn');
const menu_btn = document.querySelector('.menu-btn');
const set_but = document.querySelectorAll('.set_but');
const clickSound = document.getElementById('clickSound');
const clickButton = document.getElementById('clickButton');
const mic_icon = document.getElementById('mic_icon');

checkboxes.forEach(checkbox => {
  checkbox.addEventListener('change', () => {
    if (tick_sound == true) {
      clickSound.currentTime = 0;
      clickSound.play();
    }
  });
});
but_setpoint.forEach(button => {
  button.addEventListener('click', () => {
    if (tick_sound == true) {
      clickSound.currentTime = 0;
      clickButton.play();
    }
  });
});
btn.forEach(button => {
  button.addEventListener('click', () => {
    if (tick_sound == true) {
      clickSound.currentTime = 0;
      clickButton.play();
    }
  });
});
menu_btn.addEventListener('click', () => {
  if (tick_sound == true) {
    clickSound.currentTime = 0;
    clickButton.play();
  }
});

set_but.forEach(checkbox => {
  checkbox.addEventListener('click', () => {
    if (tick_sound == true) {
      clickSound.currentTime = 0;
      clickButton.play();
    }
  });
});

mic_icon.addEventListener('click', () => {
  if (tick_sound == true) {
    clickSound.currentTime = 0;
    clickButton.play();
  }
});
// -----------------------------------------------------

// ================== Основные команды ====================
const voiceCommands = [
  {
    match: (text) => /(установи(ть)?|поставь|задай|измени|поставить)\s+(температуру\s*)?(\d+[.,]?\d*)/.test(text),
    action: async (text) => {
      const match = text.match(/(установи(ть)?|поставь|задай|измени|поставить)\s+(температуру\s*)?(\d+[.,]?\d*)/);
      if (!match) return;

      let temp = match[4].replace(",", ".");
      temp = parseFloat(temp);

      // === Ограничения температуры ===
      if (temp < 18) {
        await speak("Температура не может быть ниже 18 градусов.");
        return;
      }

      if (temp > 30) {
        await speak("Температура не может быть выше 30 градусов.");
        return;
      }

      const roundedTemp = temp.toFixed(1);
      firebase.database().ref().child("Boiler/Temp/Setpoint").set(roundedTemp);
      await speak(`Температура установлена на ${roundedTemp} градусов.`);
    }

  },
  {
    match: (text) => text.includes("как дела"),
    action: async () => {
      await speak("Отлично, жду ваших указаний.");
    }
  },
  {
    match: (text) => text.includes("включи лампу в спальне"),
    action: async () => {
      firebase.database().ref().child("Leavingroomlamp").set("1");
      await speak("Окей, включаю.");
    }
  },
  {
    match: (text) => text.includes("выключи лампу в спальне"),
    action: async () => {
      firebase.database().ref().child("Leavingroomlamp").set("0");
      await speak("Окей, выключаю.");
    }
  },
  {
    match: (text) => text.includes("включи гирлянду"),
    action: async () => {
      firebase.database().ref().child("Bedroomlamp").set("1");
      await speak("Окей, включаю.");
    }
  },
  {
    match: (text) => text.includes("выключи гирлянду"),
    action: async () => {
      firebase.database().ref().child("Bedroomlamp").set("0");
      await speak("Окей, выключаю.");
    }
  },
  {
    match: (text) => text.includes("какая температура в доме"),
    action: async () => {
      await speak("средняя температура в доме," + Deviation_temp + "градусов");
    }
  },
  {
    match: (text) => text.includes("выключи микрофон"),
    action: async () => {
      await speak("Окей, выключаю микрофон.");
      isListening = false;
      recognition.stop();
      mic_State = "off";
      localStorage.setItem("mic_State", mic_State);
      togglemic(mic_State);
    }
  }
];
// -----------------------------------------------

// Инициализация распознавания речи
function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'ru-RU';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = async function (event) {
    const transcript = event.results[0][0].transcript.trim().toLowerCase();
    if (!waitingForCommand) {
      if (transcript.includes("алиса")) {
        await speak("Слушаю вас.");
        waitingForCommand = true;
        restartRecognition();
      } else {
        restartRecognition();
      }
      return;
    }
    let handled = false;
    for (const command of voiceCommands) {
      if (command.match(transcript)) {
        await command.action(transcript);
        handled = true;
        break;
      }
    }
    if (!handled) {
      await speak("Извините, я не поняла ваш запрос.");
    }
    waitingForCommand = false;
    restartRecognition();
  };
  recognition.onend = function () {
    if (isListening) {
      recognition.start();
    }
  };
}
// --------------------------------

// Перезапуск распознавания
function restartRecognition() {
  if (!recognition) return;
  recognition.abort();
  setTimeout(() => {
    if (isListening) recognition.start();
  }, 300);
}
// -------------------------

// -----------Кнопка управления--------------
const mic_but = document.getElementById('mic_but');
function togglemic(state) {
  if (state === "on") {
    mic_but.classList.add("btn-pressed");
    mic_icon.classList.remove("fa-microphone-slash");
    mic_icon.classList.add("fa-microphone");
    if (!recognition) initRecognition();
    isListening = true;
    waitingForCommand = false;
    recognition.start();
  } else {
    mic_but.classList.remove("btn-pressed");
    mic_icon.classList.remove("fa-microphone");
    mic_icon.classList.add("fa-microphone-slash");
    isListening = false;
    if (recognition) recognition.stop(); // <-- Только если уже инициализирован
  }
};

let mic_State = localStorage.getItem("mic_State") || "off";
togglemic(mic_State);

mic_icon.addEventListener("click", () => {
  mic_State = mic_State === "off" ? "on" : "off";
  localStorage.setItem("mic_State", mic_State);
  togglemic(mic_State);

  if (mic_State === "on") {
    if (sound_voice == true) {
      speak("Управление с микрофона включено");
    }
  } else {
    if (sound_voice == true) {
      speak("Управление с микрофона выключено");
    }
  }
});
// ----------------------------------------------

// ------Управление звуковым сопровождением------
const sound_but = document.getElementById('sound_but');
const sound_icon = document.getElementById('sound_icon');

function togglesound(state) {
  if (state === "on") {
    sound_but.classList.add("btn-pressed");
    sound_icon.classList.remove("fa-volume-xmark");
    sound_icon.classList.add("fa-volume-low");
    sound_voice = true;
  } else {
    sound_but.classList.remove("btn-pressed");
    sound_icon.classList.remove("fa-volume-low");
    sound_icon.classList.add("fa-volume-xmark");
    sound_voice = false;
  }
};

let sound_State = localStorage.getItem("sound_State") || "off";
togglesound(sound_State);

sound_but.addEventListener("click", () => {
  sound_State = sound_State === "off" ? "on" : "off";
  localStorage.setItem("sound_State", sound_State);
  togglesound(sound_State);

  if (sound_State === "on") {
    speak("Голосовое сопровождение, включено");
  }
});
// -----------------------------------------------

// ---------Управление звуками при нажатии--------
const tick_but = document.getElementById('tick_but');
function toggleticksound(state) {
  if (state === "on") {
    tick_but.classList.add("btn-pressed");
    tick_sound = true;
  } else {
    tick_but.classList.remove("btn-pressed");
    tick_sound = false;
  }
};

let tick_State = localStorage.getItem("tick_State") || "off";
toggleticksound(tick_State);

tick_but.addEventListener("click", () => {
  tick_State = tick_State === "off" ? "on" : "off";
  localStorage.setItem("tick_State", tick_State);
  toggleticksound(tick_State);

  if (tick_State === "on") {
    speak("Звуки при нажатии, включены");
  }
  if (tick_State === "off") {
    speak("Звуки при нажатии, выключены");
  }
});
// ---------------------------------------------

// =====================================================
// INPUTS
// =====================================================
const setNow = document.getElementById('set_now');
const setHyst = document.getElementById('set_hyst');
function changeValue(input, step, min, max, direction) {
  let value = parseFloat(input.value);
  if (isNaN(value)) value = min;
  value += step * direction;
  value = Math.min(Math.max(value, min), max);
  input.value = value.toFixed(1);
}
// temperature
function increment() {
  changeValue(setNow, 0.2, 15, 30, 1);
}
function decrement() {
  changeValue(setNow, 0.2, 15, 30, -1);
}
// hysteresis
function incr_hyst() {
  changeValue(setHyst, 0.1, 0, 3, 1);
}
function decr_hyst() {
  changeValue(setHyst, 0.1, 0, 3, -1);
}
// =====================================================
// COLORS
// =====================================================
function setTempColor(el, temp, hot = 26) {
  let color = "#00c6ff";
  if (temp > hot) color = "#ff3b3b";
  else if (temp > 22) color = "#ffaa00";
  else if (temp > 18) color = "#00ffcc";
  if (el.tagName === "text") {
    el.setAttribute("fill", color);
  } else {
    el.style.color = color;
  }
}
// =====================================================
// TEMPERATURE VARIABLES
// =====================================================
let out_temp = 0;
let temp_at_home = 0;
let temp_our_bedroom = 0;
let temp_in_bedroom = 0;
let temp_in_kitchen = 0;
// =====================================================
// DOM CACHE
// =====================================================
const tempElements = {
  home: document.getElementById("home_dev_temp"),
  room1: document.getElementById("tempC_1"),
  room2: document.getElementById("tempC_2"),
  room3: document.getElementById("tempC_3"),
  outside: document.getElementById("outside_temp"),
  bright: document.getElementById("bright_outside")
};
// =====================================================
// UPDATE TEMP
// =====================================================
function updateTemp(el, value, hot = 26) {
  if (isNaN(value)) return;
  el.textContent = value + "°C";
  setTempColor(el, value, hot);
}
// =====================================================
// FIREBASE TEMP LISTENER
// =====================================================
// средняя температура
firebase.database().ref("Boiler/Temp/Deviation").on("value", snap => {
  const val = parseFloat(snap.val());
  updateTemp(tempElements.home, val);
});
// спальня-1
firebase.database().ref("Bedroom_One/Temp/Temperature").on("value", snap => {
  const val = parseFloat(snap.val());
  updateTemp(tempElements.room1, val);
});
// спальня-2
firebase.database().ref("Bedroom_Two/Temp/Temperature").on("value", snap => {
  const val = parseFloat(snap.val());
  updateTemp(tempElements.room2, val);
});
// кухня
firebase.database().ref("Kitchen/Temp/Temperature").on("value", snap => {
  const val = parseFloat(snap.val());
  updateTemp(tempElements.room3, val);
});
// =====================================================
// OUTSIDE TEMP
// =====================================================
firebase.database()
  .ref("Outside/temp")
  .on("value", (snap) => {
    out_temp = parseFloat(snap.val());
    updateTemp(tempElements.outside, out_temp, 32);
  });
// =====================================================
// OUTSIDE BRIGHT
// =====================================================
firebase.database()
  .ref("Outside/bright")
  .on("value", (snap) => {

    const lux = Number(snap.val());

    if (isNaN(lux)) return;

    // =========================
    // TEXT %
    // =========================
    document.getElementById("luxValue").textContent =
      lux + "%";

    // =========================
    // BAR
    // =========================
    document.getElementById("luxFill").style.width =
      lux + "%";

    // =========================
    // BOX
    // =========================
    const luxBox = document.querySelector(".lux-box");

    luxBox.className = "lux-box";

    // =========================
    // STATE TEXT
    // =========================
    const stateText =
      document.getElementById("luxState");

    if (lux <= 10) {

      luxBox.classList.add("night");
      stateText.textContent = "🌙 Ночь";

    }
    else if (lux <= 40) {

      luxBox.classList.add("low");
      stateText.textContent = "🌥 Темно";

    }
    else if (lux <= 75) {

      luxBox.classList.add("day");
      stateText.textContent = "☀️ День";

    }
    else {

      luxBox.classList.add("bright");
      stateText.textContent = "🔆 Ярко";
    }
  });
// =====================================================
// VOICE
// =====================================================
function voiceTemperature(element, text, getValue) {
  element.addEventListener("click", () => {
    if (!sound_voice) return;
    speak(text + formatTemperature(getValue()));
  });
}

// heart
document.getElementById("heart")
  .addEventListener("click", () => {
    if (sound_voice) {
      speak("Привет! Люблю Тебя, Кошечка моя");
    }
  });

// temps
voiceTemperature(
  tempElements.outside,
  "Температура на улице ",
  () => out_temp
);

voiceTemperature(
  tempElements.home,
  "Средняя температура в доме ",
  () => temp_at_home
);

voiceTemperature(
  tempElements.room1,
  "Температура в спальне ",
  () => temp_our_bedroom
);

voiceTemperature(
  tempElements.room2,
  "Температура у Насти ",
  () => temp_in_bedroom
);

voiceTemperature(
  tempElements.room3,
  "Температура в гостиной ",
  () => temp_in_kitchen
);
// =====================================================
// BOILER
// =====================================================
let boiler_status = null;
let initialized = false;

firebase.database()
  .ref("Boiler/Status/Power_stat")
  .on("value", (snap) => {

    const newStatus = String(snap.val() ?? "0");

    // =========================
    // TEXT STATUS
    // =========================
    document.getElementById("boiler_stat").textContent =
      newStatus === "1"
        ? "Идет нагрев"
        : "Остановлен";

    // =========================
    // FIRST LOAD (без голоса)
    // =========================
    if (!initialized) {
      boiler_status = newStatus;
      initialized = true;
      updateFire(false);
      return;
    }

    // =========================
    // NO CHANGES
    // =========================
    if (newStatus === boiler_status) return;

    boiler_status = newStatus;
    updateFire(true);
  });


// =====================================================
// FIRE ICON
// =====================================================
function updateFire(withVoice = true) {

  const fire = document.getElementById("fire");
  const isOn = boiler_status === "1";

  fire.classList.toggle("active", isOn);
  fire.classList.toggle("inactive", !isOn);

  const text = isOn
    ? "Котел, идет нагрев"
    : "Котел, нагрев остановлен";

  if (withVoice && sound_voice) {
    speak(text);
  }
}
// -------------------------------

// DOM ЭЛЕМЕНТОВ
$(document).ready(function () {

  const db = firebase.database();
  const state = {};

  // -----------------------------
  // КЭШ DOM ЭЛЕМЕНТОВ
  // -----------------------------
  const el = {
    relay1: document.getElementById('relay1'),
    relay2: document.getElementById('relay2'),
    relay3: document.getElementById('relay3'),

    secur1: document.getElementById('secur1'),
    secur2: document.getElementById('secur2'),
    secur3: document.getElementById('secur3'),

    now_secur1: document.getElementById('now_secur1'),
    now_secur2: document.getElementById('now_secur2'),
    now_secur3: document.getElementById('now_secur3'),

    lamp1: document.getElementById("lamp_leavroom"),
    lamp2: document.getElementById("lamp_bedroom"),
    lamp3: document.getElementById("lamp_kitchen"),

    dev_temp: document.getElementById('dev_temp'),
    bedroomOne_temp: document.getElementById('bedroomOne_temp'),
    bedroomTwo_temp: document.getElementById('bedroomTwo_temp'),
    kitchen_temp: document.getElementById('kitchen_temp'),

    loader: document.getElementById("loader"),
    content: document.getElementById("content"),
    info: document.getElementById("infoContainer")
  };

  // -----------------------------
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // -----------------------------
  function setChecked(element, value) {
    const checked = value === "1";
    if (element.checked !== checked) {
      element.checked = checked;
    }
  }

  function setLamp(element, value) {
    const on = value === "1";
    element.classList.toggle('lamp_on', on);
    element.classList.toggle('lamp_off', !on);
  }

  function firebaseSet(path, value) {
    return db.ref(path).set(value);
  }

  function toggleFirebase(path, currentValue, onText, offText) {
    const newValue = currentValue === "1" ? "0" : "1";
    firebaseSet(path, newValue);
    state[path] = newValue;
    if (sound_voice === true) {
      speak(newValue === "1" ? onText : offText);
    }
  }

  function showInfoMessage(message, isError = false) {
    el.info.innerHTML = message;
    el.info.style.backgroundColor = isError ? "red" : "#4CAF50";
    el.info.classList.add("show");
    setTimeout(() => {
      el.info.classList.remove("show");
    }, 3000);
  }

  function showLoader(show) {
    if (show) {
      el.loader.style.display = "flex";
      el.content.style.display = "none";
      return;
    }
    el.loader.style.display = "none";
    el.content.style.display = "block";
    requestAnimationFrame(() => {
      el.content.style.opacity = 1;
    });
  }

  // -----------------------------
  // FIREBASE LISTENER
  // -----------------------------
  db.ref().on("value", (snap) => {
    const data = snap.val() || {};
    Object.assign(state, data);

    // ---------------- LAMPS ----------------
    setChecked(el.relay1, data.Bedroom_One?.Lamp?.Lamp_power);
    setLamp(el.lamp1, data.Bedroom_One?.Lamp?.Lamp_stat);

    setChecked(el.relay2, data.Bedroom_Two?.Lamp?.Lamp_power);
    setLamp(el.lamp2, data.Bedroom_Two?.Lamp?.Lamp_stat);

    setChecked(el.relay3, data.Kitchen?.Lamp?.power);
    setLamp(el.lamp3, data.Kitchen?.Lamp?.status);

    // ---------------- SECURITY ----------------
    setChecked(el.secur1, data.Bedroom_One?.Secur?.Secur_power);
    setChecked(el.secur2, data.Bedroom_Two?.Secur?.Secur_power);
    setChecked(el.secur3, data.Kitchen?.Secur?.Secur_power);

    // ---------------- STATUS (если есть отдельные поля) ----------------
    setChecked(el.now_secur1, data.Bedroom_One?.Secur?.Secur_stat);
    setChecked(el.now_secur2, data.Bedroom_Two?.Secur?.Secur_stat);
    setChecked(el.now_secur3, data.Kitchen?.Secur?.Secur_stat);

    // ---------------- TEMPERATURE ----------------
    setChecked(el.dev_temp, data.Boiler?.Sensor?.Dev_temp);
    setChecked(el.bedroomOne_temp, data.Boiler?.Sensor?.Bedroom_One_temp);
    setChecked(el.bedroomTwo_temp, data.Boiler?.Sensor?.Bedroom_Two_temp);
    setChecked(el.kitchen_temp, data.Boiler?.Sensor?.Kitchen_temp);

       // ----------------setpoints----------------
    setpoint = data.Boiler?.Temp?.Setpoint;
    hyst_now = data.Boiler?.Temp?.Hysteresis;

    if (!firstLoadDone) {
      firstLoadDone = true;
      showLoader(false);
    }
  });

  // -----------------------------
  // RELAYS
  // -----------------------------
  $("#relay1").click(() => {
    toggleFirebase(
      "Bedroom_One/Lamp/Lamp_power",
      state.Bedroom_One?.Lamp?.Lamp_power,
      "Лампа включена",
      "Лампа выключена"
    );
  });

  $("#relay2").click(() => {
    toggleFirebase(
      "Bedroom_Two/Lamp/Lamp_power",
      state.Bedroom_Two?.Lamp?.Lamp_power,
      "Лампа у Насти включена",
      "Лампа у Насти выключена"
    );
  });

  $("#relay3").click(() => {
    toggleFirebase(
      "Kitchen/Lamp/power",
      state.Kitchen?.Lamp?.power,
      "Лампа на кухне включена",
      "Лампа на кухне выключена"
    );
  });
  // -----------------------------
  // SECURITY
  // -----------------------------

  $("#secur1").click(() => {
    toggleFirebase(
      "Bedroom_One/Secur/Secur_power",
      state.Bedroom_One?.Secur?.Secur_power,
      "Охрана в спальне включена",
      "Охрана в спальне выключена"
    );
  });

  $("#secur2").click(() => {
    toggleFirebase(
      "Bedroom_Two/Secur/Secur_power",
      state.Bedroom_Two?.Secur?.Secur_power,
      "Охрана у Насти включена",
      "Охрана у Насти выключена"
    );
  });

  $("#secur3").click(() => {
    toggleFirebase(
      "Kitchen/Secur/Secur_power",
      state.Kitchen?.Secur?.Secur_power,
      "Охрана на кухне включена",
      "Охрана на кухне выключена"
    );
  });

  // -----------------------------
  // СОХРАНЕНИЕ ТЕМПЕРАТУРЫ
  // -----------------------------
  $("#save_but").click(() => {
    const value = document.getElementById("set_now").value;
    firebaseSet("Boiler/Temp/Setpoint", value)
      .then(() => {
        showInfoMessage("Настройки сохранены успешно");
        if (sound_voice) {
          speak("Установка температуры сохранена");
        }
      })
      .catch((err) => {
        showInfoMessage("Ошибка: " + err, true);
      });
  });

  // -----------------------------
  // СОХРАНЕНИЕ ГИСТЕРЕЗИСА
  // -----------------------------
  $("#save_hyst").click(() => {
    const value = document.getElementById("set_hyst").value;
    firebaseSet("Boiler/Temp/Hysteresis", value)
      .then(() => {
        showInfoMessage("Настройки сохранены успешно");
        if (sound_voice) {
          speak("Гистерезис сохранен");
        }
      })
      .catch((err) => {
        showInfoMessage("Ошибка: " + err, true);
      });
  });

  // -----------------------------
  // ВЫБОР ДАТЧИКА
  // -----------------------------
  function selectTempSensor(activeKey, voiceText) {

    const sensors = [
      "Dev_temp",
      "Bedroom_One_temp",
      "Bedroom_Two_temp",
      "Kitchen_temp"
    ];

    sensors.forEach(sensor => {

      const value = (sensor === activeKey) ? "1" : "0";

      firebase.database()
        .ref(`Boiler/Sensor/${sensor}`)
        .set(value, err => {
          if (err) console.log("Firebase error:", err);
        });

      state[sensor] = value;
    });

    if (sound_voice) {
      speak(voiceText);
    }
  }


  $("#dev_temp").click(() => {
    selectTempSensor(
      "Dev_temp",
      "Выбрано управление средней температурой"
    );
  });

  $("#bedroomOne_temp").click(() => {
    selectTempSensor(
      "Bedroom_One_temp",
      "Выбран датчик температуры в спальне"
    );
  });

  $("#bedroomTwo_temp").click(() => {
    selectTempSensor(
      "Bedroom_Two_temp",
      "Выбран датчик температуры у Насти"
    );
  });

  $("#kitchen_temp").click(() => {
    selectTempSensor(
      "Kitchen_temp",
      "Выбран датчик температуры на кухне"
    );
  });
});
// ------------------------------------

// ----------- WIFI SIGNALS -------------

firebase.database().ref("Boiler/Status/Wifi_level")
  .on("value", (snap) => {
    const wifi = snap.val();
    document.getElementById("boiler_wifi_value").innerHTML = `${wifi} %`;
  });

firebase.database().ref("Bedroom_One/Temp/Wifi_level")
  .on("value", (snap) => {
    const wifi = snap.val();
    document.getElementById("bedroomone_wifi_value").innerHTML = `${wifi} %`;
  });

firebase.database().ref("Bedroom_Two/Temp/Wifi_level")
  .on("value", (snap) => {
    const wifi = snap.val();
    document.getElementById("bedroomtwo_wifi_value").innerHTML = `${wifi} %`;
  });

firebase.database().ref("Kitchen/Temp/Wifi_level")
  .on("value", (snap) => {
    const wifi = snap.val();
    document.getElementById("kitchen_wifi_value").innerHTML = `${wifi} %`;
  });


// ----------- ONLINE CHECK -------------
const stat = {};
const prev = {};

const devices = {
  boiler: {
    value: document.getElementById('boiler_wifi_value'),
    status: document.getElementById('boiler_wifi_status')
  },
  leaving: {
    value: document.getElementById('leaving_wifi_value'),
    status: document.getElementById('leaving_wifi_status')
  },
  bedroom: {
    value: document.getElementById('bedroom_wifi_value'),
    status: document.getElementById('bedroom_wifi_status')
  },
  kitchen: {
    value: document.getElementById('kitchen_wifi_value'),
    status: document.getElementById('kitchen_wifi_status')
  }
};

// Получаем текущие счетчики от ESP
firebase.database().ref().on("value", snap => {
  const v = snap.val() || {};

  stat.boiler = v.Boiler?.Status?.Online_stat;
  stat.leaving = v.Bedroom_One?.Temp?.Online_stat;
  stat.bedroom = v.Bedroom_Two?.Temp?.Online_stat;
  stat.kitchen = v.Kitchen?.Temp?.Online_stat;
});

// Проверка изменения счетчиков
function updateDevice(name) {

  const current = stat[name];
  const previous = prev[name];

  const { status } = devices[name];

  if (!status) return;

  // Первое чтение
  if (previous === undefined) {
    prev[name] = current;
    return;
  }

  // Если значение изменилось → устройство онлайн
  if (current != previous) {
    status.classList.add('wifi_on');
    status.classList.remove('wifi_off');
  } else {
    status.classList.add('wifi_off');
    status.classList.remove('wifi_on');
  }

  prev[name] = current;
}

// Проверять каждые 6 секунд
setInterval(() => {
  Object.keys(devices).forEach(updateDevice);
}, 6000);
//-------------------------------------------

// ------------TIME--------------
function response_dt() {
  let dt = new Date();
  let request = new XMLHttpRequest();
  document.getElementById("time").innerHTML = dt.toLocaleTimeString();
  document.getElementById("date").innerHTML = dt.toLocaleDateString();
}
setInterval(response_dt, 1000);

// -----------Full Screen--------------
const sections = document.querySelectorAll('section');
sections.forEach(section => {
  section.addEventListener('dblclick', () => {

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }

  });
});
//-------------------------------

// ---------------QR BUTTON----------------
const qrBtn = document.getElementById("qr_but");
const qrCode = document.getElementById("qr_code");
let qrTimer = null;
let isActive = false;
qrBtn.addEventListener("click", () => {
  // если уже включено → выключаем сразу
  if (isActive) {
    hideQR();
    return;
  }
  showQR();
});

function showQR() {
  isActive = true;
  qrCode.classList.add("active");
  qrBtn.classList.add("btn-pressed");
  clearTimeout(qrTimer);
  qrTimer = setTimeout(() => {
    hideQR();
  }, 10000);
}

function hideQR() {
  isActive = false;
  qrCode.classList.remove("active");
  qrBtn.classList.remove("btn-pressed");
  clearTimeout(qrTimer);
}
//---------------------------------------

// --------------All LIGHTS BUTTON---------------
const all_lights = document.getElementById("all_lights");
const all_lights_icon = document.getElementById("all_lights_icon");

function updateAllLightsButton(isOn) {
  if (isOn) {
    all_lights.classList.add("btn-press_light");
  } else {
    all_lights.classList.remove("btn-press_light");
  }
}

let firstLoad = true;
let lastLightState = null;

firebase.database().ref().on("value", (snap) => {

  const data = snap.val() || {};

  const bedroom = data.Bedroom_One?.Lamp_power == "1";
  const leaving = data.Bedroom_Two?.Lamp?.Lamp_power == "1";
  const kitchen = data.Kitchen?.Lamp?.power == "1";

  const anyLightOn = bedroom || leaving || kitchen;

  updateAllLightsButton(anyLightOn);

  if (!firstLoad && lastLightState !== anyLightOn) {
    if (anyLightOn) {
      speak("Освещение включено");
    } else {
      speak("Освещение выключено");
    }
  }

  lastLightState = anyLightOn;
  firstLoad = false;
});

all_lights.addEventListener("click", async () => {

  const snap = await firebase.database().ref().once("value");
  const data = snap.val() || {};

  const bedroom = data.Bedroom_One?.Lamp?.Lamp_power == "1";
  const leaving = data.Bedroom_Two?.Lamp?.Lamp_power == "1";
  const kitchen = data.Kitchen?.Lamp?.status == "1";

  const anyLightOn = bedroom || leaving || kitchen;

  if (anyLightOn) {

    firebase.database().ref().update({
      "Bedroom_One/Lamp/Lamp_power": "0",
      "Bedroom_Two/Lamp/Lamp_power": "0",
      "Kitchen/Lamp/power": "0"
    });

  } else {

    firebase.database().ref().update({
      "Bedroom_One/Lamp/Lamp_power": "1",
      "Bedroom_Two/Lamp/Lamp_power": "1",
      "Kitchen/Lamp/power": "1"
    });

  }
});
//-----------------------------------------------------
