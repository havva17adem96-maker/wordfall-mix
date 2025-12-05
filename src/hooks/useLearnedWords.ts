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

export function useLearnedWords() {
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [packages, setPackages] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get user_id from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('user_id');
    console.log('URL user_id:', uid);
    setUserId(uid);
  }, []);

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
          .from('user_word_ratings')
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
    if (!userId) {
      console.warn('No user_id, cannot save star rating');
      return;
    }

    const clampedRating = Math.min(Math.max(newRating, 0), 5);

    try {
      // Upsert into user_word_ratings
      const { error } = await supabase
        .from('user_word_ratings')
        .upsert(
          { user_id: userId, word_id: wordId, star_rating: clampedRating },
          { onConflict: 'user_id,word_id' }
        );

      if (error) throw error;
      
      // Update local state
      setWords(prev => prev.map(w => 
        w.id === wordId ? { ...w, star_rating: clampedRating } : w
      ));
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
    refetch: fetchWords,
    incrementStar,
    resetStarToOne
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
