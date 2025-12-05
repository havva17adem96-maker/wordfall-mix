import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LearnedWord {
  id: string;
  english: string;
  turkish: string;
}

export function useLearnedWords() {
  const [words, setWords] = useState<LearnedWord[]>([]);
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
        .select('id, english, turkish');

      // Filter by user_id if available
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setWords(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch words');
    } finally {
      setLoading(false);
    }
  };

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

  return { words, loading, error, userId, refetch: fetchWords };
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
