// =====================================================
// AI HOME CONTROL -> Firebase Realtime Database /AI
// UI settings + cloud-triggered manual analysis.
// OpenAI API key is NOT stored in the browser.
// =====================================================

(function () {
  "use strict";

  const AI_PATH = "AI";

  let aiStarted = false;
  let aiRef = null;
  let lastStatus = "idle";

  // ---------------------------------------------------
  // AI PROMPT VOICE INPUT
  // Hold microphone -> speak -> release -> save + analyze.
  // ---------------------------------------------------
  let aiVoiceRecognition = null;
  let aiVoicePressed = false;
  let aiVoiceEnded = true;
  let aiVoiceTranscript = "";
  let aiVoiceFinalizing = false;

  const getEl = (id) => document.getElementById(id);

  function normalizeString(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    return String(value);
  }

  // ---------------------------------------------------
  // Firebase stores LastCheck in UTC (ISO).
  // Here we convert it to the LOCAL time of the device
  // that opens the web interface.
  // ---------------------------------------------------
  function formatLocalDateTime(value) {
    if (!value) return "---";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return normalizeString(value, "---");
    }

    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  }

  function setSaveState(message = "", isError = false) {
    const el = getEl("aiSaveState");
    if (!el) return;

    el.textContent = message;
    el.classList.toggle("error", isError);
  }

  function renderEnabled(value) {
    const enabled =
      String(value) === "1" ||
      value === 1 ||
      value === true;

    const checkbox = getEl("aiEnabled");
    const text = getEl("aiEnabledText");

    if (checkbox) checkbox.checked = enabled;
    if (text) text.textContent = enabled ? "ON" : "OFF";
  }

  function renderAnalyzeButton(statusValue, analyzeNowValue, enabledValue) {
    const button = getEl("aiAnalyzeNow");
    const buttonText = getEl("aiAnalyzeButtonText");

    if (!button || !buttonText) return;

    const status = normalizeString(statusValue, "idle")
      .trim()
      .toLowerCase();

    const triggerActive =
      String(analyzeNowValue) === "1" ||
      analyzeNowValue === 1 ||
      analyzeNowValue === true;

    const aiEnabled =
      String(enabledValue) === "1" ||
      enabledValue === 1 ||
      enabledValue === true;

    const busy =
      triggerActive ||
      ["busy", "thinking", "working", "checking"].includes(status);

    button.disabled = busy || !aiEnabled;
    button.classList.toggle("is-busy", busy);

    if (!aiEnabled) {
      buttonText.textContent = "СНАЧАЛА ВКЛЮЧИТЕ AI";
      button.title = "Включите AI переключателем выше";
    } else if (busy) {
      buttonText.textContent = "АНАЛИЗ...";
      button.title = "AI анализирует состояние квартиры";
    } else {
      buttonText.textContent = "АНАЛИЗИРОВАТЬ СЕЙЧАС";
      button.title = "Запустить новый анализ состояния квартиры";
    }
  }

  function renderStatus(value) {
    const raw = normalizeString(value, "idle").trim();
    const status = raw || "idle";

    lastStatus = status.toLowerCase();

    const text = getEl("aiStatusText");
    const dot = getEl("aiStatusDot");

    if (text) text.textContent = status.toUpperCase();
    if (!dot) return;

    dot.classList.remove("online", "error", "busy");

    if (["online", "active", "ready"].includes(lastStatus)) {
      dot.classList.add("online");
    } else if (["error", "offline", "failed"].includes(lastStatus)) {
      dot.classList.add("error");
    } else if (
      ["busy", "thinking", "working", "checking"].includes(lastStatus)
    ) {
      dot.classList.add("busy");
    }
  }

  function renderAI(data) {
    const value = data || {};

    renderEnabled(value.Enabled ?? "0");
    renderStatus(value.Status ?? "idle");
    renderAnalyzeButton(
      value.Status ?? "idle",
      value.AnalyzeNow ?? 0,
      value.Enabled ?? "0"
    );

    const mode = getEl("aiMode");
    if (mode && document.activeElement !== mode) {
      mode.value = value.Mode === "auto" ? "auto" : "advisor";
    }

    const prompt = getEl("aiPrompt");
    if (prompt && document.activeElement !== prompt) {
      prompt.value = normalizeString(
        value.Instructions ?? value.Prompt,
        ""
      );
    }

    const command = getEl("aiCommand");
    if (
      command &&
      !aiVoicePressed &&
      !aiVoiceFinalizing &&
      document.activeElement !== command
    ) {
      command.value = normalizeString(value.Command, "");
    }

    const lastCheck = getEl("aiLastCheck");
    const lastDecision = getEl("aiLastDecision");
    const lastReason = getEl("aiLastReason");

    if (lastCheck) {
      lastCheck.textContent = formatLocalDateTime(value.LastCheck);
    }

    if (lastDecision) {
      lastDecision.textContent =
        normalizeString(value.LastDecision, "").trim() || "---";
    }

    if (lastReason) {
      lastReason.textContent =
        normalizeString(value.LastReason, "").trim() || "---";
    }
  }

  async function writeAIChild(child, value) {
    if (!aiRef) {
      throw new Error("AI Firebase reference is not ready");
    }

    return aiRef.child(child).set(value);
  }

  function getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  async function savePromptAndStartAnalysis(text) {
    const prompt = getEl("aiCommand");
    const analyze = getEl("aiAnalyzeNow");
    const cleanText = normalizeString(text, "").trim();

    if (!cleanText) {
      setSaveState("Команда не распознана", true);
      return;
    }

    aiVoiceFinalizing = true;

    if (prompt) prompt.value = cleanText;

    try {
      setSaveState("Отправляю голосовую команду...");
      await writeAIChild("Command", cleanText);
      await writeAIChild("AnalyzeNow", 1);

      if (analyze) {
        analyze.disabled = true;
        analyze.classList.add("is-busy");
      }

      const buttonText = getEl("aiAnalyzeButtonText");
      if (buttonText) buttonText.textContent = "АНАЛИЗ...";

      setSaveState("Голосовая команда отправлена AI");
    } catch (error) {
      console.error("AI voice command error:", error);
      setSaveState("Ошибка отправки голосовой команды", true);
    } finally {
      aiVoiceFinalizing = false;
    }
  }

  function resetVoiceButton() {
    const button = getEl("aiVoicePrompt");
    if (!button) return;
    button.classList.remove("is-listening");
    button.removeAttribute("aria-pressed");
  }

  async function finalizeVoiceCommand() {
    if (aiVoiceFinalizing) return;

    const text = aiVoiceTranscript.trim();
    aiVoicePressed = false;
    resetVoiceButton();

    if (!text) {
      setSaveState("Не удалось распознать речь", true);
      return;
    }

    await savePromptAndStartAnalysis(text);
  }

  function createVoiceRecognition() {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) return null;

    const recognition = new Recognition();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      aiVoiceEnded = false;
      setSaveState("Говорите...");
    };

    recognition.onresult = (event) => {
      let bestText = "";

      for (let i = 0; i < event.results.length; i++) {
        const text =
          event.results[i][0]?.transcript?.trim() || "";

        if (text.length > bestText.length) {
          bestText = text;
        }
      }

      aiVoiceTranscript = bestText;

      const prompt = getEl("aiCommand");
      if (prompt) {
        prompt.value = aiVoiceTranscript;
      }
    };

    recognition.onerror = (event) => {
      const error = event?.error || "unknown";
      console.warn("AI voice recognition error:", error);

      if (error === "not-allowed" || error === "service-not-allowed") {
        setSaveState("Разрешите доступ к микрофону в браузере", true);
      } else if (error === "no-speech") {
        setSaveState("Речь не распознана", true);
      } else if (error !== "aborted") {
        setSaveState("Ошибка распознавания речи", true);
      }
    };

    recognition.onend = async () => {
      aiVoiceEnded = true;
      if (!aiVoicePressed) await finalizeVoiceCommand();
    };

    return recognition;
  }

  function startVoicePrompt(event) {
    const button = getEl("aiVoicePrompt");
    const prompt = getEl("aiCommand");

    if (!button || aiVoicePressed || aiVoiceFinalizing) return;

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setSaveState("Голосовой ввод не поддерживается этим браузером", true);
      return;
    }

    event?.preventDefault?.();

    // Every new press starts a new command and clears the previous prompt.
    aiVoiceTranscript = "";
    if (prompt) prompt.value = "";

    aiVoicePressed = true;
    aiVoiceEnded = false;
    button.classList.add("is-listening");
    button.setAttribute("aria-pressed", "true");

    try {
      if (event?.pointerId !== undefined && button.setPointerCapture) {
        button.setPointerCapture(event.pointerId);
      }
    } catch (_) {}

    try {
      aiVoiceRecognition = createVoiceRecognition();
      aiVoiceRecognition.start();
    } catch (error) {
      console.error("AI voice start error:", error);
      aiVoicePressed = false;
      aiVoiceEnded = true;
      resetVoiceButton();
      setSaveState("Не удалось включить микрофон", true);
    }
  }

  async function stopVoicePrompt(event) {
    if (!aiVoicePressed) return;

    event?.preventDefault?.();
    aiVoicePressed = false;
    resetVoiceButton();

    try {
      if (aiVoiceRecognition && !aiVoiceEnded) {
        aiVoiceRecognition.stop();
        return;
      }
    } catch (error) {
      console.warn("AI voice stop error:", error);
    }

    await finalizeVoiceCommand();
  }

  function bindVoicePrompt() {
    const button = getEl("aiVoicePrompt");
    if (!button) return;

    if (!getSpeechRecognitionConstructor()) {
      button.disabled = true;
      button.title = "Голосовой ввод не поддерживается этим браузером";
      return;
    }

    button.addEventListener("pointerdown", startVoicePrompt);
    button.addEventListener("pointerup", stopVoicePrompt);
    button.addEventListener("pointercancel", stopVoicePrompt);
    button.addEventListener("contextmenu", (event) => event.preventDefault());

    button.addEventListener("keydown", (event) => {
      if ((event.code === "Space" || event.code === "Enter") && !event.repeat) {
        startVoicePrompt(event);
      }
    });

    button.addEventListener("keyup", (event) => {
      if (event.code === "Space" || event.code === "Enter") {
        stopVoicePrompt(event);
      }
    });
  }

  function bindUI() {
    const enabled = getEl("aiEnabled");
    const mode = getEl("aiMode");
    const save = getEl("aiSavePrompt");
    const analyze = getEl("aiAnalyzeNow");
    const prompt = getEl("aiPrompt");
    const command = getEl("aiCommand");
    const sendCommand = getEl("aiSendCommand");

    bindVoicePrompt();

    enabled?.addEventListener("change", async () => {
      const value = enabled.checked ? "1" : "0";

      renderEnabled(value);
      renderAnalyzeButton(lastStatus, 0, value);

      setSaveState("Сохранение...");

      try {
        await writeAIChild("Enabled", value);

        setSaveState(
          enabled.checked
            ? "AI включён"
            : "AI выключен"
        );
      } catch (error) {
        console.error("AI Enabled write error:", error);
        setSaveState("Ошибка записи Enabled", true);
      }
    });

    mode?.addEventListener("change", async () => {
      setSaveState("Сохранение режима...");

      try {
        await writeAIChild(
          "Mode",
          mode.value === "auto" ? "auto" : "advisor"
        );

        setSaveState(`Режим: ${mode.value.toUpperCase()}`);
      } catch (error) {
        console.error("AI Mode write error:", error);
        setSaveState("Ошибка записи Mode", true);
      }
    });

    save?.addEventListener("click", async () => {
      const text = prompt?.value ?? "";

      save.disabled = true;
      setSaveState("Сохранение инструкций...");

      try {
        await writeAIChild("Instructions", text);
        setSaveState("INSTRUCTIONS сохранены");
      } catch (error) {
        console.error("AI Prompt write error:", error);
        setSaveState("Ошибка сохранения Prompt", true);
      } finally {
        save.disabled = false;
      }
    });

    sendCommand?.addEventListener("click", async () => {
      const text = normalizeString(command?.value, "").trim();

      if (!text) {
        setSaveState("Введите команду", true);
        command?.focus();
        return;
      }

      sendCommand.disabled = true;
      setSaveState("Отправляю команду...");

      try {
        await writeAIChild("Command", text);
        await writeAIChild("AnalyzeNow", 1);
        setSaveState("Команда отправлена AI");
      } catch (error) {
        console.error("AI Command write error:", error);
        setSaveState("Ошибка отправки команды", true);
      } finally {
        sendCommand.disabled = false;
      }
    });

    analyze?.addEventListener("click", async () => {
      if (analyze.disabled) return;

      analyze.disabled = true;
      analyze.classList.add("is-busy");

      const buttonText = getEl("aiAnalyzeButtonText");

      if (buttonText) {
        buttonText.textContent = "ЗАПУСК...";
      }

      setSaveState("Запускаю AI-анализ...");

      try {
        // Analyze the permanent instructions only.
        // Save current text first, and clear any one-shot command.
        await writeAIChild("Instructions", prompt?.value ?? "");
        await writeAIChild("Command", "");

        // Cloud Function aiAnalyzeNow listens for 0 -> 1
        // and resets this value back to 0 after completion.
        await writeAIChild("AnalyzeNow", 1);

        setSaveState(
          "Инструкции отправлены на анализ..."
        );
      } catch (error) {
        console.error("AI AnalyzeNow write error:", error);

        analyze.disabled = false;
        analyze.classList.remove("is-busy");

        if (buttonText) {
          buttonText.textContent = "АНАЛИЗИРОВАТЬ СЕЙЧАС";
        }

        setSaveState("Ошибка запуска анализа", true);
      }
    });
  }

  function startAIControl() {
    if (aiStarted) return;

    if (
      typeof firebase === "undefined" ||
      typeof firebase.database !== "function"
    ) {
      console.error(
        "AI Control: Firebase Database SDK is not available"
      );

      setSaveState("Firebase недоступен", true);
      return;
    }

    aiStarted = true;
    aiRef = firebase.database().ref(AI_PATH);

    bindUI();

    aiRef.on(
      "value",
      (snapshot) => {
        renderAI(snapshot.val());
      },
      (error) => {
        console.error("AI Firebase read error:", error);

        renderStatus("error");
        setSaveState("Нет доступа к /AI", true);
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startAIControl
    );
  } else {
    startAIControl();
  }
})();
