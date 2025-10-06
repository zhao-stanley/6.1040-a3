# Assignment 3: AI-Augmented Concept Design

## Selected Concept: Filter

I've chosen to augment the **Filter** concept from my Boardlord application design. This concept handles the advanced search functionality for discovering climbing routes on training boards. AI augmentation is particularly valuable here because climbers naturally describe their training goals using complex, context-rich language that would be difficult to translate into traditional filter criteria.

## Original Filter Concept (Unchanged)

```
concept Filter [Item]

purpose
    enable advanced search through collections of items based on multiple criteria

principle
    after adding search criteria to a filter, applying it to a collection
    returns only items matching all specified criteria

state
    a set of Filters with
        a filterId String
        a criteria mapping from String to set of Strings  // key-value search criteria

actions
    createFilter(): (filter: Filter)
        effect:
            generate unique filterId
            create filter with empty criteria
            return the created filter

    addCriteria(filter: Filter, key: String, values: set of Strings)
        requires:
            filter exists
        effect:
            add or update criteria[key] = values in filter

    search(filter: Filter, items: set of Items): (results: set of Items)
        requires:
            filter exists
        effect:
            return items that match all criteria in filter

    clearFilter(filter: Filter)
        requires:
            filter exists
        effect:
            remove all criteria from filter
```

## AI-Augmented Filter Concept

```
concept AIFilter [Item]

purpose
    enable search through collections using natural language queries,
    with fallback to manual filtering

principle
    after providing a natural language query, the AI converts climbing terminology
    into structured filter criteria; users can also set criteria manually

state
    a set of Filters with
        a filterId String
        a criteria mapping from String to set of Strings
        a naturalQuery String  // optional natural language query

actions
    createFilter(): (filter: Filter)
        effect:
            generate unique filterId
            create filter with empty criteria and naturalQuery
            return the created filter

    parseQuery(filter: Filter, query: String): (success: Boolean)
        requires:
            filter exists
        effect:
            call LLM to convert query into structured criteria
            if successful: update filter.criteria and set filter.naturalQuery = query
            return success status

    addCriteria(filter: Filter, key: String, values: set of Strings)
        requires:
            filter exists
        effect:
            add or update criteria[key] = values in filter

    search(filter: Filter, items: set of Items): (results: set of Items)
        requires:
            filter exists
        effect:
            return items that match all criteria in filter

    clearFilter(filter: Filter)
        requires:
            filter exists
        effect:
            remove all criteria and clear naturalQuery
```

## AI Enhancement

**Natural Language Query**: Users can search using phrases like "steep crimpy routes for finger strength" instead of manually having to set multiple filter criteria. The query can use climbing terminology and is converted to structured searches, with manual filtering as backup.

## Richer Test Cases and Prompts

The three prompt variants can be located in the `aifilter.ts` file.

### Experimental Test Case 1: Ambiguous and Vague Queries

**Approach**: These queries test how the AI handles subjective language without concrete criteria (e.g., "challenging routes", "good for training", "not too hard but not too easy"). Users often describe needs in vague terms rather than specifying exact grades or hold types.

**What Worked**: The AI successfully interprets most vague terms by making reasonable assumptions (e.g., "challenging" maps to mid-range grades like V5-V7). The system doesn't crash or refuse to process vague queries.

**What Went Wrong**: Different runs may produce inconsistent interpretations of the same vague term. "Good for training" is too broad—it could mean power training, technique work, or endurance building. The AI sometimes picks criteria arbitrarily or makes assumptions that don't match user intent.

**Issues Remaining**: No way to ask for clarification or present multiple interpretations. Users receive results based on AI's interpretation without knowing what assumptions were made. Vague queries may return too many or too few results depending on how conservative the AI's interpretation is.

### Experimental Test Case 2: Complex Multi-Criteria with Ranges

**Approach**: These queries test the AI's ability to handle grade ranges, multiple simultaneous constraints, and exclusion criteria (e.g., "V4 to V6 overhangs with small holds but no slopers").

**What Worked**: The AI successfully expands grade ranges (V4-V6 becomes ["V4", "V5", "V6"]) and can handle multiple criteria at once. The detailed prompt variant with examples significantly improved accuracy for multi-criteria queries.

**What Went Wrong**: The current filter implementation only supports additive criteria (items must match ALL specified criteria). It cannot express exclusions or negations. When a user says "but no slopers," the AI has no way to encode this constraint in the filter structure. The AI may also be unable to parse "subjective" exclusions like "not too technical."

**Issues Remaining**: The Filter concept needs to be extended to support exclusion criteria or negative constraints. This would require modifying the filter state and search logic.

### Experimental Test Case 3: Edge Cases and Colloquial Terminology

**Approach**: Want to test the AI's ability to understand climbing culture and colloquialisms (e.g., "super juggy V2s for warming up", "crimpy overhung stuff for getting stronger fingers"). Terms like "juggy" (informal for routes with very positive holds) and "overhung" (colloquial for steep climbs) require a little more context beyond the "technical" climbing terminology.

**What Worked**: The AI demonstrates surprisingly good understanding of climbing slang. "Juggy" correctly maps to "jug" hold type, "overhung" to "overhang" angle, and informal phrasing is generally parsed correctly. The constrained prompt variant's interpretation guide helps standardize colloquial terms.

**What Went Wrong**: Subjective difficulty phrases like "not impossible" are highly user-dependent. What's impossible for a beginner differs vastly from an expert's perspective. The AI has no user context or skill level information to calibrate difficulty interpretations.

**Issues Remaining**: Lack of user profile or context. The system should ideally know the user's climbing ability to calibrate terms like "challenging," "impossible," or "easy." More niche slang or gym-specific terminology may not be recognized.

## LLM Output Validators

**Validator 1: Field Name Hallucination Prevention** - The LLM might invent field names that don't exist in the `ClimbingRoute` schema (ex: "difficulty" instead of "grade", or entirely fictional fields like "style" or "setter"). This validator checks that all returned fields are in the valid set: `grade`, `angle`, `holdTypes`, `moveTypes`, `goals`. If the LLM hallucinates a field name, the validator throws a descriptive error listing the invalid field and the valid options.

**Validator 2: Invalid Field Values** - The LLM might return values that don't match the domain's valid options, such as "V18" (non-existent grade), "horizontal" instead of "roof" for angles, or misspellings like "crimps" instead of "crimp". This validator maintains Sets of valid values for each field and checks every value against these constraints. It also validates that all values are strings and that fields contain arrays as expected. Invalid values trigger errors specifying which value is invalid and listing all valid options.

**Validator 3: Contradictory/Misinterpretation of Criteria** - The LLM might misinterpret queries and produce logically inconsistent criteria, such as returning both V1 (beginner) and V10 (advanced) grades for a single query about "intermediate routes". This validator handles "suspiciously" large grade ranges (defining this as more than 5 grades apart) where it's possible the LLM misunderstood the difficulty constraint.
