import { describe, expect, it } from "vitest";
import { findTimers, parseStepTimers, recipeSteps, splitSteps } from "~/lib/recipe-steps";

const cases: [string, string[]][] = [
  ["Bake for 40 minutes.", ["40 min"]],
  ["After 40 minutes, remove the pie and sprinkle with topping.", []],
  ["Return to the oven for 15 minutes. Let cool completely before serving.", ["15 min"]],
  ["Simmer 1 hour, stirring every 10 minutes.", ["1 hr"]],
  ["Take the butter out 30 minutes before you start.", []],
  ["Make the dough up to 2 days ahead.", []],
  ["Bake 10 to 12 min until golden.", ["10 min"]],
  ["Let rest 5-10 minutes then slice", ["5 min"]],
  ["Bake 25 minutes; for the last 5 minutes, remove the foil.", ["25 min"]],
  ["Chill at least 2 hours.", ["2 hr"]],
  ["Cook pasta 8 minutes, then drain.", ["8 min"]],
  ["Once 20 minutes have passed, flip.", []],
  ["Bake 1½ hrs", ["1 hr 30 min"]],
  ["Use 2 m of string", []],
  ["Knead two minutes; rise 1 hour.", ["2 min", "1 hr"]],
  ["Bake for an additional 10 minutes.", ["10 min"]],
  ["Bake pie until golden, about 1 hour 25 minutes.", ["1 hr 25 min"]],
  ["Bake for about 1 hr 15 minutes, baste.", ["1 hr 15 min"]],
  ["Top with parmesan 5 minutes before removing from the oven.", []],
  ["Two hours before roasting, remove the meat.", []],
  ["Bake 1 hour and 10 minutes.", ["1 hr 10 min"]],
  ["bake one minute more.", ["1 min"]],
  ["Bake 20 minutes, then another 10 minutes uncovered.", ["20 min", "10 min"]],
];

describe("findTimers", () => {
  it.each(cases)("%s", (text, want) => {
    expect(findTimers(text).map((t) => t.label)).toEqual(want);
  });
});

describe("recipeSteps", () => {
  const instructions = "1. Mix.\nStep 2: Bake 40 minutes.\n\nCool.";
  it("splits numbered lines", () => {
    expect(splitSteps(instructions)).toEqual(["Mix.", "Bake 40 minutes.", "Cool."]);
  });
  it("finds timers in the text when none are saved", () => {
    expect(recipeSteps(instructions, null).map((s) => [s.timers.map((t) => t.seconds), s.reviewed])).toEqual([
      [[], false],
      [[2400], false],
      [[], false],
    ]);
  });
  it("uses saved timers when they line up with the steps", () => {
    const steps = recipeSteps(instructions, [[], [], [600]]);
    expect(steps.map((s) => s.timers)).toEqual([[], [], [{ seconds: 600, label: "10 min" }]]);
    expect(steps.every((s) => s.reviewed)).toBe(true);
  });
  it("falls back to the text when the saved timers don't line up", () => {
    expect(recipeSteps(instructions, [[600]])[1]!.timers.map((t) => t.seconds)).toEqual([2400]);
  });
  it("parses stored JSON and ignores junk", () => {
    expect(parseStepTimers("[[], [900, 60]]")).toEqual([[], [900, 60]]);
    expect(parseStepTimers("[[1.5, \"x\"], 3]")).toEqual([[], []]);
    expect(parseStepTimers("nope")).toBeNull();
    expect(parseStepTimers(null)).toBeNull();
  });
});
