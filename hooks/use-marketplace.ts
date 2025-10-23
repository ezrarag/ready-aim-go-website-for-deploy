import { useState, useEffect, useCallback } from 'react';
import { 
  MarketplaceItem, 
  MarketplaceCategory, 
  MarketplaceInteraction, 
  MarketplaceBookmark, 
  MarketplaceTransaction,
  MarketplaceAccess 
} from '@/lib/types/platform';

export function useMarketplace(userId?: string) {
  const [listings, setListings] = useState<MarketplaceItem[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceItem[]>([]);
  const [bookmarks, setBookmarks] = useState<MarketplaceBookmark[]>([]);
  const [userAccess, setUserAccess] = useState<MarketplaceAccess>('none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's marketplace access level
  const fetchUserAccess = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('marketplace_access')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserAccess(data?.marketplace_access || 'none');
    } catch (err) {
      console.error('Error fetching user access:', err);
      setUserAccess('none');
    }
  }, [userId]);

  // Fetch all marketplace categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace.categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    }
  }, []);

  // Fetch all listings (for browsing)
  const fetchListings = useCallback(async () => {
    if (!userId || (userAccess !== 'full_access' && userAccess !== 'view_only')) {
      setListings([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('marketplace.listings')
        .select(`
          *,
          marketplace.categories(name, slug),
          clients(name, avatar_url)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings');
    }
  }, [userId, userAccess]);

  // Fetch user's own listings
  const fetchMyListings = useCallback(async () => {
    if (!userId || (userAccess !== 'full_access' && userAccess !== 'listing_only')) {
      setMyListings([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('marketplace.listings')
        .select(`
          *,
          marketplace.categories(name, slug)
        `)
        .eq('client_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyListings(data || []);
    } catch (err) {
      console.error('Error fetching my listings:', err);
      setError('Failed to load your listings');
    }
  }, [userId, userAccess]);

  // Fetch user's bookmarks
  const fetchBookmarks = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('marketplace.bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    }
  }, [userId]);

  // Create a new listing
  const createListing = useCallback(async (listingData: Partial<MarketplaceItem>) => {
    if (!userId || (userAccess !== 'full_access' && userAccess !== 'listing_only')) {
      throw new Error('Insufficient marketplace access');
    }

    try {
      const { data, error } = await supabase
        .from('marketplace.listings')
        .insert({
          ...listingData,
          client_id: userId,
          is_active: true,
          verified: false,
          rating: 0,
          reviews_count: 0,
          views_count: 0
        })
        .select()
        .single();

      if (error) throw error;
      
      // Refresh my listings
      await fetchMyListings();
      return data;
    } catch (err) {
      console.error('Error creating listing:', err);
      throw err;
    }
  }, [userId, userAccess, fetchMyListings]);

  // Update a listing
  const updateListing = useCallback(async (listingId: string, updates: Partial<MarketplaceItem>) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('marketplace.listings')
        .update(updates)
        .eq('id', listingId)
        .eq('client_id', userId)
        .select()
        .single();

      if (error) throw error;
      
      // Refresh my listings
      await fetchMyListings();
      return data;
    } catch (err) {
      console.error('Error updating listing:', err);
      throw err;
    }
  }, [userId, fetchMyListings]);

  // Delete a listing
  const deleteListing = useCallback(async (listingId: string) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('marketplace.listings')
        .delete()
        .eq('id', listingId)
        .eq('client_id', userId);

      if (error) throw error;
      
      // Refresh my listings
      await fetchMyListings();
    } catch (err) {
      console.error('Error deleting listing:', err);
      throw err;
    }
  }, [userId, fetchMyListings]);

  // Toggle bookmark
  const toggleBookmark = useCallback(async (listingId: string) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const existingBookmark = bookmarks.find(b => b.listing_id === listingId);
      
      if (existingBookmark) {
        // Remove bookmark
        const { error } = await supabase
          .from('marketplace.bookmarks')
          .delete()
          .eq('id', existingBookmark.id);

        if (error) throw error;
        setBookmarks(prev => prev.filter(b => b.id !== existingBookmark.id));
      } else {
        // Add bookmark
        const { data, error } = await supabase
          .from('marketplace.bookmarks')
          .insert({
            listing_id: listingId,
            user_id: userId
          })
          .select()
          .single();

        if (error) throw error;
        setBookmarks(prev => [...prev, data]);
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      throw err;
    }
  }, [userId, bookmarks]);

  // Record interaction (view, inquiry)
  const recordInteraction = useCallback(async (listingId: string, interactionType: 'view' | 'inquiry') => {
    if (!userId) return;

    try {
      await supabase
        .from('marketplace.interactions')
        .insert({
          listing_id: listingId,
          user_id: userId,
          interaction_type: interactionType
        });
    } catch (err) {
      console.error('Error recording interaction:', err);
    }
  }, [userId]);

  // Initialize data
  useEffect(() => {
    const initializeMarketplace = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchUserAccess(),
          fetchCategories()
        ]);
      } catch (err) {
        console.error('Error initializing marketplace:', err);
        setError('Failed to initialize marketplace');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      initializeMarketplace();
    }
  }, [userId, fetchUserAccess, fetchCategories]);

  // Fetch listings when access changes
  useEffect(() => {
    if (userAccess !== 'none') {
      fetchListings();
      fetchMyListings();
      fetchBookmarks();
    }
  }, [userAccess, fetchListings, fetchMyListings, fetchBookmarks]);

  return {
    // Data
    listings,
    categories,
    myListings,
    bookmarks,
    userAccess,
    
    // State
    loading,
    error,
    
    // Actions
    createListing,
    updateListing,
    deleteListing,
    toggleBookmark,
    recordInteraction,
    
    // Refresh functions
    refetchListings: fetchListings,
    refetchMyListings: fetchMyListings,
    refetchBookmarks: fetchBookmarks,
    refetchCategories: fetchCategories
  };
} 