import express from 'express';
import axios from 'axios';
import path from 'path';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { PortfolioItem } from '../models/PortfolioItem.js';
import { User } from '../models/User.js';
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

// AI Service Configuration
const geminiApiKey = process.env.GEMINI_API_KEY;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-1.5-flash-latest';
const GEMINI_ENDPOINT = `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent`;

// Defer env check so dotenv/.env.local has time to inject variables
setTimeout(() => {
  console.log('Environment check:', {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET',
    CHAPA_SECRET_KEY: process.env.CHAPA_SECRET_KEY ? 'SET' : 'NOT SET',
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
      creativity = 0.7 
    } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Use Gemini API to analyze image and generate recommendations
    const features = await analyzeImageWithGemini(imageUrl, styles, roomType, budget);

    // Search for similar designs in our database
    const similarDesigns = await searchSimilarDesigns(features, styles, roomType);

    // Generate recommendations using Gemini API
    const recommendations = await generateDesignRecommendationsWithGemini(
      features, 
      styles, 
      roomType, 
      budget, 
      creativity,
      similarDesigns
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

    // This would come from a recommendations model - for now, return mock data
    const recommendations = await getUserRecommendations(userId, skip, limitNum);

    const total = await getUserRecommendationsCount(userId);

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

// Convert image URL to base64 for Gemini vision analysis
async function getImageBase64(imageUrl) {
  try {
    // Check if it's a blob URL (which backend can't access)
    if (imageUrl.startsWith('blob:')) {
      console.warn('Blob URL detected - falling back to text-based analysis');
      throw new Error('BLOB_URL_NOT_SUPPORTED');
    }
    
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return base64;
  } catch (error) {
    if (error.message === 'BLOB_URL_NOT_SUPPORTED') {
      throw error; // Re-throw for special handling
    }
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to process image for analysis');
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

async function analyzeImageWithGemini(imageUrl, styles, roomType, budget) {
  try {
    const key = process.env.GEMINI_API_KEY;
    const useGemini = process.env.USE_GEMINI === 'true' && !!key;
    if (!useGemini) {
      console.warn('Gemini disabled or key missing — returning mock features (set USE_GEMINI=true to enable)');
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
    try {
      imageData = await getImageBase64(imageUrl);
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
                  mime_type: "image/jpeg",
                  data: imageData
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
        
        response = await axios.post(`${GEMINI_ENDPOINT}?key=${key}`, requestPayload);
        break; // Success, exit retry loop
      } catch (error) {
        if (error.response?.status === 429) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error('Gemini API rate limit exceeded during image analysis, using fallback');
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
              keyObservations: ['Rate limit exceeded - using fallback'],
              recommendationNotes: 'Using fallback analysis due to rate limit',
              // Legacy compatibility
              style: styles[0] || 'Modern',
              keyFeatures: ['minimalist', 'clean lines'],
              mood: 'contemporary'
            };
          }
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retryCount - 1) * 1000;
          console.log(`Gemini API rate limited during image analysis, retry ${retryCount}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error; // Re-throw non-rate-limit errors
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

async function generateDesignRecommendationsWithGemini(features, styles, roomType, budget, creativity, similarDesigns) {
  try {
    const key = process.env.GEMINI_API_KEY;
    const useGemini = process.env.USE_GEMINI === 'true' && !!key;
    if (!useGemini) {
      console.warn('Gemini disabled or key missing — returning mock recommendations (set USE_GEMINI=true to enable)');
      return generateMockRecommendations(styles, roomType, budget);
    }
    const prompt = `
    You are an expert interior designer. Generate 4 interior design recommendations based on:
    - Analysis: ${JSON.stringify(features)}
    - Preferred styles: ${styles.join(', ')}
    - Room type: ${roomType}
    - Budget: ${budget}
    - Creativity level: ${creativity}
    
    CRITICAL: Generate ONLY interior design recommendations for ${roomType}. Do not generate any other content like cars, waterfalls, landscapes, etc.
    
    Create recommendations in this exact JSON format:
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
        response = await axios.post(
          `${GEMINI_ENDPOINT}?key=${key}`,
          {
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          }
        );
        break; // Success, exit retry loop
      } catch (error) {
        if (error.response?.status === 429) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error('Gemini API rate limit exceeded during recommendations, using fallback');
            return generateMockRecommendations(styles, roomType, budget);
          }
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retryCount - 1) * 1000;
          console.log(`Gemini API rate limited during recommendations, retry ${retryCount}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error; // Re-throw non-rate-limit errors
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
    
    // Ensure we have 4 recommendations
    if (recommendations.length < 4) {
      return generateMockRecommendations(styles, roomType, budget);
    }

    // Assign images based on style/room type (Gemini leaves imageUrl empty)
    return assignRecommendationImages(recommendations, roomType);
  } catch (error) {
    console.error('Gemini recommendations error:', error);
    // Return mock recommendations if Gemini fails
    return generateMockRecommendations(styles, roomType, budget);
  }
}

// Assign contextual images to recommendations that have no image
function assignRecommendationImages(recommendations, roomType) {
  return recommendations.map((rec) => ({
    ...rec,
    imageUrl: rec.imageUrl && rec.imageUrl.startsWith('http')
      ? rec.imageUrl
      : getInteriorImageUrl(rec.style || '', roomType)
  }));
}

// Build a keyword-based image URL for a given style + room type.
// Uses loremflickr.com — free, no API key, supports keyword search,
// and the `lock` value keeps the image stable across page refreshes.
function getInteriorImageUrl(style, roomType) {
  const styleMap = {
    'Modern': 'modern',
    'Scandinavian': 'scandinavian',
    'Contemporary': 'contemporary',
    'Industrial': 'industrial',
    'Bohemian': 'bohemian',
    'Mid-Century': 'mid-century-modern',
    'Traditional': 'traditional',
    'Minimalist': 'minimalist',
    'Farmhouse': 'farmhouse',
    'Transitional': 'transitional',
    'Luxury': 'luxury',
  };

  const roomMap = {
    'Living Room': 'living-room',
    'Bedroom': 'bedroom',
    'Kitchen': 'kitchen',
    'Bathroom': 'bathroom',
    'Dining Room': 'dining-room',
    'Home Office': 'home-office',
    'Nursery': 'nursery',
    'Outdoor': 'outdoor-patio',
  };

  const styleSlug = styleMap[style] || 'interior-design';
  const roomSlug = roomMap[roomType] || 'interior';

  // Simple deterministic hash so the same style+room always returns
  // the same image (loremflickr `lock` param pins the random seed).
  const hashInput = `${styleSlug}-${roomSlug}`;
  let lock = 0;
  for (let i = 0; i < hashInput.length; i++) {
    lock = (lock * 31 + hashInput.charCodeAt(i)) & 0xffff;
  }

  // loremflickr: free, no API key, keyword-aware image service
  return `https://loremflickr.com/600/400/${styleSlug},${roomSlug},interior?lock=${lock}`;
}

async function applyDesignModifications(originalRecommendation, modifications, creativity) {
  try {
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
        imageUrl: 'https://picsum.photos/seed/curated-lr-modern/600/400',
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
        imageUrl: 'https://picsum.photos/seed/curated-lr-scandi/600/400',
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
        imageUrl: 'https://picsum.photos/seed/curated-lr-luxury/600/400',
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
        imageUrl: 'https://picsum.photos/seed/curated-lr-industrial/600/400',
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
        imageUrl: 'https://picsum.photos/seed/curated-kit-modern/600/400',
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
        imageUrl: 'https://picsum.photos/seed/curated-kit-farmhouse/600/400',
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
        imageUrl: 'https://picsum.photos/seed/curated-kit-luxury/600/400',
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
        imageUrl: 'https://picsum.photos/seed/curated-kit-industrial/600/400',
        confidence: 0.89,
        isPremium: true,
        templateType: 'curated',
        styleGuide: 'Industrial kitchen design celebrating raw materials and urban aesthetics'
      }
    ]
  };

  // Return templates for the requested room type, or default to Living Room
  const roomTemplates = templates[roomType] || templates['Living Room'];
  
  // Filter by user's preferred styles if specified
  if (styles && styles.length > 0) {
    const filtered = roomTemplates.filter(template => 
      styles.some(style => 
        template.style.toLowerCase().includes(style.toLowerCase())
      )
    );
    
    // If filtered results are too few, return all templates
    if (filtered.length >= 2) {
      return filtered.slice(0, 4);
    }
  }
  
  return roomTemplates.slice(0, 4);
}

function generateMockRecommendations(styles, roomType, budget) {
  // Generate 4 mock recommendations when AI service is unavailable
  return [
    {
      id: 'mock-1',
      name: 'Modern Minimalist Set',
      description: 'Clean lines and minimalist design with functional furniture pieces',
      style: styles[0] || 'Modern',
      roomType,
      budget,
      price: '$1,500-2,000',
      products: ['Modern Sofa', 'Glass Coffee Table', 'Minimalist Floor Lamp'],
      imageUrl: getInteriorImageUrl(styles[0] || 'Modern', roomType),
      confidence: 0.85,
      isPremium: false
    },
    {
      id: 'mock-2',
      name: 'Scandinavian Comfort',
      description: 'Cozy and inviting Scandinavian design with natural materials and soft textures',
      style: styles[1] || 'Scandinavian',
      roomType,
      budget,
      price: '$1,200-1,800',
      products: ['Cozy Armchair', 'Wood Side Table', 'Soft Throw Pillows'],
      imageUrl: getInteriorImageUrl(styles[1] || 'Scandinavian', roomType),
      confidence: 0.78,
      isPremium: false
    },
    {
      id: 'mock-3',
      name: 'Luxury Contemporary',
      description: 'High-end contemporary design with premium materials and sophisticated styling',
      style: styles[0] || 'Contemporary',
      roomType,
      budget,
      price: '$3,000-4,500',
      products: ['Designer Sofa', 'Marble Coffee Table', 'Designer Lighting'],
      imageUrl: getInteriorImageUrl(styles[0] || 'Contemporary', roomType),
      confidence: 0.92,
      isPremium: true
    },
    {
      id: 'mock-4',
      name: 'Premium Industrial',
      description: 'Industrial chic design with raw materials and bold architectural elements',
      style: styles[1] || 'Industrial',
      roomType,
      budget,
      price: '$2,500-3,500',
      products: ['Leather Sectional', 'Metal Console', 'Industrial Pendant'],
      imageUrl: getInteriorImageUrl(styles[1] || 'Industrial', roomType),
      confidence: 0.89,
      isPremium: true
    }
  ];
}

// Get user's saved AI recommendations
router.get('/saved', authenticateToken, async (req, res) => {
  try {
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
