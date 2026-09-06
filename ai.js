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
      prompt.value = normalizeString(value.Prompt, "");
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

  function bindUI() {
    const enabled = getEl("aiEnabled");
    const mode = getEl("aiMode");
    const save = getEl("aiSavePrompt");
    const analyze = getEl("aiAnalyzeNow");
    const prompt = getEl("aiPrompt");

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
      setSaveState("Сохранение промпта...");

      try {
        await writeAIChild("Prompt", text);
        setSaveState("PROMPT сохранён");
      } catch (error) {
        console.error("AI Prompt write error:", error);
        setSaveState("Ошибка сохранения Prompt", true);
      } finally {
        save.disabled = false;
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
        // Cloud Function aiAnalyzeNow listens for 0 -> 1
        // and resets this value back to 0 after completion.
        await writeAIChild("AnalyzeNow", 1);

        setSaveState(
          "Запрос отправлен. Ожидаю результат..."
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
