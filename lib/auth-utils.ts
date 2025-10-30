import { createClient } from '@/lib/supabase/client';

export interface SignUpInput {
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Sign up a new user with email and password and automatically log them in
 */
export async function signUp(input: SignUpInput): Promise<AuthResponse> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'User creation failed',
      };
    }

    // Auto-login the user after successful signup
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (signInError) {
      return {
        success: false,
        error: signInError.message,
      };
    }

    if (!sessionData.session) {
      return {
        success: false,
        error: 'Login failed',
      };
    }

    return {
      success: true,
      message: 'Account created successfully. You are now logged in.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(input: SignInInput): Promise<AuthResponse> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.session) {
      return {
        success: false,
        error: 'Login failed',
      };
    }

    return {
      success: true,
      message: 'Logged in successfully',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Logged out successfully',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
