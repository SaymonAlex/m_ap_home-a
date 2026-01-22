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

// При клике на кнопку обновления
update_app.onclick = () => {
  window.location.reload(); // перезагрузка страницы и активация нового SW
  speak("Приложение обновлено");
};

// --- Тут твой код управления LED и температурой ---

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// ---------------------Sound assistant Speak-------------------
let utterance = null;
var tick_sound = true;
var sound_voice = true;
let menuAutoCloseTimer = null;


function speak(text) {
  if (!sound_voice) return;
  speechSynthesis.cancel();
  utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

const container = document.querySelector('.progress');
container.addEventListener("click", () => {
  closeNav();
});

function openNav() {
  const nav = document.getElementById("mySidenav");
  if (!nav) return;
  nav.style.width = "250px";
  document.getElementById('set_now').value = `${setpoint}`;
  document.getElementById('set_hyst').value = `${hyst_now}`;
  startMenuAutoClose();
}
function closeNav() {
  const nav = document.getElementById("mySidenav");
  if (!nav) return;
  nav.style.width = "0";
  stopMenuAutoClose();
}

function startMenuAutoClose() {
  stopMenuAutoClose(); // на всякий случай
  menuAutoCloseTimer = setTimeout(() => {
    closeNav();
  }, 15000); // 30 секунд
}

function stopMenuAutoClose() {
  if (menuAutoCloseTimer) {
    clearTimeout(menuAutoCloseTimer);
    menuAutoCloseTimer = null;
  }
}

var counterInput = document.getElementById('set_now');
const MIN_SET = 15;
const MAX_SET = 30;
const STEP_SET = 0.2;

// Функция для увеличения значения на 0.5
function increment() {
  let v = parseFloat(counterInput.value);
  if (isNaN(v)) v = MIN_SET;
  v = Math.min(v + STEP_SET, MAX_SET);
  counterInput.value = v.toFixed(1);
}

// Функция для уменьшения значения на 0.5
function decrement() {
  let v = parseFloat(counterInput.value);
  if (isNaN(v)) v = MIN_SET;
  v = Math.max(v - STEP_SET, MIN_SET);
  counterInput.value = v.toFixed(1);
}

var counterHyst = document.getElementById('set_hyst');
const HYST_MIN = 0;
const HYST_MAX = 3;
const HYST_STEP = 0.1;

// Функция для увеличения значения на 0.1
function incr_hyst() {
  let v = parseFloat(counterHyst.value);
  if (isNaN(v)) v = HYST_MIN;

  v = Math.min(v + HYST_STEP, HYST_MAX);
  counterHyst.value = v.toFixed(1);
}

// Функция для уменьшения значения на 0.1
function decr_hyst() {
  let v = parseFloat(counterHyst.value);
  if (isNaN(v)) v = HYST_MIN;

  v = Math.max(v - HYST_STEP, HYST_MIN);
  counterHyst.value = v.toFixed(1);
}

// Функция для клика при нажатии на чекбокс и кнопки
const checkboxes = document.querySelectorAll('.checkboxGreen');
const but_setpoint = document.querySelectorAll('.but_setpoint');
const menu_top_but = document.querySelector('.menu_top_but');
const closebtn = document.querySelector('.closebtn');
const set_but = document.querySelectorAll('.set_but');
const snow_animation = document.querySelector('.snow_animation');
const sound_pictures = document.querySelectorAll('.sound_picture');
const clickSound = document.getElementById('clickSound');
const clickButton = document.getElementById('clickButton');
const mic_but = document.getElementById('mic_icon');

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
menu_top_but.addEventListener('click', () => {
  if (tick_sound == true) {
    clickSound.currentTime = 0;
    clickButton.play();
  }
  });
closebtn.addEventListener('click', () => {
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
snow_animation.addEventListener('click', () => {
  if (tick_sound == true) {
    clickSound.currentTime = 0;
    clickButton.play();
  }
});
sound_pictures.forEach(button => {
  button.addEventListener('click', () => {
    if (tick_sound == true) {
      clickSound.currentTime = 0;
      clickButton.play();
    }
  });
});
mic_but.addEventListener('click', () => {
  if (tick_sound == true) {
    clickSound.currentTime = 0;
    clickButton.play();
  }
});


$(document).ready(function () {
  let database = firebase.database();
  let Leavingroomlamp;
  let Leavroomlampstat;
  let Leavingroomsecur;
  let Leavroomsecurstat;

  let Bedroomlamp;
  let Bedroomlampstat;
  let Bedroomsecur;
  let Bedroomsecurstat;

  let Kitchenlamp;
  let Kitchenlampstat;
  let Kitchensecur;
  let Kitchensecurstat;

  let HeaterSetpoint;
  let Hysteresis;
  let Boiler_status;

  let Dev_temp;
  let Living_temp;
  let Bedroom_temp;
  let Kitchen_temp;

  database.ref().on("value", function (snap) {
    Leavingroomlamp = snap.val().Leavingroomlamp;
    Leavroomlampstat = snap.val().Leavroomlampstat;
    Leavingroomsecur = snap.val().Leavingroomsecur;
    Leavroomsecurstat = snap.val().Leavroomsecurstat;

    Bedroomlamp = snap.val().Bedroomlamp;
    Bedroomlampstat = snap.val().Bedroomlampstat;
    Bedroomsecur = snap.val().Bedroomsecur;
    Bedroomsecurstat = snap.val().Bedroomsecurstat;

    Kitchenlamp = snap.val().Kitchenlamp;
    Kitchenlampstat = snap.val().Kitchenlampstat;
    Kitchensecur = snap.val().Kitchensecur;
    Kitchensecurstat = snap.val().Kitchensecurstat;

    HeaterSetpoint = snap.val().HeaterSetpoint;
    setpoint = HeaterSetpoint;
    Hysteresis = snap.val().Hysteresis;
    hyst_now = Hysteresis;

    Dev_temp = snap.val().Dev_temp;
    Living_temp = snap.val().Living_temp;
    Bedroom_temp = snap.val().Bedroom_temp;
    Kitchen_temp = snap.val().Kitchen_temp;

    Boiler_status = snap.val().Boiler_status;

    if (Leavingroomlamp == "1") {
      document.getElementById('relay1').checked = 1;
    } else {
      document.getElementById('relay1').checked = 0;
    }
    if (Leavroomlampstat == "1") {
      document.getElementById("lamp_leavroom").classList.remove('lamp_off');
      document.getElementById("lamp_leavroom").classList.add('lamp_on');
    } else {
      document.getElementById("lamp_leavroom").classList.remove('lamp_on');
      document.getElementById("lamp_leavroom").classList.add('lamp_off');
    }
    if (Leavingroomsecur == "1") {
      document.getElementById('secur1').checked = 1;
    } else {
      document.getElementById('secur1').checked = 0;
    }
    if (Leavroomsecurstat == "1") {
      document.getElementById('now_secur1').checked = 1;
    } else {
      document.getElementById('now_secur1').checked = 0;
    }

    if (Bedroomlamp == "1") {
      document.getElementById('relay2').checked = 1;
    } else {
      document.getElementById('relay2').checked = 0;
    }
    if (Bedroomlampstat == "1") {
      document.getElementById("lamp_bedroom").classList.remove('lamp_off');
      document.getElementById("lamp_bedroom").classList.add('lamp_on');
    } else {
      document.getElementById("lamp_bedroom").classList.remove('lamp_on');
      document.getElementById("lamp_bedroom").classList.add('lamp_off');
    }
    if (Bedroomsecur == "1") {
      document.getElementById('secur2').checked = 1;
    } else {
      document.getElementById('secur2').checked = 0;
    }
    if (Bedroomsecurstat == "1") {
      document.getElementById('now_secur2').checked = 1;
    } else {
      document.getElementById('now_secur2').checked = 0;
    }

    if (Kitchenlamp == "1") {
      document.getElementById('relay3').checked = 1;
    } else {
      document.getElementById('relay3').checked = 0;
    }
    if (Kitchenlampstat == "1") {
      document.getElementById("lamp_kitchen").classList.remove('lamp_off');
      document.getElementById("lamp_kitchen").classList.add('lamp_on');
    } else {
      document.getElementById("lamp_kitchen").classList.remove('lamp_on');
      document.getElementById("lamp_kitchen").classList.add('lamp_off');
    }
    if (Kitchensecur == "1") {
      document.getElementById('secur3').checked = 1;
    } else {
      document.getElementById('secur3').checked = 0;
    }
    if (Kitchensecurstat == "1") {
      document.getElementById('now_secur3').checked = 1;
    } else {
      document.getElementById('now_secur3').checked = 0;
    }

    if (Dev_temp == "1") {
      document.getElementById('dev_temp').checked = 1;
    } else {
      document.getElementById('dev_temp').checked = 0;
    }
    if (Living_temp == "1") {
      document.getElementById('living_temp').checked = 1;
    } else {
      document.getElementById('living_temp').checked = 0;
    }
    if (Bedroom_temp == "1") {
      document.getElementById('bedroom_temp').checked = 1;
    } else {
      document.getElementById('bedroom_temp').checked = 0;
    }
    if (Kitchen_temp == "1") {
      document.getElementById('kitchen_temp').checked = 1;
    } else {
      document.getElementById('kitchen_temp').checked = 0;
    }
    if (Boiler_status == "1") {
      document.getElementById("boiler_stat").textContent = ('Идет Нагрев');
    } else {
      document.getElementById("boiler_stat").textContent = ('Остановлен');
    }

    if (!firstLoadDone) {
      firstLoadDone = true;
      showLoader(false);
    }
  });

  function showLoader(state) {
    const loader = document.getElementById("loader");
    const content = document.getElementById("content");

    if (state) {
      loader.style.display = "flex";
      content.style.display = "none";
      content.style.opacity = 0;
    } else {
      loader.style.display = "none";
      content.style.display = "block";

      requestAnimationFrame(() => {
        content.style.opacity = 1;
      });
    }
  }

  $("#relay1").click(function () {
    let firebaseRef = firebase.database().ref().child("Leavingroomlamp");
    if (Leavingroomlamp == "1") {
      firebaseRef.set("0");
      Leavingroomlamp = "0";
      if (sound_voice == true) {
      speak("Лампа в спальне выключена");
      }
    } else {
      firebaseRef.set("1");
      Leavingroomlamp = "1";
      if (sound_voice == true) {
      speak("Лампа в спальне включена");
      }
    }
  })

  $("#secur1").click(function () {
    let firebaseRef = firebase.database().ref().child("Leavingroomsecur");
    if (Leavingroomsecur == "1") {
      firebaseRef.set("0");
      Leavingroomsecur = "0";
      if (sound_voice == true) {
      speak("Охрана в спальне, выключена");
      }
    } else {
      firebaseRef.set("1");
      Leavingroomsecur = "1";
      if (sound_voice == true) {
      speak("Охрана в спальне, включена");
      }
    }
  })

  $("#relay2").click(function () {
    let firebaseRef = firebase.database().ref().child("Bedroomlamp");
    if (Bedroomlamp == "1") {
      firebaseRef.set("0");
      Bedroomlamp = "0";
      if (sound_voice == true) {
      speak("Лампа у Насти, выключена");
      }
    } else {
      firebaseRef.set("1");
      Bedroomlamp = "1";
      if (sound_voice == true) {
      speak("Лампа у Насти, включена");
      }
    }
  })

  $("#secur2").click(function () {
    let firebaseRef = firebase.database().ref().child("Bedroomsecur");
    if (Bedroomsecur == "1") {
      firebaseRef.set("0");
      Bedroomsecur = "0";
      if (sound_voice == true) {
      speak("Охрана у Насти, выключена");
      }
    } else {
      firebaseRef.set("1");
      Bedroomsecur = "1";
      if (sound_voice == true) {
      speak("Охрана у Насти, включена");
      }
    }
  })

  $("#relay3").click(function () {
    let firebaseRef = firebase.database().ref().child("Kitchenlamp");
    if (Kitchenlamp == "1") {
      firebaseRef.set("0");
      Kitchenlamp = "0";
      if (sound_voice == true) {
      speak("Лампа на кухне, выключена");
      }
    } else {
      firebaseRef.set("1");
      Kitchenlamp = "1";
      if (sound_voice == true) {
      speak("Лампа на кухне, включена");
      }
    }
  })

  $("#secur3").click(function () {
    let firebaseRef = firebase.database().ref().child("Kitchensecur");
    if (Kitchensecur == "1") {
      firebaseRef.set("0");
      Kitchensecur = "0";
      if (sound_voice == true) {
      speak("Охрана на кухне, выключена");
      }
    } else {
      firebaseRef.set("1");
      Kitchensecur = "1";
      if (sound_voice == true) {
      speak("Охрана на кухне, включена");
      }
    }
  })

  // установка температуры
  $("#save_but").click(function () {
    const set_value = document.getElementById("set_now").value;
    let firebaseRef = firebase.database().ref().child("HeaterSetpoint");
    firebaseRef.set(set_value)
      .then(() => {
        showInfoMessage("Настройки сохранены успешно");
        if (sound_voice == true) {
        speak("Установка температуры, сохранена успешно");
        }
      })
      .catch((error) => {
        showInfoMessage("Ошибка при сохранении" + error, true);
      });
    function showInfoMessage(message, isError = false) {
      const infoContainer = document.getElementById("infoContainer");
      infoContainer.innerHTML = message;

      if (isError) {
        infoContainer.style.backgroundColor = "red";
      } else {
        infoContainer.style.backgroundColor = "#4CAF50";
      }
      infoContainer.style.display = "block";

      setTimeout(() => {
        infoContainer.style.display = "none";
      }, 3000); // Скрыть информер через 3 секунды
    }
  })

  // Гистерезис
  $("#save_hyst").click(function () {
    const set_hyst = document.getElementById("set_hyst").value;
    let firebaseRef = firebase.database().ref().child("Hysteresis");
    firebaseRef.set(set_hyst)
      .then(() => {
        showInfoMessage("Настройки сохранены успешно");
        if (sound_voice == true) {
        speak("Установка гистерезиса, сохранена успешно");
        }
      })
      .catch((error) => {
        showInfoMessage("Ошибка при сохранении" + error, true);
      });
    function showInfoMessage(message, isError = false) {
      const infoContainer = document.getElementById("infoContainer");
      infoContainer.innerHTML = message;

      if (isError) {
        infoContainer.style.backgroundColor = "red";
      } else {
        infoContainer.style.backgroundColor = "#4CAF50";
      }
      infoContainer.style.display = "block";

      setTimeout(() => {
        infoContainer.style.display = "none";
      }, 3000); // Скрыть информер через 3 секунды
    }
  });

  $("#dev_temp").click(function () {
    let firebaseRef1 = firebase.database().ref().child("Dev_temp");
    let firebaseRef2 = firebase.database().ref().child("Living_temp");
    let firebaseRef3 = firebase.database().ref().child("Bedroom_temp");
    let firebaseRef4 = firebase.database().ref().child("Kitchen_temp");
    if (Dev_temp == "1") {
      firebaseRef1.set("0");
      Dev_temp = "0";
    } else {
      firebaseRef1.set("1");
      Dev_temp = "1";
      firebaseRef2.set("0");
      Living_temp = "0";
      firebaseRef3.set("0");
      Bedroom_temp = "0";
      firebaseRef4.set("0");
      Kitchen_temp = "0";
      if (sound_voice == true) {
      speak("Выбрано управление, средней температурой");
      }
    }
  })

  $("#living_temp").click(function () {
    let firebaseRef1 = firebase.database().ref().child("Dev_temp");
    let firebaseRef2 = firebase.database().ref().child("Living_temp");
    let firebaseRef3 = firebase.database().ref().child("Bedroom_temp");
    let firebaseRef4 = firebase.database().ref().child("Kitchen_temp");
    if (Living_temp == "1") {
      firebaseRef2.set("0");
      Living_temp = "0";
    } else {
      firebaseRef2.set("1");
      Living_temp = "1";
      firebaseRef1.set("0");
      Dev_temp = "0";
      firebaseRef3.set("0");
      Bedroom_temp = "0";
      firebaseRef4.set("0");
      Kitchen_temp = "0";
      if (sound_voice == true) {
      speak("Выбран датчик, температуры в спальне");
      }
    }
  })

  $("#bedroom_temp").click(function () {
    let firebaseRef1 = firebase.database().ref().child("Dev_temp");
    let firebaseRef2 = firebase.database().ref().child("Living_temp");
    let firebaseRef3 = firebase.database().ref().child("Bedroom_temp");
    let firebaseRef4 = firebase.database().ref().child("Kitchen_temp");
    if (Bedroom_temp == "1") {
      firebaseRef3.set("0");
      Bedroom_temp = "0";
    } else {
      firebaseRef3.set("1");
      Bedroom_temp = "1";
      firebaseRef1.set("0");
      Dev_temp = "0";
      firebaseRef2.set("0");
      Living_temp = "0";
      firebaseRef4.set("0");
      Kitchen_temp = "0";
      if (sound_voice == true) {
      speak("Выбран датчик, температуры у Насти");
      }
    }
  })

  $("#kitchen_temp").click(function () {
    let firebaseRef1 = firebase.database().ref().child("Dev_temp");
    let firebaseRef2 = firebase.database().ref().child("Living_temp");
    let firebaseRef3 = firebase.database().ref().child("Bedroom_temp");
    let firebaseRef4 = firebase.database().ref().child("Kitchen_temp");
    if (Kitchen_temp == "1") {
      firebaseRef4.set("0");
      Kitchen_temp = "0";
    } else {
      firebaseRef4.set("1");
      Kitchen_temp = "1";
      firebaseRef1.set("0");
      Dev_temp = "0";
      firebaseRef2.set("0");
      Living_temp = "0";
      firebaseRef3.set("0");
      Bedroom_temp = "0";
      if (sound_voice == true) {
      speak("Выбран датчик, температуры на кухне");
      }
    }
  })
});

// Температуры
let datacheck = firebase.database();
let Leavingroom_temp;
let Bedroom_temp;
let Kitchen_temp;
let Outside_temp;
let Deviation_temp;
const out_side_offset = -4;
datacheck.ref().on("value", function (snap) {
  Leavingroom_temp = snap.val().Templeavingroom;
  Bedroom_temp = snap.val().Tempbedroom;
  Kitchen_temp = snap.val().Tempkitchen;
  Outside_temp = (parseFloat(snap.val().Outside_temp) + out_side_offset).toFixed(1);
  Deviation_temp = snap.val().Deviation_temp;
  document.getElementById("tempC_1").innerHTML = `${Leavingroom_temp}`;
  document.getElementById("tempC_2").innerHTML = `${Bedroom_temp}`;
  document.getElementById("tempC_3").innerHTML = `${Kitchen_temp}`;
  document.getElementById("outside_temp").innerHTML = `${Outside_temp}`;
  document.getElementById("devhome_temp").innerHTML = `${Deviation_temp}`;

});

//  Сигналы WI-FI
let wifilevels = firebase.database();
let wifi_boiler;
let wifi_leavingroom;
let wifi_bedroom;
let wifi_kitchen;
wifilevels.ref().on("value", function (snap) {
  wifi_boiler = snap.val().WifiBoiler;
  wifi_leavingroom = snap.val().WifiLeavingroom;
  wifi_bedroom = snap.val().WifiBedroom;
  wifi_kitchen = snap.val().WifiKitchen;
  document.getElementById("boiler_wifi_value").innerHTML = `${wifi_boiler} %`;
  document.getElementById("leaving_wifi_value").innerHTML = `${wifi_leavingroom} %`;
  document.getElementById("bedroom_wifi_value").innerHTML = `${wifi_bedroom} %`;
  document.getElementById("kitchen_wifi_value").innerHTML = `${wifi_kitchen} %`;
});


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

// Озвучка температуры
const talk_heart = document.getElementById("heart");
talk_heart.addEventListener("click", () => {
  if (sound_voice == true) {
  speak("Привет! Люблю Тебя, Кошечка моя");
  }
});

document.querySelector("#tempC_1").addEventListener("click", () => {
  if (sound_voice) {
    speak("Температура в спальне " + formatTemperature(Leavingroom_temp));
  }
});

document.querySelector("#tempC_2").addEventListener("click", () => {
  if (sound_voice) {
    speak("Температура у Насти " + formatTemperature(Bedroom_temp));
  }
});

document.querySelector("#tempC_3").addEventListener("click", () => {
  if (sound_voice) {
    speak("Температура в гостиной " + formatTemperature(Kitchen_temp));
  }
});

document.querySelector("#outside_temp").addEventListener("click", () => {
  if (sound_voice) {
    speak("Температура на улице " + formatTemperature(Outside_temp));
  }
});

document.querySelector("#devhome_temp").addEventListener("click", () => {
  if (sound_voice) {
    speak("Средняя температура в доме " + formatTemperature(Deviation_temp));
  }
});

// -----------Full Screen--------------
const full_screen = document.querySelector('.progress');
full_screen.addEventListener('dblclick', () => {
  if (document.documentElement.requestFullscreen) {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Errror ${err}`);
      });
    } else {
      document.exitFullscreen();
    }
  }
});

function response_dt() {
  let dt = new Date();
  let request = new XMLHttpRequest();
  document.getElementById("time").innerHTML = dt.toLocaleTimeString();
  document.getElementById("date").innerHTML = dt.toLocaleDateString();
}
setInterval(response_dt, 500);



const numberOfSnowflakes = 80;

for (let i = 0; i < numberOfSnowflakes; i++) {
  createSnowflake();
}

function createSnowflake() {
  const snowflake = document.createElement('img');
  snowflake.src = 'snowflake.png';
  snowflake.className = 'snowflake';
  document.querySelector('.snowflakes').appendChild(snowflake);

  const size = Math.random() * 15 + 14 + 'px';
  snowflake.style.width = size;
  snowflake.style.height = size;

  const animationDuration = Math.random() * 12 + 11 + 's';
  snowflake.style.animationDuration = animationDuration;

  snowflake.style.left = Math.random() * window.innerWidth + 'px';
  snowflake.style.opacity = Math.random();

  snowflake.style.animationName = 'falling';
  snowflake.style.animationTimingFunction = 'linear';
  snowflake.style.animationIterationCount = 'infinite';

  // Добавляем стили через создание нового style элемента
  const keyframes = `@keyframes falling {
        0% {
            transform: translateY(0) translateX(0) rotate(0deg);
        }
        50% {
            transform: translateY(100vh) translateX(${Math.random() > 0.9 ? '-' : ''}${Math.random() * 50}px) rotate(360deg);
        }
        100% {
            transform: translateY(100vh) translateX(${Math.random() > 0.9 ? '-' : ''}${Math.random() * 100}px) rotate(360deg);
        }
    }`;

  const style = document.createElement('style');
  style.appendChild(document.createTextNode(keyframes));
  document.head.appendChild(style);

  snowflake.style.animationDuration = animationDuration;
}

(async () => {
  let snow = document.getElementById('snow_animate');
  let anim_snow = document.getElementById('anim_icon');
  if (localStorage.getItem('theme') == "true") {
    snow.classList.remove('nosnowflakes');
    snow.classList.add('snowflakes');
    anim_snow.classList.remove('snow_picture');
    anim_snow.classList.add('animsnow_picture');
  } else {
    snow.classList.remove('snowflakes');
    snow.classList.add('nosnowflakes');
    anim_snow.classList.remove('animsnow_picture');
    anim_snow.classList.add('snow_picture');
  }
})();

function togglesnow() {
  let snow = document.getElementById('snow_animate');
  let anim_snow = document.getElementById('anim_icon');
  if (snow.classList.contains('snowflakes')) {
    localStorage.setItem('theme', false);
    snow.classList.remove('snowflakes');
    snow.classList.add('nosnowflakes');
    anim_snow.classList.remove('animsnow_picture');
    anim_snow.classList.add('snow_picture');
    if (sound_voice == true) {
    speak("Анимация снежинок выключена");
    }
  } else {
    localStorage.setItem('theme', true);
    snow.classList.remove('nosnowflakes');
    snow.classList.add('snowflakes');
    anim_snow.classList.remove('snow_picture');
    anim_snow.classList.add('animsnow_picture');
    if (sound_voice == true) {
    speak("Анимация снежинок включена");
    }
  }
};

// Управление с помощью микрофона
let isListening = false;
let recognition;
let waitingForCommand = false;


// === Основные команды ===
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
      firebase.database().ref().child("HeaterSetpoint").set(roundedTemp);
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

// Перезапуск распознавания
function restartRecognition() {
  if (!recognition) return;
  recognition.abort();
  setTimeout(() => {
    if (isListening) recognition.start();
  }, 300);
}

// Кнопка управления
const mic_icon = document.getElementById('mic_icon');
function togglemic(state) {
  if (state === "on") {
    mic_icon.src = "mic_on.png"; // Путь к включённой иконке
    if (!recognition) initRecognition();
    isListening = true;
    waitingForCommand = false;
    recognition.start();
  } else {
    mic_icon.src = "mic_off.png"; // Путь к выключенной иконке
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

// Управление звуковым сопровождением
const sound_icon = document.getElementById('sound_icon');

function togglesound(state) {
  if (state === "on") {
    sound_icon.src = "Sound_on.png"; // Путь к включённой иконке
    sound_voice = true;
  } else {
    sound_icon.src = "Sound_off.png"; // Путь к выключенной иконке
    sound_voice = false;
  }
};

let sound_State = localStorage.getItem("sound_State") || "off";
togglesound(sound_State);

sound_icon.addEventListener("click", () => {
  sound_State = sound_State === "off" ? "on" : "off";
  localStorage.setItem("sound_State", sound_State);
  togglesound(sound_State);

  if (sound_State === "on") {
    speak("Голосовое сопровождение, включено");
  }
});

// Управление звуками при нажатии
const ticksnd_icon = document.getElementById('tick_icon');
function toggleticksound(state) {
  if (state === "on") {
    ticksnd_icon.src = "Sound_on.png"; // Путь к включённой иконке
    tick_sound = true;
  } else {
    ticksnd_icon.src = "Sound_off.png"; // Путь к выключенной иконке
    tick_sound = false;
  }
};

let tick_State = localStorage.getItem("tick_State") || "off";
toggleticksound(tick_State);

ticksnd_icon.addEventListener("click", () => {
  tick_State = tick_State === "off" ? "on" : "off";
  localStorage.setItem("tick_State", tick_State);
  toggleticksound(tick_State);

  if (tick_State === "on") {
    speak("Звуки при нажатии, включены");
  }
});


const units_status = firebase.database();

const stat = {};
const prev = {};

units_status.ref().on("value", snap => {
  const v = snap.val();
  stat.boiler = v.StatusBoiler;
  stat.leaving = v.StatusLeavingroom;
  stat.bedroom = v.StatusBedroom;
  stat.kitchen = v.StatusKitchen;
});

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

function updateDevice(name) {
  const isSame = stat[name] === prev[name];
  const { value, status } = devices[name];

  value.classList.toggle('wifi_value_on', !isSame);
  value.classList.toggle('wifi_value_off', isSame);

  status.classList.toggle('wifi_on', !isSame);
  status.classList.toggle('wifi_off', isSame);

  prev[name] = stat[name];
}

function status_device() {
  Object.keys(devices).forEach(updateDevice);
}

setInterval(status_device, 6000);