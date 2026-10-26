const INTERACTIONS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1/interactions';
const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
const FAILOVER_MODEL = 'gemini-3.1-flash-lite';
const CONFIG_KEY_API = 'mailspring-gemini-assistant.apiKey';
const CONFIG_KEY_MODEL = 'mailspring-gemini-assistant.model';
const CONFIG_KEY_THINKING = 'mailspring-gemini-assistant.thinkingLevel';

const SYSTEM_INSTRUCTION = `
You are a specialized email editing and composition assistant integrated into Mailspring.
You will receive the content of an email in HTML format along with an editing instruction.

STRICT RULES:
1. Return EXCLUSIVELY the final email HTML, without markdown code blocks, introductory comments, or explanations.
2. If the HTML contains <signature>...</signature> or <blockquote>...</blockquote> tags (previous messages), KEEP THEM INTACT at the end of the message and only edit the main text written by the user.
3. Preserve paragraph structures (<div>, <p>, <br>) so the email remains cleanly readable.
`;

const TASK_PROMPTS = {
  proofread: "Fix all spelling, grammar, and syntax errors in the main email body, maintaining the original tone and language of the text.",
  formal: "Rewrite the main email text to have a polished, polite, and professional business tone.",
  concise: "Make the main text of the email shorter, direct, and concise, removing unnecessary expressions while preserving essential details.",
  translate_en: "Translate the main email text into natural, professional English.",
  translate_el: "Translate the main email text into natural, professional Greek.",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getStoredApiKey() {
  let key = '';
  if (typeof AppEnv !== 'undefined' && AppEnv.config) {
    key = AppEnv.config.get(CONFIG_KEY_API) || '';
  }
  if ((!key || !key.trim()) && typeof window !== 'undefined' && window.localStorage) {
    key = window.localStorage.getItem(CONFIG_KEY_API) || '';
    if (key && typeof AppEnv !== 'undefined' && AppEnv.config) {
      AppEnv.config.set(CONFIG_KEY_API, key);
    }
  }
  return key.trim();
}

function saveStoredApiKey(rawKey) {
  const trimmed = (rawKey || '').trim();
  if (typeof AppEnv !== 'undefined' && AppEnv.config) {
    AppEnv.config.set(CONFIG_KEY_API, trimmed);
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(CONFIG_KEY_API, trimmed);
  }
  return trimmed;
}

function extractOutputText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim() !== '') {
    return data.output_text;
  }
  const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof candidateText === 'string' && candidateText.trim() !== '') {
    return candidateText;
  }
  if (Array.isArray(data?.steps)) {
    const outputSteps = data.steps.filter((s) => s.type === 'model_output');
    const lastStep = outputSteps[outputSteps.length - 1];
    if (Array.isArray(lastStep?.content)) {
      const joined = lastStep.content
        .filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('');
      if (joined.trim() !== '') {
        return joined;
      }
    }
  }
  return null;
}

function cleanMarkdownFences(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

async function callGeminiModel(apiKey, model, thinkingLevel, inputText, systemInstruction, maxRetries = 2) {
  const payload = {
    model: model,
    system_instruction: systemInstruction || SYSTEM_INSTRUCTION,
    input: inputText,
    generation_config: {
      thinking_level: thinkingLevel || 'low',
    },
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(INTERACTIONS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey.trim(),
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return await response.json();
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `HTTP Error ${response.status}`;
    const err = new Error(errorMessage);
    err.status = response.status;

    if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
      const delayMs = 1500 * (attempt + 1);
      await sleep(delayMs);
      continue;
    }

    throw err;
  }
}

function getApiConfig() {
  const apiKey = getStoredApiKey();
  const configuredModel =
    (typeof AppEnv !== 'undefined' && AppEnv.config && AppEnv.config.get(CONFIG_KEY_MODEL)) ||
    PRIMARY_MODEL;
  const thinkingLevel =
    (typeof AppEnv !== 'undefined' && AppEnv.config && AppEnv.config.get(CONFIG_KEY_THINKING)) ||
    'low';

  if (!apiKey) {
    throw new Error('No Gemini API Key specified. Please click "Configure API Key" in the Gemini AI menu.');
  }

  if (!/^[\x00-\x7F]+$/.test(apiKey)) {
    throw new Error('The API Key contains invalid characters. Please check your settings.');
  }

  return { apiKey, configuredModel, thinkingLevel };
}

async function callWithFailover(apiKey, configuredModel, thinkingLevel, inputText, systemInstruction) {
  const primaryModel = configuredModel === FAILOVER_MODEL ? FAILOVER_MODEL : PRIMARY_MODEL;
  const failoverModel = primaryModel === PRIMARY_MODEL ? FAILOVER_MODEL : PRIMARY_MODEL;

  let data = null;
  try {
    data = await callGeminiModel(apiKey, primaryModel, thinkingLevel, inputText, systemInstruction);
  } catch (primaryError) {
    if (primaryError.status === 400 || primaryError.status === 401 || primaryError.status === 403) {
      throw new Error(`Gemini API Error: ${primaryError.message}`);
    }
    console.warn(`[Gemini Plugin] Primary model (${primaryModel}) failed: ${primaryError.message}. Retrying with failover model (${failoverModel})...`);
    try {
      data = await callGeminiModel(apiKey, failoverModel, thinkingLevel, inputText, systemInstruction);
    } catch (failoverError) {
      throw new Error(`Gemini API Error: ${failoverError.message} (Failover failed after primary error: ${primaryError.message})`);
    }
  }

  const resultText = extractOutputText(data);
  if (!resultText) {
    throw new Error('Gemini did not return valid text.');
  }

  return cleanMarkdownFences(resultText);
}

async function processEmailWithGemini(htmlBody, taskKey) {
  const { apiKey, configuredModel, thinkingLevel } = getApiConfig();

  const taskInstruction = TASK_PROMPTS[taskKey] || TASK_PROMPTS.proofread;
  const inputText = `INSTRUCTION: ${taskInstruction}\n\nEMAIL CONTENT (HTML):\n${htmlBody}`;

  return await callWithFailover(apiKey, configuredModel, thinkingLevel, inputText, SYSTEM_INSTRUCTION);
}

async function processCustomInstruction(htmlBody, customPrompt) {
  const { apiKey, configuredModel, thinkingLevel } = getApiConfig();

  const safeBody = htmlBody && htmlBody.trim() !== '' ? htmlBody : '<p></p>';
  const inputText = `INSTRUCTION: ${customPrompt}\n\nEMAIL CONTENT (HTML):\n${safeBody}`;

  return await callWithFailover(apiKey, configuredModel, thinkingLevel, inputText, SYSTEM_INSTRUCTION);
}

module.exports = {
  processEmailWithGemini,
  processCustomInstruction,
  getStoredApiKey,
  saveStoredApiKey,
  extractOutputText,
  cleanMarkdownFences,
  TASK_PROMPTS,
  SYSTEM_INSTRUCTION,
};