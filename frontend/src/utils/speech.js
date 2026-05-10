export const languageOptions = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'hi-IN', name: 'Hindi (भारत)' },
  { code: 'es-ES', name: 'Español' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'zh-CN', name: 'Mandarin' },
  { code: 'pa-IN', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ta-IN', name: 'Tamil (தமிழ்)' },
  { code: 'bho-IN', name: 'Bhojpuri (भोजपुरी)' },
  { code: 'te-IN', name: 'Telugu (తెలుగు)' },
  { code: 'ml-IN', name: 'Malayalam (മലയാളം)' },
];

export const startListening = (langCode, onResult, onError) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    onError("Speech recognition not supported in this browser. Try Chrome.");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = langCode;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event) => {
    onError(event.error);
  };

  recognition.start();
  return recognition;
};

export const speak = (text, langCode, onEndCallback = null) => {
  if (!('speechSynthesis' in window)) {
    console.warn("Speech synthesis not supported.");
    return;
  }
  
  // Clean markdown to prevent TTS from reading out punctuation like "asterisk"
  const cleanText = text.replace(/[*_~`#]/g, '');

  // Map unsupported regional codes to closest supported TTS engine codes
  let ttsLangCode = langCode;
  if (langCode === 'bho-IN') ttsLangCode = 'hi-IN'; // Bhojpuri uses Devanagari, Hindi TTS works best
  
  // Fix for Chrome/Safari bug: calling cancel() and speak() synchronously 
  // sometimes causes the new utterance to be silently cancelled.
  setTimeout(() => {
    // Split long text into smaller sentence chunks to avoid Chrome's length limit crash (usually >200 chars)
    const validChunks = (cleanText.match(/[^.!?\n]+[.!?\n]*/g) || [cleanText])
      .map(c => c.trim())
      .filter(Boolean);

    const voices = window.speechSynthesis.getVoices();
    
    // 1. Try exact match or base language match
    let voice = voices.find(v => v.lang === ttsLangCode || v.lang.startsWith(ttsLangCode.split('-')[0]));
    
    // 2. Fallback to Hindi for Indian languages if exact voice is missing
    if (!voice && ['pa-IN', 'ta-IN', 'te-IN', 'ml-IN', 'bho-IN'].includes(langCode)) {
      voice = voices.find(v => v.lang === 'hi-IN' || v.lang.startsWith('hi'));
    }

    // 3. Ultimate fallback
    if (!voice && voices.length > 0) {
      voice = voices.find(v => v.name.includes('Google')) || voices.find(v => v.default) || voices[0];
    }

    validChunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = ttsLangCode;
      
      if (voice) {
        utterance.voice = voice;
      }
      
      // Only fire the callback when the VERY LAST chunk finishes
      if (index === validChunks.length - 1 && onEndCallback) {
        utterance.onend = onEndCallback;
        utterance.onerror = onEndCallback;
      }
      
      window.speechSynthesis.speak(utterance);
    });

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, 50);
};

export const stopSpeaking = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};
