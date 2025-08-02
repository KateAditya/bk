const fs = require('fs');
const axios = require('axios');

class BunnyStorage {
  constructor() {
    this.storageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
    this.accessKey = process.env.BUNNY_ACCESS_KEY;
    this.region = process.env.BUNNY_REGION || 'sg';
    this.cdnUrl = process.env.BUNNY_CDN_URL;
    
    // Fixed upload URL format - should be storage.bunnycdn.com not just bunnycdn.com
    this.uploadBaseUrl = `https://storage.bunnycdn.com/${this.storageZoneName}`;
    
    // API URL for delete operations
    this.apiUrl = `${this.uploadBaseUrl}/`;
    
    // Headers for API requests
    this.headers = {
      'AccessKey': this.accessKey,
      'Content-Type': 'application/octet-stream'
    };
  }

  /**
   * Upload file to Bunny.net storage
   * @param {string} filePath - Local file path
   * @param {string} remotePath - Remote path where file should be stored
   * @returns {Promise<string>} - CDN URL of uploaded file
   */
  async uploadFile(filePath, remotePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file data
      const fileData = fs.readFileSync(filePath);
      
      // Ensure remotePath doesn't start with slash
      const cleanRemotePath = remotePath.startsWith('/') ? remotePath.slice(1) : remotePath;
      
      // Construct upload URL
      const uploadUrl = `${this.uploadBaseUrl}/${cleanRemotePath}`;
      
      console.log('Uploading to:', uploadUrl);
      console.log('File size:', fileData.length, 'bytes');

      const response = await axios.put(uploadUrl, fileData, {
        headers: {
          'AccessKey': this.accessKey,
          'Content-Type': 'application/octet-stream'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000 // 30 second timeout
      });

      console.log('Upload response status:', response.status);

      if (response.status === 201 || response.status === 200) {
        const cdnUrl = `${this.cdnUrl}/${cleanRemotePath}`;
        console.log('File uploaded successfully to:', cdnUrl);
        return cdnUrl;
      }
      
      throw new Error(`Upload failed with status ${response.status}: ${response.statusText}`);
    } catch (error) {
      console.error('Bunny.net upload error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Delete file from Bunny.net storage
   * @param {string} remotePath - Path of file in Bunny.net (e.g., 'products/image.jpg')
   * @returns {Promise<boolean>} - True if deletion was successful
   */
  async deleteFile(remotePath) {
    try {
      // Ensure remotePath doesn't start with slash
      const cleanRemotePath = remotePath.startsWith('/') ? remotePath.slice(1) : remotePath;
      
      const deleteUrl = `${this.apiUrl}${cleanRemotePath}`;
      
      console.log('Deleting from:', deleteUrl);
      
      const response = await axios.delete(deleteUrl, {
        headers: {
          'AccessKey': this.accessKey
        },
        timeout: 15000 // 15 second timeout
      });

      console.log('Delete response status:', response.status);
      return response.status === 200 || response.status === 204;
    } catch (error) {
      console.error("Bunny.net delete error:", error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Extract relative path from Bunny CDN URL
   * @param {string} url - Full Bunny CDN URL
   * @returns {string} - Relative path in storage
   */
  getRelativePathFromUrl(url) {
    if (!url || !url.includes(this.cdnUrl)) {
      throw new Error("URL does not belong to Bunny CDN");
    }
    return url.replace(`${this.cdnUrl}/`, "");
  }

  /**
   * Test connection to Bunny.net storage
   * @returns {Promise<boolean>} - True if connection is successful
   */
  async testConnection() {
    try {
      const testPath = 'test-connection.txt';
      const testContent = Buffer.from('test');
      const uploadUrl = `${this.uploadBaseUrl}/${testPath}`;

      const response = await axios.put(uploadUrl, testContent, {
        headers: {
          'AccessKey': this.accessKey,
          'Content-Type': 'text/plain'
        },
        timeout: 10000
      });

      if (response.status === 201 || response.status === 200) {
        // Clean up test file
        await this.deleteFile(testPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Bunny.net connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = new BunnyStorage();