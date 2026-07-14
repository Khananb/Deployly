ALTER TABLE users
ADD COLUMN provider ENUM('email','google','github','microsoft','discord') DEFAULT 'email',
ADD COLUMN provider_id VARCHAR(255) NULL,
ADD COLUMN avatar TEXT NULL,
ADD COLUMN verified_email BOOLEAN DEFAULT FALSE;
