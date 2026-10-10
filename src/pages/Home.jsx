import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import logo from '../assets/nobgLogo.png';
import { Menu, FileText, CheckCircle, Download, File, Image, Video, Music, ExternalLink, Trash2, Clock } from 'lucide-react';
import './Home.css';

function Home() {
  const [activeTab, setActiveTab] = useState("text");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaName, setMediaName] = useState("");
  const [file, setFile] = useState(null);
  
  // Expiry Timer States
  const [expiryOption, setExpiryOption] = useState("never"); // "5m", "1h", "24h", "never"
  const [textLoading, setTextLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);

  async function getPostData() {
    const { data, error } = await supabase
      .from('post')
      .select('*')
      .eq('id', 1)
      .single();

    if (data) {
      // Check if file or text has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        await handleAutoDelete(data.file_name);
        return;
      }

      setText(data.name || "");
      setMediaUrl(data.media || "");
      setMediaName(data.file_name || "");
    }
  }

  useEffect(() => {
    getPostData();
    // Periodic check for expired content every 30 seconds
    const interval = setInterval(getPostData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper to calculate Expiry Timestamp
  const calculateExpiryTimestamp = (option) => {
    if (option === 'never') return null;
    const now = new Date();
    if (option === '5m') now.setMinutes(now.getMinutes() + 5);
    if (option === '1h') now.setHours(now.getHours() + 1);
    if (option === '24h') now.setHours(now.getHours() + 24);
    return now.toISOString();
  };

  async function InsertText() {
    setTextLoading(true);
    const expiresAt = calculateExpiryTimestamp(expiryOption);

    const { error } = await supabase
      .from('post')
      .upsert({ id: 1, name: text, expires_at: expiresAt }, { onConflict: 'id' });

    if (!error) {
      alert("Text Shared!");
      getPostData();
    }
    setTextLoading(false);
  }

  async function InsertMedia() {
    if (!file) return alert("Please select a file first!");

    const MAX_FILE_SIZE = 52428800; // 50 MB limit
    if (file.size > MAX_FILE_SIZE) {
      alert("File size exceeds 50 MB.");
      return;
    }

    setMediaLoading(true);

    try {
      // Clear previous file if exists
      if (mediaName) {
        await supabase.storage.from('upload').remove([mediaName]);
      }

      const generatedFileName = `${Date.now()}_${file.name}`;
      const expiresAt = calculateExpiryTimestamp(expiryOption);

      const { error: uploadError } = await supabase.storage
        .from('upload')
        .upload(generatedFileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        alert("Upload error: " + uploadError.message);
        setMediaLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('upload')
        .getPublicUrl(generatedFileName);

      const publicUrl = publicUrlData.publicUrl;

      const { error: dbError } = await supabase
        .from('post')
        .upsert({
          id: 1,
          media: publicUrl,
          file_name: generatedFileName,
          expires_at: expiresAt
        }, { onConflict: 'id' });

      if (!dbError) {
        alert("File Uploaded Successfully!");
        setFile(null);
        getPostData();
      } else {
        alert("Database error: " + dbError.message);
      }
    } catch (err) {
      console.error("Upload process failed:", err);
    } finally {
      setMediaLoading(false);
    }
  }

  // Delete Media Handler
  async function handleDeleteMedia() {
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    setMediaLoading(true);
    try {
      if (mediaName) {
        await supabase.storage.from('upload').remove([mediaName]);
      }

      await supabase
        .from('post')
        .upsert({ id: 1, media: null, file_name: null, expires_at: null }, { onConflict: 'id' });

      setMediaUrl("");
      setMediaName("");
      alert("File deleted successfully!");
    } catch (error) {
      console.error("Deletion error:", error);
    } finally {
      setMediaLoading(false);
    }
  }

  // Auto Delete Handler when Timer Expires
  async function handleAutoDelete(fileNameToDelete) {
    if (fileNameToDelete) {
      await supabase.storage.from('upload').remove([fileNameToDelete]);
    }
    await supabase.from('post').upsert({ id: 1, name: "", media: null, file_name: null, expires_at: null }, { onConflict: 'id' });
    setText("");
    setMediaUrl("");
    setMediaName("");
  }

  function copyTodoText(content) {
    if (!content) return;
    navigator.clipboard.writeText(content);
    alert("Copied!");
  }

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'downloaded-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  const renderTextWithLinks = (inputText) => {
    if (!inputText) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = inputText.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const href = part.startsWith('www.') ? `https://${part}` : part;
        return (
          <a key={index} href={href} target="_blank" rel="noopener noreferrer" className="clickable-link">
            {part} <ExternalLink size={12} style={{ display: 'inline', marginLeft: '2px' }} />
          </a>
        );
      }
      return part;
    });
  };

  const renderMediaPreview = (url, name) => {
    if (!url) return null;
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
      return (
        <div className="media-preview-container">
          <img src={url} alt="Live Preview" className="workspace-media-img" />
        </div>
      );
    } else if (lowerUrl.match(/\.(mp4|webm|ogg)$/i)) {
      return (
        <div className="media-preview-container">
          <video src={url} controls className="workspace-media-video" />
        </div>
      );
    } else if (lowerUrl.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      return (
        <div className="media-preview-container generic-doc-box">
          <Music className="preview-type-icon" size={32} />
          <audio src={url} controls className="workspace-media-audio" />
        </div>
      );
    } else {
      return (
        <div className="media-preview-container generic-doc-box">
          <File className="preview-type-icon" size={40} />
          <span className="doc-name-text">{name || "Shared Document"}</span>
        </div>
      );
    }
  };

  return (
    <div className='air-workspace'>
      {/* TOP HEADER */}
      <header className="air-navbar">
        <div className="nav-brand">
          <img src={logo} alt="Logo" className="nav-logo" />
          <span className="brand-text">everycode<span className="bold-text">share</span></span>
        </div>
        <nav className="nav-links">
          <span className="link-item active-link">How it works</span>
          <span className="link-item">Download</span>
          <span className="link-item">Upgrade</span>
          <span className="link-item">Feedback</span>
        </nav>
      </header>

      {/* CENTERED MAIN CONTAINER */}
      <main className="air-container-wrapper">
        <div className="air-card">

          {/* LEFT ICON TAB STRIP */}
          <div className="air-tabs-strip">
            <button
              className={`strip-btn ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
              title="Text Share"
            >
              <Menu className="icon-graphic" size={24} />
            </button>
            <button
              className={`strip-btn ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
              title="File Share"
            >
              <FileText className="icon-graphic" size={24} />
            </button>
          </div>

          {/* RIGHT CONTENT WORKSPACE */}
          <div className="air-content-workspace">
            {activeTab === 'text' ? (
              <div className="workspace-pane entry-fade">
                <h1 className="pane-title">Text</h1>
                <textarea
                  className="air-textarea"
                  placeholder="Type or paste code/text here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                {text && (
                  <div className="text-preview-box">
                    <div className="live-status-pill">
                      <div className="pill-left-content">
                        <CheckCircle size={16} className="status-icon" />
                        <span className="pill-label">Live Preview</span>
                      </div>
                      <button className="pill-action-btn" onClick={() => copyTodoText(text)}>Copy Text</button>
                    </div>

                    <div className="formatted-text-display">
                      {renderTextWithLinks(text)}
                    </div>
                  </div>
                )}

                <div className="action-footer">
                  <div className="timer-selector">
                    <Clock size={16} className="timer-icon" />
                    <select value={expiryOption} onChange={(e) => setExpiryOption(e.target.value)} className="air-select">
                      <option value="never">Never Expire</option>
                      <option value="5m">Auto Delete (5 mins)</option>
                      <option value="1h">Auto Delete (1 hour)</option>
                      <option value="24h">Auto Delete (24 hours)</option>
                    </select>
                  </div>
                  <button className="air-save-btn" onClick={InsertText} disabled={textLoading}>
                    {textLoading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="workspace-pane entry-fade">
                <h1 className="pane-title">Files</h1>

                <div className="air-file-zone">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden-file-input"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                  <label htmlFor="file-upload" className="file-zone-label">
                    {file ? `Selected: ${file.name}` : "Click or Drop your files here"}
                  </label>
                </div>

                {/* Live Rich Media Preview */}
                {mediaUrl && renderMediaPreview(mediaUrl, mediaName)}

                {/* File Action Controls (Download & Delete) */}
                {mediaUrl && (
                  <div className="live-status-pill">
                    <div className="pill-left-content truncate">
                      <CheckCircle size={16} className="status-icon" />
                      <span className="pill-label truncate">{mediaName || "Cloud Asset Ready"}</span>
                    </div>

                    <div className="pill-button-group">
                      <button className="pill-action-btn explicit-flex" onClick={() => handleDownload(mediaUrl, mediaName)}>
                        <Download size={14} style={{ marginRight: '4px' }} /> Download
                      </button>
                      <button className="pill-action-btn delete-btn explicit-flex" onClick={handleDeleteMedia}>
                        <Trash2 size={14} style={{ marginRight: '4px' }} /> Delete
                      </button>
                    </div>
                  </div>
                )}

                <div className="action-footer">
                  <div className="timer-selector">
                    <Clock size={16} className="timer-icon" />
                    <select value={expiryOption} onChange={(e) => setExpiryOption(e.target.value)} className="air-select">
                      <option value="never">Never Expire</option>
                      <option value="5m">Auto Delete (5 mins)</option>
                      <option value="1h">Auto Delete (1 hour)</option>
                      <option value="24h">Auto Delete (24 hours)</option>
                    </select>
                  </div>
                  <button className="air-save-btn" onClick={InsertMedia} disabled={mediaLoading}>
                    {mediaLoading ? "Uploading..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="air-footer">
        <p>© 2026 EveryCodeShare.com</p>
      </footer>
    </div>
  );
}

export default Home;