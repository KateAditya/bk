const db = require("../db");
const axios = require("axios");
const path = require("path");

// GitHub Upload Function (extracted from index.js)
async function uploadToGitHub(fileBuffer, filename, originalName) {
  try {
    const GITHUB_CONFIG = {
      token: process.env.GITHUB_TOKEN,
      repo: process.env.GITHUB_REPO || "your-username/your-repo",
      branch: process.env.GITHUB_BRANCH || "main",
      path: process.env.GITHUB_PATH || "images/",
      apiUrl: "https://api.github.com",
    };

    if (!GITHUB_CONFIG.token) {
      throw new Error("GitHub token not configured");
    }

    if (
      !GITHUB_CONFIG.repo ||
      GITHUB_CONFIG.repo === "your-username/your-repo"
    ) {
      throw new Error(
        "GitHub repository not configured. Please set GITHUB_REPO in your .env file"
      );
    }

    // Create unique filename
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    const uniqueFilename = `${filename}_${timestamp}${extension}`;
    const filePath = `${GITHUB_CONFIG.path}${uniqueFilename}`.replace(
      /\/\//g,
      "/"
    );

    // Convert buffer to base64
    const base64Content = fileBuffer.toString("base64");

    // GitHub API request
    const response = await axios({
      method: "PUT",
      url: `${GITHUB_CONFIG.apiUrl}/repos/${GITHUB_CONFIG.repo}/contents/${filePath}`,
      headers: {
        Authorization: `token ${GITHUB_CONFIG.token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      data: {
        message: `Upload ${uniqueFilename}`,
        content: base64Content,
        branch: GITHUB_CONFIG.branch,
      },
    });

    if (response.status === 201 || response.status === 200) {
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${filePath}`;

      console.log("✅ Image uploaded to GitHub successfully:", rawUrl);

      return {
        success: true,
        imageUrl: rawUrl,
        downloadUrl: response.data.content.download_url,
        path: filePath,
      };
    } else {
      throw new Error(`GitHub API returned status: ${response.status}`);
    }
  } catch (error) {
    console.error(
      "❌ GitHub upload error:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message || error.message || "GitHub upload failed"
    );
  }
}

// Get all albums
const getAllAlbums = (req, res) => {
  db.query("SELECT * FROM gallery_albums ORDER BY created_at DESC", (err, results) => {
    if (err) {
      console.error("❌ Error fetching albums:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to load albums",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
    res.json({
      success: true,
      albums: results || [],
    });
  });
};

// Get all videos
const getAllVideos = (req, res) => {
  db.query("SELECT * FROM gallery_videos ORDER BY created_at DESC", (err, results) => {
    if (err) {
      console.error("❌ Error fetching videos:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to load videos",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
    res.json({
      success: true,
      videos: results || [],
    });
  });
};

// Add album (admin only)
const addAlbum = async (req, res) => {
  try {
    const { album_title, album_description, album_redirect_link } = req.body;

    if (!album_title) {
      return res.status(400).json({
        success: false,
        message: "Album title is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    // Upload image to GitHub
    const uploadResult = await uploadToGitHub(
      req.file.buffer,
      "gallery_album",
      req.file.originalname
    );

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload image",
      });
    }

    // Insert into database
    const sql = `INSERT INTO gallery_albums (album_title, album_description, album_image_url, album_redirect_link) 
                 VALUES (?, ?, ?, ?)`;

    db.query(
      sql,
      [album_title, album_description || null, uploadResult.imageUrl, album_redirect_link || null],
      (err, result) => {
        if (err) {
          console.error("❌ Database Error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to save album to database",
            error:
              process.env.NODE_ENV === "development" ? err.message : undefined,
          });
        }

        console.log("✅ Album added successfully with ID:", result.insertId);
        res.status(201).json({
          success: true,
          message: "✅ Album added successfully!",
          album: {
            id: result.insertId,
            album_title,
            album_description,
            album_image_url: uploadResult.imageUrl,
            album_redirect_link,
          },
        });
      }
    );
  } catch (error) {
    console.error("❌ Error adding album:", error);
    res.status(500).json({
      success: false,
      message: `Failed to add album: ${error.message}`,
    });
  }
};

// Update album (admin only)
const updateAlbum = async (req, res) => {
  try {
    const albumId = parseInt(req.params.id);
    const { album_title, album_description, album_redirect_link } = req.body;

    if (isNaN(albumId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid album ID",
      });
    }

    if (!album_title) {
      return res.status(400).json({
        success: false,
        message: "Album title is required",
      });
    }

    let imageUrl = null;
    if (req.file) {
      // Upload new image to GitHub
      const uploadResult = await uploadToGitHub(
        req.file.buffer,
        "gallery_album",
        req.file.originalname
      );

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
        });
      }

      imageUrl = uploadResult.imageUrl;
    }

    // Build update query
    let sql;
    let params;

    if (imageUrl) {
      sql = `UPDATE gallery_albums SET album_title = ?, album_description = ?, album_image_url = ?, album_redirect_link = ? WHERE id = ?`;
      params = [album_title, album_description || null, imageUrl, album_redirect_link || null, albumId];
    } else {
      sql = `UPDATE gallery_albums SET album_title = ?, album_description = ?, album_redirect_link = ? WHERE id = ?`;
      params = [album_title, album_description || null, album_redirect_link || null, albumId];
    }

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error("❌ Error updating album:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to update album",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Album not found",
        });
      }

      console.log("✅ Album updated successfully");
      res.json({
        success: true,
        message: "✅ Album updated successfully!",
      });
    });
  } catch (error) {
    console.error("❌ Error updating album:", error);
    res.status(500).json({
      success: false,
      message: `Failed to update album: ${error.message}`,
    });
  }
};

// Delete album (admin only)
const deleteAlbum = (req, res) => {
  const albumId = parseInt(req.params.id);

  if (isNaN(albumId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid album ID",
    });
  }

  db.query("DELETE FROM gallery_albums WHERE id = ?", [albumId], (err, result) => {
    if (err) {
      console.error("❌ Error deleting album:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to delete album",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Album not found",
      });
    }

    console.log("✅ Album deleted successfully");
    res.json({
      success: true,
      message: "✅ Album deleted successfully!",
    });
  });
};

// Add video (admin only)
const addVideo = async (req, res) => {
  try {
    const { video_title, video_redirect_link, video_image_url } = req.body;

    if (!video_title) {
      return res.status(400).json({
        success: false,
        message: "Video title is required",
      });
    }

    let thumbnailUrl = null;

    // If video_image_url is provided (e.g., from YouTube), use it directly
    if (video_image_url && video_image_url.startsWith('http')) {
      thumbnailUrl = video_image_url;
    } 
    // Otherwise, upload the file to GitHub
    else if (req.file) {
      const uploadResult = await uploadToGitHub(
        req.file.buffer,
        "gallery_video",
        req.file.originalname
      );

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload thumbnail",
        });
      }

      thumbnailUrl = uploadResult.imageUrl;
    } else {
      return res.status(400).json({
        success: false,
        message: "Thumbnail image file or URL is required",
      });
    }

    // Insert into database
    const sql = `INSERT INTO gallery_videos (video_title, video_image_url, video_redirect_link) 
                 VALUES (?, ?, ?)`;

    db.query(
      sql,
      [video_title, thumbnailUrl, video_redirect_link || null],
      (err, result) => {
        if (err) {
          console.error("❌ Database Error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to save video to database",
            error:
              process.env.NODE_ENV === "development" ? err.message : undefined,
          });
        }

        console.log("✅ Video added successfully with ID:", result.insertId);
        res.status(201).json({
          success: true,
          message: "✅ Video added successfully!",
          video: {
            id: result.insertId,
            video_title,
            video_image_url: thumbnailUrl,
            video_redirect_link,
          },
        });
      }
    );
  } catch (error) {
    console.error("❌ Error adding video:", error);
    res.status(500).json({
      success: false,
      message: `Failed to add video: ${error.message}`,
    });
  }
};

// Update video (admin only)
const updateVideo = async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const { video_title, video_redirect_link, video_image_url } = req.body;

    if (isNaN(videoId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    if (!video_title) {
      return res.status(400).json({
        success: false,
        message: "Video title is required",
      });
    }

    let imageUrl = null;
    
    // If video_image_url is provided (e.g., from YouTube), use it directly
    if (video_image_url && video_image_url.startsWith('http')) {
      imageUrl = video_image_url;
    } 
    // Otherwise, upload the file to GitHub
    else if (req.file) {
      const uploadResult = await uploadToGitHub(
        req.file.buffer,
        "gallery_video",
        req.file.originalname
      );

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload thumbnail",
        });
      }

      imageUrl = uploadResult.imageUrl;
    }

    // Build update query
    let sql;
    let params;

    if (imageUrl) {
      sql = `UPDATE gallery_videos SET video_title = ?, video_image_url = ?, video_redirect_link = ? WHERE id = ?`;
      params = [video_title, imageUrl, video_redirect_link || null, videoId];
    } else {
      sql = `UPDATE gallery_videos SET video_title = ?, video_redirect_link = ? WHERE id = ?`;
      params = [video_title, video_redirect_link || null, videoId];
    }

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error("❌ Error updating video:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to update video",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      console.log("✅ Video updated successfully");
      res.json({
        success: true,
        message: "✅ Video updated successfully!",
      });
    });
  } catch (error) {
    console.error("❌ Error updating video:", error);
    res.status(500).json({
      success: false,
      message: `Failed to update video: ${error.message}`,
    });
  }
};

// Delete video (admin only)
const deleteVideo = (req, res) => {
  const videoId = parseInt(req.params.id);

  if (isNaN(videoId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid video ID",
    });
  }

  db.query("DELETE FROM gallery_videos WHERE id = ?", [videoId], (err, result) => {
    if (err) {
      console.error("❌ Error deleting video:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to delete video",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    console.log("✅ Video deleted successfully");
    res.json({
      success: true,
      message: "✅ Video deleted successfully!",
    });
  });
};

module.exports = {
  getAllAlbums,
  getAllVideos,
  addAlbum,
  updateAlbum,
  deleteAlbum,
  addVideo,
  updateVideo,
  deleteVideo,
};
