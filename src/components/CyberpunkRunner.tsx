import {useState, useEffect, useCallback, useRef} from 'react';
import {motion, AnimatePresence} from 'framer-motion';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'GAME_OVER';

const LANES = 3;
const PLAYER_LANE_POSITIONS = ['left-4', 'left-1/2 -ml-3', 'right-4'];

export default function CyberpunkRunner() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [playerLane, setPlayerLane] = useState(1);
  const [score, setScore] = useState(0);
  const [obstacles, setObstacles] = useState<{id: number, lane: number, y: number}[]>([]);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{x: number, y: number} | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {x: e.touches[0].clientX, y: e.touches[0].clientY};
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) setPlayerLane((prev) => Math.min(LANES - 1, prev + 1));
      else setPlayerLane((prev) => Math.max(0, prev - 1));
    }
    touchStart.current = null;
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const gameLoop = setInterval(() => {
      setScore((s) => s + 1);
      
      // Move obstacles down from 100% to 0%
      setObstacles((prev) => 
        prev.map((obs) => ({...obs, y: obs.y - 5}))
            .filter((obs) => obs.y > 10)
      );

      // Collision detection
      obstacles.forEach(obs => {
        if (obs.y < 20 && obs.y > 10 && (obs.lane === playerLane)) {
          setGameState('GAME_OVER');
        }
      });

      // Spawn new obstacles at top (100%)
      if (Math.random() < 0.05) {
        setObstacles((prev) => [
          ...prev, 
          {id: Date.now(), lane: Math.floor(Math.random() * LANES), y: 100}
        ]);
      }
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, obstacles, playerLane]);

  const handleInput = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'PLAYING') return;

    if (e.key === 'ArrowLeft') setPlayerLane((prev) => Math.max(0, prev - 1));
    if (e.key === 'ArrowRight') setPlayerLane((prev) => Math.min(LANES - 1, prev + 1));
    if (e.key === 'Escape') setGameState('TITLE_MENU');
  }, [gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleInput);
    return () => window.removeEventListener('keydown', handleInput);
  }, [handleInput]);

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-100 overflow-hidden">
      <header className="absolute top-0 w-full p-6 flex justify-between items-center bg-slate-950/80 backdrop-blur-sm z-10 border-b border-cyan-500/30">
        <h1 className="text-xl font-bold tracking-tight text-cyan-400">Cyberpunk Neon Runner</h1>
        {gameState === 'PLAYING' && <div className="text-lg tabular-nums font-mono text-pink-400">Score: {score}</div>}
      </header>

      <div 
        className="relative w-full max-w-2xl h-[80vh] overflow-hidden touch-none perspective-[1000px]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-0 bg-slate-950" /> 
        
        {/* The 3D Track */}
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 border-x-4 border-cyan-500/50 transform rotate-x-[60deg] origin-bottom transition-transform duration-500" />
        </div>

        <AnimatePresence>
          {gameState === 'TITLE_MENU' && (
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20">
              <h2 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">NEON RUNNER</h2>
              <button 
                onClick={() => { setScore(0); setObstacles([]); setGameState('PLAYING'); }}
                className="px-8 py-3 bg-cyan-500 text-slate-950 font-bold rounded-lg hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.5)]"
              >
                Start Game
              </button>
            </motion.div>
          )}

          {gameState === 'PLAYING' && (
            <>
              {obstacles.map(obs => (
                <motion.div 
                  key={obs.id}
                  className={`absolute w-20 h-10 bg-pink-600 rounded-sm shadow-[0_0_15px_rgba(219,39,119,0.8)] border border-pink-400 transition-all duration-75`}
                  style={{
                      bottom: `${obs.y}%`,
                      left: obs.lane === 0 ? '10%' : obs.lane === 1 ? '45%' : '80%'
                  }}
                />
              ))}
              {/* Player Character Placeholder */}
              <div 
                className={`absolute bottom-[15%] w-16 h-24 bg-cyan-400 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.8)] transition-all duration-200`}
                style={{
                    left: playerLane === 0 ? '15%' : playerLane === 1 ? '48%' : '75%'
                }}
              />
            </>
          )}

          {gameState === 'GAME_OVER' && (
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20 bg-slate-950/80">
              <h2 className="text-4xl font-bold text-red-500">GAME OVER</h2>
              <p className="text-xl font-mono">Final Score: {score}</p>
              <button 
                onClick={() => { setScore(0); setObstacles([]); setGameState('PLAYING'); }}
                className="px-8 py-3 bg-cyan-500 text-slate-950 font-bold rounded-lg hover:bg-cyan-400 transition-colors"
              >
                Play Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
