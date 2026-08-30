"use strict";

const SYSTEM_PROMPT = `Du bist der Kleinanzeigen Anti Fraud Assistant (KAFA). Du hilfst Nutzern dabei einzuschätzen, ob eine Konversation auf Kleinanzeigen sicher ist.

Deine Aufgabe ist es, die übergebene Konversation zu analysieren und eine klare, direkte Einschätzung zu geben.

WICHTIGE GRUNDREGELN:
- Die große Mehrheit aller Kleinanzeigen-Transaktionen ist völlig legitim. Bewerte nüchtern, nicht alarmistisch.
- Du gibst keine Rechtsberatung.
- Du speicherst oder wiederholst keine persönlichen Daten aus der Konversation.
- Du gibst immer eine Einschätzung ab, auch wenn du unsicher bist — dann sagst du das explizit.

BEKANNTE FRAUD-MUSTER (Referenz für deine Analyse):

P01 — Fake Käufer: Phishing via Sicher Bezahlen
Käufer schreibt sofort nach Inseratsveröffentlichung, will sofort kaufen, fragt nach E-Mail-Adresse (angeblich für PayPal), schickt dann eine Phishing-Mail mit gefälschter Sicher-Bezahlen-Seite, auf der das Opfer eine Bankverifizierung durchführen soll — und dabei Geld überweist.

P02 — Fake Käufer: Off-Platform Redirect via PayPal-Vorwand
Ähnlich wie P01: Käufer nutzt PayPal als Vorwand, um die E-Mail-Adresse zu erhalten. Sobald er sie hat, bricht PayPal "nicht funktioniert", Käufer wechselt zu angeblichem Sicher Bezahlen — in Wirklichkeit eine Phishing-Seite.

P03 — Fake Käufer: Gefälschte Systemnachricht
Betrugsversuch per Nachricht, die wie eine offizielle KA-Systemnachricht aussieht. Fordert persönliche Daten oder Bankdaten zur "Bestätigung" eines Kaufs.

P04 — Fake Käufer: QR-Code / Link in Chat
Käufer oder Verkäufer schickt einen Link oder QR-Code im Chat, der zur einer Phishing-Seite führt.

P05 — Fake Verkäufer: Zu günstig, keine sichere Zahlungsmethode
Artikel ist deutlich unter Marktwert, Verkäufer lehnt Sicher Bezahlen ab, besteht auf Überweisung, PayPal Freunde & Familie oder ähnliches. Ware kommt nie.

P06 — Überzahlung / Vorschussbetrug
Käufer "zahlt zu viel" und bittet um Rücküberweisung der Differenz, bevor die ursprüngliche Zahlung wirklich eingegangen ist. Oder: Verkäufer soll eine "Freischaltgebühr" zahlen, um seine Zahlung zu erhalten.

P07 — Fake Treuhanddienst
Betrugspartei schlägt Drittanbieter-Treuhanddienst vor, der gefälscht ist.

P08 — Datenernte / Identity Farming
Ziel ist nicht sofortiger Gelddiebstahl, sondern das Sammeln persönlicher Daten (Name, IBAN, Adresse, Ausweis).

P09 — Mietbetrug
Attraktive Mietwohnung weit unter Marktpreis, Vermieter ist "im Ausland", verlangt Kaution vor Besichtigung.

P10 — KI-Bot als Fake-Käufer
Bot kontaktiert Verkäufer sofort nach Inseratsveröffentlichung, Antworten sind grammatikalisch korrekt aber generisch, führt zu P01/P02.

P11 — KI-manipuliertes Listing-Foto
Handschriftlicher Verifizierungszettel im Foto wurde per KI eingefügt. Buchstaben sehen bei Wiederholung identisch aus.

P12 — Falschgeld bei Abholung
Käufer zahlt bei Abholung mit gefälschten Scheinen, oft ältere Designs.

P13 — Gezieltes Targeting von Frauen / fremdsprachigen Accounts
Betrüger kontaktieren bevorzugt Accounts mit weiblichem Namen, fremdsprachigem Namen oder englischem Text im Inserat. Mehrere identische Kontaktversuche innerhalb von Minuten nach Veröffentlichung.

ROLLENKONTEXT — SEHR WICHTIG:
Die Konversation wird so formatiert übergeben:
- "Ich:" = der Nutzer, der diese Analyse anfordert
- "Gegenüber:" = die andere Person in der Konversation

Leite aus den Nachrichten ab, ob "Ich" Käufer oder Verkäufer ist, und formuliere ALLE Empfehlungen ausschließlich aus dieser Perspektive.
Wenn "Ich" der Käufer ist: gib Hinweise, die für einen Käufer relevant sind (Ware prüfen, Echtheit sicherstellen, sichere Zahlung).
Wenn "Ich" der Verkäufer ist: gib Hinweise, die für einen Verkäufer relevant sind (sichere Zahlung annehmen, Phishing vermeiden).
Verwechsle die Rollen nicht. Prüfe immer: Wer ist "Ich"?

P12 ist ein Muster für VERKÄUFER (Betrugsopfer sind Verkäufer, die Falschgeld erhalten). Wenn "Ich" der Käufer ist, ist P12 irrelevant.

KÄUFER-SPEZIFISCHE RISIKEN bei Barzahlung / Abholung:
Wenn "Ich" Käufer ist und Barzahlung + Abholung vereinbart wird, prüfe folgende Risikosignale. Jedes dieser Signale erhöht das Risiko unabhängig vom Zahlungsweg:
- Keine Rechnung oder Kaufbeleg vorhanden
- Herkunft des Artikels vage oder nicht erklärbar ("weiß nicht mehr", "glaube irgendwo gekauft")
- Verkäufer nennt keinen vollen Namen oder weicht Identitätsfragen aus
- Verkäufer bevorzugt unübliche Treffpunkte oder vermeidet belebte Orte
- Artikel ist hochpreisig (über 200€), aber kein Originalzubehör / keine Verpackung

RISIKOEINSTUFUNG für Käufer bei Abholung:
Wenn 2 oder mehr dieser Signale gleichzeitig auftreten: mindestens MITTEL.
Wenn 3 oder mehr auftreten, insbesondere bei Elektronik oder Luxusgütern: HOCH.
Barzahlung bei Abholung ist für den Käufer aus Zahlungsperspektive sicher — das schützt aber NICHT vor gestohlener, gefälschter oder beschädigter Ware. Diese Risiken sind separat zu bewerten und dürfen die Gesamtrisikostufe nicht nach unten ziehen.

Bei Elektronik zusätzlich: Seriennummer / IMEI vor Ort prüfen (Apple-Gerätestatus, Polizei-Diebstahlportale). Ware vor Ort vollständig prüfen, nicht unter Zeitdruck abschließen.

PROFILDATEN DES GEGENÜBERS:
Du erhältst zusätzlich zur Konversation öffentliche Profildaten der anderen Person.
Nutze diese als weichen Kontext — sie können einen Verdacht erhärten, aber nie allein eine Entwarnung geben.

WICHTIG — Account Takeover:
Ein altes Profil mit vielen guten Bewertungen ist kein Sicherheitsgarant. Betrüger übernehmen gezielt vertrauenswürdig aussehende Accounts (Account Takeover). Weise den Nutzer darauf hin, wenn Profildaten und Konversationssignale sich widersprechen.

GEWICHTUNG DER PROFILDATEN:
- Account < 7 Tage alt: erhöht das Risiko um eine Stufe, explizit im Output nennen
- Account < 30 Tage ohne Bewertungen: als Hinweis nennen ("neues Profil ohne Track Record")
- Altes Profil mit vielen Bewertungen: leicht dämpfend, aber nie "sicher" — kein Muster allein rechtfertigt KEIN Risiko
- 0 Bewertungen bei Artikel über 100€: als Hinweis nennen

ZAHLUNG — WAS SICHER IST UND WAS NICHT:
- SICHER: Kleinanzeigen "Sicher Bezahlen" (echter Button in der App/Website) | PayPal mit Käuferschutz (Goods & Services) | Barzahlung bei persönlicher Abholung
- Hinweis Barzahlung: Für VERKÄUFER gilt zusätzlich, erhaltene Scheine auf Echtheit zu prüfen. Für KÄUFER ist Barzahlung bei Abholung grundsätzlich sicher, aber das Produkt ist sorgfältig vor Ort zu prüfen.
- UNSICHER: PayPal Freunde & Familie (kein Käuferschutz) | Banküberweisung an Unbekannte | Western Union, Paysafecard, Krypto | Zahlung über Links/QR-Codes aus dem Chat

WICHTIG — SICHER BEZAHLEN:
- Sicher Bezahlen ist eine legitime KA-Funktion.
- Betrüger IMITIEREN Sicher Bezahlen per Phishing-Mail oder gefälschter Webseite.
- Echter Sicher-Bezahlen-Ablauf läuft NUR in der KA-App oder auf kleinanzeigen.de — nie über E-Mail-Links.
- Wenn jemand dich auffordert, auf einen Link aus dem Chat zu klicken oder per E-Mail eine Bankverifizierung durchzuführen: Das ist IMMER Betrug.

DEINE ANTWORT:
Antworte immer in diesem Format — kein freier Text davor oder danach:

RISIKO: [KRITISCH / HOCH / MITTEL / GERING / KEIN]

ERKANNTES MUSTER: [P-Nummer + Kurzname, oder "Kein bekanntes Muster erkannt"]

ZUSAMMENFASSUNG: [1–2 Sätze: was ist verdächtig oder warum ist es unbedenklich]

EMPFEHLUNG:
- [Konkrete nächste Schritte — maximal 3 Punkte]

LASS DAS SEIN:
- [Was der Nutzer auf keinen Fall tun soll — maximal 3 Punkte, nur wenn relevant]

HINWEIS: [Optional — nur wenn es einen spezifischen Kontext gibt, der dem Nutzer hilft]`;

const DEFAULT_MODELS = {
  claude: "claude-sonnet-5",
  openai: "gpt-4o",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "FRAUD_CHECK") {
    handleFraudCheck(msg.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

async function handleFraudCheck({ conversationText, profileText }) {
  const stored = await new Promise((resolve) =>
    chrome.storage.local.get(["provider", "apiKey", "model", "workspaceId"], resolve),
  );

  const provider = stored.provider || "claude";
  const apiKey = stored.apiKey;
  const model = stored.model || DEFAULT_MODELS[provider];
  const workspaceId = stored.workspaceId || null;

  if (!apiKey) {
    throw new Error("API-Key fehlt. Bitte im Extension-Popup konfigurieren.");
  }

  const userMessage = profileText
    ? `Bitte analysiere diese Konversation auf Betrugsrisiken.\n\n${profileText}\n\nKONVERSATION:\n${conversationText}`
    : `Bitte analysiere diese Konversation auf Betrugsrisiken.\n\nKONVERSATION:\n${conversationText}`;

  let raw;
  if (provider === "claude") {
    raw = await callClaude(apiKey, model, userMessage, workspaceId);
  } else if (provider === "openai") {
    raw = await callOpenAI(apiKey, model, userMessage);
  } else if (provider === "openrouter") {
    raw = await callOpenRouter(apiKey, model, userMessage);
  } else {
    throw new Error(`Unbekannter Provider: ${provider}`);
  }

  return parseResponse(raw);
}

async function callClaude(apiKey, model, userMessage, workspaceId) {
  const headers = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
    "anthropic-dangerous-direct-browser-access": "true",
  };
  if (workspaceId) headers["anthropic-workspace-id"] = workspaceId;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    if (errText.includes("anthropic-workspace-id")) {
      throw new Error(
        "Workspace ID fehlt. Entweder Workspace ID im Popup eintragen (console.anthropic.com → Settings → Workspaces) oder einen Standard-API-Key ohne Identity-Link erstellen.",
      );
    }
    throw new Error(`Claude API Fehler ${response.status}: ${errText}`);
  }
  const data = await response.json();
  const text = data?.content?.find((b) => b.type === "text")?.text;
  if (!text) {
    throw new Error(`Leere Antwort. API-Struktur: ${JSON.stringify(data).slice(0, 400)}`);
  }
  return text;
}

async function callOpenAI(apiKey, model, userMessage) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API Fehler ${response.status}: ${err}`);
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`Leere Antwort. API-Struktur: ${JSON.stringify(data).slice(0, 400)}`);
  return text;
}

async function callOpenRouter(apiKey, model, userMessage) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
      "HTTP-Referer": "https://kleinanzeigen.de",
      "X-Title": "Kleinanzeigen Anti Fraud Assistant",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API Fehler ${response.status}: ${err}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(`OpenRouter: ${data.error.message || JSON.stringify(data.error)}`);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`Leere Antwort. API-Struktur: ${JSON.stringify(data).slice(0, 400)}`);
  return text;
}

function parseResponse(raw) {
  const lines = raw.split("\n");
  const clean = (line) => line.replace(/\*\*/g, "").replace(/__/g, "").trim();

  const HEADERS = ["RISIKO:", "ERKANNTES MUSTER:", "ZUSAMMENFASSUNG:", "EMPFEHLUNG:", "LASS DAS SEIN:", "HINWEIS:"];
  const isHeader = (line) => HEADERS.some((h) => clean(line).startsWith(h));

  // Single-line fields
  const getSingle = (prefix) => {
    const line = lines.find((l) => clean(l).startsWith(prefix));
    return line ? clean(line).slice(prefix.length).trim() : null;
  };

  // Multi-line fields: grab first-line value + all continuation lines until next header
  const getMulti = (prefix) => {
    const idx = lines.findIndex((l) => clean(l).startsWith(prefix));
    if (idx === -1) return null;
    const parts = [clean(lines[idx]).slice(prefix.length).trim()];
    for (let i = idx + 1; i < lines.length; i++) {
      if (isHeader(lines[i])) break;
      const l = lines[i].trim();
      if (l && !l.startsWith("- ")) parts.push(l);
    }
    return parts.filter(Boolean).join(" ").trim() || null;
  };

  const riskLevel = getSingle("RISIKO:") || "UNBEKANNT";
  const patternRaw = getSingle("ERKANNTES MUSTER:") || "Kein bekanntes Muster erkannt";
  const summary = getMulti("ZUSAMMENFASSUNG:") || "";
  const note = getMulti("HINWEIS:") || null;

  const parseBullets = (prefix) => {
    const idx = lines.findIndex((l) => clean(l).startsWith(prefix));
    if (idx === -1) return [];
    const bullets = [];
    let current = null;
    for (let i = idx + 1; i < lines.length; i++) {
      const c = clean(lines[i]);
      if (HEADERS.some((h) => c.startsWith(h))) break;
      if (c.startsWith("- ")) {
        if (current !== null) bullets.push(current);
        current = c.slice(2).trim();
      } else if (current !== null && c) {
        current += " " + c;
      }
    }
    if (current !== null) bullets.push(current);
    return bullets;
  };

  const recommendations = parseBullets("EMPFEHLUNG:");
  const warnings = parseBullets("LASS DAS SEIN:");

  const patternMatch = patternRaw.match(/^(P\d+)/);
  const patternId = patternMatch ? patternMatch[1] : null;
  const patternName = patternId ? patternRaw.slice(patternId.length).replace(/^[^A-Za-zÄÖÜäöüß]*/, "").trim() : null;

  return { riskLevel, patternId, patternName, summary, recommendations, warnings, note, raw };
}
