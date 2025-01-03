export class TokenCounter {
  // Approximate token count (1 token ≈ 4 characters)
  static estimateTokenCount(text: string): number {
    return Math.ceil(text.length * 0.25);
  }
}