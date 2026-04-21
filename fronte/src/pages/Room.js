import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import socket from "../socket";
import "./room.css";

export default function Room() {

  const { roomId } = useParams();

  const [myName, setMyName] = useState("");
  const [userNames, setUserNames] = useState({});

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [notes, setNotes] = useState("");

  const [activePanel, setActivePanel] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);

  const [remoteStreams, setRemoteStreams] = useState({});
  const [raisedHands, setRaisedHands] = useState({});
  const [myHandRaised, setMyHandRaised] = useState(false);

  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  const videoRef = useRef(null);
  const peersRef = useRef({});
  const streamRef = useRef(null);

  // 🎥 CAMERA
  const toggleCamera = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  };

  // 🎤 MIC
  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  // ✋ HAND
  const toggleRaiseHand = () => {
    const status = !myHandRaised;
    setMyHandRaised(status);
    socket.emit("raise-hand", { roomId, status });
  };

  // 🖥️ SCREEN SHARE
  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (videoRef.current) videoRef.current.srcObject = screenStream;

        screenTrack.onended = stopScreenShare;
        setScreenSharing(true);
      } else {
        stopScreenShare();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const stopScreenShare = () => {
    const camTrack = streamRef.current?.getVideoTracks()[0];
    if (!camTrack) return;

    Object.values(peersRef.current).forEach(peer => {
      const sender = peer.getSenders().find(s => s.track?.kind === "video");
      if (sender) sender.replaceTrack(camTrack);
    });

    if (videoRef.current) videoRef.current.srcObject = streamRef.current;

    setScreenSharing(false);
  };

  // 🔥 CREATE PEER
  const createPeer = (targetId) => {
    const peer = new RTCPeerConnection();

    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", e.candidate, targetId);
    };

    peer.ontrack = (e) => {
      const stream = e.streams[0];
      setRemoteStreams(prev => ({ ...prev, [targetId]: stream }));
    };

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        peer.addTrack(track, streamRef.current);
      });
    }

    return peer;
  };

  // 🔥 MAIN
  useEffect(() => {

    const name = prompt("Enter your name") || "Guest";
    setMyName(name);

    socket.emit("join-room", { roomId, name });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      });

    // SOCKET EVENTS
    const handleAllUsers = (users) => setUserNames(users);

    const handleUserConnected = async ({ userId, name }) => {
      setUserNames(prev => ({ ...prev, [userId]: name }));

      const peer = createPeer(userId);
      peersRef.current[userId] = peer;

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit("offer", offer, userId);
    };

    const handleOffer = async (offer, userId) => {
      const peer = createPeer(userId);
      peersRef.current[userId] = peer;

      await peer.setRemoteDescription(offer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer", answer, userId);
    };

    const handleAnswer = (answer, userId) => {
      peersRef.current[userId]?.setRemoteDescription(answer);
    };

    const handleIce = (candidate, userId) => {
      peersRef.current[userId]?.addIceCandidate(candidate);
    };

    const handleDisconnect = (userId) => {
      peersRef.current[userId]?.close();
      delete peersRef.current[userId];

      setRemoteStreams(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });

      setUserNames(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    };

    const handleHand = ({ userId, status }) => {
      setRaisedHands(prev => ({ ...prev, [userId]: status }));
    };

    const handleMessage = (msg) => {
      setMessages(prev => [...prev, msg]);
    };

    socket.on("all-users", handleAllUsers);
    socket.on("user-connected", handleUserConnected);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIce);
    socket.on("user-disconnected", handleDisconnect);
    socket.on("user-raised-hand", handleHand);
    socket.on("receive-message", handleMessage);
    socket.on("receive-notes", setNotes);

    return () => {
      Object.values(peersRef.current).forEach(peer => peer.close());

      socket.off("all-users", handleAllUsers);
      socket.off("user-connected", handleUserConnected);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIce);
      socket.off("user-disconnected", handleDisconnect);
      socket.off("user-raised-hand", handleHand);
      socket.off("receive-message", handleMessage);
      socket.off("receive-notes", setNotes);
    };

  }, [roomId]);

  // 💬 SEND
  const sendMessage = () => {
    if (!message.trim()) return;

    socket.emit("send-message", message, roomId);
    setMessages(prev => [...prev, message]);
    setMessage("");
  };

  const handleNotesChange = (e) => {
    const value = e.target.value;
    setNotes(value);
    socket.emit("send-notes", { roomId, notes: value });

    localStorage.setItem(`notes-${roomId}`, value);
  };

  return (
    <div className="room">

      {/* 🎥 VIDEO */}
      <div className="video-grid">

        <div className="video-wrapper">
          <div className="username">{myName}</div>
          {myHandRaised && <div className="hand-icon">✋</div>}
          <video ref={videoRef} autoPlay muted className="video-box" />
        </div>

        {Object.entries(remoteStreams).map(([id, stream]) => (
          <div key={id} className="video-wrapper">
            <div className="username">{userNames[id] || "User"}</div>
            {raisedHands[id] && <div className="hand-icon">✋</div>}
            <video autoPlay className="video-box"
              ref={(el) => el && (el.srcObject = stream)} />
          </div>
        ))}

      </div>

      {/* ✅ CHAT + NOTES PANEL */}
      {activePanel && (
        <div className="side-panel">

          <div className="panel-header">
            <h3>{activePanel === "chat" ? "💬 Chat" : "📝 Notes"}</h3>
            <button onClick={() => setActivePanel(null)}>❌</button>
          </div>

          {activePanel === "chat" ? (
            <>
              <div className="chat-box">
                {messages.map((msg, i) => <p key={i}>{msg}</p>)}
              </div>

              <div className="chat-input">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button onClick={sendMessage}>Send</button>
              </div>
            </>
          ) : (
            <textarea
              className="notes-area"
              value={notes}
              onChange={handleNotesChange}
            />
          )}

        </div>
      )}

      {/* 👥 PARTICIPANTS */}
      {showParticipants && (
        <div className="participants-panel">
          <div className="panel-header">
            <h3>👥 Participants</h3>
            <button onClick={() => setShowParticipants(false)}>❌</button>
          </div>

          <div className="participants-list">
            <div className="participant">🟢 {myName} (You)</div>
            {Object.entries(userNames).map(([id, name]) => (
              <div key={id} className="participant">🔵 {name}</div>
            ))}
          </div>
        </div>
      )}

      {/* 🎛️ CONTROLS */}
      <div className="controls">

        <button onClick={toggleMic} className={`control-btn ${!micOn ? "active" : ""}`}>🎤</button>
        <button onClick={toggleCamera} className={`control-btn ${!cameraOn ? "active" : ""}`}>📷</button>
        <button onClick={toggleScreenShare} className={`control-btn ${screenSharing ? "active" : ""}`}>🖥️</button>
        <button onClick={toggleRaiseHand} className={`control-btn ${myHandRaised ? "active" : ""}`}>✋</button>

        <button onClick={() => setShowParticipants(prev => !prev)} className="control-btn">👥</button>
        <button onClick={() => setActivePanel(activePanel === "chat" ? null : "chat")} className="control-btn">💬</button>
        <button onClick={() => setActivePanel(activePanel === "notes" ? null : "notes")} className="control-btn">📝</button>

        <button className="control-btn leave">❌</button>

      </div>

    </div>
  );
}