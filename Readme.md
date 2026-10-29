# Gemini AI Email Assistant for Mailspring

[![Mailspring Version](https://img.shields.io/badge/mailspring-%3E%3D1.0.0-0080FF.svg)](https://getmailspring.com/)
[![Gemini API](https://img.shields.io/badge/Powered%20By-Google%20Gemini-4285F4.svg)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)

An intelligent, seamless email composition and proofreading plugin for the [Mailspring](https://getmailspring.com/) desktop email client. Powered by the Google Gemini API, this extension empowers you to proofread drafts, adjust tones and translate across languages.

---

## Functionality & Features

The **Gemini AI Email Assistant** integrates directly into Mailspring's message composer toolbar (`✨ Gemini AI`), providing powerful AI tools at your fingertips without interrupting your workflow:

### Core Capabilities
* **Proofread & Fix Grammar**: Corrects spelling mistakes, grammatical errors, and awkward phrasing while maintaining your original voice, formatting, and language.
* **Formal Business Tone**: Rewrites informal thoughts, notes, or drafts into polished, courteous, and professional corporate correspondence.
* **Make Concise**: Trims unnecessary verbosity, filler words, and fluff while preserving all vital information, calls to action, and context.
* **Smart Multilingual Translation**:
  * **Translate to English**: Translates drafts into natural, idiomatic, professional English.
  * **Translate to Greek**: Translates drafts into fluent, natural, professional Greek.
* **Custom Instructions & Drafting from Scratch**:
  * Type a custom prompt (e.g., *"Decline politely and propose meeting next Tuesday at 10 AM"* or *"Turn these 3 bullet points into a warm thank-you email"*).
  * Works both on top of an existing draft or from an empty composer window.
* **Built-In API Key Setup**: Configure your Google Gemini API key directly from the composer popover menu—no need to edit raw JSON configuration files manually.

### Built for Real Email Workflows
* **Preserves Email Structure & Quotes**: Automatically detects and leaves email signatures (`<signature>`) and quoted reply history (`<blockquote>`) completely untouched.
* **HTML Hygiene**: Preserves clean formatting (`<p>`, `<div>`, `<br>`, bullet lists) and strips unwanted markdown code blocks before inserting content into Mailspring's rich-text editor.
* **Intelligent Resilience & Failover**:
  * Primary model: `gemini-3.5-flash-lite` (lightning-fast response times).
  * Automatic failover model: `gemini-3.1-flash-lite` (automatically kicks in if the primary model encounters rate limits or upstream service errors).
  * Automatic exponential backoff retries on HTTP `429` (Rate Limit) and `503` (Service Unavailable).
* **Native Theme Integration**: Built with Mailspring's LESS UI variables to adapt seamlessly to Light, Dark, High-Contrast, or custom community themes.

---

## Requirements

* [Mailspring](https://getmailspring.com/) version `1.0.0` or higher.
* A **Google Gemini API Key** (Free keys are available at [Google AI Studio](https://aistudio.google.com/app/apikey)).

---

## Installation

1. In Mailspring, navigate to the top menu bar: **Developer** → **Install a Plugin**
2. Browse to and select the `mailspring-gemini-assistant` directory.
3. Reload Mailspring to activate the plugin.

---

## Configuration

### 1. Obtain your Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account and click **Create API Key**.
3. Copy the generated key.

### 2. Enter the API Key in Mailspring

1. Open any email composer in Mailspring.
2. Click the **✨ Gemini AI** button in the bottom toolbar.
3. Select **Configure API Key**.
4. Paste your key and click **Save** (or press `Enter`).

## How to Use

### 1. Proofreading & Transforming Existing Text
1. Click **Compose** or **Reply** to open the composer.
2. Write your draft message.
3. Click the **✨ Gemini AI** button in the bottom action bar.
4. Select one of the preset actions:
   * **Proofread & Fix Grammar**
   * **Formal Business Tone**
   * **Make Concise**
   * **Translate to English**
   * **Translate to Greek**
5. The button text changes to `Processing...` while Gemini analyzes the text.
6. The updated content replaces your draft automatically, with full undo support (`Ctrl + Z` / `Cmd + Z`).

### 2. Using Custom Instructions
1. In the composer, click **✨ Gemini AI** → **Custom Instruction...**
2. Enter your desired prompt in the text box. For example:
   > *"Draft a polite follow-up checking if they had a chance to review the attached invoice."*
   >
   > *"Make this sound friendlier and add a note wishing them a good weekend."*
3. Click **Generate**.
4. Gemini will execute your prompt and write or update the email body accordingly.

## Project Structure

```
mailspring-gemini-assistant/
├── lib/
│   ├── main.js                   # Extension entry point, registers Composer:ActionButton
│   ├── gemini-composer-button.js # React button component, popover UI, state management
│   └── gemini-service.js         # API integration, fallback handling, HTML sanitization
├── styles/
│   └── gemini-plugin.less        # Theme-aware styles for buttons, inputs, and popovers
├── tests/
│   └── test-gemini.mjs           # Automated test suite for Gemini API workflows
├── package.json                  # Mailspring package manifest & configSchema
└── Readme.md                     # Project documentation
```

---

## Troubleshooting & FAQ

### "No Gemini API Key specified"
* Open the **✨ Gemini AI** popover menu and select **Configure API Key**.

### "Empty Email" Warning
* The preset actions (Proofread, Formal Tone, Concise, Translate) require some text in the composer before running. If you want to generate an email from scratch, use **Custom Instruction...**.

### The button does not appear in the composer toolbar
1. Check that the plugin is placed in the correct `packages` directory for your OS.
2. In Mailspring, open **Developer** → **Toggle Developer Tools** (`Ctrl + Shift + I` or `Cmd + Option + I`). Check the Console for any package loading errors.
3. Reload Mailspring via **Developer** → **Reload**.
4. Close the Mailspring client and reopen it.

### Quota or Rate Limit Errors (HTTP 429)
* The assistant automatically retries with exponential backoff and falls back to `gemini-3.1-flash-lite`. If you hit Google AI Studio's free tier rate limits, wait a few moments before sending another request, or check your quota in the [Google AI Studio Console](https://aistudio.google.com/).

---

## License

This project is licensed under the [MIT License](LICENSE).
