/**
 * Direct Supabase Notification Service
 * Sends notifications directly to Supabase database, bypassing the local backend
 * This ensures notifications are always saved to the database even in local mode
 */

import { supabase } from '../utils/supabase/client';

export interface DirectNotificationData {
  user_id: string;
  user_role: 'customer' | 'barber' | 'admin';
  type: string;
  title: string;
  message: string;
  related_id?: string;
  related_type?: string;
  action_url?: string;
  action_label?: string;
  is_read?: boolean;
  actor_id?: string; // The ID of the user who performed the action, so they aren't notified of their own action
}

/**
 * Get all admin user IDs from database
 */
export async function getAllAdminIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (error) {
      console.error('❌ Failed to fetch admin users:', error);
      return [];
    }

    const adminIds = data?.map((user: any) => user.id) || [];
   
    return adminIds;
  } catch (error) {
    console.error('❌ Error fetching admin users:', error);
    return [];
  }
}

/**
 * Create a notification directly in Supabase database
 * If user_id is 'admin', sends notification to ALL admin users
 */
export async function createDirectNotification(
  notificationData: DirectNotificationData
): Promise<any> {
  try {
   

    // If sending to 'admin', get all admin user IDs
    let targetUserIds: string[] = [];
    if (notificationData.user_id === 'admin') {
     
      const adminIds = await getAllAdminIds();
      // Ensure unique IDs to prevent duplicate notifications
      targetUserIds = Array.from(new Set(adminIds));
      
      if (targetUserIds.length === 0) {
        console.warn('⚠️ DIRECT SUPABASE: No admin users found!');
        return null;
      }
    
    } else {
      targetUserIds = [notificationData.user_id];
    }

    // Filter out the actor who performed the action
    if (notificationData.actor_id) {
      targetUserIds = targetUserIds.filter(id => id !== notificationData.actor_id);
      
      if (targetUserIds.length === 0) {
        console.log('ℹ️ DIRECT SUPABASE: Notification skipped as the only recipient is the actor.');
        return null;
      }
    }

    // Create notification for each target user
    const notifications = targetUserIds.map((userId) => ({
      user_id: userId,
      user_role: notificationData.user_role,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      related_id: notificationData.related_id || null,
      related_type: notificationData.related_type || null,
      action_url: notificationData.action_url || null,
      action_label: notificationData.action_label || null,
      is_read: notificationData.is_read || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Insert all notifications in one batch without .select() because RLS may block SELECT for anon users
    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('❌ DIRECT SUPABASE: Error creating notification:', error);
      throw error;
    }

   

    return true;
  } catch (error: any) {
    console.error('❌ DIRECT SUPABASE: Failed to create notification:', error);
    console.error('❌ DIRECT SUPABASE: Error details:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    throw error;
  }
}

/**
 * Create audit log directly in Supabase database
 */
export async function createDirectAuditLog(auditData: {
  user_id: string;
  user_role: 'customer' | 'barber' | 'admin' | 'system';
  user_name?: string;
  user_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  description: string;
  status: 'success' | 'error' | 'warning';
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}): Promise<any> {
  try {
  

    // Insert into Supabase audit_logs table
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: auditData.user_id,
        user_role: auditData.user_role,
        user_name: auditData.user_name || null,
        user_email: auditData.user_email || null,
        action: auditData.action,
        entity_type: auditData.entity_type || null,
        entity_id: auditData.entity_id || null,
        description: auditData.description,
        status: auditData.status,
        metadata: auditData.metadata || null,
        ip_address: auditData.ip_address || 'unknown',
        user_agent: auditData.user_agent || navigator.userAgent,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('❌ DIRECT SUPABASE: Error creating audit log:', error);
      throw error;
    }

 
    return true;
  } catch (error: any) {
    console.error('❌ DIRECT SUPABASE: Failed to create audit log:', error);
    throw error;
  }
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
 
    
    // Try to query the notifications table
    const { data, error } = await supabase
      .from('notifications')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection test FAILED:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', error.details);
      return false;
    }
    
   
    return true;
  } catch (error: any) {
    console.error('❌ Supabase connection test ERROR:', error);
    return false;
  }
}
