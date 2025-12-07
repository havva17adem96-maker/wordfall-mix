import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LearnedWord {
  id: string;
  english: string;
  turkish: string;
  package_name?: string;
  star_rating?: number;
}

interface UserWordRating {
  word_id: string;
  star_rating: number;
}

export interface GameState {
  gameWords: LearnedWord[];
  currentWordIndex: number;
  score: number;
  combo: number;
  isHardMode: boolean;
  stackedWords: string[];
}

export function useLearnedWords() {
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [packages, setPackages] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [savedGameState, setSavedGameState] = useState<GameState | null>(null);

  // Get user_id from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('user_id');
    console.log('URL user_id:', uid);
    setUserId(uid);
  }, []);

  // Fetch total XP from profiles table
  const fetchTotalXP = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('tetris_xp')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setTotalXP(data.tetris_xp || 0);
      }
    } catch (err) {
      console.error('Failed to fetch total XP:', err);
    }
  };

  // Add XP to profiles table
  const addTetrisXP = async (xpToAdd: number) => {
    if (!userId || xpToAdd <= 0) return;
    
    try {
      // Get current XP
      const { data: profile } = await supabase
        .from('profiles')
        .select('tetris_xp')
        .eq('user_id', userId)
        .maybeSingle();
      
      const currentXP = profile?.tetris_xp || 0;
      const newTotalXP = currentXP + xpToAdd;
      
      // Upsert profile with new XP
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { user_id: userId, tetris_xp: newTotalXP },
          { onConflict: 'user_id' }
        );
      
      if (error) throw error;
      
      setTotalXP(newTotalXP);
      console.log('XP added successfully:', { added: xpToAdd, total: newTotalXP });
    } catch (err) {
      console.error('Failed to add XP:', err);
    }
  };

  // Save game state to localStorage
  const saveGameState = (state: GameState) => {
    if (!userId) return;
    localStorage.setItem(`game_state_${userId}`, JSON.stringify(state));
    setSavedGameState(state);
  };

  // Load game state from localStorage
  const loadGameState = (): GameState | null => {
    if (!userId) return null;
    const saved = localStorage.getItem(`game_state_${userId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  // Clear saved game state
  const clearGameState = () => {
    if (!userId) return;
    localStorage.removeItem(`game_state_${userId}`);
    setSavedGameState(null);
  };

  // Check for saved game on mount
  useEffect(() => {
    if (userId) {
      const saved = loadGameState();
      setSavedGameState(saved);
      fetchTotalXP();
    }
  }, [userId]);

  const fetchWords = async () => {
    try {
      setLoading(true);
      
      // Fetch all words
      const { data: wordsData, error: wordsError } = await supabase
        .from('learned_words')
        .select('id, english, turkish, package_name');

      if (wordsError) throw wordsError;

      let allWords = (wordsData || []).map(w => ({ ...w, star_rating: 0 }));

      // If user_id exists, fetch their ratings from user_word_ratings
      if (userId) {
        const { data: ratingsData, error: ratingsError } = await supabase
          .from('user_word_progress')
          .select('word_id, star_rating')
          .eq('user_id', userId);

        if (!ratingsError && ratingsData) {
          const ratingsMap = new Map<string, number>(
            ratingsData.map((r: UserWordRating) => [r.word_id, r.star_rating])
          );
          
          // Merge ratings with words
          allWords = allWords.map(w => ({
            ...w,
            star_rating: ratingsMap.get(w.id) || 0
          }));
        }
      }

      setWords(allWords);

      // Extract unique package names
      const uniquePackages = [...new Set(allWords.map(w => w.package_name).filter(Boolean))] as string[];
      setPackages(uniquePackages);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch words');
    } finally {
      setLoading(false);
    }
  };

  // Update star rating for a word (user-specific)
  const updateStarRating = async (wordId: string, newRating: number) => {
    console.log('updateStarRating called:', { wordId, newRating, userId });
    
    if (!userId) {
      console.warn('No user_id, cannot save star rating');
      return;
    }

    const clampedRating = Math.min(Math.max(newRating, 0), 5);
    console.log('Attempting to save star rating:', { userId, wordId, clampedRating });

    try {
      // Upsert into user_word_progress
      const { data, error } = await supabase
        .from('user_word_progress')
        .upsert(
          { user_id: userId, word_id: wordId, star_rating: clampedRating, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,word_id' }
        )
        .select();

      console.log('Supabase upsert response:', { data, error });

      if (error) throw error;
      
      // Update local state
      setWords(prev => prev.map(w => 
        w.id === wordId ? { ...w, star_rating: clampedRating } : w
      ));
      console.log('Star rating updated successfully');
    } catch (err) {
      console.error('Failed to update star rating:', err);
    }
  };

  // Increment star (correct answer)
  const incrementStar = async (wordId: string, currentRating: number = 0) => {
    await updateStarRating(wordId, Math.min(currentRating + 1, 5));
  };

  // Reset star to 1 (wrong answer)
  const resetStarToOne = async (wordId: string) => {
    await updateStarRating(wordId, 1);
  };

  // Get filtered words based on selected package
  const filteredWords = selectedPackage 
    ? words.filter(w => w.package_name === selectedPackage)
    : words;

  useEffect(() => {
    if (userId !== null || !window.location.search.includes('user_id')) {
      fetchWords();
    }
  }, [userId]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('learned_words_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learned_words'
        },
        () => {
          fetchWords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { 
    words: filteredWords, 
    allWords: words,
    packages, 
    selectedPackage, 
    setSelectedPackage,
    loading, 
    error,
    userId,
    totalXP,
    savedGameState,
    refetch: fetchWords,
    incrementStar,
    resetStarToOne,
    addTetrisXP,
    saveGameState,
    loadGameState,
    clearGameState
  };
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
