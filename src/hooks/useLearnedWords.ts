import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LearnedWord {
  id: string;
  english: string;
  turkish: string;
  package_name?: string;
  star_rating?: number;
}

export function useLearnedWords() {
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [packages, setPackages] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWords = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('learned_words')
        .select('id, english, turkish, package_name, star_rating');

      console.log('Supabase response:', { data, error });

      if (error) throw error;

      const allWords = data || [];
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

  // Update star rating for a word
  const updateStarRating = async (wordId: string, newRating: number) => {
    try {
      const { error } = await supabase
        .from('learned_words')
        .update({ star_rating: Math.min(Math.max(newRating, 0), 5) })
        .eq('id', wordId);

      if (error) throw error;
      
      // Update local state
      setWords(prev => prev.map(w => 
        w.id === wordId ? { ...w, star_rating: Math.min(Math.max(newRating, 0), 5) } : w
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
    fetchWords();
  }, []);

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
  }, []);

  return { 
    words: filteredWords, 
    allWords: words,
    packages, 
    selectedPackage, 
    setSelectedPackage,
    loading, 
    error, 
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
