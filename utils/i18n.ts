// Simple i18n implementation for demonstration

// Add more languages as needed
export const translations = {
  en: {
    documentHub: "Document Hub",
    manageKnowledge: "Manage your knowledge base",
    yourDocuments: "Your Documents",
    summarizeAll: "Summarize All",
    noDocuments: "No documents yet. Upload text, markdown, or code files.",
    addDocuments: "Add Documents",
    uploading: "Uploading and processing file(s)...",
    remove: "Remove document",
    summarize: "Summarize document",
    notification: "Notification",
    alert: "Alert",
    languageDetected: "Detected document language: ",
    translated: "Document translated to English for processing."
  },
  hi: {
    documentHub: "दस्तावेज़ केंद्र",
    manageKnowledge: "अपना ज्ञान आधार प्रबंधित करें",
    yourDocuments: "आपके दस्तावेज़",
    summarizeAll: "सभी का सारांश",
    noDocuments: "अभी तक कोई दस्तावेज़ नहीं। टेक्स्ट, मार्कडाउन, या कोड फ़ाइलें अपलोड करें।",
    addDocuments: "दस्तावेज़ जोड़ें",
    uploading: "फ़ाइलें अपलोड और प्रोसेस हो रही हैं...",
    remove: "दस्तावेज़ हटाएँ",
    summarize: "दस्तावेज़ का सारांश",
    notification: "सूचना",
    alert: "चेतावनी",
    languageDetected: "दस्तावेज़ की भाषा पहचानी गई: ",
    translated: "प्रोसेसिंग के लिए दस्तावेज़ को अंग्रेज़ी में अनुवादित किया गया।"
  },
  es: {
    documentHub: "Centro de Documentos",
    manageKnowledge: "Gestiona tu base de conocimiento",
    yourDocuments: "Tus Documentos",
    summarizeAll: "Resumir Todo",
    noDocuments: "No hay documentos aún. Sube archivos de texto, markdown o código.",
    addDocuments: "Agregar Documentos",
    uploading: "Subiendo y procesando archivo(s)...",
    remove: "Eliminar documento",
    summarize: "Resumir documento",
    notification: "Notificación",
    alert: "Alerta",
    languageDetected: "Idioma detectado del documento: ",
    translated: "Documento traducido al inglés para su procesamiento."
  }
};

export type Lang = keyof typeof translations;

// Utility for language detection (very basic, for demo)
export async function detectLanguage(text: string): Promise<string> {
  // Use a simple heuristic or integrate a library/service for real detection
  if (/\p{Script=Devanagari}/u.test(text)) return 'hi';
  if (/\b(el|la|los|las|un|una|es|y|de|que|en)\b/i.test(text)) return 'es';
  return 'en';
}

// Dummy translation function (replace with real API for production)
export async function translateToEnglish(text: string, fromLang: string): Promise<string> {
  // In production, call a translation API here
  if (fromLang === 'en') return text;
  return `[Translated to English]: ${text}`;
}

export type Lang = keyof typeof translations;
