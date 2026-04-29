import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./Navigator.css";
import "../LandingPage.css";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { Link } from "react-router-dom";
import logo from "../ECS_logo6.png";

export default function Navigator() {
  const { t } = useTranslation();

  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileKey = (f) => `${f.name}__${f.size}__${f.lastModified}`;

  const handlePickFile = () => fileInputRef.current?.click();

  useEffect(() => {
    const handleClick = (e) => {
      const btn = e.target.closest(".menu-button");
      const wrapper = e.target.closest(".topbar-right");
      document.querySelectorAll(".topbar-right").forEach((el) => {
        if (el !== wrapper) el.classList.remove("open");
      });
      if (btn && wrapper) {
        wrapper.classList.toggle("open");
        btn.setAttribute("aria-expanded", wrapper.classList.contains("open"));
      } else {
        document.querySelectorAll(".topbar-right").forEach((el) =>
          el.classList.remove("open")
        );
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    setUploadedFiles((prev) => {
      const existing = new Set(prev.map(fileKey));
      const filtered = picked.filter((f) => !existing.has(fileKey(f)));
      return [...prev, ...filtered];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFileAt = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage = { role: "user", content: prompt, files: uploadedFiles };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setUploadedFiles([]);
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      uploadedFiles.forEach((f) => formData.append("files", f));
      formData.append("prompt", prompt);

      const res = await fetch("http://localhost:4000/api/navigator-chat", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || "" },
      ]);
    } catch (err) {
      console.error(err);
      const msg = err.message || "Something went wrong connecting to Navigator AI.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: "system", content: msg },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nav2-page">
      {/* TOP BAR */}
      <header className="topbar">
        <Link to="/" className="topbar-left" aria-label="Start Page">
          <img src={logo} alt="ECS Logo" className="topbar-logo" />
        </Link>
        <div className="topbar-right">
          <button className="menu-button" aria-haspopup="true" aria-expanded="false">
            <span className="menu-lines" />
          </button>
          <nav className="menu-dropdown" role="menu">
            <Link to="/" className="menu-item" role="menuitem">{t("start_page_label")}</Link>
            <Link to="/landing-page" className="menu-item" role="menuitem">{t("landing_page_label")}</Link>
            <Link to="/login" className="menu-item" role="menuitem">{t("login_button")}</Link>
            <Link to="/create-account" className="menu-item" role="menuitem">{t("create_account_button")}</Link>
            <Link to="/levels/cosmos" className="menu-item" role="menuitem">Cosmos</Link>
          </nav>
        </div>
      </header>

      <h1 className="nav2-title">NAVIGATOR AI</h1>

      {/* CHAT AREA */}
      <main className="nav2-canvas">
        <div className="nav2-chat-container">
          <div className="nav2-chat">
            {messages.length === 0 && !loading && (
              <div className="nav2-hint-wrapper">
                <div className="nav2-hint">
                  Upload your files, type your prompt, and send it to Navigator AI.
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  "nav2-message-row " +
                  (msg.role === "user"
                    ? "nav2-message-user"
                    : msg.role === "assistant"
                    ? "nav2-message-assistant"
                    : "nav2-message-system")
                }
              >
                <div className="nav2-message-stack">
                  <div className="nav2-message-bubble">
                    {msg.role === "assistant"
                      ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                      : msg.content}
                  </div>
                  {msg.files && msg.files.length > 0 && (
                    <div className="nav2-message-files">
                      {msg.files.map((f, i) => (
                        <div key={i} className="nav2-file-tag-inline">
                          {f.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="nav2-message-row nav2-message-assistant">
                <div className="nav2-message-bubble nav2-message-loading">
                  Thinking…
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* INPUT BAR */}
      <form className="nav2-bottom-bar" onSubmit={handleSubmit}>
        <input
          type="file"
          multiple
          accept=".zip,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.pdf,.txt,.doc,.docx"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <button
          type="button"
          className="nav2-icon-button nav2-upload"
          onClick={handlePickFile}
        >
          <span>+</span>
        </button>

        <div className="nav2-prompt-wrapper">
          <div className={`nav2-input-area${uploadedFiles.length ? " has-files" : ""}`}>
            {uploadedFiles.length > 0 && (
              <div className="nav2-file-chip-row">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="nav2-file-tag-inline" title={f.name}>
                    <span className="nav2-file-name">{f.name}</span>
                    <button
                      type="button"
                      className="nav2-file-remove"
                      onClick={() => handleRemoveFileAt(i)}
                      aria-label={`Remove ${f.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="Create your prompt..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="nav2-prompt-input"
            />
          </div>
        </div>

        <button
          type="submit"
          className="nav2-icon-button nav2-send"
          disabled={loading || !prompt.trim()}
        >
          <span>↑</span>
        </button>
      </form>

      {/* FOOTER */}
      <footer className="footer-bar">
        <div className="footer-left">{t("footer_left")}</div>
        <div className="footer-right">{t("footer_right")}</div>
      </footer>
    </div>
  );
}
