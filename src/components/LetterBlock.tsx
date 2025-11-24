import { cn } from "@/lib/utils";

interface LetterBlockProps {
  letter: string;
  onClick?: () => void;
  variant?: "answer" | "scrambled" | "falling" | "empty";
  className?: string;
  disabled?: boolean;
}

export const LetterBlock = ({ 
  letter, 
  onClick, 
  variant = "scrambled",
  className,
  disabled = false
}: LetterBlockProps) => {
  const baseStyles = "flex items-center justify-center font-bold text-2xl rounded-xl transition-all duration-200";
  
  const variantStyles = {
    answer: "bg-gradient-to-br from-game-block to-game-block/80 border-2 border-game-border text-foreground min-h-16 aspect-square",
    scrambled: "bg-gradient-to-br from-primary to-primary/90 border-2 border-primary/50 text-primary-foreground hover:scale-105 hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] active:scale-95 cursor-pointer min-h-16 aspect-square",
    falling: "bg-gradient-to-br from-accent to-accent/90 border-2 border-accent/50 text-accent-foreground min-h-14 aspect-square shadow-lg",
    empty: "bg-game-block/30 border-2 border-dashed border-game-border/50 text-muted-foreground/50 min-h-16 aspect-square"
  };

  const isDisabled = disabled || variant === "empty";

  return (
    <button
      onClick={!isDisabled ? onClick : undefined}
      disabled={isDisabled}
      className={cn(
        baseStyles,
        variantStyles[variant],
        isDisabled && "cursor-not-allowed opacity-50",
        !letter && variant !== "empty" && "invisible",
        className
      )}
    >
      {letter ? letter.toUpperCase() : (variant === "empty" ? "" : "")}
    </button>
  );
};
