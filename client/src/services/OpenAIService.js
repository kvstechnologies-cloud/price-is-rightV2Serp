// OpenAI Service for Insurance Pricing Analysis
import { environment } from '../config/environment.js';

export class OpenAIService {
    constructor() {
        this.apiKey = environment.OPENAI_API_KEY;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = process.env.REACT_APP_USE_GPT5 === 'true' ? 'gpt-5-main-mini' : 'gpt-4';
        
        if (!this.apiKey) {
            console.warn('OpenAI API key not configured');
        }
    }

    async analyzeInsuranceRisk(customerData, documentText = '') {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const prompt = this.buildRiskAnalysisPrompt(customerData, documentText);
        
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert insurance underwriter and risk analyst. Provide detailed, accurate insurance risk assessments based on customer data and documents.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 1500
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            return this.parseRiskAnalysis(data.choices[0].message.content);
            
        } catch (error) {
            console.error('OpenAI API error:', error);
            throw error;
        }
    }

    async generatePricingRecommendation(riskProfile, productType, coverage) {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const prompt = this.buildPricingPrompt(riskProfile, productType, coverage);
        
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an insurance pricing specialist. Calculate accurate insurance premiums based on risk profiles and coverage requirements.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            return this.parsePricingRecommendation(data.choices[0].message.content);
            
        } catch (error) {
            console.error('OpenAI pricing error:', error);
            throw error;
        }
    }

    buildRiskAnalysisPrompt(customerData, documentText) {
        return `
Please analyze the following customer data for insurance risk assessment:

Customer Information:
- Age: ${customerData.age || 'Not provided'}
- Location: ${customerData.location || 'Not provided'}
- Occupation: ${customerData.occupation || 'Not provided'}
- Previous Claims: ${customerData.previousClaims || 'None reported'}
- Credit Score: ${customerData.creditScore || 'Not provided'}

${documentText ? `Document Analysis:\n${documentText}\n` : ''}

Please provide:
1. Overall risk rating (Low/Medium/High)
2. Key risk factors identified
3. Risk mitigation recommendations
4. Suggested coverage adjustments
5. Pricing adjustment factors (percentage)

Format as JSON with the following structure:
{
    "riskRating": "Low|Medium|High",
    "riskScore": 1-100,
    "keyFactors": ["factor1", "factor2"],
    "recommendations": ["rec1", "rec2"],
    "pricingAdjustment": -20 to +50 (percentage)
}
        `;
    }

    buildPricingPrompt(riskProfile, productType, coverage) {
        return `
Calculate insurance premium for:

Product Type: ${productType}
Risk Profile: ${JSON.stringify(riskProfile)}
Coverage Details: ${JSON.stringify(coverage)}

Base premium calculation should consider:
1. Product type base rates
2. Risk adjustment factors
3. Coverage limits and deductibles
4. Geographic location factors
5. Market competitiveness

Provide detailed premium breakdown as JSON:
{
    "basePremium": number,
    "riskAdjustment": number,
    "coverageAdjustment": number,
    "finalPremium": number,
    "breakdown": {
        "base": number,
        "risk": number,
        "coverage": number,
        "fees": number
    },
    "competitiveRange": {
        "low": number,
        "high": number
    }
}
        `;
    }

    parseRiskAnalysis(content) {
        try {
            // Try to parse JSON response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback parsing for non-JSON responses
            return {
                riskRating: this.extractRiskRating(content),
                riskScore: this.extractRiskScore(content),
                keyFactors: this.extractKeyFactors(content),
                recommendations: this.extractRecommendations(content),
                pricingAdjustment: this.extractPricingAdjustment(content),
                rawAnalysis: content
            };
        } catch (error) {
            console.error('Error parsing risk analysis:', error);
            return {
                riskRating: 'Medium',
                riskScore: 50,
                keyFactors: ['Unable to parse analysis'],
                recommendations: ['Manual review required'],
                pricingAdjustment: 0,
                rawAnalysis: content
            };
        }
    }

    parsePricingRecommendation(content) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback for non-JSON responses
            return {
                basePremium: 1000,
                riskAdjustment: 0,
                coverageAdjustment: 0,
                finalPremium: 1000,
                breakdown: {
                    base: 1000,
                    risk: 0,
                    coverage: 0,
                    fees: 0
                },
                competitiveRange: {
                    low: 800,
                    high: 1200
                },
                rawRecommendation: content
            };
        } catch (error) {
            console.error('Error parsing pricing recommendation:', error);
            return null;
        }
    }

    extractRiskRating(content) {
        const ratingMatch = content.match(/risk rating[:\s]*(low|medium|high)/i);
        return ratingMatch ? ratingMatch[1].charAt(0).toUpperCase() + ratingMatch[1].slice(1).toLowerCase() : 'Medium';
    }

    extractRiskScore(content) {
        const scoreMatch = content.match(/risk score[:\s]*(\d+)/i);
        return scoreMatch ? parseInt(scoreMatch[1]) : 50;
    }

    extractKeyFactors(content) {
        const factorsSection = content.match(/key.*factors?[:\s]*([\s\S]*?)(?:\n\n|\d\.)/i);
        if (factorsSection) {
            return factorsSection[1]
                .split(/[•\-\*\n]/)
                .map(f => f.trim())
                .filter(f => f.length > 0)
                .slice(0, 5);
        }
        return ['Analysis factors not identified'];
    }

    extractRecommendations(content) {
        const recSection = content.match(/recommendations?[:\s]*([\s\S]*?)(?:\n\n|\d\.)/i);
        if (recSection) {
            return recSection[1]
                .split(/[•\-\*\n]/)
                .map(r => r.trim())
                .filter(r => r.length > 0)
                .slice(0, 5);
        }
        return ['Review recommended'];
    }

    extractPricingAdjustment(content) {
        const adjMatch = content.match(/pricing adjustment[:\s]*([+\-]?\d+)%?/i);
        return adjMatch ? parseInt(adjMatch[1]) : 0;
    }
}

export const openAIService = new OpenAIService();