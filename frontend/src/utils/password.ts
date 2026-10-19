export const MIN_PASSWORD_LENGTH = 8;

export interface PasswordStrength {
  score: number;
  label: string;
  colorClass: string;
  barClass: string;
}

export function evaluatePasswordStrength(pwd: string): PasswordStrength {
  if (!pwd) {
    return {
      score: 0,
      label: "",
      colorClass: "",
      barClass: "bg-border",
    };
  }

  if (pwd.length < MIN_PASSWORD_LENGTH) {
    return {
      score: 1,
      label: "Too short",
      colorClass: "text-danger",
      barClass: "bg-danger",
    };
  }

  let variety = 0;
  if (/[a-z]/.test(pwd)) variety++;
  if (/[A-Z]/.test(pwd)) variety++;
  if (/[0-9]/.test(pwd)) variety++;
  if (/[^a-zA-Z0-9]/.test(pwd)) variety++;

  let score: 1 | 2 | 3 | 4 = 1;

  if (pwd.length >= 14 && variety >= 3) {
    score = 4;
  } else if (pwd.length >= 10 && variety >= 3) {
    score = 3;
  } else if (pwd.length >= 8 && variety >= 2) {
    score = 2;
  } else {
    score = 1;
  }

  const configs: Record<1 | 2 | 3 | 4, { label: string; colorClass: string; barClass: string }> = {
    1: { label: "Weak", colorClass: "text-danger", barClass: "bg-danger" },
    2: { label: "Fair", colorClass: "text-warning", barClass: "bg-warning" },
    3: { label: "Good", colorClass: "text-good", barClass: "bg-good" },
    4: { label: "Strong", colorClass: "text-success", barClass: "bg-success" },
  };

  return {
    score,
    ...configs[score],
  };
}
