import { Routes, Route } from "react-router";
import { Home } from "./components/Home";
import { Board } from "./components/Board";
import { TaskPool } from "./components/TaskPool";
import { Layout } from "./components/Layout";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/board/:type/:week?" element={<Board />} />
        <Route path="/pool" element={<TaskPool />} />
      </Route>
    </Routes>
  );
}
