import { useState, useEffect } from "react";
import "./home.css";

export default function Home() {

  const [roomId, setRoomId] = useState("");
  const [history, setHistory] = useState([]);

  // 📊 Load meeting history
  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem("history")) || [];
    setHistory(savedHistory);
  }, []);

  // ✅ JOIN
  const joinMeeting = () => {
    if (!roomId.trim()) return alert("Enter Room ID");

    const newHistory = [...history, roomId];
    localStorage.setItem("history", JSON.stringify(newHistory));

    window.location.href = `/room/${roomId}`;
  };

  // ✅ CREATE NEW MEETING
  const createMeeting = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8);

    const newHistory = [...history, newRoomId];
    localStorage.setItem("history", JSON.stringify(newHistory));

    alert(`Meeting ID: ${newRoomId}`); // optional UX

    window.location.href = `/room/${newRoomId}`;
  };

  // 📝 OPEN NOTES
  const openNotes = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith("notes-"));

    if (keys.length === 0) {
      alert("No notes found");
      return;
    }

    const notesData = keys.map(key => {
      const id = key.replace("notes-", "");
      return `Room: ${id}\n${localStorage.getItem(key)}`;
    });

    alert(notesData.join("\n\n-----------------\n\n"));
  };

  return (
    <div className="home">

      <h1 className="app-title">🌐 ConnecSphere</h1>
      <p className="tagline">Connect. Meet. Collaborate.</p>

      <div className="card-container">

        {/* JOIN + CREATE */}
        <div className="card">
          <h2>🎥 Meeting</h2>

          <div className="join-box">
            <input
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button onClick={joinMeeting}>Join</button>
          </div>

          {/* ✅ NEW BUTTON */}
          <button className="create-btn" onClick={createMeeting}>
            ➕ Create Meeting
          </button>
        </div>

        {/* NOTES */}
        <div className="card">
          <h2>📝 Saved Notes</h2>
          <p>View notes from meetings</p>
          <button onClick={openNotes}>Open Notes</button>
        </div>

        {/* HISTORY */}
        <div className="card">
          <h2>📊 Meeting History</h2>

          {history.length === 0 ? (
            <p>No history yet</p>
          ) : (
            <ul className="history-list">
              {history.slice(-5).reverse().map((id, i) => (
                <li key={i}>{id}</li>
              ))}
            </ul>
          )}
        </div>

      </div>

    </div>
  );
}