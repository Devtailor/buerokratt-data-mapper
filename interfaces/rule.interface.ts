import { RuleStoryStep } from './rule-story-step.interface';

export interface Rule {
  rule: string;
  steps: RuleStoryStep | RuleStoryStep[];
  conversation_start?: string;
  wait_for_user_input?: string;
}
