

// Sjekker om bruker kan redigere eller slette svar, basert på deadline
export function canEditOrDelete(deadlineString: string): boolean {
    const deadline = new Date(deadlineString);
    const now = new Date();
    return now.getTime() < deadline.getTime();
  }