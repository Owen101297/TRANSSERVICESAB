export const ACCOUNT_STATES = ["pendiente", "activa", "bloqueada", "suspendida"] as const;

export type AccountState = (typeof ACCOUNT_STATES)[number];

export const ACCOUNT_ACTIONS = [
  "block",
  "unlock",
  "suspend",
  "reactivate",
  "revoke_sessions",
] as const;

export type AccountAction = (typeof ACCOUNT_ACTIONS)[number];

const TRANSITIONS: Record<Exclude<AccountAction, "revoke_sessions">, readonly AccountState[]> = {
  block: ["pendiente", "activa"],
  unlock: ["bloqueada"],
  suspend: ["pendiente", "activa", "bloqueada"],
  reactivate: ["suspendida"],
};

export function isAccountState(value: unknown): value is AccountState {
  return typeof value === "string" && ACCOUNT_STATES.includes(value as AccountState);
}

export function isAccountAction(value: unknown): value is AccountAction {
  return typeof value === "string" && ACCOUNT_ACTIONS.includes(value as AccountAction);
}

export function canApplyAccountAction(state: AccountState, action: AccountAction): boolean {
  if (action === "revoke_sessions") return state === "activa";
  return TRANSITIONS[action].includes(state);
}

export function actionRequiresReason(action: AccountAction): boolean {
  return action === "block" || action === "suspend";
}

export function enabledAccountState(hasCredential: boolean): AccountState {
  return hasCredential ? "activa" : "pendiente";
}
