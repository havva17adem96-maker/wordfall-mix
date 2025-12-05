import { useState, useEffect } from "react";
import { GameBoard } from "@/components/GameBoard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLearnedWords, shuffleArray, type LearnedWord } from "@/hooks/useLearnedWords";
import { Star } from "lucide-react";

const Index = () => {
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [gameWords, setGameWords] = useState<LearnedWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [isHardMode, setIsHardMode] = useState(false);
  
  const { words, allWords, packages, selectedPackage, setSelectedPackage, loading, error, incrementStar, resetStarToOne } = useLearnedWords();

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

  const calculateXP = (currentCombo: number) => {
    // Normal: 100 + (combo-1)*5, max 150
    // Hard: 200 + (combo-1)*10, max 300
    if (isHardMode) {
      return 200 + Math.min((currentCombo - 1) * 10, 100);
    }
    return 100 + Math.min((currentCombo - 1) * 5, 50);
  };

  const handleWordCorrect = async () => {
    const currentWord = gameWords[currentWordIndex];
    const earnedXP = calculateXP(combo);
    setScore(prev => prev + earnedXP);
    setCombo(prev => prev + 1);
    
    // Increment star rating (max 5)
    if (currentWord) {
      await incrementStar(currentWord.id, currentWord.star_rating || 0);
    }
    
    moveToNextWord();
  };

  const handleWordWrong = async () => {
    const currentWord = gameWords[currentWordIndex];
    // 0 XP for wrong words, reset combo
    setCombo(1);
    
    // Reset star rating to 1
    if (currentWord) {
      await resetStarToOne(currentWord.id);
    }
    
    moveToNextWord();
  };

  const moveToNextWord = () => {
    if (currentWordIndex < gameWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
    } else {
      setGameState("gameover");
    }
  };

  const handleGameOver = () => {
    setGameState("gameover");
  };

  // Group words by star rating
  const getWordsByStars = (starCount: number) => {
    const wordsToShow = selectedPackage 
      ? allWords.filter(w => w.package_name === selectedPackage)
      : allWords;
    return wordsToShow.filter(w => (w.star_rating || 0) === starCount);
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        className={`w-3 h-3 ${i < count ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
      />
    ));
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
          <p className="text-xs text-muted-foreground">URL: {window.location.href}</p>
        </div>
      </div>
    );
  }

  if (allWords.length === 0) {
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
                <SelectItem value="all">Tüm Kelimeler ({allWords.length})</SelectItem>
                {packages.map((pkg) => (
                  <SelectItem key={pkg} value={pkg}>
                    {pkg} ({allWords.filter(w => w.package_name === pkg).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* All Words Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Tüm Kelimeler ({words.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedPackage ? `${selectedPackage} Kelimeleri` : 'Tüm Kelimeler'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {[5, 4, 3, 2, 1, 0].map(starCount => {
                  const starWords = getWordsByStars(starCount);
                  if (starWords.length === 0) return null;
                  return (
                    <div key={starCount} className="space-y-2">
                      <div className="flex items-center gap-2 border-b border-border pb-2">
                        {renderStars(starCount)}
                        <span className="text-sm text-muted-foreground">({starWords.length})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {starWords.map(word => (
                          <div key={word.id} className="text-sm p-2 bg-muted rounded">
                            <span className="font-medium">{word.english}</span>
                            <span className="text-muted-foreground"> - {word.turkish}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={startGame}
            disabled={words.length === 0}
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
            <p>• Game over after 9 wrong words</p>
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
          onWordCorrect={handleWordCorrect}
          onWordWrong={handleWordWrong}
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
