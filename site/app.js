const languageButton = document.querySelector("[data-language]");
let currentLanguage = localStorage.getItem("btveai-language") || "en";

function applyLanguage(language) {
  currentLanguage = language;
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-en][data-zh]").forEach((element) => {
    element.textContent = element.dataset[language];
  });
  document.querySelectorAll("[data-placeholder-en][data-placeholder-zh]").forEach((element) => {
    element.placeholder = element.dataset[language === "zh" ? "placeholderZh" : "placeholderEn"];
  });
  if (languageButton) languageButton.textContent = language === "en" ? "ä¸­æ–‡" : "EN";
  localStorage.setItem("btveai-language", language);
  window.dispatchEvent(new CustomEvent("btveai:language", { detail: language }));
}

languageButton?.addEventListener("click", () => applyLanguage(currentLanguage === "en" ? "zh" : "en"));
applyLanguage(currentLanguage);

const VOTE_KEY = "btveai-daily-browser-votes-v1";
const dayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function readVoteHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(VOTE_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function renderBrowserVote() {
  const bitcoinButton = document.querySelector('[data-vote="bitcoin"]');
  const aiButton = document.querySelector('[data-vote="ai"]');
  if (!bitcoinButton || !aiButton) return;

  const history = readVoteHistory();
  const choices = Object.values(history);
  const bitcoin = choices.filter((choice) => choice === "bitcoin").length;
  const ai = choices.filter((choice) => choice === "ai").length;
  const total = bitcoin + ai;
  const bitcoinPercent = total ? Math.round((bitcoin / total) * 100) : 50;
  const todayChoice = history[dayKey()];

  document.querySelector("[data-bitcoin-count]").textContent = bitcoin.toLocaleString();
  document.querySelector("[data-ai-count]").textContent = ai.toLocaleString();
  document.querySelector("[data-bitcoin-percent]").textContent = `${bitcoinPercent}%`;
  document.querySelector("[data-ai-percent]").textContent = `${100 - bitcoinPercent}%`;
  document.querySelector("[data-vote-meter]").style.width = `${bitcoinPercent}%`;

  bitcoinButton.disabled = Boolean(todayChoice);
  aiButton.disabled = Boolean(todayChoice);
  bitcoinButton.classList.toggle("selected", todayChoice === "bitcoin");
  aiButton.classList.toggle("selected", todayChoice === "ai");

  const status = document.querySelector("[data-vote-status]");
  if (todayChoice) {
    status.textContent = currentLanguage === "zh"
      ? `ä»Šæ—¥å·²æŠ•ç¥¨ï¼š${todayChoice === "bitcoin" ? "æ¯”ç‰¹å¸" : "AI"} Â· æ˜Žå¤©å¯å†æ¬¡æŠ•ç¥¨`
      : `Voted today: ${todayChoice === "bitcoin" ? "Bitcoin" : "AI"} Â· Come back tomorrow`;
  } else {
    status.textContent = currentLanguage === "zh"
      ? "æ‚¨çš„æµè§ˆå™¨ç»Ÿè®¡ Â· ä»Šæ—¥å¯åŒ¿åæŠ•ç¥¨"
      : "Your browser tally Â· Anonymous vote available today";
  }
}

document.querySelectorAll("[data-vote]").forEach((button) => {
  button.addEventListener("click", () => {
    const history = readVoteHistory();
    const today = dayKey();
    if (history[today]) return;
    history[today] = button.dataset.vote;
    localStorage.setItem(VOTE_KEY, JSON.stringify(history));
    renderBrowserVote();
  });
});

window.addEventListener("btveai:language", renderBrowserVote);
renderBrowserVote();

