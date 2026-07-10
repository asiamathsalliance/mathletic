import type { MultiplicationProblem } from "@/lib/sprint";

const MIN_OPERAND = 1;
const MAX_OPERAND = 20;

export function generateOperandPair(): MultiplicationProblem {
  const operandA =
    Math.floor(Math.random() * (MAX_OPERAND - MIN_OPERAND + 1)) + MIN_OPERAND;
  const operandB =
    Math.floor(Math.random() * (MAX_OPERAND - MIN_OPERAND + 1)) + MIN_OPERAND;
  return { operandA, operandB };
}

export function validateOperands(a: number, b: number): boolean {
  return (
    Number.isInteger(a) &&
    Number.isInteger(b) &&
    a >= MIN_OPERAND &&
    a <= MAX_OPERAND &&
    b >= MIN_OPERAND &&
    b <= MAX_OPERAND
  );
}

export function validateAnswer(a: number, b: number, value: number): boolean {
  if (!validateOperands(a, b)) return false;
  if (!Number.isInteger(value)) return false;
  return a * b === value;
}

export function correctProduct(a: number, b: number): number {
  return a * b;
}
