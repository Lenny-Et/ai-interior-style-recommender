// Predefined interior style guides for fallback scenarios
export const styleGuides = {
  Modern: {
    name: 'Modern',
    description: 'Clean lines, minimal clutter, and neutral color palettes',
    keyElements: ['Simplicity', 'Functionality', 'Clean Lines', 'Neutral Colors'],
    materials: ['Glass', 'Steel', 'Chrome', 'Natural Wood'],
    colorPalette: ['#FFFFFF', '#000000', '#808080', '#E5E5E5'],
    furnitureStyle: 'Minimalist and functional',
    lighting: 'Natural light + ambient fixtures',
    bestFor: ['Apartments', 'Contemporary homes', 'Minimalist lifestyles'],
    budgetRange: '$1,500-5,000',
    tips: [
      'Keep surfaces clear and organized',
      'Use multi-functional furniture',
      'Incorporate hidden storage solutions',
      'Focus on quality over quantity'
    ]
  },
  Scandinavian: {
    name: 'Scandinavian',
    description: 'Cozy, functional, and simple design inspired by Nordic traditions',
    keyElements: ['Hygge comfort', 'Natural materials', 'Light colors', 'Functionality'],
    materials: ['Light Wood', 'Wool', 'Linen', 'Natural Fibers'],
    colorPalette: ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#D4A574'],
    furnitureStyle: 'Simple, functional, and comfortable',
    lighting: 'Maximize natural light, warm ambient lighting',
    bestFor: ['Cold climates', 'Small spaces', 'Family homes'],
    budgetRange: '$1,200-3,500',
    tips: [
      'Use light colors to make spaces feel larger',
      'Incorporate natural textures',
      'Add cozy textiles for warmth',
      'Keep spaces uncluttered but lived-in'
    ]
  },
  Industrial: {
    name: 'Industrial',
    description: 'Raw, unfinished spaces celebrating architectural elements',
    keyElements: ['Raw materials', 'Exposed elements', 'Urban feel', 'Bold design'],
    materials: ['Concrete', 'Brick', 'Steel', 'Reclaimed Wood'],
    colorPalette: ['#2C3E50', '#8B4513', '#696969', '#000000'],
    furnitureStyle: 'Sturdy, functional, often with metal accents',
    lighting: 'Edison bulbs, metal fixtures, natural light',
    bestFor: ['Lofts', 'Urban apartments', 'Commercial spaces'],
    budgetRange: '$2,000-4,500',
    tips: [
      'Embrace exposed architectural elements',
      'Mix hard and soft textures',
      'Use statement lighting fixtures',
      'Incorporate vintage or reclaimed pieces'
    ]
  },
  Contemporary: {
    name: 'Contemporary',
    description: 'Current design trends with sophisticated, elegant styling',
    keyElements: ['Sophistication', 'Current trends', 'Elegant lines', 'Premium materials'],
    materials: ['Marble', 'Brass', 'Velvet', 'High-end Woods'],
    colorPalette: ['#F8F8F8', '#2C3E50', '#D4AF37', '#8B0000'],
    furnitureStyle: 'Elegant, comfortable, high-quality',
    lighting: 'Layered lighting with statement fixtures',
    bestFor: ['Luxury homes', 'Professional spaces', 'Entertaining areas'],
    budgetRange: '$3,000-8,000',
    tips: [
      'Invest in key statement pieces',
      'Use sophisticated color combinations',
      'Focus on quality materials',
      'Create layered lighting schemes'
    ]
  },
  Farmhouse: {
    name: 'Modern Farmhouse',
    description: 'Rustic charm combined with modern functionality and comfort',
    keyElements: ['Rustic charm', 'Modern amenities', 'Warm atmosphere', 'Functional design'],
    materials: ['Reclaimed Wood', 'Galvanized Metal', 'Shiplap', 'Natural Stone'],
    colorPalette: ['#F5F5DC', '#8B4513', '#708090', '#FFFFFF'],
    furnitureStyle: 'Comfortable, practical, often distressed',
    lighting: 'Warm, inviting fixtures, pendant lights',
    bestFor: ['Family homes', 'Rural areas', 'Traditional spaces'],
    budgetRange: '$2,500-5,500',
    tips: [
      'Mix rustic and modern elements',
      'Use comfortable, practical furniture',
      'Incorporate vintage finds',
      'Create warm, inviting atmospheres'
    ]
  },
  Minimalist: {
    name: 'Minimalist',
    description: 'Extreme simplicity focusing on essential elements only',
    keyElements: ['Extreme simplicity', 'Essential only', 'Clean spaces', 'No clutter'],
    materials: ['Simple materials', 'Natural textures', 'Neutral finishes'],
    colorPalette: ['#FFFFFF', '#F0F0F0', '#D3D3D3', '#000000'],
    furnitureStyle: 'Simple, functional, no ornamentation',
    lighting: 'Simple, functional, often hidden',
    bestFor: ['Small spaces', 'Zen lifestyles', 'Modern apartments'],
    budgetRange: '$1,000-3,000',
    tips: [
      'Eliminate non-essential items',
      'Choose quality over quantity',
      'Use hidden storage',
      'Maintain clear surfaces'
    ]
  }
};

export function getStyleGuide(styleName) {
  return styleGuides[styleName] || styleGuides.Modern;
}

export function getAllStyleGuides() {
  return Object.values(styleGuides);
}

export function getStyleGuidesByBudget(budget) {
  const budgetNum = parseInt(budget.replace(/[^0-9]/g, ''));
  
  return Object.values(styleGuides).filter(guide => {
    const guideBudgetMin = parseInt(guide.budgetRange.split('-')[0].replace(/[^0-9]/g, ''));
    const guideBudgetMax = parseInt(guide.budgetRange.split('-')[1].replace(/[^0-9]/g, ''));
    return budgetNum >= guideBudgetMin && budgetNum <= guideBudgetMax;
  });
}
