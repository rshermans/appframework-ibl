export const PROMPTS = {
  // Stage 0
  's0-form': `You are beginning Stage 0 of an IBL research project. Your first task is to form a research team.

TASK: Help students establish an effective team by defining:
1. Optimal team size (3–4 members) and rationale
2. Suggested role titles (e.g. Lead Researcher, Communication Manager, Data Analyst, Ethics Officer)
3. Team Charter template (goals, norms, communication plan)
4. Initial AI Use Agreement — what AI is allowed/not allowed to do for the team

Research Topic: [TOPIC]
Level: [LEVEL]`,

  // Stage 1
  'step0': `You are a scientific research advisor supporting Stage 1, Step 0 of an IBL framework.

TASK: Generate 5 candidate research questions on the topic below.
Requirements for each question:
- Scientifically testable or literature-resolvable
- Specific enough to be answered in a 3–6 week project
- Varied in epistemic type (empirical, causal, comparative, mechanistic)
- Appropriate for the level of study

Topic: [TOPIC]

For each question, provide:
→ The question
→ Epistemic type
→ Why it is researchable
→ Potential challenges

Format response as JSON array:
[
  {
    "question": "...",
    "epistemic_type": "...",
    "why_researchable": "...",
    "challenges": "..."
  }
]`,

  'step1': `You are an expert in the philosophy of science supporting Step 1 — Epistemological Analysis.

TASK: Perform a full epistemological analysis of the following research question.

Research Question: [RQ]

Analyse:
1. Epistemic type (empirical / causal / comparative / mechanistic / normative)
2. Scope — too broad, too narrow, or appropriate?
3. Testability — can it be answered with scientific literature?
4. Precision — are all key terms defined?
5. Potential bias or assumption embedded in the question
6. Recommended refinement (improved version)
7. Suitable scientific databases for this question`,

  'step2': `You are a research librarian supporting Step 2 — Search String Construction.

TASK: Build optimised search strings for the following research question.

Research Question: [RQ]

Provide:
1. Core keywords and synonyms
2. Boolean search string (AND/OR/NOT)
3. Recommended MeSH / domain-specific terms
4. 3 ready-to-use search strings for: Web of Science / PubMed / Google Scholar
5. Filters to apply (date range, peer-reviewed, language)`,

  'step4': `You are a scientific evidence analyst supporting Step 4 — Extract Evidence.

TASK: Extract and structure evidence from the provided source.

Research Question: [RQ]
Source: [SOURCE]

Extract:
1. Main hypothesis or claim
2. Methodology used
3. Key findings (bullet points)
4. Statistical significance or effect size (if present)
5. Limitations stated by authors
6. Relevance score to the research question (1–5)
7. Ready-to-use citation (APA 7th)`,

  'step9': `You are a scientific communication specialist supporting Step 9 — Scientific Explanation.

TASK: Guide the student to write a rigorous scientific explanation.

Research Question: [RQ]
Evidence Summary: [EVIDENCE]
Audience: [AUDIENCE]

Structure the explanation with:
1. Opening hook + research question framing
2. Background context (1 paragraph)
3. Evidence synthesis (findings from 3+ sources)
4. Critical analysis (what the evidence does/doesn't prove)
5. Limitations of current knowledge
6. Implications and future directions
7. APA citations

Apply: accuracy, precision, appropriate terminology, hedging language.`,
}

export function getPrompt(stepId: string, variables: Record<string, string>): string {
  let prompt = PROMPTS[stepId as keyof typeof PROMPTS] || ''

  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `[${key.toUpperCase()}]`
    prompt = prompt.replace(placeholder, value)
  })

  return prompt
}
export const prompts = {
  rq_analysis: 'Analyze research questions and provide feedback',
}
