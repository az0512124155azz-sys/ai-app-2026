// frontend/src/api.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000/api';

export async function sendChat({ sessionId, mode, userMessage, messages = [], options = {} , onStatus }) {
  const body = { sessionId, mode, userMessage, messages, options };
  // open SSE to receive status updates
  const evtSrc = new EventSource(`${API_BASE.replace('/api', '')}/events/${sessionId}`);
  evtSrc.onmessage = (ev) => {
    // default event message (if server uses 'message')
    try {
      const d = JSON.parse(ev.data);
      if (onStatus) onStatus(d);
    } catch (e) {}
  };
  evtSrc.addEventListener('status', (ev) => {
    try { if (onStatus) onStatus(JSON.parse(ev.data)); } catch (e) {}
  });

  const resp = await axios.post(`${API_BASE}/chat`, body, { timeout: 120000 });
  // close the eventsource when done
  setTimeout(() => evtSrc.close(), 5000);
  return resp.data;
}

export async function downloadFiles(files, archiveName='download.zip') {
  const resp = await axios.post(`${API_BASE}/download`, { files, archiveName }, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([resp.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = archiveName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
