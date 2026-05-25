export function getHebrewGematria(num: number): string {
  if (num <= 0 || num > 150) return String(num);

  // Special overrides for 15 and 16
  if (num === 15) return "טו";
  if (num === 16) return "טז";

  let remainder = num;
  let result = "";

  if (remainder >= 100) {
    result += "ק";
    remainder -= 100;
  }

  // Check remainder for 15/16 when tens start (e.g. 115, 116)
  if (remainder === 15) {
    result += "טו";
    return result;
  }
  if (remainder === 16) {
    result += "טז";
    return result;
  }

  const tensArr = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const unitsArr = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];

  const tensVal = Math.floor(remainder / 10);
  const unitsVal = remainder % 10;

  result += tensArr[tensVal];
  result += unitsArr[unitsVal];

  return result;
}
