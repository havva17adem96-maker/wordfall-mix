import { useState, useEffect } from "react";
import { GameBoard } from "@/components/GameBoard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLearnedWords, shuffleArray, type LearnedWord } from "@/hooks/useLearnedWords";

const Index = () => {
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [gameWords, setGameWords] = useState<LearnedWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [isHardMode, setIsHardMode] = useState(false);
  
  const { words, packages, selectedPackage, setSelectedPackage, loading, error } = useLearnedWords();

  // Clear localStorage on mount
  useEffect(() => {
    localStorage.clear();
  }, []);

  const startGame = () => {
    if (words.length === 0) return;
    setGameState("playing");
    setScore(0);
    setCombo(1);
    setCurrentWordIndex(0);
    setGameWords(shuffleArray(words));
  };

  const calculateComboMultiplier = (currentCombo: number) => {
    // Max 50% bonus at 10+ combo
    const bonusPercent = Math.min((currentCombo - 1) * 5, 50);
    return 1 + bonusPercent / 100;
  };

  const handleWordComplete = () => {
    const baseXP = isHardMode ? 200 : 100;
    const multiplier = calculateComboMultiplier(combo);
    const earnedXP = Math.floor(baseXP * multiplier);
    
    setScore(prev => prev + earnedXP);
    setCombo(prev => prev + 1);
    
    if (currentWordIndex < gameWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
    } else {
      setGameState("gameover");
    }
  };

  const handleWordFailed = () => {
    setCombo(1); // Reset combo on failure
  };

  const handleGameOver = () => {
    setGameState("gameover");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center">
        <div className="text-2xl text-muted-foreground animate-pulse">Kelimeler yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="text-2xl text-destructive">Hata: {error}</div>
          <p className="text-muted-foreground">Supabase bağlantısını kontrol edin.</p>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="text-2xl text-muted-foreground">Henüz öğrenilmiş kelime yok</div>
          <p className="text-muted-foreground">Diğer projede kelime ekleyin.</p>
        </div>
      </div>
    );
  }

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
          <p className="text-sm text-muted-foreground">
            {words.length} kelime yüklendi
          </p>
        </div>
        
        <div className="flex flex-col gap-4 items-center w-full max-w-xs">
          {/* Package Selector */}
          <div className="w-full space-y-2">
            <label className="text-sm text-muted-foreground">Paket Seç:</label>
            <Select 
              value={selectedPackage || "all"} 
              onValueChange={(value) => setSelectedPackage(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full bg-background border-border">
                <SelectValue placeholder="Tüm Kelimeler" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="all">Tüm Kelimeler ({words.length})</SelectItem>
                {packages.map((pkg) => (
                  <SelectItem key={pkg} value={pkg}>{pkg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={startGame}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-2xl px-12 py-8 rounded-2xl shadow-lg hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all animate-pop-in w-full"
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

  if (gameWords.length === 0 || !gameWords[currentWordIndex]) {
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
          currentWord={gameWords[currentWordIndex].english.toLowerCase()}
          currentWordTurkish={gameWords[currentWordIndex].turkish}
          onWordComplete={handleWordComplete}
          onWordFailed={handleWordFailed}
          onGameOver={handleGameOver}
          score={score}
          combo={combo}
          isHardMode={isHardMode}
          onToggleHardMode={() => setIsHardMode(!isHardMode)}
        />
      </div>
    </div>
  );
};

export default Index;
