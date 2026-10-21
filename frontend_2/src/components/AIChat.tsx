import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const API = (import.meta.env.VITE_API_URL || "https://mybestsim.onrender.com").replace(/\/$/, "");

const SUGGESTIONS = [
  "Quel fournisseur a le plus de cartes ?",
  "Quel est le prix moyen d'une eSIM ?",
  "Pourquoi des lignes sont-elles rejetées ?",
];

/* Uses the CSS variables defined by the dashboard (.dash), so the chat
   follows the light/dark theme automatically. Render it inside <Shell>. */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-a)]";

function SparkIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2.5c.5 4.6 2.4 6.5 7 7-4.6.5-6.5 2.4-7 7-.5-4.6-2.4-6.5-7-7 4.6-.5 6.5-2.4 7-7Z" />
      <path d="M19 15c.25 2.1 1.1 2.95 3.2 3.2-2.1.25-2.95 1.1-3.2 3.2-.25-2.1-1.1-2.95-3.2-3.2 2.1-.25 2.95-1.1 3.2-3.2Z" opacity=".7" />
    </svg>
  );
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Bonjour ! Je suis l'assistant IA MyBestSim. Posez-moi une question sur les métriques, les prix ou les anomalies du catalogue eSIM.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  async function ask(raw: string) {
    const text = raw.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : `Erreur du serveur (${response.status})`
        );
      }
      if (typeof data.answer !== "string") {
        throw new Error("La réponse de l'assistant est invalide.");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de contacter l'assistant IA.");
    } finally {
      setLoading(false);
    }
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    ask(question);
  }

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <>
      <style>{`
        @keyframes chat-dot { 0%, 80%, 100% { opacity: .3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
        .chat-dot { animation: chat-dot 1.2s infinite ease-in-out; }
        @keyframes chat-in { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
        .chat-in { animation: chat-in .2s ease-out both; transform-origin: bottom right; }
        @media (prefers-reduced-motion: reduce) { .chat-dot, .chat-in { animation: none; } }
      `}</style>

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Fermer l'assistant IA" : "Ouvrir l'assistant IA"}
        aria-expanded={isOpen}
        className={`fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[var(--c-a)] text-[var(--on-accent)] shadow-[0_10px_30px_-10px_var(--c-a)] ring-1 ring-[var(--line)] transition hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 ${FOCUS}`}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <SparkIcon />
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <section
          aria-label="Assistant IA MyBestSim"
          className="chat-in fixed bottom-24 right-4 z-50 flex h-[min(620px,calc(100dvh-130px))] w-[min(410px,calc(100vw-32px))] flex-col overflow-hidden rounded-[1.75rem] bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow)] ring-1 ring-[var(--line-strong)] sm:right-6"
        >
          {/* Header */}
          <header className="flex items-center gap-3 border-b border-[var(--line)] bg-[image:var(--hero)] px-5 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--c-a)] text-[var(--on-accent)]">
              <SparkIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-semibold leading-tight">Assistant MyBestSim</h2>
              <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--good)]" aria-hidden />
                Analyse du catalogue · Ollama
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fermer"
              className={`grid h-9 w-9 place-items-center rounded-full bg-[var(--surface)]/70 text-[var(--muted)] hover:text-[var(--ink)] ${FOCUS}`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--bg)] px-4 py-5" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words px-4 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "rounded-2xl rounded-br-md bg-[var(--c-a)] text-[var(--on-accent)]"
                      : "rounded-2xl rounded-bl-md bg-[var(--surface)] text-[var(--ink)] ring-1 ring-[var(--line)]"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {showSuggestions && (
              <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Questions suggérées">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className={`rounded-full bg-[var(--accent-soft)] px-3.5 py-1.5 text-left text-sm font-medium text-[var(--accent-ink)] transition hover:opacity-80 motion-reduce:transition-none ${FOCUS}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start" role="status">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-[var(--surface)] px-4 py-3.5 ring-1 ring-[var(--line)]">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="chat-dot h-1.5 w-1.5 rounded-full bg-[var(--muted)]"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                  <span className="sr-only">L'assistant réfléchit...</span>
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-2xl bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn-ink)]">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <form onSubmit={sendMessage} className="border-t border-[var(--line)] bg-[var(--surface)] p-3">
            <div className="flex items-end gap-2 rounded-[1.25rem] bg-[var(--surface-2)] p-2 ring-1 ring-transparent focus-within:ring-[var(--c-a)]">
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Posez votre question..."
                aria-label="Votre question"
                rows={1}
                maxLength={500}
                disabled={loading}
                className="max-h-28 min-h-[2.5rem] min-w-0 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                aria-label="Envoyer"
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--c-a)] text-[var(--on-accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none ${FOCUS}`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-[var(--muted)]">
              Entrée pour envoyer · Maj+Entrée pour un retour à la ligne
            </p>
          </form>
        </section>
      )}
    </>
  );
}