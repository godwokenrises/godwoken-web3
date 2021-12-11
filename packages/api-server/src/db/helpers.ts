export function formatDecimal(dec: string) {
  const nums = dec.split(".");
  const wholeNum = BigInt(nums[0]);
  const smallNum = nums[1] == null ? 0 : +nums[1];
  if (smallNum > 0) {
    return wholeNum + 1n;
  }
  return wholeNum;
}
