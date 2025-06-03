import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Auth from "./Login";
import Notespage from "./Notespage";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/notes" element={<Notespage />} />
      </Routes>
    </Router>
  );
};

export default App;
