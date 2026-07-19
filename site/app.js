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
  if (languageButton) languageButton.textContent = language === "en" ? "中文" : "EN";
  localStorage.setItem("btveai-language", language);
  window.dispatchEvent(new CustomEvent("btveai:language", { detail: language }));
}

languageButton?.addEventListener("click", () => applyLanguage(currentLanguage === "en" ? "zh" : "en"));
applyLanguage(currentLanguage);

const CONTRACT_ADDRESS = "DSjUSx5fnVuygdqqtjnax1VhRppi4BQicn8xupEApump";
document.querySelectorAll("[data-copy-contract]").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      button.textContent = currentLanguage === "zh" ? "已复制 ✓" : "COPIED ✓";
    } catch {
      button.textContent = currentLanguage === "zh" ? "复制失败" : "COPY FAILED";
    }
    setTimeout(() => {
      button.textContent = currentLanguage === "zh" ? button.dataset.zh : button.dataset.en;
    }, 1600);
  });
});

const VOTE_API = (document.querySelector('meta[name="btveai-vote-api"]')?.content || "").replace(/\/$/, "");
const VISITOR_KEY = "btveai-anonymous-visitor-v1";
let voteState = { bitcoin: 0, ai: 0, total: 0, votedToday: null };
let voteLoading = true;
let voteError = "";

function visitorId() {
  let value = localStorage.getItem(VISITOR_KEY);
  if (!value) {
    value = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(VISITOR_KEY, value);
  }
  return value;
}

function voteMessage() {
  if (voteLoading) return currentLanguage === "zh" ? "正在加载全球投票…" : "Loading global vote…";
  if (voteError === "rate_limited") return currentLanguage === "zh" ? "今日投票频率过高，请明天再试" : "Daily network vote limit reached. Try again tomorrow.";
  if (voteError) return currentLanguage === "zh" ? "投票服务暂时不可用，请稍后重试" : "Voting service is temporarily unavailable. Try again shortly.";
  if (voteState.votedToday) {
    const choice = voteState.votedToday === "bitcoin" ? (currentLanguage === "zh" ? "比特币" : "Bitcoin") : "AI";
    return currentLanguage === "zh" ? `今日已投票：${choice} · 明天可再次投票` : `Voted today: ${choice} · Come back tomorrow`;
  }
  return currentLanguage === "zh" ? "全球统计 · 今日可匿名投票" : "Global tally · Anonymous vote available today";
}

function renderGlobalVote() {
  const bitcoinButton = document.querySelector('[data-vote="bitcoin"]');
  const aiButton = document.querySelector('[data-vote="ai"]');
  if (!bitcoinButton || !aiButton) return;

  const bitcoin = Number(voteState.bitcoin || 0);
  const ai = Number(voteState.ai || 0);
  const total = bitcoin + ai;
  const bitcoinPercent = total ? Math.round((bitcoin / total) * 100) : 50;

  document.querySelector("[data-bitcoin-count]").textContent = bitcoin.toLocaleString();
  document.querySelector("[data-ai-count]").textContent = ai.toLocaleString();
  document.querySelector("[data-bitcoin-percent]").textContent = `${bitcoinPercent}%`;
  document.querySelector("[data-ai-percent]").textContent = `${100 - bitcoinPercent}%`;
  document.querySelector("[data-vote-meter]").style.width = `${bitcoinPercent}%`;

  const disabled = voteLoading || Boolean(voteState.votedToday) || Boolean(voteError);
  bitcoinButton.disabled = disabled;
  aiButton.disabled = disabled;
  bitcoinButton.classList.toggle("selected", voteState.votedToday === "bitcoin");
  aiButton.classList.toggle("selected", voteState.votedToday === "ai");

  const status = document.querySelector("[data-vote-status]");
  status.textContent = voteMessage();
}

async function requestVote(choice) {
  if (!VOTE_API.startsWith("https://")) throw new Error("Vote API is not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const options = choice
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: visitorId(), choice }),
        signal: controller.signal
      }
    : { signal: controller.signal };
  const url = choice ? `${VOTE_API}/api/vote` : `${VOTE_API}/api/vote?visitorId=${encodeURIComponent(visitorId())}`;
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    if (response.status === 429) {
      voteState = data;
      voteError = "rate_limited";
      return;
    }
    if (!response.ok && response.status !== 409) throw new Error(data.error || `Vote API error ${response.status}`);
    voteState = data;
    voteError = "";
  } finally {
    clearTimeout(timeout);
  }
}

async function loadGlobalVote() {
  voteLoading = true;
  renderGlobalVote();
  try {
    await requestVote();
  } catch (error) {
    console.error("BTVEAI vote load failed", error);
    voteError = "unavailable";
  } finally {
    voteLoading = false;
    renderGlobalVote();
  }
}

document.querySelectorAll("[data-vote]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (voteLoading || voteState.votedToday || voteError) return;
    voteLoading = true;
    renderGlobalVote();
    try {
      await requestVote(button.dataset.vote);
    } catch (error) {
      console.error("BTVEAI vote submission failed", error);
      voteError = "unavailable";
    } finally {
      voteLoading = false;
      renderGlobalVote();
    }
  });
});

window.addEventListener("btveai:language", renderGlobalVote);
loadGlobalVote();
