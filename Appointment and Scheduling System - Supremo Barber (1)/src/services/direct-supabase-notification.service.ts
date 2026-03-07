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
    console.log('✅ Found admin users:', adminIds.length);
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
    console.log('📤 DIRECT SUPABASE: Creating notification');
    console.log('📤 DIRECT SUPABASE: Data:', JSON.stringify(notificationData, null, 2));

    // If sending to 'admin', get all admin user IDs
    let targetUserIds: string[] = [];
    if (notificationData.user_id === 'admin') {
      console.log('📤 DIRECT SUPABASE: Sending to ALL admins...');
      targetUserIds = await getAllAdminIds();
      if (targetUserIds.length === 0) {
        console.warn('⚠️ DIRECT SUPABASE: No admin users found!');
        return null;
      }
      console.log(`📤 DIRECT SUPABASE: Sending to ${targetUserIds.length} admin(s)`);
    } else {
      targetUserIds = [notificationData.user_id];
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

    // Insert all notifications in one batch
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('❌ DIRECT SUPABASE: Error creating notification:', error);
      throw error;
    }

    console.log('✅ DIRECT SUPABASE: Notification(s) created successfully!');
    console.log(`✅ DIRECT SUPABASE: Created ${data?.length || 0} notification(s)`);

    return data;
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
    console.log('📤 DIRECT SUPABASE: Creating audit log');
    console.log('📤 DIRECT SUPABASE: Data:', JSON.stringify(auditData, null, 2));

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
      })
      .select()
      .single();

    if (error) {
      console.error('❌ DIRECT SUPABASE: Error creating audit log:', error);
      throw error;
    }

    console.log('✅ DIRECT SUPABASE: Audit log created successfully!');
    return data;
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
    console.log('🧪 Testing Supabase connection...');
    console.log('🧪 Supabase URL:', supabase?.supabaseUrl);
    
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
    
    console.log('✅ Supabase connection test PASSED!');
    return true;
  } catch (error: any) {
    console.error('❌ Supabase connection test ERROR:', error);
    return false;
  }
}
