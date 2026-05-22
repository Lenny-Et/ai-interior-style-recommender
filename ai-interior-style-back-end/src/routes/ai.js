import * as fsp from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import axios from 'axios';
import path from 'path';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { PortfolioItem } from '../models/PortfolioItem.js';
import { User } from '../models/User.js';
import { Board } from '../models/Board.js';
import { sendNotification } from '../services/notificationService.js';

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});



// Defer env check so dotenv/.env.local has time to inject variables
setTimeout(() => {
  console.log('Environment check:', {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET',
    CHAPA_SECRET_KEY: process.env.CHAPA_SECRET_KEY ? 'SET' : 'NOT SET',
    HF_INFERENCE_API_BASE_URL: process.env.HF_INFERENCE_API_BASE_URL ? 'SET' : 'NOT SET',
    HF_ACCESS_TOKEN: process.env.HF_ACCESS_TOKEN ? 'SET' : 'NOT SET',
    USE_GEMINI: process.env.USE_GEMINI ? 'SET' : 'NOT SET',
  });
}, 0);

// Use sendNotification directly from the notification service

// ===== AI RECOMMENDATIONS =====

// Upload image for AI analysis
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    // Use mock userId for now since we removed authentication from upload endpoint
    const userId = '507f1f77bcf86cd799439011';

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageFile = req.file;

    // Validate file type (multer already handles size limits)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' });
    }

    // Return the server-accessible URL (multer saves the file with timestamp)
    const imageUrl = `http://localhost:5000/uploads/${imageFile.filename}`;

    console.log(`Image uploaded for AI analysis: ${imageFile.filename} (${imageFile.size} bytes)`);

    res.json({
      success: true,
      imageUrl,
      filename: imageFile.filename,
      size: imageFile.size,
      mimetype: imageFile.mimetype
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Generate AI recommendations for uploaded image
router.post('/recommend', authenticateToken, async (req, res) => {
  try {
    // Strict security: ALWAYS use the authenticated user's ID from the JWT token.
    const userId = req.user.userId;
    const {
      imageUrl,
      roomType = 'Living Room',
      styles = [],
      budget = '$1,000-$2,500',
      creativity = 0.7,
      usePersonalization = false
    } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Retrieve environment variables here, where process.env is guaranteed to be populated
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const useGeminiFlag = process.env.USE_GEMINI === 'true';
    const hfInferenceApiBaseUrl = process.env.HF_INFERENCE_API_BASE_URL;
    const hfAccessToken = process.env.HF_ACCESS_TOKEN;

    // Use Gemini API to analyze image and generate recommendations
    const features = await analyzeImageWithGemini(imageUrl, styles, roomType, budget, geminiApiKey, useGeminiFlag);

    // Search for similar designs in our database
    const similarDesigns = await searchSimilarDesigns(features, styles, roomType);

    // Fetch user's styleboard context if personalization is enabled
    let historicalContext = null;
    if (usePersonalization === true) {
      historicalContext = await getUserBoardContext(userId);
      console.log(`Personalization enabled. Historical context: ${historicalContext || 'None found'}`);
    }

    // Generate recommendations using Gemini API
    const recommendations = await generateDesignRecommendationsWithGemini(
      features,
      styles,
      roomType,
      budget,
      creativity,
      similarDesigns,
      imageUrl, // Pass the original image URL
      geminiApiKey,
      useGeminiFlag,
      hfInferenceApiBaseUrl,
      hfAccessToken,
      historicalContext // Pass the historical context to the prompt
    );

    // Save recommendations to user profile
    const sessionId = await saveUserRecommendations(userId, recommendations, imageUrl, {
      roomType,
      styles,
      budget,
      creativity,
      generatedAt: new Date()
    }, similarDesigns);

    // Send notification when ready
    await sendNotification(userId, {
      title: 'AI Recommendations Ready',
      message: 'Your personalized design recommendations are ready to view!',
      type: 'ai_ready'
    });

    res.json({
      recommendations,
      similarDesigns,
      sessionId,
      metadata: {
        roomType,
        styles,
        budget,
        creativity,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('AI recommendation error:', error);

    // Check specific error types
    const isRateLimit = error.response?.status === 429;
    const isQuotaExceeded = error.response?.data?.error?.message?.toLowerCase().includes('quota') ||
      error.response?.data?.error?.message?.toLowerCase().includes('limit') ||
      error.response?.data?.error?.code === 'QUOTA_EXCEEDED';
    const isAIFailure = error.message?.includes('Gemini') ||
      error.message?.includes('AI service') ||
      error.code === 'ECONNREFUSED';

    if (isRateLimit || isQuotaExceeded) {
      // Specific API limit/quota exceeded handling
      console.log('API quota/limit exceeded, using curated design templates');

      const isQuotaError = isQuotaExceeded ||
        error.response?.data?.error?.message?.toLowerCase().includes('quota');

      // Send specific notification about API limits
      await sendNotification(userId, {
        title: isQuotaError ? 'AI Quota Exceeded' : 'AI Rate Limited',
        message: isQuotaError
          ? 'Our AI service quota has been reached. We\'re using professional design templates while the quota resets.'
          : 'Our AI service is temporarily rate limited. We\'ve provided curated design templates for immediate results.',
        type: 'ai_limit_exceeded',
        metadata: {
          limitType: isQuotaError ? 'quota' : 'rate_limit',
          fallbackUsed: true,
          originalError: error.message,
          retryAfter: error.response?.headers?.['retry-after'] || 'unknown'
        }
      });

      // Return fallback recommendations with limit information
      const fallbackRecommendations = generateCuratedDesignTemplates(styles, roomType, budget);

      res.json({
        recommendations: fallbackRecommendations,
        similarDesigns: [],
        metadata: {
          roomType,
          styles,
          budget,
          creativity: 0.7,
          generatedAt: new Date(),
          fallbackUsed: true,
          fallbackReason: isQuotaError ? 'AI quota exceeded' : 'AI rate limit exceeded',
          limitType: isQuotaError ? 'quota' : 'rate_limit',
          retryAfter: error.response?.headers?.['retry-after']
        }
      });

    } else if (isAIFailure) {
      // General AI service failure
      console.log('AI service unavailable, using curated design templates');

      await sendNotification(userId, {
        title: 'AI Service Unavailable',
        message: 'Our AI service is temporarily unavailable. We\'ve provided you with curated design templates instead.',
        type: 'ai_fallback',
        metadata: {
          fallbackUsed: true,
          originalError: error.message
        }
      });

      const fallbackRecommendations = generateCuratedDesignTemplates(styles, roomType, budget);

      res.json({
        recommendations: fallbackRecommendations,
        similarDesigns: [],
        metadata: {
          roomType,
          styles,
          budget,
          creativity: 0.7,
          generatedAt: new Date(),
          fallbackUsed: true,
          fallbackReason: 'AI service unavailable'
        }
      });
    } else {
      // Regular error
      res.status(500).json({
        error: 'Failed to generate AI recommendations',
        details: error.message
      });
    }
  }
});

// Get user's AI recommendations history
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const { AIRecommendation } = await import('../models/AIRecommendation.js');
    const normalizedUserId = userId.toString();

    const recommendations = await AIRecommendation.find({ userId: normalizedUserId, status: 'active' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await AIRecommendation.countDocuments({ userId: normalizedUserId, status: 'active' });

    res.json({
      recommendations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Modify AI design recommendations
router.post('/modify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      recommendationId,
      modifications,
      creativity = 0.7
    } = req.body;

    if (!recommendationId || !modifications) {
      return res.status(400).json({ error: 'Recommendation ID and modifications are required' });
    }

    // Get original recommendation
    const originalRecommendation = await getRecommendationById(recommendationId, userId);
    if (!originalRecommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    // Apply modifications using AI service
    const modifiedRecommendations = await applyDesignModifications(
      originalRecommendation,
      modifications,
      creativity
    );

    // Save modified recommendations
    await saveModifiedRecommendations(userId, modifiedRecommendations);

    res.json({
      modifiedRecommendations,
      originalRecommendationId: recommendationId,
      modifications,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Modify recommendations error:', error);
    res.status(500).json({ error: 'Failed to modify recommendations' });
  }
});

// Save AI recommendation to user profile
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recommendationId, name, notes } = req.body;

    if (!recommendationId) {
      return res.status(400).json({ error: 'Recommendation ID is required' });
    }

    // Save to user's saved recommendations
    await saveRecommendationToProfile(userId, recommendationId, name, notes);

    res.json({ message: 'Recommendation saved successfully' });
  } catch (error) {
    console.error('Save recommendation error:', error);
    res.status(500).json({ error: 'Failed to save recommendation' });
  }
});

// Get AI style analysis for an image
router.post('/analyze-style', authenticateToken, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Extract features from image
    const featuresResponse = await axios.post(`${AI_SERVICE_URL}/extract-features`, {
      image: imageUrl
    });

    // Analyze style using AI service
    const styleAnalysis = await analyzeImageStyle(featuresResponse.data.features);

    res.json({
      styleAnalysis,
      features: featuresResponse.data.features,
      analyzedAt: new Date()
    });
  } catch (error) {
    console.error('Style analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze image style' });
  }
});

// ===== HELPER FUNCTIONS =====

const GEMINI_MODEL = 'gemini-2.5-flash';
// black-forest-labs/FLUX.1-schnell: the modern, state-of-the-art fast text-to-image model supported on HF Serverless API.
const HF_MODEL_ID = 'black-forest-labs/FLUX.1-schnell';

// Helper to get image as base64
async function getImageBase64(imageUrl) {
  try {
    // If the image is already a data URL, return it directly
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // If it's a local file, read it
    if (imageUrl.startsWith('http://localhost:5000/uploads/')) {
      const filePath = path.join(process.cwd(), imageUrl.replace('http://localhost:5000', ''));
      const fileBuffer = await fsp.readFile(filePath);
      return `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
    }

    // Handle blob URLs (client-side only, should not reach here for server-side processing)
    if (imageUrl.startsWith('blob:')) {
      console.warn('Blob URL detected - falling back to text-based analysis');
      throw new Error('BLOB_URL_NOT_SUPPORTED');
    }

    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    // Return as a data URL
    return `data:${response.headers['content-type'] || 'image/jpeg'};base64,${base64}`;
  } catch (error) {
    if (error.message === 'BLOB_URL_NOT_SUPPORTED') {
      throw error; // Re-throw for special handling
    }
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to process image for analysis');
  }
}

async function generateImageWithHuggingFace(prompt, hfInferenceApiBaseUrl, hfAccessToken) {
  // HF_INFERENCE_API_BASE_URL is optional — if not set, skip silently.
  if (typeof hfInferenceApiBaseUrl !== 'string' || hfInferenceApiBaseUrl.length === 0 ||
      typeof HF_MODEL_ID !== 'string' || HF_MODEL_ID.length === 0 ||
      typeof hfAccessToken !== 'string' || hfAccessToken.length === 0) {
    console.warn('Hugging Face API configuration missing or invalid. Skipping image generation.');
    return null;
  }

  // The serverless inference API path requires '/models/' (e.g. router.huggingface.co/hf-inference/models/{modelId})
  let baseUrl = hfInferenceApiBaseUrl.endsWith('/') ? hfInferenceApiBaseUrl : `${hfInferenceApiBaseUrl}/`;
  if (!baseUrl.includes('/models/')) {
    baseUrl = `${baseUrl}models/`;
  }
  const modelId = HF_MODEL_ID.startsWith('/') ? HF_MODEL_ID.substring(1) : HF_MODEL_ID;
  const hfApiUrl = `${baseUrl}${modelId}`;
  console.log(`HF txt2img: calling ${hfApiUrl}`);

  try {
    const response = await axios.post(
      hfApiUrl,
      // Text-to-image format: 'inputs' is the text prompt string, NOT base64 image data
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${hfAccessToken}`,
          'Content-Type': 'application/json',
          Accept: 'image/png',          // REQUIRED for text-to-image models on the new router!
          'X-Wait-For-Model': 'true',  // Wait for model to load if cold
          'X-Use-Cache': 'false',       // Always generate fresh
        },
        responseType: 'arraybuffer',
        timeout: 60000, // 60s — cold starts on free tier can be slow
      }
    );
    console.log('HF txt2img response status:', response.status);
    const generatedImageBase64 = Buffer.from(response.data, 'binary').toString('base64');
    return `data:image/png;base64,${generatedImageBase64}`;
  } catch (error) {
    const errMsg = error.response?.data
      ? Buffer.from(error.response.data).toString().substring(0, 200)
      : error.message;
    console.error('HF txt2img error:', errMsg);
    throw new Error('Failed to generate image with Hugging Face');
  }
}

async function searchSimilarDesigns(features, styles, roomType) {
  try {
    // Search for portfolio items with similar characteristics
    const query = {};

    if (styles.length > 0) {
      query['metadata.style'] = { $in: styles };
    }

    if (roomType) {
      query['metadata.roomType'] = roomType;
    }

    const similarDesigns = await PortfolioItem.find(query)
      .populate('designerId', 'profile profilePicture is_verified')
      .sort({ createdAt: -1 })
      .limit(10);

    // In a real implementation, we would use the features vector to find
    // semantically similar designs using vector search
    return similarDesigns;
  } catch (error) {
    console.error('Search similar designs error:', error);
    return [];
  }
}

async function analyzeImageWithGemini(imageUrl, styles, roomType, budget, geminiApiKey, useGeminiFlag) {
  try {
    const key = geminiApiKey;
    const useGemini = useGeminiFlag && typeof key === 'string' && key.length > 0;
    const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';
    const GEMINI_ENDPOINT = `${GEMINI_API_BASE_URL}/v1beta/models/${GEMINI_MODEL}:generateContent`;

    if (!useGemini) {
      console.warn('Gemini disabled or key missing — returning mock features (set USE_GEMINI=true and GEMINI_API_KEY to enable)');
      return {
        colorPalette: ['#2C3E50', '#FDFEFE', '#D5DBDB'],
        style: styles[0] || 'Modern',
        roomType,
        keyFeatures: ['minimalist', 'clean lines'],
        mood: 'contemporary'
      };
    }
    const prompt = `
    You are an expert interior designer and computer vision analyst. Analyze this interior design image in detail:
    
    TASK: Perform comprehensive visual analysis of the uploaded image to understand:
    1. What type of room is actually shown (compare with requested: ${roomType})
    2. What furniture and objects are visible
    3. What colors and materials are present
    4. What architectural features exist
    5. What style the room currently represents
    6. How it matches the user's preferences: ${styles.join(', ')}
    7. Budget considerations: ${budget}
    
    CRITICAL: Look at the actual image content, not just assumptions. If the image shows a kitchen but user requested bedroom, note this discrepancy.
    
    Provide detailed JSON analysis:
    {
      "actualRoomType": "what you actually see in the image",
      "requestedRoomType": "${roomType}",
      "roomMatch": true/false,
      "detectedStyle": "style you observe in the image",
      "preferredStyles": ${JSON.stringify(styles)},
      "styleMatch": true/false,
      "colorPalette": ["hex#1", "hex#2", "hex#3", "hex#4", "hex#5"],
      "visibleFurniture": ["sofa", "coffee table", "lamp", etc],
      "materials": ["wood", "metal", "fabric", "glass", etc],
      "architecturalFeatures": ["high ceiling", "large windows", "open floor plan", etc],
      "lighting": ["natural light", "overhead lighting", "accent lighting"],
      "currentMood": "cozy/modern/minimalist/etc",
      "keyObservations": ["specific details you notice"],
      "recommendationNotes": "what to focus on for recommendations"
    }
    
    Analyze the actual image content carefully and be specific about what you see.
    `;

    // Proceed with Gemini request with retry logic for IMAGE ANALYSIS
    let retryCount = 0;
    const maxRetries = 3;
    let response;
    let useVision = true;

    // Try to get image data, fall back to text-only if blob URL
    let imageData = null;
    let imageMimeType = 'image/jpeg'; // Default to JPEG

    try {
      imageData = await getImageBase64(imageUrl);
      // Extract mime type from data URL if available
      const mimeMatch = imageData.match(/^data:(.*?);base64,/);
      if (mimeMatch && mimeMatch[1]) {
        imageMimeType = mimeMatch[1];
      }
    } catch (error) {
      if (error.message === 'BLOB_URL_NOT_SUPPORTED') {
        console.log('Using text-only analysis due to blob URL');
        useVision = false;
      } else {
        throw error; // Re-throw other errors
      }
    }

    while (retryCount < maxRetries) {
      try {
        const requestPayload = useVision ? {
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: imageMimeType,
                  data: imageData.split(',')[1]
                }
              }
            ]
          }]
        } : {
          contents: [{
            parts: [{
              text: prompt + "\n\nNote: Image was uploaded but could not be processed visually. Please analyze based on the user's preferences and room type requirements."
            }]
          }]
        };
        console.log('Gemini analyzeImageWithGemini requestPayload:', JSON.stringify({
          ...requestPayload,
          contents: requestPayload.contents.map(content => ({
            ...content,
            parts: content.parts.map(part => {
              if (part.inline_data) {
                return { ...part, inline_data: { ...part.inline_data, data: part.inline_data.data.substring(0, 100) + '...' } };
              }
              return part;
            })
          }))
        }, null, 2));



        response = await axios.post(`${GEMINI_ENDPOINT}?key=${key}`, requestPayload);
        break; // Success, exit retry loop
      } catch (error) {
        const status = error.response?.status;
        // Always log the full Google error body for diagnostics
        if (error.response?.data) {
          console.error('Gemini image analysis API error body:', JSON.stringify(error.response.data, null, 2));
        }
        // 429 = rate limit, 403 = forbidden/billing not enabled.
        // Both are unrecoverable per-request — fail fast and use the fallback.
        if (status === 429 || status === 403) {
          const reason = status === 403
            ? 'Gemini 403 Forbidden (model may require billing) during image analysis — falling back immediately'
            : 'Gemini rate limit hit during image analysis — falling back immediately (no retry)';
          console.warn(reason);
          return {
            actualRoomType: roomType,
            requestedRoomType: roomType,
            roomMatch: true,
            detectedStyle: styles[0] || 'Modern',
            preferredStyles: styles,
            styleMatch: true,
            colorPalette: ['#2C3E50', '#FDFEFE', '#D5DBDB'],
            visibleFurniture: [],
            materials: [],
            architecturalFeatures: [],
            lighting: [],
            currentMood: 'contemporary',
            keyObservations: [status === 403 ? 'Forbidden — using curated fallback' : 'Rate limit — using curated fallback'],
            recommendationNotes: status === 403
              ? 'Gemini access forbidden — using curated design templates'
              : 'Rate limit reached — using curated design templates',
            style: styles[0] || 'Modern',
            keyFeatures: ['minimalist', 'clean lines'],
            mood: 'contemporary',
            _rateLimited: true
          };
        } else if (status >= 500) {
          // Transient server error: worth a retry with backoff
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error(`Gemini server error (Status: ${status}) exceeded max retries during image analysis, using fallback`);
            return {
              actualRoomType: roomType,
              requestedRoomType: roomType,
              roomMatch: true,
              detectedStyle: styles[0] || 'Modern',
              preferredStyles: styles,
              styleMatch: true,
              colorPalette: ['#2C3E50', '#FDFEFE', '#D5DBDB'],
              visibleFurniture: [],
              materials: [],
              architecturalFeatures: [],
              lighting: [],
              currentMood: 'contemporary',
              keyObservations: [`Server error ${status} — using fallback`],
              recommendationNotes: `Server error — using curated design templates`,
              style: styles[0] || 'Modern',
              keyFeatures: ['minimalist', 'clean lines'],
              mood: 'contemporary',
              _rateLimited: false
            };
          }
          const fixedDelays = [3000, 8000, 15000]; // 3s, 8s, 15s for 5xx
          const delay = fixedDelays[retryCount - 1] || 15000;
          console.log(`Gemini server error (Status: ${status}) during image analysis, retry ${retryCount}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    let text = response.data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Try to parse JSON, if fails, return mock data
    try {
      const analysis = JSON.parse(text);

      // Validate and ensure required fields
      return {
        actualRoomType: analysis.actualRoomType || roomType,
        requestedRoomType: roomType,
        roomMatch: analysis.roomMatch !== false,
        detectedStyle: analysis.detectedStyle || styles[0] || 'Modern',
        preferredStyles: styles,
        styleMatch: analysis.styleMatch !== false,
        colorPalette: analysis.colorPalette || ['#2C3E50', '#FDFEFE', '#D5DBDB'],
        visibleFurniture: analysis.visibleFurniture || [],
        materials: analysis.materials || [],
        architecturalFeatures: analysis.architecturalFeatures || [],
        lighting: analysis.lighting || [],
        currentMood: analysis.currentMood || 'contemporary',
        keyObservations: analysis.keyObservations || [],
        recommendationNotes: analysis.recommendationNotes || 'Focus on user preferences',
        // Legacy compatibility
        style: analysis.detectedStyle || styles[0] || 'Modern',
        keyFeatures: analysis.visibleFurniture || ['minimalist', 'clean lines'],
        mood: analysis.currentMood || 'contemporary'
      };
    } catch (parseError) {
      console.warn('Gemini returned non-JSON response, using mock data:', text.substring(0, 100));
      return {
        actualRoomType: roomType,
        requestedRoomType: roomType,
        roomMatch: true,
        detectedStyle: styles[0] || 'Modern',
        preferredStyles: styles,
        styleMatch: true,
        colorPalette: ['#2C3E50', '#FDFEFE', '#D5DBDB'],
        visibleFurniture: ['sofa', 'coffee table'],
        materials: ['wood', 'fabric'],
        architecturalFeatures: ['standard ceiling'],
        lighting: ['natural light'],
        currentMood: 'contemporary',
        keyObservations: ['fallback analysis'],
        recommendationNotes: 'Using fallback analysis',
        // Legacy compatibility
        style: styles[0] || 'Modern',
        keyFeatures: ['minimalist', 'clean lines'],
        mood: 'contemporary'
      };
    }
  } catch (error) {
    console.error('Gemini image analysis error:', error);
    // Return mock features if Gemini fails
    return {
      actualRoomType: roomType,
      requestedRoomType: roomType,
      roomMatch: true,
      detectedStyle: styles[0] || 'Modern',
      preferredStyles: styles,
      styleMatch: true,
      colorPalette: ['#2C3E50', '#FDFEFE', '#D5DBDB'],
      visibleFurniture: ['sofa', 'coffee table'],
      materials: ['wood', 'fabric'],
      architecturalFeatures: ['standard ceiling'],
      lighting: ['natural light'],
      currentMood: 'contemporary',
      keyObservations: ['fallback analysis'],
      recommendationNotes: 'Using fallback due to error',
      // Legacy compatibility
      style: styles[0] || 'Modern',
      keyFeatures: ['minimalist', 'clean lines'],
      mood: 'contemporary'
    };
  }
}

async function getUserBoardContext(userId) {
  try {
    const boards = await Board.find({ userId });
    if (!boards || boards.length === 0) return null;
    
    const allStyles = [];
    boards.forEach(board => {
      if (board.items && board.items.length > 0) {
        board.items.forEach(item => {
          if (item.style && typeof item.style === 'string') {
            allStyles.push(item.style);
          }
        });
      }
    });
    
    if (allStyles.length === 0) return null;
    
    const styleCounts = {};
    allStyles.forEach(s => {
      const styleName = s.trim();
      if (styleName) {
        styleCounts[styleName] = (styleCounts[styleName] || 0) + 1;
      }
    });
    
    const sortedStyles = Object.entries(styleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
      
    if (sortedStyles.length === 0) return null;
    
    return `User's historical Styleboard shows a strong preference for these styles: ${sortedStyles.join(', ')}.`;
  } catch (err) {
    console.error('Error fetching user board context:', err);
    return null;
  }
}

async function generateDesignRecommendationsWithGemini(features, styles, roomType, budget, creativity, similarDesigns, originalImageUrl, geminiApiKey, useGeminiFlag, hfInferenceApiBaseUrl, hfAccessToken, historicalContext = null) {
  try {
    const key = geminiApiKey;
    const useGemini = useGeminiFlag && typeof key === 'string' && key.length > 0;
    const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';
    const GEMINI_ENDPOINT = `${GEMINI_API_BASE_URL}/v1beta/models/${GEMINI_MODEL}:generateContent`;
    if (!useGemini) {
      console.warn('Gemini disabled or key missing — returning mock recommendations (set USE_GEMINI=true to enable)');
      return generateMockRecommendations(styles, roomType, budget);
    }
    // If image analysis was already rate-limited, don't burn another API call —
    // skip straight to curated templates to avoid 45s+ of pointless retries.
    if (features._rateLimited) {
      console.warn('Image analysis was rate-limited — skipping Gemini recommendation call, using curated templates');
      return generateCuratedDesignTemplates(styles, roomType, budget);
    }

    // Get base64 of the original image for Image-to-Image generation
    let originalImageBase64 = null;
    try {
      originalImageBase64 = await getImageBase64(originalImageUrl);
    } catch (error) {
      console.warn('Could not get base64 for original image, proceeding with text-to-image if possible:', error.message);
      // If image cannot be processed, we might fall back to text-to-image or a different strategy
    }

    const prompt = `
    You are an expert interior designer. Generate 1 interior design recommendation based on:
    - Analysis: ${JSON.stringify(features)}
    - Preferred styles: ${styles.join(', ')}
    - Room type: ${roomType}
    - Budget: ${budget}
    - Creativity level: ${creativity}${historicalContext ? `\n    - Historical Context (Personalization): ${historicalContext}\n    CRITICAL INSTRUCTION FOR PERSONALIZATION: Draw subtle inspiration from the user's Historical Context if possible to deeply personalize the design, but ALWAYS ensure the final output satisfies their explicitly requested 'Preferred styles' and 'Room type' above.` : ''}
    
    CRITICAL: Generate ONLY interior design recommendations for ${roomType}. Do not generate any other content like cars, waterfalls, landscapes, etc.
    
    Create recommendation in this exact JSON format:
    [
      {
        "id": "unique-id",
        "name": "Design Name",
        "description": "Brief description of the interior design",
        "style": "Style Name",
        "roomType": "${roomType}",
        "budget": "${budget}",
        "products": ["Furniture Item 1", "Furniture Item 2", "Furniture Item 3"],
        "imageUrl": "",
        "confidence": 0.85
      }
    ]
    
    IMPORTANT: 
    - All recommendations MUST be for ${roomType} interior design
    - Use real interior design furniture and decor items
    - Make the first 2 recommendations regular and the last 2 premium
    - Leave imageUrl as an empty string; the system will assign images automatically
    `;

    // Proceed with Gemini request with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    let response;

    while (retryCount < maxRetries) {
      try {
        const requestBody = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        };
        console.log('Gemini generateDesignRecommendationsWithGemini requestBody:', JSON.stringify(requestBody, null, 2));
        response = await axios.post(
          `${GEMINI_ENDPOINT}?key=${key}`,
          requestBody,
        );
        break; // Success, exit retry loop
      } catch (error) {
        const status = error.response?.status;
        if (error.response?.data) {
          console.error('Gemini recommendations API error body:', JSON.stringify(error.response.data, null, 2));
        }
        if (status === 429 || status === 403) {
          const reason = status === 403
            ? 'Gemini 403 Forbidden (model may require billing) during recommendations — falling back immediately'
            : 'Gemini rate limit hit during recommendations — falling back immediately (no retry)';
          console.warn(reason);
          return generateCuratedDesignTemplates(styles, roomType, budget);
        } else if (status >= 500) {
          // Transient server error: retry with backoff
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error(`Gemini server error (Status: ${status}) exceeded max retries during recommendations, using fallback`);
            return generateCuratedDesignTemplates(styles, roomType, budget);
          }
          const fixedDelays = [3000, 8000, 15000]; // 3s, 8s, 15s
          const delay = fixedDelays[retryCount - 1] || 15000;
          console.log(`Gemini server error (Status: ${status}) during recommendations, retry ${retryCount}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
    }

    let text = response.data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Try to parse JSON, if fails, return mock recommendations
    let recommendations;
    try {
      recommendations = JSON.parse(text);
    } catch (parseError) {
      console.warn('Gemini returned non-JSON response for recommendations, using mock data:', text.substring(0, 100));
      return generateMockRecommendations(styles, roomType, budget);
    }

    // Ensure we have at least 1 recommendation
    if (recommendations.length < 1) {
      return generateMockRecommendations(styles, roomType, budget);
    }

    const recommendationsWithImages = await Promise.all(recommendations.map(async (rec) => {
      const imagePrompt = `Professional interior design photo of a ${rec.roomType || roomType} in ${rec.style || styles[0]} style. ${rec.description}. High quality, photorealistic, well-lit.`;
      let generatedImageUrl = null;
      try {
        generatedImageUrl = await generateImageWithHuggingFace(imagePrompt, hfInferenceApiBaseUrl, hfAccessToken);
      } catch (hfError) {
        console.error('HF image generation failed, using curated fallback:', hfError.message);
      }
      return {
        ...rec,
        imageUrl: (generatedImageUrl || getInteriorImage(rec.roomType || roomType, rec.style || styles[0])).replace(/`/g, '').trim()
      };
    }));

    return recommendationsWithImages;
  } catch (error) {
    console.error('Gemini recommendations error:', error);
    // Return mock recommendations if Gemini fails
    return generateMockRecommendations(styles, roomType, budget);
  }
}



async function applyDesignModifications(originalRecommendation, modifications, creativity) {
  try {
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await axios.post(`${AI_SERVICE_URL}/modify-design`, {
      originalDesign: originalRecommendation,
      modifications,
      creativity
    });

    return response.data.modifiedDesigns || [];
  } catch (error) {
    console.error('Apply modifications error:', error);
    return [];
  }
}

async function analyzeImageStyle(features) {
  try {
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await axios.post(`${AI_SERVICE_URL}/analyze-style`, {
      features
    });

    return response.data.styleAnalysis || {};
  } catch (error) {
    console.error('Analyze style error:', error);
    return {};
  }
}

async function saveUserRecommendations(userId, recommendations, imageUrl, metadata, similarDesigns) {
  try {
    const { AIRecommendation } = await import('../models/AIRecommendation.js');

    // Generate a unique session ID for this generation
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Normalize userId to ensure consistency
    const normalizedUserId = userId.toString();

    // Save the complete AI recommendation session
    const aiRecommendation = new AIRecommendation({
      userId: normalizedUserId,
      sessionId,
      imageUrl,
      metadata: {
        roomType: metadata.roomType,
        styles: metadata.styles,
        budget: metadata.budget,
        creativity: metadata.creativity,
        generatedAt: metadata.generatedAt || new Date()
      },
      recommendations: recommendations.map(rec => ({
        ...rec,
        // Ensure required fields are present
        name: rec.name || 'AI Generated Design',
        description: rec.description || `Beautiful ${rec.style || 'Modern'} ${rec.roomType || 'Living Room'} design with premium finishes and thoughtful space planning.`,
        price: rec.price || '$2,999',
        style: rec.style || 'Modern',
        roomType: rec.roomType || 'Living Room',
        products: rec.products || [],
        confidence: rec.confidence || 0.85,
        isPremium: rec.isPremium || true,
        details: {
          materials: rec.materials || [],
          dimensions: rec.dimensions || 'Standard dimensions',
          colorPalette: rec.colorPalette || ['#FFFFFF', '#000000'],
          implementationTips: rec.implementationTips || []
        }
      })),
      similarDesigns: similarDesigns || []
    });

    await aiRecommendation.save();
    console.log(`✅ Saved ${recommendations.length} recommendations for user ${userId} with session ID: ${sessionId}`);
    console.log(`Session details:`, {
      sessionId: aiRecommendation.sessionId,
      userId: aiRecommendation.userId,
      status: aiRecommendation.status,
      createdAt: aiRecommendation.createdAt,
      recommendationsCount: aiRecommendation.recommendations.length
    });
    return sessionId;
  } catch (error) {
    console.error('Failed to save user recommendations:', error);
    // Don't throw error, just continue without saving
  }
}

async function getUserRecommendations(userId, skip = 0, limit = 10) {
  try {
    const { AIRecommendation } = await import('../models/AIRecommendation.js');

    const recommendations = await AIRecommendation.find({
      userId,
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return recommendations;
  } catch (error) {
    console.error('Failed to get user recommendations:', error);
    return [];
  }
}

async function getUserRecommendationsCount(userId) {
  // This would count from a Recommendations model
  return 0;
}

async function getRecommendationById(recommendationId, userId) {
  // This would get from a Recommendations model
  return null;
}

async function saveModifiedRecommendations(userId, modifiedRecommendations) {
  // This would save to a Recommendations model
  console.log(`Saved ${modifiedRecommendations.length} modified recommendations for user ${userId}`);
}

async function saveRecommendationToProfile(userId, recommendationId, name, notes) {
  // This would save to a UserSavedRecommendations model
  console.log(`Saved recommendation ${recommendationId} to user ${userId} profile`);
}

// Curated, room-specific Unsplash interior design photo URLs (deterministic via photo ID)
const INTERIOR_IMAGES = {
  'Living Room': {
    Modern:        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    Scandinavian:  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    Contemporary:  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    Industrial:    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80',
    Bohemian:      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
    Traditional:   'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=800&q=80',
  },
  'Bedroom': {
    Modern:        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
    Scandinavian:  'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80',
    Contemporary:  'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80',
    Industrial:    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
    Bohemian:      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    Traditional:   'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=800&q=80',
  },
  'Kitchen': {
    Modern:        'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
    Farmhouse:     'https://images.unsplash.com/photo-1583845112203-29329902332e?auto=format&fit=crop&w=800&q=80',
    Contemporary:  'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?auto=format&fit=crop&w=800&q=80',
    Industrial:    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80',
    Scandinavian:  'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?auto=format&fit=crop&w=800&q=80',
    Traditional:   'https://images.unsplash.com/photo-1556909045-f3f9fdf98990?auto=format&fit=crop&w=800&q=80',
  },
  'Bathroom': {
    Modern:        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=80',
    Scandinavian:  'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80',
    Contemporary:  'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80',
    Industrial:    'https://images.unsplash.com/photo-1620626011761-996317702149?auto=format&fit=crop&w=800&q=80',
    Luxury:        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=800&q=80',
    Traditional:   'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  },
  'Dining Room': {
    Modern:        'https://images.unsplash.com/photo-1615968679312-9b7ed9f04e79?auto=format&fit=crop&w=800&q=80',
    Scandinavian:  'https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=800&q=80',
    Contemporary:  'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80',
    Industrial:    'https://images.unsplash.com/photo-1593702288056-f4d7b85b3a7e?auto=format&fit=crop&w=800&q=80',
    Traditional:   'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
  },
  'Office': {
    Modern:        'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&w=800&q=80',
    Scandinavian:  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
    Contemporary:  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    Industrial:    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80',
    Traditional:   'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?auto=format&fit=crop&w=800&q=80',
  },
};

function getInteriorImage(roomType, style) {
  const roomImages = INTERIOR_IMAGES[roomType] || INTERIOR_IMAGES['Living Room'];
  // Try exact style match, then any available image for that room
  return roomImages[style] || Object.values(roomImages)[0];
}

function generateCuratedDesignTemplates(styles, roomType, budget) {
  // Professional curated design templates for fallback scenarios
  const templates = {
    'Living Room': [
      {
        id: 'curated-lr-modern',
        name: 'Modern Living Room Collection',
        description: 'A sophisticated modern living room with clean lines, neutral colors, and functional furniture',
        style: 'Modern',
        roomType: 'Living Room',
        budget: '$2,000-3,500',
        price: '$2,500',
        products: ['Sectional Sofa', 'Glass Coffee Table', 'Floor Lamp', 'Area Rug', 'Wall Unit'],
        imageUrl: getInteriorImage('Living Room', 'Modern'),
        confidence: 0.95,
        isPremium: false,
        templateType: 'curated',
        styleGuide: 'Minimalist design with focus on functionality and clean aesthetics'
      },
      {
        id: 'curated-lr-scandinavian',
        name: 'Scandinavian Comfort Living',
        description: 'Cozy Scandinavian living room with natural materials, soft textures, and warm lighting',
        style: 'Scandinavian',
        roomType: 'Living Room',
        budget: '$1,800-2,800',
        price: '$2,200',
        products: ['Comfort Sofa', 'Wood Coffee Table', 'Pendant Lights', 'Throw Pillows', 'Plant Stand'],
        imageUrl: getInteriorImage('Living Room', 'Scandinavian'),
        confidence: 0.92,
        isPremium: false,
        templateType: 'curated',
        styleGuide: 'Hygge-inspired design emphasizing comfort and natural elements'
      },
      {
        id: 'curated-lr-luxury',
        name: 'Luxury Contemporary Suite',
        description: 'High-end contemporary living room with premium materials and sophisticated styling',
        style: 'Contemporary',
        roomType: 'Living Room',
        budget: '$4,000-6,000',
        price: '$5,000',
        products: ['Designer Sofa', 'Marble Console', 'Chandelier', 'Art Pieces', 'Premium Rug'],
        imageUrl: getInteriorImage('Living Room', 'Contemporary'),
        confidence: 0.98,
        isPremium: true,
        templateType: 'curated',
        styleGuide: 'Luxury contemporary design with focus on premium materials and elegance'
      },
      {
        id: 'curated-lr-industrial',
        name: 'Industrial Chic Loft',
        description: 'Urban industrial living room with raw materials, exposed elements, and bold design',
        style: 'Industrial',
        roomType: 'Living Room',
        budget: '$2,500-4,000',
        price: '$3,200',
        products: ['Leather Sectional', 'Metal Shelving', 'Edison Lights', 'Concrete Table', 'Metal Art'],
        imageUrl: getInteriorImage('Living Room', 'Industrial'),
        confidence: 0.90,
        isPremium: true,
        templateType: 'curated',
        styleGuide: 'Industrial design celebrating raw materials and architectural elements'
      }
    ],
    'Kitchen': [
      {
        id: 'curated-kit-modern',
        name: 'Modern Minimalist Kitchen',
        description: 'Sleek modern kitchen with minimalist cabinetry, integrated appliances, and clean workflow',
        style: 'Modern',
        roomType: 'Kitchen',
        budget: '$5,000-8,000',
        price: '$6,500',
        products: ['Flat-Panel Cabinets', 'Integrated Appliances', 'Quartz Countertop', 'Under-Cabinet Lighting', 'Storage Solutions'],
        imageUrl: getInteriorImage('Kitchen', 'Modern'),
        confidence: 0.94,
        isPremium: false,
        templateType: 'curated',
        styleGuide: 'Minimalist kitchen design focusing on efficiency and clean aesthetics'
      },
      {
        id: 'curated-kit-farmhouse',
        name: 'Modern Farmhouse Kitchen',
        description: 'Charming farmhouse kitchen with modern amenities, rustic elements, and warm atmosphere',
        style: 'Farmhouse',
        roomType: 'Kitchen',
        budget: '$4,000-6,500',
        price: '$5,200',
        products: ['Shaker Cabinets', 'Farmhouse Sink', 'Wood Island', 'Pendant Lights', 'Open Shelving'],
        imageUrl: getInteriorImage('Kitchen', 'Farmhouse'),
        confidence: 0.91,
        isPremium: false,
        templateType: 'curated',
        styleGuide: 'Modern farmhouse blending rustic charm with contemporary functionality'
      },
      {
        id: 'curated-kit-luxury',
        name: 'Gourmet Chef\'s Kitchen',
        description: 'Professional-grade luxury kitchen with high-end appliances and premium finishes',
        style: 'Contemporary',
        roomType: 'Kitchen',
        budget: '$8,000-12,000',
        price: '$10,000',
        products: ['Professional Range', 'Custom Cabinetry', 'Marble Countertops', 'Wine Refrigerator', 'Smart Appliances'],
        imageUrl: getInteriorImage('Kitchen', 'Contemporary'),
        confidence: 0.97,
        isPremium: true,
        templateType: 'curated',
        styleGuide: 'Luxury kitchen design with professional-grade features and premium materials'
      },
      {
        id: 'curated-kit-industrial',
        name: 'Industrial Loft Kitchen',
        description: 'Urban industrial kitchen with exposed elements, metal finishes, and bold design',
        style: 'Industrial',
        roomType: 'Kitchen',
        budget: '$6,000-9,000',
        price: '$7,500',
        products: ['Metal Cabinets', 'Concrete Countertops', 'Commercial Hood', 'Pipe Shelving', 'Metal Backsplash'],
        imageUrl: getInteriorImage('Kitchen', 'Industrial'),
        confidence: 0.89,
        isPremium: true,
        templateType: 'curated',
        styleGuide: 'Industrial kitchen design celebrating raw materials and urban aesthetics'
      }
    ],
    'Bathroom': [
      {
        id: 'curated-bath-modern',
        name: 'Modern Spa Bathroom',
        description: 'Sleek modern bathroom with floating vanity, frameless shower, and minimalist fixtures',
        style: 'Modern',
        roomType: 'Bathroom',
        budget: '$3,000-5,000',
        price: '$4,000',
        products: ['Floating Vanity', 'Frameless Shower', 'Rainfall Showerhead', 'Heated Towel Rail', 'LED Mirror'],
        imageUrl: getInteriorImage('Bathroom', 'Modern'),
        confidence: 0.95,
        isPremium: false,
        templateType: 'curated',
        styleGuide: 'Clean lines and spa-like serenity with quality fixtures'
      },
      {
        id: 'curated-bath-scandi',
        name: 'Scandinavian Retreat Bathroom',
        description: 'Light and airy Scandinavian bathroom with natural wood accents and soft neutral tones',
        style: 'Scandinavian',
        roomType: 'Bathroom',
        budget: '$2,500-4,000',
        price: '$3,200',
        products: ['Wood-Accent Vanity', 'Freestanding Tub', 'Natural Stone Tiles', 'Wooden Bath Mat', 'White Fixtures'],
        imageUrl: getInteriorImage('Bathroom', 'Scandinavian'),
        confidence: 0.92,
        isPremium: false,
        templateType: 'curated',
        styleGuide: 'Hygge-inspired bathroom with natural warmth and simplicity'
      },
      {
        id: 'curated-bath-luxury',
        name: 'Luxury Master Bathroom',
        description: 'Hotel-inspired luxury bathroom with premium marble, soaking tub, and bespoke cabinetry',
        style: 'Contemporary',
        roomType: 'Bathroom',
        budget: '$6,000-10,000',
        price: '$8,000',
        products: ['Freestanding Soaking Tub', 'Marble Tile', 'Custom Double Vanity', 'Smart Toilet', 'Steam Shower'],
        imageUrl: getInteriorImage('Bathroom', 'Luxury'),
        confidence: 0.98,
        isPremium: true,
        templateType: 'curated',
        styleGuide: 'Five-star hotel bathroom experience at home'
      },
      {
        id: 'curated-bath-industrial',
        name: 'Industrial Style Bathroom',
        description: 'Bold industrial bathroom with exposed pipes, concrete, and matte black fixtures',
        style: 'Industrial',
        roomType: 'Bathroom',
        budget: '$3,500-5,500',
        price: '$4,500',
        products: ['Concrete Basin', 'Matte Black Fixtures', 'Open Shelving', 'Subway Tiles', 'Vintage Mirror'],
        imageUrl: getInteriorImage('Bathroom', 'Industrial'),
        confidence: 0.90,
        isPremium: true,
        templateType: 'curated',
        styleGuide: 'Urban edge meets functional bathroom design'
      }
    ],
    'Bedroom': [
      {
        id: 'curated-bed-modern',
        name: 'Modern Serene Bedroom',
        description: 'Calm, uncluttered modern bedroom with platform bed, soft lighting, and ample storage',
        style: 'Modern',
        roomType: 'Bedroom',
        budget: '$2,000-3,500',
        price: '$2,800',
        products: ['Platform Bed', 'Floating Nightstands', 'Built-in Wardrobe', 'Pendant Lights', 'Linen Bedding'],
        imageUrl: getInteriorImage('Bedroom', 'Modern'),
        confidence: 0.95,
        isPremium: false,
        templateType: 'curated',
        styleGuide: 'Restful minimalism for quality sleep and relaxation'
      },
      {
        id: 'curated-bed-scandi',
        name: 'Scandinavian Cozy Bedroom',
        description: 'Warm Scandinavian bedroom with layered textiles, wood tones, and soft ambient lighting',
        style: 'Scandinavian',
        roomType: 'Bedroom',
        budget: '$1,800-3,000',
        price: '$2,300',
        products: ['Wooden Bed Frame', 'Wool Throw', 'Rattan Lamp', 'White Linen', 'Potted Plants'],
        imageUrl: getInteriorImage('Bedroom', 'Scandinavian'),
        confidence: 0.92,
        isPremium: false,
        templateType: 'curated',
        styleGuide: 'Hygge-inspired bedroom for ultimate comfort'
      },
      {
        id: 'curated-bed-luxury',
        name: 'Luxury Master Bedroom',
        description: 'Opulent master bedroom with upholstered headboard, designer lighting, and premium fabrics',
        style: 'Contemporary',
        roomType: 'Bedroom',
        budget: '$5,000-8,000',
        price: '$6,500',
        products: ['Upholstered Bed', 'Designer Dresser', 'Walk-in Wardrobe', 'Chandelier', 'Silk Bedding'],
        imageUrl: getInteriorImage('Bedroom', 'Contemporary'),
        confidence: 0.97,
        isPremium: true,
        templateType: 'curated',
        styleGuide: 'Boutique hotel luxury in your own bedroom'
      },
      {
        id: 'curated-bed-bohemian',
        name: 'Bohemian Dream Bedroom',
        description: 'Eclectic boho bedroom with layered rugs, macramé, plants, and warm earthy tones',
        style: 'Bohemian',
        roomType: 'Bedroom',
        budget: '$1,500-2,500',
        price: '$2,000',
        products: ['Canopy Bed', 'Layered Rugs', 'Macramé Wall Hanging', 'Rattan Furniture', 'String Lights'],
        imageUrl: getInteriorImage('Bedroom', 'Bohemian'),
        confidence: 0.88,
        isPremium: false,
        templateType: 'curated',
        styleGuide: 'Free-spirited, textured bedroom full of personality'
      }
    ]
  };

  // Return templates for the requested room type, or default to Living Room
  const roomTemplates = templates[roomType] || templates['Living Room'];

  // Parse the user's max budget from strings like '$1,000–$2,500' or '$1,000-$2,500'
  const budgetMax = (() => {
    if (!budget) return Infinity;
    const nums = budget.replace(/[^0-9,\-–]/g, '').split(/[-–]/).map(n => parseInt(n.replace(/,/g, ''), 10)).filter(Boolean);
    return nums.length >= 2 ? nums[1] : (nums[0] || Infinity);
  })();

  // Filter by user's preferred styles if specified
  let candidates = roomTemplates;
  if (styles && styles.length > 0) {
    const filtered = roomTemplates.filter(template =>
      styles.some(style =>
        template.style.toLowerCase().includes(style.toLowerCase())
      )
    );
    if (filtered.length >= 1) {
      candidates = filtered;
    }
  }

  // Further filter by budget — prefer templates whose price is within range
  const withinBudget = candidates.filter(template => {
    const priceNum = parseInt((template.price || '0').replace(/[^0-9]/g, ''), 10);
    return priceNum <= budgetMax;
  });

  // Return budget-appropriate templates (fall back to all candidates if none match)
  return (withinBudget.length >= 1 ? withinBudget : candidates).slice(0, 4);
}

function generateMockRecommendations(styles, roomType, budget) {
  const room = roomType || 'Living Room';
  const style = styles[0] || 'Modern';
  return [
    {
      id: 'mock-1',
      name: `${style} ${room} Design`,
      description: `Clean, well-considered ${style.toLowerCase()} design tailored for a ${room.toLowerCase()} within your budget`,
      style,
      roomType: room,
      budget: budget || '$1,000-2,500',
      price: '$1,500-2,000',
      products: ['Primary Furniture Piece', 'Accent Lighting', 'Area Rug', 'Decorative Accessories'],
      imageUrl: getInteriorImage(room, style),
      confidence: 0.85,
      isPremium: false,
      details: { materials: [], dimensions: 'Standard dimensions', colorPalette: ['#F5F5F5', '#2C2C2C'], implementationTips: [] }
    }
  ];
}

// Get user's saved AI recommendations
router.get('/saved', authenticateToken, async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required', message: 'You must be logged in to view your saved recommendations' });
    }
    
    // Strict security: use authenticated user from token
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const recommendations = await getUserRecommendations(userId, skip, parseInt(limit));

    res.json({
      recommendations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: recommendations.length
      }
    });
  } catch (error) {
    console.error('Get saved recommendations error:', error);
    res.status(500).json({ error: 'Failed to get saved recommendations' });
  }
});

// Get specific recommendation session by ID
router.get('/saved/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.query;

    if (!sessionId || !userId) {
      return res.status(400).json({ error: 'sessionId and userId are required' });
    }

    // Normalize userId for consistency
    const normalizedUserId = userId.toString();

    const { AIRecommendation } = await import('../models/AIRecommendation.js');

    console.log(`Looking for AI recommendation:`, { sessionId, userId: normalizedUserId });

    // First check if any session exists with this ID
    const anySession = await AIRecommendation.findOne({ sessionId }).lean();
    console.log(`Any session found:`, !!anySession);

    if (anySession) {
      console.log(`Session details:`, {
        sessionId: anySession.sessionId,
        userId: anySession.userId,
        status: anySession.status,
        createdAt: anySession.createdAt
      });
    }

    // Check for specific user and status
    let recommendation = await AIRecommendation.findOne({
      sessionId,
      userId: normalizedUserId,
      status: 'active'
    }).lean();

    console.log(`Specific recommendation found:`, !!recommendation);

    if (!recommendation) {
      // Try without status filter - maybe status is different
      console.log(`Trying without status filter...`);
      recommendation = await AIRecommendation.findOne({
        sessionId,
        userId: normalizedUserId
      }).lean();

      console.log(`Found without status filter:`, !!recommendation);

      if (recommendation) {
        console.log(`Session status:`, recommendation.status);
        // Update status to active if it's not already
        if (recommendation.status !== 'active') {
          await AIRecommendation.updateOne(
            { sessionId, userId: normalizedUserId },
            { status: 'active' }
          );
          recommendation.status = 'active';
        }
      }
    }

    if (!recommendation) {
      // Try to find any session with this ID (userId mismatch case)
      console.log(`Trying any session with this ID...`);
      const anySession = await AIRecommendation.findOne({ sessionId }).lean();

      if (anySession) {
        console.log(`Found session but different userId:`, {
          expectedUserId: userId,
          actualUserId: anySession.userId.toString(),
          sessionId: anySession.sessionId,
          status: anySession.status
        });

        // Update the session to use the correct userId (fix the mismatch)
        await AIRecommendation.updateOne(
          { sessionId },
          { userId: normalizedUserId }
        );

        console.log(`✅ Updated session userId from ${anySession.userId.toString()} to ${normalizedUserId}`);

        // Now get the updated session
        recommendation = await AIRecommendation.findOne({ sessionId }).lean();
      }
    }

    if (!recommendation) {
      // Try to find any session for this user to help debugging
      const userSessions = await AIRecommendation.find({ userId: normalizedUserId }).lean();
      console.log(`User has ${userSessions.length} total sessions:`,
        userSessions.map(s => ({ sessionId: s.sessionId, status: s.status }))
      );

      return res.status(404).json({
        error: 'Recommendation not found',
        details: `Session ${sessionId} not found for user ${normalizedUserId} with active status`,
        availableSessions: userSessions.map(s => ({ sessionId: s.sessionId, status: s.status }))
      });
    }

    res.json(recommendation);
  } catch (error) {
    console.error('Get recommendation by ID error:', error);
    res.status(500).json({ error: 'Failed to get recommendation' });
  }
});

export default router;
