"use strict";

const DEFAULT_MODEL = {
  claude: "claude-sonnet-5",
  openai: "gpt-4o",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
};

const KEY_PLACEHOLDER = {
  claude: "sk-ant-...",
  openai: "sk-...",
  openrouter: "sk-or-...",
};

// Shown when no API key is set yet or fetch fails
const FALLBACK_MODELS = {
  claude: [
    { id: "claude-sonnet-5", name: "Claude Sonnet 5" },
    { id: "claude-opus-5", name: "Claude Opus 5" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
  ],
  openai: [
    { id: "gpt-4o", name: "gpt-4o" },
    { id: "gpt-4o-mini", name: "gpt-4o-mini" },
    { id: "o3", name: "o3" },
    { id: "o4-mini", name: "o4-mini" },
  ],
  openrouter: [
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Meta: Llama 3.3 70B (free)" },
    { id: "nvidia/llama-3.1-nemotron-ultra-253b-v1:free", name: "NVIDIA: Nemotron Ultra 253B (free)" },
    { id: "anthropic/claude-sonnet-4-5", name: "anthropic/claude-sonnet-4-5" },
    { id: "openai/gpt-4o", name: "openai/gpt-4o" },
    { id: "google/gemini-2.5-pro", name: "google/gemini-2.5-pro" },
  ],
};

const providerSelect = document.getElementById("provider");
const apiKeyInput = document.getElementById("api-key");
const workspaceIdInput = document.getElementById("workspace-id");
const workspaceRow = document.getElementById("workspace-row");
const modelSelect = document.getElementById("model");
const modelSpinner = document.getElementById("model-spinner");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("status");

let savedModel = null;

chrome.storage.local.get(["provider", "apiKey", "workspaceId", "model"], async (stored) => {
  const provider = stored.provider || "claude";
  providerSelect.value = provider;
  apiKeyInput.value = stored.apiKey || "";
  workspaceIdInput.value = stored.workspaceId || "";
  savedModel = stored.model || DEFAULT_MODEL[provider];
  applyProviderUI(provider);
  populateSelect(FALLBACK_MODELS[provider], savedModel);

  if (stored.apiKey) {
    await loadModels(provider, stored.apiKey, stored.workspaceId || "");
  }
});

providerSelect.addEventListener("change", async () => {
  const provider = providerSelect.value;
  savedModel = DEFAULT_MODEL[provider];
  applyProviderUI(provider);
  populateSelect(FALLBACK_MODELS[provider], savedModel);

  const apiKey = apiKeyInput.value.trim();
  if (apiKey) await loadModels(provider, apiKey, workspaceIdInput.value.trim());
});

apiKeyInput.addEventListener("blur", async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) return;
  await loadModels(providerSelect.value, apiKey, workspaceIdInput.value.trim());
});

workspaceIdInput.addEventListener("blur", async () => {
  if (providerSelect.value !== "claude") return;
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) return;
  await loadModels("claude", apiKey, workspaceIdInput.value.trim());
});

saveBtn.addEventListener("click", () => {
  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value.trim();
  const workspaceId = workspaceIdInput.value.trim();
  const model = modelSelect.value || DEFAULT_MODEL[provider];

  if (!apiKey) {
    showStatus("API Key ist ein Pflichtfeld.", "err");
    return;
  }

  chrome.storage.local.set({ provider, apiKey, workspaceId, model }, () => {
    showStatus("Gespeichert.", "ok");
    savedModel = model;
  });
});

// ── API fetchers ──────────────────────────────────────────────

async function loadModels(provider, apiKey, workspaceId) {
  modelSelect.disabled = true;
  modelSpinner.classList.add("visible");
  try {
    let models;
    if (provider === "claude") models = await fetchClaudeModels(apiKey, workspaceId);
    else if (provider === "openai") models = await fetchOpenAIModels(apiKey);
    else if (provider === "openrouter") models = await fetchOpenRouterModels(apiKey);
    populateSelect(models, savedModel);
  } catch {
    // keep the fallback list already shown
  } finally {
    modelSelect.disabled = false;
    modelSpinner.classList.remove("visible");
  }
}

async function fetchClaudeModels(apiKey, workspaceId) {
  const headers = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
  if (workspaceId) headers["anthropic-workspace-id"] = workspaceId;
  const res = await fetch("https://api.anthropic.com/v1/models", { headers });
  if (!res.ok) throw new Error(res.status);
  const data = await res.json();
  return data.data.map((m) => ({ id: m.id, name: m.display_name || m.id }));
}

async function fetchOpenAIModels(apiKey) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(res.status);
  const data = await res.json();
  return data.data
    .filter((m) => /^(gpt-4|gpt-3\.5|o1|o3|o4)/i.test(m.id) && !m.id.includes("instruct"))
    .sort((a, b) => b.id.localeCompare(a.id))
    .map((m) => ({ id: m.id, name: m.id }));
}

async function fetchOpenRouterModels(apiKey) {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(res.status);
  const data = await res.json();
  return data.data
    .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))
    .map((m) => ({ id: m.id, name: m.name || m.id }));
}

// ── Helpers ───────────────────────────────────────────────────

function populateSelect(models, selectId) {
  modelSelect.innerHTML = "";
  for (const m of models) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name || m.id;
    if (m.id === selectId) opt.selected = true;
    modelSelect.appendChild(opt);
  }
  if (!modelSelect.value && models.length > 0) modelSelect.value = models[0].id;
}

function applyProviderUI(provider) {
  apiKeyInput.placeholder = KEY_PLACEHOLDER[provider] || "API Key";
  workspaceRow.style.display = provider === "claude" ? "block" : "none";
}

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type;
  setTimeout(() => { statusEl.textContent = ""; statusEl.className = ""; }, 3000);
}
