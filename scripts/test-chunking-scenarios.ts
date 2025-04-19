import { evaluateConversationInChunks } from '../app/utils/conversation-chunker';
import * as dotenv from 'dotenv';
import { EvaluationData } from '../app/types/evaluation';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Validate required environment variables
const requiredEnvVars = ['CLAUDE_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please ensure these variables are set in your .env.local file');
  process.exit(1);
}

// Temporarily override chunk size for testing
const originalChunkConfig = { ...process.env };
process.env.CHUNK_MAX_SIZE = '1000'; // Set a smaller chunk size for testing
process.env.CHUNK_OVERLAP_SIZE = '100';

console.log('\nChunk Configuration:');
console.log('------------------');
console.log('Max Chunk Size:', process.env.CHUNK_MAX_SIZE);
console.log('Overlap Size:', process.env.CHUNK_OVERLAP_SIZE);

// Sample short conversation (should not trigger chunking)
const shortConversation = `## Conversation

Staff: Welcome to our winery! I'm Sarah, and I'll be guiding you through our tasting experience today. How are you doing?

Guest: We're doing great, thank you! This is our first time here, and we're really excited to try your wines.

Staff: Wonderful! I'm excited to share our wines with you. Before we begin, I'd love to know what kinds of wines you typically enjoy?

Guest: We both really like bold reds, especially Cabernet Sauvignon and Malbec. But we're open to trying new things!

Staff: Excellent! Our Cabernet Sauvignon is actually one of our signature wines. It's a 2018 vintage with beautiful notes of blackberry and cedar. Would you like to start with that?

Guest: That sounds perfect! We'd love to try it.`;

// Sample medium conversation (might trigger chunking depending on settings)
const mediumConversation = `## Conversation

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

// Sample long conversation (should definitely trigger chunking)
const longConversation = `## Conversation

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

Staff: Perfect! Let me tell you about our reserve program while I prepare those wines. Our reserve wines are produced in very limited quantities, typically less than 100 cases per vintage. They're made from grapes grown in our oldest vineyards, which have the deepest roots and produce the most concentrated fruit.

Guest: That sounds amazing! We love trying unique wines that you can't find everywhere.

Staff: I think you'll really enjoy these then. *pours reserve Cabernet* This is our 2017 Reserve Cabernet Sauvignon. It's aged for 24 months in new French oak barrels, which gives it those rich vanilla and spice notes. Notice how the tannins are still firm but velvety - that's a sign of a well-structured wine that will age beautifully.

Guest: This is incredible! The complexity is unlike anything we've tasted today.

Staff: I'm so glad you like it! The complexity comes from our unique terroir. Our vineyard sits on a ridge that gets morning fog but afternoon sun, creating perfect conditions for slow, even ripening. This allows the grapes to develop full flavor while maintaining good acidity.

Guest: We've learned so much today! Your knowledge is impressive.

Staff: Thank you! I'm passionate about our wines and love sharing that passion with guests. Speaking of which, have you ever considered joining a wine club? Our club members get exclusive access to our reserve wines, plus invitations to special events throughout the year.

Guest: That sounds interesting. Tell me more about the wine club.

Staff: Our wine club has three tiers to suit different preferences and budgets. The Explorer tier is perfect for those who want to discover new wines, with quarterly shipments of 2 bottles. The Enthusiast tier includes 4 bottles quarterly, and our Collector tier offers 6 bottles plus first access to our limited releases.

Guest: The Enthusiast tier sounds right up our alley. How much is it?

Staff: The Enthusiast tier is $240 per quarter, which includes shipping. You can customize your shipments to focus on reds, whites, or a mix. Plus, you get 15% off all wine purchases and complimentary tastings whenever you visit.

Guest: That's a great value! We'd love to join.

Staff: Fantastic! I'll get you set up right away. *retrieves iPad* I'll just need your contact information to create your account. What's the best email to reach you at?

Guest: Sure, it's john.doe@example.com.

Staff: Perfect, and what's your phone number?

Guest: 555-123-4567.

Staff: Great! And would you like to set up automatic billing, or would you prefer to pay each quarter?

Guest: Automatic billing would be easiest.

Staff: Excellent choice! *enters information* I've got you all set up in the Enthusiast tier. Your first shipment will go out next month, and you'll receive a confirmation email with all the details. Is there anything else you'd like to know about the wine club?

Guest: I think that covers everything. Thank you for the wonderful experience today!

Staff: It was my pleasure! Before you go, I'd love to know which wines you enjoyed the most today. We can include similar styles in your first shipment.

Guest: We really loved the Malbec and the Reserve Cabernet.

Staff: Excellent choices! I'll make a note to include those in your first shipment. Is there anything else you'd like to take home with you today?

Guest: Yes, we'd like to buy a case of the Malbec and two bottles of the Reserve Cabernet.

Staff: Wonderful! I'll have those ready for you at the counter. It's been a pleasure hosting you today, and I look forward to seeing you again soon. Don't forget that as club members, you're invited to our harvest celebration next month. I'll send you the details via email.

Guest: We can't wait! Thank you for everything, Sarah.

Staff: You're very welcome! Enjoy your wines, and I hope to see you at the harvest celebration. Have a wonderful day!

Guest: Thank you! We'll definitely be back.

Staff: I look forward to it! Before you go, let me tell you about our upcoming events. Next month we're hosting a special tasting focused on our reserve wines, and in two months we'll have our annual harvest celebration. As club members, you'll get priority access to both events.

Guest: That sounds wonderful! We'll make sure to mark our calendars.

Staff: Perfect! I'll send you the event details via email. And don't forget that as club members, you get 15% off all wine purchases, including today's purchase of the Malbec and Reserve Cabernet.

Guest: That's great! We're really looking forward to being part of the wine club.

Staff: We're excited to have you join our wine club family! Your membership card will be mailed to you within the next week. You can use it for your discount on future purchases and to check in for your complimentary tastings.

Guest: Thank you for all the information. This has been such a great experience!

Staff: It's been my pleasure! Is there anything else you'd like to know about our wines or the wine club?

Guest: I think we're all set. Thank you for your excellent service today!

Staff: You're very welcome! Enjoy your wines, and I look forward to seeing you at our upcoming events. Have a wonderful day!

Guest: You too! Thanks again!

Staff: Take care! And remember, if you have any questions about your wine club membership or want to make changes to your shipment preferences, just give us a call or send us an email. We're here to help!

Guest: Will do! Thanks!

Staff: You're welcome! Safe travels!

Guest: Thanks! Bye!

Staff: Goodbye!`;

async function testChunkingScenarios() {
  try {
    const staffName = "Sarah";
    const date = new Date().toISOString().split('T')[0];
    const rubricId = "wine-sales-default";
    const maxChunkSize = 1000;
    const overlapSize = 100;

    console.log('\nChunk Configuration:');
    console.log('------------------');
    console.log('Max Chunk Size:', maxChunkSize);
    console.log('Overlap Size:', overlapSize);

    // Test short conversation
    console.log('\n\n=== TESTING SHORT CONVERSATION ===');
    console.log('Conversation length:', shortConversation.length, 'characters');
    
    const shortEvaluation = await evaluateConversationInChunks(
      shortConversation,
      staffName,
      date,
      rubricId,
      maxChunkSize,
      overlapSize
    );

    console.log('\nShort Conversation Evaluation:');
    console.log('------------------');
    console.log('Overall Score:', shortEvaluation.overallScore);
    console.log('Performance Level:', shortEvaluation.performanceLevel);
    console.log('Number of Chunks:', shortEvaluation.metadata?.chunkCount || 1);
    
    // Test medium conversation
    console.log('\n\n=== TESTING MEDIUM CONVERSATION ===');
    console.log('Conversation length:', mediumConversation.length, 'characters');
    
    const mediumEvaluation = await evaluateConversationInChunks(
      mediumConversation,
      staffName,
      date,
      rubricId,
      maxChunkSize,
      overlapSize
    );

    console.log('\nMedium Conversation Evaluation:');
    console.log('------------------');
    console.log('Overall Score:', mediumEvaluation.overallScore);
    console.log('Performance Level:', mediumEvaluation.performanceLevel);
    console.log('Number of Chunks:', mediumEvaluation.metadata?.chunkCount || 1);
    
    // Test long conversation
    console.log('\n\n=== TESTING LONG CONVERSATION ===');
    console.log('Conversation length:', longConversation.length, 'characters');
    
    const longEvaluation = await evaluateConversationInChunks(
      longConversation,
      staffName,
      date,
      rubricId,
      maxChunkSize,
      overlapSize
    );

    console.log('\nLong Conversation Evaluation:');
    console.log('------------------');
    console.log('Overall Score:', longEvaluation.overallScore);
    console.log('Performance Level:', longEvaluation.performanceLevel);
    console.log('Number of Chunks:', longEvaluation.metadata?.chunkCount || 1);
    
    // Compare results
    console.log('\n\n=== COMPARISON OF RESULTS ===');
    console.log('------------------');
    console.log('Short Conversation Score:', shortEvaluation.overallScore);
    console.log('Medium Conversation Score:', mediumEvaluation.overallScore);
    console.log('Long Conversation Score:', longEvaluation.overallScore);
    
    // Check if chunking was triggered
    console.log('\n\n=== CHUNKING ANALYSIS ===');
    console.log('------------------');
    console.log('Short Conversation (', shortConversation.length, 'chars):', shortEvaluation.metadata?.chunkCount || 1, 'chunks');
    console.log('Medium Conversation (', mediumConversation.length, 'chars):', mediumEvaluation.metadata?.chunkCount || 1, 'chunks');
    console.log('Long Conversation (', longConversation.length, 'chars):', longEvaluation.metadata?.chunkCount || 1, 'chunks');

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Restore original environment variables
    process.env = originalChunkConfig;
  }
}

// Run the test
testChunkingScenarios(); 