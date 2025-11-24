import { useState, useEffect } from "react";
import { GameBoard } from "@/components/GameBoard";
import { Button } from "@/components/ui/button";
import { parseCSV, shuffleArray, type Word } from "@/utils/wordParser";
import wordsCSV from "@/data/words.csv?raw";

const Index = () => {
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isHardMode, setIsHardMode] = useState(false);

  useEffect(() => {
    const parsedWords = parseCSV(wordsCSV);
    setWords(shuffleArray(parsedWords));
  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setCurrentWordIndex(0);
    const parsedWords = parseCSV(wordsCSV);
    setWords(shuffleArray(parsedWords));
  };

  const handleWordComplete = () => {
    const currentWord = words[currentWordIndex];
    setScore(prev => prev + currentWord.english.length * 10);
    
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
    } else {
      // Won the game!
      setGameState("gameover");
    }
  };

  const handleGameOver = () => {
    setGameState("gameover");
  };

  if (gameState === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col items-center justify-center p-8 gap-8">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-primary animate-glow">
            DROP GAME
          </h1>
          <p className="text-xl text-muted-foreground max-w-md">
            Catch falling words and build them before they hit the bottom!
          </p>
        </div>
        
        <div className="flex flex-col gap-4 items-center">
          <Button 
            onClick={startGame}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-2xl px-12 py-8 rounded-2xl shadow-lg hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all animate-pop-in"
          >
            START GAME
          </Button>
          
          <div className="text-center text-sm text-muted-foreground space-y-2 max-w-sm mt-8">
            <p className="font-semibold text-foreground">HOW TO PLAY:</p>
            <p>• Words fall from the top</p>
            <p>• Tap letters at the bottom to build the word</p>
            <p>• Tap answer blocks to remove letters</p>
            <p>• Complete words before they reach the bottom!</p>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "gameover") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col items-center justify-center p-8 gap-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-destructive">
            GAME OVER
          </h1>
          <div className="text-center">
            <div className="text-6xl font-bold text-primary animate-glow mb-2">
              {score}
            </div>
            <div className="text-xl text-muted-foreground">FINAL SCORE</div>
          </div>
        </div>
        
        <Button 
          onClick={startGame}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-2xl px-12 py-8 rounded-2xl shadow-lg hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all"
        >
          PLAY AGAIN
        </Button>
      </div>
    );
  }

  if (words.length === 0 || !words[currentWordIndex]) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center">
        <div className="text-2xl text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <div className="container max-w-2xl mx-auto h-screen">
        <GameBoard 
          currentWord={words[currentWordIndex].english}
          currentWordTurkish={words[currentWordIndex].turkish}
          onWordComplete={handleWordComplete}
          onGameOver={handleGameOver}
          score={score}
          isHardMode={isHardMode}
          onToggleHardMode={() => setIsHardMode(!isHardMode)}
        />
      </div>
    </div>
  );
};

export default Index;
