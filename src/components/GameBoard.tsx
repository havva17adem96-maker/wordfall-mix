import { useState, useEffect, useCallback } from "react";
import { LetterBlock } from "./LetterBlock";
import { shuffleArray } from "@/utils/wordParser";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

interface GameBoardProps {
  currentWord: string;
  currentWordTurkish: string;
  onWordComplete: () => void;
  onWordFailed: () => void;
  onGameOver: () => void;
  score: number;
  combo: number;
  isHardMode: boolean;
  onToggleHardMode: () => void;
}

const GRID_HEIGHT = 10;
const BASE_FALL_DURATION = 8000; // 8 seconds base
const TIME_PER_LETTER = 800; // Extra time per letter

export const GameBoard = ({ currentWord, currentWordTurkish, onWordComplete, onWordFailed, onGameOver, score, combo, isHardMode, onToggleHardMode }: GameBoardProps) => {
  const [answerBlocks, setAnswerBlocks] = useState<string[]>([]);
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [fallingPosition, setFallingPosition] = useState(0);
  const [stackedWords, setStackedWords] = useState<{word: string, position: number}[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();

  const maxPosition = GRID_HEIGHT - stackedWords.length;
  // Longer words get more time to type
  const fallDuration = BASE_FALL_DURATION + (currentWord.length * TIME_PER_LETTER);

  useEffect(() => {
    // Initialize game state for new word
    setAnswerBlocks(Array(currentWord.length).fill(""));
    setScrambledLetters(shuffleArray(currentWord.split("")));
    setFallingPosition(0);
    setIsAnimating(true);
  }, [currentWord]);

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setFallingPosition(prev => {
        const next = prev + 1;
        
        if (next >= maxPosition) {
          // Word reached bottom without completion
          setIsAnimating(false);
          setStackedWords(prev => [...prev, { word: currentWord, position: next }]);
          onWordFailed(); // Reset combo
          
          if (stackedWords.length + 1 >= GRID_HEIGHT - 1) {
            // Game over
            setTimeout(() => onGameOver(), 500);
          } else {
            // Move to next word immediately
            setTimeout(() => onWordComplete(), 300);
          }
          
          return next;
        }
        
        return next;
      });
    }, fallDuration / maxPosition);

    return () => clearInterval(interval);
  }, [isAnimating, maxPosition, fallDuration, stackedWords.length, onGameOver]);

  const handleScrambledLetterClick = useCallback((letter: string, index: number) => {
    const firstEmptyIndex = answerBlocks.findIndex(block => block === "");
    
    if (firstEmptyIndex !== -1) {
      const newAnswer = [...answerBlocks];
      newAnswer[firstEmptyIndex] = letter;
      setAnswerBlocks(newAnswer);
      
      const newScrambled = [...scrambledLetters];
      newScrambled[index] = "";
      setScrambledLetters(newScrambled);
      
      // Check if word is complete
      if (newAnswer.every(block => block !== "")) {
        const formedWord = newAnswer.join("");
        if (formedWord === currentWord) {
          setIsAnimating(false);
          const baseXP = isHardMode ? 200 : 100;
          const bonusPercent = Math.min((combo - 1) * 5, 50);
          const earnedXP = Math.floor(baseXP * (1 + bonusPercent / 100));
          toast({
            title: "Correct! ✓",
            description: `+${earnedXP} XP (x${combo})`,
            duration: 1500,
          });
          setTimeout(() => onWordComplete(), 300);
        } else {
          // Wrong word - shake animation
          onWordFailed(); // Reset combo on wrong guess
          toast({
            title: "Try again!",
            variant: "destructive",
            duration: 1500,
          });
          setTimeout(() => {
            setAnswerBlocks(Array(currentWord.length).fill(""));
            setScrambledLetters(shuffleArray([...currentWord.split("")]));
          }, 500);
        }
      }
    }
  }, [answerBlocks, scrambledLetters, currentWord, onWordComplete, toast]);

  const handleAnswerBlockClick = useCallback((index: number) => {
    if (answerBlocks[index] !== "") {
      const letter = answerBlocks[index];
      
      // Remove from answer
      const newAnswer = [...answerBlocks];
      newAnswer[index] = "";
      setAnswerBlocks(newAnswer);
      
      // Add back to scrambled
      const firstEmptyScrambledIndex = scrambledLetters.findIndex(l => l === "");
      const newScrambled = [...scrambledLetters];
      if (firstEmptyScrambledIndex !== -1) {
        newScrambled[firstEmptyScrambledIndex] = letter;
      }
      setScrambledLetters(newScrambled);
    }
  }, [answerBlocks, scrambledLetters]);

  return (
    <div className="flex flex-col h-full justify-between p-4 gap-4">
      {/* Score, Combo and Hard Mode */}
      <div className="flex justify-center items-center gap-4">
        <div className="text-center">
          <div className="text-primary text-3xl font-bold animate-glow">
            {score}
          </div>
          <div className="text-muted-foreground text-xs">XP</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${combo > 1 ? 'text-yellow-500 animate-pulse' : 'text-muted-foreground'}`}>
            x{combo}
          </div>
          <div className="text-muted-foreground text-xs">
            +{Math.min((combo - 1) * 5, 50)}%
          </div>
        </div>
        <Button
          onClick={onToggleHardMode}
          variant={isHardMode ? "default" : "outline"}
          size="sm"
          className="font-bold"
        >
          {isHardMode ? "ZOR ✓" : "ZOR"}
        </Button>
      </div>

      {/* Game Grid */}
      <div className="flex-1 flex flex-col justify-center relative">
        <div className="relative h-[500px] border-2 border-game-border rounded-2xl bg-game-block/20 overflow-hidden">
          {/* Falling word */}
          <div 
            className="absolute left-0 right-0 flex justify-center gap-1 px-4 transition-transform"
            style={{ 
              transform: `translateY(${fallingPosition * 50}px)`,
              transitionDuration: `${fallDuration / maxPosition}ms`,
              transitionTimingFunction: 'linear'
            }}
          >
            {(isHardMode ? currentWordTurkish : currentWord).split("").map((letter, i) => (
              <LetterBlock key={i} letter={letter} variant="falling" />
            ))}
          </div>

          {/* Grid lines */}
          {Array.from({ length: GRID_HEIGHT }).map((_, i) => (
            <div 
              key={i}
              className="absolute left-0 right-0 border-t border-game-border/30"
              style={{ top: `${(i + 1) * 50}px` }}
            />
          ))}
          
          {/* Stacked words */}
          {stackedWords.map((item, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-[50px] bg-destructive/20 border-y border-destructive/50 flex justify-center items-center gap-1"
              style={{ bottom: `${(stackedWords.length - i - 1) * 50}px` }}
            >
              {item.word.split("").map((letter, idx) => (
                <LetterBlock key={idx} letter={letter} variant="falling" size="small" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Answer area */}
      <div className="space-y-2">
        <div className="text-center text-sm text-muted-foreground">
          {isHardMode ? "KELİMEYİ YAZ" : "BUILD THE WORD"}
        </div>
        <div className="flex justify-center gap-1 px-4 flex-wrap">
          {answerBlocks.map((letter, i) => (
            <LetterBlock 
              key={i} 
              letter={letter} 
              variant={letter ? "answer" : "empty"}
              onClick={() => handleAnswerBlockClick(i)}
              className="animate-pop-in"
            />
          ))}
        </div>
      </div>

      {/* Scrambled letters */}
      <div className="space-y-2">
        <div className="text-center text-sm text-muted-foreground">
          {isHardMode ? "HARFLERİ SEÇ" : "TAP LETTERS"}
        </div>
        <div className="grid grid-cols-6 gap-1 px-4 max-w-md mx-auto">
          {scrambledLetters.map((letter, i) => (
            <LetterBlock 
              key={i} 
              letter={letter} 
              variant="scrambled"
              onClick={() => handleScrambledLetterClick(letter, i)}
              disabled={!letter}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
