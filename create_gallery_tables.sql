-- Create gallery_albums table
CREATE TABLE IF NOT EXISTS gallery_albums (
  id INT AUTO_INCREMENT PRIMARY KEY,
  album_title VARCHAR(255) NOT NULL,
  album_description TEXT,
  album_image_url VARCHAR(500) NOT NULL,
  album_redirect_link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create gallery_videos table
CREATE TABLE IF NOT EXISTS gallery_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  video_title VARCHAR(255) NOT NULL,
  video_image_url VARCHAR(500) NOT NULL,
  video_redirect_link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
