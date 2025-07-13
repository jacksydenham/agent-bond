import Board from "./components/kanban/Board";
import BezelLine from "./components/ui/BezelLine";
import { greatVibes } from "./layout";

export default function Home() {
  return (
    <main className="bg-black min-h-screen overflow-visible">
      <header className="max-w-7xl mx-auto px-6 py-8 text-center overflow-visible">
        <h1
          className={`
           ${greatVibes.className}
           text-6xl lg:text-7xl  
           font-black
           tracking-tight  
           bg-clip-text text-transparent  
           bg-gradient-to-r from-[#D4AF37] via-[#C0C0C0] to-white  
           leading-snug py-4 overflow-visible
         `}
        >
          Agent Bond Dashboard
        </h1>
        <div className="flex items-center justify-center space-x-6 px-6">
          <div className="flex-1 h-3">
            <BezelLine
              ticks={60}
              viewBoxWidth={600}
              height={2}
              stroke="#D4AF37"
              minorLen={10}
              majorLen={14}
            />
          </div>

          <p
            className="
           text-base lg:text-lg
           italic
           tracking-wide
           text-white/60
         "
          >
            Your mission control for tracking tasks in style.
          </p>

          <div className="flex-1 h-3">
            <BezelLine
              ticks={60}
              viewBoxWidth={600}
              height={2}
              stroke="#D4AF37"
              minorLen={10}
              majorLen={14}
            />
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pb-16">
        <Board />
      </section>
    </main>
  );
}
