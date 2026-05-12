/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route } from "react-router";
import { Home } from "./components/Home";
import { Board } from "./components/Board";
import { TaskPool } from "./components/TaskPool";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/board/:type" element={<Board />} />
      <Route path="/pool" element={<TaskPool />} />
    </Routes>
  );
}
