export interface RuleStoryStep {
  intent?: string;
  action?: string;
  entities?: Array<{
    [key: string]: string;
  }>;
  slot_was_set?:
    | Array<Record<string, any>>
    | {
        requested_slot: string | null;
        slot?: string;
      };
  condition?: unknown[];
}
