"use strict";

// ──────────────────────────────────────────────
// DOM helpers
// ──────────────────────────────────────────────

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

// ──────────────────────────────────────────────
// State
// ──────────────────────────────────────────────

let currentConversationId = null;
let sheetEl = null;
let backdropEl = null;

// ──────────────────────────────────────────────
// Conversation extraction
// ──────────────────────────────────────────────

function extractConversationText() {
  // Inbound messages: [data-testid="INBOUND"]  (white bubbles — counterpart)
  // Outbound messages: [data-testid="OUTBOUND"] (green bubbles — own)
  const wrapper = qs('[data-testid="conversation-wrapper"]');
  if (!wrapper) return null;

  const messages = [];

  // Collect all message bubbles in DOM order
  const allBubbles = qsa('[data-testid="INBOUND"], [data-testid="OUTBOUND"]', wrapper);
  for (const bubble of allBubbles) {
    const boundness = bubble.dataset.testid; // "INBOUND" or "OUTBOUND"
    const text = bubble.textContent.trim();
    if (text) {
      messages.push({ boundness, text });
    }
  }

  if (messages.length === 0) return null;

  return messages
    .map((m) => {
      const prefix = m.boundness === "INBOUND" ? "Gegenüber" : "Ich";
      return `${prefix}: ${m.text}`;
    })
    .join("\n");
}

function hasInboundMessages() {
  const wrapper = qs('[data-testid="conversation-wrapper"]');
  if (!wrapper) return false;
  return qsa('[data-testid="INBOUND"]', wrapper).length > 0;
}

// ──────────────────────────────────────────────
// Profile text extraction from InitialFraudPreventionMessage
// (contains "Aktiv seit <date>" about the counterpart)
// ──────────────────────────────────────────────

function extractProfileText() {
  const wrapper = qs('[data-testid="conversation-wrapper"]');
  if (!wrapper) return null;

  // The InitialFraudPreventionMessage renders an article with "Aktiv seit"
  const articles = qsa("article", wrapper);
  for (const article of articles) {
    const text = article.textContent.trim();
    if (text.includes("Aktiv seit")) {
      // Extract the "Aktiv seit ..." part
      const match = text.match(/Aktiv seit (.+?)(?:\n|$)/);
      if (match) {
        return `PROFIL DES GEGENÜBERS:\n- Aktiv seit: ${match[1].trim()}`;
      }
    }
  }

  return null;
}

// ──────────────────────────────────────────────
// Conversation ID detection (from URL query param)
// ──────────────────────────────────────────────

function getConversationIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("conversationId") || null;
}

// ──────────────────────────────────────────────
// Button injection
// ──────────────────────────────────────────────

const BTN_WRAPPER_ID = "kafa-fraud-btn-wrapper";

function injectButton() {
  if (qs(`#${BTN_WRAPPER_ID}`)) return; // already injected

  try {
    const textarea = qs("#nachricht");
    if (!textarea) return;

    // Walk up from textarea to find the reply wrapper and its scroll-container sibling.
    // The scroll container (overflow-y:scroll) and the reply box are siblings
    // inside the flex column. We stop as soon as we find that sibling.
    let replyEl = textarea.parentElement;
    let scrollEl = null;
    while (replyEl && replyEl.parentElement) {
      for (const child of replyEl.parentElement.children) {
        if (child === replyEl) continue;
        const oy = window.getComputedStyle(child).overflowY;
        if (oy === "scroll" || oy === "auto") { scrollEl = child; break; }
      }
      if (scrollEl) break;
      replyEl = replyEl.parentElement;
    }
    if (!scrollEl || !replyEl.parentElement) return;

    const hasInbound = hasInboundMessages();
    const wrapper = document.createElement("div");
    wrapper.id = BTN_WRAPPER_ID;

    const btn = document.createElement("button");
    btn.id = "kafa-fraud-check-btn";
    btn.disabled = !hasInbound;
    btn.title = hasInbound ? "" : "Warte auf eine Nachricht des anderen Nutzers";
    btn.innerHTML = `<span class="kafa-btn-icon">🛡</span> Konversation prüfen`;
    btn.addEventListener("click", handleCheckClick);
    wrapper.appendChild(btn);

    // Insert between scroll area and reply box
    replyEl.parentElement.insertBefore(wrapper, replyEl);

    // Wait for React to finish any re-renders triggered by the DOM mutation,
    // then force-scroll the message container to the real bottom.
    setTimeout(() => {
      try { scrollEl.scrollTop = scrollEl.scrollHeight; } catch (_) {}
    }, 350);

  } catch (_) {
    // Guard: never let injectButton crash the MutationObserver loop
  }
}

function updateButtonState() {
  const btn = qs("#kafa-fraud-check-btn");
  if (!btn) return;
  const hasInbound = hasInboundMessages();
  btn.disabled = !hasInbound;
  btn.title = hasInbound ? "" : "Warte auf eine Nachricht des anderen Nutzers";
}

// ──────────────────────────────────────────────
// Sheet rendering
// ──────────────────────────────────────────────

function closeSheet() {
  if (backdropEl) {
    backdropEl.remove();
    backdropEl = null;
    sheetEl = null;
  }
}

function openSheet(contentFn) {
  closeSheet();

  backdropEl = document.createElement("div");
  backdropEl.id = "kafa-sheet-backdrop";
  backdropEl.addEventListener("click", (e) => {
    if (e.target === backdropEl) closeSheet();
  });

  sheetEl = document.createElement("div");
  sheetEl.id = "kafa-sheet";

  const header = document.createElement("div");
  header.className = "kafa-sheet-header";
  header.innerHTML = `
    <span class="kafa-sheet-title">🛡 Konversation geprüft</span>
    <button class="kafa-close-btn" aria-label="Schließen">✕</button>
  `;
  header.querySelector(".kafa-close-btn").addEventListener("click", closeSheet);

  sheetEl.appendChild(header);
  contentFn(sheetEl);

  backdropEl.appendChild(sheetEl);
  document.body.appendChild(backdropEl);
}

function renderLoading() {
  openSheet((sheet) => {
    const div = document.createElement("div");
    div.className = "kafa-loading";
    div.innerHTML = `<div class="kafa-spinner"></div><p class="kafa-loading-text">Wird analysiert...</p>`;
    sheet.appendChild(div);
  });
}

function renderError(message) {
  openSheet((sheet) => {
    const div = document.createElement("div");
    div.className = "kafa-error";
    div.innerHTML = `
      <div class="kafa-error-icon">⚠️</div>
      <p class="kafa-error-msg">${escapeHtml(message)}</p>
    `;
    const btnRow = document.createElement("div");
    btnRow.className = "kafa-btn-row";
    btnRow.style.marginTop = "16px";
    btnRow.innerHTML = `<button class="kafa-btn-ghost" id="kafa-close-err">Schließen</button>`;
    div.appendChild(btnRow);
    sheet.appendChild(div);
    sheet.querySelector("#kafa-close-err").addEventListener("click", closeSheet);
  });
}

const RISK_CLASSES = {
  KRITISCH: "kafa-risk-kritisch",
  HOCH: "kafa-risk-hoch",
  MITTEL: "kafa-risk-mittel",
  GERING: "kafa-risk-gering",
  KEIN: "kafa-risk-kein",
};

const RISK_INDICATORS = {
  KRITISCH: "● KRITISCH",
  HOCH: "● HOCH",
  MITTEL: "● MITTEL",
  GERING: "● GERING",
  KEIN: "✓ KEIN RISIKO",
};

function renderResult(result) {
  const { riskLevel, patternId, patternName, summary, recommendations, warnings, note, raw } = result;

  if (riskLevel === "UNBEKANNT") {
    renderError(
      "Antwort konnte nicht verarbeitet werden. Rohantwort des Modells:\n\n" + (raw || "(leer)"),
    );
    return;
  }

  const showReport = riskLevel === "KRITISCH" || riskLevel === "HOCH";
  const showSicherBezahlen =
    ["MITTEL", "HOCH", "KRITISCH"].includes(riskLevel) &&
    patternId &&
    ["P01", "P02", "P05", "P06"].includes(patternId);
  const showPolice = riskLevel === "KRITISCH";

  const chipClass = RISK_CLASSES[riskLevel] || "kafa-risk-gering";
  const chipLabel = RISK_INDICATORS[riskLevel] || riskLevel;

  openSheet((sheet) => {
    // Risk chip
    const chip = document.createElement("div");
    chip.className = `kafa-risk-chip ${chipClass}`;
    chip.textContent = chipLabel;
    sheet.appendChild(chip);

    // Pattern
    if (patternId && patternName) {
      sheet.appendChild(makeSection("Erkanntes Muster", `${patternId} — ${patternName}`));
    }

    // Summary
    if (summary) {
      sheet.appendChild(makeSection("Was ist verdächtig?", summary));
    }

    // Recommendations
    if (recommendations && recommendations.length > 0) {
      const html = `<ul>${recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`;
      sheet.appendChild(makeSection("Was du tun solltest", html, true));
    }

    // Warnings
    if (warnings && warnings.length > 0) {
      const html = `<ul>${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>`;
      sheet.appendChild(makeSection("Was du lassen solltest", html, true));
    }

    // Note
    if (note) {
      const noteBox = document.createElement("div");
      noteBox.className = "kafa-note-box";
      noteBox.textContent = note;
      sheet.appendChild(noteBox);
    }

    // Actions
    const hr = document.createElement("hr");
    hr.className = "kafa-divider";
    sheet.appendChild(hr);

    const actions = document.createElement("div");
    actions.className = "kafa-actions";

    if (showReport) {
      const reportBtn = document.createElement("button");
      reportBtn.className = "kafa-btn-primary";
      reportBtn.textContent = "Nutzer melden";
      reportBtn.addEventListener("click", () => {
        closeSheet();
        // Defer until the sheet is removed from DOM so MutationObserver
        // doesn't interfere and the dropdown opens cleanly
        setTimeout(triggerFlaggingFlow, 100);
      });
      actions.appendChild(reportBtn);
    }

    if (showSicherBezahlen) {
      const sbLink = document.createElement("button");
      sbLink.className = "kafa-secondary-link";
      sbLink.textContent = "Wie funktioniert Sicher Bezahlen?";
      sbLink.addEventListener("click", () => {
        window.open("https://themen.kleinanzeigen.de/sicherheitshinweise/", "_blank", "noopener");
      });
      actions.appendChild(sbLink);
    }

    if (showPolice) {
      const policeHint = document.createElement("p");
      policeHint.className = "kafa-police-hint";
      policeHint.innerHTML = `Du kannst den Vorfall auch bei der Polizei melden. <a href="https://www.polizei.de/Polizei/DE/OnlineWachen/onlinewachen_node.html" target="_blank" rel="noopener">Online-Wache →</a>`;
      actions.appendChild(policeHint);
    }

    const btnRow = document.createElement("div");
    btnRow.className = "kafa-btn-row";

    const recheckBtn = document.createElement("button");
    recheckBtn.className = "kafa-btn-ghost";
    recheckBtn.textContent = "Erneut prüfen";
    recheckBtn.addEventListener("click", () => { closeSheet(); handleCheckClick(); });

    const closeBtn = document.createElement("button");
    closeBtn.className = "kafa-btn-ghost";
    closeBtn.textContent = "Schließen";
    closeBtn.addEventListener("click", closeSheet);

    btnRow.appendChild(recheckBtn);
    btnRow.appendChild(closeBtn);
    actions.appendChild(btnRow);

    sheet.appendChild(actions);
  });
}

function makeSection(label, bodyHtml, isHtml = false) {
  const section = document.createElement("div");
  section.className = "kafa-section";
  const labelEl = document.createElement("div");
  labelEl.className = "kafa-section-label";
  labelEl.textContent = label;
  const bodyEl = document.createElement("div");
  bodyEl.className = "kafa-section-body";
  if (isHtml) {
    bodyEl.innerHTML = bodyHtml;
  } else {
    bodyEl.textContent = bodyHtml;
  }
  section.appendChild(labelEl);
  section.appendChild(bodyEl);
  return section;
}

// ──────────────────────────────────────────────
// Flagging — delegate to existing KA flow
// ──────────────────────────────────────────────

function triggerFlaggingFlow() {
  // "Nutzer melden" is rendered as a [role="menuitem"] <BUTTON> in the conversation
  // header dropdown — React keeps it in the DOM even when the dropdown is visually closed.
  // The global <header> element is the site search bar, not the conversation header,
  // so we search document-wide and filter by tagName to avoid the <LI> menuitems
  // from the category/radius dropdowns.
  const reportBtn = qsa('[role="menuitem"]')
    .find((el) => el.tagName === "BUTTON" && el.textContent.trim() === "Nutzer melden");

  if (reportBtn) {
    reportBtn.click();
    return;
  }

  // Fallback: open the "Mehr" dropdown first, then click
  const moreBtn = qsa("button")
    .find((b) => b.textContent.trim() === "Mehr" && !b.closest("#kafa-sheet-backdrop"));
  if (!moreBtn) return;

  moreBtn.click();
  setTimeout(() => {
    const item = qsa('[role="menuitem"]')
      .find((el) => el.textContent.trim() === "Nutzer melden");
    if (item) item.click();
  }, 300);
}

// ──────────────────────────────────────────────
// Main check handler
// ──────────────────────────────────────────────

async function handleCheckClick() {
  const conversationText = extractConversationText();
  if (!conversationText) {
    renderError("Keine Nachrichten gefunden. Bitte öffne eine Konversation.");
    return;
  }

  const profileText = extractProfileText();
  renderLoading();

  chrome.runtime.sendMessage(
    { type: "FRAUD_CHECK", payload: { conversationText, profileText } },
    (response) => {
      if (chrome.runtime.lastError) {
        renderError("Verbindungsfehler zur Extension. Bitte Seite neu laden.");
        return;
      }
      if (!response || !response.ok) {
        renderError(response?.error || "Unbekannter Fehler bei der Analyse.");
        return;
      }
      renderResult(response.result);
    },
  );
}

// ──────────────────────────────────────────────
// Security helper
// ──────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ──────────────────────────────────────────────
// SPA navigation detection
// When the user switches conversations (URL changes, React re-renders),
// we need to re-inject the button.
// ──────────────────────────────────────────────

function onConversationChange() {
  try {
    const newId = getConversationIdFromUrl();
    if (newId !== currentConversationId) {
      currentConversationId = newId;
      closeSheet();
      const stale = qs(`#${BTN_WRAPPER_ID}`);
      if (stale) stale.remove();
    }
    injectButton();
    updateButtonState();
  } catch (_) {}
}


// MutationObserver watches for React re-renders (conversation content changes)
// Debounced so rapid DOM mutations (React patching, sheet renders) don't spam onConversationChange
let mutationTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(mutationTimer);
  mutationTimer = setTimeout(onConversationChange, 200);
});

observer.observe(document.body, { childList: true, subtree: true });

// Also watch for popstate / pushstate (SPA routing)
const origPushState = history.pushState.bind(history);
history.pushState = function (...args) {
  origPushState(...args);
  onConversationChange();
};
window.addEventListener("popstate", onConversationChange);

// Initial run
onConversationChange();
