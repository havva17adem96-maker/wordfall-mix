import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LearnedWord {
  id: string;
  english: string;
  turkish: string;
  package_name?: string;
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
    setUserId(uid);
  }, []);

  const fetchWords = async () => {
    try {
      let query = supabase
        .from('learned_words')
        .select('id, english, turkish, package_name');

      // Filter by user_id if available
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const allWords = data || [];
      setWords(allWords);

      // Extract unique package names
      const uniquePackages = [...new Set(allWords.map(w => w.package_name).filter(Boolean))] as string[];
      setPackages(uniquePackages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch words');
    } finally {
      setLoading(false);
    }
  };

  // Get filtered words based on selected package
  const filteredWords = selectedPackage 
    ? words.filter(w => w.package_name === selectedPackage)
    : words;

  useEffect(() => {
    fetchWords();

    // Real-time subscription for changes
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
    refetch: fetchWords 
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
