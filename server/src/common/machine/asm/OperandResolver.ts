export type OperandResolver = {
  deferred: boolean,
  value(): number | undefined,
  toString(): string;
}