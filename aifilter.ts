import { GeminiLLM } from "./gemini-llm";

export interface ClimbingRoute {
  name: string;
  grade: string;
  angle: string;
  holdTypes: string[];
  moveTypes: string[];
  goals: string[];
}

export interface Filter {
  filterId: string;
  criteria: Map<string, Set<string>>;
  naturalQuery?: string;
}

export type PromptVariant = "basic" | "detailed" | "constrained";

export class AIFilter {
  private filters: Filter[] = [];
  private filterIdCounter = 0;
  private promptVariant: PromptVariant = "basic";

  createFilter(): Filter {
    const filter: Filter = {
      filterId: `filter_${this.filterIdCounter++}`,
      criteria: new Map(),
    };
    this.filters.push(filter);
    return filter;
  }

  setPromptVariant(variant: PromptVariant): void {
    this.promptVariant = variant;
    console.log(`Prompt variant set to: ${variant}`);
  }

  async parseQuery(
    filter: Filter,
    query: string,
    llm: GeminiLLM
  ): Promise<boolean> {
    try {
      console.log(`Parsing with ${this.promptVariant} prompt variant...`);

      const prompt = this.createParsePrompt(query, this.promptVariant);
      const text = await llm.executeLLM(prompt);

      console.log("Received response from Gemini AI!");
      console.log("\nRAW GEMINI RESPONSE");
      console.log("======================");
      console.log(text);
      console.log("======================\n");

      const success = this.parseAndApplyCriteria(text, filter);

      if (success) {
        filter.naturalQuery = query;
        console.log("Successfully parsed query into filter criteria");
      }

      return success;
    } catch (error) {
      console.error("Error calling Gemini API:", (error as Error).message);
      return false;
    }
  }

  private createParsePrompt(query: string, variant: PromptVariant): string {
    if (variant === "basic") {
      return this.createBasicPrompt(query);
    } else if (variant === "detailed") {
      return this.createDetailedPrompt(query);
    } else {
      return this.createConstrainedPrompt(query);
    }
  }

  /**
   * PROMPT VARIANT 1: Basic (Original)
   * Simple prompt with minimal guidance
   */
  private createBasicPrompt(query: string): string {
    return `
You are a helpful AI assistant that understands climbing terminology and converts natural language queries into structured filter criteria for climbing routes.

CLIMBING TERMINOLOGY:
- Grades: V0-V17 (bouldering grades)
- Angles: slab (< 90°), vertical (90°), overhang (> 90°), roof (horizontal)
- Hold Types: crimp, jug, sloper, pinch, pocket
- Move Types: static, dynamic, compression, tension, coordination
- Training Goals: finger strength, power, endurance, technique, flexibility

USER QUERY:
"${query}"

Convert this query into structured filter criteria. Return ONLY a JSON object with this structure:
{
  "grade": ["V1", "V2"],
  "angle": ["overhang"],
  "holdTypes": ["crimp", "pinch"],
  "moveTypes": ["static"],
  "goals": ["finger strength"]
}

RULES:
- Only include fields that are relevant to the query
- Use arrays even for single values
- Use standard climbing terminology
- If query mentions difficulty, map to grade range
- If query is ambiguous, make reasonable assumptions

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * PROMPT VARIANT 2: Detailed
   * Provides explicit examples and handling for ambiguous cases
   */
  private createDetailedPrompt(query: string): string {
    return `
You are an expert climbing route recommender. Convert natural language queries into structured filter criteria.

TERMINOLOGY REFERENCE:
- Grades: V0-V2 (beginner), V3-V5 (intermediate), V6-V8 (advanced), V9+ (expert)
- Angles: slab, vertical, overhang, roof
- Hold Types: crimp (small edges), jug (large holds), sloper (rounded), pinch, pocket
- Move Types: static (controlled), dynamic (powerful), compression, tension, coordination
- Training Goals: finger strength, power, endurance, technique, flexibility

HANDLING AMBIGUITY:
- "challenging" → V5-V7 range
- "easy" or "beginner" → V0-V2
- "intermediate" → V3-V5
- "powerful" → goals: ["power"], moveTypes: ["dynamic"]
- "technical" → goals: ["technique"], moveTypes: ["static"]
- "training" → include relevant goals based on context
- Ranges like "V4 to V6" → include all grades in between

USER QUERY:
"${query}"

EXAMPLES:
Query: "challenging crimpy routes"
Output: {"grade": ["V5", "V6", "V7"], "holdTypes": ["crimp"]}

Query: "beginner friendly with big holds"
Output: {"grade": ["V0", "V1", "V2"], "holdTypes": ["jug"]}

Query: "powerful overhang climbs"
Output: {"angle": ["overhang"], "goals": ["power"], "moveTypes": ["dynamic"]}

Now convert the user query into JSON format:
{
  "grade": [...],
  "angle": [...],
  "holdTypes": [...],
  "moveTypes": [...],
  "goals": [...]
}

CRITICAL: Return ONLY the JSON object with fields relevant to the query. Omit empty fields.`;
  }

  /**
   * PROMPT VARIANT 3: Constrained
   * Adds validation and forces the AI to stay within bounds
   */
  private createConstrainedPrompt(query: string): string {
    return `
You are a precise climbing route filter assistant. Your task is to convert queries into VALID, SPECIFIC filter criteria.

VALID VALUES (use ONLY these):
Grades: V0, V1, V2, V3, V4, V5, V6, V7, V8, V9, V10, V11, V12, V13, V14, V15, V16, V17
Angles: slab, vertical, overhang, roof
HoldTypes: crimp, jug, sloper, pinch, pocket
MoveTypes: static, dynamic, compression, tension, coordination
Goals: finger strength, power, endurance, technique, flexibility

INTERPRETATION GUIDE:
Subjective terms must map to concrete values:
- "easy/beginner/warmup" = V0,V1,V2
- "intermediate/moderate" = V3,V4,V5
- "hard/challenging/difficult" = V5,V6,V7
- "advanced/very hard" = V7,V8,V9
- "expert/extreme" = V10+
- "powerful/dynamic" = goals:power + moveTypes:dynamic
- "technical/precise" = goals:technique + moveTypes:static
- "small holds" = crimp,pinch,pocket
- "big holds" = jug
- "juggy" = jug
- "crimpy" = crimp

USER QUERY: "${query}"

VALIDATION RULES:
1. Use ONLY values from the valid lists above
2. For grade ranges, list each grade explicitly (e.g., V4-V6 = ["V4","V5","V6"])
3. Convert colloquial terms using the interpretation guide
4. If query is too vague, use most common interpretation
5. Omit fields that cannot be determined from query
6. NEVER include fields with empty arrays

OUTPUT FORMAT (JSON only, no explanation):
{
  "grade": ["V4", "V5"],
  "angle": ["overhang"],
  "holdTypes": ["crimp"],
  "moveTypes": ["static"],
  "goals": ["finger strength"]
}

Generate the JSON now:`;
  }

  private parseAndApplyCriteria(responseText: string, filter: Filter): boolean {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      console.log("Applying parsed criteria...");

      // Run validators before applying criteria
      this.validateLLMOutput(parsed);

      for (const [key, values] of Object.entries(parsed)) {
        if (Array.isArray(values) && values.length > 0) {
          this.addCriteria(filter, key, new Set(values));
          console.log(`Added criteria: ${key} = [${values.join(", ")}]`);
        }
      }

      return true;
    } catch (error) {
      console.error("Error parsing LLM response:", (error as Error).message);
      return false;
    }
  }

  /**
   * VALIDATOR: Check LLM output for common issues
   * Validates field names, field values, and prevents hallucinations
   */
  private validateLLMOutput(parsed: any): void {
    const validationErrors: string[] = [];

    // Define valid values for each field
    const VALID_FIELDS = new Set([
      "grade",
      "angle",
      "holdTypes",
      "moveTypes",
      "goals",
    ]);
    const VALID_GRADES = new Set([
      "V0",
      "V1",
      "V2",
      "V3",
      "V4",
      "V5",
      "V6",
      "V7",
      "V8",
      "V9",
      "V10",
      "V11",
      "V12",
      "V13",
      "V14",
      "V15",
      "V16",
      "V17",
    ]);
    const VALID_ANGLES = new Set(["slab", "vertical", "overhang", "roof"]);
    const VALID_HOLD_TYPES = new Set([
      "crimp",
      "jug",
      "sloper",
      "pinch",
      "pocket",
    ]);
    const VALID_MOVE_TYPES = new Set([
      "static",
      "dynamic",
      "compression",
      "tension",
      "coordination",
    ]);
    const VALID_GOALS = new Set([
      "finger strength",
      "power",
      "endurance",
      "technique",
      "flexibility",
    ]);

    // VALIDATOR 1
    for (const key of Object.keys(parsed)) {
      if (!VALID_FIELDS.has(key)) {
        validationErrors.push(
          `Invalid field "${key}". LLM hallucinated a field that doesn't exist in ClimbingRoute schema. Valid fields: ${Array.from(
            VALID_FIELDS
          ).join(", ")}`
        );
      }
    }

    // VALIDATOR 2
    for (const [key, values] of Object.entries(parsed)) {
      if (!Array.isArray(values)) {
        validationErrors.push(
          `Field "${key}" must be an array, but got ${typeof values}`
        );
        continue;
      }

      for (const value of values) {
        if (typeof value !== "string") {
          validationErrors.push(
            `All values in "${key}" must be strings, but got ${typeof value}: ${value}`
          );
          continue;
        }

        let isValid = false;
        let validValues: Set<string> | null = null;

        switch (key) {
          case "grade":
            isValid = VALID_GRADES.has(value);
            validValues = VALID_GRADES;
            break;
          case "angle":
            isValid = VALID_ANGLES.has(value);
            validValues = VALID_ANGLES;
            break;
          case "holdTypes":
            isValid = VALID_HOLD_TYPES.has(value);
            validValues = VALID_HOLD_TYPES;
            break;
          case "moveTypes":
            isValid = VALID_MOVE_TYPES.has(value);
            validValues = VALID_MOVE_TYPES;
            break;
          case "goals":
            isValid = VALID_GOALS.has(value);
            validValues = VALID_GOALS;
            break;
          default:
            isValid = true;
        }

        if (!isValid && validValues) {
          validationErrors.push(
            `Invalid value "${value}" in field "${key}". Valid values: ${Array.from(
              validValues
            ).join(", ")}`
          );
        }
      }
    }

    // VALIDATOR 3
    if (parsed.grade && Array.isArray(parsed.grade)) {
      const grades = parsed.grade
        .map((g: string) => {
          const match = g.match(/V(\d+)/);
          return match ? parseInt(match[1]) : -1;
        })
        .filter((n: number) => n >= 0);

      if (grades.length > 1) {
        const minGrade = Math.min(...grades);
        const maxGrade = Math.max(...grades);
        const range = maxGrade - minGrade;

        // Check if grade range is suspiciously large (> 5 grades apart suggests confusion)
        if (range > 5) {
          validationErrors.push(
            `Grade range is large (V${minGrade} to V${maxGrade}, span of ${range}). LLM may have misunderstood the difficulty constraint.`
          );
        }
      }
    }

    if (validationErrors.length > 0) {
      throw new Error(
        `LLM output validation failed:\n- ${validationErrors.join("\n- ")}`
      );
    }
  }

  addCriteria(filter: Filter, key: string, values: Set<string>): void {
    filter.criteria.set(key, values);
  }

  search(filter: Filter, routes: ClimbingRoute[]): ClimbingRoute[] {
    return routes.filter((route) => this.matchesFilter(route, filter));
  }

  private matchesFilter(route: ClimbingRoute, filter: Filter): boolean {
    for (const [key, values] of filter.criteria.entries()) {
      const routeValue = (route as any)[key];

      if (Array.isArray(routeValue)) {
        // Check if any route value matches any filter value
        const hasMatch = routeValue.some((v) => values.has(v));
        if (!hasMatch) return false;
      } else {
        // Single value field
        if (!values.has(routeValue)) return false;
      }
    }
    return true;
  }

  clearFilter(filter: Filter): void {
    filter.criteria.clear();
    filter.naturalQuery = undefined;
  }

  displayFilter(filter: Filter): void {
    console.log(`\nFilter: ${filter.filterId}`);
    console.log("==================");

    if (filter.naturalQuery) {
      console.log(`Natural Query: "${filter.naturalQuery}"`);
    }

    if (filter.criteria.size === 0) {
      console.log("No criteria set");
    } else {
      console.log("Criteria:");
      for (const [key, values] of filter.criteria.entries()) {
        console.log(`  ${key}: [${Array.from(values).join(", ")}]`);
      }
    }
  }

  displayResults(routes: ClimbingRoute[]): void {
    console.log(`\nSearch Results (${routes.length} routes found)`);
    console.log("==================");

    if (routes.length === 0) {
      console.log("No routes match the filter criteria");
    } else {
      routes.forEach((route) => {
        console.log(`\n${route.name} (${route.grade})`);
        console.log(`  Angle: ${route.angle}`);
        console.log(`  Holds: ${route.holdTypes.join(", ")}`);
        console.log(`  Moves: ${route.moveTypes.join(", ")}`);
        console.log(`  Goals: ${route.goals.join(", ")}`);
      });
    }
  }
}
