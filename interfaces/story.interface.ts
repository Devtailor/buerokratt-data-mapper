import { RuleStoryStep } from "./rule-story-step.interface";

export interface Story {
  story: string;
  steps: RuleStoryStep | RuleStoryStep[];
}
