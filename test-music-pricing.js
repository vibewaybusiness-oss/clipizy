// Test music pricing calculation
const pricingConfig = {
  credits_rate: 20,
  music_generator: { price: 0.5, description: 'Generate music' }
};

function calculateMusicPrice(numTracks) {
  const price = numTracks * pricingConfig.music_generator.price;
  return { usd: Math.round(price * 100) / 100, credits: Math.ceil(price * pricingConfig.credits_rate) };
}

console.log('Testing music pricing calculations:');
console.log('1 track:', calculateMusicPrice(1));   // Should be 0.5 USD, 10 credits
console.log('2 tracks:', calculateMusicPrice(2));  // Should be 1.0 USD, 20 credits
console.log('3 tracks:', calculateMusicPrice(3));  // Should be 1.5 USD, 30 credits
console.log('5 tracks:', calculateMusicPrice(5));  // Should be 2.5 USD, 50 credits
console.log('10 tracks:', calculateMusicPrice(10)); // Should be 5.0 USD, 100 credits
