#!/usr/bin/env python3
"""
Simple script to create default user
"""
import uuid
import sqlite3
import hashlib

def create_default_user():
    """Create a default user in the SQLite database"""
    db_path = "vibewave_test.db"
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE id = ?", ("00000000-0000-0000-0000-000000000001",))
        if cursor.fetchone():
            print("✅ Default user already exists")
            return
        
        # Create users table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT,
                hashed_password TEXT,
                is_active BOOLEAN DEFAULT 1,
                is_admin BOOLEAN DEFAULT 0,
                is_verified BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP,
                last_login TIMESTAMP,
                avatar_url TEXT,
                bio TEXT,
                settings TEXT,
                plan TEXT DEFAULT 'free',
                billing_id TEXT,
                total_projects TEXT DEFAULT '0',
                storage_used_bytes TEXT DEFAULT '0',
                points_balance INTEGER DEFAULT 0,
                total_points_earned INTEGER DEFAULT 0,
                total_points_spent INTEGER DEFAULT 0
            )
        """)
        
        # Create points_transactions table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS points_transactions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                description TEXT,
                reference_id TEXT,
                reference_type TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Hash the password (simple hash for demo)
        password = "demo123"
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        # Insert the default user
        cursor.execute("""
            INSERT INTO users (
                id, email, username, hashed_password, is_active, is_verified, 
                plan, points_balance, total_points_earned, total_points_spent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "00000000-0000-0000-0000-000000000001",
            "demo@clipizi.com",
            "Demo User",
            hashed_password,
            1,  # is_active
            1,  # is_verified
            "free",
            1000,  # points_balance
            1000,  # total_points_earned
            0      # total_points_spent
        ))
        
        conn.commit()
        print("✅ Default user created successfully")
        print(f"   Email: demo@clipizi.com")
        print(f"   Password: demo123")
        print(f"   User ID: 00000000-0000-0000-0000-000000000001")
        print(f"   Points: 1000")
        
    except Exception as e:
        print(f"❌ Error creating default user: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_default_user()
