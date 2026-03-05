/**
 * Direct Supabase Reviews Service
 * Bypasses Edge Functions and calls Supabase database directly
 */

import { getSupabaseClient } from '../utils/supabase/client';

// Use the shared Supabase client singleton to avoid multiple GoTrueClient instances
const supabase = getSupabaseClient();

export interface ReviewData {
  id?: string;
  customer_id: string;
  customer_name?: string;
  barber_id?: string;
  barber_name?: string;
  appointment_id?: string;
  service_id?: string;
  service_name?: string;
  rating: number;
  comment: string;
  show_on_landing?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const SupabaseReviewsService = {
  /**
   * Create a new review
   */
  async create(reviewData: Partial<ReviewData>): Promise<ReviewData> {
    console.log('📝 Creating review directly in Supabase:', reviewData);

    // Prepare data for insertion - only include fields that exist in the database
    const insertData: any = {
      customer_id: reviewData.customer_id,
      rating: reviewData.rating,
      comment: reviewData.comment,
      show_on_landing: reviewData.show_on_landing ?? false,
    };

    // Add optional fields only if they exist
    if (reviewData.barber_id) insertData.barber_id = reviewData.barber_id;
    if (reviewData.appointment_id) insertData.appointment_id = reviewData.appointment_id;
    if (reviewData.service_id) insertData.service_id = reviewData.service_id;

    console.log('📤 Inserting data into reviews table:', insertData);

    const { data, error } = await supabase
      .from('reviews')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating review:', error);
      
      // Provide helpful error messages
      if (error.code === '42501') {
        console.error('🔒 RLS POLICY ERROR: Row-Level Security is blocking this insert.');
        console.error('📋 SOLUTION: Go to Supabase Dashboard → SQL Editor and run:');
        console.error('');
        console.error('CREATE POLICY "Allow public to insert reviews"');
        console.error('ON reviews FOR INSERT TO public WITH CHECK (true);');
        console.error('');
        console.error('OR disable RLS: ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;');
        console.error('');
        console.error('📄 See /SUPABASE_SETUP.md for detailed instructions');
        
        throw new Error(
          'Database permission error: Row-Level Security is blocking review submissions. ' +
          'Please check the browser console and /SUPABASE_SETUP.md file for setup instructions.'
        );
      }
      
      throw new Error(`Failed to create review: ${error.message}`);
    }

    console.log('✅ Review created successfully:', data);
    return data;
  },

  /**
   * Get all reviews
   */
  async getAll(): Promise<ReviewData[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      throw new Error(`Failed to fetch reviews: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get reviews by customer ID
   */
  async getByCustomerId(customerId: string): Promise<ReviewData[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer reviews:', error);
      throw new Error(`Failed to fetch customer reviews: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get reviews by barber ID
   */
  async getByBarberId(barberId: string): Promise<ReviewData[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching barber reviews:', error);
      throw new Error(`Failed to fetch barber reviews: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get reviews for landing page
   */
  async getLandingReviews(limit: number = 10): Promise<ReviewData[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('show_on_landing', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching landing reviews:', error);
      throw new Error(`Failed to fetch landing reviews: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Update a review
   */
  async update(id: string, updates: Partial<ReviewData>): Promise<ReviewData> {
    const updateData: any = { ...updates };
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating review:', error);
      throw new Error(`Failed to update review: ${error.message}`);
    }

    return data;
  },

  /**
   * Toggle show_on_landing field
   */
  async toggleShowOnLanding(id: string): Promise<ReviewData> {
    // First get the current value
    const { data: currentData, error: fetchError } = await supabase
      .from('reviews')
      .select('show_on_landing')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching review:', fetchError);
      throw new Error(`Failed to fetch review: ${fetchError.message}`);
    }

    // Toggle the value
    const newValue = !currentData.show_on_landing;

    const { data, error } = await supabase
      .from('reviews')
      .update({ 
        show_on_landing: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling show_on_landing:', error);
      throw new Error(`Failed to toggle show_on_landing: ${error.message}`);
    }

    console.log('✅ Toggled show_on_landing for review:', id, 'to', newValue);
    return data;
  },

  /**
   * Delete a review
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting review:', error);
      throw new Error(`Failed to delete review: ${error.message}`);
    }

    console.log('✅ Review deleted successfully:', id);
  },

  /**
   * Check if appointment has been reviewed
   */
  async hasReviewed(appointmentId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('appointment_id', appointmentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned, not reviewed
        return false;
      }
      console.error('Error checking if reviewed:', error);
      return false;
    }

    return !!data;
  },
};