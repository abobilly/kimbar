# Create Implementation Plan

Use the **Planner** agent to decompose this task into an implementable spec.

## Goal

<!-- Replace with your goal/issue description -->
$GOAL

## Instructions

1. Read the goal above
2. Research the codebase to understand scope
3. Decompose into 5–10 ordered steps with acceptance criteria
4. Identify "do not touch" areas (check `.github/copilot-instructions.md` for sacred invariants)
5. Write the plan to `.ai/plans/$SLUG.md`

## Output

Save the plan to: `.ai/plans/$SLUG.md`

Use the format defined in `.github/agents/planner.agent.md`.

## After Planning

1. Review the generated plan
2. Approve or request changes
3. Pass to implementation:
   - **Local**: `node tools/bounce.mjs --plan .ai/plans/$SLUG.md`
   - **Manual**: Follow steps in the plan
   - **GitHub**: Assign to Copilot coding agent with plan link
