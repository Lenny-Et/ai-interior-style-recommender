import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User.js';
import { PortfolioItem } from '../src/models/PortfolioItem.js';
import { FeedItem } from '../src/models/Feed.js';
import { FAQ } from '../src/models/FAQ.js';
import { Notification } from '../src/models/Notification.js';
import { SupportTicket } from '../src/models/SupportTicket.js';
import { Transaction } from '../src/models/Transaction.js';

// Helper function to hash passwords
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:admin123@cluster0.a5dyv4i.mongodb.net/?appName=Cluster0';

const styles = ['Minimalist', 'Scandinavian', 'Japandi', 'Industrial', 'Bohemian', 'Modern', 'Art Deco', 'Coastal'];
const rooms = ['Living Room', 'Kitchen', 'Bedroom', 'Home Office', 'Dining Room', 'Bathroom'];
const cities = ['Addis Ababa', 'New York', 'London', 'Paris', 'Tokyo', 'Berlin'];

async function ultraSeed() {
  try {
    console.log('🚀 Starting Ultra-Seed... Preparing "manyy" data.');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Clearing all collections...');
    const models = [User, PortfolioItem, FeedItem, FAQ, Notification, SupportTicket, Transaction];
    await Promise.all(models.map(model => model.deleteMany({})));

    // 1. Seed Admin
    const admin = await new User({
      email: 'admin@aura.com',
      passwordHash: await hashPassword('admin123'),
      role: 'admin',
      is_verified: true,
      profile: { firstName: 'System', lastName: 'Admin', company: 'Aura Interiors' }
    }).save();

    // 2. Seed 10 Designers
    console.log('👥 Seeding 10 Designers...');
    const designers = [];
    for (let i = 1; i <= 10; i++) {
      const d = await new User({
        email: `designer${i}@aura.com`,
        passwordHash: await hashPassword('password123'),
        role: 'designer',
        is_verified: true,
        profile: {
          firstName: `Designer${i}`,
          lastName: 'Expert',
          company: `${styles[i % styles.length]} Design Group`,
          specialties: [styles[i % styles.length], styles[(i + 1) % styles.length]],
          location: cities[i % cities.length],
          bio: `Top-tier expert in ${styles[i % styles.length]} aesthetics.`
        }
      }).save();
      designers.push(d);
    }

    // 3. Seed 50 Portfolio Items
    console.log('🎨 Seeding 50 Portfolio Items...');
    const allPortfolios = [];
    for (let i = 0; i < 50; i++) {
      const designer = designers[i % designers.length];
      const style = styles[i % styles.length];
      const room = rooms[i % rooms.length];
      
      const item = await new PortfolioItem({
        designerId: designer._id,
        imageUrl: `https://picsum.photos/seed/${i + 100}/800/600`,
        cloudinaryId: `seed_asset_${i}`,
        description: `A breathtaking ${style} ${room} masterfully crafted for a premium feel.`,
        metadata: {
          style: style,
          roomType: room,
          colorPalette: ['#2C3E50', '#FDFEFE', '#D5DBDB']
        }
      }).save();
      allPortfolios.push(item);
    }

    // 4. Seed 15 FAQs
    console.log('❓ Seeding 15 FAQs...');
    for (let i = 1; i <= 15; i++) {
      await new FAQ({
        question: `How do I optimize a ${styles[i % styles.length]} space?`,
        answer: `Our AI suggests using natural light and high-quality textures to make ${styles[i % styles.length]} pop.`,
        category: i % 2 === 0 ? 'getting_started' : 'ai_features',
        order: i,
        createdBy: admin._id,
        isActive: true
      }).save();
    }

    // 5. Seed Feed Items (FIXED logic to prevent undefined errors)
    console.log('📰 Seeding Feed Items...');
    for (let i = 0; i < 20; i++) {
      const designer = designers[i % designers.length];
      const portfolio = allPortfolios[i % allPortfolios.length];
      
      // Using optional chaining and fallbacks to prevent the "split" or "undefined" errors
      const designerStyle = designer?.profile?.specialties?.[0] || 'Modern';
      const firstName = designer?.profile?.firstName || 'Aura';

      await new FeedItem({
        userId: designer._id,
        content: {
          type: 'portfolio',
          targetId: portfolio._id,
          relevanceScore: 8.5 + (Math.random() * 1.5)
        },
        metadata: {
          designerId: designer._id,
          style: designerStyle,
          roomType: rooms[i % rooms.length] || 'Living Room',
          description: `Check out this new ${designerStyle} design by ${firstName}!`,
          imageUrl: portfolio.imageUrl
        },
        interactionType: 'new'
      }).save();
    }

    console.log(`
🎉 ULTRA-SEED COMPLETE!
------------------------
Users: 11
Portfolio Items: 50
FAQs: 15
Feed Items: 20
------------------------
✅ Database is now production-heavy!
    `);

  } catch (error) {
    console.error('❌ Seed Failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

ultraSeed();