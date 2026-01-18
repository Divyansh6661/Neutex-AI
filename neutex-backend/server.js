const express = require('express');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const sharp = require('sharp');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const multer = require('multer');
const Papa = require('papaparse');
const XLSX = require('xlsx');
const cheerio = require('cheerio');
const rtfParser = require('rtf-parser');
require('dotenv').config();

const app = express();
app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// OpenRouter client
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000", // Your site URL
    "X-Title": "Neutex AI Code Generator", // Your app name
  }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const genAI25 = new GoogleGenerativeAI(process.env.GEMINI_25_API_KEY);

const genAIImage = new GoogleGenerativeAI(process.env.GEMINI_IMAGE_API_KEY);

const genAISocial = new GoogleGenerativeAI(process.env.GEMINI_SOCIAL_API_KEY);

const genAIDocument = new GoogleGenerativeAI(process.env.GEMINI_DOCUMENT_API_KEY);



const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Create videos directory if it doesn't exist
const videosDir = path.join(__dirname, 'public', 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

// Serve static video files
app.use('/videos', express.static(path.join(__dirname, 'public', 'videos')));

async function saveImageToStorage(imageBase64, fileName, userId) {
  try {
    // Convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Upload to Supabase Storage
    const filePath = `${userId}/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('neutex-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('neutex-images')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('Failed to save to storage:', error);
    throw error;
  }
}

app.post('/api/save-to-gallery', async (req, res) => {
  try {
    const { user_id, image_url, prompt, style, model } = req.body
    
    const { data, error } = await supabase
      .from('image_gallery')
      .insert([{
        user_id,
        image_url,
        prompt,
        style,
        model
      }])
    
    if (error) throw error
    
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/gallery/all', async (req, res) => {
  try {
    console.log('Clear all gallery endpoint called');
    
    // Get all file paths first
    const { data: images, error: fetchError } = await supabase
      .from('image_gallery')
      .select('file_path, id');
    
    if (fetchError) {
      console.error('Error fetching images for deletion:', fetchError);
      throw fetchError;
    }
    
    console.log(`Found ${images.length} images to delete`);
    
    // Delete all files from storage
    if (images.length > 0) {
      const filePaths = images
        .filter(img => img.file_path)
        .map(img => img.file_path);
      
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('neutex-images')
          .remove(filePaths);
        
        if (storageError) {
          console.error('Storage bulk delete error:', storageError);
        }
      }
    }
    
    // Delete all from database
    const { error } = await supabase
      .from('image_gallery')
      .delete()
      .not('id', 'is', null); // Delete all records where id is not null
    
    if (error) throw error;
    
    console.log('Successfully cleared gallery');
    
    res.json({ 
      success: true,
      message: `Cleared ${images.length} images from gallery`,
      deleted_count: images.length
    });
    
  } catch (error) {
    console.error('Clear gallery error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete image from gallery
app.delete('/api/gallery/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    
    // First get the file path
    const { data: imageData, error: fetchError } = await supabase
      .from('image_gallery')
      .select('file_path')
      .eq('id', imageId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Delete from storage if file_path exists
    if (imageData.file_path) {
      const { error: storageError } = await supabase.storage
        .from('neutex-images')
        .remove([imageData.file_path]);
      
      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue with database deletion even if storage delete fails
      }
    }
    
    // Delete from database
    const { error } = await supabase
      .from('image_gallery')
      .delete()
      .eq('id', imageId);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Clear entire gallery for user
app.delete('/api/gallery/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // First get all file paths for this user
    const { data: images, error: fetchError } = await supabase
      .from('image_gallery')
      .select('file_path')
      .eq('user_id', userId);
    
    if (fetchError) throw fetchError;
    
    // Delete all files from storage
    if (images.length > 0) {
      const filePaths = images
        .filter(img => img.file_path)
        .map(img => img.file_path);
      
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('neutex-images')
          .remove(filePaths);
        
        if (storageError) {
          console.error('Storage bulk delete error:', storageError);
        }
      }
    }
    
    // Delete from database
    const { error } = await supabase
      .from('image_gallery')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this route after line 84 (after the Clear entire gallery for user route)
app.get('/api/gallery/all', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('image_gallery')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('Gallery query error:', error);
      throw error;
    }
    
    console.log('Gallery endpoint found', data.length, 'images');
    
    res.json({ success: true, gallery: data })
  } catch (error) {
    console.error('Gallery endpoint error:', error);
    res.status(500).json({ error: error.message })
  }
})
// Get user's gallery
app.get('/api/gallery/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    
    const { data, error } = await supabase
      .from('image_gallery')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) throw error
    
    res.json({ success: true, gallery: data })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})



async function convertImageFormat(imageBuffer, targetFormat) {
  try {
    let sharpInstance = sharp(imageBuffer);
    
    switch(targetFormat.toLowerCase()) {
      case 'png':
        return await sharpInstance.png().toBuffer();
      case 'jpeg':
      case 'jpg':
        return await sharpInstance.jpeg({ quality: 90 }).toBuffer();
      case 'webp':
        return await sharpInstance.webp({ quality: 90 }).toBuffer();
      default:
        return imageBuffer; // Return original if format not supported
    }
  } catch (error) {
    console.error('Image conversion error:', error);
    return imageBuffer; // Return original on error
  }
}

// Helper function to get MIME type
function getMimeType(format) {
  switch(format.toLowerCase()) {
    case 'png': return 'image/png';
    case 'jpeg':
    case 'jpg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    default: return 'image/png';
  }
}

// Code Generation Endpoint
// Code Generation Endpoint
app.post('/api/generate-code', async (req, res) => {
  try {
    const { prompt, language, codeType, complexity, model } = req.body;
    const enhancedPrompt = buildPrompt(prompt, language, codeType, complexity);
    
    // Try OpenRouter first
    try {
      console.log('Attempting OpenRouter with model:', model);
      
      const completion = await openai.chat.completions.create({
        model: model || "google/gemini-2.0-flash-exp:free",
        messages: [
          {
            role: "system",
            content: "You are an expert programmer. Generate clean, working code based on the user's requirements. Only return code, no explanations."
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });
      
      const code = completion.choices[0].message.content.replace(/```[\w]*\n?/g, '').trim();
      console.log('OpenRouter success');
      return res.json({ 
        code,
        provider: 'OpenRouter',
        model: model || "google/gemini-2.0-flash-exp:free"
      });
      
    } catch (openRouterError) {
      console.log('OpenRouter failed, trying Gemini fallback:', openRouterError.message);
      
      // Fallback to direct Gemini API
      try {
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await geminiModel.generateContent(enhancedPrompt);
        const code = result.response.text().replace(/```[\w]*\n?/g, '').trim();
        
        console.log('Gemini fallback success');
        return res.json({ 
          code,
          provider: 'Gemini Direct',
          model: 'gemini-2.0-flash',
          fallback: true
        });
        
      } catch (geminiError) {
        console.log('Gemini fallback failed, trying Groq:', geminiError.message);
        
        // Final fallback to Groq
        try {
          const completion = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: "You are an expert programmer. Generate clean, working code based on the user's requirements. Only return code, no explanations."
              },
              {
                role: "user",
                content: enhancedPrompt
              }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.3,
            max_tokens: 2000,
          });
          
          const code = completion.choices[0].message.content.replace(/```[\w]*\n?/g, '').trim();
          console.log('Groq fallback success');
          return res.json({ 
            code,
            provider: 'GroqCloud',
            model: 'llama-3.1-8b-instant',
            fallback: true
          });
          
        } catch (groqError) {
          console.log('Groq fallback also failed:', groqError.message);
          throw new Error(`All providers failed: OpenRouter(${openRouterError.message}) | Gemini(${geminiError.message}) | Groq(${groqError.message})`);
        }
      }
    }
    
  } catch (error) {
    console.error('All providers failed:', error);
    res.status(500).json({ 
      error: 'Code generation failed: ' + error.message,
      provider: 'none'
    });
  }
});

// Text-to-video generation endpoint
// Text-to-video generation endpoint
// Text-to-video generation endpoint
app.post('/api/generate-video-ltx', async (req, res) => {
  try {
    const { prompt, type = 'text-to-video' } = req.body;
    
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt is required' 
      });
    }
    
    const pythonScript = `
import sys
import json
import os
from gradio_client import Client

# Suppress all non-JSON output
import warnings
warnings.filterwarnings("ignore")

# Set UTF-8 encoding for Windows
if os.name == 'nt':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

try:
    client = Client("Lightricks/ltx-video-distilled", verbose=False)
    
    result = client.predict(
        prompt="${prompt.replace(/"/g, '\\"')}",
        negative_prompt="worst quality, inconsistent motion, blurry, jittery, distorted",
        input_image_filepath=None,
        input_video_filepath=None,
        height_ui=512,
        width_ui=704,
        mode="text-to-video",
        duration_ui=2,
        ui_frames_to_use=9,
        seed_ui=42,
        randomize_seed=True,
        ui_guidance_scale=1,
        improve_texture_flag=True,
        api_name="/text_to_video"
    )
    generated_video, seed = result
    
    print(json.dumps({
        "success": True, 
        "videoPath": generated_video["video"], 
        "seed": seed
    }))
    
except Exception as e:
    print(json.dumps({
        "success": False, 
        "error": str(e)
    }))
    `;
    
    const { spawn } = require('child_process');
    
    const env = { ...process.env };
    if (process.platform === 'win32') {
      env.PYTHONIOENCODING = 'utf-8';
    }
    
    const pythonProcess = spawn('python', ['-c', pythonScript], {
      env: env
    });
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString('utf8');
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString('utf8');
    });
    
    pythonProcess.on('close', async (code) => {
      console.log('Python process closed with code:', code);
      
      try {
        const jsonMatch = output.match(/\{"success".*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          
          if (result.success) {
            const originalPath = result.videoPath;
            const tempUserId = '00000000-0000-4000-8000-000000000000';
            
            try {
              // Generate unique filename
              const fileName = `ltx-video-${Date.now()}-${result.seed}.mp4`;
              const filePath = `${tempUserId}/${fileName}`;
              
              // Read video file and upload to Supabase Storage
              const videoBuffer = fs.readFileSync(originalPath);
              
              console.log('Uploading video to Supabase Storage...');
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('neutex-videos')
                .upload(filePath, videoBuffer, {
                  contentType: 'video/mp4',
                  upsert: true
                });
              
              if (uploadError) {
                throw uploadError;
              }
              
              // Get public URL
              const { data: urlData } = supabase.storage
                .from('neutex-videos')
                .getPublicUrl(filePath);
              
              const publicUrl = urlData.publicUrl;
              
              // Calculate expiration (7 days from now)
              const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              
              // Save metadata to database with expiration
              const { data: dbData, error: dbError } = await supabase
                .from('video_gallery')
                .insert([{
                  user_id: tempUserId,
                  video_url: publicUrl,
                  filename: fileName,
                  prompt: prompt.trim(),
                  seed: result.seed ? Math.min(result.seed, 2147483647) : null,
                  provider: 'LTX-Video',
                  expires_at: expiresAt.toISOString(),
                  status: 'active'
                }]);
              
              if (dbError) {
                console.error('Database insert error:', dbError);
              } else {
                console.log('Video metadata saved to database');
              }
              
              // Schedule cleanup after 7 days
              setTimeout(async () => {
                try {
                  // Delete from Supabase Storage
                  const { error: deleteError } = await supabase.storage
                    .from('neutex-videos')
                    .remove([filePath]);
                  
                  if (deleteError) {
                    console.error('Failed to delete video from storage:', deleteError);
                  } else {
                    console.log('Deleted expired video from storage:', fileName);
                  }
                  
                  // Update database status - FIXED to use filename instead of file_path
                  const { error: updateError } = await supabase
                    .from('video_gallery')
                    .update({ status: 'expired' })
                    .eq('filename', fileName);
                  
                  if (updateError) {
                    console.error('Failed to update video status:', updateError);
                  } else {
                    console.log('Updated video status to expired:', fileName);
                  }
                } catch (cleanupError) {
                  console.error('Cleanup error:', cleanupError);
                }
              }, 7 * 24 * 60 * 60 * 1000); // 7 days
              
              console.log('Video uploaded successfully:', publicUrl);
              
              res.json({
                success: true,
                videoPath: publicUrl,
                seed: result.seed ? Math.min(result.seed, 2147483647) : null,
                provider: 'LTX-Video',
                expiresIn: '7 days',
                expiresAt: expiresAt.toISOString()
              });
              
            } catch (storageError) {
              console.error('Storage error:', storageError);
              return res.status(500).json({ 
                success: false, 
                error: 'Failed to save video: ' + storageError.message 
              });
            }
          } else {
            return res.status(500).json({ 
              success: false, 
              error: result.error 
            });
          }
        }
      } catch (parseError) {
        console.error('JSON Parse error:', parseError);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to parse response' 
        });
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Python process error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Python process failed: ' + error.message 
      });
    });
    
  } catch (error) {
    console.error('Endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Cleanup expired videos endpoint - FIXED to use filename instead of file_path
app.post('/api/cleanup-expired-videos', async (req, res) => {
  try {
    // Find expired videos
    const { data: expiredVideos, error: fetchError } = await supabase
      .from('video_gallery')
      .select('filename, video_url')  // Changed from file_path to filename
      .lt('expires_at', new Date().toISOString())
      .eq('status', 'active');
    
    if (fetchError) {
      throw fetchError;
    }
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const video of expiredVideos) {
      try {
        // Reconstruct file path from filename for storage deletion
        const tempUserId = '00000000-0000-4000-8000-000000000000';
        const filePath = `${tempUserId}/${video.filename}`;
        
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('neutex-videos')
          .remove([filePath]);
        
        if (!deleteError) {
          // Update database status
          await supabase
            .from('video_gallery')
            .update({ status: 'expired' })
            .eq('filename', video.filename);  // Changed from file_path to filename
          
          deletedCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired videos`,
      deletedCount,
      errorCount,
      totalExpired: expiredVideos.length
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// HunyuanVideo Text-to-video generation endpoint
// HunyuanVideo Text-to-video generation endpoint
/*app.post('/api/generate-video-hunyuan', async (req, res) => {
  try {
    const { prompt, type = 'text-to-video' } = req.body;
    
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt is required' 
      });
    }
    
    const pythonScript = `
import sys
import json
import os
from gradio_client import Client

# Suppress all non-JSON output
import warnings
warnings.filterwarnings("ignore")

# Set UTF-8 encoding for Windows
if os.name == 'nt':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

try:
    # Connect to HunyuanVideo space
    client = Client("Fabrice-TIERCELIN/HunyuanVideo", verbose=False)
    
    # Use the correct API endpoint and parameters
    result = client.predict(
        prompt="${prompt.replace(/"/g, '\\"')}",
        resolution="720x1280",  # 9:16 aspect ratio
        video_length="65",      # 65 frames for faster generation
        seed=-1,                # Random seed
        num_inference_steps=5,  # Fast generation
        guidance_scale=1.0,
        flow_shift=7.0,
        embedded_guidance_scale=6.0,
        api_name="/generate_video"
    )
    
    # Debug: Print the actual result to understand the structure
    print(f"DEBUG: Raw result type: {type(result)}", file=sys.stderr)
    print(f"DEBUG: Raw result content: {result}", file=sys.stderr)
    
    # Check if result is None or empty
    if result is None:
        raise Exception("HunyuanVideo returned None - space may be overloaded or failed")
    
    # Extract video path from result
    # Result should be a dict with 'video' and 'subtitles' keys
    if isinstance(result, dict) and "video" in result:
        video_path = result["video"]
    elif isinstance(result, tuple) and len(result) > 0:
        # Sometimes result is a tuple
        video_path = result[0]
    elif isinstance(result, str):
        # Sometimes result is direct path
        video_path = result
    else:
        raise Exception(f"Unexpected result format: {type(result)} - {result}")
    
    # Validate video path
    if not video_path:
        raise Exception("Video path is empty or None")
    
    print(json.dumps({
        "success": True, 
        "videoPath": video_path, 
        "seed": -1
    }))
    
except Exception as e:
    print(json.dumps({
        "success": False, 
        "error": str(e)
    }))
    `;
    
    const { spawn } = require('child_process');
    
    // Set UTF-8 encoding for the Python process on Windows
    const env = { ...process.env };
    if (process.platform === 'win32') {
      env.PYTHONIOENCODING = 'utf-8';
    }
    
    const pythonProcess = spawn('python', ['-c', pythonScript], {
      env: env
    });
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString('utf8');
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString('utf8');
    });
    
    pythonProcess.on('close', async (code) => {
      console.log('Python process closed with code:', code);
      console.log('Python output:', output);
      
      try {
        // Try to extract JSON from mixed output
        const jsonMatch = output.match(/\{"success".*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          console.log('Extracted JSON successfully:', result);
          
          if (result.success) {
            // HunyuanVideo returns a temporary file path that needs to be processed
            const originalPath = result.videoPath;
            const tempUserId = '00000000-0000-4000-8000-000000000000';
            
            try {
              // Generate unique filename
              const fileName = `hunyuan-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp4`;
              const filePath = `${tempUserId}/${fileName}`;
              
              // Read video file and upload to Supabase Storage
              const videoBuffer = fs.readFileSync(originalPath);
              
              console.log('Uploading video to Supabase Storage...');
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('neutex-videos')
                .upload(filePath, videoBuffer, {
                  contentType: 'video/mp4',
                  upsert: true
                });
              
              if (uploadError) {
                throw uploadError;
              }
              
              // Get public URL
              const { data: urlData } = supabase.storage
                .from('neutex-videos')
                .getPublicUrl(filePath);
              
              const publicUrl = urlData.publicUrl;
              
              // Calculate expiration (7 days from now)
              const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              
              // Save metadata to database with expiration
              const { data: dbData, error: dbError } = await supabase
                .from('video_gallery')
                .insert([{
                  user_id: tempUserId,
                  video_url: publicUrl,
                  file_path: filePath,
                  prompt: prompt.trim(),
                  seed: result.seed || -1,
                  provider: 'HunyuanVideo',
                  model: 'hunyuan-video',
                  expires_at: expiresAt.toISOString(),
                  status: 'active'
                }]);
              
              if (dbError) {
                console.error('Database insert error:', dbError);
              } else {
                console.log('Video metadata saved to database');
              }
              
              // Schedule cleanup after 7 days
              setTimeout(async () => {
                try {
                  // Delete from Supabase Storage
                  const { error: deleteError } = await supabase.storage
                    .from('neutex-videos')
                    .remove([filePath]);
                  
                  if (deleteError) {
                    console.error('Failed to delete video from storage:', deleteError);
                  } else {
                    console.log('Deleted expired video from storage:', fileName);
                  }
                  
                  // Update database status
                  const { error: updateError } = await supabase
                    .from('video_gallery')
                    .update({ status: 'expired' })
                    .eq('file_path', filePath);
                  
                  if (updateError) {
                    console.error('Failed to update video status:', updateError);
                  } else {
                    console.log('Updated video status to expired:', fileName);
                  }
                } catch (cleanupError) {
                  console.error('Cleanup error:', cleanupError);
                }
              }, 7 * 24 * 60 * 60 * 1000); // 7 days
              
              console.log('Video uploaded successfully:', publicUrl);
              
              res.json({
                success: true,
                videoPath: publicUrl,
                seed: result.seed || -1,
                provider: 'HunyuanVideo',
                expiresIn: '7 days',
                expiresAt: expiresAt.toISOString()
              });
              
            } catch (storageError) {
              console.error('Storage error:', storageError);
              return res.status(500).json({ 
                success: false, 
                error: 'Failed to save video: ' + storageError.message 
              });
            }
          } else {
            return res.status(500).json({ 
              success: false, 
              error: result.error 
            });
          }
        } else {
          // If no JSON match found, try parsing the entire output
          const cleanOutput = output.trim();
          const result = JSON.parse(cleanOutput);
          
          if (result.success) {
            // Process the video similar to above
            res.json({
              success: true,
              videoPath: result.videoPath,
              seed: result.seed,
              provider: 'HunyuanVideo'
            });
          } else {
            res.status(500).json({ 
              success: false, 
              error: result.error 
            });
          }
        }
      } catch (parseError) {
        console.error('JSON Parse error:', parseError);
        console.error('Raw output was:', JSON.stringify(output));
        
        res.status(500).json({ 
          success: false, 
          error: 'Failed to parse Python response: ' + parseError.message 
        });
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Python process error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Python process failed: ' + error.message 
      });
    });
    
  } catch (error) {
    console.error('Endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
*/
app.get('/api/test-video-serving', (req, res) => {
  try {
    const videosPath = path.join(__dirname, 'public', 'videos');
    
    if (!fs.existsSync(videosPath)) {
      return res.json({ error: 'Videos directory does not exist', path: videosPath });
    }
    
    const files = fs.readdirSync(videosPath);
    const videoFiles = files.filter(file => file.endsWith('.mp4'));
    
    res.json({ 
      success: true,
      videosDirectory: videosPath,
      videoFiles: videoFiles,
      totalFiles: videoFiles.length,
      staticUrlExample: videoFiles.length > 0 ? `/videos/${videoFiles[0]}` : 'No videos found'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Free Image Generation with Pollinations
// Updated image generation endpoint with Stable Diffusion fallback
// Updated Pollinations endpoint with format conversion
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style, aspectRatio, outputFormat = 'png', referenceImage ,negativePrompt} = req.body;
    
    const stylePrompts = {
      'realistic': 'photorealistic, ultra detailed, high resolution, professional photography',
      'artistic': 'artistic masterpiece, digital art, vibrant colors, creative composition',
      'cartoon': 'cartoon illustration, animated style, bright colors, clean lines', 
      'abstract': 'abstract art, geometric patterns, modern design, artistic interpretation',
      'cinematic': 'cinematic lighting, movie scene, dramatic composition, film photography',
      '3d': '3D render, three dimensional, volumetric lighting, realistic materials',
      'oil-painting': 'oil painting style, traditional art, painterly brushstrokes, classical technique',
      'watercolor': 'watercolor painting, soft edges, transparent washes, artistic medium'
    };
    
    let enhancedPrompt = `${prompt}, ${stylePrompts[style] || 'high quality, detailed'}`;

    if (negativePrompt && negativePrompt.trim()) {
      enhancedPrompt += `, avoid: ${negativePrompt.trim()}`;
    }
    
    // If reference image is provided, enhance the prompt
    if (referenceImage) {
      enhancedPrompt += ', similar style and composition to reference image, maintaining the visual elements and aesthetic';
      console.log('Using reference image to enhance prompt');
    }
    
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    // Determine dimensions based on aspect ratio
    let width = 1024, height = 1024;
    if (aspectRatio === '16:9') { 
      width = 1024; 
      height = 576; 
    } else if (aspectRatio === '9:16') { 
      width = 576; 
      height = 1024; 
    } else if (aspectRatio === '4:3') { 
      width = 1024; 
      height = 768; 
    }
    
    // Generate Pollinations URL
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=turbo`;
    
    console.log(`Generated Pollinations URL: ${imageUrl}`);
    
    // Download the image and convert format
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    
    // Convert to requested format
    const convertedBuffer = await convertImageFormat(imageBuffer, outputFormat);
    const mimeType = getMimeType(outputFormat);
    
    // Convert to base64
    const base64Image = `data:${mimeType};base64,${convertedBuffer.toString('base64')}`;

    const tempUserId = '00000000-0000-4000-8000-000000000000';
    console.log('Attempting to save to storage...');

    try {
      // Generate unique filename
      const fileName = `pollinations-${Date.now()}-${seed}.${outputFormat}`;
      
      // Save to Supabase Storage
      const publicUrl = await saveImageToStorage(base64Image, fileName, tempUserId);
      
      // Save metadata to database with storage URL
      const { data, error } = await supabase
        .from('image_gallery')
        .insert([{
          user_id: tempUserId,
          image_url: publicUrl, // Now stores the public URL, not base64
          file_path: `${tempUserId}/${fileName}`,
          prompt: prompt.trim(),
          negative_prompt: negativePrompt || null,
          style: style,
          aspect_ratio: aspectRatio,
          model: 'pollinations-ai',
          seed: seed,
          format: outputFormat
        }]);
      
      if (error) {
        console.error('Database insert error:', error);
        throw error;
      } else {
        console.log('Storage and database save successful:', data);
      }
      
    } catch (dbError) {
      console.error('Failed to save to storage/database:', dbError.message);
      // Don't fail the generation if storage fails
    }
    
    return res.json({ 
      imageUrl: base64Image,
      model: 'pollinations-ai',
      format: outputFormat,
      usedReference: !!referenceImage
    });
    
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: 'Image generation failed: ' + error.message });
  }
});

// Keep your existing health check endpoint
app.get('/api/colab-status', async (req, res) => {
  try {
    const colabUrl = process.env.COLAB_API_URL;
    
    if (!colabUrl) {
      return res.json({ status: 'not_configured' });
    }
    
    const response = await fetch(`${colabUrl}/health`, { timeout: 5000 });
    
    if (response.ok) {
      const data = await response.json();
      res.json({ status: 'online', data });
    } else {
      res.json({ status: 'offline' });
    }
  } catch (error) {
    res.json({ status: 'error', error: error.message });
  }
});


// Task Automation Endpoint
app.post('/api/generate-automation', async (req, res) => {
  try {
    const { description, automationType, complexity } = req.body;
    const automationPrompt = buildAutomationPrompt(description, automationType, complexity);
    
    // Primary: Kimi K2
    try {
      console.log('Attempting OpenRouter with Kimi K2 for automation generation');
      
      const completion = await openai.chat.completions.create({
        model: "moonshotai/kimi-k2:free",
        messages: [
          {
            role: "system",
            content: "You are an expert automation consultant. Generate detailed, practical automation workflows, scripts, and step-by-step guides based on user requirements. Focus on actionable, implementable solutions."
          },
          {
            role: "user",
            content: automationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000
      });
      
      const automation = completion.choices[0].message.content;
      console.log('OpenRouter success');
      return res.json({ 
        automation,
        provider: 'OpenRouter',
        model: "moonshotai/kimi-k2:free"
      });
      
    } catch (openRouterError) {
      console.log('Kimi K2 failed, trying GPT-OSS-120B via Groq:', openRouterError.message);
      
      // Secondary: GPT-OSS-120B via Groq
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are an expert automation consultant. Generate detailed, practical automation workflows, scripts, and step-by-step guides."
            },
            {
              role: "user",
              content: automationPrompt
            }
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.3,
          max_tokens: 3000,
        });
        
        const automation = completion.choices[0].message.content;
        console.log('Groq success');
        return res.json({ 
          automation,
          provider: 'GroqCloud',
          model: 'openai/gpt-oss-120b',
          fallback: true
        });
        
      } catch (groqError) {
        console.log('GPT-OSS-120B failed, trying Gemini:', groqError.message);
        
        // Final: Gemini Direct
        try {
          const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          const result = await geminiModel.generateContent(automationPrompt);
          const automation = result.response.text();
          console.log('Gemini success');
          
          return res.json({ 
            automation,
            provider: 'Gemini Direct',
            model: 'gemini-2.0-flash',
            fallback: true
          });
          
        } catch (geminiError) {
          throw new Error(`All automation providers failed: Kimi K2(${openRouterError.message}) | GPT-OSS-120B(${groqError.message}) | Gemini(${geminiError.message})`);
        }
      }
    }
    
  } catch (error) {
    console.error('All automation providers failed:', error);
    res.status(500).json({ error: 'Automation generation failed: ' + error.message });
  }
});

app.post('/api/generate-image-sd', async (req, res) => {
  try {
    const { prompt, style, aspectRatio, outputFormat = 'png', referenceImage ,negativePrompt} = req.body;
    
    const stylePrompts = {
      'realistic': 'photorealistic, ultra detailed, high resolution, professional photography',
      'artistic': 'artistic masterpiece, digital art, vibrant colors, creative composition',
      'cartoon': 'cartoon illustration, animated style, bright colors, clean lines',
      'abstract': 'abstract art, geometric patterns, modern design, artistic interpretation',
      'cinematic': 'cinematic lighting, movie scene, dramatic composition, film photography',
      '3d': '3D render, three dimensional, volumetric lighting, realistic materials',
      'oil-painting': 'oil painting style, traditional art, painterly brushstrokes, classical technique',
      'watercolor': 'watercolor painting, soft edges, transparent washes, artistic medium'
    };
    
    let enhancedPrompt = `${prompt}, ${stylePrompts[style] || 'high quality, detailed'}`;

    if (negativePrompt && negativePrompt.trim()) {
      enhancedPrompt += `, avoid: ${negativePrompt.trim()}`;
    }
    
    // Determine dimensions for Stable Diffusion
    let width = 512, height = 512;
    if (aspectRatio === '16:9') { 
      width = 768; 
      height = 432; 
    } else if (aspectRatio === '9:16') { 
      width = 432; 
      height = 768; 
    } else if (aspectRatio === '4:3') { 
      width = 640; 
      height = 480; 
    }

    // Try Stable Diffusion via Colab first
    try {
      const colabUrl = process.env.COLAB_API_URL;
      
      if (!colabUrl) {
        throw new Error('Stable Diffusion service not configured');
      }
      
      console.log('Generating image with Stable Diffusion via Colab...');
      
      // Prepare request body
      const requestBody = {
        prompt: enhancedPrompt,
        width: width,
        height: height,
        num_inference_steps: 20,
        guidance_scale: 7.5
      };
      
      // Add reference image if provided (img2img)
      if (referenceImage) {
        requestBody.init_image = referenceImage;
        requestBody.strength = 0.75; // How much to transform the reference
        requestBody.mode = 'img2img';
        console.log('Using img2img mode with reference image');
      } else {
        requestBody.mode = 'txt2img';
      }
      
      const sdResponse = await fetch(`${colabUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        timeout: 120000
      });
      
      if (!sdResponse.ok) {
        throw new Error(`Stable Diffusion failed with status ${sdResponse.status}`);
      }
      
      const sdData = await sdResponse.json();
      
      if (sdData.success) {
        // Convert the base64 image to requested format
        const base64Data = sdData.image.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Convert to requested format
        const convertedBuffer = await convertImageFormat(imageBuffer, outputFormat);
        const mimeType = getMimeType(outputFormat);
        const convertedBase64 = `data:${mimeType};base64,${convertedBuffer.toString('base64')}`;
        
        console.log('Stable Diffusion generation success with format conversion');
       
        // Replace the database saving section with:
          const tempUserId = '00000000-0000-4000-8000-000000000000';
          const seed = Math.floor(Math.random() * 1000000);

          try {
            const fileName = `stable-diffusion-${Date.now()}-${seed}.${outputFormat}`;
            const publicUrl = await saveImageToStorage(convertedBase64, fileName, tempUserId);
            
            await supabase
              .from('image_gallery')
              .insert([{
                user_id: tempUserId,
                image_url: publicUrl,
                file_path: `${tempUserId}/${fileName}`,
                prompt: prompt.trim(),
                negative_prompt: negativePrompt || null,
                style: style,
                aspect_ratio: aspectRatio,
                model: 'stable-diffusion-v1-5',
                seed: seed,
                format: outputFormat
              }]);
              
          } catch (dbError) {
            console.error('Failed to save to storage/database:', dbError.message);
          }
        return res.json({ 
          imageUrl: convertedBase64,
          model: 'stable-diffusion-v1-5',
          provider: 'Colab',
          format: outputFormat,
          generation_time: 'slow_but_high_quality',
          usedReference: !!referenceImage
        });
      } else {
        throw new Error(sdData.error || 'Stable Diffusion generation failed');
      }
      
    } catch (sdError) {
      console.log('Stable Diffusion failed, falling back to Pollinations:', sdError.message);
      
      // Fallback to Pollinations with enhanced prompt for reference
      let enhancedPromptWithRef = enhancedPrompt;
      if (referenceImage) {
        enhancedPromptWithRef += ', similar style and composition to reference image';
      }
      
      const encodedPrompt = encodeURIComponent(enhancedPromptWithRef);
      
      let pollWidth = 1024, pollHeight = 1024;
      if (aspectRatio === '16:9') { 
        pollWidth = 1024; 
        pollHeight = 576; 
      } else if (aspectRatio === '9:16') { 
        pollWidth = 576; 
        pollHeight = 1024; 
      } else if (aspectRatio === '4:3') { 
        pollWidth = 1024; 
        pollHeight = 768; 
      }
      
      const seed = Math.floor(Math.random() * 1000000);
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${pollWidth}&height=${pollHeight}&seed=${seed}`;
      
      // Download and convert fallback image
      const imageResponse = await fetch(fallbackUrl);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      const convertedBuffer = await convertImageFormat(imageBuffer, outputFormat);
      const mimeType = getMimeType(outputFormat);
      const base64Image = `data:${mimeType};base64,${convertedBuffer.toString('base64')}`;
      
      console.log('Using Pollinations fallback with format conversion');
      
      return res.json({ 
        imageUrl: base64Image,
        model: 'pollinations-ai-fallback',
        provider: 'Pollinations',
        format: outputFormat,
        fallback: true,
        usedReference: !!referenceImage,
        warning: 'Stable Diffusion service unavailable, used Pollinations instead'
      });
    }
    
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ 
      error: 'Image generation failed: ' + error.message,
      model: 'error'
    });
  }
});

app.post('/api/generate-image-gemini', async (req, res) => {
  try {
    const { prompt, style, aspectRatio, outputFormat = 'png', referenceImage,negativePrompt } = req.body;
    
    const stylePrompts = {
      'realistic': 'photorealistic, ultra detailed, high resolution, professional photography',
      'artistic': 'artistic masterpiece, digital art, vibrant colors, creative composition',
      'cartoon': 'cartoon illustration, animated style, bright colors, clean lines',
      'abstract': 'abstract art, geometric patterns, modern design, artistic interpretation',
      'cinematic': 'cinematic lighting, movie scene, dramatic composition, film photography',
      '3d': '3D render, three dimensional, volumetric lighting, realistic materials',
      'oil-painting': 'oil painting style, traditional art, painterly brushstrokes, classical technique',
      'watercolor': 'watercolor painting, soft edges, transparent washes, artistic medium'
    };
    
    let enhancedPrompt = `${prompt}, ${stylePrompts[style] || 'high quality, detailed'}`;

    if (negativePrompt && negativePrompt.trim()) {
      enhancedPrompt += `, avoid: ${negativePrompt.trim()}`;
    }
    
    // Add reference image context to prompt (Gemini doesn't support img2img directly)
    if (referenceImage) {
      enhancedPrompt += ', create an image with similar visual style and composition to a reference image';
      console.log('Enhanced prompt with reference image context for Gemini');
    }
    
    try {
      console.log('Attempting image generation with Gemini Image API...');
      
      const geminiImageModel = genAIImage.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
      
      const result = await geminiImageModel.generateContent([enhancedPrompt]);
      
      for (const part of result.response.candidates[0].content.parts) {
        if (part.inlineData !== null && part.inlineData !== undefined) {
          const imageData = part.inlineData.data;
          const originalBuffer = Buffer.from(imageData, 'base64');
          
          // Convert to requested format
          const convertedBuffer = await convertImageFormat(originalBuffer, outputFormat);
          const mimeType = getMimeType(outputFormat);
          const convertedBase64 = `data:${mimeType};base64,${convertedBuffer.toString('base64')}`;
          
          console.log('Gemini image generation success with format conversion');

          // Replace the database saving section with:
// Replace the database saving section with:
          const tempUserId = '00000000-0000-4000-8000-000000000000';
          const seed = Math.floor(Math.random() * 1000000);

          try {
            const fileName = `gemini-${Date.now()}-${seed}.${outputFormat}`;
            const publicUrl = await saveImageToStorage(convertedBase64, fileName, tempUserId);
            
            await supabase
              .from('image_gallery')
              .insert([{
                user_id: tempUserId,
                image_url: publicUrl,
                file_path: `${tempUserId}/${fileName}`,
                prompt: prompt.trim(),
                negative_prompt: negativePrompt || null,
                style: style,
                aspect_ratio: aspectRatio,
                model: 'gemini-2.5-flash-image-preview',
                seed: seed,
                format: outputFormat
              }]);
              
          } catch (dbError) {
            console.error('Failed to save to storage/database:', dbError.message);
          }
                    
          return res.json({ 
            imageUrl: convertedBase64,
            model: 'gemini-2.5-flash-image-preview',
            provider: 'Gemini Image Dedicated API',
            format: outputFormat,
            usedReference: !!referenceImage
          });
        }
      }
      
      throw new Error('No image data found in Gemini response');
      
    } catch (geminiError) {
      console.log('Gemini image API failed, falling back to Stable Diffusion:', geminiError.message);
      
      // Fallback to Stable Diffusion via Colab
      try {
        const colabUrl = process.env.COLAB_API_URL;
        
        if (!colabUrl) {
          throw new Error('Colab API URL not configured');
        }
        
        const sdResponse = await fetch(`${colabUrl}/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: enhancedPrompt,
            width: 512,
            height: 512
          }),
          timeout: 60000
        });
        
        if (!sdResponse.ok) {
          throw new Error(`Stable Diffusion failed with status ${sdResponse.status}`);
        }
        
        const sdData = await sdResponse.json();
        
        if (sdData.success) {
          // Convert SD image to requested format
          const base64Data = sdData.image.replace(/^data:image\/[a-z]+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          const convertedBuffer = await convertImageFormat(imageBuffer, outputFormat);
          const mimeType = getMimeType(outputFormat);
          const convertedBase64 = `data:${mimeType};base64,${convertedBuffer.toString('base64')}`;
          
          console.log('Stable Diffusion fallback success with format conversion');

          const tempUserId = '00000000-0000-4000-8000-000000000000';
          const seed = Math.floor(Math.random() * 1000000);
          try {
            const fileName = `stable-diffusion-fallback-${Date.now()}-${seed}.${outputFormat}`;
            const publicUrl = await saveImageToStorage(convertedBase64, fileName, tempUserId);
            
            await supabase
              .from('image_gallery')
              .insert([{
                user_id: tempUserId,
                image_url: publicUrl,
                file_path: `${tempUserId}/${fileName}`,
                prompt: prompt.trim(),
                negative_prompt: negativePrompt || null,
                style: style,
                aspect_ratio: aspectRatio,
                model: 'stable-diffusion-fallback',
                seed: seed,
                format: outputFormat
              }]);
          } catch (dbError) {
            console.error('Failed to save fallback to storage/database:', dbError.message);
          }
          return res.json({ 
            imageUrl: convertedBase64,
            model: 'stable-diffusion-fallback',
            provider: 'Stable Diffusion via Colab',
            format: outputFormat,
            fallback: true,
            warning: 'Gemini image service unavailable, used Stable Diffusion instead'
          });
        } else {
          throw new Error(sdData.error || 'Stable Diffusion generation failed');
        }
        
      } catch (sdError) {
        console.log('Stable Diffusion fallback also failed:', sdError.message);
        
        // Final fallback - Pollinations with format conversion
        const seed = Math.floor(Math.random() * 1000000);
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&seed=${seed}`;
        
        const imageResponse = await fetch(fallbackUrl);
        const arrayBuffer = await imageResponse.arrayBuffer(); // CHANGED
        const imageBuffer = Buffer.from(arrayBuffer);
        const convertedBuffer = await convertImageFormat(imageBuffer, outputFormat);
        const mimeType = getMimeType(outputFormat);
        const base64Image = `data:${mimeType};base64,${convertedBuffer.toString('base64')}`;
        
        console.log('Using final fallback with format conversion');

        const tempUserId = '00000000-0000-4000-8000-000000000000';
        try {
          const fileName = `pollinations-fallback-${Date.now()}-${seed}.${outputFormat}`;
          const publicUrl = await saveImageToStorage(base64Image, fileName, tempUserId);
          
          await supabase
            .from('image_gallery')
            .insert([{
              user_id: tempUserId,
              image_url: publicUrl,
              file_path: `${tempUserId}/${fileName}`,
              prompt: prompt.trim(),
              negative_prompt: negativePrompt || null,
              style: style,
              aspect_ratio: aspectRatio,
              model: 'pollinations-ai-final-fallback',
              seed: seed,
              format: outputFormat
            }]);
        } catch (dbError) {
          console.error('Failed to save fallback to storage/database:', dbError.message);
        }

        
        return res.json({ 
          imageUrl: base64Image,
          model: 'pollinations-ai-final-fallback',
          provider: 'Pollinations AI',
          format: outputFormat,
          fallback: true,
          warning: 'All premium image generation services experiencing issues'
        });
      }
    }
    
  } catch (error) {
    console.error('Gemini image generation error:', error);
    res.status(500).json({ error: 'Image generation failed: ' + error.message });
  }
});

// Social Media Content Generation endpoint
// Social Media Content Generation endpoint
// Enhanced Social Media Content Generation endpoint
app.post('/api/generate-social-content', async (req, res) => {
  try {
    const { prompt, image, platform, additionalContext, captionLength = 'medium' } = req.body;
    
    if (!platform) {
      return res.status(400).json({ 
        success: false, 
        error: 'Platform is required' 
      });
    }

    // Caption length specifications
    const captionSpecs = {
      'short': '1-2 sentences, concise and punchy',
      'medium': '2-4 sentences, balanced and engaging',
      'long': '4-6 sentences, detailed and comprehensive'
    };

    let enhancedPrompt;
    
    if (image) {
      // Image-based generation
      enhancedPrompt = `Analyze this image and create social media content for ${platform}. ${additionalContext ? `Context: ${additionalContext}` : ''} 

Caption Length: ${captionSpecs[captionLength]}

Format the response as:
Caption: [${captionSpecs[captionLength]}]
Emojis: [3-5 relevant emojis]
Hashtags: [5-8 relevant hashtags for ${platform}]`;
    } else if (prompt) {
      // Text-based generation
      enhancedPrompt = `Create social media content for ${platform} based on: "${prompt}". ${additionalContext ? `Context: ${additionalContext}` : ''}

Caption Length: ${captionSpecs[captionLength]}

Format the response as:
Caption: [${captionSpecs[captionLength]}]
Emojis: [3-5 relevant emojis]
Hashtags: [5-8 relevant hashtags for ${platform}]`;
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Either prompt or image is required' 
      });
    }

    // Try Gemini first with dedicated social media API key
    try {
      const geminiModel = genAISocial.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      let result;
      if (image) {
        result = await geminiModel.generateContent([enhancedPrompt, { 
          inlineData: { 
            data: image.replace(/^data:image\/[^;]+;base64,/, ''), 
            mimeType: 'image/jpeg' 
          } 
        }]);
      } else {
        result = await geminiModel.generateContent(enhancedPrompt);
      }
      
      const responseText = result.response.text();
      console.log('Raw Gemini response:', responseText);

      // Parse the response
      const lines = responseText.split('\n');
      let caption = '', emojis = '', hashtags = '';

      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.toLowerCase().startsWith('caption:')) {
          caption = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();
        } else if (trimmedLine.toLowerCase().startsWith('emojis:')) {
          emojis = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();
        } else if (trimmedLine.toLowerCase().startsWith('hashtags:')) {
          hashtags = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();
        }
      });

      console.log('Parsed caption:', caption);
      console.log('Parsed emojis:', emojis);  
      console.log('Parsed hashtags:', hashtags);

      return res.json({
        success: true,
        caption: caption,
        emojis: emojis,
        hashtags: hashtags,
        captionLength: captionLength,
        provider: 'Gemini Social'
      });
      
    } catch (geminiError) {
      console.log('Gemini failed, trying OpenRouter:', geminiError.message);
      
      // Fallback to OpenRouter
      const completion = await openai.chat.completions.create({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          {
            role: "system",
            content: "You are a social media expert. Generate engaging content formatted as requested with the specified caption length."
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const responseText = completion.choices[0].message.content;
      console.log('Raw OpenRouter response:', responseText);

      // Parse the response
      const lines = responseText.split('\n');
      let caption = '', emojis = '', hashtags = '';

      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.toLowerCase().startsWith('caption:')) {
          caption = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();
        } else if (trimmedLine.toLowerCase().startsWith('emojis:')) {
          emojis = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();
        } else if (trimmedLine.toLowerCase().startsWith('hashtags:')) {
          hashtags = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();
        }
      });

      console.log('Parsed OpenRouter caption:', caption);
      console.log('Parsed OpenRouter emojis:', emojis);  
      console.log('Parsed OpenRouter hashtags:', hashtags);

      return res.json({
        success: true,
        caption: caption,
        emojis: emojis,
        hashtags: hashtags,
        captionLength: captionLength,
        provider: 'OpenRouter'
      });
    }
    
  } catch (error) {
    console.error('Social media generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});


// Prompt Enhancement Endpoint
app.post('/api/enhance-prompt', async (req, res) => {
  try {
    const { prompt, style, aspectRatio } = req.body;
    
    const enhancementPrompt = `Enhance this image generation prompt to be more detailed and effective: "${prompt}"

Style context: ${style}
Aspect ratio: ${aspectRatio}

Guidelines:
- Add descriptive details about lighting, composition, and atmosphere
- Include specific artistic techniques relevant to the style
- Enhance visual elements while keeping the core concept
- Make it more specific and vivid
- Keep it under 150 words
- Return only the enhanced prompt, no explanations

Enhanced prompt:`;
    
    // Try Gemini first for prompt enhancement
    try {
      const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await geminiModel.generateContent(enhancementPrompt);
      const enhancedPrompt = result.response.text().trim();
      
      console.log('Prompt enhanced with Gemini');
      return res.json({ 
        enhancedPrompt,
        provider: 'Gemini',
        original: prompt
      });
      
    } catch (geminiError) {
      console.log('Gemini failed, trying OpenRouter:', geminiError.message);
      
      // Fallback to OpenRouter
      try {
        const completion = await openai.chat.completions.create({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [
            {
              role: "system",
              content: "You are an expert at enhancing image generation prompts. Make prompts more detailed and effective while keeping the core concept."
            },
            {
              role: "user",
              content: enhancementPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 200
        });
        
        const enhancedPrompt = completion.choices[0].message.content.trim();
        console.log('Prompt enhanced with OpenRouter');
        
        return res.json({ 
          enhancedPrompt,
          provider: 'OpenRouter',
          original: prompt,
          fallback: true
        });
        
      } catch (openRouterError) {
        throw new Error(`All enhancement providers failed: Gemini(${geminiError.message}) | OpenRouter(${openRouterError.message})`);
      }
    }
    
  } catch (error) {
    console.error('Prompt enhancement error:', error);
    res.status(500).json({ error: 'Prompt enhancement failed: ' + error.message });
  }
});


const FormData = require('form-data');

// Object Detection with Roboflow
app.post('/api/detect-objects', async (req, res) => {
  try {
    const { imageData, confidenceThreshold = 0.4 } = req.body;
    
    console.log('Using Roboflow Person Detection...');
    
    // Convert base64 data
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Try with your API key first
    let apiKey = process.env.ROBOFLOW_API_KEY;
    
    const response = await fetch(`https://serverless.roboflow.com/person-c4ikq/1?api_key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: base64Data
    });

    if (!response.ok) {
      // If your key doesn't work, try the demo key from the documentation
      console.log('Trying with demo API key...');
      const demoResponse = await fetch(`https://serverless.roboflow.com/person-c4ikq/1?api_key=qsIjbqonshoLMCK9Pgwp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: base64Data
      });
      
      if (!demoResponse.ok) {
        throw new Error(`Both API keys failed: ${response.status}`);
      }
      
      const result = await demoResponse.json();
      return handleDetectionResult(result, res);
    }

    const result = await response.json();
    return handleDetectionResult(result, res);

  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({ 
      error: 'Detection failed: ' + error.message,
      detections: []
    });
  }
});

function handleDetectionResult(result, res) {
  console.log('Detection result:', result);
  
  const detections = (result.predictions || []).map((pred, index) => ({
    id: index + 1,
    object: pred.class || 'person',
    confidence: pred.confidence,
    bbox: [
      Math.round(pred.x - pred.width / 2),
      Math.round(pred.y - pred.height / 2),
      Math.round(pred.width),
      Math.round(pred.height)
    ],
    color: getDetectionColor(pred.class || 'person')
  }));

  res.json({ 
    detections, 
    model: 'person-c4ikq/1',
    provider: 'Roboflow Universe'
  });
}

// Add this function to your server.js
function getDetectionColor(className) {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
  ];
  
  // Use class name to get consistent color
  const hash = (className || 'person').split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}

// Add this to your server.js - FIXED chat endpoint
// Replace the existing /api/chat endpoint in your server.js with this fixed version:

app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    // Handle both JSON and FormData requests with robust error handling
    let message, conversationHistory;
    
    if (req.file || req.body.message) {
      // FormData request (with file)
      message = req.body.message || '';
      
      // Robust parsing of conversationHistory
      try {
        if (req.body.conversationHistory && req.body.conversationHistory.trim()) {
          conversationHistory = JSON.parse(req.body.conversationHistory);
          // Validate that it's an array
          if (!Array.isArray(conversationHistory)) {
            console.warn('conversationHistory is not an array, defaulting to empty array');
            conversationHistory = [];
          }
        } else {
          conversationHistory = [];
        }
      } catch (parseError) {
        console.error('Error parsing conversationHistory:', parseError.message);
        console.log('Raw conversationHistory value:', req.body.conversationHistory);
        conversationHistory = [];
      }
      
    } else {
      // JSON request (no file)
      const jsonBody = req.body;
      message = jsonBody.message || '';
      conversationHistory = Array.isArray(jsonBody.conversationHistory) ? 
        jsonBody.conversationHistory : [];
    }

    console.log('Chat request:', { 
      hasFile: !!req.file, 
      message: message.substring(0, 50) + '...',
      historyLength: conversationHistory.length,
      requestType: req.file ? 'FormData' : 'JSON'
    });

    let enhancedMessage = message;
    
    // Process uploaded file if present
    if (req.file) {
      console.log('Processing uploaded file:', req.file.originalname);
      
      if (req.file.mimetype.startsWith('image/')) {
        // For image files, add context for vision models
        const base64Image = req.file.buffer.toString('base64');
        enhancedMessage += `\n\n[User uploaded an image: ${req.file.originalname}. Please analyze this image and respond accordingly.]`;
        // Note: You'll need a vision-capable model to actually process the image
        
      } else if (req.file.mimetype === 'text/plain') {
        // For text files, include the content
        const textContent = req.file.buffer.toString('utf-8');
        enhancedMessage += `\n\nFile content from ${req.file.originalname}:\n\n${textContent}`;
        
      } else if (req.file.mimetype === 'application/pdf') {
        // For PDF files (you'd need pdf-parse library)
        enhancedMessage += `\n\n[User uploaded a PDF file: ${req.file.originalname}. PDF processing would require additional setup.]`;
        
      } else {
        enhancedMessage += `\n\n[User uploaded a file: ${req.file.originalname} (${req.file.mimetype})]`;
      }
    }

    // Validate message
    if (!enhancedMessage.trim()) {
      return res.status(400).json({
        error: 'Message content is required',
        response: "Please provide a message for me to respond to."
      });
    }

    // Build conversation context with history
    const messages = [
      {
        role: "system",
        content: `You are Neutex AI, an intelligent assistant specializing in productivity, automation, and smart decision-making. You help users with:

- Code generation and programming assistance
- Task automation and workflow design  
- Creative problem solving
- Technical guidance and explanations
- General questions and conversations
- File analysis when files are uploaded

Be helpful, concise, and professional. Use markdown formatting when appropriate for code blocks, lists, and emphasis.`
      }
    ];

    // Add conversation history (last 10 messages for context)
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.slice(-10).forEach(msg => {
        if (msg && msg.type && msg.content) {
          messages.push({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        }
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: enhancedMessage
    });

    // Try Gemini 2.5 Flash first
    try {
      console.log('Attempting chat with Gemini 2.5 Flash');
      
      const gemini25Model = genAI25.getGenerativeModel({ model: "gemini-2.0-flash-thinking-exp-1219" });
      
      let prompt = "You are Neutex AI, an intelligent assistant for productivity and automation.\n\n";
      messages.slice(1).forEach(msg => {
        if (msg.role === 'user') {
          prompt += `User: ${msg.content}\n`;
        } else {
          prompt += `Assistant: ${msg.content}\n`;
        }
      });
      
      const result = await gemini25Model.generateContent(prompt);
      const response = result.response.text();
      console.log('Gemini 2.5 Flash chat success');
      
      return res.json({ 
        response,
        model: 'gemini-2.5-flash',
        provider: 'Gemini 2.5 Direct'
      });
      
    } catch (gemini25Error) {
      console.log('Gemini 2.5 Flash failed, trying Kimi K2:', gemini25Error.message);
      
      // Try Kimi K2 (secondary)
      try {
        const completion = await openai.chat.completions.create({
          model: "moonshotai/kimi-k2:free",
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        });
        
        const response = completion.choices[0].message.content;
        console.log('Kimi K2 chat success');
        
        return res.json({ 
          response,
          model: 'kimi-k2',
          provider: 'OpenRouter',
          fallback: true
        });
        
      } catch (openRouterError) {
        console.log('Kimi K2 failed, trying GPT-OSS-120B via Groq:', openRouterError.message);
        
        // Try GPT-OSS-120B via Groq (final fallback)
        try {
          const completion = await groq.chat.completions.create({
            messages: messages,
            model: "openai/gpt-oss-120b",
            temperature: 0.7,
            max_tokens: 2000,
          });
          
          const response = completion.choices[0].message.content;
          console.log('GPT-OSS-120B chat success');
          
          return res.json({ 
            response,
            model: 'gpt-oss-120b',
            provider: 'Groq',
            fallback: true
          });
          
        } catch (groqError) {
          console.log('All chat providers failed:', groqError.message);
          throw new Error(`All chat providers failed: Gemini 2.5(${gemini25Error.message}) | Kimi K2(${openRouterError.message}) | Groq(${groqError.message})`);
        }
      }
    }
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Chat failed: ' + error.message,
      response: "I'm experiencing technical difficulties right now. Please try again in a moment.",
      debug: process.env.NODE_ENV === 'development' ? {
        errorType: error.constructor.name,
        errorMessage: error.message,
        stack: error.stack
      } : undefined
    });
  }
});
// In your server.js, find the /api/summarize-document endpoint and update the prompt construction:

// Replace your /api/summarize-document endpoint with this complete working version:

// DOCUMENT TYPE DETECTION AND SMART TEMPLATES
// Enhanced document type detection that also considers file formats
function detectDocumentType(textContent, fileName = '', fileType = '') {
  const text = textContent.toLowerCase();
  const filename = fileName.toLowerCase();
  const mimeType = fileType.toLowerCase();
  
  // Define document type patterns with enhanced file format awareness
  const documentTypes = {
    'meeting': {
      patterns: [
        /meeting|agenda|minutes|attendees|action items|decisions made/gi,
        /present:|absent:|discussed:|next steps/gi,
        /\d{1,2}:\d{2}\s?(am|pm)/gi, // Time stamps
        /meeting called to order|meeting adjourned/gi
      ],
      keywords: ['attendees', 'agenda', 'minutes', 'action', 'decisions', 'follow-up', 'next meeting'],
      filenamePatterns: /meeting|minutes|agenda/,
      fileTypes: ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      settings: {
        summaryStyle: 'bullet-points',
        summaryLength: 'medium',
        focusArea: 'action-items'
      },
      confidence: 0
    },
    
    'research': {
      patterns: [
        /abstract|methodology|results|conclusion|bibliography|references/gi,
        /hypothesis|experiment|data|analysis|findings|study/gi,
        /figure \d+|table \d+|appendix/gi,
        /doi:|arxiv:|journal|published/gi
      ],
      keywords: ['research', 'study', 'methodology', 'results', 'conclusion', 'hypothesis', 'data', 'analysis'],
      filenamePatterns: /research|paper|study|thesis|dissertation/,
      fileTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/html'],
      settings: {
        summaryStyle: 'academic',
        summaryLength: 'detailed',
        focusArea: 'key-findings'
      },
      confidence: 0
    },
    
    'contract': {
      patterns: [
        /agreement|contract|terms|conditions|whereas|party|parties/gi,
        /shall|liability|indemnification|termination|breach/gi,
        /section \d+|clause|hereby|notwithstanding/gi,
        /effective date|expiration|renewal/gi
      ],
      keywords: ['agreement', 'contract', 'terms', 'conditions', 'liability', 'termination', 'parties'],
      filenamePatterns: /contract|agreement|terms|legal/,
      fileTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/rtf'],
      settings: {
        summaryStyle: 'executive',
        summaryLength: 'long',
        focusArea: 'business'
      },
      confidence: 0
    },
    
    'financial': {
      patterns: [
        /revenue|profit|loss|expense|budget|financial|quarterly|annual/gi,
        /balance sheet|income statement|cash flow|assets|liabilities/gi,
        /fy\d{4}|q[1-4]|fiscal year|financial year/gi,
        /\$[\d,]+|\d+%|percentage|growth|decline/gi
      ],
      keywords: ['revenue', 'profit', 'budget', 'financial', 'expense', 'income', 'balance', 'cash flow'],
      filenamePatterns: /financial|budget|revenue|profit|expense|balance|income/,
      fileTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.ms-excel'],
      settings: {
        summaryStyle: 'executive',
        summaryLength: 'medium',
        focusArea: 'business'
      },
      confidence: 0
    },
    
    'data-analysis': {
      patterns: [
        /dataset|analysis|statistics|correlation|regression|model/gi,
        /variables|samples|population|survey|respondents/gi,
        /chart|graph|visualization|trend|pattern/gi,
        /mean|median|average|standard deviation|variance/gi
      ],
      keywords: ['data', 'analysis', 'statistics', 'chart', 'graph', 'dataset', 'variables', 'correlation'],
      filenamePatterns: /data|analysis|stats|survey|results|chart/,
      fileTypes: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
      settings: {
        summaryStyle: 'bullet-points',
        summaryLength: 'medium',
        focusArea: 'key-findings'
      },
      confidence: 0
    },
    
    'presentation': {
      patterns: [
        /slide \d+|presentation|overview|introduction|conclusion/gi,
        /agenda|outline|objectives|goals|key points/gi,
        /thank you|questions|discussion|next steps/gi,
        /bullet|point|summary|highlights/gi
      ],
      keywords: ['presentation', 'slide', 'overview', 'agenda', 'objectives', 'summary', 'highlights'],
      filenamePatterns: /presentation|slides|ppt|deck|overview/,
      fileTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'],
      settings: {
        summaryStyle: 'bullet-points',
        summaryLength: 'medium',
        focusArea: 'key-findings'
      },
      confidence: 0
    },
    
    'web-content': {
      patterns: [
        /<title>|<h[1-6]>|<div|<p>|html|web page|website/gi,
        /navigation|menu|header|footer|sidebar/gi,
        /href=|src=|class=|id=|style=/gi,
        /blog|article|post|content|author/gi
      ],
      keywords: ['html', 'web', 'page', 'article', 'blog', 'content', 'navigation'],
      filenamePatterns: /html|web|page|article|blog/,
      fileTypes: ['text/html'],
      settings: {
        summaryStyle: 'paragraph',
        summaryLength: 'medium',
        focusArea: 'key-findings'
      },
      confidence: 0
    },
    
    'report': {
      patterns: [
        /executive summary|overview|recommendations|quarterly|annual/gi,
        /performance|metrics|kpi|revenue|growth|analysis/gi,
        /q1|q2|q3|q4|fy\d{4}|fiscal year/gi,
        /department|team|project status/gi
      ],
      keywords: ['report', 'summary', 'performance', 'metrics', 'quarterly', 'annual', 'analysis'],
      filenamePatterns: /report|summary|quarterly|annual|performance/,
      fileTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/html'],
      settings: {
        summaryStyle: 'executive',
        summaryLength: 'medium',
        focusArea: 'business'
      },
      confidence: 0
    },
    
    'technical': {
      patterns: [
        /api|database|server|configuration|installation|setup/gi,
        /code|function|variable|class|method|algorithm/gi,
        /requirements|specifications|architecture|design/gi,
        /bug|issue|feature|implementation|deploy/gi
      ],
      keywords: ['technical', 'api', 'code', 'server', 'database', 'implementation', 'architecture'],
      filenamePatterns: /tech|api|code|dev|implementation|spec/,
      fileTypes: ['text/plain', 'text/html', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      settings: {
        summaryStyle: 'bullet-points',
        summaryLength: 'medium',
        focusArea: 'technical'
      },
      confidence: 0
    },
    
    'proposal': {
      patterns: [
        /proposal|rfp|bid|budget|timeline|deliverables/gi,
        /scope of work|statement of work|sow|objectives/gi,
        /cost|pricing|payment|milestone|phase/gi,
        /vendor|client|stakeholder|requirement/gi
      ],
      keywords: ['proposal', 'rfp', 'budget', 'timeline', 'deliverables', 'scope', 'objectives'],
      filenamePatterns: /proposal|rfp|bid|sow/,
      fileTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      settings: {
        summaryStyle: 'executive',
        summaryLength: 'long',
        focusArea: 'business'
      },
      confidence: 0
    },
    
    'email': {
      patterns: [
        /from:|to:|subject:|cc:|bcc:/gi,
        /dear|hi|hello|regards|best|sincerely/gi,
        /forwarded message|original message|reply/gi,
        /@[\w.-]+\.[a-z]{2,}/gi // Email addresses
      ],
      keywords: ['email', 'message', 'correspondence', 'thread'],
      filenamePatterns: /email|message|correspondence/,
      fileTypes: ['text/plain', 'text/html'],
      settings: {
        summaryStyle: 'bullet-points',
        summaryLength: 'short',
        focusArea: 'action-items'
      },
      confidence: 0
    },
    
    'news': {
      patterns: [
        /breaking|developing|report|journalist|news|press/gi,
        /according to|sources|spokesperson|statement/gi,
        /dateline|byline|associated press|reuters/gi,
        /\w+day, \w+ \d{1,2}, \d{4}/gi // Date patterns
      ],
      keywords: ['news', 'report', 'journalist', 'breaking', 'sources', 'statement'],
      filenamePatterns: /news|article|press|journalist/,
      fileTypes: ['text/html', 'text/plain', 'application/pdf'],
      settings: {
        summaryStyle: 'paragraph',
        summaryLength: 'medium',
        focusArea: 'key-findings'
      },
      confidence: 0
    }
  };
  
  // Calculate confidence scores for each document type
  Object.keys(documentTypes).forEach(type => {
    const typeData = documentTypes[type];
    let score = 0;
    
    // Check pattern matches
    typeData.patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length * 2; // Weight pattern matches highly
      }
    });
    
    // Check keyword density
    typeData.keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
      }
    });
    
    // Check filename patterns
    if (filename && typeData.filenamePatterns.test(filename)) {
      score += 10; // Bonus for filename match
    }
    
    // NEW: Check file type compatibility
    if (mimeType && typeData.fileTypes.includes(mimeType)) {
      score += 5; // Bonus for matching file type
    }
    
    // Special boost for file type specific patterns
    if (mimeType === 'text/csv' && type === 'data-analysis') score += 15;
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && type === 'financial') score += 15;
    if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' && type === 'presentation') score += 15;
    if (mimeType === 'text/html' && type === 'web-content') score += 15;
    
    // Normalize score by text length (longer docs naturally have more matches)
    typeData.confidence = score / (textContent.length / 1000);
  });
  
  // Find the type with highest confidence
  const detectedType = Object.keys(documentTypes).reduce((a, b) => 
    documentTypes[a].confidence > documentTypes[b].confidence ? a : b
  );
  
  const confidence = documentTypes[detectedType].confidence;
  
  // Only return detection if confidence is above threshold
  if (confidence < 2) {
    return {
      detectedType: 'general',
      confidence: 0,
      suggestedSettings: {
        summaryStyle: 'paragraph',
        summaryLength: 'medium',
        focusArea: 'general'
      },
      allScores: Object.fromEntries(
        Object.entries(documentTypes).map(([type, data]) => [type, data.confidence])
      )
    };
  }
  
  return {
    detectedType,
    confidence,
    suggestedSettings: documentTypes[detectedType].settings,
    allScores: Object.fromEntries(
      Object.entries(documentTypes).map(([type, data]) => [type, data.confidence])
    )
  };
}

// ENHANCED TEMPLATE DESCRIPTIONS FOR FRONTEND
const documentTemplates = {
  'meeting': {
    name: 'Meeting Notes',
    description: 'Bullet points focusing on action items and decisions',
    icon: '👥',
    settings: { summaryStyle: 'bullet-points', summaryLength: 'medium', focusArea: 'action-items' }
  },
  'research': {
    name: 'Research Paper',
    description: 'Academic style with detailed findings and methodology',
    icon: '🔬',
    settings: { summaryStyle: 'academic', summaryLength: 'detailed', focusArea: 'key-findings' }
  },
  'contract': {
    name: 'Legal Contract',
    description: 'Executive summary focusing on business terms',
    icon: '📋',
    settings: { summaryStyle: 'executive', summaryLength: 'long', focusArea: 'business' }
  },
  'financial': {
    name: 'Financial Report',
    description: 'Executive summary with financial metrics and analysis',
    icon: '💰',
    settings: { summaryStyle: 'executive', summaryLength: 'medium', focusArea: 'business' }
  },
  'data-analysis': {
    name: 'Data Analysis',
    description: 'Bullet points highlighting key findings and trends',
    icon: '📈',
    settings: { summaryStyle: 'bullet-points', summaryLength: 'medium', focusArea: 'key-findings' }
  },
  'presentation': {
    name: 'Presentation',
    description: 'Bullet points capturing key slides and messages',
    icon: '📽️',
    settings: { summaryStyle: 'bullet-points', summaryLength: 'medium', focusArea: 'key-findings' }
  },
  'web-content': {
    name: 'Web Content',
    description: 'Paragraph format for web articles and pages',
    icon: '🌐',
    settings: { summaryStyle: 'paragraph', summaryLength: 'medium', focusArea: 'key-findings' }
  },
  'report': {
    name: 'Business Report',
    description: 'Executive summary with business implications',
    icon: '📊',
    settings: { summaryStyle: 'executive', summaryLength: 'medium', focusArea: 'business' }
  },
  'technical': {
    name: 'Technical Document',
    description: 'Bullet points highlighting technical details',
    icon: '⚙️',
    settings: { summaryStyle: 'bullet-points', summaryLength: 'medium', focusArea: 'technical' }
  },
  'proposal': {
    name: 'Project Proposal',
    description: 'Executive summary focusing on objectives and scope',
    icon: '💼',
    settings: { summaryStyle: 'executive', summaryLength: 'long', focusArea: 'business' }
  },
  'email': {
    name: 'Email Thread',
    description: 'Short bullet points with action items',
    icon: '📧',
    settings: { summaryStyle: 'bullet-points', summaryLength: 'short', focusArea: 'action-items' }
  },
  'news': {
    name: 'News Article',
    description: 'Paragraph format highlighting key findings',
    icon: '📰',
    settings: { summaryStyle: 'paragraph', summaryLength: 'medium', focusArea: 'key-findings' }
  },
  'general': {
    name: 'General Document',
    description: 'Balanced approach for mixed content',
    icon: '📄',
    settings: { summaryStyle: 'paragraph', summaryLength: 'medium', focusArea: 'general' }
  }
};

// ENHANCED FILE PROCESSING FUNCTION
async function processUploadedFile(fileBuffer, mimeType, fileName) {
  console.log('Processing file:', fileName, 'Type:', mimeType);
  
  let textContent = '';
  let metadata = {};
  
  try {
    if (mimeType === 'application/pdf') {
      const pdfData = await pdfParse(fileBuffer);
      textContent = pdfData.text;
      metadata = {
        pages: pdfData.numpages,
        info: pdfData.info || {}
      };
      
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const docxData = await mammoth.extractRawText({buffer: fileBuffer});
      textContent = docxData.value;
      metadata = {
        type: 'Word Document',
        messages: docxData.messages || []
      };
      
    } else if (mimeType === 'text/plain') {
      textContent = fileBuffer.toString('utf-8');
      metadata = {
        type: 'Plain Text',
        encoding: 'utf-8'
      };
      
    } else if (mimeType === 'text/csv' || mimeType === 'application/csv') {
      textContent = fileBuffer.toString('utf-8');
      const lines = textContent.split('\n');
      const headers = lines[0] ? lines[0].split(',') : [];
      metadata = {
        type: 'CSV Data',
        rows: lines.length - 1,
        columns: headers.length,
        headers: headers.slice(0, 10) // First 10 headers only
      };
      // Convert CSV to readable format for summarization
      textContent = `CSV Data Analysis:\nHeaders: ${headers.join(', ')}\nTotal Rows: ${lines.length - 1}\nSample Data:\n${lines.slice(0, 6).join('\n')}`;
      
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
               mimeType === 'application/vnd.ms-excel') {
      const XLSX = require('xlsx');
      const workbook = XLSX.read(fileBuffer, { cellStyles: true, cellFormulas: true });
      const sheetNames = workbook.SheetNames;
      
      let combinedText = `Excel Workbook Analysis:\nSheets: ${sheetNames.join(', ')}\n\n`;
      
      sheetNames.slice(0, 3).forEach(sheetName => { // Process first 3 sheets
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headers = jsonData[0] || [];
        
        combinedText += `Sheet: ${sheetName}\nHeaders: ${headers.join(', ')}\nRows: ${jsonData.length - 1}\n`;
        if (jsonData.length > 1) {
          combinedText += `Sample Data: ${JSON.stringify(jsonData.slice(1, 4))}\n\n`;
        }
      });
      
      textContent = combinedText;
      metadata = {
        type: 'Excel Workbook',
        sheets: sheetNames.length,
        sheetNames: sheetNames
      };
      
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
               mimeType === 'application/vnd.ms-powerpoint') {
      // For PowerPoint files, we'll extract text using a basic approach
      // Note: You might want to add a library like 'pptx2json' for better extraction
      textContent = `PowerPoint Presentation: ${fileName}\n\nNote: This appears to be a presentation file. The content extraction is limited, but the document has been identified as a presentation for optimal summarization settings.`;
      metadata = {
        type: 'PowerPoint Presentation',
        fileName: fileName
      };
      
    } else if (mimeType === 'text/html') {
      const cheerio = require('cheerio');
      const $ = cheerio.load(fileBuffer.toString('utf-8'));
      
      // Remove script and style elements
      $('script, style, nav, header, footer').remove();
      
      // Extract text content
      const title = $('title').text() || '';
      const headings = $('h1, h2, h3, h4, h5, h6').map((i, el) => $(el).text()).get();
      const paragraphs = $('p').map((i, el) => $(el).text()).get();
      
      textContent = `HTML Document: ${title}\n\nHeadings:\n${headings.join('\n')}\n\nContent:\n${paragraphs.join('\n\n')}`;
      metadata = {
        type: 'HTML Document',
        title: title,
        headings: headings.length,
        paragraphs: paragraphs.length
      };
      
    } else if (mimeType === 'application/rtf' || mimeType === 'text/rtf') {
      // Basic RTF processing - you may want to add rtf-parser library
      const rtfText = fileBuffer.toString('utf-8');
      // Simple RTF text extraction (removes most RTF codes)
      textContent = rtfText
        .replace(/\\[a-z]+\d*/g, '') // Remove RTF control words
        .replace(/[{}]/g, '') // Remove braces
        .replace(/\\/g, '') // Remove backslashes
        .trim();
      
      metadata = {
        type: 'RTF Document',
        originalSize: rtfText.length
      };
      
    } else {
      throw new Error(`Unsupported file type: ${mimeType}. Supported formats: TXT, PDF, DOCX, RTF, CSV, HTML, XLSX, PPTX`);
    }
    
    console.log(`Extracted text length: ${textContent.length}`);
    console.log('File metadata:', metadata);
    
    return {
      content: textContent,
      metadata: metadata
    };
    
  } catch (error) {
    console.error('File processing error:', error);
    throw new Error(`Failed to process ${fileName}: ${error.message}`);
  }
}

// ADD ENDPOINT TO GET AVAILABLE TEMPLATES
app.get('/api/document-templates', (req, res) => {
  res.json({
    success: true,
    templates: documentTemplates
  });
});

// ENHANCED DOCUMENT SUMMARIZER WITH NEW FILE SUPPORT
app.post('/api/summarize-document', upload.single('file'), async (req, res) => {
  try {
    let textContent = '';
    let fileProcessingResult = null;
    
    if (req.file) {
      try {
        fileProcessingResult = await processUploadedFile(
          req.file.buffer, 
          req.file.mimetype, 
          req.file.originalname
        );
        textContent = fileProcessingResult.content;
        console.log('Extracted text length:', textContent.length);
        console.log('File metadata:', fileProcessingResult.metadata);
      } catch (fileError) {
        throw new Error(`File processing failed: ${fileError.message}`);
      }
    } else {
      textContent = req.body.textContent || '';
      console.log('Using text input, length:', textContent.length);
    }

    const { summaryLength, summaryStyle, focusArea } = req.body;
    
    if (!textContent || !textContent.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text content is required. Please upload a file or enter text.' 
      });
    }

    const fileName = req.file ? req.file.originalname : '';
    const fileType = req.file ? req.file.mimetype : '';
    const detection = detectDocumentType(textContent, fileName, fileType);

    console.log('Document type detection:', {
      detectedType: detection.detectedType,
      confidence: detection.confidence.toFixed(2),
      suggestedSettings: detection.suggestedSettings,
      fileType: fileType
    });

    let finalSummaryLength = summaryLength;
    let finalSummaryStyle = summaryStyle;
    let finalFocusArea = focusArea;

    const isUsingDefaults = summaryLength === 'medium' && summaryStyle === 'bullet-points' && focusArea === 'general';
    if (detection.confidence > 5 && isUsingDefaults) {
      finalSummaryLength = detection.suggestedSettings.summaryLength;
      finalSummaryStyle = detection.suggestedSettings.summaryStyle;
      finalFocusArea = detection.suggestedSettings.focusArea;
      console.log('Auto-applied detected settings due to high confidence');
    }

    let finalSummary;
    const CHUNK_THRESHOLD = 15000;
    
    if (textContent.length <= CHUNK_THRESHOLD) {
      console.log(`Document is ${textContent.length} chars - using single-pass method`);
      finalSummary = await generateSinglePassSummary(textContent, finalSummaryLength, finalSummaryStyle, finalFocusArea);
    } else {
      console.log(`Document is ${textContent.length} chars - using smart chunking method`);
      finalSummary = await generateChunkedSummary(textContent, finalSummaryLength, finalSummaryStyle, finalFocusArea);
    }

    // Enhanced response with extracted key information
    let extractedInfo = null;
    if (finalFocusArea === 'key-information' || finalFocusArea === 'date-extraction') {
      extractedInfo = await extractKeyInformation(textContent, finalFocusArea);
    }

    return res.json({
      success: true,
      summary: finalSummary.summary,
      keyPoints: finalSummary.keyPoints || [],
      extractedInfo: extractedInfo, // New field for key information
      provider: finalSummary.provider,
      model: finalSummary.model,
      processingMethod: textContent.length <= CHUNK_THRESHOLD ? 'single-pass' : 'chunked',
      originalLength: textContent.length,
      chunksProcessed: finalSummary.chunksProcessed || 1,
      documentType: {
        detected: detection.detectedType,
        confidence: detection.confidence,
        suggestedSettings: detection.suggestedSettings,
        appliedAutomatically: detection.confidence > 5 && isUsingDefaults,
        template: documentTemplates[detection.detectedType]
      },
      fileMetadata: fileProcessingResult ? fileProcessingResult.metadata : null
    });
    
  } catch (error) {
    console.error('Document summarization error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

async function extractKeyInformation(textContent, focusArea) {
  try {
    let extractionPrompt = '';
    
    if (focusArea === 'key-information') {
      extractionPrompt = `Extract key information from this document and organize it into categories:

DOCUMENT:
${textContent}

Please extract and organize the following information:

Names: [List all person names, company names, organization names]
Dates: [List all dates, deadlines, time references] 
Numbers: [List important numbers, amounts, quantities, percentages]
Locations: [List places, addresses, geographical references]
Other Key Details: [List other important facts, references, or details]

Format as clear categories with bullet points under each.`;
    } else if (focusArea === 'date-extraction') {
      extractionPrompt = `Extract all date and time-related information from this document:

DOCUMENT:
${textContent}

Please extract and organize chronological information:

Past Dates: [Historical dates, completed events]
Current/Present: [Today's date references, current status]
Future Dates: [Upcoming deadlines, future events, scheduled dates]
Relative Time: [Next week, yesterday, soon, etc.]
Deadlines: [Important due dates and time-sensitive items]

Organize chronologically when possible and highlight urgent/upcoming items.`;
    }

    // Use Gemini Document API for extraction
    const geminiDocumentModel = genAIDocument.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await geminiDocumentModel.generateContent(extractionPrompt);
    const extractedText = result.response.text().trim();
    
    // Parse the extracted information into structured format
    const parsedInfo = parseExtractedInformation(extractedText, focusArea);
    
    return parsedInfo;
    
  } catch (error) {
    console.error('Key information extraction error:', error);
    return {
      error: 'Failed to extract key information',
      rawText: null
    };
  }
}

// Helper function to parse extracted information
function parseExtractedInformation(extractedText, focusArea) {
  const lines = extractedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const result = {
    type: focusArea,
    categories: {},
    rawText: extractedText
  };
  
  let currentCategory = null;
  
  lines.forEach(line => {
    // Check if line is a category header
    if (line.endsWith(':') && !line.startsWith('•') && !line.startsWith('-')) {
      currentCategory = line.replace(':', '').trim();
      result.categories[currentCategory] = [];
    } else if (currentCategory && (line.startsWith('•') || line.startsWith('-'))) {
      // Extract bullet point content
      const content = line.replace(/^[•\-]\s*/, '').trim();
      if (content.length > 0) {
        result.categories[currentCategory].push(content);
      }
    }
  });
  
  return result;
}

// SINGLE-PASS SUMMARY (existing method)
async function generateSinglePassSummary(textContent, summaryLength, summaryStyle, focusArea) {
  const enhancedPrompt = buildSummaryPrompt(textContent, summaryLength, summaryStyle, focusArea);
  
  try {
    console.log('Using Gemini Document API for single-pass summary');
    
    const systemMessage = buildSystemMessage(summaryStyle, focusArea);
    const geminiDocumentModel = genAIDocument.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const result = await geminiDocumentModel.generateContent(`${systemMessage}\n\n${enhancedPrompt}`);
    let summary = result.response.text().trim();
    
    // Post-process for bullet points
    if (summaryStyle === 'bullet-points') {
      summary = formatBulletPoints(summary);
    }
    
    return {
      summary,
      provider: 'Gemini Document API',
      model: 'gemini-2.0-flash'
    };
    
  } catch (geminiDocumentError) {
    console.log('Gemini Document API failed, trying OpenRouter:', geminiDocumentError.message);
    
    try {
      const systemMessage = buildSystemMessage(summaryStyle, focusArea);

      const completion = await openai.chat.completions.create({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });
      
      let summary = completion.choices[0].message.content.trim();
      
      if (summaryStyle === 'bullet-points') {
        summary = formatBulletPoints(summary);
      }

      return {
        summary,
        provider: 'OpenRouter',
        model: 'google/gemini-2.0-flash-exp:free'
      };
      
    } catch (openRouterError) {
      console.log('OpenRouter also failed:', openRouterError.message);
      throw new Error(`All summarization providers failed: Gemini(${geminiDocumentError.message}) | OpenRouter(${openRouterError.message})`);
    }
  }
}
// SMART CHUNKING SUMMARY (new method)
async function generateChunkedSummary(textContent, summaryLength, summaryStyle, focusArea) {
  try {
    // Step 1: Split content into logical chunks
    const chunks = smartChunkText(textContent);
    console.log(`Split document into ${chunks.length} chunks`);
    
    // Step 2: Generate mini-summaries for each chunk
    const chunkSummaries = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
      // CONTINUATION OF generateChunkedSummary function (add this after "const chunk")
const chunkPrompt = `Summarize this section of a larger document. Focus on key points and main ideas. Keep it concise but comprehensive:

${chunks[i]}

Summary:`;

      try {
        const geminiDocumentModel = genAIDocument.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await geminiDocumentModel.generateContent(chunkPrompt);
        chunkSummaries.push(result.response.text().trim());
      } catch (chunkError) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError);
        // Continue with other chunks
        chunkSummaries.push(`[Error processing section ${i + 1}]`);
      }
    }
    
    // Step 3: Combine chunk summaries into final summary
    const combinedText = chunkSummaries.join('\n\n');
    console.log('Generating final summary from chunk summaries');
    
    const finalPrompt = buildSummaryPrompt(combinedText, summaryLength, summaryStyle, focusArea, true);
    const systemMessage = buildSystemMessage(summaryStyle);
    
    const geminiDocumentModel = genAIDocument.getGenerativeModel({ model: "gemini-2.0-flash" });
    const finalResult = await geminiDocumentModel.generateContent(`${systemMessage}\n\n${finalPrompt}`);
    
    let finalSummary = finalResult.response.text().trim();
    
    // Post-process for bullet points
    if (summaryStyle === 'bullet-points') {
      finalSummary = formatBulletPoints(finalSummary);
    }
    
    return {
      summary: finalSummary,
      provider: 'Gemini Document API (Chunked)',
      model: 'gemini-2.0-flash',
      chunksProcessed: chunks.length
    };
    
  } catch (error) {
    console.error('Chunked summarization failed:', error);
    throw error;
  }
}

// SMART TEXT CHUNKING
function smartChunkText(text, maxChunkSize = 12000) {
  const chunks = [];
  
  // Try to split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph exceeds chunk size
    if (currentChunk.length + paragraph.length > maxChunkSize) {
      if (currentChunk.length > 0) {
        // Save current chunk
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        // Paragraph itself is too long, split by sentences
        const sentences = splitBySentences(paragraph);
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChunkSize) {
            if (currentChunk.length > 0) {
              chunks.push(currentChunk.trim());
              currentChunk = sentence;
            } else {
              // Sentence itself is too long, force split
              chunks.push(sentence.substring(0, maxChunkSize));
              currentChunk = sentence.substring(maxChunkSize);
            }
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// SENTENCE SPLITTING HELPER
function splitBySentences(text) {
  // Split by sentence endings, but be careful with abbreviations
  return text.match(/[^\.!?]+[\.!?]+/g) || [text];
}

// BUILD SUMMARY PROMPT HELPER
function buildSummaryPrompt(textContent, summaryLength, summaryStyle, focusArea, isFromChunks = false) {
  const lengthInstructions = {
    'short': 'in 2-3 concise sentences',
    'medium': 'in 1-2 paragraphs',
    'long': 'in 3-4 detailed paragraphs', 
    'detailed': 'with comprehensive analysis and details'
  };

  const focusInstructions = {
    'general': 'Cover all main topics and themes',
    'key-findings': 'Focus on the most important discoveries and conclusions',
    'action-items': 'Emphasize actionable tasks, next steps, and responsibilities',
    'key-information': 'Extract and highlight all important names, dates, numbers, locations, and key details. Format as: Names: [list], Dates: [list], Important Details: [list]',
    'date-extraction': 'Focus specifically on all dates, deadlines, timelines, and chronological information. Include past dates, upcoming deadlines, and time-sensitive items',
    'technical': 'Highlight technical details and specifications',
    'business': 'Focus on business implications and impact'
  };

  const contentLabel = isFromChunks ? 'Pre-processed content summaries' : 'Document content';
  
  return `Summarize the following ${contentLabel.toLowerCase()} ${lengthInstructions[summaryLength]}.
Focus: ${focusInstructions[focusArea]}.

${contentLabel}:
${textContent}`;
}

// Enhanced system message for key information extraction
function buildSystemMessage(summaryStyle, focusArea) {
  let baseMessage = '';
  
  if (summaryStyle === 'bullet-points') {
    baseMessage = `You are a document summarizer. When asked for bullet points, you MUST format each point on a separate line starting with • symbol.

CRITICAL RULES:
- Each bullet point on its own line
- Start each line with • symbol  
- No paragraph text allowed
- Use line breaks between points
- Maximum 8 points

CORRECT FORMAT:
• Point one here
• Point two here
• Point three here`;
  } else {
    baseMessage = "You are an expert document analyzer. Follow formatting instructions exactly.";
  }

  // Add specific instructions for key information extraction
  if (focusArea === 'key-information') {
    baseMessage += `

ADDITIONAL REQUIREMENTS FOR KEY INFORMATION EXTRACTION:
- Always include a "Key Information" section
- Extract all person names, company names, locations
- Extract all dates, deadlines, time references
- Extract all important numbers, amounts, quantities
- Format as clear categories: Names, Dates, Numbers, Locations, Other Details`;
  }
  
  if (focusArea === 'date-extraction') {
    baseMessage += `

ADDITIONAL REQUIREMENTS FOR DATE EXTRACTION:
- Identify ALL dates mentioned in the document
- Include relative dates (yesterday, next week, etc.)
- Note deadlines and time-sensitive information
- Organize chronologically when possible
- Highlight upcoming vs past dates`;
  }

  return baseMessage;
}


// FORMAT BULLET POINTS HELPER
function formatBulletPoints(summary) {
  if (!summary.includes('•') || !summary.match(/^•/m)) {
    console.log('Converting response to proper bullet point format');
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 8).map(sentence => `• ${sentence.trim()}.`).join('\n');
  } else {
    return summary
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        if (!line.startsWith('•') && !line.startsWith('-')) {
          return `• ${line}`;
        }
        if (line.startsWith('-')) {
          return line.replace(/^-\s*/, '• ');
        }
        return line;
      })
      .join('\n');
  }
}

// Add these endpoints to your server.js file

// Data Analysis endpoint - processes uploaded files
app.post('/api/analyze-data', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    console.log('Processing data file:', req.file.originalname);
    
    let rawData = [];
    let fileData = [];
    
    // Process different file types
    if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
      // Process CSV
      const csvText = req.file.buffer.toString('utf-8');
      const parseResult = Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });
      
      if (parseResult.errors.length > 0) {
        console.log('CSV parse warnings:', parseResult.errors);
      }
      
      fileData = parseResult.data.filter(row => 
        Object.values(row).some(value => value !== null && value !== '')
      );
      
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
               req.file.mimetype === 'application/vnd.ms-excel') {
      // Process Excel
      const workbook = XLSX.read(req.file.buffer, { cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON with header row
      rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawData.length < 2) {
        throw new Error('Excel file appears to be empty or has no data rows');
      }
      
      // Convert to object format with headers
      const headers = rawData[0].map(header => String(header).trim());
      fileData = rawData.slice(1).map(row => {
        const rowObj = {};
        headers.forEach((header, index) => {
          rowObj[header] = row[index] !== undefined ? row[index] : null;
        });
        return rowObj;
      }).filter(row => 
        Object.values(row).some(value => value !== null && value !== '')
      );
      
    } else {
      throw new Error('Unsupported file format. Please upload CSV or Excel files.');
    }

    if (fileData.length === 0) {
      throw new Error('No data found in the uploaded file');
    }

    console.log(`Processed ${fileData.length} rows with ${Object.keys(fileData[0]).length} columns`);

    // Generate basic analysis
    const analysis = await generateDataAnalysis(fileData, req.file.originalname);
    
    // Generate initial insights
    const insights = await generateInitialInsights(fileData, req.file.originalname);

    res.json({
      success: true,
      fileData: fileData,
      analysis: analysis,
      insights: insights
    });

  } catch (error) {
    console.error('Data analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Natural Language Query endpoint
app.post('/api/query-data', async (req, res) => {
  try {
    const { query, data, fileName } = req.body;
    
    if (!query || !data) {
      return res.status(400).json({
        success: false,
        error: 'Query and data are required'
      });
    }

    console.log('Processing natural language query:', query);
    
    // Prepare data summary for AI context
    const dataContext = prepareDataContext(data, fileName);
    
    const prompt = `You are a data analyst AI with access to a complete dataset. Analyze and answer the user's question.

    Dataset Context:
    ${dataContext}

    IMPORTANT: You have access to the complete dataset of ${data.length} rows. When performing calculations:
    - Use the full dataset, not just the sample shown
    - For aggregations like "average price by brand", calculate across ALL products
    - Provide specific numbers and counts
    - Show your calculations when possible

    Sample Data (showing structure only):
    ${JSON.stringify(data.slice(0, 3), null, 2)}

    User Question: "${query}"


Instructions:
- Provide specific, actionable answers based on the actual data
- Include relevant numbers, trends, and insights
- Answer with specific calculations and insights based on the FULL dataset of ${data.length} rows.
- If the question requires calculations, perform them accurately
- Format your response clearly and concisely
- If the question cannot be answered with the provided data, explain what additional information would be needed

Answer:`;

    // Try Gemini first for data analysis
    try {
      const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await geminiModel.generateContent(prompt);
      const response = result.response.text().trim();
      
      console.log('Query processed successfully with Gemini');
      
      return res.json({
        success: true,
        result: response,
        provider: 'Gemini'
      });
      
    } catch (geminiError) {
      console.log('Gemini failed, trying OpenRouter:', geminiError.message);
      
      // Fallback to OpenRouter
      try {
        const completion = await openai.chat.completions.create({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [
            {
              role: "system",
              content: "You are an expert data analyst. Provide accurate, specific answers based on the provided dataset."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        });
        
        const response = completion.choices[0].message.content.trim();
        console.log('Query processed successfully with OpenRouter fallback');
        
        return res.json({
          success: true,
          result: response,
          provider: 'OpenRouter',
          fallback: true
        });
        
      } catch (openRouterError) {
        throw new Error(`All query providers failed: Gemini(${geminiError.message}) | OpenRouter(${openRouterError.message})`);
      }
    }

  } catch (error) {
    console.error('Query processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate AI Insights endpoint
app.post('/api/generate-insights', async (req, res) => {
  try {
    const { data, fileName, columns } = req.body;
    
    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Data is required'
      });
    }

    console.log('Generating AI insights for dataset');
    
    // Prepare focused data context
    const relevantColumns = columns && columns.length > 0 ? columns : Object.keys(data[0]);
    const focusedData = data.slice(0, 100).map(row => {
      const focusedRow = {};
      relevantColumns.forEach(col => {
        focusedRow[col] = row[col];
      });
      return focusedRow;
    });

    const dataStats = generateDataStatistics(data, relevantColumns);
    
    const prompt = `Analyze this dataset and provide actionable business insights.

Dataset: ${fileName || 'Uploaded Data'}
Total Rows: ${data.length}
Columns: ${relevantColumns.join(', ')}

Statistical Summary:
${dataStats}

Sample Data:
${JSON.stringify(focusedData.slice(0, 5), null, 2)}

Generate 5-8 specific, actionable insights including:
1. Key trends and patterns
2. Notable outliers or anomalies  
3. Business recommendations
4. Data quality observations
5. Potential areas for further analysis

Format each insight as a clear, concise bullet point. Focus on practical business value.`;

    // Try Gemini first
    try {
      const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await geminiModel.generateContent(prompt);
      const response = result.response.text().trim();
      
      // Parse insights into array
      const insights = parseInsightsResponse(response);
      
      console.log('Generated', insights.length, 'insights with Gemini');
      
      return res.json({
        success: true,
        insights: insights,
        provider: 'Gemini'
      });
      
    } catch (geminiError) {
      console.log('Gemini failed, trying OpenRouter:', geminiError.message);
      
      // Fallback to OpenRouter
      try {
        const completion = await openai.chat.completions.create({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [
            {
              role: "system",
              content: "You are a senior data analyst. Generate specific, actionable business insights from datasets."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        });
        
        const response = completion.choices[0].message.content.trim();
        const insights = parseInsightsResponse(response);
        
        console.log('Generated', insights.length, 'insights with OpenRouter fallback');
        
        return res.json({
          success: true,
          insights: insights,
          provider: 'OpenRouter',
          fallback: true
        });
        
      } catch (openRouterError) {
        throw new Error(`All insight providers failed: Gemini(${geminiError.message}) | OpenRouter(${openRouterError.message})`);
      }
    }

  } catch (error) {
    console.error('Insight generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper Functions

async function generateDataAnalysis(data, fileName) {
  try {
    const analysis = {
      fileName: fileName,
      totalRows: data.length,
      totalColumns: Object.keys(data[0] || {}).length,
      columns: Object.keys(data[0] || {}),
      dataTypes: {},
      missingValues: {},
      summary: {}
    };

    // Analyze each column
    analysis.columns.forEach(column => {
      const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined && val !== '');
      const nonNullValues = values.length;
      const missingCount = data.length - nonNullValues;
      
      analysis.missingValues[column] = {
        count: missingCount,
        percentage: ((missingCount / data.length) * 100).toFixed(1)
      };
      
      // Determine data type
      if (values.length > 0) {
        const sampleValue = values[0];
        if (typeof sampleValue === 'number' && !isNaN(sampleValue)) {
          analysis.dataTypes[column] = 'numeric';
          
          // Calculate numeric statistics
          const numericValues = values.filter(val => typeof val === 'number' && !isNaN(val));
          if (numericValues.length > 0) {
            analysis.summary[column] = {
              min: Math.min(...numericValues),
              max: Math.max(...numericValues),
              mean: (numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length).toFixed(2),
              count: numericValues.length
            };
          }
        } else if (sampleValue instanceof Date || (typeof sampleValue === 'string' && !isNaN(Date.parse(sampleValue)))) {
          analysis.dataTypes[column] = 'date';
        } else {
          analysis.dataTypes[column] = 'text';
          
          // Calculate text statistics
          const uniqueValues = [...new Set(values)];
          analysis.summary[column] = {
            uniqueCount: uniqueValues.length,
            mostCommon: getMostCommonValue(values),
            count: values.length
          };
        }
      }
    });

    return analysis;
  } catch (error) {
    console.error('Error generating data analysis:', error);
    return {
      error: 'Failed to analyze data structure',
      totalRows: data.length,
      totalColumns: Object.keys(data[0] || {}).length
    };
  }
}

async function generateInitialInsights(data, fileName) {
  try {
    // Generate basic insights without AI for speed
    const insights = [];
    const columns = Object.keys(data[0] || {});
    
    // Data size insight
    if (data.length > 10000) {
      insights.push(`Large dataset with ${data.length.toLocaleString()} rows - suitable for statistical analysis`);
    } else if (data.length < 100) {
      insights.push(`Small dataset with ${data.length} rows - consider collecting more data for robust analysis`);
    }
    
    // Column count insight
    if (columns.length > 20) {
      insights.push(`Rich dataset with ${columns.length} variables - consider dimensionality reduction techniques`);
    }
    
    // Look for potential issues
    columns.forEach(column => {
      const values = data.map(row => row[column]);
      const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');
      const completeness = (nonNullValues.length / values.length) * 100;
      
      if (completeness < 80) {
        insights.push(`Column '${column}' has ${(100 - completeness).toFixed(1)}% missing data - may need data cleaning`);
      }
    });
    
    return insights;
    
  } catch (error) {
    console.error('Error generating initial insights:', error);
    return ['Data uploaded successfully - ready for analysis'];
  }
}

function prepareDataContext(data, fileName) {
  const columns = Object.keys(data[0] || {});
  const sampleData = data.slice(0, 3);
  
  return `File: ${fileName || 'Dataset'}
Rows: ${data.length}
Columns: ${columns.join(', ')}

Data Types:
${columns.map(col => {
  const sampleValue = data[0][col];
  const type = typeof sampleValue === 'number' ? 'numeric' : 
               sampleValue instanceof Date ? 'date' : 'text';
  return `- ${col}: ${type}`;
}).join('\n')}`;
}

function generateDataStatistics(data, columns) {
  const stats = [];
  
  columns.forEach(column => {
    const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined && val !== '');
    
    if (values.length === 0) return;
    
    const firstValue = values[0];
    if (typeof firstValue === 'number' && !isNaN(firstValue)) {
      const numericValues = values.filter(val => typeof val === 'number' && !isNaN(val));
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const mean = (numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length).toFixed(2);
      
      stats.push(`${column}: min=${min}, max=${max}, mean=${mean}, count=${numericValues.length}`);
    } else {
      const unique = [...new Set(values)];
      stats.push(`${column}: ${unique.length} unique values, ${values.length} total`);
    }
  });
  
  return stats.join('\n');
}

function parseInsightsResponse(response) {
  // Split response into individual insights
  const lines = response.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => line.includes('.') || line.includes(':') || line.length > 20);
  
  const insights = [];
  
  lines.forEach(line => {
    // Remove bullet points, numbers, and formatting
    let cleanLine = line
      .replace(/^[\d\.\)\-\*\•]\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/^[\-\*\•]\s*/, '')
      .trim();
    
    if (cleanLine.length > 15 && !cleanLine.toLowerCase().includes('insight')) {
      insights.push(cleanLine);
    }
  });
  
  return insights.slice(0, 8); // Limit to 8 insights
}

function getMostCommonValue(values) {
  const frequency = {};
  values.forEach(val => {
    frequency[val] = (frequency[val] || 0) + 1;
  });
  
  return Object.keys(frequency).reduce((a, b) => 
    frequency[a] > frequency[b] ? a : b
  );
}

// REQUIRED DEPENDENCIES - Add these to your package.json
// npm install pdf-parse mammoth xlsx cheerio papaparse multer
  function buildAutomationPrompt(description, automationType, complexity) {
    const automationTypes = {
      'workflow': 'Create a detailed step-by-step workflow process with clear stages and decision points',
      'script': 'Generate executable automation scripts with code examples (Python, Bash, or PowerShell)',
      'integration': 'Design API integration workflows with authentication and data handling',
      'schedule': 'Create time-based automation with scheduling and monitoring',
      'event': 'Build event-driven automation with triggers and responses',
      'data': 'Create data processing and transformation automation pipelines'
    };

    const complexityLevels = {
      'simple': 'Basic automation with essential steps, minimal error handling, easy to understand',
      'standard': 'Comprehensive automation with error handling, logging, and best practices',
      'advanced': 'Production-ready automation with monitoring, rollback procedures, and enterprise features'
    };

    return `Create ${automationType} automation for: ${description}

  Automation Type: ${automationTypes[automationType] || 'General automation workflow'}
  Complexity Level: ${complexityLevels[complexity] || 'Standard implementation'}

  Requirements:
  - Provide clear, actionable steps that can be implemented
  - Include necessary tools, prerequisites, and dependencies
  - Consider error handling and edge cases appropriate to complexity level
  - Make it practical and implementable by someone with basic technical knowledge
  - Include configuration examples where relevant
  - Suggest monitoring and maintenance approaches

  Format the response with:
  1. Overview and prerequisites
  2. Step-by-step implementation
  3. Code examples (if applicable)
  4. Testing and validation steps
  5. Maintenance and monitoring recommendations

  Generate the complete automation guide now:`;
  }

function buildPrompt(userPrompt, language, codeType, complexity = 'standard') {
  const languageSpecs = {
    'javascript': 'Use modern ES6+ syntax, async/await when needed',
    'python': 'Follow PEP 8 guidelines, use type hints when appropriate',
    'react': 'Use functional components with hooks, modern React patterns',
    'java': 'Use proper OOP principles, include proper imports',
    'cpp': 'Use modern C++ features, proper memory management',
    'html': 'Include semantic HTML and CSS styling',
    'rust': 'Use idiomatic Rust patterns, proper ownership and borrowing',
    'go': 'Follow Go conventions, use proper error handling',
    'swift': 'Use modern Swift syntax and best practices',
    'php': 'Follow PSR standards, use modern PHP features',
    'kotlin': 'Use Kotlin idioms and null safety features',
    'dart': 'Follow Dart style guide, use modern Dart features'
  };

  const languageSpec = languageSpecs[language] || `Follow best practices for ${language}`;

  const getComplexityInstruction = (complexity) => {
    const complexityInstructions = {
      'simple': `
        - Keep code clear and focused on core functionality
        - Use descriptive variable names for readability
        - Include brief comments explaining key steps
        - No error handling unless absolutely essential
        - Prioritize clarity over brevity
        - Basic implementation without extra features
        - Single purpose, straightforward approach`,
      
      'standard': `
        - Include reasonable documentation and comments
        - Add basic error handling where appropriate
        - Follow standard coding practices for the language
        - Include a moderate level of detail
        - Add a few usage examples
        - Use descriptive variable names
        - Balanced approach between simplicity and completeness`,
      
      'comprehensive': `
        - Full documentation with detailed docstrings/comments
        - Comprehensive error handling and input validation
        - Multiple test cases and usage examples
        - Performance considerations and analysis where relevant
        - Follow all best practices and coding conventions
        - Include type hints, imports, and complete project structure
        - Production-ready code with edge case handling
        - Detailed explanations for complex logic`
    };
    
    return complexityInstructions[complexity] || complexityInstructions['standard'];
  };

  const getTypeInstruction = (codeType, language, complexity) => {
    const instructions = {
      'function': {
        'simple': 'Create a single, working function with minimal code',
        'standard': 'Create a complete function with basic documentation and a usage example',
        'comprehensive': 'Create a complete program with the function, extensive documentation, multiple test cases, and error handling'
      },
      'class': {
        'simple': 'Create a basic class with essential methods only',
        'standard': 'Create a complete class with constructor, methods, and basic usage example',
        'comprehensive': 'Create a complete class with full documentation, constructor, methods, properties, inheritance examples, and comprehensive usage'
      },
      'component': {
        'simple': 'Create a basic component with minimal functionality',
        'standard': 'Create a functional component with props, basic state, and styling',
        'comprehensive': 'Create a complete component with props, state management, event handlers, styling, and extensive documentation'
      },
      'algorithm': {
        'simple': 'Implement the algorithm with basic logic and minimal code',
        'standard': 'Implement the algorithm with explanation, basic test cases, and time complexity analysis',
        'comprehensive': 'Implement the algorithm with step-by-step explanation, multiple test cases, complexity analysis, edge cases, and optimization notes'
      },
      'api': {
        'simple': 'Create basic API endpoints with minimal functionality',
        'standard': 'Create API endpoints with proper routing, basic error handling, and example usage',
        'comprehensive': 'Create complete API with routes, middleware, authentication, error handling, validation, and comprehensive documentation'
      },
      'utility': {
        'simple': 'Create simple utility functions for basic reuse',
        'standard': 'Create well-documented utility functions with type hints and basic examples',
        'comprehensive': 'Create comprehensive utility module with full documentation, type safety, error handling, and extensive examples'
      }
    };

    const baseInstruction = instructions[codeType]?.[complexity] || 
                           `Create a ${complexity} ${codeType} implementation`;

    const languageAdjustments = {
      'python': {
        'simple': 'Use basic Python syntax, minimal imports',
        'standard': 'Include if __name__ == "__main__": block for executable code',
        'comprehensive': 'Include docstrings, type hints, proper imports, and comprehensive main block'
      },
      'javascript': {
        'simple': 'Use basic JS syntax, minimal setup',
        'standard': 'Include proper function declarations and basic examples',
        'comprehensive': 'Include modern ES6+ features, proper error handling, and multiple examples'
      },
      'react': {
        'simple': 'Create basic functional component with minimal JSX',
        'standard': 'Include hooks, props, and basic styling',
        'comprehensive': 'Include hooks, props, state management, event handlers, and complete styling'
      },
      'java': {
        'simple': 'Basic class structure with minimal methods',
        'standard': 'Complete class with constructor and main method for testing',
        'comprehensive': 'Full Java program with proper OOP, imports, documentation, and comprehensive main method'
      },
      'cpp': {
        'simple': 'Basic C++ code with minimal includes',
        'standard': 'Include proper headers, namespace usage, and main function',
        'comprehensive': 'Full C++ program with proper headers, namespace, classes, memory management, and comprehensive main'
      },
      'html': {
        'simple': 'Basic HTML structure with minimal styling',
        'standard': 'Complete HTML page with CSS styling and basic JavaScript',
        'comprehensive': 'Full web page with semantic HTML, comprehensive CSS, JavaScript functionality, and responsive design'
      }
    };

    const langAdjustment = languageAdjustments[language]?.[complexity] || '';

    return `${baseInstruction}. ${langAdjustment}`;
  };

  const complexityInstruction = getComplexityInstruction(complexity);
  const typeInstruction = getTypeInstruction(codeType, language, complexity);

  return `Write clean ${language} code for: ${userPrompt}

Code Type: ${codeType}
Complexity Level: ${complexity}
Language: ${language}

Requirements:
- ${languageSpec}
- ${typeInstruction}
${complexityInstruction}

Important Guidelines:
- Only return the code, no explanations before or after
- Ensure the code matches the requested complexity level exactly
- For ${complexity} complexity: ${getComplexityGuideline(complexity)}

Generate the code now:`;
}

function getComplexityGuideline(complexity) {
  const guidelines = {
    'simple': 'Keep it minimal, direct, and under 15 lines when possible',
    'standard': 'Balance functionality with readability, moderate documentation',
    'comprehensive': 'Include full documentation, error handling, and production-ready features'
  };
  return guidelines[complexity] || guidelines['standard'];
}

// Define PORT properly
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('- POST /api/generate-code (OpenRouter + Gemini + Groq fallback)');
  console.log('- POST /api/generate-image (Pollinations AI)');
  console.log('- POST /api/generate-image-sd (Stable Diffusion + Pollinations fallback)');
  console.log('- POST /api/generate-image-gemini (Gemini Image + SD + Pollinations fallback)');
  console.log('- POST /api/generate-automation (Kimi K2 + GPT-OSS-120B + Gemini fallback)');
  console.log('- POST /api/chat (Gemini 2.5 Flash + Kimi K2 + GPT-OSS-120B fallback)');
  console.log('- GET /api/colab-status (Stable Diffusion health check)');
});