import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* HOME PAGE */}
        <Route path="/" element={<Home />} />

        {/* 🔥 DYNAMIC ROOM (IMPORTANT FIX) */}
        <Route path="/room/:roomId" element={<Room />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;