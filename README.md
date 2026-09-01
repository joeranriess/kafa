# Kleinanzeigen Anti Fraud Assistant (KAFA)

A Chrome extension that analyses Kleinanzeigen conversations for fraud risk and gives clear recommendations — directly in the message view.

## Install

Available on the [Chrome Web Store](https://chromewebstore.google.com/detail/gegkidfocfemgknmgnicglgnhglbeibd).

Or load it locally:

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder

## Setup

Click the extension icon and enter your API key for one of the supported providers:

| Provider | Where to get a key | Cost per analysis |
|----------|--------------------|--------------------|
| Claude (Anthropic) | [console.anthropic.com](https://console.anthropic.com/) | ~€0.01, varies by conversation length |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | ~€0.01, varies by conversation length |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) | free (Nemotron) or ~€0.01, varies by conversation length |

**OpenRouter is the easiest way to use KAFA for free**: create an account, get a free API key, and the default model (NVIDIA Nemotron Ultra 253B) runs at no cost. Paid models like Claude or GPT-4o are also available through OpenRouter if you prefer.

Your API key is stored locally in your browser and never sent anywhere except the provider's own API.

## Usage

1. Open any conversation on kleinanzeigen.de
2. Click **🛡 Konversation prüfen** above the reply box
3. The result appears in a bottom sheet with risk level, detected pattern, and recommended actions

## Privacy

Conversation text is sent directly to the AI provider you configured. No data reaches the extension developer. See the [Privacy Policy](https://joeranriess.github.io/kafa/privacy-policy.html) for details.

## Development

```bash
# Regenerate extension icons (requires cairosvg)
node generate-icons.js
```

Files:

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config (Manifest V3) |
| `background.js` | Service worker: API calls, response parsing |
| `content.js` | DOM injection, conversation extraction, sheet rendering |
| `overlay.css` | Styles for button and bottom sheet |
| `popup.html/js` | Settings UI |
| `generate-icons.js` | Icon generation script (dev only) |
