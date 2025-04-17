# Customizing the Wine Sales Evaluator Without Code

As a winery general manager who develops apps to solve winery problems, you'll be pleased to know that you can customize the evaluation rubric and criteria without writing any code. The application is designed to use natural language prompts that you can modify to change how conversations are evaluated.

## Where to Find and Modify the Evaluation Rubric

### Primary Rubric Location

The main evaluation rubric is stored as a markdown file at:
```
public/data/wines_sales_rubric.md
```

This is the simplest place to make changes. You can modify this file directly using any text editor.

### How the Rubric Works

The rubric uses a clear, human-readable format that defines:
- Evaluation criteria (e.g., "Initial Greeting and Welcome")
- Weight for each criterion (e.g., 8%)
- Scoring guidelines (1-5 scale with descriptions)

When you modify this file, you're directly changing what Claude will look for when evaluating wine tasting room conversations.

## Making Common Modifications

### 1. Changing Criteria Weights

To adjust how important each criterion is, simply change the weight percentage in the rubric file. For example:

```markdown
### 1. Initial Greeting and Welcome (Weight: 8%)
```

Change to:

```markdown
### 1. Initial Greeting and Welcome (Weight: 12%)
```

### 2. Adding New Criteria

You can add entirely new criteria by adding new sections to the rubric following the same format:

```markdown
### 11. Knowledge of Regional Wine History (Weight: 10%)
*How well does the staff member demonstrate knowledge of regional wine history?*

| Score | Description |
|-------|-------------|
| 1 | No mention of regional wine history |
| 2 | Basic facts about regional wine history |
| 3 | Solid understanding of regional wine development |
| 4 | Detailed knowledge with compelling storytelling |
| 5 | Expert knowledge that enhances the tasting experience |
```

### 3. Modifying Scoring Guidelines

You can change what constitutes a good or poor performance by adjusting the descriptions:

```markdown
| Score | Description |
|-------|-------------|
| 1 | No greeting or unwelcoming approach |
| 2 | Basic greeting but minimal warmth |
| 3 | Friendly greeting but lacks personalization |
| 4 | Warm, friendly greeting with good eye contact |
| 5 | Exceptional welcome that makes guests feel valued and excited |
```

### 4. Adjusting Performance Level Thresholds

You can change the overall scoring thresholds in the "Performance Levels" section:

```markdown
### Performance Levels
* **Exceptional**: 90-100%
* **Strong**: 80-89%
* **Proficient**: 70-79%
* **Developing**: 60-69%
* **Needs Improvement**: Below 60%
```

## Modifying Claude's Evaluation Prompts

If you want to go deeper and modify how Claude evaluates beyond just changing the rubric, you can edit the prompt templates.

### Main Evaluation Prompt

The primary evaluation prompt is located in:
```
app/api/analyze-conversation/route.ts
```

Look for the section that starts with:

```typescript
const response = await anthropic.messages.create({
  model: "claude-3-7-sonnet-20250219",
  max_tokens: 8000,
  system: "You are a wine sales trainer evaluating a conversation between a winery staff member and guests. Your evaluation should be thorough, fair, and actionable. Provide detailed rationale for each criterion score with specific examples from the conversation.",
  messages: [
    { 
      role: "user", 
      content: `I need you to evaluate the wine tasting conversation below against the criteria in the evaluation rubric. Format your evaluation in JSON structure. Please follow these instructions:
```

You can modify:

1. The system prompt to change Claude's overall approach to evaluation
2. The user prompt to change specific evaluation instructions

For example, you might want to add:
- Different focus areas for evaluation
- Additional output requirements
- Specific examples to look for
- Different formatting preferences

### Alternate Evaluation Prompt (Background Function)

There's a secondary evaluation prompt in:
```
netlify/functions/analyze-conversation-background.ts
```

This contains similar prompts that you can modify.

## Adding Custom Instructions Without Code

You can add special instructions to guide Claude in how to evaluate certain behaviors by adding blocks of text to the rubric or the prompts. For example:

```markdown
## Special Focus Areas

When evaluating Wine Club Presentation, pay particular attention to:
- How early in the conversation the wine club is mentioned
- Whether membership levels are clearly explained
- If the staff member connects wine club benefits to the specific wines the guest enjoyed
- Whether exclusive wine club offerings are highlighted
```

## Important Files to Know About

1. `public/data/wines_sales_rubric.md` - The main evaluation rubric
2. `app/api/analyze-conversation/route.ts` - Contains the main Claude API call and evaluation prompt
3. `netlify/functions/analyze-conversation-background.ts` - Contains background processing logic and backup evaluation prompt
4. `evaluation_example.json` - Shows the expected output format

## Tips for Effective Customization

1. **Make incremental changes**: Change one aspect at a time and test it
2. **Keep language clear and specific**: Claude responds best to clear instructions
3. **Add examples**: If you want Claude to look for specific behaviors, describe them clearly
4. **Balance weights carefully**: Ensure all weights still add up to 100%
5. **Maintain format consistency**: Keep the same markdown structure for good compatibility

By modifying these files, you can substantially change how the evaluator judges wine tasting conversations without needing to write any code. The application is designed to pass your natural language instructions directly to Claude, making customization accessible even without programming knowledge.
