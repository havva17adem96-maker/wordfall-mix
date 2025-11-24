import { useState, useEffect, useCallback } from "react";
import { LetterBlock } from "./LetterBlock";
import { shuffleArray } from "@/utils/wordParser";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

interface GameBoardProps {
  currentWord: string;
  onWordComplete: () => void;
  onGameOver: () => void;
  score: number;
}

const GRID_HEIGHT = 10;
const BASE_FALL_DURATION = 15000; // 15 seconds base

export const GameBoard = ({ currentWord, onWordComplete, onGameOver, score }: GameBoardProps) => {
  const [answerBlocks, setAnswerBlocks] = useState<string[]>([]);
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [fallingPosition, setFallingPosition] = useState(0);
  const [stackedWords, setStackedWords] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();

  const maxPosition = GRID_HEIGHT - stackedWords.length;
  const fallDuration = BASE_FALL_DURATION - (currentWord.length * 500);

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
          setStackedWords(prev => [...prev, next]);
          
          if (stackedWords.length + 1 >= GRID_HEIGHT - 1) {
            // Game over
            setTimeout(() => onGameOver(), 500);
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
          toast({
            title: "Correct! ✓",
            description: `+${currentWord.length * 10} points`,
            duration: 1500,
          });
          setTimeout(() => onWordComplete(), 300);
        } else {
          // Wrong word - shake animation
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
      {/* Score */}
      <div className="text-center">
        <div className="text-primary text-4xl font-bold animate-glow">
          {score}
        </div>
        <div className="text-muted-foreground text-sm">SCORE</div>
      </div>

      {/* Game Grid */}
      <div className="flex-1 flex flex-col justify-center relative">
        <div className="relative h-[500px] border-2 border-game-border rounded-2xl bg-game-block/20 overflow-hidden">
          {/* Falling word */}
          <div 
            className="absolute left-0 right-0 flex justify-center gap-2 px-4 transition-transform"
            style={{ 
              transform: `translateY(${fallingPosition * 50}px)`,
              transitionDuration: `${fallDuration / maxPosition}ms`,
              transitionTimingFunction: 'linear'
            }}
          >
            {currentWord.split("").map((letter, i) => (
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
          
          {/* Stacked words indicator */}
          {stackedWords.map((pos, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-[50px] bg-destructive/20 border-y border-destructive/50"
              style={{ bottom: `${(stackedWords.length - i - 1) * 50}px` }}
            />
          ))}
        </div>
      </div>

      {/* Answer area */}
      <div className="space-y-2">
        <div className="text-center text-sm text-muted-foreground">BUILD THE WORD</div>
        <div className="flex justify-center gap-2 px-4">
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
        <div className="text-center text-sm text-muted-foreground">TAP LETTERS</div>
        <div className="grid grid-cols-5 gap-2 px-4">
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
