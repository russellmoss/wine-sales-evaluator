const { evaluateConversationInChunks } = require('../app/utils/conversation-chunker');
const chunkerDotenv = require('dotenv');
const { EvaluationData } = require('../app/types/evaluation');

// Load environment variables
chunkerDotenv.config({ path: '.env.local' });

async function testChunkedEvaluation() {
  try {
    // Sample conversation data
    const conversation = `## Conversation

Staff: Welcome to our winery! I'm Sarah, and I'll be guiding you through our tasting experience today. How are you doing?

Guest: We're doing great, thank you! This is our first time here, and we're really excited to try your wines.

Staff: Wonderful! I'm excited to share our wines with you. Before we begin, I'd love to know what kinds of wines you typically enjoy?

Guest: We both really like bold reds, especially Cabernet Sauvignon and Malbec. But we're open to trying new things!

Staff: Excellent! Our Cabernet Sauvignon is actually one of our signature wines. It's a 2018 vintage with beautiful notes of blackberry and cedar. Would you like to start with that?

Guest: That sounds perfect! We'd love to try it.

Staff: Great choice! *pours wine* While you're tasting, I'd like to tell you about our vineyard. We're a family-owned estate that's been producing wine for three generations. Our Cabernet grapes are grown in the hillside vineyards, which gives them excellent drainage and sun exposure.

Guest: That's fascinating! The wine is really smooth, and I can definitely taste those blackberry notes you mentioned.

Staff: I'm glad you're enjoying it! The smoothness comes from 18 months of aging in French oak barrels. Would you like to try our Malbec next? It's a newer addition to our portfolio, but it's been getting excellent reviews.

Guest: Yes, please! We love Malbec, so we're curious to see how yours compares.

Staff: *pours Malbec* Our Malbec is a 2020 vintage, and what makes it unique is that we blend it with a small amount of Merlot to add some softness to the tannins. Take a moment to notice the deep purple color and the aromas of plum and violet.

Guest: Wow, this is really different from the Malbecs we usually drink. It's more complex, with some spice notes I wasn't expecting.

Staff: That's the Merlot influence! The spice notes you're picking up are from the French oak aging, similar to our Cabernet. Would you like to try our reserve wines? They're only available here at the winery.

Guest: Absolutely! We're really enjoying this experience.

Staff: Perfect! Let me tell you about our reserve program while I prepare those wines...`;

    const staffName = "Sarah";
    const date = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    const rubricId = "wine-sales-default"; // Use the correct default rubric ID

    console.log('Starting chunked evaluation test...');
    console.log('Conversation length:', conversation.length, 'characters');
    
    const evaluation = await evaluateConversationInChunks(
      conversation,
      staffName,
      date,
      rubricId
    );

    console.log('\nEvaluation Results:');
    console.log('------------------');
    console.log('Staff Name:', evaluation.staffName);
    console.log('Date:', evaluation.date);
    console.log('Overall Score:', evaluation.overallScore);
    console.log('Performance Level:', evaluation.performanceLevel);
    
    console.log('\nCriteria Scores:');
    evaluation.criteriaScores.forEach((criterion: { criterion: string; score: number; weight: number }) => {
      console.log(`- ${criterion.criterion}: ${criterion.score}/5 (Weight: ${criterion.weight})`);
    });

    console.log('\nStrengths:');
    evaluation.strengths.forEach((strength: string) => console.log(`- ${strength}`));

    console.log('\nAreas for Improvement:');
    evaluation.areasForImprovement.forEach((area: string) => console.log(`- ${area}`));

    console.log('\nKey Recommendations:');
    evaluation.keyRecommendations.forEach((rec: string) => console.log(`- ${rec}`));

  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testChunkedEvaluation(); 