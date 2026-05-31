const axios = require("axios");
const path = require("path");

// GitHub Configuration
const GITHUB_CONFIG = {
  token: process.env.GITHUB_TOKEN,
  repo: process.env.GITHUB_REPO || "your-username/your-repo",
  branch: process.env.GITHUB_BRANCH || "main",
  path: process.env.GITHUB_PATH || "images/",
  apiUrl: "https://api.github.com",
};

// GitHub Upload Function
async function uploadToGitHub(fileBuffer, filename, originalName) {
  try {
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

module.exports = { uploadToGitHub, GITHUB_CONFIG };

