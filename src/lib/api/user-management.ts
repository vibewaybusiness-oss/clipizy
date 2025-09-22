/**
 * User Management API - Handle user directory and profile operations
 */
import APIClient from './api-client';

export interface UserProfile {
  user_id: string;
  email: string;
  username: string;
  created_at: string;
  profile: {
    display_name: string;
    bio: string;
    avatar_url: string;
    website: string;
    location: string;
    timezone: string;
  };
  preferences: {
    theme: string;
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      marketing: boolean;
    };
    privacy: {
      profile_public: boolean;
      show_activity: boolean;
    };
  };
  billing: {
    plan: string;
    payment_method: any;
    billing_address: any;
    invoices: any[];
  };
  security: {
    two_factor_enabled: boolean;
    login_history: any[];
    api_keys: any[];
  };
}

export interface UserSettings {
  user_id: string;
  app_settings: {
    default_project_type: string;
    auto_save: boolean;
    export_quality: string;
    watermark_enabled: boolean;
  };
  editor_settings: {
    theme: string;
    font_size: number;
    auto_complete: boolean;
  };
  notification_settings: {
    project_complete: boolean;
    export_ready: boolean;
    system_updates: boolean;
    marketing: boolean;
  };
}

export interface UserBilling {
  user_id: string;
  current_plan: string;
  billing_info: {
    payment_methods: any[];
    billing_address: any;
    tax_id: any;
  };
  subscription: {
    status: string;
    next_billing_date: string | null;
    cancel_at_period_end: boolean;
  };
  usage: {
    projects_created: number;
    storage_used_mb: number;
    api_calls_made: number;
  };
}

export interface DirectoryStructure {
  user_id: string;
  base_path: string;
  directories: {
    [key: string]: {
      path: string;
      files: Array<{
        name: string;
        size: number;
        modified: number;
      }>;
      subdirectories: {
        [key: string]: any;
      };
    };
  };
}

export interface StorageUsage {
  total_size_bytes: number;
  total_size_mb: number;
  file_count: number;
  directory_path: string;
}

export class UserManagementAPI {
  constructor() {}

  /**
   * Get user directory structure
   */
  async getDirectoryStructure(): Promise<DirectoryStructure> {
    try {
      return await APIClient.get<DirectoryStructure>('/user-management/directory-structure');
    } catch (error) {
      console.error('Error fetching directory structure:', error);
      throw error;
    }
  }

  /**
   * Recreate user directory structure
   */
  async recreateDirectoryStructure(): Promise<{ success: boolean; message: string; user_id: string }> {
    try {
      return await APIClient.post<{ success: boolean; message: string; user_id: string }>('/user-management/recreate-directory-structure');
    } catch (error) {
      console.error('Error recreating directory structure:', error);
      throw error;
    }
  }

  /**
   * Get user profile information
   */
  async getProfileInfo(): Promise<{ success: boolean; profile: UserProfile | null; message?: string }> {
    try {
      return await APIClient.get<{ success: boolean; profile: UserProfile | null; message?: string }>('/user-management/profile-info');
    } catch (error) {
      console.error('Error fetching profile info:', error);
      throw error;
    }
  }

  /**
   * Update user profile information
   */
  async updateProfileInfo(profileData: Partial<UserProfile>): Promise<{ success: boolean; message: string; profile: UserProfile }> {
    try {
      return await APIClient.put<{ success: boolean; message: string; profile: UserProfile }>('/user-management/profile-info', profileData);
    } catch (error) {
      console.error('Error updating profile info:', error);
      throw error;
    }
  }

  /**
   * Get user settings
   */
  async getSettings(): Promise<{ success: boolean; settings: UserSettings | null; message?: string }> {
    try {
      return await APIClient.get<{ success: boolean; settings: UserSettings | null; message?: string }>('/user-management/settings');
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(settingsData: Partial<UserSettings>): Promise<{ success: boolean; message: string; settings: UserSettings }> {
    try {
      return await APIClient.put<{ success: boolean; message: string; settings: UserSettings }>('/user-management/settings', settingsData);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Get user billing information
   */
  async getBillingInfo(): Promise<{ success: boolean; billing: UserBilling | null; message?: string }> {
    try {
      return await APIClient.get<{ success: boolean; billing: UserBilling | null; message?: string }>('/user-management/billing-info');
    } catch (error) {
      console.error('Error fetching billing info:', error);
      throw error;
    }
  }

  /**
   * Update user billing information
   */
  async updateBillingInfo(billingData: Partial<UserBilling>): Promise<{ success: boolean; message: string; billing: UserBilling }> {
    try {
      return await APIClient.put<{ success: boolean; message: string; billing: UserBilling }>('/user-management/billing-info', billingData);
    } catch (error) {
      console.error('Error updating billing info:', error);
      throw error;
    }
  }

  /**
   * Get user storage usage
   */
  async getStorageUsage(): Promise<{ success: boolean; usage: StorageUsage | null; message?: string }> {
    try {
      return await APIClient.get<{ success: boolean; usage: StorageUsage | null; message?: string }>('/user-management/storage-usage');
    } catch (error) {
      console.error('Error fetching storage usage:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userManagementAPI = new UserManagementAPI();
export default userManagementAPI;
