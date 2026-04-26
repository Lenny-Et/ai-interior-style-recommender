import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// We'll use the models directly from the built-in mongoose connection to avoid import issues
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env');
  process.exit(1);
}

async function migrate() {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected');

    // Portfolio Items
    console.log('🎨 Approving all Portfolio Items...');
    const portfolioResult = await mongoose.connection.collection('portfolioitems').updateMany(
      { isApproved: { $ne: true } },
      { $set: { isApproved: true, approvedAt: new Date() } }
    );
    console.log(`✅ Updated ${portfolioResult.modifiedCount} portfolio items`);

    // Inspiration Posts
    console.log('✨ Approving all Inspiration Posts...');
    const inspirationResult = await mongoose.connection.collection('inspirationposts').updateMany(
      { isApproved: { $ne: true } },
      { $set: { isApproved: true, approvedAt: new Date() } }
    );
    console.log(`✅ Updated ${inspirationResult.modifiedCount} inspiration posts`);

    console.log('\n🎉 Migration complete! Your feed should be visible again.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

migrate();
