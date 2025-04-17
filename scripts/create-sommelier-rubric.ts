const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

const sommelierRubric = {
  name: 'Sommelier Engagement Evaluation',
  description: 'Specialized rubric for evaluating staff interactions with wine professionals, particularly sommeliers who may be dismissive of regional wines.',
  isDefault: false,
  criteria: [
    {
      id: uuidv4(),
      name: 'Initial Greeting and Professional Recognition',
      description: 'How effectively does the staff member establish professional credibility while welcoming the guest?',
      weight: 10,
      scoringLevels: [
        { score: 1, description: 'No acknowledgment of guest\'s professional background; standard greeting only' },
        { score: 2, description: 'Basic greeting with minimal recognition of guest\'s expertise' },
        { score: 3, description: 'Acknowledges guest\'s professional background but fails to adjust approach accordingly' },
        { score: 4, description: 'Warm, professional greeting that subtly acknowledges the guest\'s expertise' },
        { score: 5, description: 'Exceptional welcome that establishes mutual respect while skillfully recognizing the guest\'s professional status' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Managing Guest Ego',
      description: 'How well does the staff member balance respecting the guest\'s knowledge while still providing value?',
      weight: 12,
      scoringLevels: [
        { score: 1, description: 'Becomes defensive or dismissive of guest\'s expertise' },
        { score: 2, description: 'Appears intimidated by guest\'s knowledge, either over-deferring or overcompensating' },
        { score: 3, description: 'Acknowledges guest\'s expertise but struggles to find the right balance' },
        { score: 4, description: 'Successfully navigates the guest\'s knowledge by finding complementary areas to add value' },
        { score: 5, description: 'Masterfully validates the guest\'s expertise while confidently presenting unique insights that earn respect' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Active Listening and Inquiry',
      description: 'How effectively does the staff member listen to the guest and ask intelligent, targeted questions?',
      weight: 10,
      scoringLevels: [
        { score: 1, description: 'Does not listen actively; asks no meaningful questions' },
        { score: 2, description: 'Limited listening; asks basic questions without building on guest\'s responses' },
        { score: 3, description: 'Listens adequately; asks some good questions but misses opportunities to dig deeper' },
        { score: 4, description: 'Listens attentively; asks thoughtful questions that demonstrate engagement' },
        { score: 5, description: 'Exceptional listening; asks sophisticated questions that both validate the guest\'s knowledge and uncover preferences' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Regional Wine Advocacy',
      description: 'How effectively does the staff member position local wines in relation to internationally recognized regions?',
      weight: 12,
      scoringLevels: [
        { score: 1, description: 'Defensive or apologetic about regional wines compared to famous regions' },
        { score: 2, description: 'Overstates local wines or makes unsupported comparisons to prestigious regions' },
        { score: 3, description: 'Adequately presents regional wines but fails to effectively contextualize them' },
        { score: 4, description: 'Effectively positions regional wines through thoughtful comparisons and contrasts' },
        { score: 5, description: 'Masterfully reframes regional wines as offering unique value distinct from but comparable to famous regions' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Response to Dismissive Comments',
      description: 'How well does the staff member handle potentially negative comments about regional wines?',
      weight: 10,
      scoringLevels: [
        { score: 1, description: 'Becomes defensive, argumentative, or visibly offended' },
        { score: 2, description: 'Appears deflated or agrees with negative assessment' },
        { score: 3, description: 'Remains professional but provides only generic responses to criticism' },
        { score: 4, description: 'Tactfully redirects criticism without becoming defensive' },
        { score: 5, description: 'Skillfully uses dismissive comments as openings to challenge perceptions and create learning moments' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Leveraging Critical Recognition',
      description: 'How effectively does the staff member use scores, reviews, and critical acclaim?',
      weight: 8,
      scoringLevels: [
        { score: 1, description: 'Makes no mention of critical recognition or external validation' },
        { score: 2, description: 'References accolades but in a way that seems desperate or unconvincing' },
        { score: 3, description: 'Mentions critical recognition but fails to connect it to the guest\'s interests' },
        { score: 4, description: 'Effectively incorporates relevant critical acclaim at appropriate moments' },
        { score: 5, description: 'Strategically uses critical validation while demonstrating knowledge of the critics and publications most relevant to the guest' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Restaurant and Prestige Placement Highlighting',
      description: 'How well does the staff member leverage restaurant placements and other social proof?',
      weight: 8,
      scoringLevels: [
        { score: 1, description: 'Makes no mention of restaurant placements or other prestigious accounts' },
        { score: 2, description: 'Mentions placements but without relevance to the guest\'s background' },
        { score: 3, description: 'Adequately references restaurant placements but misses strategic opportunities' },
        { score: 4, description: 'Effectively highlights relevant restaurant or retail placements that would resonate with the guest' },
        { score: 5, description: 'Expertly weaves prestigious placements into the conversation, demonstrating knowledge of establishments the guest would respect' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Trade Relationship Building',
      description: 'How effectively does the staff member establish a professional trade connection?',
      weight: 10,
      scoringLevels: [
        { score: 1, description: 'Fails to recognize trade opportunities or collect contact information' },
        { score: 2, description: 'Acknowledges trade status but provides minimal differentiated experience' },
        { score: 3, description: 'Provides adequate trade treatment but misses opportunities for deeper connection' },
        { score: 4, description: 'Effectively establishes trade relationship and collects appropriate contact information' },
        { score: 5, description: 'Exceptionally builds trade rapport, collecting comprehensive information while creating specific follow-up opportunities' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Sophisticated Selling Approach',
      description: 'How well does the staff member adapt sales techniques for a knowledgeable professional?',
      weight: 10,
      scoringLevels: [
        { score: 1, description: 'Uses generic sales techniques inappropriate for knowledgeable professionals' },
        { score: 2, description: 'Attempted sales techniques feel forced or misaligned with the guest\'s expertise' },
        { score: 3, description: 'Uses adequate sales approaches but fails to truly customize to the guest' },
        { score: 4, description: 'Effectively adapts selling techniques to respect the guest\'s knowledge while still guiding toward purchase' },
        { score: 5, description: 'Masterfully employs sophisticated, peer-level selling approach that respects the guest\'s expertise while still effectively closing sales' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Wine Club and Future Engagement',
      description: 'How effectively does the staff position ongoing relationships for a professional guest?',
      weight: 10,
      scoringLevels: [
        { score: 1, description: 'Makes no attempt to secure future engagement or mentions wine club inappropriately' },
        { score: 2, description: 'Makes generic wine club pitch not tailored to a trade professional' },
        { score: 3, description: 'Adequately mentions future engagement opportunities but without compelling trade benefits' },
        { score: 4, description: 'Effectively positions trade-specific benefits and maintains professional relationship focus' },
        { score: 5, description: 'Exceptionally creates tailored trade relationship plan with clear mutual benefits and specific next steps' }
      ]
    }
  ],
  performanceLevels: [
    { name: 'Exceptional', minScore: 90, maxScore: 100, description: 'Outstanding performance that exceeds expectations in engaging with wine professionals' },
    { name: 'Strong', minScore: 80, maxScore: 89, description: 'Very good performance with minor areas for improvement in professional engagement' },
    { name: 'Proficient', minScore: 70, maxScore: 79, description: 'Solid performance that meets expectations for professional interactions' },
    { name: 'Developing', minScore: 60, maxScore: 69, description: 'Basic performance with significant areas for improvement in professional engagement' },
    { name: 'Needs Improvement', minScore: 0, maxScore: 59, description: 'Performance requiring substantial training in professional wine service' }
  ]
};

async function createSommelierRubric() {
  try {
    console.log('Creating Sommelier Engagement rubric...');
    
    const response = await fetch('http://localhost:3000/api/rubrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sommelierRubric)
    });

    if (!response.ok) {
      throw new Error(`Failed to create rubric: ${response.status}`);
    }

    const createdRubric = await response.json();
    console.log('Successfully created Sommelier Engagement rubric:', createdRubric.id);
    
    return createdRubric;
  } catch (error) {
    console.error('Error creating rubric:', error);
    throw error;
  }
}

// Make sure the development server is running
console.log('Make sure your Next.js development server is running on http://localhost:3000');
console.log('Press any key to create the Sommelier Engagement rubric...');

process.stdin.once('data', () => {
  createSommelierRubric()
    .then(() => {
      console.log('Rubric creation completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to create rubric:', error);
      process.exit(1);
    });
}); 