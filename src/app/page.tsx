// src/app/page.tsx
import Board from "./components/kanban/Board";

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="mb-6 text-3xl font-semibold">Agent Bond Kanban</h1>
      <Board />
    </main>
  );
}
