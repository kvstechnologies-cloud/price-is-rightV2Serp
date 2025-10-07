// utils/similarity.js - Result Scoring and Similarity Matching

/**
 * Score search results against extracted facts using token-Jaccard similarity
 * with bonuses for exact brand/model matches
 */
function scoreResults(results, facts) {
  console.log('🎯 SIMILARITY SCORING: Scoring search results against facts');
  console.log(`📊 Processing ${results.length} results against facts:`, {
    title: facts.title,
    brand: facts.brand,
    model: facts.model,
    category: facts.category
  });

  const scoredResults = results.map((result, index) => {
    const score = calculateSimilarityScore(result, facts);
    
    console.log(`📊 Result ${index + 1}: "${result.title}" - Score: ${score.similarity.toFixed(3)} (${score.breakdown.join(', ')})`);
    
    return {
      ...result,
      similarity: score.similarity,
      scoreBreakdown: score.breakdown,
      matchedAttributes: score.matchedAttributes
    };
  });

  // Sort by similarity score (highest first)
  scoredResults.sort((a, b) => b.similarity - a.similarity);

  console.log(`✅ Scored and sorted ${scoredResults.length} results`);
  return scoredResults;
}

/**
 * Calculate similarity score between search result and extracted facts
 * Returns score between 0.0 and 1.0
 */
function calculateSimilarityScore(result, facts) {
  let totalScore = 0.0;
  const breakdown = [];
  const matchedAttributes = {};

  // Get result title and normalize
  const resultTitle = (result.title || '').toLowerCase();
  const resultSource = (result.source || '').toLowerCase();
  
  // Tokenize titles for Jaccard similarity
  const factTokens = tokenizeText(facts.title || '');
  const resultTokens = tokenizeText(resultTitle);

  // 1. Brand Match Bonus (+0.3 if exact match)
  if (facts.brand && resultTitle.includes(facts.brand.toLowerCase())) {
    totalScore += 0.3;
    breakdown.push('Brand match (+0.3)');
    matchedAttributes.brand = facts.brand;
  }

  // 2. Model Match Bonus (+0.2 if exact match)
  if (facts.model && resultTitle.includes(facts.model.toLowerCase())) {
    totalScore += 0.2;
    breakdown.push('Model match (+0.2)');
    matchedAttributes.model = facts.model;
  }

  // 3. Category/Attribute Token Match (+0.2 scaled by matches)
  let categoryScore = 0;
  const categoryTokens = [
    ...(facts.category ? tokenizeText(facts.category) : []),
    ...(facts.subcategory ? tokenizeText(facts.subcategory) : []),
    ...(facts.attributes || []).flatMap(attr => tokenizeText(attr))
  ];

  if (categoryTokens.length > 0) {
    const categoryMatches = categoryTokens.filter(token => 
      resultTokens.some(rToken => rToken.includes(token) || token.includes(rToken))
    );
    categoryScore = (categoryMatches.length / categoryTokens.length) * 0.2;
    totalScore += categoryScore;
    
    if (categoryScore > 0) {
      breakdown.push(`Category/Attr match (+${categoryScore.toFixed(3)})`);
      matchedAttributes.categoryAttributes = categoryMatches;
    }
  }

  // 4. Title Jaccard Similarity (+0.3 scaled by Jaccard coefficient)
  const jaccardScore = calculateJaccardSimilarity(factTokens, resultTokens) * 0.3;
  totalScore += jaccardScore;
  breakdown.push(`Jaccard similarity (+${jaccardScore.toFixed(3)})`);

  // 5. Keyword Match Bonus (additional scoring for search keywords)
  if (facts.keywords && facts.keywords.length > 0) {
    const keywordTokens = facts.keywords.flatMap(keyword => tokenizeText(keyword));
    const keywordMatches = keywordTokens.filter(token => 
      resultTokens.some(rToken => rToken.includes(token) || token.includes(rToken))
    );
    
    if (keywordMatches.length > 0) {
      const keywordScore = (keywordMatches.length / keywordTokens.length) * 0.1;
      totalScore += keywordScore;
      breakdown.push(`Keyword match (+${keywordScore.toFixed(3)})`);
      matchedAttributes.keywords = keywordMatches;
    }
  }

  // 6. Price Reasonableness Check (penalty for extreme outliers)
  if (result.extracted_price || result.price) {
    const price = parseFloat(result.extracted_price || result.price);
    if (price > 0) {
      // Penalty for suspiciously low prices (likely accessories or parts)
      if (price < 5) {
        totalScore *= 0.7; // 30% penalty
        breakdown.push('Low price penalty (-30%)');
      }
      // Penalty for extremely high prices (likely commercial/industrial)
      else if (price > 10000) {
        totalScore *= 0.8; // 20% penalty
        breakdown.push('High price penalty (-20%)');
      }
    }
  }

  // 7. Source Quality Bonus (trusted retailers get slight bonus)
  const trustedSources = ['amazon', 'walmart', 'target', 'homedepot', 'lowes', 'bestbuy'];
  if (trustedSources.some(source => resultSource.includes(source))) {
    totalScore += 0.05;
    breakdown.push('Trusted source (+0.05)');
    matchedAttributes.trustedSource = true;
  }

  // Ensure score doesn't exceed 1.0
  totalScore = Math.min(totalScore, 1.0);

  return {
    similarity: totalScore,
    breakdown,
    matchedAttributes
  };
}

/**
 * Calculate Jaccard similarity coefficient between two token sets
 */
function calculateJaccardSimilarity(tokens1, tokens2) {
  if (tokens1.length === 0 && tokens2.length === 0) return 1.0;
  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  const intersection = new Set([...set1].filter(token => set2.has(token)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Tokenize text into meaningful search tokens
 */
function tokenizeText(text) {
  if (!text || typeof text !== 'string') return [];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Remove punctuation except hyphens
    .split(/\s+/) // Split on whitespace
    .filter(token => token.length > 2) // Filter out short tokens
    .filter(token => !isStopWord(token)) // Remove stop words
    .map(token => singularize(token)); // Convert to singular form
}

/**
 * Check if a word is a stop word
 */
function isStopWord(word) {
  const stopWords = [
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'up', 'about', 'into', 'over', 'after', 'beneath', 'under', 'above',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
  ];
  
  return stopWords.includes(word.toLowerCase());
}

/**
 * Simple singularization (remove common plural endings)
 */
function singularize(word) {
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  } else if (word.endsWith('es') && word.length > 3) {
    return word.slice(0, -2);
  } else if (word.endsWith('s') && word.length > 3) {
    return word.slice(0, -1);
  }
  return word;
}

/**
 * Filter results to only those with similarity >= threshold
 */
function filterSimilarResults(scoredResults, threshold = 0.45) {
  const similarResults = scoredResults.filter(result => result.similarity >= threshold);
  
  console.log(`🎯 SIMILARITY FILTER: ${similarResults.length}/${scoredResults.length} results above threshold ${threshold}`);
  
  return similarResults;
}

/**
 * Get the best matching result from scored results
 */
function getBestMatch(scoredResults, threshold = 0.45) {
  const similarResults = filterSimilarResults(scoredResults, threshold);
  
  if (similarResults.length === 0) {
    console.log('❌ No results meet similarity threshold');
    return null;
  }

  const bestMatch = similarResults[0]; // Already sorted by score
  console.log(`🏆 BEST MATCH: "${bestMatch.title}" (Score: ${bestMatch.similarity.toFixed(3)})`);
  
  return bestMatch;
}

/**
 * Calculate text similarity using different algorithms
 */
function calculateTextSimilarity(text1, text2, algorithm = 'jaccard') {
  const tokens1 = tokenizeText(text1);
  const tokens2 = tokenizeText(text2);
  
  switch (algorithm) {
    case 'jaccard':
      return calculateJaccardSimilarity(tokens1, tokens2);
    
    case 'cosine':
      return calculateCosineSimilarity(tokens1, tokens2);
    
    case 'overlap':
      return calculateOverlapSimilarity(tokens1, tokens2);
    
    default:
      return calculateJaccardSimilarity(tokens1, tokens2);
  }
}

/**
 * Calculate cosine similarity between two token sets
 */
function calculateCosineSimilarity(tokens1, tokens2) {
  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;
  
  const allTokens = [...new Set([...tokens1, ...tokens2])];
  const vector1 = allTokens.map(token => tokens1.filter(t => t === token).length);
  const vector2 = allTokens.map(token => tokens2.filter(t => t === token).length);
  
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0.0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Calculate overlap similarity (intersection size / min set size)
 */
function calculateOverlapSimilarity(tokens1, tokens2) {
  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = new Set([...set1].filter(token => set2.has(token)));
  
  return intersection.size / Math.min(set1.size, set2.size);
}

/**
 * Test function to validate similarity scoring
 */
function testSimilarityScoring() {
  console.log('🧪 Testing similarity scoring...');
  
  const testFacts = {
    title: "Igloo 5 Gallon Heavy-Duty Beverage Cooler",
    brand: "igloo",
    model: "5-gallon",
    category: "Coolers",
    subcategory: "Beverage Coolers",
    attributes: ["5 Gallon", "Orange", "Plastic", "Spigot"],
    keywords: ["water cooler", "insulated jug", "drink cooler"]
  };
  
  const testResults = [
    {
      title: "Igloo 5 Gallon Heavy Duty Beverage Cooler Orange",
      source: "Amazon",
      extracted_price: 28.97
    },
    {
      title: "Coleman 5 Gallon Water Jug Blue",
      source: "Walmart",
      extracted_price: 32.50
    },
    {
      title: "Generic Water Container 3 Gallon",
      source: "eBay",
      extracted_price: 15.99
    }
  ];
  
  const scored = scoreResults(testResults, testFacts);
  console.log('Test results:', scored.map(r => ({
    title: r.title,
    similarity: r.similarity,
    breakdown: r.scoreBreakdown
  })));
  
  return scored;
}

module.exports = {
  scoreResults,
  calculateSimilarityScore,
  calculateJaccardSimilarity,
  calculateTextSimilarity,
  filterSimilarResults,
  getBestMatch,
  tokenizeText,
  testSimilarityScoring
};
