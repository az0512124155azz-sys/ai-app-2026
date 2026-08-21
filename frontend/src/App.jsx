// frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { sendChat, downloadFiles } from './api';
import ReactMarkdown from 'react-markdown';
import './index.css';

function Sidebar({ onNew, onSelectMode, mode }) {
  const [open, setOpen] = useState(true);
  return (
    <aside className={`w-72 p-4 ${open ? '' : 'hidden'} bg-[var(--bg-2)] border-r`} dir="rtl">
      <button className="mb-4 bg-gray-800 px-3 py-2 rounded" onClick={() => { onNew(); }}>שיחה חדשה</button>
      <div className="mb-4">
        <div className="text-sm text-[var(--muted)] mb-2">מצבי עבודה</div>
        {['research','web','math','code','vision','fast','translate'].map(m => (
          <button key={m} className={`block w-full text-right px-2 py-2 mb-1 rounded ${mode===m?'bg-[#2D3139]':''}`} onClick={() => onSelectMode(m)}>
            {m}
          </button>
        ))}
      </div>
    </aside>
  )
}

function LiveStatusBar({ status }) {
  return (
    <div className="w-full py-1 px-3 text-xs bg-[#0E0F10] border-t border-[#222]">
      <span className="text-[var(--muted)]">Live: </span>
      <span>{status?.message || 'Idle'}</span>
    </div>
  )
}

function SourcesGrid({ sources }) {
  if (!sources || !sources.length) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
      {sources.map((s, i) => (
        <a key={i} href={s.url} target="_blank" rel="noreferrer" className="p-3 bg-[#111214] border border-[var(--card-border)] rounded">
          <div className="text-sm font-semibold">{s.title || s.url}</div>
          <div className="text-xs text-[var(--muted)]">{s.snippet || s.url}</div>
        </a>
      ))}
    </div>
  );
}

function RightPreviewPanel({ open, content, onClose }) {
  if (!open) return null;
  return (
    <aside className="w-96 p-4 bg-[#0F1112] border-l border-[var(--card-border)] overflow-auto" dir="ltr">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm">Preview</div>
        <button onClick={onClose} className="text-sm">Close</button>
      </div>
      <div>{content}</div>
    </aside>
  );
}

export default function App() {
  const [mode, setMode] = useState('research');
  const [sessionId] = useState(() => `sess-${Date.now()}`);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState({ message: 'Idle' });
  const [sources, setSources] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [loading, setLoading] = useState(false);

  const onNew = () => {
    setMessages([]);
    setSources([]);
    setInput('');
  };

  async function send() {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setStatus({ message: 'Sending...' });

    try {
      const data = await sendChat({
        sessionId,
        mode,
        userMessage: input,
        messages,
        options: {}
      }, (s) => {
        setStatus(s);
      });
      // append assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer_markdown }]);
      setSources(data.sources || []);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: `שגיאה: ${err?.response?.data?.error || err.message}` }]);
    } finally {
      setLoading(false);
      setInput('');
      setStatus({ message: 'Idle' });
    }
  }

  return (
    <div className="h-screen flex" dir="rtl">
      <Sidebar onNew={onNew} onSelectMode={setMode} mode={mode} />
      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-4 overflow-auto">
          <div className="mb-3">
            <LiveStatusBar status={status} />
          </div>

          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`p-4 rounded ${m.role === 'user' ? 'bg-[#111214] self-end text-right' : 'bg-[#0F1315] self-start text-left'}`}>
                {m.role === 'assistant' ? <ReactMarkdown>{m.content}</ReactMarkdown> : <div>{m.content}</div>}
              </div>
            ))}
          </div>

          <SourcesGrid sources={sources} />
        </div>

        <div className="p-4 border-t bg-[#0E0F10]">
          <div className="flex gap-2">
            <textarea className="flex-1 p-3 bg-[#0A0B0C] rounded" value={input} onChange={(e)=>setInput(e.target.value)} placeholder="כתוב שאלה..."></textarea>
            <div className="w-48 flex flex-col">
              <button className="mb-2 bg-[#2D3139] px-3 py-2 rounded" onClick={() => setPreviewOpen(true)}>פתח פריוויו</button>
              <button className="bg-[#6EE7B7] text-black px-3 py-2 rounded" onClick={send} disabled={loading}>{loading ? 'שולח...' : 'שלח'}</button>
            </div>
          </div>
        </div>
      </main>

      <RightPreviewPanel open={previewOpen} content={<div>Preview content (files, mermaid, 3D viewer)</div>} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}
