import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PortfolioItem } from './src/models/PortfolioItem.js';
import { Board } from './src/models/Board.js';
import { AIRecommendation } from './src/models/AIRecommendation.js';

dotenv.config();

const brokenUrls = {
  'https://images.unsplash.com/photo-1505693416388-84cd096d1713?auto=format&fit=crop&w=1800&q=80': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1800&q=80',
  'https://images.unsplash.com/photo-1505693530684-d90d5b6b8c5f?auto=format&fit=crop&w=1900&q=80': 'https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=1900&q=80',
  // Some others that might have slightly different width params
};

const brokenBases = {
  '1505693416388-84cd096d1713': '1505693416388-ac5ce068fe85',
  '1505693530684-d90d5b6b8c5f': '1505693314120-0d443867891c',
};

async function fixUrls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let portfolioUpdated = 0;
    const portfolios = await PortfolioItem.find({});
    for (const p of portfolios) {
      let changed = false;
      for (const [bad, good] of Object.entries(brokenBases)) {
        if (p.imageUrl && p.imageUrl.includes(bad)) {
          p.imageUrl = p.imageUrl.replace(bad, good);
          changed = true;
        }
      }
      if (changed) {
        await p.save();
        portfolioUpdated++;
      }
    }
    console.log(`Updated ${portfolioUpdated} PortfolioItems`);

    let recommendationsUpdated = 0;
    const recs = await AIRecommendation.find({});
    for (const r of recs) {
      let changed = false;
      for (const [bad, good] of Object.entries(brokenBases)) {
        if (r.imageUrl && r.imageUrl.includes(bad)) {
          r.imageUrl = r.imageUrl.replace(bad, good);
          changed = true;
        }
        for (const rec of r.recommendations) {
          if (rec.imageUrl && rec.imageUrl.includes(bad)) {
            rec.imageUrl = rec.imageUrl.replace(bad, good);
            changed = true;
          }
        }
      }
      if (changed) {
        // Mongoose subdocuments might need markModified if it doesn't detect
        r.markModified('recommendations');
        await r.save();
        recommendationsUpdated++;
      }
    }
    console.log(`Updated ${recommendationsUpdated} AIRecommendations`);

    let boardsUpdated = 0;
    const boards = await Board.find({});
    for (const b of boards) {
      let changed = false;
      for (const [bad, good] of Object.entries(brokenBases)) {
        if (b.coverImage && b.coverImage.includes(bad)) {
          b.coverImage = b.coverImage.replace(bad, good);
          changed = true;
        }
        if (b.items) {
          for (const item of b.items) {
             if (item.imageUrl && item.imageUrl.includes(bad)) {
               item.imageUrl = item.imageUrl.replace(bad, good);
               changed = true;
             }
          }
        }
      }
      if (changed) {
        b.markModified('items');
        await b.save();
        boardsUpdated++;
      }
    }
    console.log(`Updated ${boardsUpdated} Boards`);

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

fixUrls();
