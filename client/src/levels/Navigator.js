import React, { useEffect, useRef, useState } from "react";
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
        btn.setAttribute(
          "aria-expanded",
          wrapper.classList.contains("open")
        );
      } else {
        document
          .querySelectorAll(".topbar-right")
          .forEach((el) => el.classList.remove("open"));
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

    // allow selecting the same file again later if it was removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };



  const handleRemoveFileAt = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // auto-scroll to newest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage = { role: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      uploadedFiles.forEach((f) => formData.append("files", f)); // "files" key
      formData.append("prompt", prompt);

      const res = await fetch("http://localhost:4000/api/navigator-chat", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const answerText = data.answer || "";

      const navigatorMessage = {
        role: "assistant",
        content: answerText,
      };

      setMessages((prev) => [...prev, navigatorMessage]);
    } catch (err) {
      console.error(err);
      setError("Something went wrong connecting to Navigator AI.");
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "Something went wrong connecting to Navigator AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nav-ai-page">
      {/* TOP BAR */}
      <header className="topbar">
        <Link to="/" className="topbar-left" aria-label="Start Page">
          <img src={logo} alt="ECS Logo" className="topbar-logo" />
        </Link>
        <div className="topbar-right">
          <button
            className="menu-button"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <span className="menu-lines" />
          </button>
          <nav className="menu-dropdown" role="menu">
            <Link to="/" className="menu-item" role="menuitem">
              {t("start_page_label")}
            </Link>
            <Link to="/landing-page" className="menu-item" role="menuitem">
              {t("landing_page_label")}
            </Link>
            <Link to="/login" className="menu-item" role="menuitem">
              {t("login_button")}
            </Link>
            <Link to="/create-account" className="menu-item" role="menuitem">
              {t("create_account_button")}
            </Link>
            <Link to="/levels/CubicLevel" className="menu-item" role="menuitem">
              {t("cubic_level_title")}
            </Link>
          </nav>
        </div>
      </header>

      <h1 className="nav-ai-title">NAVIGATOR AI</h1>

      {/* CHAT AREA */}
      <main className="nav-ai-canvas">
        <div className="nav-ai-chat-container">
          <div className="nav-ai-chat">
            {messages.length === 0 && !loading && (
              <div className="nav-ai-hint-wrapper">
                <div className="nav-ai-hint">
                  Upload your zipped folder, type your prompt, and send it to Navigator AI.
                </div>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  "nav-ai-message-row " +
                  (msg.role === "user"
                    ? "nav-ai-message-user"
                    : msg.role === "assistant"
                    ? "nav-ai-message-assistant"
                    : "nav-ai-message-system")
                }
              >
                <div className="nav-ai-message-bubble">
                  {msg.content}
                </div>
              </div>
            ))}


            {loading && (
              <div className="nav-ai-message-row nav-ai-message-assistant">
                <div className="nav-ai-message-bubble nav-ai-message-loading">
                  Thinking…
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>


      {/* INPUT BAR */}
      <form className="nav-ai-bottom-bar" onSubmit={handleSubmit}>
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
          className="nav-ai-icon-button nav-ai-upload"
          onClick={handlePickFile}
        >
          <span className="nav-ai-plus">+</span>
        </button>

        <div className="nav-ai-prompt-wrapper">
          <div className="nav-ai-input-area">
            {uploadedFiles.length > 0 && (
              <div className="nav-ai-file-chip-row">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="nav-ai-file-tag-inline" title={f.name}>
                    <span className="nav-ai-file-name">{f.name}</span>
                    <button
                      type="button"
                      className="nav-ai-file-remove"
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
              className="nav-ai-prompt-input"
            />
          </div>
        </div>

        <button
          type="submit"
          className="nav-ai-icon-button nav-ai-send"
          disabled={loading || !prompt.trim()}
        >
          <span className="nav-ai-arrow">↑</span>
        </button>
      </form>

      {/* FOOTER BAR */}
      <footer className="footer-bar">
        <div className="footer-left">{t("footer_left")}</div>
        <div className="footer-right">{t("footer_right")}</div>
      </footer>
    </div>
  );
}
