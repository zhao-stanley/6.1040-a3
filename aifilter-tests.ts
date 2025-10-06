/**
 * AIFilter Test Cases
 *
 * Demonstrates both manual filtering and LLM-assisted natural language queries
 */

import { AIFilter, ClimbingRoute } from "./aifilter";
import { GeminiLLM, Config } from "./gemini-llm";

/**
 * Sample climbing routes for testing
 * Simulating routes, actual routes wouldn't contain goals, movetypes, etc. Would only contain literal holds,
 * in which may need to categorize them separately
 */
const sampleRoutes: ClimbingRoute[] = [
  {
    name: "Crimper's Delight",
    grade: "V4",
    angle: "overhang",
    holdTypes: ["crimp", "pinch"],
    moveTypes: ["static", "tension"],
    goals: ["finger strength", "technique"],
  },
  {
    name: "Jug Haul",
    grade: "V2",
    angle: "vertical",
    holdTypes: ["jug"],
    moveTypes: ["dynamic"],
    goals: ["endurance", "power"],
  },
  {
    name: "Sloper Heaven",
    grade: "V6",
    angle: "overhang",
    holdTypes: ["sloper"],
    moveTypes: ["compression", "tension"],
    goals: ["power", "technique"],
  },
  {
    name: "Pocket Rocket",
    grade: "V5",
    angle: "overhang",
    holdTypes: ["pocket", "crimp"],
    moveTypes: ["static"],
    goals: ["finger strength"],
  },
  {
    name: "Easy Climb",
    grade: "V1",
    angle: "slab",
    holdTypes: ["jug", "sloper"],
    moveTypes: ["static"],
    goals: ["technique", "flexibility"],
  },
  {
    name: "Roof Master",
    grade: "V7",
    angle: "roof",
    holdTypes: ["pinch", "sloper"],
    moveTypes: ["compression", "coordination"],
    goals: ["power", "technique"],
  },
];

/**
 * Load configuration from config.json
 */
function loadConfig(): Config {
  try {
    const config = require("../config.json");
    return config;
  } catch (error) {
    console.error(
      "Error loading config.json. Please ensure it exists with your API key."
    );
    console.error("Error details:", (error as Error).message);
    process.exit(1);
  }
}

/**
 * Test case 1: Manual filtering
 */
export async function testManualFiltering(): Promise<void> {
  console.log("\nTEST CASE 1: Manual Filtering");
  console.log("==================================");

  const filter = new AIFilter();
  const myFilter = filter.createFilter();

  console.log("Setting manual criteria: grade=V4, holdTypes includes crimp");
  filter.addCriteria(myFilter, "grade", new Set(["V4"]));
  filter.addCriteria(myFilter, "holdTypes", new Set(["crimp"]));

  filter.displayFilter(myFilter);

  const results = filter.search(myFilter, sampleRoutes);
  filter.displayResults(results);
}

/**
 * Test case 2: LLM-assisted natural language query
 */
export async function testNaturalLanguageQuery(): Promise<void> {
  console.log("\nTEST CASE 2: Natural Language Query");
  console.log("========================================");

  const filter = new AIFilter();
  const config = loadConfig();
  const llm = new GeminiLLM(config);
  const myFilter = filter.createFilter();

  const query = "steep crimpy routes for finger strength";
  console.log(`\nNatural language query: "${query}"`);

  const success = await filter.parseQuery(myFilter, query, llm);

  if (success) {
    filter.displayFilter(myFilter);
    const results = filter.search(myFilter, sampleRoutes);
    filter.displayResults(results);
  } else {
    console.log("Failed to parse query");
  }
}

/**
 * Test case 3: Multiple natural language queries
 */
export async function testMultipleQueries(): Promise<void> {
  console.log("\nTEST CASE 3: Multiple Natural Language Queries");
  console.log("==================================================");

  const filter = new AIFilter();
  const config = loadConfig();
  const llm = new GeminiLLM(config);

  const queries = [
    "easy routes with big holds for beginners",
    "powerful roof climbs for training",
    "V5 to V6 routes on overhangs",
  ];

  for (const query of queries) {
    const myFilter = filter.createFilter();
    console.log(`\nQuery: "${query}"`);

    const success = await filter.parseQuery(myFilter, query, llm);

    if (success) {
      filter.displayFilter(myFilter);
      const results = filter.search(myFilter, sampleRoutes);
      filter.displayResults(results);
    }
  }
}

/**
 * Test case 4: Mixed approach (manual + LLM refinement)
 */
export async function testMixedFiltering(): Promise<void> {
  console.log("\nTEST CASE 4: Mixed Filtering (Manual + LLM)");
  console.log("================================================");

  const filter = new AIFilter();
  const config = loadConfig();
  const llm = new GeminiLLM(config);
  const myFilter = filter.createFilter();

  console.log("Starting with manual criteria: angle=overhang");
  filter.addCriteria(myFilter, "angle", new Set(["overhang"]));

  console.log("\nResults after manual filter:");
  filter.displayFilter(myFilter);
  let results = filter.search(myFilter, sampleRoutes);
  filter.displayResults(results);

  console.log(
    '\nRefining with natural language: "good for finger strength training"'
  );
  await filter.parseQuery(myFilter, "good for finger strength training", llm);

  console.log("\nResults after LLM refinement:");
  filter.displayFilter(myFilter);
  results = filter.search(myFilter, sampleRoutes);
  filter.displayResults(results);
}

/**
 * EXPERIMENTAL TEST CASE 1: Ambiguous and Vague Queries
 * Tests how the AI handles subjective or imprecise language
 */
export async function testAmbiguousQueries(): Promise<void> {
  console.log("\nEXPERIMENTAL TEST 1: Ambiguous Queries");
  console.log("==========================================");

  const filter = new AIFilter();
  const config = loadConfig();
  const llm = new GeminiLLM(config);

  const ambiguousQueries = [
    "challenging routes",
    "good for training",
    "not too hard but not too easy",
  ];

  for (const query of ambiguousQueries) {
    console.log(`\nAmbiguous query: "${query}"`);
    const myFilter = filter.createFilter();

    const success = await filter.parseQuery(myFilter, query, llm);

    if (success) {
      filter.displayFilter(myFilter);
      const results = filter.search(myFilter, sampleRoutes);
      filter.displayResults(results);
    } else {
      console.log("Failed to parse ambiguous query");
    }
  }
}

/**
 * EXPERIMENTAL TEST CASE 2: Complex Multi-Criteria with Ranges
 * Tests handling of grade ranges, multiple constraints, and exclusions
 */
export async function testComplexCriteria(): Promise<void> {
  console.log("\nEXPERIMENTAL TEST 2: Complex Multi-Criteria");
  console.log("===============================================");

  const filter = new AIFilter();
  const config = loadConfig();
  const llm = new GeminiLLM(config);

  const complexQueries = [
    "V4 to V6 overhangs with small holds but no slopers",
    "powerful routes that aren't too technical",
    "beginner friendly climbs between V0-V3 on vertical or slab walls",
  ];

  for (const query of complexQueries) {
    console.log(`\nComplex query: "${query}"`);
    const myFilter = filter.createFilter();

    const success = await filter.parseQuery(myFilter, query, llm);

    if (success) {
      filter.displayFilter(myFilter);
      const results = filter.search(myFilter, sampleRoutes);
      filter.displayResults(results);
    } else {
      console.log("Failed to parse complex query");
    }
  }
}

/**
 * EXPERIMENTAL TEST CASE 3: Edge Cases and Unusual Terminology
 * Tests typos, colloquialisms, and non-standard climbing terms
 */
export async function testEdgeCases(): Promise<void> {
  console.log("\nEXPERIMENTAL TEST 3: Edge Cases");
  console.log("===================================");

  const filter = new AIFilter();
  const config = loadConfig();
  const llm = new GeminiLLM(config);

  const edgeCaseQueries = [
    "super juggy V2s for warming up",
    "crimpy overhung stuff for getting stronger fingers",
    "anything on a roof that's not impossible",
  ];

  for (const query of edgeCaseQueries) {
    console.log(`\nEdge case query: "${query}"`);
    const myFilter = filter.createFilter();

    const success = await filter.parseQuery(myFilter, query, llm);

    if (success) {
      filter.displayFilter(myFilter);
      const results = filter.search(myFilter, sampleRoutes);
      filter.displayResults(results);
    } else {
      console.log("Failed to parse edge case query");
    }
  }
}

/**
 * PROMPT VARIANT COMPARISON: Test same query with different prompts
 */
export async function testPromptVariants(): Promise<void> {
  console.log("\nPROMPT VARIANT COMPARISON");
  console.log("============================");

  const config = loadConfig();
  const llm = new GeminiLLM(config);

  const testQuery = "challenging routes for building finger strength";

  console.log(`\nTesting query: "${testQuery}"\n`);

  // Test with Basic prompt
  console.log("\n--- VARIANT 1: BASIC PROMPT ---");
  const filter1 = new AIFilter();
  filter1.setPromptVariant("basic");
  const myFilter1 = filter1.createFilter();
  await filter1.parseQuery(myFilter1, testQuery, llm);
  filter1.displayFilter(myFilter1);
  const results1 = filter1.search(myFilter1, sampleRoutes);
  console.log(`Results: ${results1.length} routes found`);

  // Test with Detailed prompt
  console.log("\n--- VARIANT 2: DETAILED PROMPT ---");
  const filter2 = new AIFilter();
  filter2.setPromptVariant("detailed");
  const myFilter2 = filter2.createFilter();
  await filter2.parseQuery(myFilter2, testQuery, llm);
  filter2.displayFilter(myFilter2);
  const results2 = filter2.search(myFilter2, sampleRoutes);
  console.log(`Results: ${results2.length} routes found`);

  // Test with Constrained prompt
  console.log("\n--- VARIANT 3: CONSTRAINED PROMPT ---");
  const filter3 = new AIFilter();
  filter3.setPromptVariant("constrained");
  const myFilter3 = filter3.createFilter();
  await filter3.parseQuery(myFilter3, testQuery, llm);
  filter3.displayFilter(myFilter3);
  const results3 = filter3.search(myFilter3, sampleRoutes);
  console.log(`Results: ${results3.length} routes found`);

  console.log("\nCOMPARISON SUMMARY");
  console.log("=====================");
  console.log(`Basic prompt: ${results1.length} results`);
  console.log(`Detailed prompt: ${results2.length} results`);
  console.log(`Constrained prompt: ${results3.length} results`);
}

/**
 * Main function to run all test cases
 */
async function main(): Promise<void> {
  console.log("AIFilter Test Suite");
  console.log("======================\n");

  try {
    // Original test cases
    await testManualFiltering();
    await testNaturalLanguageQuery();
    await testMultipleQueries();
    await testMixedFiltering();

    // Experimental test cases
    console.log("\n\n" + "=".repeat(60));
    console.log("EXPERIMENTAL TEST CASES - Exploring AI Limits");
    console.log("=".repeat(60));

    await testAmbiguousQueries();
    await testComplexCriteria();
    await testEdgeCases();

    // Prompt variant comparison
    console.log("\n\n" + "=".repeat(60));
    console.log("PROMPT ENGINEERING EXPERIMENTS");
    console.log("=".repeat(60));

    await testPromptVariants();

    console.log("\nAll test cases completed!");
  } catch (error) {
    console.error("Test error:", (error as Error).message);
    process.exit(1);
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  main();
}
